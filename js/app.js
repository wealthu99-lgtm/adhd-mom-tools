/* ===== ADHD Mom Tools - Main App (v2) =====
   Fixes: hash links, accurate background timer, safe text rendering,
   no alert/prompt/confirm (blocked in many in-app browsers), storage guards,
   and a Brain Dump engine that separates tasks from feelings and worries. */

/* ---------- Small helpers ---------- */
function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}
function safeJSON(key, fallback) {
  try {
    const raw = safeGet(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

function mk(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  }
  return legacyCopy(text);
}
function legacyCopy(text) {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    ok ? resolve() : reject(new Error('copy failed'));
  });
}

function flash(btn, message, original, ms) {
  btn.textContent = message;
  setTimeout(() => { btn.textContent = original; }, ms || 1500);
}

function copyWithFeedback(btn, text, original) {
  copyText(text)
    .then(() => flash(btn, 'Copied!', original))
    .catch(() => flash(btn, 'Press and hold to copy manually', original, 2500));
}

// Two-tap confirm: replaces confirm(), which many in-app browsers block.
function twoTap(btn, armedLabel, action) {
  const original = btn.textContent;
  let armed = false;
  let timer = null;
  btn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      btn.textContent = armedLabel;
      timer = setTimeout(() => { armed = false; btn.textContent = original; }, 3000);
      return;
    }
    clearTimeout(timer);
    armed = false;
    btn.textContent = original;
    action();
  });
}

function debounce(fn, ms) {
  let t;
  return function () {
    clearTimeout(t);
    const args = arguments;
    t = setTimeout(() => fn.apply(null, args), ms);
  };
}

/* ---------- Page title + navigation ---------- */
const pageState = { original: '', timerText: null };

function refreshTitle() {
  document.title = pageState.timerText || pageState.original;
}

const TIMER_URL = '/adhd-focus-timer/';
function goToTimer(min) {
  location.href = TIMER_URL + '?m=' + encodeURIComponent(min);
}

// Old links such as /#timer (from earlier blog posts) go to the real pages.
const LEGACY_HASH = {
  timer: '/adhd-focus-timer/', braindump: '/adhd-brain-dump/', threemusts: '/todays-3-musts/',
  nextaction: '/what-should-i-do-now/', timeblock: '/adhd-time-blocker/', routine: '/adhd-routine-builder/'
};

function initNavigation() {
  pageState.original = document.title;

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  // Offline support and "install the app".
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
  let deferredInstall = null;
  const installBtn = document.getElementById('install-btn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      try { await deferredInstall.userChoice; } catch (e) {}
      deferredInstall = null;
      installBtn.classList.add('hidden');
    });
  }
  window.addEventListener('appinstalled', () => { if (installBtn) installBtn.classList.add('hidden'); });

  const hash = (location.hash || '').replace('#', '');
  const onHome = location.pathname === '/' || /\/index\.html$/.test(location.pathname);
  if (onHome && LEGACY_HASH[hash]) location.replace(LEGACY_HASH[hash]);
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function confetti() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#3f7d68', '#d98f5f', '#8f7cc0', '#5b8fb5', '#e0b04a', '#d9808f'];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('span');
      s.className = 'confetti';
      s.style.left = Math.random() * 100 + 'vw';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.4) + 's';
      s.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 2600);
    }
  } catch (e) {}
}

