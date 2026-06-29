/* ═══════════════════════════════════════════
   VAS3O — MAIN.JS  |  3D & Effects Engine
   ═══════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   1. LOADER
────────────────────────────────────────── */
(function initLoader() {
  const loader     = document.getElementById('loader');
  const bar        = document.querySelector('.loader-bar');
  const statusEl   = document.getElementById('loaderStatus');
  const main       = document.getElementById('mainContent');

  const steps = [
    [0,   'INITIALIZING SYSTEMS...'],
    [18,  'LOADING ASSETS...'],
    [40,  'BUILDING SCENE...'],
    [65,  'CALIBRATING EFFECTS...'],
    [85,  'ESTABLISHING CONNECTION...'],
    [100, 'WELCOME, VISITOR.'],
  ];

  let stepIdx = 0;
  let progress = 0;

  function tick() {
    progress = Math.min(progress + (Math.random() * 3 + 1), 100);
    bar.style.width = progress + '%';

    if (stepIdx < steps.length && progress >= steps[stepIdx][0]) {
      statusEl.textContent = steps[stepIdx][1];
      stepIdx++;
    }

    if (progress < 100) {
      setTimeout(tick, 30 + Math.random() * 40);
    } else {
      setTimeout(() => {
        loader.classList.add('hidden');
        main.style.opacity = '1';
        startTypewriter();
        countUpStats();
        initNavbar();
      }, 500);
    }
  }

  main.style.opacity = '0';
  main.style.transition = 'opacity 0.6s ease';
  setTimeout(tick, 200);
})();

/* ──────────────────────────────────────────
   2. BACKGROUND CANVAS  —  Stars + Meteors + Grid Pulse
────────────────────────────────────────── */
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [], meteors = [], tick = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
  }

  function buildStars() {
    stars = [];
    const count = Math.floor((W * H) / 3500) + 60;
    for (let i = 0; i < count; i++) {
      stars.push({
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     Math.random() * 1.3 + 0.15,
        base:  Math.random() * 0.45 + 0.08,
        spd:   0.003 + Math.random() * 0.009,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function spawnMeteor(fromRandom) {
    const m = {
      x:     fromRandom ? Math.random() * W : Math.random() * W * 1.4 - W * 0.2,
      y:     fromRandom ? Math.random() * H * 0.7 : -30,
      vx:    1.2 + Math.random() * 1.6,
      vy:    2.2 + Math.random() * 2.8,
      alpha: 0.5  + Math.random() * 0.5,
      size:  0.6  + Math.random() * 2.0,
      trail: [],
      maxT:  24 + Math.floor(Math.random() * 16),
    };
    return m;
  }

  function init() {
    meteors = [];
    for (let i = 0; i < 8; i++) meteors.push(spawnMeteor(true));
  }

  function drawFrame() {
    tick++;
    ctx.clearRect(0, 0, W, H);

    /* Stars */
    stars.forEach(s => {
      const a = s.base + Math.sin(tick * s.spd + s.phase) * (s.base * 0.75);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    });

    /* Meteors */
    meteors.forEach((m, i) => {
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > m.maxT) m.trail.shift();

      for (let t = 0; t < m.trail.length - 1; t++) {
        const p = (t + 1) / m.trail.length;
        ctx.strokeStyle = `rgba(255,255,255,${p * m.alpha * 0.55})`;
        ctx.lineWidth   = m.size * p;
        ctx.beginPath();
        ctx.moveTo(m.trail[t].x,     m.trail[t].y);
        ctx.lineTo(m.trail[t + 1].x, m.trail[t + 1].y);
        ctx.stroke();
      }

      /* Head glow */
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 4);
      g.addColorStop(0,   `rgba(255,255,255,${m.alpha})`);
      g.addColorStop(0.4, `rgba(255,255,255,${m.alpha * 0.35})`);
      g.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      m.x += m.vx;
      m.y += m.vy;

      if (m.x > W + 100 || m.y > H + 100) meteors[i] = spawnMeteor(false);
    });

    /* Occasional extra meteor burst */
    if (meteors.length < 14 && Math.random() < 0.008) meteors.push(spawnMeteor(false));

    requestAnimationFrame(drawFrame);
  }

  window.addEventListener('resize', () => { resize(); init(); });
  resize();
  init();
  drawFrame();
})();

