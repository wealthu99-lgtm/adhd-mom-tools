// Content for the six tool pages. The build script (build-blog.js) turns each
// entry into its own page with its own URL, title, description and FAQ.
// Edit the text here to change what Google and visitors see.

const LINKS = {
  reset: 'https://wealthuba.gumroad.com/l/aqitk',
  planner: 'https://wealthuba.gumroad.com/l/kwordo',
  bundle: 'https://wealthuba.gumroad.com/l/uifhhn',
  ebook: 'https://wealthuba.gumroad.com/l/kqmfr'
};

function timerApp(kids) {
  const presets = kids ? [2, 5, 10, 15, 20] : [5, 10, 15, 25, 45];
  const def = kids ? 10 : 25;
  const chips = presets.map(m => `<button type="button" class="chip preset-btn${m === def ? ' active' : ''}" data-min="${m}">${m} min</button>`).join('\n    ');
  const quick = kids ? `
  <div class="quick-tasks" role="group" aria-label="Quick timers">
    <button type="button" class="chip quick-task" data-label="Get dressed" data-min="10">👕 Get dressed</button>
    <button type="button" class="chip quick-task" data-label="Tidy up" data-min="10">🧹 Tidy up</button>
    <button type="button" class="chip quick-task" data-label="Brush teeth" data-min="2">🪥 Brush teeth</button>
    <button type="button" class="chip quick-task" data-label="Homework" data-min="15">📚 Homework</button>
    <button type="button" class="chip quick-task" data-label="Finish eating" data-min="20">🍽️ Finish eating</button>
    <button type="button" class="chip quick-task" data-label="Screen time" data-min="15">📱 Screen time</button>
  </div>` : '';
  return `
<div class="app-card timer-app" data-kids="${kids ? 1 : 0}" data-default-style="${kids ? 'pie' : 'ring'}">
  <button id="timer-fs-exit" class="fs-exit hidden" type="button" aria-label="Exit full screen">✕</button>
  <div id="timer-ring-wrap" class="timer-ring-wrap">
    <svg class="timer-ring" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6dc2a9"/><stop offset="1" stop-color="#3f7d68"/></linearGradient></defs>
      <circle class="ring-track" cx="60" cy="60" r="54"></circle>
      <circle id="timer-ring-progress" class="ring-progress" cx="60" cy="60" r="54"></circle>
    </svg>
    <svg class="timer-pie" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle class="pie-bg" cx="60" cy="60" r="56"></circle>
      <path id="timer-pie-wedge" class="pie-wedge" d=""></path>
    </svg>
    <div class="timer-center">
      <div id="timer-display" class="timer-display" role="timer">${def}:00</div>
      <div id="timer-mode-label" class="timer-mode">Focus Time</div>
    </div>
  </div>${quick}
  <label class="sr-only" for="timer-task">${kids ? 'What is the timer for?' : 'What are you focusing on?'}</label>
  <input id="timer-task" class="text-input" type="text" placeholder="${kids ? 'What is the timer for?' : 'What are you focusing on?'}" maxlength="80" autocomplete="off">
  <div class="timer-controls">
    <button id="timer-start" type="button" class="btn btn-primary btn-lg">Start</button>
    <button id="timer-pause" type="button" class="btn btn-secondary btn-lg" disabled>Pause</button>
    <button id="timer-reset" type="button" class="btn btn-ghost btn-lg">Reset</button>
  </div>
  <div class="timer-extras">
    <button id="timer-distracted" type="button" class="btn btn-ghost btn-sm hidden">I got distracted</button>
    <button id="timer-fullscreen" type="button" class="btn btn-ghost btn-sm">⛶ Full screen</button>
  </div>
  <p id="break-idea" class="break-idea hidden"></p>
  <div class="preset-row" role="group" aria-label="Timer length">
    ${chips}
    <button type="button" class="chip preset-btn" data-min="custom">Custom</button>
  </div>
  <div id="custom-time-wrap" class="custom-time hidden">
    <label class="sr-only" for="custom-minutes">Minutes</label>
    <input type="number" id="custom-minutes" class="text-input" min="1" max="180" placeholder="Minutes" inputmode="numeric">
    <button type="button" id="set-custom" class="btn btn-secondary btn-sm">Set</button>
  </div>
  <div id="timer-banner" class="timer-banner hidden" role="status">
    <p id="timer-banner-text"></p>
    <div id="timer-banner-actions" class="btn-row"></div>
  </div>
  <details class="timer-more">
    <summary>More options</summary>
    <div class="opt-row"><span class="opt-label">Look</span>
      <div class="style-toggle" role="group" aria-label="Timer look">
        <button type="button" class="chip style-btn active" data-style="ring">Ring</button>
        <button type="button" class="chip style-btn" data-style="pie">Pie</button>
      </div>
    </div>
    <div class="opt-row"><label class="opt-label" for="focus-sound">Focus sound</label>
      <select id="focus-sound" class="text-input">
        <option value="off">Off</option>
        <option value="brown">Brown noise (deep, soft)</option>
        <option value="pink">Pink noise (balanced)</option>
        <option value="white">White noise (bright)</option>
      </select>
    </div>
    <div class="opt-row"><label class="opt-label" for="focus-volume">Volume</label>
      <input type="range" id="focus-volume" min="0" max="100" value="40">
    </div>
    <div class="toggles">
      <label><input type="checkbox" id="auto-break"> Auto-start a break after focus</label>
      <label><input type="checkbox" id="sound-enabled" checked> Play a gentle chime when done</label>
      <label><input type="checkbox" id="keep-awake" checked> Keep my screen awake while it runs</label>
    </div>
  </details>
  <div class="timer-stats">
    <div class="stat-today"><strong id="stat-today">0</strong> min focused today</div>
    <div id="week-bars" class="week-bars" aria-label="Focus minutes over the last 7 days"></div>
  </div>
  <div class="sessions">
    <h3>Today’s sessions <span id="session-count" class="badge">0</span></h3>
    <ul id="session-list"></ul>
  </div>
</div>`;
}
const TIMER_APP = timerApp(false);
const KIDS_APP = timerApp(true);