/* ---------- FOCUS TIMER ---------- */
function initTimer() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  const root = document.querySelector('.timer-app');
  const wrap = document.getElementById('timer-ring-wrap');
  const modeLabel = document.getElementById('timer-mode-label');
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');
  const distractBtn = document.getElementById('timer-distracted');
  const fsBtn = document.getElementById('timer-fullscreen');
  const fsExit = document.getElementById('timer-fs-exit');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const customWrap = document.getElementById('custom-time-wrap');
  const customInput = document.getElementById('custom-minutes');
  const setCustomBtn = document.getElementById('set-custom');
  const autoBreakCheck = document.getElementById('auto-break');
  const soundCheck = document.getElementById('sound-enabled');
  const awakeCheck = document.getElementById('keep-awake');
  const soundSel = document.getElementById('focus-sound');
  const volume = document.getElementById('focus-volume');
  const styleBtns = document.querySelectorAll('.style-btn');
  const sessionList = document.getElementById('session-list');
  const sessionCount = document.getElementById('session-count');
  const statToday = document.getElementById('stat-today');
  const weekBars = document.getElementById('week-bars');
  const taskInput = document.getElementById('timer-task');
  const banner = document.getElementById('timer-banner');
  const bannerText = document.getElementById('timer-banner-text');
  const bannerActions = document.getElementById('timer-banner-actions');
  const breakIdea = document.getElementById('break-idea');
  const ringProgress = document.getElementById('timer-ring-progress');
  const pieWedge = document.getElementById('timer-pie-wedge');
  const RING = 2 * Math.PI * 54;
  const IDEAS = ['Stand up and stretch your arms overhead.', 'Drink a glass of water.', 'Look out a window for 20 seconds.', 'Roll your shoulders and unclench your jaw.', 'Step outside for a minute of fresh air.', 'Eat something with protein.', 'Walk to another room and back.', 'Send one kind text to someone.'];

  let focusSeconds = 25 * 60;
  let breakSeconds = 5 * 60;
  let mode = 'focus';            // 'focus' | 'break'
  let totalSeconds = focusSeconds;
  let remaining = focusSeconds;
  let endTime = 0;
  let running = false;
  let interval = null;
  let autoStartToken = 0;
  let audioCtx = null;
  let wakeLock = null;
  let items = [];
  let distractions = 0;
  let ext = false;               // true while running a "keep going" extension
  let noiseSrc = null;
  let noiseGain = null;
  let prefs = safeJSON('adhd-timer-prefs', {}) || {};

  if (ringProgress) ringProgress.style.strokeDasharray = RING;
  const fmt = (secs) => String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
  const savePrefs = () => safeSet('adhd-timer-prefs', JSON.stringify(prefs));

  /* ----- drawing ----- */
  function piePath(f) {
    if (f >= 0.999) return 'M60 4 A56 56 0 1 1 60 116 A56 56 0 1 1 60 4 Z';
    if (f <= 0.001) return '';
    const a = (1 - f) * 2 * Math.PI;                       // elapsed angle from 12 o'clock
    const x = 60 + 56 * Math.sin(a);
    const y = 60 - 56 * Math.cos(a);
    return 'M60 60 L' + x.toFixed(2) + ' ' + y.toFixed(2) + ' A56 56 0 ' + (f > 0.5 ? 1 : 0) + ' 1 60 4 Z';
  }

  function render() {
    display.textContent = fmt(remaining);
    const f = totalSeconds > 0 ? remaining / totalSeconds : 0;
    if (ringProgress) ringProgress.style.strokeDashoffset = RING * (1 - f);
    if (pieWedge) pieWedge.setAttribute('d', piePath(f));
    if (wrap) {
      const live = running || remaining < totalSeconds;
      wrap.classList.toggle('warn', live && f <= 0.2 && f > 0.08);
      wrap.classList.toggle('crit', live && f <= 0.08);
    }
    if (running) {
      pageState.timerText = fmt(remaining) + ' – ' + (mode === 'break' ? 'Break' : 'Focus');
      refreshTitle();
    }
  }

  function ui() {
    startBtn.disabled = running;
    pauseBtn.disabled = !running;
    distractBtn.classList.toggle('hidden', !(running && mode === 'focus'));
    breakIdea.classList.toggle('hidden', !(running && mode === 'break'));
    modeLabel.textContent = mode === 'break' ? (breakSeconds >= 600 ? 'Long Break' : 'Short Break') : (ext ? 'Keep Going' : 'Focus Time');
    render();
  }

  function say(text, actions) {
    bannerText.textContent = text || '';
    bannerActions.textContent = '';
    (actions || []).forEach(a => {
      const b = mk('button', 'btn btn-primary btn-sm', a.label);
      b.type = 'button';
      b.addEventListener('click', a.fn);
      bannerActions.appendChild(b);
    });
    banner.classList.toggle('hidden', !text);
  }

  /* ----- audio ----- */
  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }
  function chime() {
    if (soundCheck && soundCheck.checked && audioCtx) {
      try {
        [0, 0.35].forEach((offset, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.frequency.value = i ? 660 : 520;
          const t = audioCtx.currentTime + offset;
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
          osc.start(t); osc.stop(t + 0.8);
        });
      } catch (e) {}
    }
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  function noiseBuffer(type) {
    const len = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else d[i] = w * 0.5;
    }
    // Fade the loop edges so the loop point does not click.
    const fade = Math.floor(audioCtx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) { const g = i / fade; d[i] *= g; d[len - 1 - i] *= g; }
    return buf;
  }
  function stopNoise() {
    try { if (noiseSrc) noiseSrc.stop(); } catch (e) {}
    try { if (noiseSrc) noiseSrc.disconnect(); if (noiseGain) noiseGain.disconnect(); } catch (e) {}
    noiseSrc = null; noiseGain = null;
  }
  function startNoise() {
    stopNoise();
    const type = soundSel ? soundSel.value : 'off';
    if (type === 'off') return;
    unlockAudio();
    if (!audioCtx) return;
    try {
      noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = noiseBuffer(type);
      noiseSrc.loop = true;
      noiseGain = audioCtx.createGain();
      noiseGain.gain.value = (volume ? volume.value : 40) / 100 * 0.5;
      noiseSrc.connect(noiseGain); noiseGain.connect(audioCtx.destination);
      noiseSrc.start();
    } catch (e) { noiseSrc = null; }
  }

  async function lockScreen() {
    if (awakeCheck && !awakeCheck.checked) return;
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
  }
  function releaseScreen() {
    try { if (wakeLock) wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }

  /* ----- history ----- */
  function rowText(it) {
    if (typeof it === 'string') return it;
    return it.t + ' · ' + it.m + ' min ' + (it.k === 'break' ? 'break' : it.ext ? 'extra focus' : 'focus') + (it.task ? ' · ' + it.task : '') + (it.d ? ' · ' + it.d + ' distraction' + (it.d > 1 ? 's' : '') : '');
  }
  const focusDone = () => items.filter(i => i && i.k === 'focus' && !i.ext).length;
  function paintCount() { if (sessionCount) sessionCount.textContent = String(focusDone()); }

  function loadSessions() {
    const saved = safeJSON('adhd-sessions-v2', null);
    if (saved && saved.day === todayKey() && Array.isArray(saved.items)) items = saved.items;
    items.slice().reverse().forEach(it => sessionList.appendChild(mk('li', '', rowText(it))));
    paintCount();
  }
  function logSession(minutes, kind, isExt) {
    const it = { t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), m: minutes, k: kind, ext: !!isExt, d: kind === 'focus' ? distractions : 0, task: kind === 'focus' && taskInput ? taskInput.value.trim() : '' };
    items.push(it);
    sessionList.insertBefore(mk('li', '', rowText(it)), sessionList.firstChild);
    safeSet('adhd-sessions-v2', JSON.stringify({ day: todayKey(), items: items }));
    paintCount();
  }

  function paintStats() {
    const all = safeJSON('adhd-focus-minutes', {}) || {};
    if (statToday) statToday.textContent = String(all[todayKey()] || 0);
    if (!weekBars) return;
    weekBars.textContent = '';
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const vals = days.map(d => all[d.toLocaleDateString('en-CA')] || 0);
    const max = Math.max(60, ...vals);
    days.forEach((d, i) => {
      const col = mk('div', 'week-col');
      const bar = mk('div', 'week-bar');
      bar.style.height = Math.max(vals[i] ? 8 : 3, Math.round(vals[i] / max * 100)) + '%';
      bar.title = vals[i] + ' min';
      col.appendChild(bar);
      col.appendChild(mk('span', 'week-day', d.toLocaleDateString(undefined, { weekday: 'narrow' })));
      weekBars.appendChild(col);
    });
  }
  function addMinutes(m) {
    const all = safeJSON('adhd-focus-minutes', {}) || {};
    all[todayKey()] = (all[todayKey()] || 0) + m;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 40);
    Object.keys(all).forEach(k => { if (new Date(k) < cutoff) delete all[k]; });
    safeSet('adhd-focus-minutes', JSON.stringify(all));
    paintStats();
  }

  /* ----- the clock ----- */
  function tick() {
    remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    render();
    if (remaining <= 0) complete();
  }

  function setFocusState() {
    mode = 'focus'; ext = false;
    totalSeconds = focusSeconds; remaining = totalSeconds;
  }

  function complete() {
    clearInterval(interval);
    running = false;
    releaseScreen(); stopNoise(); chime();
    const wasExt = ext;
    const mins = Math.max(1, Math.round(totalSeconds / 60));
    logSession(mins, mode, wasExt);
    if (mode === 'focus') addMinutes(mins);
    distractions = 0;
    pageState.timerText = '✓ Time’s up – ' + pageState.original;
    refreshTitle();

    if (mode === 'focus') {
      confetti();
      const n = focusDone();
      if (!wasExt) breakSeconds = (n % 4 === 0 && n > 0) ? 15 * 60 : 5 * 60;
      const msg = 'Nice work. That is ' + n + ' focus session' + (n === 1 ? '' : 's') + ' today.';
      if (autoBreakCheck && autoBreakCheck.checked) {
        mode = 'break'; ext = false;
        totalSeconds = breakSeconds; remaining = totalSeconds;
        say(msg + ' Break time.');
        ui();
        const token = ++autoStartToken;
        setTimeout(() => { if (token === autoStartToken && !running) start(); }, 800);
        return;
      }
      setFocusState();
      say(msg, [
        { label: 'Keep going +5 min', fn: () => extend(5) },
        { label: 'Start my ' + (breakSeconds / 60) + '-min break', fn: startBreak }
      ]);
    } else {
      setFocusState();
      say('Break’s over. Ready when you are.', [{ label: 'Start next focus', fn: () => start() }]);
    }
    ui();
  }

  function start() {
    if (running) return;
    unlockAudio();
    running = true;
    if (mode === 'focus') say(''); else say(bannerText.textContent || '');
    if (mode === 'break') breakIdea.textContent = '💡 ' + IDEAS[Math.floor(Math.random() * IDEAS.length)];
    pageState.timerText = null;
    endTime = Date.now() + remaining * 1000;
    clearInterval(interval);
    interval = setInterval(tick, 250);
    lockScreen();
    startNoise();
    ui();
  }

  function pause() {
    if (!running) return;
    tick();
    if (!running) return;
    clearInterval(interval);
    running = false;
    releaseScreen(); stopNoise();
    pageState.timerText = null;
    refreshTitle();
    startBtn.textContent = 'Resume';
    ui();
  }

  function reset() {
    autoStartToken++;
    clearInterval(interval);
    running = false;
    releaseScreen(); stopNoise();
    distractions = 0;
    setFocusState();
    pageState.timerText = null;
    refreshTitle();
    say('');
    startBtn.textContent = 'Start';
    ui();
  }

  function extend(mins) {
    ext = true; mode = 'focus';
    totalSeconds = mins * 60; remaining = totalSeconds;
    say('');
    start();
  }
  function startBreak() {
    mode = 'break'; ext = false;
    totalSeconds = breakSeconds; remaining = totalSeconds;
    start();
  }

  function setMinutes(mins) {
    focusSeconds = mins * 60;
    reset();
  }

  /* ----- full screen ----- */
  function setFs(on) {
    root.classList.toggle('is-fullscreen', on);
    fsExit.classList.toggle('hidden', !on);
    document.body.classList.toggle('no-scroll', on);
    try {
      if (on && root.requestFullscreen) root.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) {}
  }
  fsBtn.addEventListener('click', () => setFs(true));
  fsExit.addEventListener('click', () => setFs(false));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && root.classList.contains('is-fullscreen')) setFs(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('is-fullscreen')) setFs(false); });

  /* ----- controls ----- */
  document.addEventListener('visibilitychange', () => {
    if (running && !document.hidden) { tick(); if (running) lockScreen(); }
  });
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.target !== document.body) return;
    e.preventDefault();
    running ? pause() : start();
  });

  distractBtn.addEventListener('click', () => {
    distractions++;
    const msg = 'That’s okay. Welcome back. Let’s keep going.';
    say(msg);
    setTimeout(() => { if (bannerText.textContent === msg && running) say(''); }, 2500);
  });

  function selectPreset(min) {
    let matched = false;
    presetBtns.forEach(b => {
      const on = b.dataset.min === String(min);
      if (on) matched = true;
      b.classList.toggle('active', on);
    });
    if (!matched) {
      presetBtns.forEach(b => b.classList.toggle('active', b.dataset.min === 'custom'));
      customWrap.classList.remove('hidden');
      customInput.value = String(min);
    } else {
      customWrap.classList.add('hidden');
    }
  }
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.min === 'custom') {
        customWrap.classList.remove('hidden');
        customInput.focus();
      } else {
        customWrap.classList.add('hidden');
        setMinutes(parseInt(btn.dataset.min, 10));
      }
    });
  });
  function applyCustom() {
    const val = parseInt(customInput.value, 10);
    if (val >= 1 && val <= 180) {
      customInput.setCustomValidity('');
      setMinutes(val);
    } else {
      customInput.setCustomValidity('Enter a number from 1 to 180');
      customInput.reportValidity();
    }
  }
  setCustomBtn.addEventListener('click', applyCustom);
  customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCustom(); });
  customInput.addEventListener('input', () => customInput.setCustomValidity(''));

  document.querySelectorAll('.quick-task').forEach(btn => {
    btn.addEventListener('click', () => {
      taskInput.value = btn.dataset.label;
      const m = parseInt(btn.dataset.min, 10);
      selectPreset(m);
      setMinutes(m);
    });
  });

  /* ----- look, sound and saved preferences ----- */
  function applyStyle(st) {
    wrap.classList.toggle('style-pie', st === 'pie');
    styleBtns.forEach(b => b.classList.toggle('active', b.dataset.style === st));
  }
  styleBtns.forEach(b => b.addEventListener('click', () => { prefs.style = b.dataset.style; savePrefs(); applyStyle(prefs.style); }));
  applyStyle(prefs.style || root.dataset.defaultStyle || 'ring');

  if (soundSel) {
    soundSel.value = prefs.sound || 'off';
    soundSel.addEventListener('change', () => {
      prefs.sound = soundSel.value; savePrefs();
      if (running) { startNoise(); return; }
      if (soundSel.value !== 'off') { startNoise(); setTimeout(() => { if (!running) stopNoise(); }, 4000); } else stopNoise();
    });
  }
  if (volume) {
    if (prefs.volume !== undefined) volume.value = prefs.volume;
    volume.addEventListener('input', () => {
      prefs.volume = volume.value; savePrefs();
      if (noiseGain) noiseGain.gain.value = volume.value / 100 * 0.5;
    });
  }
  [['auto', autoBreakCheck], ['chime', soundCheck], ['awake', awakeCheck]].forEach(pair => {
    const key = pair[0], el = pair[1];
    if (!el) return;
    if (prefs[key] !== undefined) el.checked = !!prefs[key];
    el.addEventListener('change', () => { prefs[key] = el.checked; savePrefs(); });
  });

  /* ----- start-up ----- */
  const activePreset = document.querySelector('.preset-btn.active');
  if (activePreset && /^\d+$/.test(activePreset.dataset.min)) focusSeconds = parseInt(activePreset.dataset.min, 10) * 60;
  totalSeconds = focusSeconds; remaining = focusSeconds;
  ui();
  loadSessions();
  paintStats();

  // Arriving from another tool with ?m=10 pre-sets the length.
  try {
    const m = parseInt(new URLSearchParams(location.search).get('m'), 10);
    if (m >= 1 && m <= 180) { selectPreset(m); setMinutes(m); }
  } catch (e) {}
}

