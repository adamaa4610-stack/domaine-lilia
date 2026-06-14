document.addEventListener('DOMContentLoaded', () => {
  // ============ LOADING SCREEN ============
  const loader = document.getElementById('loader');
  if (loader) {
    gsap.to('.loader-bar-fill', {
      width: '100%',
      duration: 1.8,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.to('.loader-content', {
          opacity: 0,
          y: -30,
          duration: 0.4,
          ease: 'power2.out'
        });
        gsap.to(loader, {
          opacity: 0,
          duration: 0.5,
          delay: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            loader.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
      }
    });
  }

  // ============ AOS INIT ============
  AOS.init({
    duration: 800,
    once: true,
    offset: 100,
    easing: 'ease-out-cubic'
  });

  // ============ GSAP HERO ANIMATION ============
  const heroTitle = document.querySelector('.hero-title');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const heroBtn = document.querySelector('.hero .btn');

  if (heroTitle) {
    const tl = gsap.timeline({ delay: 2.3 });
    tl.from(heroTitle, {
      y: 80,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    })
    .from(heroSubtitle, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, '-=0.5')
    .from(heroBtn, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out'
    }, '-=0.3');
  }

  // ============ GSAP SCROLL ANIMATIONS ============
  gsap.registerPlugin(ScrollTrigger);

  // Animate feature cards
  gsap.utils.toArray('.feature-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 50,
      opacity: 0,
      duration: 0.7,
      delay: i * 0.15,
      ease: 'power2.out'
    });
  });

  // Animate room cards
  gsap.utils.toArray('.room-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 60,
      opacity: 0,
      duration: 0.8,
      delay: i * 0.2,
      ease: 'power2.out'
    });
  });

  // Animate gallery items
  gsap.utils.toArray('.gallery-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 88%',
        toggleActions: 'play none none none'
      },
      scale: 0.9,
      opacity: 0,
      duration: 0.5,
      delay: i * 0.08,
      ease: 'power1.out'
    });
  });

  // About page info items
  gsap.utils.toArray('.info-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      scale: 0.8,
      opacity: 0,
      duration: 0.5,
      delay: i * 0.1,
      ease: 'back.out(1.7)'
    });
  });

  // Section titles
  gsap.utils.toArray('.section-title').forEach(title => {
    gsap.from(title, {
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });
  });

  // CTA section
  const cta = document.querySelector('.cta');
  if (cta) {
    gsap.from(cta.querySelector('h2'), {
      scrollTrigger: {
        trigger: cta,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });
    gsap.from(cta.querySelector('p'), {
      scrollTrigger: {
        trigger: cta,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 30,
      opacity: 0,
      delay: 0.2,
      duration: 0.8,
      ease: 'power2.out'
    });
  }

  // Contact cards
  gsap.utils.toArray('.contact-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      x: i % 2 === 0 ? -40 : 40,
      opacity: 0,
      duration: 0.6,
      delay: i * 0.15,
      ease: 'power2.out'
    });
  });

  // ============ SWIPER GALLERY ============
  const galleryGrid = document.querySelector('.gallery-grid');
  if (galleryGrid) {
    const images = galleryGrid.querySelectorAll('img');
    const swiperHTML = `
      <div class="swiper gallery-swiper">
        <div class="swiper-wrapper">
          ${Array.from(images).map(img => `
            <div class="swiper-slide">
              <img src="${img.src}" alt="Gallery" style="width:100%;height:100%;object-fit:cover;border-radius:12px">
            </div>
          `).join('')}
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-next" style="color:#C9A962"></div>
        <div class="swiper-button-prev" style="color:#C9A962"></div>
      </div>
    `;
    galleryGrid.innerHTML = swiperHTML;

    new Swiper('.gallery-swiper', {
      loop: true,
      autoplay: {
        delay: 4000,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      effect: 'coverflow',
      coverflowEffect: {
        rotate: 30,
        slideShadows: false,
        depth: 100,
      },
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      breakpoints: {
        320: { slidesPerView: 1, spaceBetween: 10 },
        768: { slidesPerView: 2, spaceBetween: 20 },
        1024: { slidesPerView: 3, spaceBetween: 30 },
      }
    });
  }

  // ============ NAVBAR SCROLL EFFECT ============
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 80) {
        navbar.style.background = 'rgba(27, 42, 74, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.15)';
      } else {
        navbar.style.background = 'rgba(27, 42, 74, 0.95)';
        navbar.style.boxShadow = 'none';
      }
    });
  }

  // ============ NAVBAR TOGGLE ============
  document.getElementById('navToggle')?.addEventListener('click', function() {
    document.getElementById('navMenu').classList.toggle('open');
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('navMenu')?.classList.remove('open');
    });
  });

  // ============ SMOOTH ANCHOR SCROLL ============
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // ============ BOOKING DATE MIN ============
  const checkIn = document.getElementById('check_in');
  const checkOut = document.getElementById('check_out');
  if (checkIn && checkOut) {
    const today = new Date().toISOString().split('T')[0];
    checkIn.setAttribute('min', today);
    checkIn.addEventListener('change', function() {
      checkOut.setAttribute('min', this.value);
      if (checkOut.value && checkOut.value <= this.value) {
        checkOut.value = '';
      }
    });
  }

  // ============ PRICE COUNTER ON ROOMS PAGE ============
  gsap.utils.toArray('.room-price').forEach(price => {
    const text = price.textContent;
    const numMatch = text.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0]);
      gsap.from(price, {
        scrollTrigger: {
          trigger: price,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        innerHTML: numMatch[0],
        duration: 1,
        snap: { innerHTML: 1 },
        ease: 'power1.out',
        onUpdate: function() {
          const val = Math.round(this.targets()[0].innerHTML);
          price.innerHTML = text.replace(numMatch[0], val);
        }
      });
    }
  });

  // ============ PARALLAX HERO ============
  const hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * 0.3;
      hero.style.backgroundPositionY = `${rate}px`;
    });
  }

  // ============ ROOM CARD 3D TILT ============
  document.querySelectorAll('.room-card').forEach(card => {
    card.addEventListener('mousemove', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });
});

// ============ SUCCESS ANIMATION FOR BOOKING ============
document.addEventListener('DOMContentLoaded', () => {
  const alert = document.querySelector('.alert-success');
  if (alert) {
    const icon = document.createElement('div');
    icon.className = 'success-check';
    icon.innerHTML = '<i class="fas fa-check-circle"></i>';
    icon.style.cssText = 'text-align:center;font-size:3rem;color:#28a745;margin-bottom:10px;animation:successPop 0.5s ease';
    alert.parentNode.insertBefore(icon, alert);
    const style = document.createElement('style');
    style.textContent = '@keyframes successPop { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.3)} 100%{transform:scale(1);opacity:1} }';
    document.head.appendChild(style);
  }
});
