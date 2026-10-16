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
const SECTION_IDS = ['home', 'timer', 'braindump', 'threemusts', 'nextaction', 'timeblock', 'routine'];
const SECTION_TITLES = {
  timer: 'Free ADHD Focus Timer for Time Blindness – ADHD Mom Tools',
  braindump: 'Free ADHD Brain Dump Tool – Turn Overwhelm Into Next Steps',
  threemusts: 'Today’s 3 Musts Planner for ADHD Moms – ADHD Mom Tools',
  nextaction: 'ADHD Next Action Helper – What Should I Do Now?',
  timeblock: 'Visual Time Blocker for ADHD Moms – ADHD Mom Tools',
  routine: 'Visual Routine Builder for ADHD Moms – ADHD Mom Tools'
};
const pageState = { original: '', section: 'home', timerText: null };

function refreshTitle() {
  if (pageState.timerText) {
    document.title = pageState.timerText;
  } else {
    document.title = SECTION_TITLES[pageState.section] || pageState.original;
  }
}

function showSection(id, silent) {
  if (SECTION_IDS.indexOf(id) === -1) id = 'home';
  pageState.section = id;

  document.querySelectorAll('.tool-section').forEach(s => {
    s.classList.toggle('active', s.id === id);
  });
  document.querySelectorAll('.nav-btn[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === id);
  });

  const mainNav = document.querySelector('.main-nav');
  const toggle = document.querySelector('.menu-toggle');
  if (mainNav) mainNav.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');

  if (!silent) {
    try {
      history.pushState(null, '', id === 'home' ? location.pathname + location.search : '#' + id);
    } catch (e) {}
  }
  refreshTitle();
  window.scrollTo({ top: 0, behavior: silent ? 'auto' : 'smooth' });
}

function sectionFromHash() {
  const id = (location.hash || '').replace('#', '');
  return SECTION_IDS.indexOf(id) === -1 ? 'home' : id;
}

function initNavigation() {
  pageState.original = document.title;

  // Only buttons that belong to a tool (the Blog link has no data-tool).
  document.querySelectorAll('.nav-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.tool));
  });

  document.querySelectorAll('.tool-card').forEach(card => {
    const go = () => showSection(card.dataset.goto);
    card.addEventListener('click', go);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });

  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  if (menuToggle && mainNav) {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Deep links such as /#timer (used by blog posts) and the back button.
  const fromHash = () => showSection(sectionFromHash(), true);
  window.addEventListener('popstate', fromHash);
  window.addEventListener('hashchange', fromHash);
  if (location.hash) fromHash();
}

/* ---------- FOCUS TIMER ---------- */
let timerApi = { setMinutes: function () {} };