/* ---------- BRAIN DUMP: the thinking part ---------- */
const BD = (function () {
  function norm(s) {
    return String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  }
  // Word-boundary matcher for a list of regex fragments (no lookbehind: older Safari).
  function rx(list) {
    return new RegExp('(?:^|[^a-z])(?:' + list.join('|') + ')(?![a-z])', 'i');
  }

  const SAFETY = rx([
    'kill myself', 'killing myself', 'want to die', 'wanna die', 'end my life', 'end it all',
    'suicid(?:e|al)', 'hurt myself', 'hurting myself', 'self.?harm', "don't want to be here",
    'no point in living', 'better off without me', "can't go on", 'cant go on'
  ]);

  const SELFCRIT_STRICT = rx([
    'bad mom', 'bad mother', 'terrible mom', 'terrible mother', 'hate myself', 'not good enough',
    "can't do anything right", 'cant do anything right', 'failing my kids', 'failing as a mom',
    'worthless', 'not a good mom', 'not a good mother'
  ]);
  const SELFCRIT_LOOSE = /(?:^|[^a-z])i(?:'m| am| feel| feel like)\b[^.]*?(?:^|[^a-z])(?:a failure|failure|failing|useless|stupid|lazy|hopeless|broken|a mess|messed up|ruined everything|screwed up)(?![a-z])/i;

  const FEELINGS = [
    { label: 'overwhelmed', re: rx(['overwhelm(?:ed|ing)?', 'drowning', 'too much', 'falling apart', "can't cope", 'cant cope', "can't do this", 'cant do this', 'so behind', 'behind on everything']) },
    { label: 'exhausted', re: rx(['exhaust(?:ed|ion)', 'tired', 'drained', 'burn(?:ed|t)[ -]?out', 'burnout', 'no energy', 'touched[ -]?out', 'wiped']) },
    { label: 'anxious', re: rx(['anxious', 'anxiety', 'stressed', 'stress', 'scared', 'afraid', 'panick?(?:ing|ed)?', 'nervous', 'on edge']) },
    { label: 'guilty', re: rx(['guilty', 'guilt', 'mom guilt', 'ashamed', 'shame']) },
    { label: 'frustrated', re: rx(['angry', 'furious', 'rage', 'frustrat(?:ed|ing)', 'resent(?:ful|ment)', 'irritable', 'sick of', 'fed up']) },
    { label: 'lonely', re: rx(['lonely', 'alone', 'isolated']) },
    { label: 'low', re: rx(['sad', 'depressed', 'numb', 'empty', 'hopeless', 'unmotivated', 'no motivation', "i'm crying", 'i am crying', 'want to cry', 'feel like crying']) },
    { label: 'foggy', re: rx(['foggy', 'brain fog', "can't focus", 'cant focus', "can't think", 'cant think', "can't concentrate"]) }
  ];

  const FEEL_REPLY = {
    overwhelmed: 'Overwhelm means the load is too big for one head, not that you are failing. Shrinking the list is the fix.',
    exhausted: 'Running on empty makes everything look harder than it is. Rest counts as part of the plan.',
    anxious: 'Anxious thoughts feel urgent, but most of them can wait. You can park them and still be a responsible person.',
    guilty: 'Guilt usually shows up where you care the most. It is not proof that you did something wrong.',
    frustrated: 'Frustration is a signal that something is unfair or unsustainable. It deserves attention, not shame.',
    lonely: 'Feeling alone in the load is hard. One small message to someone safe can change the day.',
    low: 'Heavy days are real. If this has lasted more than a couple of weeks, please tell your doctor or a therapist.',
    foggy: 'A foggy brain needs fewer choices, not more willpower. One thing at a time is plenty.'
  };

  const FEEL_FIRST_STEP = {
    overwhelmed: 'Pick ONE thing from your list, any thing, and give it five minutes.',
    exhausted: 'Sit or lie down for four minutes with your phone away. Then come back to this list.',
    anxious: 'Name five things you can see, then take three slow breaths. The worries can wait in the park list.',
    guilty: 'Say out loud: “I am doing what I can today.” Then choose one small thing.',
    frustrated: 'Step outside or to a window for one minute of air. Let your shoulders drop.',
    lonely: 'Send one text to someone who gets it. Even a heart emoji counts.',
    low: 'Drink a glass of water and open a window. Then pick the tiniest thing on your list.',
    foggy: 'Write down just ONE thing you must remember today. Ignore the rest for now.'
  };

  const FEEL_START = /^(?:i(?:'m| am| feel| feel like| keep feeling)|feeling|feel like|im )\b/i;

  const VERBS = ['call', 'phone', 'ring', 'email', 'text', 'message', 'reply', 'respond', 'buy', 'order', 'pay', 'book', 'schedule', 'reschedule', 'cancel', 'clean', 'wash', 'fold', 'cook', 'pack', 'unpack', 'pick', 'drop', 'finish', 'send', 'fill', 'sign', 'renew', 'return', 'register', 'enroll', 'make', 'fix', 'tidy', 'vacuum', 'mop', 'sort', 'plan', 'organi[sz]e', 'prepare', 'prep', 'take', 'bring', 'find', 'look', 'check', 'research', 'apply', 'print', 'charge', 'refill', 'change', 'replace', 'mail', 'post', 'submit', 'follow', 'remember', 'do', 'get', 'write', 'start', 'set', 'put', 'add', 'ask', 'tell', 'remind', 'confirm', 'rsvp', 'declutter', 'wrap', 'water', 'feed', 'walk', 'shower', 'update', 'book', 'sew', 'iron', 'defrost', 'bake', 'restock', 'throw', 'empty', 'load', 'unload', 'return', 'collect', 'meet', 'attend', 'visit', 'go', 'ship', 'deliver', 'sell', 'donate', 'figure', 'sign'];
  const VERB_START = new RegExp('^(?:' + VERBS.join('|') + ')\\b', 'i');
  const TASK_NOUNS = rx(['laundry', 'dishes', 'groceries', 'grocery', 'bills?', 'taxes', 'appointment', 'permission slip', 'forms?', 'homework', 'lunches', 'dinner', 'meal prep', 'gift', 'present', 'invoice', 'paperwork', 'prescription', 'rsvp', 'deadline', 'recital', 'birthday']);

  const TIME_NOW = rx(['asap', 'urgent(?:ly)?', 'emergency', 'right now', 'immediately', 'overdue', 'past due', 'final notice', 'last day', 'due today', 'expires today', 'ran out', 'run out', 'running out', 'out of', 'no more', 'last chance']);
  const TIME_TODAY = rx(['today', 'tonight', 'this morning', 'this afternoon', 'this evening', 'eod', 'end of (?:the )?day', 'before (?:school|bed|bedtime|dinner|noon|pick ?up|work)', 'by (?:\\d{1,2}(?::\\d\\d)? ?(?:am|pm)|noon|midday)']);
  const TIME_TOMORROW = rx(['tomorrow', 'tmrw', 'tmr']);
  const WEEKDAY = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thu(?:rs)?|fri|sat|sun)';
  const TIME_WEEK = new RegExp('(?:^|[^a-z])(?:this week|this weekend|' + WEEKDAY + '|due|deadline|appointment|\\d{1,2}/\\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.? \\d{1,2})(?![a-z])', 'i');
  const TIME_LATER = rx(['next week', 'next month', 'next year', 'someday', 'some day', 'eventually', 'at some point', 'one day', 'when i have time', 'when i get a chance', 'sometime', 'later this year', 'in the future', 'maybe', 'might']);
  const ASPIRE = rx(['should', 'ought to', 'supposed to', 'wish i could', 'really need to start', 'want to start', 'want to get back', 'get back into', 'be better at', 'be more']);

  const WORRY = /(?:^|[^a-z])(?:what if|what about|keep (?:thinking|worrying)|(?:worried|worry|worrying|afraid|scared|anxious|nervous) (?:that|about|of|if)|what will (?:people|they|everyone) think)(?![a-z])/i;
  const SUPPORT = rx(['nobody helps', 'no one helps', 'no help', 'no support', 'do everything', 'doing everything', 'all alone', 'on my own', 'by myself']);
  const COMPLAINT = /^(?:i(?:'m| am| can't| cant| don't| dont| wish| hate| never| always| just| keep| feel)|nobody|no one|everyone|everything|why (?:do|does|is|am|can't|cant)|it's|its)\b/i;
  const REGRET = rx(['should have', "shouldn't have", 'wish i had', "wish i hadn't", 'if only', 'i regret']);

  const DOMAINS = [
    { key: 'health', emoji: '🩺', label: 'Health', re: rx(['doctor', 'dentist', 'appointment', 'prescription', 'medication', 'meds', 'refill', 'pharmacy', 'therapist', 'therapy', 'vaccin(?:e|ation)', 'check-?up', 'physio', 'optometrist', 'eye exam', 'blood test', 'sick', 'fever', 'cough', 'dermatologist']) },
    { key: 'kids', emoji: '🧒', label: 'Kids', re: rx(['kids?', 'child', 'children', 'son', 'daughter', 'baby', 'toddler', 'school', 'teacher', 'homework', 'daycare', 'preschool', 'pediatrician', 'soccer', 'practice', 'play ?date', 'permission slip', 'lunch ?box', 'lunches', 'bedtime', 'diapers?', 'nappies', 'formula', 'recital', 'field trip', 'report card', 'uniform', 'kindergarten']) },
    { key: 'work', emoji: '💼', label: 'Work', re: rx(['work', 'boss', 'clients?', 'meeting', 'report', 'project', 'presentation', 'shift', 'manager', 'colleague', 'coworker', 'job', 'interview', 'resume', 'cv', 'proposal', 'zoom', 'slides']) },
    { key: 'money', emoji: '💳', label: 'Money & admin', re: rx(['bills?', 'pay', 'rent', 'mortgage', 'insurance', 'tax(?:es)?', 'invoice', 'bank', 'budget', 'forms?', 'paperwork', 'renew(?:al)?', 'passport', 'licen[sc]e', 'cancel', 'refund', 'subscription', 'account', 'claim', 'deposit', 'loan', 'fees?', 'registration', 'register', 'sign up', 'signup', 'enroll']) },
    { key: 'home', emoji: '🏠', label: 'Home', re: rx(['laundry', 'dishes', 'dishwasher', 'clean', 'tidy', 'vacuum', 'mop', 'kitchen', 'bathroom', 'toilet', 'trash', 'garbage', 'bins', 'dinner', 'cook', 'meals?', 'meal prep', 'fridge', 'floors?', 'declutter', 'fold', 'wash', 'beds?', 'sheets', 'dust', 'garden', 'lawn', 'repair', 'fix', 'plumber', 'leak', 'broken']) },
    { key: 'people', emoji: '💬', label: 'People', re: rx(['husband', 'partner', 'wife', 'friends?', 'mom', 'mum', 'mother', 'dad', 'father', 'sister', 'brother', 'grandma', 'grandpa', 'in-?laws', 'family', 'birthday', 'party', 'gift', 'present', 'card', 'wedding', 'visit']) },
    { key: 'errands', emoji: '🛒', label: 'Errands', re: rx(['groceries', 'grocery', 'shopping', 'store', 'buy', 'order', 'amazon', 'pick up', 'post office', 'library', 'dry cleaning', 'gas', 'petrol', 'fuel', 'car wash', 'oil change', 'mail', 'package', 'parcel', 'return']) },
    { key: 'self', emoji: '🌿', label: 'Me', re: rx(['shower', 'nap', 'rest', 'sleep', 'walk', 'exercise', 'gym', 'workout', 'yoga', 'hair', 'nails', 'meditat(?:e|ion)', 'journal', 'read', 'me time', 'break', 'eat', 'lunch', 'breakfast', 'water', 'stretch', 'bath']) }
  ];

  const TINY = /^(?:text|message|reply|respond|email|order|pay|book|schedule|reschedule|cancel|sign|send|check|look up|find|print|charge|refill|rsvp|renew|mail|post|put|add|remind|confirm|ask|tell|buy|return|call|phone)\b/i;
  const BIG = rx(['clean(?:ing)?', 'organi[sz](?:e|ing)', 'declutter(?:ing)?', 'plan', 'research', 'write', 'report', 'taxes', 'pack', 'meal prep', 'party', 'move', 'sort', 'clear out', 'go through', 'catch up', 'finish', 'whole', 'entire', 'all the', 'everything', 'redo', 'renovate', 'deep clean', 'paperwork', 'projects?']);

  const MICRO = [
    [/(?:^|[^a-z])(?:out of|ran out|run out|running out)(?![a-z])/i, 'Add it to your shopping list or order it online now. That is the whole step.'],
    [/(?:^|[^a-z])laundry(?![a-z])/i, 'Start just one load. Getting it into the machine is the whole step.'],
    [/(?:^|[^a-z])(?:dishes|dishwasher)(?![a-z])/i, 'Load or wash five items. Stop there if you need to.'],
    [/(?:^|[^a-z])(?:clean|tidy|vacuum|mop|dust)(?![a-z])/i, 'Set a 10-minute timer and clean one surface or one corner only.'],
    [/(?:^|[^a-z])(?:organi[sz]e|declutter|sort|go through|clear out)(?![a-z])/i, 'Pick one drawer, shelf or pile. Only that one.'],
    [/(?:^|[^a-z])(?:paperwork|forms?|taxes|documents)(?![a-z])/i, 'Put every related paper into one folder. Don’t sort. Just gather.'],
    [/(?:^|[^a-z])(?:bills?|pay|rent|invoice)(?![a-z])/i, 'Open the bill and the payment page. Nothing more for now.'],
    [/(?:^|[^a-z])(?:doctor|dentist|therapist|prescription|refill|pharmacy|appointment|book|schedule|reschedule)(?![a-z])/i, 'Find the phone number or booking page and leave it open on your screen.'],
    [/(?:^|[^a-z])(?:call|phone|ring)(?![a-z])/i, 'Find the number, put it on screen, then press call. A voicemail still counts.'],
    [/(?:^|[^a-z])(?:email|reply|respond|message|text)(?![a-z])/i, 'Open it and type just the first line. It can be messy.'],
    [/(?:^|[^a-z])(?:buy|order|groceries|grocery|shopping)(?![a-z])/i, 'Add it to your shopping list right now. That is the whole step.'],
    [/(?:^|[^a-z])(?:cook|dinner|meal|lunch|lunches)(?![a-z])/i, 'Decide in one sentence: one protein plus one side. Plain is fine.'],
    [/(?:^|[^a-z])(?:write|report|proposal|presentation|essay|homework)(?![a-z])/i, 'Open it and write one messy sentence. Fix nothing.'],
    [/(?:^|[^a-z])(?:plan|research)(?![a-z])/i, 'Write three bullet points about what “done” would include. Stop there.'],
    [/(?:^|[^a-z])(?:pack|packing)(?![a-z])/i, 'Put the bag where you can see it and add the first three items.'],
    [/(?:^|[^a-z])(?:shower|bath)(?![a-z])/i, 'Turn the water on. That is the whole first step.'],
    [/(?:^|[^a-z])(?:walk|exercise|gym|workout|yoga|stretch)(?![a-z])/i, 'Put your shoes on, or just stand up and stretch for one minute.']
  ];
  const MICRO_DEFAULT = 'Spend five minutes on only the very first step, then decide if you want to keep going.';

  function microFor(text) {
    for (let i = 0; i < MICRO.length; i++) if (MICRO[i][0].test(text)) return MICRO[i][1];
    return MICRO_DEFAULT;
  }

  /* --- splitting --- */
  const ABBR = /\b(dr|mr|mrs|ms|st|vs|etc|approx)\./gi;

  const SUBORD = /^(?:because|so|but|which|that|if|when|since|while|as|though|although|until|unless|or|then)\b/i;
  function splitRunOn(p) {
    if (p.length <= 55 || !/,|\b(?:and|plus|also)\b/i.test(p)) return [p];
    const bits = p.split(/(,\s*|\s+(?:and|plus|also)\s+)/i);
    const out = [bits[0]];
    for (let i = 1; i < bits.length; i += 2) {
      const sep = bits[i];
      const piece = (bits[i + 1] || '').trim();
      if (!piece) continue;
      const isComma = sep.indexOf(',') !== -1;
      const startsNew = isComma
        ? !SUBORD.test(piece)
        : (VERB_START.test(cleanTask(piece)) || FEEL_START.test(piece) || /^(?:i|we|he|she|they|the|my|our)\b/i.test(piece));
      if (startsNew) out.push(piece);
      else out[out.length - 1] += (isComma ? ', ' : ' and ') + piece;
    }
    return out;
  }

  function splitItems(raw) {
    let text = norm(raw).replace(/\r/g, '\n');
    text = text.replace(ABBR, '$1\u0001');
    text = text.replace(/\b([ap])\.m\./gi, '$1\u0002m\u0001');
    text = text.replace(/(^|\n)\s*(?:[-*•·]|\d+[.)])\s+/g, '$1');      // list markers at line start only
    text = text.replace(/[•·]/g, '\n');                                  // inline bullets
    text = text.replace(/([.!?])\s+/g, '$1\n');                          // sentences
    text = text.replace(/;\s*/g, '\n');

    let parts = text.split('\n').map(s => s.replace(/[\u0001]/g, '.').replace(/\u0002/g, '.').trim()).filter(Boolean);

    // Long run-on lines: break at commas and joiners, but keep "because..." clauses attached.
    parts = parts.reduce((acc, p) => acc.concat(splitRunOn(p)), []);
    return parts
      .map(s => s.replace(/^(?:and|also|plus|then|oh|um|ok|okay|so)\s+/i, '').replace(/[.!,\s]+$/g, '').trim())
      .filter(s => s.length > 2);
  }

  /* --- cleaning a task phrase --- */
  const FILLER = /^(?:i(?:'ve| have)? (?:really |just )?(?:need|have|got|gotta|must|should|ought|want|forgot|keep forgetting)(?: to| got to)?|i'?ve got to|need to|have to|has to|must|gotta|remember to|don'?t forget to|dont forget to|make sure to|make sure i|don'?t forget)\s+/i;

  function cleanTask(s) {
    let t = s.replace(FILLER, '').replace(/^to\s+/i, '').trim();
    if (!t) t = s;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /* --- classification --- */
  function feelingLabelsIn(s) {
    const out = [];
    FEELINGS.forEach(f => { if (f.re.test(s)) out.push(f.label); });
    return out;
  }

  function domainOf(s) {
    for (let i = 0; i < DOMAINS.length; i++) if (DOMAINS[i].re.test(s)) return DOMAINS[i];
    return null;
  }

  function scoreTask(s, domain, effort) {
    let score = 0;
    if (TIME_NOW.test(s)) score += 5;
    else if (TIME_TODAY.test(s)) score += 4;
    else if (TIME_TOMORROW.test(s)) score += 3;
    else if (TIME_WEEK.test(s)) score += 2;
    const timeScore = score;
    if (TIME_LATER.test(s)) score -= 3;
    if (ASPIRE.test(s) && timeScore < 2) score -= 2;
    if (domain && domain.key === 'health') score += 2;
    else if (domain && domain.key === 'kids') score += 1;
    if (/(?:^|[^a-z])forgot(?![a-z])/i.test(s)) score += 1;
    if (effort === 'tiny') score += 1;
    if (effort === 'big') score -= 1;
    return score;
  }

  function effortOf(s) {
    if (/(?:^|[^a-z])(?:out of|ran out|run out|running out)(?![a-z])/i.test(s)) return 'tiny';
    if (BIG.test(s)) return 'big';
    if (TINY.test(s)) return 'tiny';
    return 'medium';
  }

  function classify(item) {
    const raw = item;
    const s = norm(raw);

    if (SAFETY.test(s)) {
      return { kind: 'feeling', text: raw, labels: ['low'], reply: 'That sounds incredibly heavy. Please read the note at the top of this page.' };
    }
    if (SUPPORT.test(s)) {
      return { kind: 'feeling', text: raw, labels: ['exhausted'], reply: 'Carrying it all alone is exhausting. Is there one specific thing you could ask someone for this week?' };
    }
    if (WORRY.test(s)) return { kind: 'worry', text: raw };
    if (REGRET.test(s)) return { kind: 'regret', text: raw };

    const labels = feelingLabelsIn(s);
    const startsAsFeeling = FEEL_START.test(s);
    const selfcrit = SELFCRIT_STRICT.test(s) || SELFCRIT_LOOSE.test(s);
    const verbStart = VERB_START.test(cleanTask(s));
    const actionable = verbStart || TASK_NOUNS.test(s);

    if (labels.length || startsAsFeeling || selfcrit) {
      // "call mom but I'm so tired" is mostly a task; "I'm so tired" is a feeling.
      const mostlyTask = verbStart && !startsAsFeeling && !selfcrit;
      if (!mostlyTask) {
        return { kind: 'feeling', text: raw, labels: labels, reply: selfcrit ? 'That is a harsh thing to say to someone carrying this much. Try talking to yourself the way you would talk to a friend.' : undefined };
      }
    }

    if (!actionable && !TIME_NOW.test(s) && !domainOf(s)) {
      if (COMPLAINT.test(s)) {
        const lost = /don't know what to do|dont know what to do|don't know where to start|dont know where to start/i.test(s);
        return { kind: 'feeling', text: raw, labels: [], reply: lost ? 'When you don’t know where to start, the answer is the smallest thing on your list. The plan below picks one for you.' : 'That sounds heavy. You do not have to fix it right now.' };
      }
      if (s.split(/\s+/).length > 5) return { kind: 'note', text: raw };
    }

    const text = cleanTask(raw);
    const domain = domainOf(s);
    const effort = effortOf(text);
    return {
      kind: 'task',
      text: text,
      domain: domain,
      effort: effort,
      score: scoreTask(s, domain, effort),
      micro: effort === 'tiny' ? null : microFor(s),
      vague: !actionable
    };
  }

  /* --- the whole analysis --- */
  const CAP = { low: 2, okay: 3, good: 5 };

  function analyze(rawText, energy) {
    energy = CAP[energy] ? energy : 'okay';
    const text = norm(rawText || '');
    const result = {
      safety: SAFETY.test(text),
      energy: energy,
      total: 0,
      feelings: [],
      selfCrit: [],
      today: [], week: [], later: [],
      feelingItems: [], park: [], notes: [],
      startHere: null,
      ack: []
    };
    if (!text.trim()) return result;

    const items = splitItems(text);
    result.total = items.length;

    // Feelings anywhere in the text (even inside task lines).
    FEELINGS.forEach(f => { if (f.re.test(text)) result.feelings.push(f.label); });
    items.forEach(it => {
      const n = norm(it);
      if (SELFCRIT_STRICT.test(n) || SELFCRIT_LOOSE.test(n)) result.selfCrit.push(it);
    });

    const tasks = [];
    items.forEach(it => {
      const c = classify(it);
      if (c.kind === 'task') tasks.push(c);
      else if (c.kind === 'feeling') {
        const label = (c.labels && c.labels[0]) || result.feelings[0] || null;
        result.feelingItems.push({ text: c.text, reply: c.reply || (label ? FEEL_REPLY[label] : 'That sounds heavy. You do not have to fix it right now.') });
      } else if (c.kind === 'worry') {
        result.park.push({ text: c.text, note: 'Is there one tiny thing you can do about this? If yes, add it as a task. If not, let it wait here.' });
      } else if (c.kind === 'regret') {
        result.park.push({ text: c.text, note: 'That has already happened. You can learn from it, but you can’t redo it. Let it rest here.' });
      } else {
        result.notes.push({ text: c.text });
      }
    });

    // Energy-aware ordering.
    const gentle = energy === 'low' || result.feelings.indexOf('overwhelmed') !== -1 || result.feelings.indexOf('exhausted') !== -1 || items.length > 12;
    tasks.forEach(t => {
      t.eff = t.score + (energy === 'low' ? (t.effort === 'tiny' ? 1 : t.effort === 'big' ? -2 : 0) : 0);
    });
    tasks.sort((a, b) => b.eff - a.eff);

    let cap = CAP[energy];
    if (gentle) cap = Math.max(1, cap - 1);

    const urgent = tasks.filter(t => t.eff >= 4);
    const mid = tasks.filter(t => t.eff >= 2 && t.eff < 4);
    const low = tasks.filter(t => t.eff < 2);

    result.today = urgent.slice(0, cap);
    let overflow = urgent.slice(cap);
    result.week = overflow.concat(mid);
    result.later = low;

    // Never leave "today" empty when there is something doable.
    let nothingUrgent = false;
    if (result.today.length === 0 && tasks.length) {
      nothingUrgent = true;
      const pool = result.week.length ? result.week : result.later;
      const pick = pool.slice().sort((a, b) => (a.effort === 'tiny' ? -1 : 0) - (b.effort === 'tiny' ? -1 : 0))[0];
      result.today = [pick];
      result.week = result.week.filter(t => t !== pick);
      result.later = result.later.filter(t => t !== pick);
    }

    // Start here.
    if (result.today.length) {
      const t = result.today[0];
      result.startHere = {
        task: t,
        title: t.text,
        detail: t.micro || 'This is a quick one, about five minutes. Do it now and cross it off.',
        minutes: t.effort === 'tiny' ? 5 : 10
      };
    } else if (result.feelings.length) {
      result.startHere = { title: 'Start with you', detail: FEEL_FIRST_STEP[result.feelings[0]], minutes: 0 };
    }

    // Acknowledgement: reflect what the person actually said.
    const ack = result.ack;
    if (result.safety) {
      ack.push('Whatever else is on this list can wait. Right now, the most important thing is you.');
      result.startHere = null;
      return result;
    }
    if (result.selfCrit.length) {
      ack.push('You wrote some harsh things about yourself. Look at what is on this list, though: people and things you are working hard to take care of. That is not laziness.');
    } else if (result.feelings.length) {
      ack.push('You mentioned feeling ' + joinList(result.feelings) + '. That is real, and it makes every task feel heavier than it is.');
    } else if (items.length > 8) {
      ack.push('That is a lot to carry in one head. Getting it out was the hardest part.');
    } else {
      ack.push('Nice work getting that out of your head. It no longer has to be held in there.');
    }
    if (tasks.length) {
      if (energy === 'low') {
        ack.push('Because your energy is low, this is the smallest honest version of today. Everything else is safe on the list.');
      } else if (nothingUrgent) {
        ack.push('Nothing here looks urgent. Pick the smallest thing, or let today be a rest day.');
      } else {
        if (tasks.length <= result.today.length) {
          ack.push('That is a small, doable list. Here is what needs you today.');
        } else {
          ack.push('Out of ' + tasks.length + ' tasks, only ' + result.today.length + (result.today.length === 1 ? ' needs' : ' need') + ' you today. The rest has a place to wait.');
        }
      }
    } else {
      ack.push('I mostly found feelings in there, not tasks. That is okay. Start with something kind for you, then come back and add the tasks.');
    }
    return result;
  }

  function joinList(arr) {
    const a = arr.slice(0, 3);
    if (a.length <= 1) return a.join('');
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  function toText(r) {
    const lines = [];
    const sec = (title, arr, fn) => {
      if (!arr.length) return;
      lines.push(title);
      arr.forEach((x, i) => lines.push('  ' + (i + 1) + '. ' + fn(x)));
      lines.push('');
    };
    const task = t => t.text + (t.domain ? ' [' + t.domain.label + ']' : '');
    sec('DO TODAY', r.today, task);
    sec('THIS WEEK', r.week, task);
    sec('LATER', r.later, task);
    sec('PARKED (not for right now)', r.park, p => p.text);
    sec('FEELINGS (not tasks)', r.feelingItems, f => f.text);
    return lines.join('\n').trim();
  }

  return { analyze: analyze, toText: toText, splitItems: splitItems };
})();

/* Adds a task to today's 3 Musts so the Brain Dump feeds the daily plan. */
function addToMusts(task) {
  const KEYS = ['personal', 'family', 'home'];
  let rec = safeJSON('adhd-3musts-v2', null);
  if (!rec || rec.date !== todayKey() || !rec.items) rec = { date: todayKey(), items: {} };
  KEYS.forEach(k => { if (!rec.items[k]) rec.items[k] = { text: '', done: false }; });
  const dom = task.domain ? task.domain.key : '';
  const pref = (dom === 'kids' || dom === 'people') ? 'family' : (dom === 'home' || dom === 'errands') ? 'home' : 'personal';
  const slot = [pref].concat(KEYS.filter(k => k !== pref)).find(k => !rec.items[k].text);
  if (!slot) return 'full';
  rec.items[slot] = { text: String(task.text).slice(0, 120), done: false };
  return safeSet('adhd-3musts-v2', JSON.stringify(rec)) ? 'ok' : 'nosave';
}

function mustsButton(task) {
  const b = mk('button', 'btn btn-ghost btn-sm plan-add', '+ Add to my 3 Musts');
  b.type = 'button';
  b.addEventListener('click', () => {
    const r = addToMusts(task);
    b.textContent = r === 'ok' ? 'Added ✓' : r === 'full' ? 'Your 3 are already full' : 'Could not save here';
    b.disabled = true;
  });
  return b;
}

/* ---------- BRAIN DUMP: the page ---------- */
function initBrainDump() {
  const input = document.getElementById('dump-input');
  const processBtn = document.getElementById('process-dump');
  const clearBtn = document.getElementById('clear-dump');
  const results = document.getElementById('dump-results');
  const plan = document.getElementById('dump-plan');
  const copyBtn = document.getElementById('copy-dump');
  const chips = document.querySelectorAll('.energy-row .chip');
  if (!input || !processBtn || !plan) return;

  let energy = safeGet('adhd-energy') || 'okay';
  let lastResult = null;

  function paintChips() {
    chips.forEach(c => {
      const on = c.dataset.energy === energy;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  chips.forEach(c => c.addEventListener('click', () => {
    energy = c.dataset.energy;
    safeSet('adhd-energy', energy);
    paintChips();
  }));
  paintChips();

  // Never lose a dump: autosave the draft.
  const draft = safeGet('adhd-dump-draft');
  if (draft && !input.value) input.value = draft;
  input.addEventListener('input', debounce(() => safeSet('adhd-dump-draft', input.value), 400));

  function taskCard(t, showMicro) {
    const card = mk('div', 'plan-task');
    const top = mk('div', 'plan-task-top');
    top.appendChild(mk('span', 'plan-task-text', t.text));
    card.appendChild(top);
    const tags = mk('div', 'plan-tags');
    if (t.domain) tags.appendChild(mk('span', 'tag', t.domain.emoji + ' ' + t.domain.label));
    tags.appendChild(mk('span', 'tag tag-time', t.effort === 'tiny' ? '~5 min' : t.effort === 'big' ? 'big: start small' : '~15 min'));
    card.appendChild(tags);
    if (showMicro && t.micro) {
      const m = mk('p', 'plan-micro');
      m.appendChild(mk('strong', '', 'First tiny step: '));
      m.appendChild(document.createTextNode(t.micro));
      card.appendChild(m);
    }
    if (showMicro) card.appendChild(mustsButton(t));
    return card;
  }

  function section(title, hint, nodes, collapsed) {
    if (!nodes.length) return null;
    const wrap = collapsed ? mk('details', 'plan-section') : mk('div', 'plan-section');
    const head = collapsed ? mk('summary', 'plan-heading', title + ' (' + nodes.length + ')') : mk('h4', 'plan-heading', title);
    wrap.appendChild(head);
    if (hint) wrap.appendChild(mk('p', 'plan-hint', hint));
    nodes.forEach(n => wrap.appendChild(n));
    return wrap;
  }

  function render(r) {
    plan.textContent = '';

    if (r.safety) {
      const b = mk('div', 'plan-safety');
      b.appendChild(mk('strong', '', 'I noticed something in what you wrote that sounds really painful.'));
      b.appendChild(mk('p', '', 'You matter, and you do not have to carry it alone. If you might hurt yourself or you feel unsafe, please reach out right now. In the US you can call or text 988. Outside the US, findahelpline.com lists services by country, or you can call your local emergency number. If someone is near you, tell them how you are feeling.'));
      plan.appendChild(b);
    }

    if (r.ack.length) {
      const a = mk('div', 'plan-ack');
      r.ack.forEach(line => a.appendChild(mk('p', '', line)));
      plan.appendChild(a);
    }

    if (r.startHere) {
      const s = mk('div', 'plan-start');
      s.appendChild(mk('span', 'plan-start-label', 'Start here'));
      s.appendChild(mk('p', 'plan-start-title', r.startHere.title));
      s.appendChild(mk('p', 'plan-start-detail', r.startHere.detail));
      const acts = mk('div', 'btn-row');
      if (r.startHere.minutes) {
        const tb = mk('button', 'btn btn-primary btn-sm', 'Start a ' + r.startHere.minutes + '-minute timer');
        tb.type = 'button';
        tb.addEventListener('click', () => goToTimer(r.startHere.minutes));
        acts.appendChild(tb);
      }
      if (r.startHere.task) acts.appendChild(mustsButton(r.startHere.task));
      if (acts.children.length) s.appendChild(acts);
      plan.appendChild(s);
    }

    const add = (node) => { if (node) plan.appendChild(node); };
    // "Start here" already shows the first item, so list only the others under it.
    const startIsFirst = r.startHere && r.today.length && r.startHere.title === r.today[0].text;
    const todayRest = startIsFirst ? r.today.slice(1) : r.today;
    add(section(startIsFirst ? 'Also today' : 'Do today', r.energy === 'low' ? 'Small on purpose. That is enough.' : '', todayRest.map(t => taskCard(t, true))));
    add(section('This week', 'These can wait. Come back after today’s list.', r.week.map(t => taskCard(t, false)), true));
    add(section('No rush', 'Safe here. No pressure.', r.later.map(t => taskCard(t, false)), true));

    add(section('Feelings, not tasks', 'These are not things to fix on a to-do list.', r.feelingItems.map(f => {
      const c = mk('div', 'plan-feeling');
      c.appendChild(mk('p', 'plan-feeling-text', '“' + f.text + '”'));
      c.appendChild(mk('p', 'plan-hint', f.reply));
      return c;
    })));

    add(section('Parked: not for right now', 'Worries and “what ifs” can wait here.', r.park.map(p => {
      const c = mk('div', 'plan-feeling');
      c.appendChild(mk('p', 'plan-feeling-text', p.text));
      c.appendChild(mk('p', 'plan-hint', p.note));
      return c;
    }), true));

    add(section('Notes', 'Kept in case you need them.', r.notes.map(n => mk('p', 'plan-note', n.text)), true));
  }

  processBtn.addEventListener('click', () => {
    safeSet('adhd-dump-draft', input.value);
    if (!input.value.trim()) {
      results.classList.remove('hidden');
      plan.textContent = '';
      plan.appendChild(mk('p', 'plan-hint', 'Type or paste whatever is on your mind first. Messy is fine.'));
      lastResult = null;
      return;
    }
    lastResult = BD.analyze(input.value, energy);
    render(lastResult);
    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    safeRemove('adhd-dump-draft');
    results.classList.add('hidden');
    plan.textContent = '';
    lastResult = null;
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!lastResult) return;
      copyWithFeedback(copyBtn, BD.toText(lastResult), 'Copy list');
    });
  }
}

/* ---------- ROUTINE BUILDER ---------- */
function initRoutineBuilder() {
  const canvas = document.getElementById('routine-canvas');
  if (!canvas) return;
  const addBtn = document.getElementById('add-block-btn');
  const clearBtn = document.getElementById('clear-routine');
  const exportBtn = document.getElementById('export-routine');
  const printBtn = document.getElementById('print-routine');
  const statusEl = document.getElementById('routine-status');
  const paletteBtns = document.querySelectorAll('.palette-btn');
  const viewBtns = document.querySelectorAll('.view-btn');
  const form = document.getElementById('block-form');
  const nameInput = document.getElementById('block-name');
  const timeInput = document.getElementById('block-time');
  const confirmBtn = document.getElementById('block-add-confirm');

  let currentView = 'daily';
  let data = { daily: [], weekly: [] };

  const saved = safeJSON('adhd-mom-routine-v2', null);
  if (saved && Array.isArray(saved.daily) && Array.isArray(saved.weekly)) {
    data = saved;
  } else {
    const old = safeJSON('adhd-mom-routine', null);
    if (Array.isArray(old)) data.daily = old;
  }

  let statusTimer = null;
  function persist() {
    const ok = safeSet('adhd-mom-routine-v2', JSON.stringify(data));
    if (statusEl) {
      statusEl.textContent = ok ? 'Saved ✓' : 'Could not save in this browser';
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { statusEl.textContent = 'Saved on this device'; }, 1500);
    }
  }
  const list = () => data[currentView];

  function render() {
    canvas.textContent = '';
    const blocks = list();
    if (!blocks.length) {
      canvas.appendChild(mk('p', 'routine-empty', 'Your ' + currentView + ' routine will appear here. Tap a quick-add block below, or add your own.'));
      return;
    }
    blocks.forEach((block, index) => {
      const row = mk('div', 'routine-block');
      const dot = mk('span', 'color-dot');
      dot.style.background = block.color || '#3f7d68';
      row.appendChild(dot);

      const text = mk('div', 'block-text');
      text.appendChild(mk('span', 'block-label', block.label));
      if (block.time) text.appendChild(mk('span', 'block-time', block.time));
      row.appendChild(text);

      const controls = mk('div', 'block-controls');
      const mkBtn = (label, aria, disabled, fn, cls) => {
        const b = mk('button', cls || 'move-btn', label);
        b.type = 'button';
        b.setAttribute('aria-label', aria + ': ' + block.label);
        b.disabled = !!disabled;
        b.addEventListener('click', fn);
        return b;
      };
      controls.appendChild(mkBtn('↑', 'Move up', index === 0, () => move(index, -1)));
      controls.appendChild(mkBtn('↓', 'Move down', index === blocks.length - 1, () => move(index, 1)));
      controls.appendChild(mkBtn('×', 'Remove', false, () => { blocks.splice(index, 1); persist(); render(); }, 'remove-btn'));
      row.appendChild(controls);
      canvas.appendChild(row);
    });
  }

  function move(i, dir) {
    const blocks = list();
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const tmp = blocks[i]; blocks[i] = blocks[j]; blocks[j] = tmp;
    persist();
    render();
  }

  function addBlock(label, color, time) {
    list().push({ label: label, color: color || '#3f7d68', time: time || '' });
    persist();
    render();
  }

  addBtn.addEventListener('click', () => {
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) nameInput.focus();
  });
  function submitBlock() {
    const label = nameInput.value.trim();
    if (!label) { nameInput.focus(); return; }
    addBlock(label, '#3f7d68', timeInput.value.trim());
    nameInput.value = '';
    timeInput.value = '';
    nameInput.focus();
  }
  confirmBtn.addEventListener('click', submitBlock);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBlock(); });
  timeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBlock(); });

  paletteBtns.forEach(btn => btn.addEventListener('click', () => addBlock(btn.dataset.label, btn.dataset.color)));

  twoTap(clearBtn, 'Tap again to clear', () => { data[currentView] = []; persist(); render(); });

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      viewBtns.forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
    });
  });

  exportBtn.addEventListener('click', () => {
    const blocks = list();
    if (!blocks.length) { flash(exportBtn, 'Add some blocks first', 'Copy as text'); return; }
    const text = (currentView === 'weekly' ? 'Weekly routine' : 'Daily routine') + '\n' +
      blocks.map((b, i) => (i + 1) + '. ' + b.label + (b.time ? ' (' + b.time + ')' : '')).join('\n');
    copyWithFeedback(exportBtn, text, 'Copy as text');
  });

  if (printBtn) printBtn.addEventListener('click', () => { try { window.print(); } catch (e) {} });

  render();
}

