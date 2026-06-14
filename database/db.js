const path = require('path');
const fs = require('fs');
const https = require('https');

// Database selection
const useTurso = !!(process.env.TURSO_URL && process.env.TURSO_TOKEN);

let db;
let dbReady = false;

function tursoValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v % 1 === 0 ? { type: 'integer', value: String(v) } : { type: 'float', value: String(v) };
  return { type: 'text', value: String(v) };
}

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'POST',
      headers: options.headers || {},
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON response: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function tursoFetch(stmtOrSql, maybeArgs) {
  const sql = typeof stmtOrSql === 'string' ? stmtOrSql : stmtOrSql.sql;
  const args = typeof stmtOrSql === 'string' ? (maybeArgs || []) : (stmtOrSql.args || []);
  const host = process.env.TURSO_URL.replace('libsql://', '');
  const body = JSON.stringify({
    requests: [{ type: 'execute', stmt: { sql, args: args.map(tursoValue) } }],
  });
  return httpsRequest('https://' + host + '/v2/pipeline', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.TURSO_TOKEN,
      'Content-Type': 'application/json',
    },
  }, body).then(json => {
    if (!json.results) throw new Error(json.error || 'Unknown Turso error');
    const result = json.results[0];
    if (result.type === 'error') throw new Error(result.error?.message || 'Turso error');
    const resp = result.response.result;
    const cols = resp.cols || [];
    const rows = (resp.rows || []).map(r => {
      const obj = {};
      cols.forEach((c, i) => { obj[c.name] = r[i] && r[i].value !== undefined ? r[i].value : r[i]; });
      return obj;
    });
    return { rows, columns: cols.map(c => c.name), lastInsertRowid: resp.last_insert_rowid };
  });
}

async function getDB() {
  if (dbReady) return db;

  if (useTurso) {
    db = { execute: tursoFetch };
  } else {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const dbPath = process.env.DATA_DIR
      ? path.join(process.env.DATA_DIR, 'hotel.db')
      : path.join(__dirname, 'hotel.db');

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');
  }

  await initTables();
  await seedRooms();
  if (useTurso) {
    // Turso needs explicit sync
  } else {
    saveDB();
  }

  dbReady = true;
  return db;
}

function saveDB() {
  if (useTurso || !db) return;
  const data = db.export();
  fs.writeFileSync(
    process.env.DATA_DIR
      ? path.join(process.env.DATA_DIR, 'hotel.db')
      : path.join(__dirname, 'hotel.db'),
    Buffer.from(data)
  );
}