const BRAIN_APP = `
<div class="app-card">
  <label for="dump-input" class="field-label">What’s on your mind? Type it all, messy is fine.</label>
  <textarea id="dump-input" placeholder="Examples: call the dentist, kids’ forms due tomorrow, laundry is piling up, I feel like I’m behind on everything…" rows="7"></textarea>
  <div class="energy-row" role="group" aria-label="Your energy right now">
    <span class="energy-label">Energy right now:</span>
    <button type="button" class="chip" data-energy="low" aria-pressed="false">Running on empty</button>
    <button type="button" class="chip active" data-energy="okay" aria-pressed="true">Okay</button>
    <button type="button" class="chip" data-energy="good" aria-pressed="false">Good</button>
  </div>
  <div class="dump-actions">
    <button id="process-dump" type="button" class="btn btn-primary btn-lg">Unload &amp; Organize</button>
    <button id="clear-dump" type="button" class="btn btn-ghost btn-lg">Clear</button>
  </div>
  <div id="dump-results" class="dump-results hidden" aria-live="polite">
    <div class="dump-results-header">
      <h2>Here’s your plan</h2>
      <button id="copy-dump" type="button" class="btn btn-secondary btn-sm">Copy list</button>
    </div>
    <div id="dump-plan" class="dump-plan"></div>
  </div>
  <p class="privacy-note">🔒 Private: what you type stays in your browser. Nothing is sent to a server.</p>
</div>`;

const MUSTS_APP = `
<div class="app-card">
  <div class="musts-head">
    <span id="musts-date" class="musts-date">Today</span>
    <span id="musts-progress-text" class="musts-progress-text">0 of 3 done</span>
  </div>
  <div class="progress-bar" aria-hidden="true"><div id="musts-bar" class="progress-fill"></div></div>
  <div id="musts-carry" class="carry hidden"></div>
  <div class="must-row" data-must="personal">
    <input type="checkbox" id="must-done-personal" class="must-check" aria-label="Mark personal must as done">
    <div><label class="must-label" for="must-personal">1 · For me</label><input type="text" id="must-personal" class="text-input must-input" placeholder="One thing for you today…" maxlength="120" autocomplete="off"></div>
  </div>
  <div class="must-row" data-must="family">
    <input type="checkbox" id="must-done-family" class="must-check" aria-label="Mark family must as done">
    <div><label class="must-label" for="must-family">2 · For my family</label><input type="text" id="must-family" class="text-input must-input" placeholder="One thing for the people you love…" maxlength="120" autocomplete="off"></div>
  </div>
  <div class="must-row" data-must="home">
    <input type="checkbox" id="must-done-home" class="must-check" aria-label="Mark home must as done">
    <div><label class="must-label" for="must-home">3 · For the house</label><input type="text" id="must-home" class="text-input must-input" placeholder="One thing for the house or logistics…" maxlength="120" autocomplete="off"></div>
  </div>
  <div id="musts-win" class="win hidden">All three done. That is a genuinely good day. 🎉</div>
  <div class="musts-foot">
    <button id="copy-musts" type="button" class="btn btn-secondary btn-sm">Copy my 3</button>
    <button id="clear-musts" type="button" class="btn btn-ghost btn-sm">Start a fresh day</button>
    <span id="musts-status" class="save-status">Saved on this device</span>
  </div>
</div>`;