/* ---------- TODAY'S 3 MUSTS ---------- */
function initThreeMusts() {
  const KEYS = ['personal', 'family', 'home'];
  const fields = {};
  const checks = {};
  const rows = {};
  KEYS.forEach(k => {
    fields[k] = document.getElementById('must-' + k);
    checks[k] = document.getElementById('must-done-' + k);
    rows[k] = document.querySelector('.must-row[data-must="' + k + '"]');
  });
  if (!fields.personal) return;
  const dateEl = document.getElementById('musts-date');
  const progressText = document.getElementById('musts-progress-text');
  const bar = document.getElementById('musts-bar');
  const winEl = document.getElementById('musts-win');
  const carryEl = document.getElementById('musts-carry');
  const copyBtn = document.getElementById('copy-musts');
  const clearBtn = document.getElementById('clear-musts');
  const statusEl = document.getElementById('musts-status');

  if (dateEl) dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const LABELS = { personal: 'For me', family: 'For my family', home: 'For the house' };
  let saved = safeJSON('adhd-3musts-v2', null);
  if (!saved) {
    const old = safeJSON('adhd-3musts', null);   // migrate the first version
    if (old) {
      saved = { date: todayKey(), items: {} };
      KEYS.forEach(k => { saved.items[k] = { text: old[k] || '', done: false }; });
    }
  }
  let celebrated = false;

  if (saved && saved.items) {
    if (saved.date === todayKey()) {
      KEYS.forEach(k => {
        const it = saved.items[k] || {};
        fields[k].value = it.text || '';
        checks[k].checked = !!(it.done && it.text);
      });
    } else if (carryEl) {
      // A new day: offer yesterday's unfinished items instead of silently dropping them.
      const open = KEYS.filter(k => saved.items[k] && saved.items[k].text && !saved.items[k].done);
      if (open.length) {
        carryEl.textContent = '';
        carryEl.appendChild(mk('strong', '', 'Unfinished from your last day. Carry any over?'));
        const wrap = mk('div', 'carry-list');
        open.forEach(k => {
          const b = mk('button', 'chip', saved.items[k].text);
          b.type = 'button';
          b.addEventListener('click', () => {
            const target = KEYS.find(x => !fields[x].value.trim()) || k;
            fields[target].value = saved.items[k].text;
            b.remove();
            if (!wrap.children.length) carryEl.classList.add('hidden');
            paint(true);
          });
          wrap.appendChild(b);
        });
        carryEl.appendChild(wrap);
        carryEl.classList.remove('hidden');
      }
    }
  }

  let statusTimer = null;
  function save() {
    const items = {};
    KEYS.forEach(k => { items[k] = { text: fields[k].value.trim(), done: !!checks[k].checked }; });
    const ok = safeSet('adhd-3musts-v2', JSON.stringify({ date: todayKey(), items: items }));
    if (statusEl) {
      statusEl.textContent = ok ? 'Saved ✓' : 'Could not save in this browser';
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { statusEl.textContent = 'Saved on this device'; }, 1200);
    }
  }

  function paint(andSave) {
    let done = 0;
    KEYS.forEach(k => {
      const filled = fields[k].value.trim().length > 0;
      const isDone = filled && checks[k].checked;
      if (isDone) done++;
      rows[k].classList.toggle('done', isDone);
    });
    if (progressText) progressText.textContent = done + ' of 3 done';
    if (bar) bar.style.width = (done / 3 * 100) + '%';
    const all = done === 3;
    if (winEl) winEl.classList.toggle('hidden', !all);
    if (all && !celebrated) { celebrated = true; confetti(); }
    if (!all) celebrated = false;
    if (andSave) save();
  }

  const autosave = debounce(() => save(), 400);
  KEYS.forEach(k => {
    fields[k].addEventListener('input', () => { paint(false); autosave(); });
    checks[k].addEventListener('change', () => {
      if (checks[k].checked && !fields[k].value.trim()) { checks[k].checked = false; fields[k].focus(); return; }
      paint(true);
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const lines = KEYS.filter(k => fields[k].value.trim()).map((k, i) =>
        (i + 1) + '. ' + LABELS[k] + ': ' + fields[k].value.trim() + (checks[k].checked ? ' (done)' : ''));
      if (!lines.length) { flash(copyBtn, 'Add a must first', 'Copy my 3'); return; }
      copyWithFeedback(copyBtn, "Today's 3 Musts\n" + lines.join('\n'), 'Copy my 3');
    });
  }

  twoTap(clearBtn, 'Tap again to clear', () => {
    KEYS.forEach(k => { fields[k].value = ''; checks[k].checked = false; });
    if (carryEl) carryEl.classList.add('hidden');
    safeRemove('adhd-3musts-v2');
    paint(false);
  });

  paint(false);
}

