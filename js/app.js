/* ===== ADHD Mom Tools - Main App ===== */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTimer();
  initBrainDump();
  initRoutineBuilder();
  initThreeMusts();
  initNextAction();
  initTimeBlocker();
});

/* ---------- Navigation ---------- */
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.tool-section');
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  const toolCards = document.querySelectorAll('.tool-card');

  function showSection(id) {
    sections.forEach(s => s.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    
    const activeBtn = document.querySelector(`.nav-btn[data-tool="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Close mobile menu
    mainNav.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.tool));
  });

  toolCards.forEach(card => {
    card.addEventListener('click', () => showSection(card.dataset.goto));
  });

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('open');
    });
  }
}

/* ---------- FOCUS TIMER ---------- */
function initTimer() {
  let totalSeconds = 25 * 60;
  let remaining = totalSeconds;
  let interval = null;
  let isRunning = false;
  let isBreak = false;

  const display = document.getElementById('timer-display');
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
  const RING_CIRCUMFERENCE = 2 * Math.PI * 54; // ≈ 339.292

  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateDisplay() {
    display.textContent = formatTime(remaining);
    document.title = isRunning ? `${formatTime(remaining)} – Focus` : 'ADHD Mom Tools';
    
    // Update progress ring
    if (ringProgress && totalSeconds > 0) {
      const progress = remaining / totalSeconds;
      const offset = RING_CIRCUMFERENCE * (1 - progress);
      ringProgress.style.strokeDashoffset = offset;
    }
  }

  function playGentleSound() {
    if (!soundCheck.checked) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  }

  function logSession(minutes, type) {
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    li.textContent = `${time} – ${minutes} min ${type}`;
    sessionList.prepend(li);
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    interval = setInterval(() => {
      remaining--;
      updateDisplay();

      if (remaining <= 0) {
        clearInterval(interval);
        isRunning = false;
        playGentleSound();
        
        const mins = Math.round(totalSeconds / 60);
        logSession(mins, isBreak ? 'break' : 'focus');

        if (!isBreak && autoBreakCheck.checked) {
          // Start short break
          isBreak = true;
          totalSeconds = 5 * 60;
          remaining = totalSeconds;
          modeLabel.textContent = 'Short Break';
          updateDisplay();
          startBtn.disabled = false;
          pauseBtn.disabled = true;
          // Auto start break after tiny delay
          setTimeout(() => startTimer(), 800);
        } else {
          isBreak = false;
          modeLabel.textContent = 'Focus Time';
          remaining = totalSeconds;
          updateDisplay();
          startBtn.disabled = false;
          pauseBtn.disabled = true;
        }
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    clearInterval(interval);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Resume';
  }

  function resetTimer() {
    clearInterval(interval);
    isRunning = false;
    isBreak = false;
    remaining = totalSeconds;
    modeLabel.textContent = 'Focus Time';
    updateDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Start';
  }

  function setMinutes(mins) {
    totalSeconds = mins * 60;
    remaining = totalSeconds;
    isBreak = false;
    modeLabel.textContent = 'Focus Time';
    updateDisplay();
    resetTimer();
  }

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (btn.dataset.min === 'custom') {
        customWrap.classList.remove('hidden');
      } else {
        customWrap.classList.add('hidden');
        setMinutes(parseInt(btn.dataset.min));
      }
    });
  });

  setCustomBtn.addEventListener('click', () => {
    const val = parseInt(customInput.value);
    if (val >= 1 && val <= 180) {
      setMinutes(val);
    }
  });

  updateDisplay();
}

/* ---------- BRAIN DUMP ---------- */
function initBrainDump() {
  const input = document.getElementById('dump-input');
  const processBtn = document.getElementById('process-dump');
  const clearBtn = document.getElementById('clear-dump');
  const results = document.getElementById('dump-results');
  const priorityList = document.getElementById('priority-list');
  const copyBtn = document.getElementById('copy-dump');

  // Simple but useful rules-based organizer
  function processText(text) {
    if (!text.trim()) return [];

    // Split by newlines, periods, or common separators
    let items = text
      .split(/[\n•\-\*]|(?<=\.)\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 3);

    // If still one big chunk, try splitting by commas or "and"
    if (items.length <= 1 && text.length > 40) {
      items = text.split(/,|\band\b/i).map(s => s.trim()).filter(s => s.length > 3);
    }

    // Clean and prioritize
    const urgentWords = ['urgent', 'asap', 'today', 'now', 'deadline', 'important', 'must', 'need to', 'have to'];
    const actionWords = ['call', 'email', 'buy', 'pay', 'finish', 'send', 'book', 'schedule', 'clean', 'pack', 'pick up', 'drop off', 'reply', 'write', 'make', 'do'];

    const scored = items.map(item => {
      let score = 0;
      const lower = item.toLowerCase();
      
      urgentWords.forEach(w => { if (lower.includes(w)) score += 3; });
      actionWords.forEach(w => { if (lower.includes(w)) score += 1; });
      
      // Prefer shorter, actionable items
      if (item.length < 60) score += 1;
      if (item.length > 120) score -= 1;

      return { text: item, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Turn into tiny steps where possible
    return scored.slice(0, 12).map((item, i) => {
      let step = item.text;
      // Soften and make more actionable if needed
      if (!/^(call|email|buy|pay|finish|send|book|schedule|clean|pack|write|make|do|pick|drop|reply)/i.test(step)) {
        if (step.length < 50) step = `Handle: ${step}`;
      }
      return { num: i + 1, text: step };
    });
  }

  processBtn.addEventListener('click', () => {
    const items = processText(input.value);
    priorityList.innerHTML = '';

    if (items.length === 0) {
      priorityList.innerHTML = '<p style="color:#888">Nothing clear enough to organize yet. Try adding a few more specific thoughts or tasks.</p>';
    } else {
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'priority-item';
        div.innerHTML = `<span class="num">${item.num}</span><p>${item.text}</p>`;
        priorityList.appendChild(div);
      });
    }

    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    results.classList.add('hidden');
    priorityList.innerHTML = '';
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const items = priorityList.querySelectorAll('.priority-item p');
      if (!items.length) return;
      const text = Array.from(items).map((p, i) => `${i + 1}. ${p.textContent}`).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy list'; }, 1500);
      }).catch(() => {
        prompt('Copy this:', text);
      });
    });
  }
}

/* ---------- ROUTINE BUILDER ---------- */
function initRoutineBuilder() {
  const canvas = document.getElementById('routine-canvas');
  const addBtn = document.getElementById('add-block-btn');
  const clearBtn = document.getElementById('clear-routine');
  const saveBtn = document.getElementById('save-routine');
  const exportBtn = document.getElementById('export-routine');
  const paletteBtns = document.querySelectorAll('.palette-btn');
  const viewBtns = document.querySelectorAll('.view-btn');

  let blocks = [];
  let currentView = 'daily';

  function renderBlocks() {
    canvas.innerHTML = '';
    
    if (blocks.length === 0) {
      canvas.innerHTML = '<p style="color:#aaa;text-align:center;padding:2rem 1rem;">Your visual routine will appear here. Add blocks below or use the quick-add buttons.</p>';
      return;
    }

    blocks.forEach((block, index) => {
      const el = document.createElement('div');
      el.className = 'routine-block';
      el.draggable = true;
      el.dataset.index = index;
      el.innerHTML = `
        <span class="color-dot" style="background:${block.color}"></span>
        <span class="block-label">${block.label}</span>
        <span class="block-time">${block.time || ''}</span>
        <button class="remove-btn" data-index="${index}" aria-label="Remove">×</button>
      `;
      canvas.appendChild(el);
    });

    // Remove buttons
    canvas.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        blocks.splice(parseInt(btn.dataset.index), 1);
        renderBlocks();
      });
    });
  }

  function addBlock(label, color = '#a8d5c0', time = '') {
    blocks.push({ label, color, time });
    renderBlocks();
  }

  addBtn.addEventListener('click', () => {
    const label = prompt('Name of this block (e.g. “Deep Work”, “School run”, “Rest”):');
    if (label && label.trim()) {
      addBlock(label.trim());
    }
  });

  paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      addBlock(btn.dataset.label, btn.dataset.color);
    });
  });

  clearBtn.addEventListener('click', () => {
    if (blocks.length && confirm('Clear all blocks?')) {
      blocks = [];
      renderBlocks();
    }
  });

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      // For now we keep the same list; can expand later
    });
  });

  saveBtn.addEventListener('click', () => {
    localStorage.setItem('adhd-mom-routine', JSON.stringify(blocks));
    alert('Routine saved in this browser!');
  });

  exportBtn.addEventListener('click', () => {
    if (blocks.length === 0) {
      alert('Add some blocks first.');
      return;
    }
    const text = blocks.map((b, i) => `${i + 1}. ${b.label}${b.time ? ' (' + b.time + ')' : ''}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      prompt('Copy this:', text);
    });
  });

  // Load saved if exists
  try {
    const saved = localStorage.getItem('adhd-mom-routine');
    if (saved) {
      blocks = JSON.parse(saved);
      renderBlocks();
    } else {
      renderBlocks();
    }
  } catch (e) {
    renderBlocks();
  }
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

  if (!saveBtn) return;

  // Load saved
  try {
    const saved = JSON.parse(localStorage.getItem('adhd-3musts') || '{}');
    if (saved.personal) personal.value = saved.personal;
    if (saved.family) family.value = saved.family;
    if (saved.home) home.value = saved.home;
  } catch (e) {}

  function showSummary() {
    const items = [
      { label: 'Personal', val: personal.value.trim() },
      { label: 'Family', val: family.value.trim() },
      { label: 'Home', val: home.value.trim() }
    ].filter(i => i.val);

    if (items.length === 0) {
      summary.classList.add('hidden');
      return;
    }

    list.innerHTML = items.map(i => `<li><strong>${i.label}:</strong> ${i.val}</li>`).join('');
    summary.classList.remove('hidden');
  }

  saveBtn.addEventListener('click', () => {
    const data = {
      personal: personal.value.trim(),
      family: family.value.trim(),
      home: home.value.trim()
    };
    localStorage.setItem('adhd-3musts', JSON.stringify(data));
    showSummary();
  });

  clearBtn.addEventListener('click', () => {
    personal.value = '';
    family.value = '';
    home.value = '';
    localStorage.removeItem('adhd-3musts');
    summary.classList.add('hidden');
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const items = list.querySelectorAll('li');
      const text = Array.from(items).map(li => li.textContent).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      });
    });
  }
}