const NEXT_APP = `
<div class="app-card">
  <div id="na-step1" class="na-step">
    <p class="na-question">How are you feeling right now?</p>
    <div class="na-options">
      <button type="button" class="na-option" data-feeling="overwhelmed">😵‍💫 Overwhelmed</button>
      <button type="button" class="na-option" data-feeling="stuck">🧊 Stuck or blank</button>
      <button type="button" class="na-option" data-feeling="tired">😴 Tired</button>
      <button type="button" class="na-option" data-feeling="anxious">😟 Anxious</button>
      <button type="button" class="na-option" data-feeling="okay">🙂 Okay, I just need direction</button>
    </div>
  </div>
  <div id="na-step2" class="na-step hidden">
    <p class="na-question">What needs attention most?</p>
    <div class="na-options">
      <button type="button" class="na-option" data-area="personal">🌿 Me</button>
      <button type="button" class="na-option" data-area="kids">🧒 Kids and family</button>
      <button type="button" class="na-option" data-area="home">🏠 Home and chores</button>
      <button type="button" class="na-option" data-area="admin">📄 Admin and paperwork</button>
      <button type="button" class="na-option" data-area="work">💼 Work or a focus task</button>
    </div>
    <button id="na-back" type="button" class="btn btn-ghost btn-sm">← Back</button>
  </div>
  <div id="na-result" class="na-result hidden" aria-live="polite">
    <p class="na-label">Your one tiny next step:</p>
    <p id="na-suggestion" class="na-suggestion"></p>
    <div class="na-result-actions">
      <button id="na-timer" type="button" class="btn btn-primary">Start a 5-minute timer</button>
      <button id="na-again" type="button" class="btn btn-secondary">Try another idea</button>
      <button id="na-restart" type="button" class="btn btn-ghost">Start over</button>
    </div>
  </div>
</div>`;

const BLOCK_APP = `
<div class="app-card">
  <div class="time-columns">
    <div class="time-col" data-period="morning">
      <h3>🌅 Morning <span class="now-badge hidden">Now</span></h3>
      <p class="time-range">Until about noon</p>
      <div class="time-slots" id="slots-morning"></div>
      <button type="button" class="add-slot-btn" data-period="morning">+ Add a block</button>
    </div>
    <div class="time-col" data-period="afternoon">
      <h3>☀️ Afternoon <span class="now-badge hidden">Now</span></h3>
      <p class="time-range">Noon to about 5pm</p>
      <div class="time-slots" id="slots-afternoon"></div>
      <button type="button" class="add-slot-btn" data-period="afternoon">+ Add a block</button>
    </div>
    <div class="time-col" data-period="evening">
      <h3>🌙 Evening <span class="now-badge hidden">Now</span></h3>
      <p class="time-range">After 5pm</p>
      <div class="time-slots" id="slots-evening"></div>
      <button type="button" class="add-slot-btn" data-period="evening">+ Add a block</button>
    </div>
  </div>
  <div class="app-actions">
    <button id="copy-timeblock" type="button" class="btn btn-secondary btn-sm">Copy as text</button>
    <button id="clear-timeblock" type="button" class="btn btn-ghost btn-sm">Clear all</button>
    <span id="timeblock-status" class="save-status">Saved on this device</span>
  </div>
</div>`;

const ROUTINE_APP = `
<div class="app-card">
  <div class="routine-toolbar">
    <div class="view-toggle" role="group" aria-label="Routine type">
      <button type="button" class="view-btn active" data-view="daily" aria-pressed="true">Daily</button>
      <button type="button" class="view-btn" data-view="weekly" aria-pressed="false">Weekly</button>
    </div>
    <button type="button" id="add-block-btn" class="btn btn-secondary btn-sm">+ Add your own block</button>
  </div>
  <div id="block-form" class="block-form hidden">
    <label for="block-name" class="sr-only">Block name</label>
    <input type="text" id="block-name" class="text-input" placeholder="Block name (e.g. School run)" maxlength="60" autocomplete="off">
    <label for="block-time" class="sr-only">Time (optional)</label>
    <input type="text" id="block-time" class="text-input" placeholder="Time (optional)" maxlength="20" autocomplete="off">
    <button type="button" id="block-add-confirm" class="btn btn-primary">Add</button>
  </div>
  <div id="routine-canvas" class="routine-canvas" aria-live="polite"></div>
  <p class="palette-title">Quick add common blocks</p>
  <div class="palette">
    <button type="button" class="palette-btn" data-label="Morning routine" data-color="#e0b04a"><i style="background:#e0b04a"></i>Morning routine</button>
    <button type="button" class="palette-btn" data-label="School run" data-color="#5b8fb5"><i style="background:#5b8fb5"></i>School run</button>
    <button type="button" class="palette-btn" data-label="Focus work" data-color="#3f7d68"><i style="background:#3f7d68"></i>Focus work</button>
    <button type="button" class="palette-btn" data-label="Meals" data-color="#d98f5f"><i style="background:#d98f5f"></i>Meals</button>
    <button type="button" class="palette-btn" data-label="Rest or break" data-color="#8f7cc0"><i style="background:#8f7cc0"></i>Rest or break</button>
    <button type="button" class="palette-btn" data-label="Homework time" data-color="#5b8fb5"><i style="background:#5b8fb5"></i>Homework time</button>
    <button type="button" class="palette-btn" data-label="Evening wind-down" data-color="#8f7cc0"><i style="background:#8f7cc0"></i>Evening wind-down</button>
    <button type="button" class="palette-btn" data-label="Admin and errands" data-color="#d9808f"><i style="background:#d9808f"></i>Admin and errands</button>
  </div>
  <div class="app-actions">
    <button id="export-routine" type="button" class="btn btn-secondary btn-sm">Copy as text</button>
    <button id="print-routine" type="button" class="btn btn-secondary btn-sm">Print or save as PDF</button>
    <button id="clear-routine" type="button" class="btn btn-ghost btn-sm">Clear this routine</button>
    <span id="routine-status" class="save-status">Saved on this device</span>
  </div>
</div>`;

