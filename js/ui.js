/* College Builder — screens, rendering and input handling. */
(function () {
  'use strict';
  const D = window.CB_DATA;
  const G = window.Game;

  const app = document.getElementById('app');
  const drawerRoot = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'drawer-root' }));
  const modalRoot = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'modal-root' }));

  const ui = {
    screen: 'menu',
    showHowTo: false,
    setup: null,
    tab: 'office',
    filter: 'pending',
    sort: { key: 'idx', dir: -1 },
    search: '',
    openId: null,
    navIds: [],
    autoAdvance: true,
    stampAnim: false,
    advanceTimer: null,
    classForm: { dept: 'gen', course: 0, size: 'standard' },
    bulkAdmit: 70,
    bulkDeny: 35,
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
  const pct = v => Math.round(v * 100) + '%';
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const majorName = id => (id === 'undeclared' ? 'Undeclared' : (G.majorById(id) || {}).name || 'Undeclared');
  const hometown = a => a.city + ', ' + a.region;
  const testLabel = a => (a.sat ? 'SAT ' + a.sat : a.act ? 'ACT ' + a.act : 'Test-optional');
  const testSortValue = a => (a.sat ? a.sat : a.act ? 710 + (a.act - 12) * 37 : 0);
  const typeLabel = t => (t === 'public' ? 'Public' : 'Private');

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
  const DECISION_LABEL = { pending: 'Pending', admit: 'Admitted', waitlist: 'Waitlisted', deny: 'Denied' };
  const STAMP_LABEL = { admit: 'Admit', waitlist: 'Waitlist', deny: 'Deny' };

  function pennant(name, mascot, cls) {
    return '<div class="pennant ' + (cls || '') + '" aria-hidden="true"><span class="pennant-name">' + esc(name) +
      '</span>' + (mascot ? '<span class="pennant-mascot">' + esc(mascot) + '</span>' : '') + '</div>';
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
        '<li><strong>Read applications.</strong> Every cycle a new pool of students applies. Each file shows their GPA, weighted GPA, AP classes and scores, SAT or ACT, hometown, intended major and sport.</li>' +
        '<li><strong>Stamp a decision.</strong> Admit, waitlist or deny. Not everyone you admit will come. The enroll chance shows how likely each student is to say yes.</li>' +
        '<li><strong>Build the campus.</strong> Open majors, launch sports teams and schedule classes. Students want their major and their sport, and every student needs class seats. Everything costs money each year.</li>' +
        '<li><strong>End the season.</strong> Admitted students decide, seniors graduate, teams play, the budget settles and prestige moves. Then the next cycle opens.</li>' +
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
            typeCard('private', 'Private college', ['$40M starting budget', 'Tuition $42,000 for everyone', 'Larger alumni donations', 'Prestige 45']) +
          '</div>' +
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
  function renderGame() {
    const s = G.state;
    setSchoolColors(s.school.primary, s.school.secondary);
    const pending = s.applicants.filter(a => a.decision === 'pending').length;
    const cov = G.seatCoverage();
    const st = G.stateByCode(s.school.state);
    const tabs = [
      ['office', 'Office'],
      ['applications', 'Applications', pending],
      ['majors', 'Majors', s.majors.length],
      ['sports', 'Sports', s.sports.length],
      ['classes', 'Classes', s.classes.length]
    ];
    const body = { office: renderOffice, applications: renderApplications, majors: renderMajors, sports: renderSports, classes: renderClasses }[ui.tab]();

    return '<div class="game">' +
      '<header class="masthead">' +
        '<div class="mast-inner">' +
          '<div class="mast-id">' +
            pennant(s.school.name, '', 'pennant-sm') +
            '<div class="mast-text"><div class="mast-name">' + esc(s.school.name) + '</div>' +
            '<div class="mast-sub">' + esc(s.school.mascot) + ' · ' + typeLabel(s.school.type) + ' · ' + esc(st ? st.name : s.school.state) + '</div></div>' +
          '</div>' +
          '<div class="mast-cycle"><span class="eyebrow">Admissions cycle</span><strong>' + s.year + ' · Class of ' + (s.year + 4) + '</strong></div>' +
          '<div class="mast-actions">' +
            '<button class="btn btn-stripe" data-action="end-season">End season</button>' +
            '<button class="btn btn-on-school" data-action="to-menu">Menu</button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="statbar">' +
        stat('Budget', money(s.budget), s.budget < 0 ? 'bad' : '') +
        stat('Prestige', s.prestige.toFixed(1) + '<small>/100</small>') +
        stat('Students', s.students.length.toLocaleString()) +
        stat('Files pending', pending + '<small> of ' + s.applicants.length + '</small>') +
        stat('Seat coverage', pct(cov), cov < 1 ? 'bad' : '') +
      '</div>' +
      '<nav class="tabs" aria-label="Sections"><div class="tabs-inner" role="tablist">' +
        tabs.map(([id, label, n]) =>
          '<button role="tab" class="tab' + (ui.tab === id ? ' is-on' : '') + '" aria-selected="' + (ui.tab === id) + '" data-action="tab" data-tab="' + id + '">' +
          label + (n != null ? ' <span class="tab-count">' + n + '</span>' : '') + '</button>').join('') +
      '</div></nav>' +
      '<main class="panel" id="panel">' + body + '</main>' +
    '</div>';
  }

  function stat(label, value, tone) {
    return '<div class="stat' + (tone ? ' tone-' + tone : '') + '"><span class="stat-label">' + label + '</span><span class="stat-value">' + value + '</span></div>';
  }

  // ---------- office ----------
  function expectedFreshmen() {
    const s = G.state;
    const admits = s.applicants.filter(a => a.decision === 'admit');
    return admits.reduce((x, a) => x + G.enrollChance(a), 0);
  }

  function renderOffice() {
    const s = G.state;
    const counts = { admit: 0, waitlist: 0, deny: 0, pending: 0 };
    for (const a of s.applicants) counts[a.decision]++;
    const total = s.applicants.length || 1;
    const expected = expectedFreshmen();
    const fin = G.finances();
    const byYear = [1, 2, 3, 4].map(y => s.students.filter(st => st.yearInSchool === y).length);
    const yearNames = ['Freshmen', 'Sophomores', 'Juniors', 'Seniors'];
    const majorCounts = {};
    for (const st of s.students) majorCounts[st.major] = (majorCounts[st.major] || 0) + 1;
    const topMajors = Object.entries(majorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxMajor = topMajors.length ? topMajors[0][1] : 1;

    const cycle = '<section class="card span-2">' +
      '<div class="card-head"><h2>This cycle</h2><button class="btn btn-primary" data-action="tab" data-tab="applications">Review applications</button></div>' +
      '<div class="decision-bar" role="img" aria-label="' + counts.admit + ' admitted, ' + counts.waitlist + ' waitlisted, ' + counts.deny + ' denied, ' + counts.pending + ' pending">' +
        ['admit', 'waitlist', 'deny', 'pending'].map(k => counts[k] ? '<span class="seg seg-' + k + '" style="flex:' + counts[k] / total + '"></span>' : '').join('') +
      '</div>' +
      '<ul class="legend">' +
        ['admit', 'waitlist', 'deny', 'pending'].map(k => '<li><span class="dot dot-' + k + '"></span>' + DECISION_LABEL[k] + ' <b>' + counts[k] + '</b></li>').join('') +
      '</ul>' +
      '<div class="kv-row">' +
        kv('Applicants', s.applicants.length) +
        kv('Expected freshmen', Math.round(expected) + ' <small>of ' + s.targetClass + ' target</small>') +
        kv('Acceptance rate so far', pct(counts.admit / total)) +
      '</div>' +
      (expected < s.targetClass * 0.8 && counts.pending
        ? '<p class="note">You’re on pace for a small class. Students on the waitlist are offered seats if the class comes in under target.</p>' : '') +
    '</section>';

    const tuitionFields = s.school.type === 'public'
      ? numField('tuition-in', 'In-state tuition', s.tuitionIn, 0, 80000, 500, 'tuitionIn') +
        numField('tuition-out', 'Out-of-state tuition', s.tuitionOut, 0, 80000, 500, 'tuitionOut')
      : numField('tuition-in', 'Tuition', s.tuitionIn, 0, 80000, 500, 'tuitionIn');
    const policy = '<section class="card">' +
      '<div class="card-head"><h2>Policy</h2></div>' +
      '<div class="fields">' + tuitionFields +
        numField('target-class', 'Target class size', s.targetClass, 10, 2000, 5, 'targetClass') +
      '</div>' +
      '<p class="hint">Higher tuition brings in money but fewer admitted students enroll. The target class size decides how many waitlisted students get offered a seat.</p>' +
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
      '<div class="card-head"><h2>Student body</h2><span class="muted small">' + s.students.length + ' enrolled</span></div>' +
      '<div class="kv-row">' + byYear.map((n, i) => kv(yearNames[i], n)).join('') + '</div>' +
      '<h3 class="sub">Largest majors</h3>' +
      '<ul class="bars">' + topMajors.map(([id, n]) =>
        '<li><span class="bar-label">' + esc(majorName(id)) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + (n / maxMajor * 100) + '%"></span></span><span class="bar-num">' + n + '</span></li>').join('') +
      '</ul>' +
    '</section>';

    const history = '<section class="card span-2">' +
      '<div class="card-head"><h2>History</h2></div>' +
      (s.history.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>Cycle</th><th class="num">Applied</th><th class="num">Accept rate</th><th class="num">Yield</th><th class="num">Freshmen</th><th class="num">Avg GPA</th><th class="num">Students</th><th class="num">Prestige</th><th class="num">Net</th><th class="num">Budget</th></tr></thead><tbody>' +
          s.history.slice().reverse().map(h => '<tr><td>' + h.year + '</td><td class="num">' + h.applied + '</td><td class="num">' + pct(h.acceptRate) + '</td><td class="num">' + pct(h.yieldRate) + '</td><td class="num">' + h.enrolled + '</td><td class="num">' + (h.avgGpa != null ? h.avgGpa.toFixed(2) : '—') + '</td><td class="num">' + h.students + '</td><td class="num">' + h.prestige.toFixed(1) + '</td><td class="num ' + (h.net < 0 ? 'tone-bad' : '') + '">' + money(h.net) + '</td><td class="num">' + money(h.budget) + '</td></tr>').join('') +
          '</tbody></table></div>'
        : '<p class="muted">Your first cycle is underway. Results show up here after you end the season.</p>') +
    '</section>';

    const news = '<section class="card">' +
      '<div class="card-head"><h2>Campus news</h2></div>' +
      '<ul class="news">' + s.news.slice(0, 12).map(n => '<li><span class="news-year">' + n.year + '</span><span>' + esc(n.text) + '</span></li>').join('') + '</ul>' +
    '</section>';

    return '<div class="grid">' + cycle +
      '<div class="col">' + policy + enrollment + '</div>' +
      '<div class="col">' + finance + news + '</div>' +
      history + '</div>';
  }

  function kv(label, value) {
    return '<div class="kv"><span class="kv-label">' + label + '</span><span class="kv-value">' + value + '</span></div>';
  }
  function numField(id, label, value, min, max, step, key) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<input type="number" id="' + id + '" data-bind="' + key + '" value="' + value + '" min="' + min + '" max="' + max + '" step="' + step + '" inputmode="numeric"></div>';
  }

  // ---------- applications ----------
  function currentList() {
    const s = G.state;
    const q = ui.search.trim().toLowerCase();
    let list = s.applicants.filter(a => ui.filter === 'all' || a.decision === ui.filter);
    if (q) {
      list = list.filter(a => (a.name + ' ' + hometown(a) + ' ' + majorName(a.major) + ' ' + (a.sport ? G.sportById(a.sport).name : '')).toLowerCase().includes(q));
    }
    const k = ui.sort.key, dir = ui.sort.dir;
    const val = {
      name: a => a.name.split(' ').slice(-1)[0] + a.name,
      from: a => hometown(a),
      gpa: a => a.gpa, wgpa: a => a.wgpa, aps: a => a.aps.length, test: testSortValue, idx: a => a.idx,
      major: a => majorName(a.major), sport: a => (a.sport ? a.stars * 100 + G.sportById(a.sport).name.charCodeAt(0) : -1),
      yield: a => G.enrollChance(a), decision: a => a.decision
    }[k];
    list.sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
    return list;
  }

  function renderApplications() {
    const s = G.state;
    const counts = { all: s.applicants.length, pending: 0, admit: 0, waitlist: 0, deny: 0 };
    for (const a of s.applicants) counts[a.decision]++;
    const filters = [['pending', 'Pending'], ['admit', 'Admitted'], ['waitlist', 'Waitlisted'], ['deny', 'Denied'], ['all', 'All']];
    const expected = expectedFreshmen();

    return '<div class="apps">' +
      '<div class="apps-toolbar">' +
        '<div class="chips" role="group" aria-label="Filter applications">' +
          filters.map(([id, label]) => '<button class="chip-btn' + (ui.filter === id ? ' is-on' : '') + '" data-action="filter" data-filter="' + id + '" aria-pressed="' + (ui.filter === id) + '">' + label + ' <b>' + counts[id] + '</b></button>').join('') +
        '</div>' +
        '<input type="search" id="app-search" class="search" placeholder="Search name, town, major, sport" value="' + esc(ui.search) + '" aria-label="Search applications">' +
      '</div>' +
      '<div class="apps-bulk">' +
        '<div class="bulk"><label for="bulk-admit">Admit every pending file with Academic Index at least</label>' +
          '<input type="number" id="bulk-admit" data-ui="bulkAdmit" value="' + ui.bulkAdmit + '" min="0" max="100">' +
          '<button class="btn btn-small btn-admit" data-action="bulk-admit">Admit</button></div>' +
        '<div class="bulk"><label for="bulk-deny">Deny every pending file below</label>' +
          '<input type="number" id="bulk-deny" data-ui="bulkDeny" value="' + ui.bulkDeny + '" min="0" max="100">' +
          '<button class="btn btn-small btn-deny" data-action="bulk-deny">Deny</button></div>' +
        '<div class="bulk-summary">Expected freshmen <b>' + Math.round(expected) + '</b> of ' + s.targetClass + ' target</div>' +
      '</div>' +
      '<div id="app-table">' + renderAppTable() + '</div>' +
    '</div>';
  }

  function renderAppTable() {
    const list = currentList();
    if (!list.length) {
      return '<div class="empty"><p>No applications match.</p>' +
        (ui.filter === 'pending' ? '<p class="muted">Every file has a decision. End the season from the top bar when you’re ready.</p>' : '') + '</div>';
    }
    const cols = [
      ['name', 'Applicant'], ['gpa', 'GPA', 'num'], ['wgpa', 'Weighted', 'num'], ['aps', 'APs', 'num'],
      ['test', 'Test', 'num'], ['idx', 'Index', 'num'], ['major', 'Intended major'], ['sport', 'Sport'],
      ['yield', 'Enroll chance'], ['decision', 'Decision']
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
      return '<tr class="row' + (ui.openId === a.id ? ' is-open' : '') + '" data-action="open-app" data-id="' + a.id + '" tabindex="0">' +
        '<td><div class="cell-name">' + esc(a.name) + '</div><div class="cell-sub">' + esc(hometown(a)) + (a.intl ? ' <span class="tag">Intl</span>' : a.stateCode === s.school.state ? ' <span class="tag">In-state</span>' : '') + '</div></td>' +
        '<td class="num">' + a.gpa.toFixed(2) + '</td>' +
        '<td class="num">' + a.wgpa.toFixed(2) + '</td>' +
        '<td class="num">' + a.aps.length + '</td>' +
        '<td class="num nowrap">' + testLabel(a) + '</td>' +
        '<td class="num"><span class="idx">' + a.idx + '</span></td>' +
        '<td>' + esc(majorName(a.major)) + (s.majors.includes(a.major) ? '' : ' <span class="tag tag-bad">Not offered</span>') + '</td>' +
        '<td>' + (sp ? esc(sp.name) + ' <span class="stars" aria-label="' + a.stars + ' of 5 stars">' + stars(a.stars) + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td><span class="pill tone-' + yieldTone(p) + '">' + yieldWord(p) + ' ' + pct(p) + '</span></td>' +
        '<td><span class="decision decision-' + a.decision + '">' + DECISION_LABEL[a.decision] + '</span></td>' +
      '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="table table-apps"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
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
    const aps = a.aps.slice().sort((x, y) => y.score - x.score);
    const factors = G.enrollFactors(a);

    drawerRoot.innerHTML =
      '<div class="scrim" data-action="close-app"></div>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="folder-name" tabindex="-1">' +
        '<div class="drawer-nav">' +
          '<button class="btn btn-ghost btn-small" data-action="prev-app"' + (pos <= 0 ? ' disabled' : '') + '>← Prev</button>' +
          '<span class="muted small">' + (pos >= 0 ? (pos + 1) + ' of ' + ui.navIds.length : '') + '</span>' +
          '<button class="btn btn-ghost btn-small" data-action="next-app"' + (pos < 0 || pos >= ui.navIds.length - 1 ? ' disabled' : '') + '>Next →</button>' +
          '<button class="btn btn-ghost btn-small drawer-close" data-action="close-app" aria-label="Close file">Close</button>' +
        '</div>' +
        '<div class="drawer-body"><div class="folder folder-full">' +
          '<div class="folder-tab">Application № ' + String(a.id).padStart(4, '0') + '</div>' +
          '<header class="folder-head">' +
            '<h2 id="folder-name">' + esc(a.name) + '</h2>' +
            '<p class="folder-from">' + esc(hometown(a)) + (a.intl ? ' · International' : a.stateCode === s.school.state ? ' · In-state' : ' · Out-of-state') + '</p>' +
          '</header>' +
          '<dl class="folder-grid">' +
            '<div><dt>GPA</dt><dd>' + a.gpa.toFixed(2) + '<small>/4.0</small></dd></div>' +
            '<div><dt>Weighted GPA</dt><dd>' + a.wgpa.toFixed(2) + '<small>/5.0</small></dd></div>' +
            '<div><dt>' + (a.sat ? 'SAT' : a.act ? 'ACT' : 'Test') + '</dt><dd>' + (a.sat ? a.sat + '<small>/1600</small>' : a.act ? a.act + '<small>/36</small>' : '<span class="dd-text">Optional</span>') + '</dd></div>' +
            '<div><dt>Academic Index</dt><dd>' + a.idx + '<small>/100</small></dd></div>' +
          '</dl>' +
          '<section class="folder-sec">' +
            '<h3>AP classes <span class="muted">(' + a.aps.length + ')</span></h3>' +
            (aps.length
              ? '<ul class="ap-list">' + aps.map(x => '<li><span>AP ' + esc(x.name) + '</span><span class="ap-score ap-' + x.score + '" title="AP exam score">' + x.score + '</span></li>').join('') + '</ul>'
              : '<p class="muted">No AP classes taken.</p>') +
          '</section>' +
          '<section class="folder-sec folder-two">' +
            '<div><h3>Intended major</h3><p>' + esc(majorName(a.major)) + ' ' + (s.majors.includes(a.major) ? '<span class="tag tag-good">Offered</span>' : '<span class="tag tag-bad">Not offered</span>') + '</p></div>' +
            '<div><h3>Athletics</h3><p>' + (sp ? esc(sp.name) + ' <span class="stars">' + stars(a.stars) + '</span> ' + (s.sports.includes(a.sport) ? '<span class="tag tag-good">Team</span>' : '<span class="tag tag-bad">No team</span>') : 'Not a recruit') + '</p></div>' +
          '</section>' +
          '<section class="folder-sec">' +
            '<h3>Activities</h3><ul class="acts">' + a.activities.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
          '</section>' +
          '<section class="folder-sec">' +
            '<h3>Enroll chance if admitted <span class="pill tone-' + yieldTone(p) + '">' + yieldWord(p) + ' ' + pct(p) + '</span></h3>' +
            '<ul class="factors">' + factors.map(f => '<li class="f-' + f.tone + '">' + esc(f.text) + '</li>').join('') + '</ul>' +
            '<p class="hint">Tuition for this student: $' + G.tuitionFor(a).toLocaleString() + ' a year.</p>' +
          '</section>' +
          (a.decision !== 'pending'
            ? '<div class="stamp stamp-' + a.decision + (ui.stampAnim ? ' stamp-in' : ' stamp-static') + '">' + STAMP_LABEL[a.decision] + '</div>' : '') +
        '</div></div>' +
        '<div class="drawer-actions">' +
          '<button class="btn btn-admit" data-action="decide" data-d="admit"' + (a.decision === 'admit' ? ' aria-pressed="true"' : '') + '><kbd>A</kbd> Admit</button>' +
          '<button class="btn btn-wait" data-action="decide" data-d="waitlist"' + (a.decision === 'waitlist' ? ' aria-pressed="true"' : '') + '><kbd>W</kbd> Waitlist</button>' +
          '<button class="btn btn-deny" data-action="decide" data-d="deny"' + (a.decision === 'deny' ? ' aria-pressed="true"' : '') + '><kbd>D</kbd> Deny</button>' +
          (a.decision !== 'pending' ? '<button class="btn btn-ghost btn-small" data-action="decide" data-d="pending">Undo</button>' : '') +
          '<label class="toggle" for="auto-advance"><input type="checkbox" id="auto-advance" data-ui-check="autoAdvance"' + (ui.autoAdvance ? ' checked' : '') + '> Next file after stamping</label>' +
        '</div>' +
      '</aside>';
    ui.stampAnim = false;
  }

  function openApp(id, refreshNav) {
    clearTimeout(ui.advanceTimer);
    if (refreshNav || !ui.navIds.includes(id)) ui.navIds = currentList().map(a => a.id);
    ui.openId = id;
    renderDrawer();
    refreshAppTable();
    const d = drawerRoot.querySelector('.drawer');
    if (d) d.focus({ preventScroll: true });
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
    a.decision = d;
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

  // ---------- majors ----------
  function renderMajors() {
    const s = G.state;
    const studentCount = id => s.students.filter(st => st.major === id).length;
    const demand = id => s.applicants.filter(a => a.major === id).length;
    const offered = s.majors.map(G.majorById).sort((a, b) => a.name.localeCompare(b.name));
    const catalog = D.MAJORS.filter(m => !s.majors.includes(m.id)).sort((a, b) => demand(b.id) - demand(a.id));
    const undeclared = studentCount('undeclared');

    return '<div class="stack">' +
      '<section class="card">' +
        '<div class="card-head"><h2>Majors you offer</h2><span class="muted small">' + offered.length + ' departments · ' + money(offered.reduce((x, m) => x + m.cost, 0)) + ' a year</span></div>' +
        '<p class="hint">Applicants whose major you don’t offer are far less likely to enroll. A major with at least 2 classes is more attractive.</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Major</th><th>Dept</th><th class="num">Students</th><th class="num">Applicants this cycle</th><th class="num">Classes</th><th class="num">Cost / year</th><th></th></tr></thead><tbody>' +
        offered.map(m => {
          const nc = G.classesInDept(m.id).length;
          return '<tr><td><b>' + esc(m.name) + '</b></td><td class="mono">' + m.dept + '</td><td class="num">' + studentCount(m.id) + '</td><td class="num">' + demand(m.id) + '</td>' +
            '<td class="num">' + (nc < 2 ? '<span class="tone-warn">' + nc + '</span>' : nc) + '</td><td class="num">' + money(m.cost) + '</td>' +
            '<td class="act"><button class="btn btn-ghost btn-small" data-action="ask-drop-major" data-id="' + m.id + '">Close</button></td></tr>';
        }).join('') +
        (undeclared ? '<tr><td class="muted">Undeclared</td><td></td><td class="num">' + undeclared + '</td><td colspan="4" class="muted small">Students whose department closed</td></tr>' : '') +
        '</tbody></table></div>' +
      '</section>' +
      '<section>' +
        '<div class="section-head"><h2>Catalog</h2><span class="muted small">Sorted by applicant interest this cycle</span></div>' +
        '<div class="catalog">' +
        catalog.map(m => '<article class="cat-item">' +
          '<div class="cat-top"><h3>' + esc(m.name) + '</h3><span class="mono muted">' + m.dept + '</span></div>' +
          '<dl class="cat-meta"><div><dt>Cost / year</dt><dd>' + money(m.cost) + '</dd></div><div><dt>Applicants want it</dt><dd>' + demand(m.id) + '</dd></div></dl>' +
          '<p class="cat-note">Courses: ' + m.courses.map(esc).join(', ') + '</p>' +
          '<button class="btn btn-primary btn-small" data-action="add-major" data-id="' + m.id + '">Open department</button>' +
        '</article>').join('') +
        '</div>' +
      '</section>' +
    '</div>';
  }

  // ---------- sports ----------
  function renderSports() {
    const s = G.state;
    const recruitsApplying = id => s.applicants.filter(a => a.sport === id).length;
    const offered = s.sports.map(G.sportById).sort((a, b) => a.name.localeCompare(b.name));
    const catalog = D.SPORTS.filter(x => !s.sports.includes(x.id)).sort((a, b) => recruitsApplying(b.id) - recruitsApplying(a.id));

    return '<div class="stack">' +
      '<section class="card">' +
        '<div class="card-head"><h2>Varsity teams</h2><span class="muted small">' + offered.length + ' programs · ' + money(offered.reduce((x, sp) => x + sp.cost, 0)) + ' a year</span></div>' +
        '<p class="hint">Teams win with recruited athletes. Admit recruits with high star ratings to build a roster. Winning teams sell more tickets and lift prestige.</p>' +
        (offered.length
          ? '<div class="table-wrap"><table class="table"><thead><tr><th>Team</th><th class="num">Recruits on roster</th><th class="num">Avg rating</th><th class="num">Recruits applying</th><th>Last season</th><th class="num">Cost / year</th><th class="num">Revenue (avg year)</th><th></th></tr></thead><tbody>' +
            offered.map(sp => {
              const roster = G.rosterFor(sp.id);
              const avg = roster.length ? roster.reduce((x, st) => x + st.stars, 0) / roster.length : 0;
              const rec = s.sportRecords[sp.id];
              return '<tr><td><b>' + esc(sp.name) + '</b></td><td class="num">' + roster.length + ' <span class="muted small">/ ' + sp.roster + '</span></td>' +
                '<td class="num">' + (roster.length ? avg.toFixed(1) + ' ★' : '—') + '</td><td class="num">' + recruitsApplying(sp.id) + '</td>' +
                '<td>' + (rec ? '<span class="record ' + (rec.w >= rec.l ? 'tone-good' : 'tone-bad') + '">' + rec.w + '–' + rec.l + '</span>' : '<span class="muted">First season ahead</span>') + '</td>' +
                '<td class="num">' + money(sp.cost) + '</td><td class="num">' + money(sp.revenue) + '</td>' +
                '<td class="act"><button class="btn btn-ghost btn-small" data-action="ask-cut-sport" data-id="' + sp.id + '">Cut</button></td></tr>';
            }).join('') +
            '</tbody></table></div>'
          : '<p class="muted">No varsity teams. Launch one from the catalog below.</p>') +
      '</section>' +
      '<section>' +
        '<div class="section-head"><h2>Catalog</h2><span class="muted small">Sorted by recruits applying this cycle</span></div>' +
        '<div class="catalog">' +
        catalog.map(sp => '<article class="cat-item">' +
          '<div class="cat-top"><h3>' + esc(sp.name) + '</h3><span class="muted small">' + sp.roster + ' on roster</span></div>' +
          '<dl class="cat-meta"><div><dt>Cost / year</dt><dd>' + money(sp.cost) + '</dd></div><div><dt>Revenue</dt><dd>' + money(sp.revenue) + '</dd></div><div><dt>Recruits applying</dt><dd>' + recruitsApplying(sp.id) + '</dd></div></dl>' +
          '<button class="btn btn-primary btn-small" data-action="add-sport" data-id="' + sp.id + '">Launch program</button>' +
        '</article>').join('') +
        '</div>' +
      '</section>' +
    '</div>';
  }

  // ---------- classes ----------
  function renderClasses() {
    const s = G.state;
    const seats = G.totalSeats(), need = G.seatsNeeded(), cov = G.seatCoverage();
    const quality = G.classQuality();
    const depts = ['gen'].concat(s.majors.slice().sort((a, b) => G.majorById(a).name.localeCompare(G.majorById(b).name)));
    if (!depts.includes(ui.classForm.dept)) ui.classForm.dept = 'gen';
    const dept = G.deptById(ui.classForm.dept);
    if (ui.classForm.course >= dept.courses.length) ui.classForm.course = 0;
    const sizeOpts = Object.entries(D.CLASS_SIZES).map(([k, v]) =>
      '<option value="' + k + '"' + (ui.classForm.size === k ? ' selected' : '') + '>' + v.label + ' · ' + v.seats + ' seats · ' + money(v.cost) + '/yr</option>').join('');
    const fillPct = Math.min(100, cov * 100);

    const groups = depts.map(id => {
      const list = G.classesInDept(id).sort((a, b) => a.code.localeCompare(b.code) || a.section - b.section);
      const d = G.deptById(id);
      return '<tr class="group-row"><th colspan="6">' + esc(d.name) + ' <span class="muted small">' + list.length + ' class' + (list.length === 1 ? '' : 'es') + '</span></th></tr>' +
        (list.length ? list.map(c => {
          const sz = D.CLASS_SIZES[c.size];
          return '<tr><td class="mono nowrap">' + esc(c.code) + (c.section > 1 ? '<span class="muted">-' + c.section + '</span>' : '') + '</td><td>' + esc(c.title) + '</td><td>' + sz.label + '</td><td class="num">' + sz.seats + '</td><td class="num">' + money(sz.cost) + '</td>' +
            '<td class="act"><button class="btn btn-ghost btn-small" data-action="remove-class" data-id="' + c.id + '">Remove</button></td></tr>';
        }).join('') : '<tr><td colspan="6" class="muted small">No classes yet.' + (id !== 'gen' ? ' Majors with fewer than 2 classes attract fewer students.' : '') + '</td></tr>');
    }).join('');

    return '<div class="stack">' +
      '<section class="card">' +
        '<div class="card-head"><h2>Seats</h2><span class="muted small">Each student needs ' + G.SEATS_PER_STUDENT + ' seats</span></div>' +
        '<div class="meter' + (cov < 1 ? ' is-short' : '') + '" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(fillPct) + '" aria-label="Seat coverage"><span style="width:' + fillPct + '%"></span></div>' +
        '<div class="kv-row">' +
          kv('Seats offered', seats.toLocaleString()) + kv('Seats needed', need.toLocaleString()) +
          kv('Coverage', '<span class="' + (cov < 1 ? 'tone-bad' : 'tone-good') + '">' + pct(cov) + '</span>') +
          kv('Small-class score', Math.round(quality * 100) + '<small>/100</small>') +
        '</div>' +
        '<p class="hint">' + (cov < 1
          ? 'Not enough seats. Students who can’t get into classes drop out, and prestige suffers. Add classes before the season ends.'
          : 'Everyone can get a seat. Seminars cost more per seat than lecture halls but raise your small-class score, which counts toward prestige.') + '</p>' +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h2>Schedule a class</h2></div>' +
        '<form class="add-class" id="add-class-form">' +
          '<div class="field"><label for="class-dept">Department</label><select id="class-dept" data-class="dept">' +
            depts.map(id => '<option value="' + id + '"' + (id === ui.classForm.dept ? ' selected' : '') + '>' + esc(G.deptById(id).name) + '</option>').join('') + '</select></div>' +
          '<div class="field"><label for="class-course">Course</label><select id="class-course" data-class="course">' +
            dept.courses.map((t, i) => {
              const n = s.classes.filter(c => c.dept === ui.classForm.dept && c.course === i).length;
              return '<option value="' + i + '"' + (i === ui.classForm.course ? ' selected' : '') + '>' + esc(t) + (n ? ' (' + n + ' section' + (n > 1 ? 's' : '') + ')' : '') + '</option>';
            }).join('') + '</select></div>' +
          '<div class="field"><label for="class-size">Format</label><select id="class-size" data-class="size">' + sizeOpts + '</select></div>' +
          '<button type="submit" class="btn btn-primary">Add class</button>' +
        '</form>' +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h2>Course schedule</h2><span class="muted small">' + s.classes.length + ' classes · ' + money(s.classes.reduce((x, c) => x + D.CLASS_SIZES[c.size].cost, 0)) + ' a year</span></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Title</th><th>Format</th><th class="num">Seats</th><th class="num">Cost / year</th><th></th></tr></thead><tbody>' + groups + '</tbody></table></div>' +
      '</section>' +
    '</div>';
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
    const pending = s.applicants.filter(a => a.decision === 'pending').length;
    const admits = s.applicants.filter(a => a.decision === 'admit').length;
    const wl = s.applicants.filter(a => a.decision === 'waitlist').length;
    const cov = G.seatCoverage();
    const warnings = [];
    if (pending) warnings.push(pending + ' application' + (pending > 1 ? 's are' : ' is') + ' still pending and will be denied.');
    if (cov < 1) warnings.push('You only have seats for ' + pct(cov) + ' of what students need. Expect more students to leave.');
    showModal({
      title: 'End the ' + s.year + ' season?',
      body: '<p>You admitted <b>' + admits + '</b> and waitlisted <b>' + wl + '</b>. About <b>' + Math.round(expectedFreshmen()) + '</b> admitted students are expected to enroll, against a target of ' + s.targetClass + '.</p>' +
        (warnings.length ? '<ul class="warn-list">' + warnings.map(w => '<li>' + w + '</li>').join('') + '</ul>' : '') +
        '<p class="muted">Seniors graduate, teams play their seasons, and the year’s budget settles.</p>',
      confirmLabel: 'End season',
      onConfirm: () => {
        const rep = G.endSeason();
        ui.openId = null;
        ui.filter = 'pending';
        renderDrawer();
        render();
        showReport(rep);
      }
    });
  }

  function showReport(r) {
    const s = G.state;
    const dP = r.prestigeAfter - r.prestigeBefore;
    const sportsRows = r.sports.length
      ? '<ul class="report-sports">' + r.sports.map(x => '<li><span>' + esc(x.name) + '</span><span class="record ' + (x.w >= x.l ? 'tone-good' : 'tone-bad') + '">' + x.w + '–' + x.l + '</span></li>').join('') + '</ul>'
      : '<p class="muted">No varsity teams this year.</p>';
    showModal({
      wide: true,
      cancel: false,
      dismissable: false,
      title: 'The Class of ' + (r.year + 4) + ' is in',
      body:
        '<div class="report-hero"><span class="report-big">' + r.enrolled + '</span><span>freshmen enrolled' + (r.fromWaitlist ? ', ' + r.fromWaitlist + ' from the waitlist' : '') + '</span></div>' +
        '<div class="report-grid">' +
          kv('Applied', r.applied) +
          kv('Admitted', r.admitted + ' <small>' + pct(r.acceptRate) + ' rate</small>') +
          kv('Yield', pct(r.yieldRate)) +
          kv('Avg GPA', r.incomingAvgGpa != null ? r.incomingAvgGpa.toFixed(2) : '—') +
          kv('Avg SAT', r.incomingAvgSat || '—') +
          kv('Graduated', r.graduated) +
          kv('Left early', r.dropped) +
          kv('Students now', s.students.length) +
        '</div>' +
        '<div class="report-cols">' +
          '<section><h3>Athletics</h3>' + sportsRows + '</section>' +
          '<section><h3>Money</h3><table class="ledger"><tbody>' +
            '<tr><td>Revenue</td><td class="num">' + money(r.finance.totalRev) + '</td></tr>' +
            '<tr><td>Expenses</td><td class="num">' + money(r.finance.totalExp) + '</td></tr>' +
            (r.gift ? '<tr><td>Alumni gift</td><td class="num tone-good">+' + money(r.gift) + '</td></tr>' : '') +
            '<tr class="ledger-total"><td>Budget</td><td class="num ' + (r.budgetAfter < 0 ? 'tone-bad' : '') + '">' + money(r.budgetAfter) + '</td></tr>' +
          '</tbody></table>' +
          '<h3>Prestige</h3><p class="report-prestige">' + r.prestigeBefore.toFixed(1) + ' → <b>' + r.prestigeAfter.toFixed(1) + '</b> <span class="' + (dP >= 0 ? 'tone-good' : 'tone-bad') + '">(' + (dP >= 0 ? '+' : '') + dP.toFixed(1) + ')</span></p></section>' +
        '</div>' +
        (r.budgetAfter < 0 ? '<p class="note">The school is in debt. Raise tuition or trim programs, or keep going: this is a sandbox.</p>' : ''),
      confirmLabel: 'Open the ' + s.year + ' cycle',
      onConfirm: () => { ui.tab = 'applications'; render(); }
    });
  }

  // ---------- render ----------
  function render() {
    if (ui.screen === 'menu') app.innerHTML = renderMenu();
    else if (ui.screen === 'setup') app.innerHTML = renderSetup();
    else app.innerHTML = renderGame();
  }

  // ---------- events ----------
  const actions = {
    'new-game': () => { ui.setup = defaultSetup(); ui.screen = 'setup'; render(); window.scrollTo(0, 0); },
    'continue': () => {
      if (G.load()) { ui.screen = 'game'; ui.tab = 'office'; render(); window.scrollTo(0, 0); }
    },
    'toggle-howto': () => { ui.showHowTo = !ui.showHowTo; render(); },
    'to-menu': () => { G.save(); ui.screen = 'menu'; ui.openId = null; renderDrawer(); render(); window.scrollTo(0, 0); },
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
    'filter': el => { ui.filter = el.dataset.filter; render(); },
    'sort': el => {
      const k = el.dataset.key;
      if (ui.sort.key === k) ui.sort.dir *= -1;
      else ui.sort = { key: k, dir: ['name', 'from', 'major', 'decision'].includes(k) ? 1 : -1 };
      refreshAppTable();
    },
    'open-app': el => openApp(+el.dataset.id, true),
    'close-app': closeApp,
    'prev-app': () => stepApp(-1),
    'next-app': () => stepApp(1),
    'decide': el => decide(el.dataset.d),
    'bulk-admit': () => {
      let n = 0;
      for (const a of G.state.applicants) if (a.decision === 'pending' && a.idx >= ui.bulkAdmit) { a.decision = 'admit'; n++; }
      G.save(); render(); toast(n ? 'Admitted ' + n + ' applicant' + (n > 1 ? 's' : '') + '.' : 'No pending files at that index.');
    },
    'bulk-deny': () => {
      let n = 0;
      for (const a of G.state.applicants) if (a.decision === 'pending' && a.idx < ui.bulkDeny) { a.decision = 'deny'; n++; }
      G.save(); render(); toast(n ? 'Denied ' + n + ' applicant' + (n > 1 ? 's' : '') + '.' : 'No pending files below that index.');
    },
    'add-major': el => { G.addMajor(el.dataset.id); render(); toast('Opened ' + G.majorById(el.dataset.id).name + '. Schedule classes for it in Classes.'); },
    'ask-drop-major': el => {
      const m = G.majorById(el.dataset.id);
      const n = G.state.students.filter(st => st.major === m.id).length;
      const nc = G.classesInDept(m.id).length;
      showModal({
        title: 'Close ' + esc(m.name) + '?',
        body: '<p>' + n + ' current student' + (n === 1 ? '' : 's') + ' will become undeclared and are more likely to leave. Its ' + nc + ' class' + (nc === 1 ? '' : 'es') + ' will be removed. You save ' + money(m.cost) + ' a year.</p>',
        confirmLabel: 'Close department', danger: true,
        onConfirm: () => { G.dropMajor(m.id); render(); }
      });
    },
    'add-sport': el => { G.addSport(el.dataset.id); render(); toast('Launched ' + G.sportById(el.dataset.id).name + '. Admit recruits to fill the roster.'); },
    'ask-cut-sport': el => {
      const sp = G.sportById(el.dataset.id);
      const n = G.rosterFor(sp.id).length;
      showModal({
        title: 'Cut ' + esc(sp.name) + '?',
        body: '<p>The ' + n + ' recruit' + (n === 1 ? '' : 's') + ' on the roster stay enrolled but won’t play. Recruits for this sport will be less likely to enroll. You save ' + money(sp.cost) + ' a year.</p>',
        confirmLabel: 'Cut program', danger: true,
        onConfirm: () => { G.cutSport(sp.id); render(); }
      });
    },
    'remove-class': el => { G.removeClass(+el.dataset.id); render(); },
    'close-modal': closeModal,
    'confirm-modal': () => { const m = ui.modal; closeModal(); if (m && m.onConfirm) m.onConfirm(); }
  };

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
      render();
      window.scrollTo(0, 0);
    } else if (e.target.id === 'add-class-form') {
      const f = ui.classForm;
      const c = G.addClass(f.dept, f.course, f.size);
      render();
      toast('Added ' + c.code + ' ' + c.title + '.');
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
      refreshAppTable();
    } else if (t.dataset.ui) {
      ui[t.dataset.ui] = +t.value;
    }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.setup === 'type' || t.dataset.setup === 'state') {
      ui.setup[t.dataset.setup] = t.value;
      render();
    } else if (t.dataset.bind) {
      const s = G.state;
      const v = Math.round(+t.value);
      const min = +t.min, max = +t.max;
      if (!Number.isFinite(v)) { render(); return; }
      s[t.dataset.bind] = Math.max(min, Math.min(max, v));
      G.save();
      render();
    } else if (t.dataset.uiCheck) {
      ui[t.dataset.uiCheck] = t.checked;
    } else if (t.dataset.class) {
      const k = t.dataset.class;
      ui.classForm[k] = k === 'course' ? +t.value : t.value;
      if (k === 'dept') ui.classForm.course = 0;
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