function initTimer() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  const modeLabel = document.getElementById('timer-mode-label');
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const customWrap = document.getElementById('custom-time-wrap');
  const customInput = document.getElementById('custom-minutes');
  const setCustomBtn = document.getElementById('set-custom');
  const autoBreakCheck = document.getElementById('auto-break');
  const soundCheck = document.getElementById('sound-enabled');
  const sessionList = document.getElementById('session-list');
  const ringProgress = document.getElementById('timer-ring-progress');
  const RING = 2 * Math.PI * 54;

  const BREAK_SECONDS = 5 * 60;
  let focusSeconds = 25 * 60;
  let mode = 'focus';            // 'focus' | 'break'
  let totalSeconds = focusSeconds;
  let remaining = focusSeconds;
  let endTime = 0;
  let running = false;
  let interval = null;
  let autoStartToken = 0;
  let audioCtx = null;
  let todayItems = [];

  if (ringProgress) ringProgress.style.strokeDasharray = RING;

  function fmt(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function render() {
    display.textContent = fmt(remaining);
    if (ringProgress && totalSeconds > 0) {
      ringProgress.style.strokeDashoffset = RING * (1 - remaining / totalSeconds);
    }
    pageState.timerText = running ? fmt(remaining) + ' – ' + (mode === 'break' ? 'Break' : 'Focus') : pageState.timerText;
    if (running) refreshTitle();
  }

  function setModeLabel() {
    modeLabel.textContent = mode === 'break' ? 'Short Break' : 'Focus Time';
  }

  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  function chime() {
    if (soundCheck && soundCheck.checked && audioCtx) {
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 520;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.9);
      } catch (e) {}
    }
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  function loadSessions() {
    const saved = safeJSON('adhd-sessions', null);
    const today = new Date().toDateString();
    if (saved && saved.day === today && Array.isArray(saved.items)) todayItems = saved.items;
    todayItems.forEach(addSessionRow);
  }
  function addSessionRow(text) {
    if (sessionList) sessionList.appendChild(mk('li', '', text));
  }
  function logSession(minutes, type) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = time + ' – ' + minutes + ' min ' + type;
    todayItems.push(text);
    if (sessionList) sessionList.insertBefore(mk('li', '', text), sessionList.firstChild);
    safeSet('adhd-sessions', JSON.stringify({ day: new Date().toDateString(), items: todayItems }));
  }

  function tick() {
    remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    render();
    if (remaining <= 0) complete();
  }

  function complete() {
    clearInterval(interval);
    running = false;
    chime();
    logSession(Math.round(totalSeconds / 60), mode === 'break' ? 'break' : 'focus');
    pageState.timerText = '✓ Time’s up – ADHD Mom Tools';
    refreshTitle();

    if (mode === 'focus' && autoBreakCheck && autoBreakCheck.checked) {
      mode = 'break';
      totalSeconds = BREAK_SECONDS;
      remaining = totalSeconds;
      setModeLabel();
      render();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      startBtn.textContent = 'Start';
      const token = ++autoStartToken;
      setTimeout(() => { if (token === autoStartToken && !running) start(); }, 800);
    } else {
      mode = 'focus';
      totalSeconds = focusSeconds;   // back to the chosen focus length
      remaining = totalSeconds;
      setModeLabel();
      render();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      startBtn.textContent = 'Start';
    }
  }

  function start() {
    if (running) return;
    unlockAudio();
    running = true;
    pageState.timerText = null;
    endTime = Date.now() + remaining * 1000;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    clearInterval(interval);
    interval = setInterval(tick, 250);
    render();
  }

  function pause() {
    if (!running) return;
    tick();
    if (!running) return;
    clearInterval(interval);
    running = false;
    pageState.timerText = null;
    refreshTitle();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Resume';
  }

  function reset() {
    autoStartToken++;
    clearInterval(interval);
    running = false;
    mode = 'focus';
    totalSeconds = focusSeconds;
    remaining = totalSeconds;
    pageState.timerText = null;
    refreshTitle();
    setModeLabel();
    render();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Start';
  }

  function setMinutes(mins) {
    focusSeconds = mins * 60;
    reset();
  }
  timerApi.setMinutes = function (mins) {
    presetBtns.forEach(b => b.classList.toggle('active', b.dataset.min === String(mins)));
    if (customWrap) customWrap.classList.add('hidden');
    setMinutes(mins);
  };

  // Phones throttle timers when the screen locks: re-sync when the tab returns.
  document.addEventListener('visibilitychange', () => { if (running && !document.hidden) tick(); });

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.min === 'custom') {
        customWrap.classList.remove('hidden');
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

  setModeLabel();
  render();
  loadSessions();
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
      if (r.startHere.minutes) {
        const tb = mk('button', 'btn btn-primary btn-sm', 'Start a ' + r.startHere.minutes + '-minute timer');
        tb.type = 'button';
        tb.addEventListener('click', () => { timerApi.setMinutes(r.startHere.minutes); showSection('timer'); });
        s.appendChild(tb);
      }
      plan.appendChild(s);
    }

    const add = (node) => { if (node) plan.appendChild(node); };
    add(section('Do today', r.energy === 'low' ? 'Small on purpose. That is enough.' : '', r.today.map((t, i) => taskCard(t, true))));
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
  const saveBtn = document.getElementById('save-routine');
  const exportBtn = document.getElementById('export-routine');
  const paletteBtns = document.querySelectorAll('.palette-btn');
  const viewBtns = document.querySelectorAll('.view-btn');
  const form = document.getElementById('block-form');
  const nameInput = document.getElementById('block-name');
  const timeInput = document.getElementById('block-time');
  const confirmBtn = document.getElementById('block-add-confirm');

  let currentView = 'daily';
  let data = { daily: [], weekly: [] };

  // Load (and migrate the old single-list format).
  const saved = safeJSON('adhd-mom-routine-v2', null);
  if (saved && Array.isArray(saved.daily) && Array.isArray(saved.weekly)) {
    data = saved;
  } else {
    const old = safeJSON('adhd-mom-routine', null);
    if (Array.isArray(old)) data.daily = old;
  }

  const persist = () => safeSet('adhd-mom-routine-v2', JSON.stringify(data));
  const list = () => data[currentView];

  function render() {
    canvas.textContent = '';
    const blocks = list();
    if (!blocks.length) {
      canvas.appendChild(mk('p', 'routine-empty', 'Your ' + currentView + ' routine will appear here. Tap a quick-add button below, or add your own block.'));
      return;
    }
    blocks.forEach((block, index) => {
      const row = mk('div', 'routine-block');
      const dot = mk('span', 'color-dot');
      dot.style.background = block.color || '#a8d5c0';
      row.appendChild(dot);
      row.appendChild(mk('span', 'block-label', block.label));
      row.appendChild(mk('span', 'block-time', block.time || ''));

      const mkBtn = (label, aria, disabled, fn, cls) => {
        const b = mk('button', cls || 'move-btn', label);
        b.type = 'button';
        b.setAttribute('aria-label', aria);
        b.disabled = !!disabled;
        b.addEventListener('click', fn);
        return b;
      };
      row.appendChild(mkBtn('↑', 'Move up', index === 0, () => move(index, -1)));
      row.appendChild(mkBtn('↓', 'Move down', index === blocks.length - 1, () => move(index, 1)));
      row.appendChild(mkBtn('×', 'Remove', false, () => { blocks.splice(index, 1); persist(); render(); }, 'remove-btn'));
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
    list().push({ label: label, color: color || '#a8d5c0', time: time || '' });
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
    addBlock(label, '#a8d5c0', timeInput.value.trim());
    nameInput.value = '';
    timeInput.value = '';
    nameInput.focus();
  }
  confirmBtn.addEventListener('click', submitBlock);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBlock(); });

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

  saveBtn.addEventListener('click', () => {
    const ok = persist();
    flash(saveBtn, ok ? 'Saved ✓' : 'Could not save here', 'Save This Routine');
  });

  exportBtn.addEventListener('click', () => {
    const blocks = list();
    if (!blocks.length) { flash(exportBtn, 'Add some blocks first', 'Copy as Text'); return; }
    const text = blocks.map((b, i) => (i + 1) + '. ' + b.label + (b.time ? ' (' + b.time + ')' : '')).join('\n');
    copyWithFeedback(exportBtn, text, 'Copy as Text');
  });

  render();
}