async function initTables() {
  if (useTurso) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_ar TEXT NOT NULL,
        name_fr TEXT NOT NULL,
        name_en TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        description_fr TEXT NOT NULL,
        description_en TEXT NOT NULL,
        price REAL NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 2,
        image TEXT DEFAULT '/images/room1.jpg',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        guest_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_ar TEXT NOT NULL,
        name_fr TEXT NOT NULL,
        name_en TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        description_fr TEXT NOT NULL,
        description_en TEXT NOT NULL,
        price REAL NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 2,
        image TEXT DEFAULT '/images/room1.jpg',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        guest_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

async function seedRooms() {
  let count;
  if (useTurso) {
    const result = await db.execute('SELECT COUNT(*) as c FROM rooms');
    count = result.rows[0].c;
  } else {
    const r = db.exec('SELECT COUNT(*) as c FROM rooms');
    count = r.length > 0 ? r[0].values[0][0] : 0;
  }
  if (count > 0) return;

  const rooms = [
    { name_ar: 'غرفة مزدوجة كلاسيك', name_fr: 'Chambre Double Classique', name_en: 'Classic Double Room', description_ar: 'غرفة مريحة بسرير مزدوج مع إطلالة على الحديقة، تحتوي على تلفزيون بشاشة مسطحة، خزانة ملابس، وحمام خاص.', description_fr: 'Chambre confortable avec un lit double et vue sur le jardin, équipée d\'une télévision à écran plat, d\'une armoire et d\'une salle de bain privative.', description_en: 'Comfortable double room with garden view, equipped with flat-screen TV, wardrobe, and private bathroom.', price: 500, capacity: 2, image: '/images/room1.jpg' },
    { name_ar: 'غرفة مزدوجة ديلوكس', name_fr: 'Chambre Double Deluxe', name_en: 'Deluxe Double Room', description_ar: 'غرفة واسعة بسرير مزدوج كبير مع منطقة جلوس، تكييف، وصباح مميز مع إطلالة على المسبح.', description_fr: 'Chambre spacieuse avec un grand lit double, coin salon, climatisation et vue sur la piscine.', description_en: 'Spacious room with king-size bed, sitting area, air conditioning, and pool view.', price: 700, capacity: 2, image: '/images/room2.jpg' },
    { name_ar: 'غرفة ثلاثية', name_fr: 'Chambre Triple', name_en: 'Triple Room', description_ar: 'غرفة عائلية تتسع لثلاثة أشخاص مع ثلاث أسرة مفردة أو سرير مزدوج وسرير إضافي.', description_fr: 'Chambre familiale pour trois personnes avec trois lits simples ou un lit double et un lit supplémentaire.', description_en: 'Family room for three persons with three single beds or a double bed with an extra bed.', price: 900, capacity: 3, image: '/images/room3.jpg' },
    { name_ar: 'جناح صغير', name_fr: 'Petite Suite', name_en: 'Junior Suite', description_ar: 'جناح أنيق مع غرفة نوم منفصلة، غرفة معيشة، حمام فاخر، وشرفة خاصة.', description_fr: 'Suite élégante avec chambre séparée, salon, salle de bain luxueuse et balcon privé.', description_en: 'Elegant suite with separate bedroom, living room, luxury bathroom, and private balcony.', price: 1200, capacity: 2, image: '/images/room4.jpg' },
    { name_ar: 'جناح عائلي', name_fr: 'Suite Familiale', name_en: 'Family Suite', description_ar: 'جناح عائلي كبير بغرفتي نوم وصالة مع مطبخ صغير، يتسع لأربعة أشخاص.', description_fr: 'Grande suite familiale avec deux chambres, un salon et une kitchenette, pouvant accueillir quatre personnes.', description_en: 'Large family suite with two bedrooms, a living room, and a kitchenette, accommodating four persons.', price: 1600, capacity: 4, image: '/images/room5.jpg' }
  ];

  if (useTurso) {
    for (const r of rooms) {
      await db.execute({
        sql: 'INSERT INTO rooms (name_ar, name_fr, name_en, description_ar, description_fr, description_en, price, capacity, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [r.name_ar, r.name_fr, r.name_en, r.description_ar, r.description_fr, r.description_en, r.price, r.capacity, r.image]
      });
    }
  } else {
    const stmt = db.prepare('INSERT INTO rooms (name_ar, name_fr, name_en, description_ar, description_fr, description_en, price, capacity, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const r of rooms) {
      stmt.run([r.name_ar, r.name_fr, r.name_en, r.description_ar, r.description_fr, r.description_en, r.price, r.capacity, r.image]);
    }
    saveDB();
  }
}

async function checkAvailability(roomId, checkIn, checkOut) {
  if (!dbReady) await getDB();
  if (useTurso) {
    const result = await db.execute({
      sql: "SELECT COUNT(*) as c FROM bookings WHERE room_id = ? AND status != 'cancelled' AND check_in < ? AND check_out > ?",
      args: [roomId, checkOut, checkIn]
    });
    return result.rows[0].c === 0;
  } else {
    const result = db.exec(`SELECT COUNT(*) as c FROM bookings WHERE room_id = ${roomId} AND status != 'cancelled' AND check_in < '${checkOut}' AND check_out > '${checkIn}'`);
    const count = result.length > 0 ? result[0].values[0][0] : 0;
    return count === 0;
  }
}

async function dbQuery(sql, params = []) {
  if (!dbReady) await getDB();
  if (useTurso) {
    const result = await db.execute({ sql, args: params });
    return result.rows.map(row => {
      const obj = {};
      for (const key of result.columns) {
        obj[key] = row[key];
      }
      return obj;
    });
  } else {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } else {
      stmt.run(params);
      stmt.free();
      saveDB();
      return { changes: db.getRowsModified() };
    }
  }
}

async function dbGet(sql, params = []) {
  const rows = await dbQuery(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { getDB, checkAvailability, dbQuery, dbGet, saveDB };