const TOOLS = [
  {
    id: 'timer',
    slug: 'adhd-focus-timer',
    icon: '⏱️', tint: 'tint-green',
    nav: 'Timer',
    name: 'Focus Timer',
    cardText: 'A visual timer for time blindness: ring or pie, focus sounds, gentle breaks, and no guilt if you stop early.',
    cardCta: 'Open the timer →',
    title: 'Free Visual Timer for ADHD – Focus Timer for Time Blindness',
    description: 'A free visual timer for ADHD: ring or pie view, brown noise, keep-going button and no-guilt breaks. No signup, and it works offline on your phone.',
    h1: 'Visual Timer for ADHD',
    lead: 'A calm visual timer that makes time visible, so you can start, stay with it, and stop without guilt.',
    app: TIMER_APP,
    stepsTitle: 'How to use this visual timer for ADHD',
    steps: [
      ['Pick a length you can actually start', 'Begin with 10 or 15 minutes. A short timer is easier to begin than a long one, and you can always run another.'],
      ['Press start and keep it in sight', 'Watch the ring or the pie shrink. The colour warms as time runs low, so you are never surprised.'],
      ['Keep going or take a break', 'Still in flow when it chimes? Tap “Keep going +5 min”. Otherwise take the break, and try one of the break ideas.']
    ],
    whyTitle: 'Why this timer is built differently',
    why: [
      'Many people with ADHD find it hard to sense how much time has passed. A shrinking shape turns time into something you can see.',
      'It does not force you out of hyperfocus. You can extend by five minutes instead of losing your flow.',
      'The “I got distracted” button logs a wandering mind without any judgment, then welcomes you back.',
      'Optional brown, pink or white noise, a full-screen view, and offline use once you add it to your home screen.',
      'No account, no ads and no streaks to lose. Your sessions stay on your own device.'
    ],
    faq: [
      ['What is the best timer length for ADHD?', 'There is no single best length. Many people find 10 to 25 minutes workable, and a shorter timer makes beginning easier. Try 10 minutes first and lengthen it only if that feels easy.'],
      ['Why does a visual timer help with ADHD time blindness?', 'A shrinking ring or pie shows how much time is left at a glance, so you do not have to estimate it in your head. For many people, seeing time pass is easier than sensing it.'],
      ['What is the best visual timer for ADHD?', 'The best one is the one you will actually use. Look for a timer you can see from across the room, with short presets, a gentle alert and no signup. This free timer offers a ring or pie view, brown noise and a keep-going button, and physical sand or disc timers work well when you want a screen-free option.'],
      ['Does this timer have brown noise?', 'Yes. Open “More options” to choose brown, pink or white noise and set the volume. The sound plays while the timer runs and stops when it ends.'],
      ['What if I am in hyperfocus when the timer ends?', 'Tap “Keep going +5 min” to extend without breaking your flow. You can keep extending, or take the break when you are ready.'],
      ['Does the timer keep working if my phone screen locks?', 'The countdown stays accurate because it checks the clock when you come back. Sound and vibration alerts may be delayed until you reopen the page, since some phones pause web pages in the background. The “keep my screen awake” option helps while the timer is running.'],
      ['Can I use it offline or install it on my phone?', 'Yes. Add it to your home screen from your browser menu and it opens like an app and works without an internet connection.'],
      ['What is the Pomodoro technique, and does it work for ADHD?', 'Pomodoro means working in short timed sessions with breaks in between, often 25 minutes of work and 5 minutes of rest. Some people with ADHD like the structure and others prefer shorter or longer blocks, so use the presets or a custom length to find what fits you.'],
      ['Is this focus timer free?', 'Yes. It is free to use, with no signup and no ads, and your sessions are stored only on your device.']
    ],
    related: ['kids', 'brain', 'next'],
    guides: ['why-adhd-brains-lose-track-of-time'],
    cta: { title: 'A timer helps you start. A system tells you what to start on.', text: 'The free 7-Day Reset and the ADHD Planner give you simple daily structure, so your focus time goes to the right thing.', buttons: [['Get the free 7-Day Reset', LINKS.reset, 'primary'], ['See the Planner', '/adhd-planner-for-moms/', 'secondary']] }
  },
  {
    id: 'kids',
    slug: 'visual-timer-for-kids',
    icon: '🧒', tint: 'tint-accent',
    nav: 'Kids Timer',
    name: 'Visual Timer for Kids',
    cardText: 'Show your child what “5 minutes” looks like. A big shrinking pie for getting dressed, tidy-up and homework.',
    cardCta: 'Open the kids timer →',
    title: 'Free Visual Timer for Kids – Simple Countdown for Routines',
    description: 'A free visual timer for kids that shows time disappearing. Great for getting dressed, tidy-up, homework and bedtime. Works on any phone or tablet.',
    h1: 'Visual Timer for Kids',
    lead: 'Show your child what “5 minutes” looks like. A big shrinking pie makes time something they can see.',
    app: KIDS_APP,
    stepsTitle: 'How to use the kids timer',
    steps: [
      ['Tap a quick timer or choose a length', 'Pick “Get dressed”, “Tidy up”, “Homework” or set your own. The label and length are filled in for you.'],
      ['Go full screen and prop it up', 'Tap Full screen so the pie is big and easy to see from across the room.'],
      ['Let your child watch it, and celebrate at the end', 'The colour changes from green to amber to rose as time runs low. When it ends, there is a chime and a little celebration.']
    ],
    whyTitle: 'Why a visual timer helps kids',
    why: [
      'Young children, and many kids with ADHD, find abstract time hard to grasp. A shape that shrinks makes it concrete.',
      'The timer becomes the “bad guy” instead of you, which can mean fewer reminders and fewer arguments.',
      'It is useful for transitions: leaving the park, turning off a screen, starting bedtime.',
      'It is free, needs no app download and does not collect anything about your child.'
    ],
    faq: [
      ['How long should a timer be for a young child?', 'Shorter is usually easier for younger children. Many families start with 2 to 5 minutes for quick tasks like brushing teeth or tidying toys, and 10 to 15 minutes for homework or getting ready. Adjust to what your child can manage.'],
      ['Do visual timers help kids with ADHD?', 'Many parents and teachers find them helpful because they make time visible, though results vary from child to child. Treat the timer as one tool alongside routines, praise and clear expectations.'],
      ['Is this timer free, and do I need to download an app?', 'It is free and works in your browser on any phone, tablet or computer. You can add it to your home screen if you want it to open like an app.'],
      ['How do I stop my child from fighting the timer?', 'Let your child start it, practise first with a fun task, and praise them when they beat it. Keep the tone friendly and treat the timer as a game rather than a threat.'],
      ['Can I use it full screen on a tablet?', 'Yes. Tap “Full screen” to fill the display with the timer, then tap the X to leave.']
    ],
    related: ['timer', 'routine', 'musts'],
    guides: [],
    cta: { title: 'Mornings and bedtimes still chaotic?', text: 'The planner includes a printable Family Command Station that shows everyone the plan at a glance, so the timer is not doing all the work.', buttons: [['Get the Planner', LINKS.planner, 'primary'], ['Get the free 7-Day Reset', LINKS.reset, 'secondary']] }
  },
  {
    id: 'brain',
    slug: 'adhd-brain-dump',
    icon: '🧠', tint: 'tint-lav',
    nav: 'Brain Dump',
    name: 'Brain Dump Unloader',
    cardText: 'Type everything on your mind. Get it sorted into tasks, worries and feelings, with one small place to start.',
    cardCta: 'Unload your head →',
    title: 'Free ADHD Brain Dump Tool – Sort Tasks, Worries & Feelings',
    description: 'Type everything on your mind. This free brain dump tool sorts it into tasks, worries and feelings and picks one tiny step to start. No signup.',
    h1: 'ADHD Brain Dump Tool',
    lead: 'Pour out everything swirling in your head. We will separate the tasks from the worries and feelings, and pick one small place to start.',
    app: BRAIN_APP,
    stepsTitle: 'How to use the brain dump tool',
    steps: [
      ['Dump it all, messy is fine', 'Type tasks, worries, reminders and feelings in any order. Do not edit as you go.'],
      ['Tell it how much energy you have', 'On a low-energy day the plan shrinks to the smallest honest version of today.'],
      ['Press Unload and start with “Start here”', 'You get one first step, plus the rest sorted by when it needs you. Nothing is thrown away.']
    ],
    whyTitle: 'Why a brain dump works when you are overwhelmed',
    why: [
      'Working memory can only hold so much. Writing things down gives your brain permission to stop rehearsing them.',
      'Sorting is usually where people stall, so the tool does the first sort for you.',
      'Feelings and worries are kept apart from tasks, so they are not mistaken for things to check off.',
      'Everything is processed in your browser. Your dump is never sent to a server.'
    ],
    faq: [
      ['What is a brain dump?', 'A brain dump means writing everything on your mind onto a page or screen without filtering it, then sorting it afterward. It moves the load out of your head so you can decide what actually needs doing.'],
      ['How does the tool decide what is urgent?', 'It looks for time words like today, tomorrow or by Friday, and gives extra weight to things like children’s needs and health appointments. It also adapts to your energy setting. It is a helpful guess based on your words, so reorder anything that does not fit your day.'],
      ['Is my brain dump private?', 'Yes. Everything is processed in your browser and nothing you type is sent to a server. Your draft is saved only on your own device so you do not lose it.'],
      ['Why does it separate feelings from tasks?', 'Feelings like overwhelm or guilt cannot be checked off a list. Keeping them separate lets you acknowledge them without having to fix them first.'],
      ['What if I write something really painful?', 'If you write something that suggests you may hurt yourself, the tool shows a note with support options. If you are in crisis, call or text 988 in the US, or find local help at findahelpline.com.']
    ],
    related: ['musts', 'next', 'timer'],
    guides: ['adhd-brain-dump-how-to-empty-your-head'],
    cta: { title: 'Dump today. Plan tomorrow.', text: 'The ADHD Planner has an Outbox page for exactly this: a place to put everything so tomorrow starts lighter.', buttons: [['Get the free 7-Day Reset', LINKS.reset, 'primary'], ['See the Planner', '/adhd-planner-for-moms/', 'secondary']] }
  },
  {
    id: 'musts',
    slug: 'todays-3-musts',
    icon: '✨', tint: 'tint-sun',
    nav: 'Top 3',
    name: 'Today’s 3 Musts',
    cardText: 'Choose just three things for today: one for you, one for family, one for home. Check them off as you go.',
    cardCta: 'Pick your 3 →',
    title: 'Today’s 3 Musts – Free ADHD Daily Priorities Planner',
    description: 'Choose just three things for today: one for you, one for family, one for home. A free daily priorities planner for overwhelmed ADHD moms.',
    h1: 'Today’s 3 Musts: A Daily Priorities Planner',
    lead: 'Overwhelm shrinks when you choose only three things. One for you, one for your family, one for the house.',
    app: MUSTS_APP,
    stepsTitle: 'How to choose your 3 musts',
    steps: [
      ['Pick one thing for you', 'Something small that keeps you going, like a shower, a walk, or finishing a coffee while it is hot.'],
      ['Pick one thing for your family', 'The one thing that would matter most to the people you love today.'],
      ['Pick one thing for the house', 'The one chore or errand that makes tonight or tomorrow easier.']
    ],
    whyTitle: 'Why three priorities beat a long to-do list',
    why: [
      'A long list makes every task feel equally heavy. Three is short enough to hold in your head.',
      'Splitting them into you, family and home keeps your own needs on the list.',
      'Checking items off gives a visible win, which can make it easier to begin tomorrow.',
      'Your list saves on your device and starts fresh each day.'
    ],
    faq: [
      ['How many tasks should I plan each day with ADHD?', 'Fewer than you think. Many people with ADHD find three priorities more realistic than a long list, because a short list is easier to start and easier to finish.'],
      ['Why personal, family and home?', 'Those three areas are where moms often feel pulled in different directions. Choosing one for each keeps your own needs from getting lost behind everyone else’s.'],
      ['What if I do not finish all three?', 'That is fine. Doing one of three is still progress. Unfinished items are offered the next day so you can carry them over or let them go.'],
      ['Does it save my list?', 'Yes. Your three musts are saved on your own device, with no account needed. They reset each new day.'],
      ['Can I use it every day?', 'Yes. Open it each morning, choose three, and check them off as you go.']
    ],
    related: ['brain', 'block', 'next'],
    guides: [],
    cta: { title: 'This is the heart of the Daily Planner.', text: 'The planner is built around exactly this: Personal, Family, Home, with space for the rest of the day so your three do not get buried.', buttons: [['Get the free 7-Day Reset', LINKS.reset, 'primary'], ['See the Planner', '/adhd-planner-for-moms/', 'secondary']] }
  },
  {
    id: 'next',
    slug: 'what-should-i-do-now',
    icon: '👉', tint: 'tint-sky',
    nav: 'Next Step',
    name: 'Next Action Helper',
    cardText: 'Stuck, tired or overwhelmed? Answer two quick questions and get one tiny step you can do right now.',
    cardCta: 'Get my next step →',
    title: 'What Should I Do Now? Free ADHD Next Step Helper',
    description: 'Overwhelmed, stuck or tired? Answer two quick questions and get one tiny next step you can do right now. Free, no signup.',
    h1: 'What Should I Do Now? ADHD Next Step Helper',
    lead: 'When everything feels like too much, answer two gentle questions and get one tiny next step.',
    app: NEXT_APP,
    stepsTitle: 'How it works',
    steps: [
      ['Say how you feel', 'Overwhelmed, stuck, tired, anxious, or just needing direction. There is no wrong answer.'],
      ['Say what needs attention', 'You, the kids, the house, paperwork, or work.'],
      ['Do the one tiny step', 'Start with the timer if it helps. Not the right idea? Tap “Try another idea.”']
    ],
    whyTitle: 'Why one tiny step works better than a plan',
    why: [
      'When you are stuck, a full plan can feel like another thing to do. One small step is easier to begin.',
      'The suggestions are matched to how you feel, because what helps an overwhelmed brain is different from what helps a tired one.',
      'Starting is usually the hardest part, and a very small first step makes starting less risky.'
    ],
    faq: [
      ['What do I do when I am overwhelmed and cannot start?', 'Shrink the task until it feels almost silly, such as putting one item away or opening one message. Then set a short timer. Starting small lowers the barrier, and momentum often follows.'],
      ['Why can I not start tasks even though I want to?', 'Difficulty starting tasks, called task initiation, is a common part of how ADHD affects executive function. It is not laziness, and it often eases when the first step is made very small.'],
      ['What if the suggestion does not fit my situation?', 'Tap “Try another idea” for a different one. You can also go back and choose a different feeling or area.'],
      ['Is this a replacement for therapy or treatment?', 'No. This tool offers small practical ideas and is not medical advice. If daily life is feeling unmanageable, a doctor or therapist who understands ADHD can help.']
    ],
    related: ['timer', 'brain', 'musts'],
    guides: ['adhd-task-paralysis-why-you-cant-start'],
    cta: { title: 'One step gets you moving. A system keeps you from needing a rescue.', text: 'A simple daily structure means fewer of these frozen moments. That is what the 7-Day Reset and the planner are for.', buttons: [['Get the free 7-Day Reset', LINKS.reset, 'primary'], ['See the Planner', '/adhd-planner-for-moms/', 'secondary']] }
  },
  {
    id: 'block',
    slug: 'adhd-time-blocker',
    icon: '🗓️', tint: 'tint-sky',
    nav: 'Time Blocks',
    name: 'Visual Time Blocker',
    cardText: 'Make your day visible. Drop a few blocks into morning, afternoon and evening and tick them off.',
    cardCta: 'Plan my day →',
    title: 'Free ADHD Time Blocking Planner – Simple Visual Day Planner',
    description: 'Make your day visible with a free time blocking planner for ADHD moms. Add blocks to morning, afternoon and evening. No signup, saves on your phone.',
    h1: 'Visual Time Blocker for ADHD',
    lead: 'Make your day visible. Drop a few blocks into morning, afternoon and evening, then tick them off.',
    app: BLOCK_APP,
    stepsTitle: 'How to time block your day',
    steps: [
      ['Add one or two blocks per part of the day', 'Keep it short. Three to six blocks in total is plenty.'],
      ['Leave space between blocks', 'Things take longer than you expect. Empty space is a feature.'],
      ['Tick blocks off and let the rest go', 'The highlighted column shows what part of the day you are in right now.']
    ],
    whyTitle: 'Why time blocking can help with ADHD',
    why: [
      'Seeing your day as a few chunks makes it feel more manageable than one long open stretch.',
      'Writing blocks down means you do not have to hold the whole day in your head.',
      'Morning, afternoon and evening are broad on purpose, so one late start does not wreck the plan.',
      'Your blocks save on your device and you can copy them as text.'
    ],
    faq: [
      ['What is time blocking?', 'Time blocking means assigning parts of your day to specific activities instead of keeping one long to-do list. Here, you place blocks into morning, afternoon and evening.'],
      ['Does time blocking work for ADHD?', 'It helps many people because it makes time visible, but rigid schedules can backfire. Keep blocks broad, leave buffers, and treat the plan as a guide rather than a test.'],
      ['How many blocks should I plan in a day?', 'Three to six is a good starting point. If you finish them all easily, add more tomorrow. If you keep missing them, remove some.'],
      ['What if my plan falls apart?', 'That is normal. Move the blocks that matter to later today or tomorrow and let the rest go. A broken plan is information, not failure.'],
      ['Does it save my blocks?', 'Yes, on your own device. Nothing is uploaded and there is no account.']
    ],
    related: ['musts', 'routine', 'timer'],
    guides: [],
    cta: { title: 'Want the paper version for the fridge?', text: 'The planner includes a Family Command Station and weekly snapshot so everyone in the house can see the plan at a glance.', buttons: [['Get the free 7-Day Reset', LINKS.reset, 'primary'], ['See the Planner', '/adhd-planner-for-moms/', 'secondary']] }
  },
  {
    id: 'routine',
    slug: 'adhd-routine-builder',
    icon: '🌿', tint: 'tint-rose',
    nav: 'Routines',
    name: 'Visual Routine Builder',
    cardText: 'Build a simple daily or weekly routine with colored blocks. Reorder it, copy it, or print it for the fridge.',
    cardCta: 'Build a routine →',
    title: 'Free ADHD Routine Builder – Visual Daily & Weekly Routines',
    description: 'Build a visual morning, evening or weekly routine for ADHD moms. Add colored blocks, reorder them, and print it. Free, no signup.',
    h1: 'Visual Routine Builder for ADHD Moms',
    lead: 'Build a simple visual routine that works with your energy. Add blocks, put them in order, and print it for the fridge.',
    app: ROUTINE_APP,
    stepsTitle: 'How to build a routine you will actually use',
    steps: [
      ['Tap quick-add blocks or add your own', 'Start with the 3 to 5 things that happen every day without fail.'],
      ['Put them in order with the arrows', 'Add an optional time if it helps, like 8:15am for the school run.'],
      ['Print it or copy it', 'Stick it on the fridge or send it to your partner. Switch to Weekly for things like meal prep day.']
    ],
    whyTitle: 'Why a visual routine helps',
    why: [
      'A routine you can see does not have to live in your head, which frees up working memory.',
      'Short routines are easier to keep than long ones, so start small and add later.',
      'Printing it lets everyone in the house follow the same plan.',
      'Daily and weekly routines are saved separately on your own device.'
    ],
    faq: [
      ['How do I build a morning routine with ADHD?', 'Start with three to five steps that you already do, put them in order, and add a time to the first one. Keep it short and add steps only after the basics feel easy.'],
      ['How many steps should a routine have?', 'Fewer than you think. Three to seven steps is usually enough. A short routine you follow is better than a perfect one you abandon.'],
      ['Can I print my routine?', 'Yes. Use the “Print or save as PDF” button. The page prints only your routine, which you can stick on the fridge.'],
      ['What is the difference between daily and weekly?', 'Daily is for things that happen every day, like mornings and bedtime. Weekly is for things that happen on certain days, like meal prep or laundry day.'],
      ['Does it save my routine?', 'Yes, on your own device. There is no account, and clearing your browser data will remove it.']
    ],
    related: ['kids', 'block', 'timer'],
    guides: [],
    cta: { title: 'A routine on screen is a start. A family chart on the fridge finishes the job.', text: 'The planner includes a printable Family Command Station and weekly snapshot that the whole house can see.', buttons: [['Get the Planner', LINKS.planner, 'primary'], ['Ebook + Planner bundle', LINKS.bundle, 'secondary']] }
  }
];