/* ---------- TODAY'S 3 MUSTS ---------- */
function initThreeMusts() {
  const personal = document.getElementById('must-personal');
  const family = document.getElementById('must-family');
  const home = document.getElementById('must-home');
  const saveBtn = document.getElementById('save-musts');
  const clearBtn = document.getElementById('clear-musts');
  const summary = document.getElementById('musts-summary');
  const list = document.getElementById('musts-list');
  const copyBtn = document.getElementById('copy-musts');
  if (!saveBtn || !personal) return;

  const saved = safeJSON('adhd-3musts', {});
  if (saved.personal) personal.value = saved.personal;
  if (saved.family) family.value = saved.family;
  if (saved.home) home.value = saved.home;

  function current() {
    return [
      { label: 'Personal', val: personal.value.trim() },
      { label: 'Family', val: family.value.trim() },
      { label: 'Home', val: home.value.trim() }
    ];
  }

  function showSummary() {
    const items = current().filter(i => i.val);
    list.textContent = '';
    if (!items.length) { summary.classList.add('hidden'); return; }
    items.forEach(i => {
      const li = mk('li');
      li.appendChild(mk('strong', '', i.label + ': '));
      li.appendChild(document.createTextNode(i.val));
      list.appendChild(li);
    });
    summary.classList.remove('hidden');
  }

  const persist = () => safeSet('adhd-3musts', JSON.stringify({
    personal: personal.value.trim(), family: family.value.trim(), home: home.value.trim()
  }));
  const autosave = debounce(persist, 400);
  [personal, family, home].forEach(i => i.addEventListener('input', autosave));

  saveBtn.addEventListener('click', () => {
    const ok = persist();
    showSummary();
    flash(saveBtn, ok ? 'Saved ✓' : 'Shown (could not save here)', 'Save My 3 Musts');
  });

  clearBtn.addEventListener('click', () => {
    personal.value = ''; family.value = ''; home.value = '';
    safeRemove('adhd-3musts');
    summary.classList.add('hidden');
    list.textContent = '';
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = Array.from(list.querySelectorAll('li')).map((li, i) => (i + 1) + '. ' + li.textContent).join('\n');
      if (text) copyWithFeedback(copyBtn, text, 'Copy');
    });
  }

  if (current().some(i => i.val)) showSummary();
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
  if (timerBtn) timerBtn.addEventListener('click', () => { timerApi.setMinutes(5); showSection('timer'); });
}