/* ---------- NEXT ACTION HELPER ---------- */
function initNextAction() {
  const step1 = document.getElementById('na-step1');
  const step2 = document.getElementById('na-step2');
  const result = document.getElementById('na-result');
  const suggestion = document.getElementById('na-suggestion');
  const againBtn = document.getElementById('na-again');
  const restartBtn = document.getElementById('na-restart');
  const backBtn = document.getElementById('na-back');
  const timerBtn = document.getElementById('na-timer');
  if (!step1) return;

  let feeling = '';
  let area = '';
  let idx = 0;

  const S = {
    overwhelmed: {
      personal: ['Sit down. Drink a glass of water. That is the only task for the next 3 minutes.', 'Put one hand on your chest, breathe out slowly three times, then choose one thing only.'],
      kids: ['Tell the kids: “I need 5 quiet minutes.” Set a timer. Then reassess.', 'Pick the one child need that is truly urgent. Do only that. The rest can wait ten minutes.'],
      home: ['Pick up only 5 things and put them where they belong. Stop after 5.', 'Close the door on the messiest room. Reset just the one spot you look at most.'],
      admin: ['Open the one envelope or message that is bothering you most. Just open it.', 'Write every admin task on one sheet of paper. Don’t do any yet. Just get them out of your head.'],
      work: ['Write the very next physical action on a sticky note. Do only that.', 'Close every tab except one. Work on that one for 10 minutes.']
    },
    stuck: {
      personal: ['Stand up and stretch for 30 seconds. Then choose one tiny task.', 'Change rooms. A new place sometimes shakes a stuck brain loose.'],
      kids: ['Ask one child: “What do you need from me right now?” Listen only.', 'Sit on the floor with them for 3 minutes. No fixing, no phone.'],
      home: ['Go to the kitchen sink. Wash 3 items. That is enough.', 'Start a load of laundry. Just get it into the machine.'],
      admin: ['Set a 5-minute timer. Sort one small pile into “keep / toss / later”.', 'Find the phone number or website for the one thing you’ve been avoiding. Don’t call yet.'],
      work: ['Open the document or app. Type one sentence. Close it if you want.', 'Write the task’s name at the top of a blank page. That counts as starting.']
    },
    tired: {
      personal: ['Lie down or sit with your eyes closed for 4 minutes. No phone.', 'Eat something with protein and drink water. Then decide what’s next.'],
      kids: ['Put on a calm show or quiet activity. You are allowed to rest beside them.', 'Make it a “quiet hour”: books or blocks on the floor, you on the couch.'],
      home: ['Dim one light and sit. The house can wait 10 minutes.', 'Do the one thing that makes tomorrow morning easier. Skip the rest.'],
      admin: ['Move all papers into one “later” pile. You do not have to process them now.', 'Pick one admin task for tomorrow and write it where you’ll see it. Then rest.'],
      work: ['Write “I am tired” at the top of a note. Then write one next step for tomorrow.', 'Do the easiest task on your list, not the most important one.']
    },
    anxious: {
      personal: ['Name 5 things you can see. Then take 3 slow breaths.', 'Breathe in for 4, out for 6, five times. Then drink some water.'],
      kids: ['Hug or high-five one child. Say “We’re okay.”', 'Put on music and move around the room with them for one song.'],
      home: ['Open a window or step outside for 60 seconds of air.', 'Wipe one surface slowly. Focus on the motion of your hand.'],
      admin: ['Write the worry on paper. Then write “Not for right now” next to it.', 'Write the worst case and the most likely case. Do one tiny prep step for the likely one.'],
      work: ['Close extra tabs. Keep only one thing open. That is the boundary.', 'Tell yourself: “I only need to do the first 10 minutes.” Set a timer.']
    },
    okay: {
      personal: ['Choose one small thing that would make today 5% better. Do it.', 'Drink water, then do one thing for future you.'],
      kids: ['Spend 5 undistracted minutes with one child — no phone.', 'Plan one easy fun thing for later today, even just a walk.'],
      home: ['Reset one surface (counter, table, or couch).', 'Set a 10-minute timer and tidy one room with music on.'],
      admin: ['Reply to one message or file one paper.', 'Pay or schedule one bill, then stop.'],
      work: ['Set a 15-minute timer and start the task you have been avoiding.', 'Break your task into 3 bullets. Start with the smallest.']
    }
  };

  function show(which) {
    [step1, step2, result].forEach(s => s.classList.add('hidden'));
    which.classList.remove('hidden');
  }

  function showSuggestion() {
    const options = (S[feeling] && S[feeling][area]) || ['Take one small action. Then stop and check how you feel.'];
    suggestion.textContent = options[idx % options.length];
    show(result);
  }

  step1.querySelectorAll('.na-option').forEach(btn => {
    btn.addEventListener('click', () => { feeling = btn.dataset.feeling; show(step2); });
  });
  step2.querySelectorAll('.na-option').forEach(btn => {
    btn.addEventListener('click', () => { area = btn.dataset.area; idx = 0; showSuggestion(); });
  });

  if (backBtn) backBtn.addEventListener('click', () => show(step1));
  if (againBtn) againBtn.addEventListener('click', () => { idx++; showSuggestion(); });
  if (restartBtn) restartBtn.addEventListener('click', () => { feeling = ''; area = ''; idx = 0; show(step1); });
  if (timerBtn) timerBtn.addEventListener('click', () => goToTimer(5));
}

