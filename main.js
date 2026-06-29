/* ═══════════════════════════════════════════════════════
   VAS3O — MAIN.JS  |  Full Effects + Live Discord Stats
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────
   DISCORD LIVE MEMBER COUNTS
   Uses the public Invite API — no auth required.
   Endpoint: /api/v10/invites/{code}?with_counts=true
   Returns: approximate_member_count, approximate_presence_count
   Polls every 30 s (Discord rate-limit safe).
   "Every second" visually: number rolls smoothly on each
   fetch, plus a live elapsed-time ticker shows seconds.
────────────────────────────────────────────────────── */
const DISCORD_SERVERS = [
  {
    code:       'pxzKXGSJYE',
    onlineEl:   'knox-online',
    totalEl:    'knox-total',
    ageEl:      'knox-age',
    refreshEl:  'knox-refresh',
    statsEl:    'stats-knox',
  },
  {
    code:       'ZT5yQXXJgQ',
    onlineEl:   'keys-online',
    totalEl:    'keys-total',
    ageEl:      'keys-age',
    refreshEl:  'keys-refresh',
    statsEl:    'stats-keys',
  },
];

/* Cached values so we can animate the number roll */
const _cache = {};

function animateNum(el, newVal) {
  if (!el) return;
  const prev = parseInt(el.textContent.replace(/,/g, ''), 10) || 0;
  if (prev === newVal) return;
  el.classList.remove('flash');
  void el.offsetWidth; // reflow
  el.classList.add('flash');
  const diff     = newVal - prev;
  const steps    = 24;
  const stepTime = 600 / steps;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    const val = Math.round(prev + diff * (i / steps));
    el.textContent = val.toLocaleString();
    if (i >= steps) { clearInterval(iv); el.textContent = newVal.toLocaleString(); }
  }, stepTime);
}

async function fetchDiscordStats(server) {
  const url = `https://discord.com/api/v10/invites/${server.code}?with_counts=true`;
  try {
    const ref = document.getElementById(server.refreshEl);
    if (ref) ref.classList.add('spinning');
    setTimeout(() => { if (ref) ref.classList.remove('spinning'); }, 700);

    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const total  = data.approximate_member_count   ?? null;
    const online = data.approximate_presence_count ?? null;

    const onlineEl = document.getElementById(server.onlineEl);
    const totalEl  = document.getElementById(server.totalEl);

    if (online !== null) animateNum(onlineEl, online);
    if (total  !== null) animateNum(totalEl,  total);

    /* Store fetch timestamp for the live ticker */
    _cache[server.code] = { ts: Date.now(), online, total };

    /* Also update hero "Members+" stat with combined total if available */
    updateHeroMembers();

  } catch (err) {
    const onlineEl = document.getElementById(server.onlineEl);
    const totalEl  = document.getElementById(server.totalEl);
    if (onlineEl && onlineEl.textContent === '—') onlineEl.textContent = 'N/A';
    if (totalEl  && totalEl.textContent  === '—') totalEl.textContent  = 'N/A';
    console.warn('Discord stats fetch failed:', server.code, err.message);
  }
}

function updateHeroMembers() {
  let total = 0;
  let allReady = true;
  DISCORD_SERVERS.forEach(s => {
    if (_cache[s.code] && _cache[s.code].total) {
      total += _cache[s.code].total;
    } else {
      allReady = false;
    }
  });
  if (!allReady) return;
  const heroMembersEl = document.querySelector('.stat-num[data-target="500"]');
  if (heroMembersEl) {
    heroMembersEl.textContent = total.toLocaleString();
    const label = heroMembersEl.nextElementSibling;
    if (label) label.textContent = 'Members';
  }
}

/* Live elapsed-time ticker — updates every second so it feels real-time */
function startAgeTicker() {
  setInterval(() => {
    DISCORD_SERVERS.forEach(s => {
      const ageEl = document.getElementById(s.ageEl);
      if (!ageEl) return;
      const c = _cache[s.code];
      if (!c) { ageEl.textContent = '—'; return; }
      const secs = Math.floor((Date.now() - c.ts) / 1000);
      if (secs < 60)  ageEl.textContent = `${secs}s ago`;
      else            ageEl.textContent = `${Math.floor(secs/60)}m ago`;
    });
  }, 1000);
}

function startDiscordPolling() {
  /* Fetch immediately, then every 30 s */
  DISCORD_SERVERS.forEach(s => fetchDiscordStats(s));
  setInterval(() => {
    DISCORD_SERVERS.forEach(s => fetchDiscordStats(s));
  }, 30_000);
  startAgeTicker();
}