/* ---------- VISUAL TIME BLOCKER ---------- */
function initTimeBlocker() {
  const periods = ['morning', 'afternoon', 'evening'];
  const saveBtn = document.getElementById('save-timeblock');
  const clearBtn = document.getElementById('clear-timeblock');
  const copyBtn = document.getElementById('copy-timeblock');
  if (!saveBtn) return;

  const getSlots = p => document.getElementById('slots-' + p);
  const readAll = () => {
    const out = {};
    periods.forEach(p => {
      const box = getSlots(p);
      out[p] = box ? Array.from(box.querySelectorAll('input')).map(i => i.value.trim()).filter(Boolean) : [];
    });
    return out;
  };
  const persist = () => safeSet('adhd-timeblock', JSON.stringify(readAll()));
  const autosave = debounce(persist, 400);

  function addSlot(period, value) {
    const container = getSlots(period);
    if (!container) return;
    const row = mk('div', 'time-slot');
    const input = mk('input');
    input.type = 'text';
    input.placeholder = 'What belongs here?';
    input.setAttribute('aria-label', 'Plan for ' + period);
    input.value = value || '';
    input.addEventListener('input', autosave);
    const rm = mk('button', 'remove-slot', '×');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove');
    rm.addEventListener('click', () => { row.remove(); persist(); });
    row.appendChild(input);
    row.appendChild(rm);
    container.appendChild(row);
  }

  const saved = safeJSON('adhd-timeblock', {});
  periods.forEach(p => {
    const items = Array.isArray(saved[p]) ? saved[p] : [];
    if (!items.length) addSlot(p, '');
    else items.forEach(v => addSlot(p, v));
  });

  document.querySelectorAll('.add-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => addSlot(btn.dataset.period, ''));
  });

  saveBtn.addEventListener('click', () => {
    const ok = persist();
    flash(saveBtn, ok ? 'Saved ✓' : 'Could not save here', 'Save Blocks');
  });

  twoTap(clearBtn, 'Tap again to clear', () => {
    periods.forEach(p => { const b = getSlots(p); if (b) b.textContent = ''; addSlot(p, ''); });
    safeRemove('adhd-timeblock');
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const all = readAll();
      const lines = [];
      periods.forEach(p => {
        if (all[p].length) {
          lines.push(p.charAt(0).toUpperCase() + p.slice(1) + ':');
          all[p].forEach(v => lines.push('  • ' + v));
        }
      });
      copyWithFeedback(copyBtn, lines.join('\n') || 'No blocks yet.', 'Copy as Text');
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
