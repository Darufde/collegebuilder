/* College Builder — screens, rendering and input handling. */
(function () {
  'use strict';
  const D = window.CB_DATA;
  const G = window.Game;

  const app = document.getElementById('app');
  const drawerRoot = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'drawer-root' }));
  const modalRoot = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'modal-root' }));

  const PAGE_SIZE = 100;

  const ui = {
    screen: 'menu',
    showHowTo: false,
    setup: null,
    tab: 'office',
    filter: 'pending',
    view: 'all',
    sort: { key: 'idx', dir: -1 },
    search: '',
    page: 0,
    openId: null,
    navIds: [],
    autoAdvance: true,
    stampAnim: false,
    advanceTimer: null,
    classDept: 'gen',
    majorArea: 'all',
    majorSearch: '',
    bulkAdmit: 70,
    bulkDeny: 35,
    bulkWait: 55,
    bulkTop: 50,
    modal: null
  };

  // ---------- formatting ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function money(n) {
    const neg = n < 0;
    const v = Math.abs(n);
    let s;
    if (v >= 1e9) s = (v / 1e9).toFixed(2) + 'B';
    else if (v >= 1e6) s = (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M';
    else if (v >= 1e3) s = Math.round(v / 1e3) + 'K';
    else s = String(Math.round(v));
    return (neg ? '−' : '') + '$' + s;
  }
  const dollars = n => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString();
  const pct = v => Math.round(v * 100) + '%';
  const num = n => Math.round(n).toLocaleString();
  const plural = (n, word, many) => num(n) + ' ' + (n === 1 ? word : (many || word + 's'));
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const majorName = id => (id === 'undeclared' ? 'Undeclared' : (G.majorById(id) || {}).name || 'Undeclared');
  const hometown = a => (a.city ? a.city + ', ' : '') + a.region;
  const testLabel = a => (a.sat ? 'SAT ' + a.sat : a.act ? 'ACT ' + a.act : 'Test-optional');
  const testSortValue = a => (a.sat ? a.sat : a.act ? 710 + (a.act - 12) * 37 : 0);
  const typeLabel = t => (t === 'public' ? 'Public' : 'Private');
  const genderWord = g => (g === 'F' ? 'Female' : 'Male');
  const isInState = a => !a.intl && a.stateCode === G.state.school.state;
  const residencyWord = a => (a.intl ? 'International' : isInState(a) ? 'In-state' : 'Out-of-state');
  const hookLabel = id => (D.HOOKS[id] ? D.HOOKS[id].label : '');
  const chapterById = id => G.state.greek.find(c => c.id === id);

  function inkFor(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#ffffff';
    const n = parseInt(m[1], 16);
    const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.4 ? '#14161a' : '#ffffff';
  }
  function setSchoolColors(primary, secondary) {
    const root = document.documentElement.style;
    root.setProperty('--school', primary);
    root.setProperty('--school-ink', inkFor(primary));
    root.setProperty('--school-2', secondary);
    root.setProperty('--school-2-ink', inkFor(secondary));
  }

  function yieldTone(p) { return p >= 0.55 ? 'good' : p >= 0.3 ? 'warn' : 'bad'; }
  function yieldWord(p) { return p >= 0.55 ? 'Likely' : p >= 0.3 ? 'Maybe' : 'Unlikely'; }
  const DECISION_LABEL = { pending: 'Pending', admit: 'Admitted', waitlist: 'Waitlisted', deny: 'Denied', defer: 'Deferred' };
  const STAMP_LABEL = { admit: 'Admit', waitlist: 'Waitlist', deny: 'Deny', defer: 'Defer' };
  const ROUND_LABEL = { ED: 'Early Decision', EA: 'Early Action', RD: 'Regular Decision' };
  const isEarlyPhase = () => G.state.phase === 'early';
  const holdWord = () => (isEarlyPhase() ? 'Defer' : 'Waitlist');

  function pennant(name, mascot, cls) {
    return '<div class="pennant ' + (cls || '') + '" aria-hidden="true"><span class="pennant-name">' + esc(name) +
      '</span>' + (mascot ? '<span class="pennant-mascot">' + esc(mascot) + '</span>' : '') + '</div>';
  }

  // ---------- shared widgets ----------
  function kv(label, value) {
    return '<div class="kv"><span class="kv-label">' + label + '</span><span class="kv-value">' + value + '</span></div>';
  }
  // A number input bound to a state path. scale converts stored values to what the player types (0.4 → 40%).
  function numField(id, label, value, min, max, step, key, scale) {
    scale = scale || 1;
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<input type="number" id="' + id + '" data-bind="' + key + '" data-scale="' + scale + '" value="' + Math.round(value * scale) + '" min="' + min + '" max="' + max + '" step="' + step + '" inputmode="numeric"></div>';
  }
  // A checkbox bound to a true/false state path.
  function checkField(id, label, on, key, note) {
    return '<label class="check" for="' + id + '"><input type="checkbox" id="' + id + '" data-bind-check="' + key + '"' + (on ? ' checked' : '') + '>' +
      '<span><b>' + label + '</b>' + (note ? '<span class="hint">' + note + '</span>' : '') + '</span></label>';
  }
  // A select bound to a state path. options: [value, label]
  function selectField(id, label, value, key, options) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-bind-select="' + key + '">' +
      options.map(([v, l]) => '<option value="' + v + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>';
  }

  // Stacked share bar with a legend. parts: [label, count, colorClass]
  function split(title, parts) {
    const total = parts.reduce((x, p) => x + p[1], 0) || 1;
    return '<div class="split">' +
      (title ? '<div class="split-title">' + title + '</div>' : '') +
      '<div class="split-bar" role="img" aria-label="' + esc(parts.map(p => p[0] + ' ' + pct(p[1] / total)).join(', ')) + '">' +
        parts.map(p => p[1] ? '<span class="seg ' + p[2] + '" style="flex:' + p[1] / total + '"></span>' : '').join('') +
      '</div>' +
      '<ul class="legend">' + parts.map(p => '<li><span class="dot ' + p[2] + '"></span>' + p[0] + ' <b>' + pct(p[1] / total) + '</b></li>').join('') + '</ul>' +
    '</div>';
  }
  // Gender and residency splits for any list of people, optionally weighted (e.g. by enroll chance).
  function demographics(list, weight) {
    weight = weight || (() => 1);
    const d = { f: 0, m: 0, inS: 0, outS: 0, intl: 0, n: 0 };
    for (const a of list) {
      const w = weight(a);
      d.n += w;
      if (a.gender === 'F') d.f += w; else d.m += w;
      if (a.intl) d.intl += w; else if (isInState(a)) d.inS += w; else d.outS += w;
    }
    return d;
  }
  function genderSplit(d, title) { return split(title, [['Women', d.f, 'c1'], ['Men', d.m, 'c2']]); }
  function residencySplit(d, title) { return split(title, [['In-state', d.inS, 'c3'], ['Out-of-state', d.outS, 'c4'], ['International', d.intl, 'c5']]); }
  function bars(rows, max) {
    max = max || Math.max(1, ...rows.map(r => r[1]));
    return '<ul class="bars">' + rows.map(([label, n, shown]) =>
      '<li><span class="bar-label">' + esc(label) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.min(100, n / max * 100) + '%"></span></span><span class="bar-num">' + (shown != null ? shown : num(n)) + '</span></li>').join('') + '</ul>';
  }
  function chipGroup(action, items, current, label) {
    return '<div class="chips" role="group" aria-label="' + esc(label) + '">' +
      items.map(([id, text, n]) => '<button class="chip-btn' + (current === id ? ' is-on' : '') + '" data-action="' + action + '" data-id="' + id + '" aria-pressed="' + (current === id) + '">' + text + (n != null ? ' <b>' + num(n) + '</b>' : '') + '</button>').join('') +
    '</div>';
  }

  // ---------- main menu ----------
  function renderMenu() {
    setSchoolColors('#1f3a6b', '#e0a526');
    const saved = G.peekSave();
    return '<main class="menu">' +
      '<section class="menu-hero">' +
        '<div class="menu-copy">' +
          '<p class="eyebrow">Office of Undergraduate Admissions</p>' +
          '<h1 class="wordmark">College<br>Builder</h1>' +
          '<p class="lede">Read the files, stamp the decisions and build a school one freshman class at a time.</p>' +
          '<div class="menu-actions">' +
            '<button class="btn btn-primary btn-lg" data-action="new-game">New game</button>' +
            (saved
              ? '<button class="btn btn-secondary btn-lg" data-action="continue">Continue <span class="btn-note">' + esc(saved.school.name) + ' · ' + saved.year + '</span></button>'
              : '<button class="btn btn-secondary btn-lg" disabled>Continue <span class="btn-note">No saved school</span></button>') +
            '<button class="btn btn-ghost btn-lg" data-action="toggle-howto" aria-expanded="' + ui.showHowTo + '">How to play</button>' +
          '</div>' +
        '</div>' +
        '<div class="menu-sample" aria-hidden="true">' +
          '<div class="folder sample-folder">' +
            '<div class="folder-tab">Application № 0418</div>' +
            '<div class="sample-name">Maya Okafor</div>' +
            '<div class="sample-from">Columbus, OH · Intended major: Biology</div>' +
            '<dl class="sample-grid">' +
              '<div><dt>GPA</dt><dd>3.92</dd></div><div><dt>Weighted</dt><dd>4.48</dd></div>' +
              '<div><dt>SAT</dt><dd>1450</dd></div><div><dt>AP classes</dt><dd>8</dd></div>' +
            '</dl>' +
            '<div class="stamp stamp-admit stamp-static">Admit</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      (ui.showHowTo ? renderHowTo() : '') +
    '</main>';
  }

  function renderHowTo() {
    return '<section class="howto" aria-label="How to play">' +
      '<h2>How to play</h2>' +
      '<ol class="howto-steps">' +
        '<li><strong>Charter your school.</strong> Pick a name, mascot, school colors, home state, and whether you’re public or private.</li>' +
        '<li><strong>Read applications.</strong> Every cycle a new pool of students applies. Each file shows grades, AP scores, tests, hometown, gender, intended major, sport, activities, family finances and any standout talent.</li>' +
        '<li><strong>Stamp a decision.</strong> Admit, waitlist or deny. Not everyone you admit will come. Scholarships and aid help you land the students you want.</li>' +
        '<li><strong>Your students shape the school.</strong> Their activities build campus life. Standouts win awards, go viral or cause scandals. Graduates become alumni who give back.</li>' +
        '<li><strong>Build the campus.</strong> Open majors, schedule classes, build dorms, charter fraternities and sororities, launch teams, and set tuition and financial aid.</li>' +
        '<li><strong>Grow.</strong> As your school gets better, more students apply. There’s no ceiling: pools can reach the tens of thousands.</li>' +
      '</ol>' +
      '<p class="muted">There’s no way to lose. Run the school however you like, for as many years as you like. Your game saves automatically in this browser.</p>' +
      '<p class="muted">Keyboard in an open file: <kbd>A</kbd> admit, <kbd>W</kbd> waitlist, <kbd>D</kbd> deny, <kbd>←</kbd> <kbd>→</kbd> previous and next, <kbd>Esc</kbd> close.</p>' +
    '</section>';
  }

  // ---------- setup ----------
  function defaultSetup() {
    const p = D.COLOR_PRESETS[0];
    return {
      name: G.randomSchoolName(),
      mascot: G.pick(D.MASCOTS),
      primary: p.primary,
      secondary: p.secondary,
      state: 'OH',
      type: 'public'
    };
  }

  function renderSetup() {
    const s = ui.setup;
    setSchoolColors(s.primary, s.secondary);
    const stateOpts = D.STATES.map(st => '<option value="' + st.code + '"' + (st.code === s.state ? ' selected' : '') + '>' + esc(st.name) + '</option>').join('');
    const presets = D.COLOR_PRESETS.map((p, i) =>
      '<button type="button" class="swatch' + (p.primary === s.primary && p.secondary === s.secondary ? ' is-on' : '') + '" data-action="preset" data-i="' + i + '" title="' + esc(p.name) + '" aria-label="' + esc(p.name) + '">' +
      '<span style="background:' + p.primary + '"></span><span style="background:' + p.secondary + '"></span></button>').join('');
    const typeCard = (t, title, lines) =>
      '<label class="type-card' + (s.type === t ? ' is-on' : '') + '" for="setup-type-' + t + '">' +
        '<input type="radio" name="setup-type" id="setup-type-' + t + '" value="' + t + '"' + (s.type === t ? ' checked' : '') + ' data-setup="type">' +
        '<span class="type-title">' + title + '</span>' +
        '<span class="type-lines">' + lines.map(l => '<span>' + l + '</span>').join('') + '</span>' +
      '</label>';

    return '<main class="setup">' +
      '<form class="setup-form" id="setup-form" autocomplete="off">' +
        '<header class="setup-head"><p class="eyebrow">New game</p><h1>Charter your school</h1></header>' +
        '<div class="field">' +
          '<label for="setup-name">School name</label>' +
          '<div class="field-row"><input id="setup-name" data-setup="name" maxlength="48" required value="' + esc(s.name) + '">' +
          '<button type="button" class="btn btn-ghost" data-action="random-name">Random</button></div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="setup-mascot">Mascot</label>' +
          '<div class="field-row"><input id="setup-mascot" data-setup="mascot" maxlength="28" value="' + esc(s.mascot) + '">' +
          '<button type="button" class="btn btn-ghost" data-action="random-mascot">Random</button></div>' +
        '</div>' +
        '<fieldset class="field">' +
          '<legend>School colors</legend>' +
          '<div class="swatches">' + presets + '</div>' +
          '<div class="color-row">' +
            '<label for="setup-primary"><input type="color" id="setup-primary" data-setup="primary" value="' + s.primary + '"> Primary</label>' +
            '<label for="setup-secondary"><input type="color" id="setup-secondary" data-setup="secondary" value="' + s.secondary + '"> Secondary</label>' +
          '</div>' +
        '</fieldset>' +
        '<div class="field">' +
          '<label for="setup-state">Home state</label>' +
          '<select id="setup-state" data-setup="state">' + stateOpts + '</select>' +
          '<p class="hint">Students from your state are more likely to apply and enroll. Public schools charge them lower tuition.</p>' +
        '</div>' +
        '<fieldset class="field">' +
          '<legend>Type of school</legend>' +
          '<div class="type-cards">' +
            typeCard('public', 'Public university', ['$25M starting budget', 'In-state $11,000 · out-of-state $28,000', 'State funding every year', 'Prestige 35']) +
            typeCard('private', 'Private college', ['$40M starting budget', 'Tuition $42,000 for everyone', 'Larger alumni donations and aid budget', 'Prestige 45']) +
          '</div>' +
          '<p class="hint">Either way you can change in-state and out-of-state tuition, room and board, and financial aid once you’re running the school.</p>' +
        '</fieldset>' +
        '<div class="setup-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="to-menu">Back</button>' +
          '<button type="submit" class="btn btn-primary btn-lg">Open the admissions office</button>' +
        '</div>' +
      '</form>' +
      '<aside class="setup-preview" aria-label="Preview">' +
        '<p class="eyebrow">Preview</p>' +
        '<div id="setup-preview">' + setupPreview() + '</div>' +
      '</aside>' +
    '</main>';
  }

  function setupPreview() {
    const s = ui.setup;
    const st = G.stateByCode(s.state);
    return pennant(s.name || 'Your school', s.mascot, 'pennant-lg') +
      '<div class="preview-mast">' +
        '<div class="mast-name">' + esc(s.name || 'Your school') + '</div>' +
        '<div class="mast-sub">' + esc(s.mascot || 'Mascot') + ' · ' + typeLabel(s.type) + ' · ' + esc(st ? st.name : '') + '</div>' +
      '</div>';
  }

  // ---------- game shell ----------
  const TABS = [
    ['office', 'Office'],
    ['applications', 'Applications'],
    ['recruiting', 'Recruiting & staff'],
    ['majors', 'Majors'],
    ['classes', 'Classes'],
    ['students', 'Students'],
    ['housing', 'Housing'],
    ['greek', 'Greek life'],
    ['sports', 'Sports'],
    ['tuition', 'Tuition & aid']
  ];

  function renderGame() {
    const s = G.state;
    setSchoolColors(s.school.primary, s.school.secondary);
    const m = G.metrics();
    const visible = G.visibleApplicants();
    const pending = visible.filter(a => a.decision === 'pending').length;
    const cov = G.seatCoverage();
    const st = G.stateByCode(s.school.state);
    const counts = {
      applications: pending, majors: s.majors.length, classes: s.classes.length, students: s.students.length,
      housing: m.housing.beds, greek: s.greek.length, sports: s.sports.length
    };
    const renderers = {
      office: renderOffice, applications: renderApplications, recruiting: renderRecruiting, majors: renderMajors, classes: renderClasses,
      students: renderStudents, housing: renderHousing, greek: renderGreek, sports: renderSports, tuition: renderTuition
    };
    const body = renderers[ui.tab]();

    return '<div class="game">' +
      '<header class="masthead">' +
        '<div class="mast-inner">' +
          '<div class="mast-id">' +
            pennant(s.school.name, '', 'pennant-sm') +
            '<div class="mast-text"><div class="mast-name">' + esc(s.school.name) + '</div>' +
            '<div class="mast-sub">' + esc(s.school.mascot) + ' · ' + typeLabel(s.school.type) + ' · ' + esc(st ? st.name : s.school.state) + '</div></div>' +
          '</div>' +
          '<div class="mast-cycle"><span class="eyebrow">' + (isEarlyPhase() ? 'Early round' : 'Admissions cycle') + '</span><strong>' + s.year + ' · Class of ' + (s.year + 4) + '</strong></div>' +
          '<div class="mast-actions">' +
            (isEarlyPhase()
              ? '<button class="btn btn-stripe" data-action="release-early">Send early decisions</button>'
              : '<button class="btn btn-stripe" data-action="end-season">End season</button>') +
            '<button class="btn btn-on-school" data-action="to-menu">Menu</button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="statbar">' +
        stat('Budget', money(s.budget), s.budget < 0 ? 'bad' : '') +
        stat('Prestige', s.prestige.toFixed(1) + '<small>/100</small>') +
        stat('Students', num(s.students.length)) +
        stat(isEarlyPhase() ? 'Early files pending' : 'Files pending', num(pending) + '<small> of ' + num(visible.length) + '</small>') +
        stat('Campus life', Math.round(m.life.score) + '<small>/100</small>', m.life.score < 40 ? 'bad' : '') +
        stat('Seat coverage', pct(cov), cov < 1 ? 'bad' : '') +
      '</div>' +
      '<nav class="tabs" aria-label="Sections"><div class="tabs-inner" role="tablist">' +
        TABS.map(([id, label]) =>
          '<button role="tab" class="tab' + (ui.tab === id ? ' is-on' : '') + '" aria-selected="' + (ui.tab === id) + '" data-action="tab" data-tab="' + id + '">' +
          label + (counts[id] != null ? ' <span class="tab-count">' + num(counts[id]) + '</span>' : '') + '</button>').join('') +
      '</div></nav>' +
      '<main class="panel" id="panel">' +
        (G.saveOk ? '' : '<p class="note note-bad">Your browser’s storage is full, so the latest changes couldn’t be saved.</p>') +
        body +
      '</main>' +
    '</div>';
  }

  function stat(label, value, tone) {
    return '<div class="stat' + (tone ? ' tone-' + tone : '') + '"><span class="stat-label">' + label + '</span><span class="stat-value">' + value + '</span></div>';
  }

  // ---------- office ----------
  const expectedFreshmen = () => G.expectedFreshmen();

  function renderOffice() {
    const s = G.state;
    const m = G.metrics();
    const visible = G.visibleApplicants();
    const counts = { admit: 0, waitlist: 0, defer: 0, deny: 0, pending: 0 };
    for (const a of visible) counts[a.decision]++;
    const total = visible.length || 1;
    const keys = ['admit', isEarlyPhase() ? 'defer' : 'waitlist', 'deny', 'pending'];
    const expected = expectedFreshmen();
    const fin = G.finances();
    const yearNames = ['Freshmen', 'Sophomores', 'Juniors', 'Seniors'];
    const topMajors = Object.entries(m.majorCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const admits = s.applicants.filter(a => a.decision === 'admit');

    const cycle = '<section class="card span-2">' +
      '<div class="card-head"><h2>This cycle</h2><button class="btn btn-primary" data-action="tab" data-tab="applications">Review applications</button></div>' +
      (isEarlyPhase()
        ? '<p class="note">Early round: ' + plural(visible.length, 'student') + ' applied Early Decision or Early Action. Admit, defer or deny them, then send early decisions to open the regular round (' + num(s.applicants.length - visible.length) + ' more applicants).</p>'
        : '') +
      '<div class="decision-bar" role="img" aria-label="' + keys.map(k => counts[k] + ' ' + DECISION_LABEL[k].toLowerCase()).join(', ') + '">' +
        keys.map(k => counts[k] ? '<span class="seg seg-' + k + '" style="flex:' + counts[k] / total + '"></span>' : '').join('') +
      '</div>' +
      '<ul class="legend">' +
        keys.map(k => '<li><span class="dot dot-' + k + '"></span>' + DECISION_LABEL[k] + ' <b>' + num(counts[k]) + '</b></li>').join('') +
      '</ul>' +
      '<div class="kv-row">' +
        kv('Applicants', num(s.applicants.length)) +
        kv('Expected freshmen', Math.round(expected) + ' <small>of ' + num(s.targetClass) + ' target</small>') +
        kv('Acceptance rate so far', pct(counts.admit / total)) +
      '</div>' +
      '<div class="split-grid">' +
        genderSplit(demographics(s.applicants), 'Applicant pool') +
        residencySplit(demographics(s.applicants), '&nbsp;') +
        (admits.length
          ? genderSplit(demographics(admits, G.enrollChance), 'Projected class') + residencySplit(demographics(admits, G.enrollChance), '&nbsp;')
          : '') +
      '</div>' +
      (expected < s.targetClass * 0.8 && counts.pending
        ? '<p class="note">You’re on pace for a small class. Students on the waitlist are offered seats if the class comes in under target.</p>' : '') +
    '</section>';

    const policy = '<section class="card">' +
      '<div class="card-head"><h2>Policy</h2><button class="btn btn-ghost btn-small" data-action="tab" data-tab="tuition">Tuition & aid</button></div>' +
      '<div class="fields">' +
        numField('target-class', 'Target class size', s.targetClass, 10, 100000, 5, 'targetClass') +
      '</div>' +
      '<p class="hint">The target class size decides how many waitlisted students get offered a seat. Make sure you have dorm beds and class seats for them.</p>' +
      '<fieldset class="field field-gap"><legend>Early programs <span class="muted small">(take effect next cycle)</span></legend>' +
        checkField('early-ed', 'Early Decision', s.early.ed, 'early.ed', 'Binding. Admits must enroll unless their aid falls short. Draws families who can pay.') +
        checkField('early-ea', 'Early Action', s.early.ea, 'early.ea', 'Non-binding, but early admits are more likely to say yes. Draws more applicants.') +
      '</fieldset>' +
    '</section>';

    const out = G.applicantOutlook();
    const outlook = '<section class="card">' +
      '<div class="card-head"><h2>Applicant interest</h2><span class="muted small">Next cycle</span></div>' +
      '<div class="kv-row">' + kv('Projected applications', '~' + num(out.total)) + kv('This cycle', num(s.applicants.length)) + '</div>' +
      '<table class="ledger"><tbody>' +
        out.factors.map(f => '<tr><td>' + f.label + '</td><td class="num ' + (f.mult > 1.005 ? 'tone-good' : f.mult < 0.995 ? 'tone-bad' : '') + '">×' + f.mult.toFixed(2) + '</td></tr>').join('') +
      '</tbody></table>' +
      '<p class="hint">There’s no cap. Raise prestige, open majors, liven up campus and keep the net price reasonable, and the pool keeps growing.</p>' +
    '</section>';

    const finLines = (lines) => lines.map(l => '<tr><td>' + l.label + '</td><td class="num">' + money(l.amount) + '</td></tr>').join('');
    const finance = '<section class="card">' +
      '<div class="card-head"><h2>Budget projection</h2><span class="muted small">Next year, current campus</span></div>' +
      '<table class="ledger"><tbody>' +
        '<tr class="ledger-sec"><th colspan="2">Revenue</th></tr>' + finLines(fin.revenue) +
        '<tr class="ledger-sec"><th colspan="2">Expenses</th></tr>' + finLines(fin.expenses) +
        '<tr class="ledger-total"><td>Net</td><td class="num ' + (fin.net < 0 ? 'tone-bad' : 'tone-good') + '">' + (fin.net >= 0 ? '+' : '') + money(fin.net) + '</td></tr>' +
      '</tbody></table>' +
    '</section>';

    const enrollment = '<section class="card">' +
      '<div class="card-head"><h2>Student body</h2><button class="btn btn-ghost btn-small" data-action="tab" data-tab="students">Details</button></div>' +
      '<div class="kv-row">' + m.byYear.map((n, i) => kv(yearNames[i], num(n))).join('') + '</div>' +
      '<div class="split-grid">' + genderSplit(demographics(s.students)) + residencySplit(demographics(s.students)) + '</div>' +
      '<h3 class="sub">Largest majors</h3>' +
      bars(topMajors.map(([id, n]) => [majorName(id), n])) +
    '</section>';

    const history = '<section class="card span-2">' +
      '<div class="card-head"><h2>History</h2></div>' +
      (s.history.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>Cycle</th><th class="num">Applied</th><th class="num">Accept rate</th><th class="num">Yield</th><th class="num">Freshmen</th><th class="num">Women</th><th class="num">In-state</th><th class="num">Avg GPA</th><th class="num">Grad rate</th><th class="num">Grads earn</th><th class="num">Students</th><th class="num">Campus life</th><th class="num">Prestige</th><th class="num">Net</th><th class="num">Budget</th></tr></thead><tbody>' +
          s.history.slice().reverse().map(h => '<tr><td>' + h.year + '</td><td class="num">' + num(h.applied) + '</td><td class="num">' + pct(h.acceptRate) + '</td><td class="num">' + pct(h.yieldRate) + '</td><td class="num">' + num(h.enrolled) + '</td>' +
            '<td class="num">' + (h.femalePct != null ? pct(h.femalePct) : '—') + '</td><td class="num">' + (h.inStatePct != null ? pct(h.inStatePct) : '—') + '</td>' +
            '<td class="num">' + (h.avgGpa != null ? h.avgGpa.toFixed(2) : '—') + '</td>' +
            '<td class="num">' + (h.gradRate != null ? pct(h.gradRate) : '—') + '</td><td class="num">' + (h.salary ? money(h.salary) : '—') + '</td><td class="num">' + num(h.students) + '</td><td class="num">' + (h.life != null ? Math.round(h.life) : '—') + '</td><td class="num">' + h.prestige.toFixed(1) + '</td><td class="num ' + (h.net < 0 ? 'tone-bad' : '') + '">' + money(h.net) + '</td><td class="num">' + money(h.budget) + '</td></tr>').join('') +
          '</tbody></table></div>'
        : '<p class="muted">Your first cycle is underway. Results show up here after you end the season.</p>') +
    '</section>';

    const news = '<section class="card">' +
      '<div class="card-head"><h2>Campus news</h2></div>' +
      '<ul class="news">' + s.news.slice(0, 14).map(n => '<li><span class="news-year">' + n.year + '</span><span>' + esc(n.text) + '</span></li>').join('') + '</ul>' +
    '</section>';

    return '<div class="grid">' + cycle +
      '<div class="col">' + policy + outlook + enrollment + '</div>' +
      '<div class="col">' + finance + news + '</div>' +
      history + '</div>';
  }

  // ---------- applications ----------
  const VIEWS = [
    ['all', 'Everyone', () => true],
    ['instate', 'In-state', a => isInState(a)],
    ['outstate', 'Out-of-state', a => !a.intl && !isInState(a)],
    ['intl', 'International', a => a.intl],
    ['women', 'Women', a => a.gender === 'F'],
    ['men', 'Men', a => a.gender === 'M'],
    ['athletes', 'Recruited athletes', a => !!a.sport],
    ['standouts', 'Standouts', a => !!a.hook],
    ['legacy', 'Legacies', a => a.legacy],
    ['firstgen', 'First-generation', a => a.firstGen],
    ['needaid', 'Can’t afford the net price', a => G.aidPackage(a).gap > 0],
    ['greek', 'Want to go Greek', a => a.greekInt],
    ['early', 'Applied early (ED or EA)', a => G.isEarly(a)],
    ['ed', 'Early Decision', a => a.round === 'ED'],
    ['deferred', 'Deferred from early round', a => a.deferred],
    ['flagged', 'Flagged by staff', a => a.flagged]
  ];

  // Applicants in the current view and search, any decision.
  function viewList() {
    const s = G.state;
    const q = ui.search.trim().toLowerCase();
    const v = VIEWS.find(x => x[0] === ui.view) || VIEWS[0];
    let list = G.visibleApplicants().filter(v[2]);
    if (q) {
      list = list.filter(a => (a.name + ' ' + hometown(a) + ' ' + majorName(a.major) + ' ' + (a.sport ? G.sportById(a.sport).name : '') + ' ' + (a.hook ? hookLabel(a.hook) : '')).toLowerCase().includes(q));
    }
    return list;
  }

  function currentList() {
    let list = viewList().filter(a => ui.filter === 'all' || a.decision === ui.filter);
    const k = ui.sort.key, dir = ui.sort.dir;
    const val = {
      name: a => a.name.split(' ').slice(-1)[0] + a.name,
      gpa: a => a.gpa, wgpa: a => a.wgpa, aps: a => a.aps.length, test: testSortValue, idx: a => a.idx,
      major: a => majorName(a.major), sport: a => (a.sport ? a.stars * 100 + G.sportById(a.sport).name.charCodeAt(0) : -1),
      aid: a => G.aidPackage(a).total, yield: a => G.enrollChance(a), decision: a => a.decision
    }[k];
    // Compute each sort key once; pools run to the thousands.
    return list.map(a => [val(a), a]).sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0) * dir).map(x => x[1]);
  }

  function renderApplications() {
    const s = G.state;
    const inView = viewList();
    const counts = { all: inView.length, pending: 0, admit: 0, waitlist: 0, defer: 0, deny: 0 };
    for (const a of inView) counts[a.decision]++;
    const hold = isEarlyPhase() ? ['defer', 'Deferred'] : ['waitlist', 'Waitlisted'];
    if (ui.filter === 'defer' && !isEarlyPhase()) ui.filter = 'waitlist';
    if (ui.filter === 'waitlist' && isEarlyPhase()) ui.filter = 'defer';
    const filters = [['pending', 'Pending'], ['admit', 'Admitted'], hold, ['deny', 'Denied'], ['all', 'All']];
    const staffLeft = G.staffRemaining();
    const staffBtn = '<button class="btn btn-small btn-primary" data-action="staff-read"' + (staffLeft && counts.pending ? '' : ' disabled') + '>Have staff read pending files</button>' +
      ' <span class="muted small">' + num(staffLeft) + ' reads left this cycle · <button class="linkish" data-action="tab" data-tab="recruiting">rules</button></span>';
    const expected = expectedFreshmen();
    const admits = s.applicants.filter(a => a.decision === 'admit');
    const proj = demographics(admits, G.enrollChance);

    return '<div class="apps">' +
      (isEarlyPhase()
        ? '<div class="phase-banner"><div><b>Early round.</b> ' + plural(inView.length, 'file') + ' from Early Decision and Early Action applicants. Early Decision admits are binding. Defer anyone you want to see again with the regular pool.</div>' +
          '<button class="btn btn-stripe btn-small" data-action="release-early">Send early decisions</button></div>'
        : (s.earlyReport ? '<div class="phase-banner"><div><b>Regular round.</b> Early decisions are out: ' + plural(s.earlyReport.committed, 'student') + ' committed through Early Decision, ' + num(s.earlyReport.eaAdmitted) + ' admitted Early Action, ' + num(s.earlyReport.deferred) + ' deferred into this pool.</div></div>' : '')) +
      '<div class="apps-toolbar">' +
        '<div class="chips" role="group" aria-label="Filter by decision">' +
          filters.map(([id, label]) => '<button class="chip-btn' + (ui.filter === id ? ' is-on' : '') + '" data-action="filter" data-filter="' + id + '" aria-pressed="' + (ui.filter === id) + '">' + label + ' <b>' + num(counts[id]) + '</b></button>').join('') +
        '</div>' +
        '<div class="apps-find">' +
          '<label class="sr-only" for="app-view">Show</label>' +
          '<select id="app-view" data-ui-select="view" class="select-view">' +
            VIEWS.map(([id, label]) => '<option value="' + id + '"' + (ui.view === id ? ' selected' : '') + '>' + label + '</option>').join('') +
          '</select>' +
          '<input type="search" id="app-search" class="search" placeholder="Search name, town, major, sport" value="' + esc(ui.search) + '" aria-label="Search applications">' +
        '</div>' +
      '</div>' +
      '<div class="apps-bulk">' +
        '<p class="bulk-scope">Bulk actions apply to the <b>' + num(counts.pending) + '</b> pending files in this view.</p>' +
        '<div class="bulk bulk-staff">' + staffBtn + '</div>' +
        '<div class="bulk"><label for="bulk-admit">Admit with Academic Index at least</label>' +
          '<input type="number" id="bulk-admit" data-ui="bulkAdmit" value="' + ui.bulkAdmit + '" min="0" max="100">' +
          '<button class="btn btn-small btn-admit" data-action="bulk-admit">Admit</button></div>' +
        '<div class="bulk"><label for="bulk-top">Admit the top</label>' +
          '<input type="number" id="bulk-top" data-ui="bulkTop" value="' + ui.bulkTop + '" min="1" max="100000">' +
          '<span>by index</span><button class="btn btn-small btn-admit" data-action="bulk-top">Admit</button></div>' +
        '<div class="bulk"><label for="bulk-wait">' + holdWord() + ' with index at least</label>' +
          '<input type="number" id="bulk-wait" data-ui="bulkWait" value="' + ui.bulkWait + '" min="0" max="100">' +
          '<button class="btn btn-small btn-wait" data-action="bulk-wait">' + holdWord() + '</button>' +
          '<button class="btn btn-small btn-ghost" data-action="bulk-wait-rest">' + holdWord() + ' all the rest</button></div>' +
        '<div class="bulk"><label for="bulk-deny">Deny below</label>' +
          '<input type="number" id="bulk-deny" data-ui="bulkDeny" value="' + ui.bulkDeny + '" min="0" max="100">' +
          '<button class="btn btn-small btn-deny" data-action="bulk-deny">Deny</button></div>' +
        '<div class="bulk-summary">Expected freshmen <b>' + Math.round(expected) + '</b> of ' + num(s.targetClass) + ' target' +
          (admits.length ? ' · <b>' + pct(proj.f / proj.n) + '</b> women · <b>' + pct(proj.inS / proj.n) + '</b> in-state' : '') + '</div>' +
      '</div>' +
      '<div id="app-table">' + renderAppTable() + '</div>' +
    '</div>';
  }

  function renderAppTable() {
    const all = currentList();
    if (!all.length) {
      return '<div class="empty"><p>No applications match.</p>' +
        (ui.filter === 'pending' && ui.view === 'all' && !ui.search ? '<p class="muted">Every file has a decision. ' + (isEarlyPhase() ? 'Send early decisions to open the regular round.' : 'End the season from the top bar when you’re ready.') + '</p>' : '') + '</div>';
    }
    const pages = Math.ceil(all.length / PAGE_SIZE);
    ui.page = Math.min(ui.page, pages - 1);
    const list = all.slice(ui.page * PAGE_SIZE, (ui.page + 1) * PAGE_SIZE);
    const cols = [
      ['name', 'Applicant'], ['gpa', 'GPA', 'num'], ['wgpa', 'Weighted', 'num'], ['aps', 'APs', 'num'],
      ['test', 'Test', 'num'], ['idx', 'Index', 'num'], ['major', 'Intended major'], ['sport', 'Sport'],
      ['aid', 'Aid / yr', 'num'], ['yield', 'Enroll chance'], ['decision', 'Decision']
    ];
    const head = cols.map(([k, label, cls]) => {
      const on = ui.sort.key === k;
      const arrow = on ? (ui.sort.dir < 0 ? ' ↓' : ' ↑') : '';
      return '<th class="' + (cls || '') + '" aria-sort="' + (on ? (ui.sort.dir < 0 ? 'descending' : 'ascending') : 'none') + '"><button class="th-btn" data-action="sort" data-key="' + k + '">' + label + arrow + '</button></th>';
    }).join('');
    const s = G.state;
    const rows = list.map(a => {
      const p = G.enrollChance(a);
      const sp = a.sport ? G.sportById(a.sport) : null;
      const aid = G.aidPackage(a);
      const tags = [];
      if (a.hook) tags.push('<span class="tag ' + (a.hook === 'trouble' ? 'tag-bad' : 'tag-star') + '">' + (a.hook === 'trouble' ? 'Record' : '★ Standout') + '</span>');
      if (a.legacy) tags.push('<span class="tag">Legacy</span>');
      if (a.firstGen) tags.push('<span class="tag">First-gen</span>');
      if (a.round === 'ED' || a.round === 'EA') tags.push('<span class="tag tag-round" title="' + ROUND_LABEL[a.round] + '">' + a.round + '</span>');
      if (a.deferred) tags.push('<span class="tag">Deferred</span>');
      if (a.flagged) tags.push('<span class="tag tag-flag" title="Your staff left this file for you">Flagged</span>');
      const locked = G.isLocked(a);
      return '<tr class="row' + (ui.openId === a.id ? ' is-open' : '') + '" data-action="open-app" data-id="' + a.id + '" tabindex="0">' +
        '<td><div class="cell-name">' + esc(a.name) + ' ' + tags.join(' ') + '</div><div class="cell-sub">' + esc(hometown(a)) + ' · ' + residencyWord(a) + ' · ' + a.gender + '</div></td>' +
        '<td class="num">' + a.gpa.toFixed(2) + '</td>' +
        '<td class="num">' + a.wgpa.toFixed(2) + '</td>' +
        '<td class="num">' + a.aps.length + '</td>' +
        '<td class="num nowrap">' + testLabel(a) + '</td>' +
        '<td class="num"><span class="idx">' + a.idx + '</span></td>' +
        '<td>' + esc(majorName(a.major)) + (s.majors.includes(a.major) ? '' : ' <span class="tag tag-bad">Not offered</span>') + '</td>' +
        '<td>' + (sp ? esc(sp.name) + ' <span class="stars" aria-label="' + a.stars + ' of 5 stars">' + stars(a.stars) + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="num">' + (aid.total ? money(aid.total) : '<span class="muted">—</span>') + (aid.gap > 0 ? ' <span class="tag tag-bad" title="Family is short of the net price">Gap</span>' : '') + '</td>' +
        '<td><span class="pill tone-' + yieldTone(p) + '">' + yieldWord(p) + ' ' + pct(p) + '</span></td>' +
        '<td>' + (a.decision === 'pending' && !locked
          ? '<span class="quick" role="group" aria-label="Decide ' + esc(a.name) + '">' +
              '<button class="qbtn q-admit" data-action="row-decide" data-id="' + a.id + '" data-d="admit" title="Admit" aria-label="Admit ' + esc(a.name) + '">A</button>' +
              '<button class="qbtn q-wait" data-action="row-decide" data-id="' + a.id + '" data-d="waitlist" title="' + holdWord() + '" aria-label="' + holdWord() + ' ' + esc(a.name) + '">' + (isEarlyPhase() ? 'F' : 'W') + '</button>' +
              '<button class="qbtn q-deny" data-action="row-decide" data-id="' + a.id + '" data-d="deny" title="Deny" aria-label="Deny ' + esc(a.name) + '">D</button>' +
            '</span>'
          : '<span class="decision decision-' + a.decision + '">' + (a.committed ? 'Committed' : DECISION_LABEL[a.decision]) + '</span>' + (locked ? ' <span class="muted small" title="Decided in the early round">' + a.round + '</span>' : '')) + '</td>' +
      '</tr>';
    }).join('');
    const pager = pages > 1
      ? '<div class="pager"><button class="btn btn-ghost btn-small" data-action="page" data-d="-1"' + (ui.page <= 0 ? ' disabled' : '') + '>← Previous</button>' +
        '<span class="muted small">' + num(ui.page * PAGE_SIZE + 1) + '–' + num(ui.page * PAGE_SIZE + list.length) + ' of ' + num(all.length) + '</span>' +
        '<button class="btn btn-ghost btn-small" data-action="page" data-d="1"' + (ui.page >= pages - 1 ? ' disabled' : '') + '>Next →</button></div>'
      : '';
    return '<div class="table-wrap"><table class="table table-apps"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + pager;
  }

  // ---------- application folder (drawer) ----------
  function renderDrawer() {
    if (ui.screen !== 'game' || ui.openId == null) { drawerRoot.innerHTML = ''; return; }
    const s = G.state;
    const a = s.applicants.find(x => x.id === ui.openId);
    if (!a) { ui.openId = null; drawerRoot.innerHTML = ''; return; }
    const p = G.enrollChance(a);
    const pos = ui.navIds.indexOf(a.id);
    const sp = a.sport ? G.sportById(a.sport) : null;
    const aps = a.aps.slice().sort((x, y) => (y.score || 0) - (x.score || 0));
    const apsLeft = a.aps.filter(x => !x.score).length;
    const factors = G.enrollFactors(a);
    const pkg = G.aidPackage(a);
    const hook = a.hook ? D.HOOKS[a.hook] : null;
    const tuition = G.tuitionFor(a);
    const scholOpts = [[0, 'None'], [5000, '$5K'], [10000, '$10K'], [20000, '$20K'], [tuition, 'Full tuition']];
    const actTag = name => { const t = D.ACTIVITIES.find(x => x[0] === name); return t ? D.LIFE_TAGS[t[1]] : ''; };
    const line = (label, value, cls) => '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td class="num">' + value + '</td></tr>';

    drawerRoot.innerHTML =
      '<div class="scrim" data-action="close-app"></div>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="folder-name" tabindex="-1">' +
        '<div class="drawer-nav">' +
          '<button class="btn btn-ghost btn-small" data-action="prev-app"' + (pos <= 0 ? ' disabled' : '') + '>← Prev</button>' +
          '<span class="muted small">' + (pos >= 0 ? num(pos + 1) + ' of ' + num(ui.navIds.length) : '') + '</span>' +
          '<button class="btn btn-ghost btn-small" data-action="next-app"' + (pos < 0 || pos >= ui.navIds.length - 1 ? ' disabled' : '') + '>Next →</button>' +
          '<button class="btn btn-ghost btn-small drawer-close" data-action="close-app" aria-label="Close file">Close</button>' +
        '</div>' +
        '<div class="drawer-body"><div class="folder folder-full">' +
          '<div class="folder-tab">Application № ' + String(a.id).padStart(4, '0') + '</div>' +
          '<header class="folder-head">' +
            '<h2 id="folder-name">' + esc(a.name) + '</h2>' +
            '<p class="folder-from">' + esc(hometown(a)) + ' · ' + residencyWord(a) + ' · ' + genderWord(a.gender) + '</p>' +
            '<p class="folder-round">' + ROUND_LABEL[a.round || 'RD'] + (a.deferred ? ' · deferred to the regular round' : '') + (a.committed ? ' · <b>committed</b>' : '') + (a.flagged ? ' · flagged for you by staff' : '') + '</p>' +
          '</header>' +
          (hook
            ? '<section class="folder-sec standout' + (a.hook === 'trouble' ? ' standout-bad' : '') + '"><h3>' + (a.hook === 'trouble' ? 'Flag' : '★ Standout') + '</h3><p><b>' + esc(hook.label) + '.</b> ' + esc(hook.blurb) + '</p></section>'
            : '') +
          '<dl class="folder-grid">' +
            '<div><dt>GPA</dt><dd>' + a.gpa.toFixed(2) + '<small>/4.0</small></dd></div>' +
            '<div><dt>Weighted GPA</dt><dd>' + a.wgpa.toFixed(2) + '<small>/5.0</small></dd></div>' +
            '<div><dt>' + (a.sat ? 'SAT' : a.act ? 'ACT' : 'Test') + '</dt><dd>' + (a.sat ? a.sat + '<small>/1600</small>' : a.act ? a.act + '<small>/36</small>' : '<span class="dd-text">Optional</span>') + '</dd></div>' +
            '<div><dt>Academic Index</dt><dd>' + a.idx + '<small>/100</small></dd></div>' +
          '</dl>' +
          '<section class="folder-sec">' +
            '<h3>AP classes <span class="muted">(' + (a.aps.length - apsLeft) + ' finished' + (apsLeft ? ', ' + apsLeft + ' this year' : '') + ')</span></h3>' +
            (aps.length
              ? '<ul class="ap-list">' + aps.map(x => '<li><span>AP ' + esc(x.name) + '</span>' +
                  (x.score ? '<span class="ap-score ap-' + x.score + '" title="AP exam score">' + x.score + '</span>' : '<span class="ap-pending" title="Senior-year class; the exam is in May">In progress</span>') + '</li>').join('') + '</ul>'
              : '<p class="muted">No AP classes taken.</p>') +
            (a.honors != null
              ? '<p class="hint">Also ' + plural(a.honors, 'honors class', 'honors classes') + '. Weighted GPA adds 1.0 for each finished AP and 0.5 for each honors class across 21 classes in grades 9–11: ' +
                a.gpa.toFixed(2) + ' + (' + (a.aps.length - apsLeft) + ' + ' + a.honors + ' × 0.5) ÷ 21 = ' + a.wgpa.toFixed(2) + '.</p>'
              : '') +
          '</section>' +
          '<section class="folder-sec folder-two">' +
            '<div><h3>Intended major</h3><p>' + esc(majorName(a.major)) + ' ' + (s.majors.includes(a.major) ? '<span class="tag tag-good">Offered</span>' : '<span class="tag tag-bad">Not offered</span>') + '</p></div>' +
            '<div><h3>Athletics</h3><p>' + (sp ? esc(sp.name) + ' <span class="stars">' + stars(a.stars) + '</span> ' + (s.sports.includes(a.sport) ? '<span class="tag tag-good">Team</span>' : '<span class="tag tag-bad">No team</span>') : 'Not a recruit') + '</p></div>' +
          '</section>' +
          '<section class="folder-sec">' +
            '<h3>Activities <span class="muted">· what they’d bring to campus</span></h3><ul class="acts">' +
              a.activities.map(x => '<li>' + esc(x) + ' <span class="muted">· ' + esc(actTag(x)) + '</span></li>').join('') +
              (a.greekInt ? '<li>Interested in joining a ' + (a.gender === 'F' ? 'sorority' : 'fraternity') + '</li>' : '') +
            '</ul>' +
          '</section>' +
          '<section class="folder-sec">' +
            '<h3>Family & finances</h3>' +
            '<p class="small">Family income ' + esc(D.INCOME[a.income].label) + (a.firstGen ? ' · <b>First-generation</b> college student' : '') + (a.legacy ? ' · <b>Legacy</b>' : '') + '</p>' +
            '<table class="ledger ledger-folder"><tbody>' +
              line('Tuition (' + residencyWord(a).toLowerCase() + ')', dollars(tuition)) +
              line('Room & board', dollars(s.roomBoard)) +
              line('Cost of attendance', dollars(pkg.coa), 'ledger-sub') +
              (pkg.merit ? line('Merit scholarship', '−' + dollars(pkg.merit)) : '') +
              (pkg.scholarship ? line('Your scholarship offer', '−' + dollars(pkg.scholarship)) : '') +
              (pkg.needGrant ? line('Need-based grant', '−' + dollars(pkg.needGrant)) : '') +
              line('Net price', dollars(pkg.net), 'ledger-sub') +
              line('Family can pay', dollars(a.efc)) +
              line(pkg.gap > 0 ? 'Shortfall' : 'Affordable', pkg.gap > 0 ? '<span class="tone-bad">' + dollars(pkg.gap) + '</span>' : '<span class="tone-good">Yes</span>') +
            '</tbody></table>' +
            '<div class="schol" role="group" aria-label="Scholarship offer"><span class="small">Offer a scholarship (per year):</span>' +
              scholOpts.map(([amt, label]) => '<button class="chip-btn' + ((a.scholarship || 0) === amt ? ' is-on' : '') + '" data-action="scholarship" data-amt="' + amt + '">' + label + '</button>').join('') +
            '</div>' +
          '</section>' +
          '<section class="folder-sec">' +
            '<h3>Enroll chance if admitted <span class="pill tone-' + yieldTone(p) + '">' + yieldWord(p) + ' ' + pct(p) + '</span></h3>' +
            '<ul class="factors">' + factors.map(f => '<li class="f-' + f.tone + '">' + esc(f.text) + '</li>').join('') + '</ul>' +
          '</section>' +
          (a.decision !== 'pending'
            ? '<div class="stamp stamp-' + a.decision + (ui.stampAnim ? ' stamp-in' : ' stamp-static') + '">' + STAMP_LABEL[a.decision] + '</div>' : '') +
        '</div></div>' +
        '<div class="drawer-actions">' +
          (G.isLocked(a)
            ? '<p class="small muted">Decided in the early round' + (a.committed ? ': this student is committed' : '') + '. Early decisions can’t be changed.</p>'
            : '<button class="btn btn-admit" data-action="decide" data-d="admit"' + (a.decision === 'admit' ? ' aria-pressed="true"' : '') + '><kbd>A</kbd> Admit</button>' +
              '<button class="btn btn-wait" data-action="decide" data-d="waitlist"' + (a.decision === 'waitlist' || a.decision === 'defer' ? ' aria-pressed="true"' : '') + '><kbd>W</kbd> ' + holdWord() + '</button>' +
              '<button class="btn btn-deny" data-action="decide" data-d="deny"' + (a.decision === 'deny' ? ' aria-pressed="true"' : '') + '><kbd>D</kbd> Deny</button>' +
              (a.decision !== 'pending' ? '<button class="btn btn-ghost btn-small" data-action="decide" data-d="pending">Undo</button>' : '')) +
          '<label class="toggle" for="auto-advance"><input type="checkbox" id="auto-advance" data-ui-check="autoAdvance"' + (ui.autoAdvance ? ' checked' : '') + '> Next file after stamping</label>' +
        '</div>' +
      '</aside>';
    ui.stampAnim = false;
  }

  function openApp(id, refreshNav) {
    clearTimeout(ui.advanceTimer);
    if (refreshNav || !ui.navIds.includes(id)) ui.navIds = currentList().map(a => a.id);
    const keepScroll = ui.openId === id;
    const body = drawerRoot.querySelector('.drawer-body');
    const top = keepScroll && body ? body.scrollTop : 0;
    ui.openId = id;
    renderDrawer();
    refreshAppTable();
    const d = drawerRoot.querySelector('.drawer');
    if (d) d.focus({ preventScroll: true });
    if (keepScroll) { const b = drawerRoot.querySelector('.drawer-body'); if (b) b.scrollTop = top; }
  }
  function closeApp() {
    clearTimeout(ui.advanceTimer);
    ui.openId = null;
    renderDrawer();
    render();
  }
  function stepApp(delta) {
    const pos = ui.navIds.indexOf(ui.openId);
    const next = ui.navIds[pos + delta];
    if (next != null) openApp(next);
  }

  function decide(d) {
    const s = G.state;
    const a = s.applicants.find(x => x.id === ui.openId);
    if (!a) return;
    const wasPending = a.decision === 'pending';
    if (!G.setDecision(a, d)) return;
    d = a.decision;
    G.save();
    ui.stampAnim = d !== 'pending';
    renderDrawer();
    refreshAppTable();
    refreshStatbar();
    if (ui.autoAdvance && wasPending && d !== 'pending') {
      const pos = ui.navIds.indexOf(a.id);
      const next = ui.navIds.slice(pos + 1).find(id => {
        const x = s.applicants.find(y => y.id === id);
        return x && x.decision === 'pending';
      });
      if (next != null) {
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        ui.advanceTimer = setTimeout(() => { if (ui.openId === a.id) openApp(next); }, reduce ? 250 : 650);
      }
    }
  }

  function refreshAppTable() {
    const el = document.getElementById('app-table');
    if (el) el.innerHTML = renderAppTable();
  }
  function refreshStatbar() {
    if (ui.tab === 'applications') {
      // Counts in the filter chips, tabs and stat bar all change; re-render the shell but keep the search box.
      const search = document.getElementById('app-search');
      const hadFocus = search && document.activeElement === search;
      render();
      if (hadFocus) { const n = document.getElementById('app-search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    } else {
      render();
    }
  }

  // ---------- recruiting & staff ----------
  function renderRecruiting() {
    const s = G.state;
    const st = s.staff, r = st.rules, rec = s.recruit;
    const cap = G.staffCapacity();
    const mix = G.residencyMix();
    const countries = Array.from(new Set(D.INTERNATIONAL.map(x => x[1]))).sort();
    const campaignCost = rec.states.length * D.RECRUITING.stateCost + rec.countries.length * D.RECRUITING.countryCost;
    const appsByState = {}, appsByCountry = {};
    for (const a of s.applicants) {
      if (a.intl) appsByCountry[a.region] = (appsByCountry[a.region] || 0) + 1;
      else if (a.stateCode) appsByState[a.stateCode] = (appsByState[a.stateCode] || 0) + 1;
    }

    const staff = '<section class="card">' +
      '<div class="card-head"><h2>Admissions staff</h2><span class="muted small">' + money(D.STAFF.readerCost) + ' per reader per year</span></div>' +
      '<div class="readers">' +
        '<button class="btn btn-ghost" data-action="readers" data-d="-1"' + (st.readers ? '' : ' disabled') + ' aria-label="Let a reader go">−</button>' +
        '<div class="kv"><span class="kv-label">Readers</span><span class="kv-value">' + num(st.readers) + '</span></div>' +
        '<button class="btn btn-ghost" data-action="readers" data-d="1" aria-label="Hire a reader">+</button>' +
        '<button class="btn btn-ghost btn-small" data-action="readers" data-d="10">+10</button>' +
        '<div class="kv"><span class="kv-label">Files they can read per cycle</span><span class="kv-value">' + num(cap) + '</span></div>' +
        '<div class="kv"><span class="kv-label">Read this cycle</span><span class="kv-value">' + num(st.used) + ' <small>of ' + num(cap) + '</small></span></div>' +
      '</div>' +
      '<p class="hint">Each reader handles ' + num(D.STAFF.filesPerReader) + ' files a cycle. Send them to work from Applications, or let them read what’s left at the end of the season. Last cycle drew ' + num(s.history.length ? s.history[s.history.length - 1].applied : s.applicants.length) + ' applications.</p>' +
      '<h3 class="sub">Reader rules</h3>' +
      '<div class="fields">' +
        numField('rule-admit', 'Admit with index at least', r.admit, 0, 100, 1, 'staff.rules.admit') +
        numField('rule-wait', 'Waitlist / defer at least', r.wait, 0, 100, 1, 'staff.rules.wait') +
        numField('rule-stars', 'Admit recruits rated at least (★)', r.athleteStars, 1, 6, 1, 'staff.rules.athleteStars') +
        selectField('rule-standouts', 'Standouts', r.standouts, 'staff.rules.standouts', [['flag', 'Flag them for me'], ['admit', 'Admit them']]) +
        selectField('rule-records', 'Disciplinary records', r.records, 'staff.rules.records', [['deny', 'Deny'], ['flag', 'Flag them for me']]) +
      '</div>' +
      '<div class="checks">' +
        checkField('rule-stop', 'Stop admitting once the class is full', r.stopAtTarget, 'staff.rules.stopAtTarget', 'When expected freshmen pass the target, readers waitlist (or defer) instead of admitting.') +
        checkField('rule-auto', 'Read leftover files at the end of the season', st.autoRead, 'staff.autoRead', 'Otherwise pending files are denied unread.') +
      '</div>' +
      '<p class="hint">Recruits only count if you have their team (set the star rule to 6 to turn it off). Flagged files stay pending, tagged for you to read yourself.</p>' +
    '</section>';

    const budget = '<section class="card">' +
      '<div class="card-head"><h2>Recruiting budget</h2><span class="muted small">' + money(rec.marketing + rec.athletics + campaignCost) + ' a year</span></div>' +
      '<div class="fields">' +
        numField('rec-marketing', 'Marketing & ads ($/yr)', rec.marketing, 0, 100000000, 50000, 'recruit.marketing') +
        numField('rec-athletics', 'Athletic recruiting ($/yr)', rec.athletics, 0, 20000000, 50000, 'recruit.athletics') +
      '</div>' +
      '<div class="kv-row">' +
        kv('Marketing lift', '×' + (1 + 0.12 * Math.log2(1 + rec.marketing / 200000)).toFixed(2)) +
        kv('Campaign lift', '×' + mix.campaign.toFixed(2)) +
        kv('International share', pct(mix.intlRate) + ' <small>of out-of-state</small>') +
      '</div>' +
      '<p class="hint">Marketing raises applications everywhere with diminishing returns but no cap. Athletic recruiting brings more recruits and better star ratings, up to about ' + money(2000000) + '. Changes shape next cycle’s pool.</p>' +
    '</section>';

    const stateChips = D.STATES.map(x => {
      const on = rec.states.includes(x.code);
      return '<button class="chip-btn camp' + (on ? ' is-on' : '') + '" data-action="campaign" data-kind="states" data-id="' + x.code + '" aria-pressed="' + on + '" title="' + esc(x.name) + '">' +
        x.code + ' <b>' + num(appsByState[x.code] || 0) + '</b></button>';
    }).join('');
    const countryChips = countries.map(c => {
      const on = rec.countries.includes(c);
      return '<button class="chip-btn camp' + (on ? ' is-on' : '') + '" data-action="campaign" data-kind="countries" data-id="' + esc(c) + '" aria-pressed="' + on + '">' +
        esc(c) + ' <b>' + num(appsByCountry[c] || 0) + '</b></button>';
    }).join('');
    const campaigns = '<section class="card span-2">' +
      '<div class="card-head"><h2>Recruiting campaigns</h2><span class="muted small">' + plural(rec.states.length, 'state') + ' · ' + plural(rec.countries.length, 'country', 'countries') + ' · ' + money(campaignCost) + ' a year</span></div>' +
      '<p class="hint">Send recruiters to high school fairs. A state campaign (' + money(D.RECRUITING.stateCost) + '/yr) triples applications from that state; targeting your home state raises your in-state share. A country campaign (' + money(D.RECRUITING.countryCost) + '/yr) quadruples applicants from there and grows your international share. Numbers show this cycle’s applicants.</p>' +
      '<h3 class="sub">States</h3><div class="chips camp-grid">' + stateChips + '</div>' +
      '<h3 class="sub">Countries</h3><div class="chips">' + countryChips + '</div>' +
    '</section>';

    return '<div class="grid">' + staff + budget + campaigns + '</div>';
  }

  // ---------- majors ----------
  function renderMajors() {
    const s = G.state;
    const m = G.metrics();
    const demand = {};
    for (const a of s.applicants) demand[a.major] = (demand[a.major] || 0) + 1;
    const women = {};
    for (const st of s.students) if (st.gender === 'F') women[st.major] = (women[st.major] || 0) + 1;
    const areaName = id => (D.AREAS.find(x => x.id === id) || {}).name || '';
    const offered = s.majors.map(G.majorById).sort((a, b) => a.name.localeCompare(b.name));
    const q = ui.majorSearch.trim().toLowerCase();
    const catalog = D.MAJORS
      .filter(mj => !s.majors.includes(mj.id))
      .filter(mj => ui.majorArea === 'all' || mj.area === ui.majorArea)
      .filter(mj => !q || (mj.name + ' ' + mj.dept + ' ' + mj.courses.join(' ')).toLowerCase().includes(q))
      .sort((a, b) => (demand[b.id] || 0) - (demand[a.id] || 0) || b.pop - a.pop);
    const undeclared = m.majorCount.undeclared || 0;
    const closedCount = id => D.MAJORS.filter(mj => !s.majors.includes(mj.id) && (id === 'all' || mj.area === id)).length;
    const areaChips = [['all', 'All', closedCount('all')]].concat(D.AREAS.map(ar => [ar.id, ar.name, closedCount(ar.id)]));

    return '<div class="stack">' +
      '<section class="card">' +
        '<div class="card-head"><h2>Majors you offer</h2><span class="muted small">' + offered.length + ' of ' + D.MAJORS.length + ' departments · ' + money(offered.reduce((x, mj) => x + mj.cost, 0)) + ' a year</span></div>' +
        '<p class="hint">Applicants whose major you don’t offer are far less likely to enroll. Each department needs at least 2 classes and enough seats for its majors (see Classes). Majors draw different mixes of men and women, so your catalog shapes your gender balance.</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Major</th><th>Dept</th><th>Area</th><th class="num">Students</th><th class="num">Women</th><th class="num">Applicants this cycle</th><th class="num">Classes</th><th class="num">Seats / majors</th><th class="num">Grads earn</th><th class="num">Cost / year</th><th></th></tr></thead><tbody>' +
        offered.map(mj => {
          const out = G.majorOutcome(mj.id);
          const nc = m.deptClasses[mj.id] || 0;
          const n = m.majorCount[mj.id] || 0;
          const cov = G.deptCoverage(mj.id);
          return '<tr><td><b>' + esc(mj.name) + '</b></td><td class="mono">' + mj.dept + '</td><td class="small muted">' + esc(areaName(mj.area)) + '</td><td class="num">' + num(n) + '</td>' +
            '<td class="num">' + (n ? pct((women[mj.id] || 0) / n) : '—') + '</td><td class="num">' + num(demand[mj.id] || 0) + '</td>' +
            '<td class="num">' + (nc < 2 ? '<span class="tone-warn">' + nc + '</span>' : nc) + '</td>' +
            '<td class="num"><span class="' + (cov < 1 ? 'tone-bad' : 'tone-good') + '">' + num(m.deptSeats[mj.id] || 0) + ' / ' + num(n) + '</span></td>' +
            '<td class="num" title="' + (out ? pct(out.placed) + ' employed or in grad school' : 'National typical starting salary') + '">' + (out && out.salary ? money(out.salary) : '<span class="muted">~' + money(D.OUTCOMES[mj.id][0]) + '</span>') + '</td>' +
            '<td class="num">' + money(mj.cost) + '</td>' +
            '<td class="act"><button class="btn btn-ghost btn-small" data-action="goto-dept" data-id="' + mj.id + '">Classes</button> <button class="btn btn-ghost btn-small" data-action="ask-drop-major" data-id="' + mj.id + '">Close</button></td></tr>';
        }).join('') +
        (undeclared ? '<tr><td class="muted">Undeclared</td><td></td><td></td><td class="num">' + undeclared + '</td><td colspan="7" class="muted small">Students whose department closed</td></tr>' : '') +
        '</tbody></table></div>' +
      '</section>' +
      '<section>' +
        '<div class="section-head"><h2>Catalog</h2><span class="muted small">Sorted by applicant interest this cycle</span></div>' +
        '<div class="catalog-tools">' + chipGroup('major-area', areaChips, ui.majorArea, 'Filter by area') +
          '<input type="search" id="major-search" class="search" placeholder="Search majors and courses" value="' + esc(ui.majorSearch) + '" aria-label="Search majors">' +
        '</div>' +
        '<div class="catalog" id="major-catalog">' +
        (catalog.length ? catalog.map(mj => '<article class="cat-item">' +
          '<div class="cat-top"><h3>' + esc(mj.name) + '</h3><span class="mono muted">' + mj.dept + '</span></div>' +
          '<p class="cat-area">' + esc(areaName(mj.area)) + '</p>' +
          '<dl class="cat-meta"><div><dt>Cost / year</dt><dd>' + money(mj.cost) + '</dd></div><div><dt>Applicants want it</dt><dd>' + num(demand[mj.id] || 0) + '</dd></div><div><dt>Draws</dt><dd>' + pct(mj.f) + ' women</dd></div><div><dt>Grads earn</dt><dd>~' + money(D.OUTCOMES[mj.id][0]) + '</dd></div></dl>' +
          '<p class="cat-note">Courses: ' + mj.courses.map(esc).join(', ') + '</p>' +
          '<button class="btn btn-primary btn-small" data-action="add-major" data-id="' + mj.id + '">Open department</button>' +
        '</article>').join('') : '<p class="muted">Nothing left to open here.</p>') +
        '</div>' +
      '</section>' +
    '</div>';
  }

  // ---------- classes ----------
  function courseLevel(dept, i) {
    if (dept === 'gen') return 'Gen Ed';
    return ['Intro', 'Intermediate', 'Advanced', 'Capstone', 'Intermediate', 'Advanced'][i];
  }

  function renderClasses() {
    const s = G.state;
    const m = G.metrics();
    const seats = G.totalSeats(), need = G.seatsNeeded(), cov = G.seatCoverage();
    const quality = G.classQuality();
    const depts = ['gen'].concat(s.majors.slice().sort((a, b) => G.majorById(a).name.localeCompare(G.majorById(b).name)));
    if (!depts.includes(ui.classDept)) ui.classDept = 'gen';
    const fillPct = Math.min(100, cov * 100);
    const deptCost = id => s.classes.reduce((x, c) => x + (c.dept === id ? D.CLASS_SIZES[c.size].cost : 0), 0);

    const summary = '<section class="card">' +
      '<div class="card-head"><h2>Seats</h2><span class="muted small">Each student needs ' + G.SEATS_PER_STUDENT + ' seats, one of them in their major</span></div>' +
      '<div class="meter' + (cov < 1 ? ' is-short' : '') + '" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(fillPct) + '" aria-label="Seat coverage"><span style="width:' + fillPct + '%"></span></div>' +
      '<div class="kv-row">' +
        kv('Seats offered', num(seats)) + kv('Seats needed', num(need)) +
        kv('Coverage', '<span class="' + (cov < 1 ? 'tone-bad' : 'tone-good') + '">' + pct(cov) + '</span>') +
        kv('Small-class score', Math.round(quality * 100) + '<small>/100</small>') +
        kv('Sections', num(s.classes.length) + ' <small>' + money(s.classes.reduce((x, c) => x + D.CLASS_SIZES[c.size].cost, 0)) + '/yr</small>') +
      '</div>' +
      '<p class="hint">' + (cov < 1
        ? 'Not enough seats. Students who can’t get into classes drop out, and prestige suffers. Add classes before the season ends.'
        : 'Everyone can get a seat. Seminars cost more per seat than lecture halls but raise your small-class score, which counts toward prestige.') + '</p>' +
      (cov < 1 ? '<div class="btn-row"><button class="btn btn-primary btn-small" data-action="fill-gap">Add Gen Ed lecture halls to cover the gap</button></div>' : '') +
    '</section>';

    const deptRows = depts.map(id => {
      const d = G.deptById(id);
      const n = id === 'gen' ? null : (m.majorCount[id] || 0);
      const dc = id === 'gen' ? 1 : G.deptCoverage(id);
      const sections = m.deptClasses[id] || 0;
      return '<tr' + (ui.classDept === id ? ' class="is-sel"' : '') + '><td><b>' + esc(d.name) + '</b> <span class="mono muted">' + d.dept + '</span></td>' +
        '<td class="num">' + (n == null ? '<span class="muted">All students</span>' : num(n)) + '</td>' +
        '<td class="num">' + num(m.deptSeats[id] || 0) + '</td>' +
        '<td class="num">' + (n == null ? '—' : '<span class="' + (dc < 1 ? 'tone-bad' : 'tone-good') + '">' + (n ? pct(dc) : '—') + '</span>') + '</td>' +
        '<td class="num">' + (id !== 'gen' && sections < 2 ? '<span class="tone-warn">' + sections + '</span>' : sections) + '</td>' +
        '<td class="num">' + money(deptCost(id)) + '</td>' +
        '<td class="act"><button class="btn btn-ghost btn-small" data-action="class-dept" data-id="' + id + '">Courses</button>' +
          (id !== 'gen' && (dc < 1 || sections < 2) ? ' <button class="btn btn-primary btn-small" data-action="staff-dept" data-id="' + id + '">Staff to demand</button>' : '') +
        '</td></tr>';
    }).join('');
    const departments = '<section class="card">' +
      '<div class="card-head"><h2>Departments you staff</h2><span class="muted small">Every major needs seats for its own students</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Department</th><th class="num">Majors</th><th class="num">Seats</th><th class="num">Coverage</th><th class="num">Sections</th><th class="num">Cost / year</th><th></th></tr></thead><tbody>' + deptRows + '</tbody></table></div>' +
      '<p class="hint">A department short on seats makes its majors likelier to leave and its applicants less likely to enroll. “Staff to demand” adds standard sections until everyone fits.</p>' +
    '</section>';

    const d = G.deptById(ui.classDept);
    const deptChips = depts.map(id => [id, G.deptById(id).name, m.deptClasses[id] || 0]);
    const order = d.courses.map((t, i) => i).sort((a, b) => G.courseCode(ui.classDept, a).localeCompare(G.courseCode(ui.classDept, b)));
    const courseCards = order.map(i => {
      const secs = s.classes.filter(c => c.dept === ui.classDept && c.course === i);
      const bySize = {};
      for (const c of secs) bySize[c.size] = (bySize[c.size] || 0) + 1;
      const seatsHere = secs.reduce((x, c) => x + D.CLASS_SIZES[c.size].seats, 0);
      return '<article class="cat-item course-card' + (secs.length ? ' is-on' : '') + '">' +
        '<div class="cat-top"><h3>' + esc(d.courses[i]) + '</h3><span class="mono muted">' + esc(G.courseCode(ui.classDept, i)) + '</span></div>' +
        '<p class="cat-area">' + courseLevel(ui.classDept, i) + '</p>' +
        '<dl class="cat-meta"><div><dt>Sections</dt><dd>' + secs.length + '</dd></div><div><dt>Seats</dt><dd>' + num(seatsHere) + '</dd></div></dl>' +
        '<ul class="sec-list">' + Object.entries(D.CLASS_SIZES).map(([k, v]) =>
          '<li><span>' + v.label + ' <span class="muted small">' + v.seats + ' seats · ' + money(v.cost) + '</span></span>' +
          '<span class="stepper">' +
            '<button class="btn btn-ghost btn-small" data-action="section-remove" data-course="' + i + '" data-size="' + k + '" aria-label="Remove a ' + v.label + ' section"' + (bySize[k] ? '' : ' disabled') + '>−</button>' +
            '<b>' + (bySize[k] || 0) + '</b>' +
            '<button class="btn btn-ghost btn-small" data-action="section-add" data-course="' + i + '" data-size="' + k + '" aria-label="Add a ' + v.label + ' section">+</button>' +
          '</span></li>').join('') +
        '</ul>' +
      '</article>';
    }).join('');

    const catalog = '<section>' +
      '<div class="section-head"><h2>Course catalog</h2><span class="muted small">Pick a department, then add sections in any format</span></div>' +
      '<div class="catalog-tools">' + chipGroup('class-dept', deptChips, ui.classDept, 'Department') + '</div>' +
      '<div class="dept-banner"><h3>' + esc(d.name) + '</h3>' +
        (ui.classDept === 'gen'
          ? '<span class="muted small">Open to every student. Good for covering the overall seat count.</span>'
          : '<span class="muted small">' + plural(m.majorCount[ui.classDept] || 0, 'major') + ' · ' + num(m.deptSeats[ui.classDept] || 0) + ' seats</span>') +
      '</div>' +
      '<div class="catalog" id="course-catalog">' + courseCards + '</div>' +
    '</section>';

    return '<div class="stack">' + summary + departments + catalog + '</div>';
  }

  // ---------- students & campus life ----------
  function renderStudents() {
    const s = G.state;
    const m = G.metrics();
    const n = Math.max(1, m.n);
    const life = m.life;
    const demo = demographics(s.students);
    const topStates = Object.entries(m.states).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const standouts = s.students.filter(st => st.hook).sort((a, b) => a.classOf - b.classOf || a.name.localeCompare(b.name));

    const lifeCard = '<section class="card">' +
      '<div class="card-head"><h2>Campus life</h2><span class="life-score">' + Math.round(life.score) + '<small>/100</small></span></div>' +
      '<p class="hint">Built from the students you admit. Their activities feed each scene, standouts give it a big boost, and Greek life, teams, housing and a mix of backgrounds all count. Campus life lifts applications, yield, retention and prestige.</p>' +
      bars(life.dims.map(d => [d.label, d.value, Math.round(d.value)]), 100) +
    '</section>';

    const who = '<section class="card">' +
      '<div class="card-head"><h2>Who’s here</h2><span class="muted small">' + plural(m.n, 'student') + '</span></div>' +
      genderSplit(demo, 'Gender') +
      residencySplit(demo, 'Where they’re from') +
      '<div class="kv-row">' +
        kv('First-generation', pct(m.firstGen / n)) +
        kv('Legacies', pct(m.legacy / n)) +
        kv('Recruited athletes', pct(m.athletes / n)) +
        kv('In Greek life', pct(m.greekMembers / n)) +
        kv('Avg aid', money(m.aidTotal / n)) +
        kv('States', Object.keys(m.states).length) +
      '</div>' +
      '<h3 class="sub">Top home states</h3>' +
      bars(topStates.map(([code, c]) => [(G.stateByCode(code) || {}).name || code, c])) +
    '</section>';

    const standoutCard = '<section class="card span-2">' +
      '<div class="card-head"><h2>Standout students</h2><span class="muted small">' + plural(standouts.length, 'student') + ' who make the news</span></div>' +
      (standouts.length
        ? '<div class="table-wrap table-tall"><table class="table"><thead><tr><th>Student</th><th>Class</th><th>Standout</th><th>Major</th><th>Team</th><th>Chapter</th></tr></thead><tbody>' +
          standouts.map(st => {
            const ch = st.greek ? chapterById(st.greek) : null;
            return '<tr><td><b>' + esc(st.name) + '</b><div class="cell-sub">' + esc(st.region) + ' · ' + st.gender + '</div></td><td class="mono">' + st.classOf + '</td>' +
              '<td><span class="tag ' + (st.hook === 'trouble' ? 'tag-bad' : 'tag-star') + '">' + esc(hookLabel(st.hook)) + '</span></td>' +
              '<td>' + esc(majorName(st.major)) + '</td><td>' + (st.sport ? esc(G.sportById(st.sport).name) : '<span class="muted">—</span>') + '</td>' +
              '<td>' + (ch ? esc(ch.name) : '<span class="muted">—</span>') + '</td></tr>';
          }).join('') +
          '</tbody></table></div>'
        : '<p class="muted">No standouts on campus yet. Look for the ★ Standout tag in Applications.</p>') +
    '</section>';

    const alumni = '<section class="card span-2">' +
      '<div class="card-head"><h2>Alumni</h2><span class="muted small">' + num(s.alumni) + ' living alumni · ' + money(s.alumniGiving) + ' a year in giving</span></div>' +
      '<p class="hint">Every graduate gives back for life. Students who were in Greek life, came from wealthy families or started companies give the most. A bigger alumni network also draws more applicants.</p>' +
      (s.notableAlumni.length
        ? '<ul class="alumni">' + s.notableAlumni.slice(0, 24).map(al => '<li><b>' + esc(al.name) + '</b> ' + esc(String(al.classOf)) + ' <span class="muted">· ' + esc(hookLabel(al.hook)) + ' · ' + esc(majorName(al.major)) + '</span></li>').join('') + '</ul>'
        : '<p class="muted">Notable alumni appear here once your standouts graduate.</p>') +
    '</section>';

    const oc = s.outcomes;
    const last = oc[oc.length - 1];
    const byPay = {};
    for (const r of oc.slice(-3)) for (const [id, b] of Object.entries(r.byMajor)) {
      const x = byPay[id] || (byPay[id] = [0, 0, 0]);
      x[0] += b[0]; x[1] += b[1]; x[2] += b[2];
    }
    const payRows = Object.entries(byPay).filter(([, b]) => b[1]).map(([id, b]) => [majorName(id), b[2] / b[1], b[1] / b[0], b[0]]).sort((a, b) => b[1] - a[1]);
    const outcomes = '<section class="card span-2">' +
      '<div class="card-head"><h2>Graduation & careers</h2><span class="muted small">Outcome score ' + Math.round(G.outcomeScore()) + '/100</span></div>' +
      (last
        ? '<div class="kv-row">' +
            kv('Class of ' + last.year + ' graduated', num(last.graduated) + ' <small>of ' + num(last.cohort) + ' who started</small>') +
            kv('Graduation rate', pct(last.gradRate)) +
            kv('Employed or in grad school', pct(last.placed)) +
            kv('Median starting salary', money(last.salary)) +
          '</div>' +
          '<p class="hint">Graduation rates, job placement and pay feed prestige, draw applicants and set how much alumni give. Students who stay in a well-staffed major with seats in their classes are more likely to finish; stronger students and a more prestigious degree land better jobs.</p>' +
          '<div class="grid grid-tight">' +
            '<div><h3 class="sub">Starting pay by major <span class="muted">(last 3 classes)</span></h3>' +
              bars(payRows.slice(0, 10).map(r => [r[0], r[1], money(r[1])])) + '</div>' +
            '<div><h3 class="sub">Recent classes</h3><div class="table-wrap"><table class="table"><thead><tr><th>Class</th><th class="num">Grads</th><th class="num">Grad rate</th><th class="num">Placed</th><th class="num">Median pay</th></tr></thead><tbody>' +
              oc.slice(-6).reverse().map(r => '<tr><td>' + r.year + '</td><td class="num">' + num(r.graduated) + '</td><td class="num">' + pct(r.gradRate) + '</td><td class="num">' + pct(r.placed) + '</td><td class="num">' + money(r.salary) + '</td></tr>').join('') +
            '</tbody></table></div></div>' +
          '</div>'
        : '<p class="muted">Your first graduating class crosses the stage when you end this season.</p>') +
    '</section>';

    return '<div class="grid">' + lifeCard + who + outcomes + standoutCard + alumni + '</div>';
  }

  // ---------- housing ----------
  function renderHousing() {
    const s = G.state;
    const h = G.metrics().housing;
    const fillPct = h.demand ? Math.min(100, h.beds / h.demand * 100) : 100;
    const short = h.beds < h.demand;
    const freshShort = h.freshBeds < s.targetClass;

    const summary = '<section class="card">' +
      '<div class="card-head"><h2>Beds</h2><span class="muted small">Freshmen must live on campus; upperclassmen choose</span></div>' +
      '<div class="meter' + (short ? ' is-short' : '') + '" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(fillPct) + '" aria-label="Beds against demand"><span style="width:' + fillPct + '%"></span></div>' +
      '<div class="kv-row">' +
        kv('Beds', num(h.beds)) +
        kv('Want campus housing', num(h.demand)) +
        kv('Living on campus', num(h.residents)) +
        kv('Upperclassmen staying', pct(h.wantRate)) +
        kv('Housing score', Math.round(h.score) + '<small>/100</small>') +
      '</div>' +
      '<div class="kv-row">' +
        kv('Beds for next fall’s freshmen', '<span class="' + (freshShort ? 'tone-bad' : 'tone-good') + '">' + num(h.freshBeds) + '</span> <small>of ' + num(s.targetClass) + ' target</small>') +
      '</div>' +
      (short ? '<p class="note note-bad">' + num(h.overflow) + ' students who want campus housing can’t get a bed. Expect bad press, unhappy freshmen and lower yield.</p>' : '') +
      (!short && freshShort ? '<p class="note">You can’t guarantee every incoming freshman a bed. Admitted students notice, and fewer will enroll.</p>' : '') +
      '<div class="fields">' + numField('room-board', 'Room & board per year', s.roomBoard, 0, 40000, 250, 'roomBoard') + '</div>' +
      '<p class="hint">Residents pay room and board; you pay upkeep plus ' + money(G.DINING_PER_RESIDENT) + ' per resident for dining. Higher prices push upperclassmen off campus and raise every student’s cost of attendance.</p>' +
    '</section>';

    const halls = '<section class="card">' +
      '<div class="card-head"><h2>Residence halls</h2><span class="muted small">' + s.dorms.length + ' halls' + (s.greek.some(c => c.house) ? ' plus ' + s.greek.filter(c => c.house).length + ' chapter houses' : '') + '</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Hall</th><th>Type</th><th class="num">Beds</th><th class="num">Upkeep / year</th><th class="num">Opened</th><th></th></tr></thead><tbody>' +
        s.dorms.map(d => {
          const spec = D.DORMS[d.type];
          return '<tr><td><b>' + esc(d.name) + '</b></td><td>' + spec.label + '</td><td class="num">' + num(spec.beds) + '</td><td class="num">' + money(spec.beds * spec.upkeep) + '</td><td class="num">' + (d.built || '—') + '</td>' +
            '<td class="act"><button class="btn btn-ghost btn-small" data-action="ask-close-dorm" data-id="' + d.id + '">Close</button></td></tr>';
        }).join('') +
        s.greek.filter(c => c.house).map(c => '<tr><td><b>' + esc(c.name) + ' House</b></td><td>Chapter house</td><td class="num">' + D.GREEK.houseBeds + '</td><td class="num">' + money(D.GREEK.houseBeds * D.GREEK.houseUpkeep) + '</td><td class="num">—</td><td></td></tr>').join('') +
        (s.dorms.length || s.greek.some(c => c.house) ? '' : '<tr><td colspan="6" class="muted">No residence halls. Build one below.</td></tr>') +
      '</tbody></table></div>' +
    '</section>';

    const catalog = '<section>' +
      '<div class="section-head"><h2>Build a residence hall</h2><span class="muted small">Paid from your budget today · ' + money(s.budget) + ' available</span></div>' +
      '<div class="catalog">' +
        Object.entries(D.DORMS).map(([k, v]) => '<article class="cat-item">' +
          '<div class="cat-top"><h3>' + v.label + '</h3><span class="muted small">' + v.beds + ' beds</span></div>' +
          '<dl class="cat-meta"><div><dt>Build</dt><dd>' + money(v.cost) + '</dd></div><div><dt>Upkeep / yr</dt><dd>' + money(v.beds * v.upkeep) + '</dd></div><div><dt>Appeal</dt><dd>' + ('★'.repeat(Math.round(v.appeal * 2)) || '—') + '</dd></div></dl>' +
          '<p class="cat-note">' + v.note + '</p>' +
          '<button class="btn btn-primary btn-small" data-action="build-dorm" data-id="' + k + '"' + (s.budget < v.cost ? ' disabled' : '') + '>' + (s.budget < v.cost ? 'Not enough money' : 'Build for ' + money(v.cost)) + '</button>' +
        '</article>').join('') +
      '</div>' +
    '</section>';

    return '<div class="stack">' + summary + halls + catalog + '</div>';
  }

  // ---------- Greek life ----------
  function renderGreek() {
    const s = G.state;
    const m = G.metrics();
    const n = Math.max(1, m.n);
    const dim = m.life.dims.find(d => d.id === 'greek');
    const interested = g => s.students.filter(st => st.greekInt && !st.greek && st.gender === g).length;
    const used = new Set(s.greek.map(c => c.name));
    const policyRadio = Object.entries(D.GREEK_POLICIES).map(([k, v]) =>
      '<label class="type-card' + (s.greekPolicy === k ? ' is-on' : '') + '" for="greek-policy-' + k + '">' +
        '<input type="radio" name="greek-policy" id="greek-policy-' + k + '" value="' + k + '"' + (s.greekPolicy === k ? ' checked' : '') + ' data-greek-policy="1">' +
        '<span class="type-title">' + v.label + '</span><span class="type-lines"><span>' + v.note + '</span></span>' +
      '</label>').join('');

    const summary = '<section class="card">' +
      '<div class="card-head"><h2>Greek life</h2><span class="muted small">' + plural(s.greek.length, 'chapter') + '</span></div>' +
      '<div class="kv-row">' +
        kv('Members', num(m.greekMembers)) +
        kv('Share of students', pct(m.greekMembers / n)) +
        kv('Greek life score', Math.round(dim ? dim.value : 0) + '<small>/100</small>') +
        kv('Unaffiliated, want in', num(interested('F')) + ' <small>women</small> · ' + num(interested('M')) + ' <small>men</small>') +
      '</div>' +
      '<p class="hint">Freshmen rush each fall. Members are less likely to drop out and give more as alumni, and applicants who want to go Greek are likelier to enroll if you have chapters for them. Big chapters, students with disciplinary records and lax oversight raise the risk of hazing scandals.</p>' +
      '<fieldset class="field field-gap"><legend>Oversight</legend><div class="type-cards type-cards-3">' + policyRadio + '</div></fieldset>' +
    '</section>';

    const chapters = '<section class="card">' +
      '<div class="card-head"><h2>Chapters</h2><span class="muted small">Up to ' + D.GREEK.cap + ' members each · ' + money(D.GREEK.upkeep) + '/yr office cost per chapter</span></div>' +
      (s.greek.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>Chapter</th><th>Type</th><th class="num">Members</th><th>Status</th><th>House</th><th class="num">Founded</th><th></th></tr></thead><tbody>' +
          s.greek.slice().sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)).map(c => {
            const mem = m.chapterCount[c.id] || 0;
            return '<tr><td><b>' + esc(c.name) + '</b></td><td>' + (c.kind === 'sorority' ? 'Sorority' : 'Fraternity') + '</td>' +
              '<td class="num">' + num(mem) + ' <span class="muted small">/ ' + D.GREEK.cap + '</span></td>' +
              '<td>' + (c.probation > 0 ? '<span class="tag tag-bad">Suspended · ' + plural(c.probation, 'year') + '</span>' : '<span class="tag tag-good">Good standing</span>') + '</td>' +
              '<td>' + (c.house ? D.GREEK.houseBeds + ' beds' : '<button class="btn btn-ghost btn-small" data-action="build-house" data-id="' + c.id + '"' + (s.budget < D.GREEK.houseCost ? ' disabled' : '') + '>Build house ' + money(D.GREEK.houseCost) + '</button>') + '</td>' +
              '<td class="num">' + c.founded + '</td>' +
              '<td class="act"><button class="btn btn-ghost btn-small" data-action="ask-close-chapter" data-id="' + c.id + '">Shut down</button></td></tr>';
          }).join('') +
          '</tbody></table></div>'
        : '<p class="muted">No chapters on campus. Charter one below.</p>') +
    '</section>';

    const charterList = (names, kind) => names.filter(nm => !used.has(nm)).map(nm =>
      '<li><span>' + esc(nm) + '</span><button class="btn btn-ghost btn-small" data-action="charter" data-kind="' + kind + '" data-name="' + esc(nm) + '"' + (s.budget < D.GREEK.charterCost ? ' disabled' : '') + '>Charter</button></li>').join('');
    const charter = '<section>' +
      '<div class="section-head"><h2>Charter a chapter</h2><span class="muted small">' + money(D.GREEK.charterCost) + ' to found · ' + money(D.GREEK.upkeep) + ' a year</span></div>' +
      '<div class="grid">' +
        '<div class="card"><div class="card-head"><h2>Sororities</h2><span class="muted small">' + num(interested('F')) + ' women waiting</span></div><ul class="charter-list">' + (charterList(D.SORORITIES, 'sorority') || '<li class="muted">All chartered.</li>') + '</ul></div>' +
        '<div class="card"><div class="card-head"><h2>Fraternities</h2><span class="muted small">' + num(interested('M')) + ' men waiting</span></div><ul class="charter-list">' + (charterList(D.FRATERNITIES, 'fraternity') || '<li class="muted">All chartered.</li>') + '</ul></div>' +
      '</div>' +
    '</section>';

    return '<div class="stack">' + summary + chapters + charter + '</div>';
  }

  // ---------- sports ----------
  const SPORT_GROUPS = [['M', 'Men’s sports'], ['F', 'Women’s sports'], [null, 'Co-ed']];

  function renderSports() {
    const s = G.state;
    const recruitsApplying = {};
    for (const a of s.applicants) if (a.sport) recruitsApplying[a.sport] = (recruitsApplying[a.sport] || 0) + 1;
    const offered = s.sports.map(G.sportById).filter(Boolean);
    const cost = list => money(list.reduce((x, sp) => x + sp.cost, 0));

    const teamRows = list => list.sort((a, b) => a.base.localeCompare(b.base)).map(sp => {
      const roster = G.rosterFor(sp.id);
      const avg = roster.length ? roster.reduce((x, st) => x + st.stars, 0) / roster.length : 0;
      const rec = s.sportRecords[sp.id];
      return '<tr><td><b>' + esc(sp.base) + '</b></td><td class="num">' + roster.length + ' <span class="muted small">/ ' + sp.roster + '</span></td>' +
        '<td class="num">' + (roster.length ? avg.toFixed(1) + ' ★' : '—') + '</td><td class="num">' + num(recruitsApplying[sp.id] || 0) + '</td>' +
        '<td>' + (rec ? '<span class="record ' + (rec.w >= rec.l ? 'tone-good' : 'tone-bad') + '">' + rec.w + '–' + rec.l + '</span>' : '<span class="muted">First season ahead</span>') + '</td>' +
        '<td class="num">' + money(sp.cost) + '</td><td class="num">' + money(sp.revenue) + '</td>' +
        '<td class="act"><button class="btn btn-ghost btn-small" data-action="ask-cut-sport" data-id="' + sp.id + '">Cut</button></td></tr>';
    }).join('');
    const teams = SPORT_GROUPS.map(([g, label]) => {
      const list = offered.filter(sp => sp.g === g);
      if (!list.length && g === null) return '';
      return '<tr class="group-row"><th colspan="8">' + label + ' <span class="muted small">' + plural(list.length, 'team') + (list.length ? ' · ' + cost(list) + ' a year' : '') + '</span></th></tr>' +
        (list.length ? teamRows(list) : '<tr><td colspan="8" class="muted small">No teams yet. Launch one from the catalog below.</td></tr>');
    }).join('');

    const catalogFor = g => D.SPORTS.filter(x => x.g === g && !s.sports.includes(x.id))
      .sort((a, b) => (recruitsApplying[b.id] || 0) - (recruitsApplying[a.id] || 0) || a.base.localeCompare(b.base))
      .map(sp => '<article class="cat-item">' +
        '<div class="cat-top"><h3>' + esc(sp.name) + '</h3><span class="muted small">' + sp.roster + ' on roster</span></div>' +
        '<dl class="cat-meta"><div><dt>Cost / year</dt><dd>' + money(sp.cost) + '</dd></div><div><dt>Revenue</dt><dd>' + money(sp.revenue) + '</dd></div><div><dt>Recruits applying</dt><dd>' + num(recruitsApplying[sp.id] || 0) + '</dd></div></dl>' +
        '<button class="btn btn-primary btn-small" data-action="add-sport" data-id="' + sp.id + '">Launch program</button>' +
      '</article>').join('');

    const ath = s.athletics;
    const div = D.DIVISIONS[ath.division];
    const conf = G.conferenceOf();
    const t9 = G.titleIX();
    const divisionCard = '<section class="card">' +
      '<div class="card-head"><h2>' + div.label + ' · ' + esc(conf.name) + '</h2>' +
        (ath.transition ? '<span class="tag tag-bad">Transition: ' + plural(ath.transition, 'year') + ' left</span>' : '<span class="tag tag-good">Full member</span>') + '</div>' +
      '<p class="hint">' + esc(div.note) + ' Conference rivals: ' + conf.rivals.map(esc).join(', ') + '.</p>' +
      '<div class="kv-row">' +
        kv('TV deal', money(conf.tv * (ath.transition ? 0.5 : 1)) + '<small>/yr</small>') +
        kv('Scholarship per roster spot', div.schol ? money(div.schol) : 'None') +
        kv('Ticket & media money', '×' + div.revenue.toFixed(1)) +
        kv('Title IX', '<span class="' + (t9.over ? 'tone-bad' : 'tone-good') + '">' + (t9.over ? 'Out of compliance' : 'OK') + '</span> <small>' + pct(t9.women) + ' of athletes vs ' + pct(t9.students) + ' of students are women</small>') +
      '</div>' +
      (t9.over ? '<p class="note note-bad">Your athletes’ gender mix is ' + Math.round(t9.gap * 100) + ' points off your student body’s (allowed: ' + Math.round(t9.allowed * 100) + '). Expect Title IX complaints, and you can’t move up a division until it’s fixed. Launch ' + (t9.women < t9.students ? 'women’s' : 'men’s') + ' programs.</p>' : '') +
      '<div class="grid grid-tight">' +
        '<div><h3 class="sub">Divisions</h3><ul class="charter-list">' + ['D3', 'D2', 'D1'].map(id => {
          const d = D.DIVISIONS[id];
          const here = id === ath.division;
          const req = d.minPrograms ? d.minPrograms + ' programs (' + d.minWomen + ' women’s)' + (d.minPrestige ? ', prestige ' + d.minPrestige : '') + ', ' + money(d.fee) + ' fee' : 'Open to all';
          return '<li><span><b>' + d.label + '</b> <span class="muted small">' + req + '</span></span>' +
            (here ? '<span class="tag tag-good">Current</span>' : '<button class="btn btn-ghost btn-small" data-action="ask-division" data-id="' + id + '">' + (d.rank < div.rank ? 'Move up' : 'Move down') + '</button>') + '</li>';
        }).join('') + '</ul></div>' +
        '<div><h3 class="sub">' + div.label + ' conferences</h3><ul class="charter-list">' + D.CONFERENCES.filter(c => c.div === ath.division).map(c => {
          const here = c.id === ath.conference;
          const chk = G.conferenceCheck(c.id);
          return '<li><span><b>' + esc(c.name) + '</b> <span class="muted small">' + money(c.tv) + '/yr TV' + (c.minPrestige ? ' · prestige ' + c.minPrestige + '+' : '') + (c.needsFootball ? ' · football required' : '') + '</span></span>' +
            (here ? '<span class="tag tag-good">Member</span>' : '<button class="btn btn-ghost btn-small" data-action="join-conference" data-id="' + c.id + '"' + (chk.ok ? '' : ' disabled title="' + esc(chk.reasons[0]) + '"') + '>Join</button>') + '</li>';
        }).join('') + '</ul></div>' +
      '</div>' +
    '</section>';

    return '<div class="stack">' + divisionCard +
      '<section class="card">' +
        '<div class="card-head"><h2>Varsity teams</h2><span class="muted small">' + plural(offered.length, 'program') + ' · ' + cost(offered) + ' a year</span></div>' +
        '<p class="hint">Men’s and women’s teams are separate programs, and recruits only play for their own. Admit recruits with high star ratings to build a roster. Winning teams sell more tickets, build school spirit and lift prestige.</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Team</th><th class="num">Recruits on roster</th><th class="num">Avg rating</th><th class="num">Recruits applying</th><th>Last season</th><th class="num">Cost / year</th><th class="num">Revenue (avg year)</th><th></th></tr></thead><tbody>' +
          teams +
        '</tbody></table></div>' +
      '</section>' +
      SPORT_GROUPS.map(([g, label]) => {
        const cards = catalogFor(g);
        if (!cards) return '';
        return '<section><div class="section-head"><h2>' + label + ' catalog</h2><span class="muted small">Sorted by recruits applying this cycle</span></div><div class="catalog">' + cards + '</div></section>';
      }).join('') +
    '</div>';
  }

  // ---------- tuition & aid ----------
  function renderTuition() {
    const s = G.state;
    const m = G.metrics();
    const mix = G.residencyMix();
    const out = G.applicantOutlook();
    const tuitionGross = s.students.reduce((x, st) => x + G.tuitionFor(st), 0);
    const aided = s.students.filter(st => st.aid > 0).length;
    const admits = s.applicants.filter(a => a.decision === 'admit');
    const expAid = admits.reduce((x, a) => x + G.enrollChance(a) * G.aidPackage(a).total, 0);

    const tuition = '<section class="card">' +
      '<div class="card-head"><h2>Tuition</h2><span class="muted small">Per student, per year</span></div>' +
      '<div class="fields">' +
        numField('tuition-in', 'In-state tuition', s.tuitionIn, 0, 100000, 500, 'tuitionIn') +
        numField('tuition-out', 'Out-of-state tuition', s.tuitionOut, 0, 100000, 500, 'tuitionOut') +
        numField('room-board', 'Room & board', s.roomBoard, 0, 40000, 250, 'roomBoard') +
      '</div>' +
      '<p class="hint">International students pay out-of-state tuition. ' + (s.school.type === 'public'
        ? 'Public schools also get ' + money(3000) + ' a year from the state for each in-state student.'
        : 'Most private colleges charge one price, but you can set two.') + '</p>' +
      '<div class="kv-row">' +
        kv('In-state share of applicants', pct(mix.inShare)) +
        kv('Out-of-state appeal', '×' + mix.outAppeal.toFixed(2)) +
        kv('Typical net price', money(out.net)) +
      '</div>' +
      '<p class="hint">A big gap between in-state and out-of-state tuition keeps out-of-state students away. As prestige grows, your reach goes national.</p>' +
    '</section>';

    const policy = '<section class="card">' +
      '<div class="card-head"><h2>Financial aid policy</h2></div>' +
      '<div class="fields">' +
        numField('aid-need', 'Need met (%)', s.aid.needMet, 0, 100, 5, 'aid.needMet', 100) +
        numField('aid-merit', 'Merit award ($/yr)', s.aid.meritAmount, 0, 100000, 500, 'aid.meritAmount') +
        numField('aid-merit-idx', 'Merit cutoff (index)', s.aid.meritIdx, 0, 100, 1, 'aid.meritIdx') +
      '</div>' +
      '<p class="hint">Need is what a family can’t pay toward the cost of attendance. Meeting more of it lets low-income students enroll; merit money lures strong students away from rivals. You can also offer an individual scholarship from any application. Aid is locked in for all four years.</p>' +
    '</section>';

    const probe = (efc, inState) => G.aidPackage({ idx: 60, efc, stateCode: inState ? s.school.state : null, intl: false, scholarship: 0 });
    const rows = D.INCOME.map(b => {
      const efc = Math.round((b.efc[0] + b.efc[1]) / 2);
      const i = probe(efc, true), o = probe(efc, false);
      const cell = p => '<td class="num">' + money(p.net) + (p.gap > 0 ? ' <span class="tag tag-bad">' + money(p.gap) + ' short</span>' : '') + '</td>';
      return '<tr><td>' + esc(b.label) + ' <span class="muted small">can pay ~' + money(efc) + '</span></td>' + cell(i) + cell(o) + '</tr>';
    }).join('');
    const netTable = '<section class="card">' +
      '<div class="card-head"><h2>Net price by family income</h2><span class="muted small">For a typical student below the merit cutoff</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Family income</th><th class="num">In-state</th><th class="num">Out-of-state</th></tr></thead><tbody>' +
        '<tr><td><b>Cost of attendance</b></td><td class="num">' + money(s.tuitionIn + s.roomBoard) + '</td><td class="num">' + money(s.tuitionOut + s.roomBoard) + '</td></tr>' +
        rows +
      '</tbody></table></div>' +
    '</section>';

    const spend = '<section class="card">' +
      '<div class="card-head"><h2>Aid spending</h2></div>' +
      '<div class="kv-row">' +
        kv('Aid this year', money(m.aidTotal)) +
        kv('Discount rate', pct(tuitionGross ? m.aidTotal / tuitionGross : 0)) +
        kv('Students with aid', pct(aided / Math.max(1, m.n))) +
        kv('Avg award', money(aided ? m.aidTotal / aided : 0)) +
        kv('Projected aid for this class', money(expAid)) +
      '</div>' +
      '<p class="hint">The discount rate is the share of sticker-price tuition you give back as aid.</p>' +
    '</section>';

    return '<div class="grid">' + tuition + policy + netTable + spend + '</div>';
  }

  // ---------- modals ----------
  function showModal(m) {
    ui.modal = m;
    modalRoot.innerHTML =
      '<div class="scrim scrim-modal" data-action="' + (m.dismissable === false ? '' : 'close-modal') + '"></div>' +
      '<div class="modal' + (m.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<h2 id="modal-title">' + m.title + '</h2>' +
        '<div class="modal-body">' + m.body + '</div>' +
        '<div class="modal-actions">' +
          (m.cancel !== false ? '<button class="btn btn-ghost" data-action="close-modal">' + (m.cancelLabel || 'Cancel') + '</button>' : '') +
          '<button class="btn ' + (m.danger ? 'btn-deny' : 'btn-primary') + '" data-action="confirm-modal" id="modal-confirm">' + m.confirmLabel + '</button>' +
        '</div>' +
      '</div>';
    const btn = document.getElementById('modal-confirm');
    if (btn) btn.focus();
  }
  function closeModal() {
    ui.modal = null;
    modalRoot.innerHTML = '';
  }

  function askEndSeason() {
    const s = G.state;
    const m = G.metrics();
    const pending = s.applicants.filter(a => a.decision === 'pending').length;
    const admits = s.applicants.filter(a => a.decision === 'admit').length;
    const wl = s.applicants.filter(a => a.decision === 'waitlist').length;
    const cov = G.seatCoverage();
    const expected = expectedFreshmen();
    const shortDepts = s.majors.filter(id => G.deptCoverage(id) < 1);
    const warnings = [];
    const staffLeft = s.staff.autoRead ? Math.min(G.staffRemaining(), pending) : 0;
    if (staffLeft) warnings.push('Your staff will read ' + num(staffLeft) + ' of the ' + num(pending) + ' pending files using your rules.');
    if (pending > staffLeft) warnings.push(num(pending - staffLeft) + ' pending application' + (pending - staffLeft > 1 ? 's' : '') + ' will be denied unread.');
    if (cov < 1) warnings.push('You only have seats for ' + pct(cov) + ' of what students need. Expect more students to leave.');
    if (shortDepts.length) warnings.push(shortDepts.length + ' department' + (shortDepts.length > 1 ? 's are' : ' is') + ' short on seats for their majors: ' + shortDepts.slice(0, 4).map(majorName).join(', ') + (shortDepts.length > 4 ? '…' : '') + '.');
    if (m.housing.freshBeds < Math.max(expected, 1)) warnings.push('Only ' + num(m.housing.freshBeds) + ' beds are free for about ' + Math.round(expected) + ' incoming freshmen.');
    showModal({
      title: 'End the ' + s.year + ' season?',
      body: '<p>You admitted <b>' + num(admits) + '</b> and waitlisted <b>' + num(wl) + '</b>. About <b>' + Math.round(expected) + '</b> admitted students are expected to enroll, against a target of ' + num(s.targetClass) + '.</p>' +
        (warnings.length ? '<ul class="warn-list">' + warnings.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '') +
        '<p class="muted">Seniors graduate, freshmen rush, teams play their seasons, your students make the news, and the year’s budget settles.</p>',
      confirmLabel: 'End season',
      onConfirm: () => {
        const rep = G.endSeason();
        ui.openId = null;
        ui.filter = 'pending';
        ui.page = 0;
        renderDrawer();
        render();
        showReport(rep);
        if (!G.saveOk) toast('Couldn’t save: your browser’s storage is full.');
      }
    });
  }

  function askReleaseEarly() {
    const s = G.state;
    const early = s.applicants.filter(G.isEarly);
    const c = { admit: 0, defer: 0, deny: 0, pending: 0 };
    for (const a of early) c[a.decision]++;
    const edAdmits = early.filter(a => a.round === 'ED' && a.decision === 'admit');
    const expectedCommit = edAdmits.reduce((x, a) => x + G.edCommitChance(a), 0);
    showModal({
      title: 'Send early decisions?',
      body: '<p>You admitted <b>' + num(c.admit) + '</b>, deferred <b>' + num(c.defer) + '</b> and denied <b>' + num(c.deny) + '</b> early applicants.' +
        (c.pending ? ' The <b>' + num(c.pending) + '</b> you haven’t decided will be deferred.' : '') + '</p>' +
        (edAdmits.length ? '<p>About <b>' + Math.round(expectedCommit) + '</b> of your ' + num(edAdmits.length) + ' Early Decision admits will commit. Families whose aid falls short can back out.</p>' : '') +
        '<p class="muted">Then the regular round opens with ' + num(s.applicants.length - early.length) + ' new applicants plus anyone you deferred. Early decisions can’t be changed afterward.</p>',
      confirmLabel: 'Send decisions',
      onConfirm: () => {
        const r = G.releaseEarly();
        ui.filter = 'pending';
        ui.page = 0;
        ui.openId = null;
        renderDrawer();
        render();
        showModal({
          title: 'Early decisions are out',
          body: '<div class="report-grid">' +
              kv('ED admitted', num(r.edAdmitted)) + kv('Committed', num(r.committed)) + kv('Released for aid', num(r.released)) + kv('EA admitted', num(r.eaAdmitted)) +
              kv('Deferred', num(r.deferred)) + kv('Denied', num(r.denied)) +
            '</div>' +
            '<p>' + plural(r.committed, 'student has', 'students have') + ' already claimed a seat in the Class of ' + (s.year + 4) + '. The regular round is open.</p>',
          confirmLabel: 'Open the regular round', cancel: false,
          onConfirm: () => { ui.tab = 'applications'; render(); }
        });
      }
    });
  }

  function fx(e) {
    const out = [];
    if (e.prestige) out.push((e.prestige > 0 ? '+' : '−') + Math.abs(e.prestige).toFixed(1) + ' prestige');
    if (e.buzz) out.push((e.buzz > 0 ? '+' : '−') + Math.abs(e.buzz).toFixed(1) + ' buzz');
    if (e.money) out.push((e.money > 0 ? '+' : '') + money(e.money));
    return out.map(t => '<span class="fx">' + t + '</span>').join('');
  }

  function showReport(r) {
    const s = G.state;
    const dP = r.prestigeAfter - r.prestigeBefore;
    const sportsRows = r.sports.length
      ? '<ul class="report-sports">' + r.sports.map(x => '<li><span>' + esc(x.name) + '</span><span class="record ' + (x.w >= x.l ? 'tone-good' : 'tone-bad') + '">' + x.w + '–' + x.l + '</span></li>').join('') + '</ul>'
      : '<p class="muted">No varsity teams this year.</p>';
    const events = r.events.slice().sort((a, b) => (Math.abs(b.prestige) * 10 + Math.abs(b.buzz) + Math.abs(b.money) / 5e5) - (Math.abs(a.prestige) * 10 + Math.abs(a.buzz) + Math.abs(a.money) / 5e5));
    const shown = events.slice(0, 12);
    showModal({
      wide: true,
      cancel: false,
      dismissable: false,
      title: 'The Class of ' + (r.year + 4) + ' is in',
      body:
        '<div class="report-hero"><span class="report-big">' + num(r.enrolled) + '</span><span>freshmen enrolled' + (r.committed ? ', ' + num(r.committed) + ' through Early Decision' : '') + (r.fromWaitlist ? ', ' + num(r.fromWaitlist) + ' from the waitlist' : '') + '</span></div>' +
        '<div class="report-grid">' +
          kv('Applied', num(r.applied)) +
          kv('Admitted', num(r.admitted) + ' <small>' + pct(r.acceptRate) + ' rate</small>') +
          kv('Yield', pct(r.yieldRate)) +
          kv('Avg GPA', r.incomingAvgGpa != null ? r.incomingAvgGpa.toFixed(2) : '—') +
          kv('Women', pct(r.femalePct)) +
          kv('In-state', pct(r.inStatePct) + ' <small>' + pct(r.intlPct) + ' intl</small>') +
          kv('First-gen', pct(r.firstGenPct)) +
          kv('Avg aid', money(r.avgAid)) +
          kv('Graduated', num(r.graduated)) +
          kv('Left early', num(r.dropped)) +
          kv('Pledged Greek', num(r.pledged)) +
          kv('Students now', num(s.students.length)) +
        '</div>' +
        (r.standouts.length || r.troubleIn
          ? '<p class="small"><b>Standouts in this class:</b> ' + r.standouts.slice(0, 8).map(x => esc(x.name) + ' <span class="muted">(' + esc(hookLabel(x.hook)) + ')</span>').join(', ') + (r.standouts.length > 8 ? ' and ' + (r.standouts.length - 8) + ' more' : '') +
            (r.troubleIn ? (r.standouts.length ? '. ' : '') + '<span class="tone-bad">' + plural(r.troubleIn, 'student') + ' with disciplinary records enrolled.</span>' : '') + '</p>'
          : '') +
        ((r.early || r.staffRead || r.outcome && r.outcome.graduated)
          ? '<p class="small report-notes">' + [
              r.early ? '<b>Early round:</b> ' + plural(r.early.committed, 'Early Decision commit') + ', ' + num(r.early.eaAdmitted) + ' admitted Early Action, ' + num(r.early.deferred) + ' deferred.' : '',
              r.staffRead && r.staffRead.read ? '<b>Staff</b> read ' + plural(r.staffRead.read, 'leftover file') + ' (' + r.staffRead.admit + ' admitted, ' + r.staffRead.hold + ' waitlisted, ' + r.staffRead.deny + ' denied).' : '',
              r.outcome && r.outcome.graduated ? '<b>Class of ' + r.outcome.year + ':</b> ' + pct(r.outcome.gradRate) + ' graduated, ' + pct(r.outcome.placed) + ' employed or in grad school, median starting salary ' + money(r.outcome.salary) + '.' : ''
            ].filter(Boolean).join('<br>') + '</p>'
          : '') +
        '<section class="report-events"><h3>Campus headlines</h3>' +
          (shown.length
            ? '<ul class="events">' + shown.map(e => '<li class="ev-' + e.tone + '"><span>' + esc(e.text) + '</span>' + fx(e) + '</li>').join('') + '</ul>' +
              (events.length > shown.length ? '<p class="muted small">…and ' + (events.length - shown.length) + ' more in Campus news.</p>' : '')
            : '<p class="muted">A quiet year on campus.</p>') +
        '</section>' +
        '<div class="report-cols">' +
          '<section><h3>Athletics</h3>' + sportsRows +
            '<h3>Campus</h3><p class="small">Campus life <b>' + Math.round(r.life) + '</b>/100 · Buzz ' + r.buzzBefore.toFixed(1) + ' → <b>' + r.buzzAfter.toFixed(1) + '</b><br>' +
            num(r.housing.residents) + ' living on campus in ' + num(r.housing.beds) + ' beds' + (r.housing.overflow ? ' · <span class="tone-bad">' + num(r.housing.overflow) + ' without a bed</span>' : '') + '</p>' +
          '</section>' +
          '<section><h3>Money</h3><table class="ledger"><tbody>' +
            '<tr><td>Revenue</td><td class="num">' + money(r.finance.totalRev) + '</td></tr>' +
            '<tr><td>Expenses</td><td class="num">' + money(r.finance.totalExp) + '</td></tr>' +
            (r.eventMoney ? '<tr><td>Gifts & costs from headlines</td><td class="num ' + (r.eventMoney > 0 ? 'tone-good' : 'tone-bad') + '">' + (r.eventMoney > 0 ? '+' : '') + money(r.eventMoney) + '</td></tr>' : '') +
            (r.gift ? '<tr><td>Alumni gift</td><td class="num tone-good">+' + money(r.gift) + '</td></tr>' : '') +
            '<tr class="ledger-total"><td>Budget</td><td class="num ' + (r.budgetAfter < 0 ? 'tone-bad' : '') + '">' + money(r.budgetAfter) + '</td></tr>' +
          '</tbody></table>' +
          '<h3>Prestige</h3><p class="report-prestige">' + r.prestigeBefore.toFixed(1) + ' → <b>' + r.prestigeAfter.toFixed(1) + '</b> <span class="' + (dP >= 0 ? 'tone-good' : 'tone-bad') + '">(' + (dP >= 0 ? '+' : '') + dP.toFixed(1) + ')</span></p>' +
          (r.eventPrestige ? '<p class="muted small">' + (r.eventPrestige > 0 ? '+' : '') + r.eventPrestige.toFixed(1) + ' of that came from your students’ headlines.</p>' : '') +
          '</section>' +
        '</div>' +
        '<p class="muted small">Next cycle: about <b>' + num(s.applicants.length) + '</b> applications are waiting.</p>' +
        (r.budgetAfter < 0 ? '<p class="note">The school is in debt. Raise tuition, trim aid or programs, or keep going: this is a sandbox.</p>' : ''),
      confirmLabel: 'Open the ' + s.year + ' cycle',
      onConfirm: () => { ui.tab = 'applications'; render(); }
    });
  }

  // ---------- render ----------
  // Replacing a focused, edited input fires its change event mid-render; run that render afterwards instead.
  let rendering = false, renderAgain = false;
  function render() {
    if (rendering) { renderAgain = true; return; }
    rendering = true;
    try {
      if (ui.screen === 'menu') app.innerHTML = renderMenu();
      else if (ui.screen === 'setup') app.innerHTML = renderSetup();
      else app.innerHTML = renderGame();
    } finally {
      rendering = false;
    }
    if (renderAgain) { renderAgain = false; render(); }
  }
  // Re-render while keeping a text box focused.
  function renderKeepFocus(id) {
    const el = document.getElementById(id);
    const had = el && document.activeElement === el;
    render();
    if (had) { const n = document.getElementById(id); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }
  }

  // ---------- events ----------
  function bulkDecide(test, decision) {
    let n = 0;
    for (const a of viewList()) if (a.decision === 'pending' && !G.isLocked(a) && test(a) && G.setDecision(a, decision)) n++;
    G.save();
    render();
    return n;
  }

  const actions = {
    'new-game': () => { ui.setup = defaultSetup(); ui.screen = 'setup'; render(); window.scrollTo(0, 0); },
    'continue': () => {
      if (G.load()) { ui.screen = 'game'; ui.tab = 'office'; ui.page = 0; render(); window.scrollTo(0, 0); }
    },
    'toggle-howto': () => { ui.showHowTo = !ui.showHowTo; render(); },
    'to-menu': () => { if (G.state) G.saveNow(); ui.screen = 'menu'; ui.openId = null; renderDrawer(); render(); window.scrollTo(0, 0); },
    'random-name': () => { ui.setup.name = G.randomSchoolName(); render(); },
    'random-mascot': () => { ui.setup.mascot = G.pick(D.MASCOTS); render(); },
    'preset': el => {
      const p = D.COLOR_PRESETS[+el.dataset.i];
      ui.setup.primary = p.primary;
      ui.setup.secondary = p.secondary;
      render();
    },
    'tab': el => { ui.tab = el.dataset.tab; render(); window.scrollTo({ top: 0 }); },
    'end-season': askEndSeason,
    'release-early': askReleaseEarly,
    'staff-read': () => {
      const out = G.staffRead(viewList());
      render();
      toast(out.read ? 'Staff read ' + plural(out.read, 'file') + ': ' + out.admit + ' admitted, ' + out.hold + ' ' + (isEarlyPhase() ? 'deferred' : 'waitlisted') + ', ' + out.deny + ' denied' + (out.flagged ? ', ' + out.flagged + ' flagged for you' : '') + '.' : 'Your staff have no reads left this cycle.');
    },
    'readers': el => { G.setReaders(G.state.staff.readers + +el.dataset.d); render(); },
    'campaign': el => { G.toggleCampaign(el.dataset.kind, el.dataset.id); render(); },
    'ask-division': el => {
      const target = el.dataset.id;
      const d = D.DIVISIONS[target];
      const chk = G.divisionCheck(target);
      if (!chk.ok) { showModal({ title: 'Not yet eligible for ' + d.label, body: '<ul class="warn-list">' + chk.reasons.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>', confirmLabel: 'OK', cancel: false }); return; }
      showModal({
        title: (chk.up ? 'Move up to ' : 'Move down to ') + d.label + '?',
        body: '<p>' + esc(d.note) + '</p>' + (chk.up
          ? '<p>You pay a ' + money(d.fee) + ' membership fee and spend ' + plural(d.transition, 'year') + ' in transition: no conference titles and half the TV money. Athletic scholarships cost ' + money(d.schol) + ' per roster spot each year.</p>'
          : '<p>You’ll save on scholarships, but lose TV money and the best recruits.</p>') +
          '<p>You’ll join the ' + esc(D.CONFERENCES.filter(c => c.div === target).sort((a, b) => a.minPrestige - b.minPrestige)[0].name) + '.</p>',
        confirmLabel: chk.up ? 'Move up' : 'Move down', danger: !chk.up,
        onConfirm: () => { G.changeDivision(target); render(); toast('Welcome to ' + d.label + '.'); }
      });
    },
    'join-conference': el => {
      const chk = G.conferenceCheck(el.dataset.id);
      const c = D.CONFERENCES.find(x => x.id === el.dataset.id);
      if (!chk.ok) { toast(chk.reasons[0]); return; }
      showModal({
        title: 'Join the ' + esc(c.name) + '?',
        body: '<p>Leaving your current conference costs a ' + money(500000) + ' exit fee. The ' + esc(c.name) + ' pays ' + money(c.tv) + ' a year in TV money.</p>',
        confirmLabel: 'Join',
        onConfirm: () => { G.joinConference(c.id); render(); toast('Joined the ' + c.name + '.'); }
      });
    },
    'filter': el => { ui.filter = el.dataset.filter; ui.page = 0; render(); },
    'page': el => {
      ui.page = Math.max(0, ui.page + +el.dataset.d);
      refreshAppTable();
      const t = document.getElementById('app-table');
      if (t) t.scrollIntoView({ block: 'start' });
    },
    'sort': el => {
      const k = el.dataset.key;
      if (ui.sort.key === k) ui.sort.dir *= -1;
      else ui.sort = { key: k, dir: ['name', 'major', 'decision'].includes(k) ? 1 : -1 };
      ui.page = 0;
      refreshAppTable();
    },
    'open-app': el => openApp(+el.dataset.id, true),
    'close-app': closeApp,
    'prev-app': () => stepApp(-1),
    'next-app': () => stepApp(1),
    'decide': el => decide(el.dataset.d),
    'scholarship': el => {
      G.setScholarship(ui.openId, +el.dataset.amt);
      openApp(ui.openId);
    },
    'bulk-admit': () => {
      const n = bulkDecide(a => a.idx >= ui.bulkAdmit, 'admit');
      toast(n ? 'Admitted ' + plural(n, 'applicant') + '.' : 'No pending files in this view at that index.');
    },
    'bulk-wait': () => {
      const n = bulkDecide(a => a.idx >= ui.bulkWait, 'waitlist');
      toast(n ? (isEarlyPhase() ? 'Deferred ' : 'Waitlisted ') + plural(n, 'applicant') + '.' : 'No pending files in this view at that index.');
    },
    'bulk-wait-rest': () => {
      const n = bulkDecide(() => true, 'waitlist');
      toast(n ? (isEarlyPhase() ? 'Deferred' : 'Waitlisted') + ' the remaining ' + plural(n, 'applicant') + '.' : 'No pending files in this view.');
    },
    'row-decide': el => {
      const a = G.state.applicants.find(x => x.id === +el.dataset.id);
      if (!G.setDecision(a, el.dataset.d)) return;
      G.save();
      refreshStatbar();
      if (ui.openId === a.id) renderDrawer();
    },
    'bulk-deny': () => {
      const n = bulkDecide(a => a.idx < ui.bulkDeny, 'deny');
      toast(n ? 'Denied ' + plural(n, 'applicant') + '.' : 'No pending files in this view below that index.');
    },
    'bulk-top': () => {
      const top = new Set(viewList().filter(a => a.decision === 'pending').sort((a, b) => b.idx - a.idx).slice(0, Math.max(0, ui.bulkTop)).map(a => a.id));
      const n = bulkDecide(a => top.has(a.id), 'admit');
      toast(n ? 'Admitted the top ' + plural(n, 'applicant') + '.' : 'No pending files in this view.');
    },
    'major-area': el => { ui.majorArea = el.dataset.id; render(); },
    'add-major': el => { G.addMajor(el.dataset.id); render(); toast('Opened ' + G.majorById(el.dataset.id).name + '. Schedule classes for it in Classes.'); },
    'goto-dept': el => { ui.classDept = el.dataset.id; ui.tab = 'classes'; render(); scrollToCatalog(); },
    'ask-drop-major': el => {
      const m = G.majorById(el.dataset.id);
      const n = G.state.students.filter(st => st.major === m.id).length;
      const nc = G.classesInDept(m.id).length;
      showModal({
        title: 'Close ' + esc(m.name) + '?',
        body: '<p>' + plural(n, 'current student') + ' will become undeclared and are more likely to leave. Its ' + plural(nc, 'class', 'classes') + ' will be removed. You save ' + money(m.cost) + ' a year.</p>',
        confirmLabel: 'Close department', danger: true,
        onConfirm: () => { G.dropMajor(m.id); render(); }
      });
    },
    'class-dept': el => { ui.classDept = el.dataset.id; render(); scrollToCatalog(); },
    'section-add': el => {
      const c = G.addClass(ui.classDept, +el.dataset.course, el.dataset.size);
      render();
      toast('Added ' + c.code + ' ' + c.title + ' (' + D.CLASS_SIZES[c.size].label.toLowerCase() + ').');
    },
    'section-remove': el => { G.removeSection(ui.classDept, +el.dataset.course, el.dataset.size); render(); },
    'staff-dept': el => {
      const n = G.staffDepartment(el.dataset.id);
      render();
      toast(n ? 'Added ' + plural(n, 'section') + ' to ' + G.deptById(el.dataset.id).name + '.' : 'That department is already staffed.');
    },
    'fill-gap': () => {
      const n = G.fillSeatGap();
      render();
      toast('Added ' + plural(n, 'Gen Ed lecture hall') + '.');
    },
    'add-sport': el => { G.addSport(el.dataset.id); render(); toast('Launched ' + G.sportById(el.dataset.id).name + '. Admit recruits to fill the roster.'); },
    'ask-cut-sport': el => {
      const sp = G.sportById(el.dataset.id);
      const n = G.rosterFor(sp.id).length;
      showModal({
        title: 'Cut ' + esc(sp.name) + '?',
        body: '<p>The ' + plural(n, 'recruit') + ' on the roster stay enrolled but won’t play. Recruits for this sport will be less likely to enroll. You save ' + money(sp.cost) + ' a year.</p>',
        confirmLabel: 'Cut program', danger: true,
        onConfirm: () => { G.cutSport(sp.id); render(); }
      });
    },
    'build-dorm': el => {
      const d = G.buildDorm(el.dataset.id);
      render();
      toast(d ? 'Opened ' + d.name + '.' : 'Not enough money to build that.');
    },
    'ask-close-dorm': el => {
      const d = G.state.dorms.find(x => x.id === +el.dataset.id);
      if (!d) return;
      const spec = D.DORMS[d.type];
      showModal({
        title: 'Close ' + esc(d.name) + '?',
        body: '<p>You lose ' + num(spec.beds) + ' beds and save ' + money(spec.beds * spec.upkeep) + ' a year in upkeep. There’s no refund on the building.</p>',
        confirmLabel: 'Close hall', danger: true,
        onConfirm: () => { G.closeDorm(d.id); render(); }
      });
    },
    'charter': el => {
      const c = G.charterChapter(el.dataset.name, el.dataset.kind);
      render();
      toast(c ? 'Chartered ' + c.name + '. Freshmen can pledge at the end of the season.' : 'Couldn’t charter that chapter.');
    },
    'build-house': el => {
      const ok = G.buildChapterHouse(+el.dataset.id);
      render();
      toast(ok ? 'Chapter house built. It adds ' + D.GREEK.houseBeds + ' beds.' : 'Not enough money for a chapter house.');
    },
    'ask-close-chapter': el => {
      const c = chapterById(+el.dataset.id);
      if (!c) return;
      const n = G.chapterMembers(c.id);
      showModal({
        title: 'Shut down ' + esc(c.name) + '?',
        body: '<p>' + plural(n, 'member') + ' lose their chapter.' + (c.house ? ' The chapter house and its ' + D.GREEK.houseBeds + ' beds close too.' : '') + ' You save ' + money(D.GREEK.upkeep) + ' a year.</p>',
        confirmLabel: 'Shut down', danger: true,
        onConfirm: () => { G.closeChapter(c.id); render(); }
      });
    },
    'close-modal': closeModal,
    'confirm-modal': () => { const m = ui.modal; closeModal(); if (m && m.onConfirm) m.onConfirm(); }
  };

  function scrollToCatalog() {
    const el = document.getElementById('course-catalog');
    if (el) el.previousElementSibling.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled || !el.dataset.action) return;
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'setup-form') {
      const s = ui.setup;
      s.name = s.name.trim();
      s.mascot = s.mascot.trim();
      if (!s.name) { document.getElementById('setup-name').focus(); toast('Give your school a name first.'); return; }
      G.newGame({ ...s, mascot: s.mascot || 'Mascots' });
      ui.screen = 'game';
      ui.tab = 'office';
      ui.filter = 'pending';
      ui.view = 'all';
      ui.page = 0;
      render();
      window.scrollTo(0, 0);
    }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.setup) {
      ui.setup[t.dataset.setup] = t.value;
      if (t.dataset.setup === 'primary' || t.dataset.setup === 'secondary') {
        setSchoolColors(ui.setup.primary, ui.setup.secondary);
        document.querySelectorAll('.swatch').forEach(sw => sw.classList.remove('is-on'));
      }
      const pv = document.getElementById('setup-preview');
      if (pv) pv.innerHTML = setupPreview();
    } else if (t.id === 'app-search') {
      ui.search = t.value;
      ui.page = 0;
      refreshAppTable();
    } else if (t.id === 'major-search') {
      ui.majorSearch = t.value;
      renderKeepFocus('major-search');
    } else if (t.dataset.ui) {
      ui[t.dataset.ui] = +t.value;
    }
  });

  function setPath(obj, path, v) {
    const keys = path.split('.');
    const last = keys.pop();
    for (const k of keys) obj = obj[k];
    obj[last] = v;
  }

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.setup === 'type' || t.dataset.setup === 'state') {
      ui.setup[t.dataset.setup] = t.value;
      render();
    } else if (t.dataset.bind) {
      const v = Math.round(+t.value);
      const min = +t.min, max = +t.max, scale = +t.dataset.scale || 1;
      if (t.value === '' || !Number.isFinite(v)) { render(); return; }
      setPath(G.state, t.dataset.bind, Math.max(min, Math.min(max, v)) / scale);
      G.save();
      render();
    } else if (t.dataset.bindCheck) {
      setPath(G.state, t.dataset.bindCheck, t.checked);
      G.save();
      render();
    } else if (t.dataset.bindSelect) {
      const v = t.value;
      setPath(G.state, t.dataset.bindSelect, /^-?\d+$/.test(v) ? +v : v);
      G.save();
      render();
    } else if (t.dataset.uiCheck) {
      ui[t.dataset.uiCheck] = t.checked;
    } else if (t.dataset.uiSelect) {
      ui[t.dataset.uiSelect] = t.value;
      ui.page = 0;
      render();
    } else if (t.dataset.greekPolicy) {
      G.setGreekPolicy(t.value);
      render();
    }
  });

  document.addEventListener('keydown', e => {
    if (ui.modal) {
      if (e.key === 'Escape' && ui.modal.dismissable !== false) closeModal();
      return;
    }
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox';
    if (ui.screen === 'game' && ui.openId != null && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'a') decide('admit');
      else if (k === 'w') decide('waitlist');
      else if (k === 'd') decide('deny');
      else if (k === 'arrowright' || k === 'j') stepApp(1);
      else if (k === 'arrowleft' || k === 'k') stepApp(-1);
      else if (k === 'escape') closeApp();
      else return;
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-action="open-app"]')) {
      openApp(+e.target.dataset.id, true);
    }
  });

  // Writes are batched; make sure the last one lands when the tab closes.
  window.addEventListener('pagehide', () => G.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') G.flush(); });

  let toastTimer = null;
  function toast(text) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toast', className: 'toast' }));
      el.setAttribute('role', 'status');
    }
    el.textContent = text;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  render();
})();
