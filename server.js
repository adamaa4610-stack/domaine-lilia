const express = require('express');
const session = require('express-session');
const path = require('path');
const { getDB, checkAvailability, dbQuery, dbGet, saveDB } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'domaine-lilia-secret-key',
  resave: false,
  saveUninitialized: true,
}));

const locales = {
  ar: require('./locales/ar.json'),
  fr: require('./locales/fr.json'),
  en: require('./locales/en.json'),
};

app.use((req, res, next) => {
  const parts = req.path.split('/');
  const lang = parts[1];
  if (['ar', 'fr', 'en'].includes(lang)) {
    req.lang = lang;
  } else {
    req.lang = 'ar';
  }
  res.locals.lang = req.lang;
  res.locals.t = locales[req.lang];
  res.locals.path = req.path;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Admin routes
app.get('/admin', wrap(async (req, res) => {
  if (!req.session.authenticated) {
    return res.render('admin/login', { error: false });
  }
  const bookings = await dbQuery(`
    SELECT b.*, r.name_ar as room_name FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    ORDER BY b.created_at DESC
  `);
  const messages = await dbQuery('SELECT * FROM messages ORDER BY created_at DESC');
  res.render('admin/dashboard', { bookings, messages });
}));

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'domaine2026') {
    req.session.authenticated = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: true });
});

app.post('/admin/booking/:id/:action', wrap(async (req, res) => {
  if (!req.session.authenticated) return res.redirect('/admin');
  const { id, action } = req.params;
  if (['confirmed', 'cancelled'].includes(action)) {
    await dbQuery('UPDATE bookings SET status = ? WHERE id = ?', [action, id]);
  }
  res.redirect('/admin');
}));

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin');
});

app.get('/admin/bookings/export', wrap(async (req, res) => {
  if (!req.session.authenticated) return res.redirect('/admin');
  const bookings = await dbQuery(`
    SELECT b.*, r.name_en as room_name FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    ORDER BY b.created_at DESC
  `);
  let csv = 'Guest Name,Email,Phone,Room,Check-In,Check-Out,Status,Message,Created\n';
  bookings.forEach(b => {
    csv += `"${b.guest_name}","${b.email}","${b.phone}","${b.room_name}","${b.check_in}","${b.check_out}","${b.status}","${(b.message || '').replace(/"/g, '""')}","${b.created_at}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
  res.send(csv);
}));

// Home
app.get('/:lang?', wrap(async (req, res) => {
  if (req.params.lang && !['ar', 'fr', 'en'].includes(req.params.lang)) {
    return res.redirect('/ar');
  }
  const rooms = await dbQuery('SELECT * FROM rooms');
  res.render('index', { page: 'home', rooms });
}));

// About
app.get('/:lang/about', (req, res) => {
  res.render('about', { page: 'about' });
});

// Rooms
app.get('/:lang/rooms', wrap(async (req, res) => {
  const rooms = await dbQuery('SELECT * FROM rooms');
  res.render('rooms', { page: 'rooms', rooms });
}));

// Gallery
app.get('/:lang/gallery', (req, res) => {
  res.render('gallery', { page: 'gallery' });
});

// Booking
app.get('/:lang/booking', wrap(async (req, res) => {
  const rooms = await dbQuery('SELECT * FROM rooms');
  res.render('booking', { page: 'booking', rooms, error: null, success: null });
}));

app.post('/:lang/booking', wrap(async (req, res) => {
  const { room_id, guest_name, email, phone, check_in, check_out, message } = req.body;
  const rooms = await dbQuery('SELECT * FROM rooms');
  const room = await dbGet('SELECT * FROM rooms WHERE id = ?', [room_id]);

  if (!room) {
    return res.render('booking', {
      page: 'booking', rooms,
      error: req.lang === 'ar' ? 'الغرفة غير موجودة' : req.lang === 'fr' ? 'Chambre introuvable' : 'Room not found',
      success: null
    });
  }

  const available = await checkAvailability(room_id, check_in, check_out);
  if (!available) {
    return res.render('booking', {
      page: 'booking', rooms,
      error: req.lang === 'ar' ? 'الغرفة غير متوفرة في هذه التواريخ' : req.lang === 'fr' ? 'Chambre non disponible pour ces dates' : 'Room not available for these dates',
      success: null
    });
  }

  await dbQuery(
    `INSERT INTO bookings (room_id, guest_name, email, phone, check_in, check_out, status, message)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [room_id, guest_name, email, phone, check_in, check_out, message || '']
  );

  res.render('booking', {
    page: 'booking', rooms, error: null,
    success: req.lang === 'ar' ? 'تم إرسال طلب الحجز بنجاح. سنتصل بك قريبًا لتأكيد الحجز.' :
             req.lang === 'fr' ? 'Demande de réservation envoyée avec succès. Nous vous contacterons bientôt pour confirmer.' :
             'Booking request sent successfully. We will contact you soon to confirm.'
  });
}));

// Contact
app.get('/:lang/contact', (req, res) => {
  res.render('contact', { page: 'contact', success: null });
});

app.post('/:lang/contact', wrap(async (req, res) => {
  const { name, email, subject, message } = req.body;
  await dbQuery('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
    [name, email, subject || '', message]);
  res.render('contact', { page: 'contact', success: true });
}));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});

async function startServer() {
  await getDB();
  console.log('Database initialized');

  app.listen(PORT, () => {
    console.log(`Domaine De Lilia website running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