/* ──────────────────────────────────────────
   3. NAVBAR
────────────────────────────────────────── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  nav.classList.add('visible');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ──────────────────────────────────────────
   4. TYPEWRITER
────────────────────────────────────────── */
function startTypewriter() {
  const el     = document.getElementById('typedText');
  const lines  = [
    'Activity Schedule & About Me',
    'Builder. Community Runner.',
    'Knox Hub & Knox KeyPloits',
    'Based in IST ♥',
  ];
  let lineIdx = 0, charIdx = 0, deleting = false, pauseTimer = null;

  function type() {
    const line = lines[lineIdx];
    if (!deleting) {
      el.textContent = line.slice(0, ++charIdx);
      if (charIdx === line.length) {
        deleting = true;
        pauseTimer = setTimeout(type, 1800);
        return;
      }
      setTimeout(type, 55 + Math.random() * 40);
    } else {
      el.textContent = line.slice(0, --charIdx);
      if (charIdx === 0) {
        deleting = false;
        lineIdx  = (lineIdx + 1) % lines.length;
        setTimeout(type, 300);
        return;
      }
      setTimeout(type, 28 + Math.random() * 20);
    }
  }
  type();
}

/* ──────────────────────────────────────────
   5. COUNT-UP STATS
────────────────────────────────────────── */
function countUpStats() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    let current  = 0;
    const step   = Math.max(1, Math.floor(target / 60));
    const timer  = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 24);
  });
}

/* ──────────────────────────────────────────
   6. 3D CARD TILT on mouse move
────────────────────────────────────────── */
(function initCardTilt() {
  document.querySelectorAll('.card-3d').forEach(card => {
    const inner = card.querySelector('.card-3d-inner');

    card.addEventListener('mousemove', e => {
      const rect   = card.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const dx     = (e.clientX - cx) / (rect.width  / 2);
      const dy     = (e.clientY - cy) / (rect.height / 2);
      const tiltX  = dy * -12;
      const tiltY  = dx *  12;
      const mx     = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const my     = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);

      inner.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02,1.02,1.02)`;
      inner.style.setProperty('--mx', mx + '%');
      inner.style.setProperty('--my', my + '%');
    });

    card.addEventListener('mouseleave', () => {
      inner.style.transform = '';
    });
  });
})();

/* ──────────────────────────────────────────
   7. SCHEDULE
────────────────────────────────────────── */
(function initSchedule() {
  const schedule = [
    { name: 'Monday',    hours: '12 AM — 12 PM',            note: '12 hours online',  pct: 0.50 },
    { name: 'Tuesday',   hours: '1 PM — 10 PM',             note: '9 hours online',   pct: 0.375 },
    { name: 'Wednesday', hours: '11 AM — 12 AM',            note: '13 hours online',  pct: 0.54 },
    { name: 'Thursday',  hours: '10 AM — 11 PM',            note: '13 hours online',  pct: 0.54 },
    { name: 'Friday',    hours: '1 PM — 10 PM',             note: '9 hours online',   pct: 0.375 },
    { name: 'Saturday',  hours: '1 PM — 10 PM',             note: '9 hours online',   pct: 0.375 },
    { name: 'Sunday',    hours: '12 AM — 1 PM<br>12 PM+',  note: 'Split session',    pct: 0.54 },
  ];

  const jsDay   = new Date().getDay();          // 0=Sun … 6=Sat
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0 … Sun=6

  const tabs    = document.querySelectorAll('.day-tab');
  const display = document.getElementById('scheduleDisplay');

  function renderDay(idx) {
    const d = schedule[idx];
    display.innerHTML = `
      <div class="day-name">${d.name}</div>
      <div class="day-hours">${d.hours}</div>
      <div class="day-note">${d.note}</div>
      <div class="day-bar-wrap">
        <div class="day-bar" style="width:${(d.pct * 100).toFixed(0)}%"></div>
      </div>`;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDay(parseInt(tab.dataset.day, 10));
    });
  });

  /* Mark today */
  if (tabs[todayIdx]) tabs[todayIdx].classList.add('today-marker');

  /* Default: today's tab */
  tabs.forEach(t => t.classList.remove('active'));
  tabs[todayIdx].classList.add('active');
  renderDay(todayIdx);
})();

/* ──────────────────────────────────────────
   8. COPY ADDRESS
────────────────────────────────────────── */
function copyAddress(addr, toastId) {
  navigator.clipboard.writeText(addr).then(() => {
    const toast = document.getElementById(toastId);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }).catch(() => {
    /* Fallback for older browsers */
    const ta = document.createElement('textarea');
    ta.value = addr;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const toast = document.getElementById(toastId);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  });
}

/* ──────────────────────────────────────────
   9. SCROLL REVEAL  (IntersectionObserver)
────────────────────────────────────────── */
(function initReveal() {
  const targets = document.querySelectorAll('.section, .card-3d, .crypto-card, .schedule-3d, .about-grid');
  targets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(el => observer.observe(el));
})();

/* ──────────────────────────────────────────
   10. SECTION BACKGROUND PARALLAX
────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const grid = document.querySelector('.grid-overlay');
  if (grid) grid.style.transform = `translateY(${y * 0.15}px)`;
}, { passive: true });