/* ──────────────────────────────────────────────────────
   LOADER
────────────────────────────────────────────────────── */
(function initLoader() {
  const loader   = document.getElementById('loader');
  const bar      = document.querySelector('.loader-bar');
  const statusEl = document.getElementById('loaderStatus');
  const main     = document.getElementById('mainContent');

  const steps = [
    [0,   'INITIALIZING SYSTEMS...'],
    [15,  'LOADING ASSETS...'],
    [35,  'BUILDING 3D SCENE...'],
    [58,  'CALIBRATING EFFECTS...'],
    [78,  'FETCHING LIVE DATA...'],
    [92,  'ESTABLISHING CONNECTION...'],
    [100, 'WELCOME, VISITOR ♥'],
  ];

  let stepIdx = 0, progress = 0;

  function tick() {
    progress = Math.min(progress + (Math.random() * 2.8 + 0.8), 100);
    bar.style.width = progress + '%';
    if (stepIdx < steps.length && progress >= steps[stepIdx][0]) {
      statusEl.textContent = steps[stepIdx][1];
      stepIdx++;
    }
    if (progress < 100) {
      setTimeout(tick, 28 + Math.random() * 45);
    } else {
      setTimeout(() => {
        loader.classList.add('hidden');
        main.style.opacity = '1';
        startTypewriter();
        countUpStats();
        initNavbar();
        startDiscordPolling();
      }, 500);
    }
  }

  main.style.opacity  = '0';
  main.style.transition = 'opacity 0.7s ease';
  setTimeout(tick, 180);
})();

/* ──────────────────────────────────────────────────────
   BACKGROUND CANVAS  —  Stars + Meteors
────────────────────────────────────────────────────── */
(function initBgCanvas() {
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
    const count = Math.floor((W * H) / 3200) + 80;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.1,
        base: Math.random() * 0.45 + 0.06,
        spd:  0.002 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function spawnMeteor(rand) {
    return {
      x: rand ? Math.random() * W : Math.random() * W * 1.5 - W * 0.25,
      y: rand ? Math.random() * H * 0.7 : -40,
      vx: 1.1 + Math.random() * 1.8,
      vy: 2.0 + Math.random() * 3.0,
      alpha: 0.45 + Math.random() * 0.55,
      size:  0.5  + Math.random() * 2.2,
      trail: [],
      maxT:  22 + Math.floor(Math.random() * 18),
    };
  }

  const meteorsArr = [];
  function init() { for (let i = 0; i < 8; i++) meteorsArr.push(spawnMeteor(true)); }

  function draw() {
    tick++;
    ctx.clearRect(0, 0, W, H);

    stars.forEach(s => {
      const a = s.base + Math.sin(tick * s.spd + s.phase) * (s.base * 0.8);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
    });

    meteorsArr.forEach((m, i) => {
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > m.maxT) m.trail.shift();
      for (let t = 0; t < m.trail.length - 1; t++) {
        const p = (t + 1) / m.trail.length;
        ctx.strokeStyle = `rgba(255,255,255,${p * m.alpha * 0.5})`;
        ctx.lineWidth   = m.size * p;
        ctx.beginPath(); ctx.moveTo(m.trail[t].x, m.trail[t].y);
        ctx.lineTo(m.trail[t+1].x, m.trail[t+1].y); ctx.stroke();
      }
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 4.5);
      g.addColorStop(0,   `rgba(255,255,255,${m.alpha})`);
      g.addColorStop(0.4, `rgba(255,255,255,${m.alpha * 0.3})`);
      g.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(m.x, m.y, m.size * 4.5, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      m.x += m.vx; m.y += m.vy;
      if (m.x > W + 120 || m.y > H + 120) meteorsArr[i] = spawnMeteor(false);
    });

    if (meteorsArr.length < 16 && Math.random() < 0.007) meteorsArr.push(spawnMeteor(false));
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); }, { passive: true });
  resize(); init(); draw();
})();

/* ──────────────────────────────────────────────────────
   MOUSE TRAIL CANVAS
────────────────────────────────────────────────────── */
(function initTrail() {
  const canvas = document.getElementById('trailCanvas');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  let W, H;
  const particles = [];
  let mx = -999, my = -999;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  window.addEventListener('resize', resize, { passive: true });

  function spawnParticle() {
    const spread = 6;
    particles.push({
      x: mx + (Math.random() - 0.5) * spread,
      y: my + (Math.random() - 0.5) * spread,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6 - 0.3,
      r:  Math.random() * 1.8 + 0.3,
      a:  0.55 + Math.random() * 0.35,
      decay: 0.025 + Math.random() * 0.025,
    });
  }

  let frameTick = 0;
  function draw() {
    frameTick++;
    ctx.clearRect(0, 0, W, H);

    if (mx > 0 && frameTick % 2 === 0) {
      spawnParticle();
      if (Math.random() < 0.3) spawnParticle();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.a -= p.decay;
      if (p.a <= 0) { particles.splice(i, 1); continue; }

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      g.addColorStop(0,   `rgba(255,255,255,${p.a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${p.a * 0.4})`);
      g.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize(); draw();
})();

/* ──────────────────────────────────────────────────────
   NAVBAR
────────────────────────────────────────────────────── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  nav.classList.add('visible');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

/* ──────────────────────────────────────────────────────
   TYPEWRITER
────────────────────────────────────────────────────── */
function startTypewriter() {
  const el    = document.getElementById('typedText');
  const lines = [
    'Activity Schedule & About Me',
    'Builder. Community Runner.',
    'Knox Hub & Knox KeyPloits',
    'Based in IST ♥',
    'Always Building Something New.',
  ];
  let li = 0, ci = 0, del = false;

  function type() {
    const line = lines[li];
    if (!del) {
      el.textContent = line.slice(0, ++ci);
      if (ci === line.length) { del = true; setTimeout(type, 1900); return; }
      setTimeout(type, 50 + Math.random() * 45);
    } else {
      el.textContent = line.slice(0, --ci);
      if (ci === 0) { del = false; li = (li + 1) % lines.length; setTimeout(type, 280); return; }
      setTimeout(type, 25 + Math.random() * 18);
    }
  }
  type();
}

/* ──────────────────────────────────────────────────────
   COUNT-UP STATS
────────────────────────────────────────────────────── */
function countUpStats() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 55));
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur;
      if (cur >= target) clearInterval(iv);
    }, 22);
  });
}