/* ---------- NEXT ACTION HELPER ---------- */
function initNextAction() {
  const step1 = document.getElementById('na-step1');
  const step2 = document.getElementById('na-step2');
  const result = document.getElementById('na-result');
  const suggestion = document.getElementById('na-suggestion');
  const againBtn = document.getElementById('na-again');

  if (!step1) return;

  let feeling = '';
  let area = '';

  const suggestions = {
    overwhelmed: {
      personal: 'Sit down. Drink a glass of water. That is the only task for the next 3 minutes.',
      kids: 'Tell the kids: “I need 5 quiet minutes.” Set a timer. Then reassess.',
      home: 'Pick up only 5 things and put them where they belong. Stop after 5.',
      admin: 'Open the one envelope or message that is bothering you most. Just open it.',
      work: 'Write the very next physical action on a sticky note. Do only that.'
    },
    stuck: {
      personal: 'Stand up and stretch for 30 seconds. Then choose one tiny task.',
      kids: 'Ask one child: “What do you need from me right now?” Listen only.',
      home: 'Go to the kitchen sink. Wash 3 items. That is enough.',
      admin: 'Set a 5-minute timer. Sort one small pile into “keep / toss / later”.',
      work: 'Open the document or app. Type one sentence. Close it if you want.'
    },
    tired: {
      personal: 'Lie down or sit with your eyes closed for 4 minutes. No phone.',
      kids: 'Put on a calm show or quiet activity. You are allowed to rest beside them.',
      home: 'Dim one light and sit. The house can wait 10 minutes.',
      admin: 'Move all papers into one “later” pile. You do not have to process them now.',
      work: 'Write “I am tired” at the top of a note. Then write one next step for tomorrow.'
    },
    anxious: {
      personal: 'Name 5 things you can see. Then take 3 slow breaths.',
      kids: 'Hug or high-five one child. Say “We’re okay.”',
      home: 'Open a window or step outside for 60 seconds of air.',
      admin: 'Write the worry on paper. Then write “Not for right now” next to it.',
      work: 'Close extra tabs. Keep only one thing open. That is the boundary.'
    },
    okay: {
      personal: 'Choose one small thing that would make today 5% better. Do it.',
      kids: 'Spend 5 undistracted minutes with one child — no phone.',
      home: 'Reset one surface (counter, table, or couch).',
      admin: 'Reply to one message or file one paper.',
      work: 'Set a 15-minute timer and start the task you have been avoiding.'
    }
  };

  step1.querySelectorAll('.na-option').forEach(btn => {
    btn.addEventListener('click', () => {
      feeling = btn.dataset.feeling;
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
    });
  });

  step2.querySelectorAll('.na-option').forEach(btn => {
    btn.addEventListener('click', () => {
      area = btn.dataset.area;
      const text = (suggestions[feeling] && suggestions[feeling][area])
        ? suggestions[feeling][area]
        : 'Take one small action. Then stop and check how you feel.';
      suggestion.textContent = text;
      step2.classList.add('hidden');
      result.classList.remove('hidden');
    });
  });

  if (againBtn) {
    againBtn.addEventListener('click', () => {
      feeling = '';
      area = '';
      result.classList.add('hidden');
      step2.classList.add('hidden');
      step1.classList.remove('hidden');
    });
  }
}