/* ---------- VISUAL TIME BLOCKER ---------- */
function initTimeBlocker() {
  const periods = ['morning', 'afternoon', 'evening'];
  const copyBtn = document.getElementById('copy-timeblock');
  const clearBtn = document.getElementById('clear-timeblock');
  const statusEl = document.getElementById('timeblock-status');
  if (!document.getElementById('slots-morning')) return;

  const box = p => document.getElementById('slots-' + p);

  function readAll() {
    const out = {};
    periods.forEach(p => {
      out[p] = Array.from(box(p).querySelectorAll('.time-slot')).map(row => ({
        t: row.querySelector('input[type=text]').value.trim(),
        done: row.querySelector('input[type=checkbox]').checked
      })).filter(s => s.t);
    });
    return out;
  }

  let statusTimer = null;
  function persist() {
    const ok = safeSet('adhd-timeblock-v2', JSON.stringify(readAll()));
    if (statusEl) {
      statusEl.textContent = ok ? 'Saved ✓' : 'Could not save in this browser';
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { statusEl.textContent = 'Saved on this device'; }, 1200);
    }
  }
  const autosave = debounce(persist, 400);

  function addSlot(period, slot) {
    const row = mk('div', 'time-slot');
    const check = mk('input');
    check.type = 'checkbox';
    check.setAttribute('aria-label', 'Mark done');
    const input = mk('input');
    input.type = 'text';
    input.placeholder = 'What belongs here?';
    input.maxLength = 100;
    input.setAttribute('aria-label', 'Plan for ' + period);
    const rm = mk('button', 'remove-slot', '×');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove block');

    if (slot) { input.value = slot.t || ''; check.checked = !!slot.done; }
    row.classList.toggle('done', check.checked);

    check.addEventListener('change', () => {
      if (check.checked && !input.value.trim()) { check.checked = false; input.focus(); return; }
      row.classList.toggle('done', check.checked);
      persist();
    });
    input.addEventListener('input', autosave);
    rm.addEventListener('click', () => { row.remove(); persist(); });

    row.appendChild(check); row.appendChild(input); row.appendChild(rm);
    box(period).appendChild(row);
    return input;
  }

  // Load, migrating the first version (plain strings).
  let saved = safeJSON('adhd-timeblock-v2', null);
  if (!saved) {
    const old = safeJSON('adhd-timeblock', null);
    if (old) {
      saved = {};
      periods.forEach(p => { saved[p] = (Array.isArray(old[p]) ? old[p] : []).map(t => ({ t: t, done: false })); });
    }
  }
  periods.forEach(p => {
    const items = saved && Array.isArray(saved[p]) ? saved[p] : [];
    if (!items.length) addSlot(p, null);
    else items.forEach(s => addSlot(p, s));
  });

  document.querySelectorAll('.add-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => addSlot(btn.dataset.period, null).focus());
  });

  // Highlight the part of the day it is right now.
  const hour = new Date().getHours();
  const nowPeriod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  document.querySelectorAll('.time-col').forEach(col => {
    const isNow = col.dataset.period === nowPeriod;
    col.classList.toggle('is-now', isNow);
    const badge = col.querySelector('.now-badge');
    if (badge) badge.classList.toggle('hidden', !isNow);
  });

  twoTap(clearBtn, 'Tap again to clear', () => {
    periods.forEach(p => { box(p).textContent = ''; addSlot(p, null); });
    safeRemove('adhd-timeblock-v2');
    safeRemove('adhd-timeblock');
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const all = readAll();
      const lines = [];
      periods.forEach(p => {
        if (all[p].length) {
          lines.push(p.charAt(0).toUpperCase() + p.slice(1) + ':');
          all[p].forEach(s => lines.push('  ' + (s.done ? '☑ ' : '☐ ') + s.t));
        }
      });
      if (!lines.length) { flash(copyBtn, 'Add a block first', 'Copy as text'); return; }
      copyWithFeedback(copyBtn, lines.join('\n'), 'Copy as text');
    });
  }
}

/* ---------- Boot ---------- */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTimer();
    initBrainDump();
    initRoutineBuilder();
    initThreeMusts();
    initNextAction();
    initTimeBlocker();
  });
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BD: BD };
}