// Extra landing pages (not tools). Rendered by build-blog.js.
const SHOWCASE = `
<div class="showcase-grid">
  <div class="showcase-item"><img src="/images/daily-planner.jpg" width="1158" height="1500" loading="lazy" alt="ADHD Daily Planner page with Today’s 3 Musts, morning micro-ritual and mood tracker"><p>Daily Planner</p></div>
  <div class="showcase-item"><img src="/images/weekly-snapshot.jpg" width="1158" height="1500" loading="lazy" alt="ADHD Weekly Snapshot with priorities, kids schedule and meal plan"><p>Weekly Snapshot</p></div>
  <div class="showcase-item"><img src="/images/habit-tracker.jpg" width="1158" height="1500" loading="lazy" alt="ADHD Habit Tracker with sleep anchor, water, daily 3 and outbox"><p>Habit Tracker</p></div>
  <div class="showcase-item"><img src="/images/family-command.jpg" width="1159" height="1500" loading="lazy" alt="Family Command Station: one glance, one plan"><p>Family Command Station</p></div>
</div>`;

const PAGES = [
  {
    slug: 'adhd-planner-for-moms',
    icon: '📒', tint: 'tint-accent', nav: 'ADHD Planner for Moms',
    title: 'ADHD Planner for Moms – Simple Daily & Weekly Pages',
    description: 'An ADHD planner for moms with Today’s 3 Musts, a weekly snapshot, habit tracker and Family Command Station. See the pages and try free options first.',
    h1: 'ADHD Planner for Moms',
    lead: 'Planner pages built for brains that freeze at long to-do lists: a few priorities, a visible week, and one place for the whole family’s plan.',
    body: `
<h2>What is inside the ADHD Planner</h2>
${SHOWCASE}
<ul>
  <li><strong>Daily Planner:</strong> Today’s 3 Musts, a morning micro-ritual and a mood tracker.</li>
  <li><strong>Weekly Snapshot:</strong> your priorities, the kids’ schedule and a meal plan on one page.</li>
  <li><strong>Habit Tracker:</strong> a sleep anchor, water, your daily three and an outbox for everything you need to get out of your head.</li>
  <li><strong>Family Command Station:</strong> one glance, one plan, so the whole house can see what is happening.</li>
</ul>
<p>The format and current price are shown on the product page.</p>
<div class="cta-box"><h3>Ready to look at the pages?</h3><p>See the full planner, or start with the free 7-Day Reset.</p><div class="btn-row"><a class="btn btn-primary" href="${LINKS.planner}" target="_blank" rel="noopener">Get the ADHD Planner</a><a class="btn btn-secondary" href="${LINKS.reset}" target="_blank" rel="noopener">Free 7-Day Reset</a></div></div>
<h2>How it works on a hard day</h2>
<p>You do not have to fill in every box. On a bad day, use only Today’s 3 Musts and leave the rest blank. A planner that asks for less is one you are more likely to open again tomorrow.</p>
<h2>Try free tools first</h2>
<p>Not sure a planner is for you? These free tools do a similar job on your phone, with no signup:</p>
<ul>
  <li><a href="/todays-3-musts/">Today’s 3 Musts</a> to choose your priorities</li>
  <li><a href="/adhd-time-blocker/">Visual Time Blocker</a> to see your day</li>
  <li><a href="/adhd-routine-builder/">Routine Builder</a> to print a routine for the fridge</li>
  <li><a href="/adhd-brain-dump/">Brain Dump</a> to empty your head first</li>
</ul>
<p>Choosing between planners? Read <a href="/blog/how-to-choose-an-adhd-planner/">how to choose an ADHD planner you will actually use</a>.</p>`,
    faq: [
      ['What is in the ADHD Planner?', 'It includes a Daily Planner with Today’s 3 Musts, a Weekly Snapshot with priorities, the kids’ schedule and a meal plan, a Habit Tracker, and a Family Command Station for the whole household.'],
      ['Is there a free ADHD planner?', 'Yes. The free tools on this site, including Today’s 3 Musts, the Time Blocker and the Routine Builder, work like a digital planner, and the free 7-Day Reset is a gentle way to start.'],
      ['How is an ADHD planner different from a regular planner?', 'A regular planner often asks you to fill in a lot. An ADHD-friendly planner keeps the number of daily priorities small, makes the week easy to see, and works even when you only fill in a little.'],
      ['Do I need an ADHD diagnosis to use it?', 'No. It is an organization aid for anyone who feels overwhelmed, and it is not medical advice or a diagnosis.'],
      ['Where can I get the planner?', 'You can get the ADHD Planner on Gumroad using the button on this page, where the format and current price are shown.']
    ],
    related: ['musts', 'routine', 'block']
  }
];

module.exports = { TOOLS, LINKS, PAGES };