/* ──────────────────────────────────────────────────────
   3D CARD TILT
────────────────────────────────────────────────────── */
(function initCardTilt() {
  document.querySelectorAll('.card-3d').forEach(card => {
    const inner = card.querySelector('.card-3d-inner');

    card.addEventListener('mousemove', e => {
      const r   = card.getBoundingClientRect();
      const dx  = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
      const dy  = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
      const mx  = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
      const my  = ((e.clientY - r.top)  / r.height * 100).toFixed(1);

      inner.style.transform = `perspective(900px) rotateX(${dy * -12}deg) rotateY(${dx * 12}deg) scale3d(1.025,1.025,1.025)`;
      inner.style.setProperty('--mx', mx + '%');
      inner.style.setProperty('--my', my + '%');
    });

    card.addEventListener('mouseleave', () => {
      inner.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      setTimeout(() => { inner.style.transform = ''; }, 300);
    });
  });
})();

/* ──────────────────────────────────────────────────────
   SCHEDULE
────────────────────────────────────────────────────── */
(function initSchedule() {
  const schedule = [
    { name: 'Monday',    hours: '12 AM — 12 PM',           note: '12 hours online', pct: 0.50 },
    { name: 'Tuesday',   hours: '1 PM — 10 PM',            note: '9 hours online',  pct: 0.375 },
    { name: 'Wednesday', hours: '11 AM — 12 AM',           note: '13 hours online', pct: 0.54 },
    { name: 'Thursday',  hours: '10 AM — 11 PM',           note: '13 hours online', pct: 0.54 },
    { name: 'Friday',    hours: '1 PM — 10 PM',            note: '9 hours online',  pct: 0.375 },
    { name: 'Saturday',  hours: '1 PM — 10 PM',            note: '9 hours online',  pct: 0.375 },
    { name: 'Sunday',    hours: '12 AM — 1 PM<br>12 PM+', note: 'Split session',   pct: 0.54 },
  ];

  const jsDay    = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const tabs     = document.querySelectorAll('.day-tab');
  const display  = document.getElementById('scheduleDisplay');

  function renderDay(idx) {
    const d = schedule[idx];
    display.innerHTML = `
      <div class="day-name">${d.name}</div>
      <div class="day-hours">${d.hours}</div>
      <div class="day-note">${d.note}</div>
      <div class="day-bar-wrap"><div class="day-bar" style="width:${(d.pct*100).toFixed(0)}%"></div></div>`;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDay(parseInt(tab.dataset.day, 10));
    });
  });

  if (tabs[todayIdx]) tabs[todayIdx].classList.add('today-marker');
  tabs.forEach(t => t.classList.remove('active'));
  tabs[todayIdx].classList.add('active');
  renderDay(todayIdx);
})();

/* ──────────────────────────────────────────────────────
   COPY ADDRESS
────────────────────────────────────────────────────── */
function copyAddress(addr, toastId) {
  const show = () => {
    const t = document.getElementById(toastId);
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  };
  navigator.clipboard.writeText(addr).then(show).catch(() => {
    const ta = Object.assign(document.createElement('textarea'),
      { value: addr, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta); show();
  });
}

/* ──────────────────────────────────────────────────────
   SCROLL REVEAL
────────────────────────────────────────────────────── */
(function initReveal() {
  const targets = document.querySelectorAll('.section, .card-3d, .crypto-card, .schedule-3d, .about-grid');
  targets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  targets.forEach(el => io.observe(el));
})();

/* ──────────────────────────────────────────────────────
   PARALLAX GRID
────────────────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const grid = document.querySelector('.grid-overlay');
  if (grid) grid.style.transform = `translateY(${window.scrollY * 0.12}px)`;
}, { passive: true });