/* ---------- VISUAL TIME BLOCKER ---------- */
function initTimeBlocker() {
  const periods = ['morning', 'afternoon', 'evening'];
  const saveBtn = document.getElementById('save-timeblock');
  const clearBtn = document.getElementById('clear-timeblock');
  const copyBtn = document.getElementById('copy-timeblock');

  if (!saveBtn) return;

  function getSlots(period) {
    return document.getElementById(`slots-${period}`);
  }

  function addSlot(period, value = '') {
    const container = getSlots(period);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'time-slot';
    div.innerHTML = `
      <input type="text" placeholder="What belongs here?" value="${value.replace(/"/g, '&quot;')}">
      <button class="remove-slot" aria-label="Remove">×</button>
    `;
    container.appendChild(div);

    div.querySelector('.remove-slot').addEventListener('click', () => {
      div.remove();
    });
  }

  // Load saved
  try {
    const saved = JSON.parse(localStorage.getItem('adhd-timeblock') || '{}');
    periods.forEach(p => {
      const items = saved[p] || [];
      if (items.length === 0) {
        // start with one empty slot
        addSlot(p);
      } else {
        items.forEach(v => addSlot(p, v));
      }
    });
  } catch (e) {
    periods.forEach(p => addSlot(p));
  }

  document.querySelectorAll('.add-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addSlot(btn.dataset.period);
    });
  });

  saveBtn.addEventListener('click', () => {
    const data = {};
    periods.forEach(p => {
      const inputs = getSlots(p).querySelectorAll('input');
      data[p] = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
    });
    localStorage.setItem('adhd-timeblock', JSON.stringify(data));
    saveBtn.textContent = 'Saved!';
    setTimeout(() => { saveBtn.textContent = 'Save Blocks'; }, 1500);
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all time blocks?')) return;
    periods.forEach(p => {
      getSlots(p).innerHTML = '';
      addSlot(p);
    });
    localStorage.removeItem('adhd-timeblock');
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const lines = [];
      periods.forEach(p => {
        const inputs = getSlots(p).querySelectorAll('input');
        const vals = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
        if (vals.length) {
          lines.push(p.charAt(0).toUpperCase() + p.slice(1) + ':');
          vals.forEach(v => lines.push('  • ' + v));
        }
      });
      const text = lines.join('\n') || 'No blocks yet.';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy as Text'; }, 1500);
      });
    });
  }
}
