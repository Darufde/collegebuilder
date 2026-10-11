/* College Builder — game state and yearly simulation. No DOM code lives here. */
(function () {
  'use strict';
  const D = window.CB_DATA;

  const SAVE_KEY = 'collegebuilder.save.v1';
  const SEATS_PER_STUDENT = 3;
  const START_YEAR = new Date().getFullYear();

  const START = {
    public: { budget: 25e6, prestige: 35, tuitionIn: 11000, tuitionOut: 28000, targetClass: 90 },
    private: { budget: 40e6, prestige: 45, tuitionIn: 42000, tuitionOut: 42000, targetClass: 70 }
  };
  const STARTER_MAJORS = ['bio', 'bus', 'cs', 'engl', 'psych', 'hist'];
  const STARTER_SPORTS = ['basketball', 'soccer', 'track'];

  // ---------- random helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round2 = v => Math.round(v * 100) / 100;
  function gauss() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function weightedPick(items, weight) {
    const total = items.reduce((s, it) => s + weight(it), 0);
    let r = Math.random() * total;
    for (const it of items) {
      r -= weight(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
  function sample(arr, n) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  // ---------- lookups ----------
  const majorById = id => D.MAJORS.find(m => m.id === id);
  const sportById = id => D.SPORTS.find(s => s.id === id);
  const deptById = id => (id === 'gen' ? D.GEN_ED : majorById(id));
  const stateByCode = code => D.STATES.find(s => s.code === code);

  let state = null;

  // ---------- applicants ----------
  function makeApplicant(opts) {
    opts = opts || {};
    const s = state;
    const q = clamp(opts.q != null ? opts.q : 35 + s.prestige * 0.45 + gauss() * 17, 3, 99);

    // Hometown: public schools draw more heavily from their own state.
    let city, region, stateCode = null, intl = false;
    const homeShare = s.school.type === 'public' ? 0.5 : 0.22;
    const r = Math.random();
    if (r < 0.06) {
      [city, region] = pick(D.INTERNATIONAL);
      intl = true;
    } else {
      const st = r < 0.06 + homeShare
        ? stateByCode(s.school.state)
        : weightedPick(D.STATES, x => x.cities.length);
      city = pick(st.cities);
      region = st.code;
      stateCode = st.code;
    }

    // Most students apply to schools that offer what they want to study.
    const majorIds = opts.majors || (Math.random() < 0.8 ? s.majors : null);
    const majorPool = majorIds && majorIds.length ? D.MAJORS.filter(m => majorIds.includes(m.id)) : D.MAJORS;
    const major = weightedPick(majorPool, m => m.pop);

    // AP classes lean toward the intended major's subjects. Scores track ability.
    const apCount = clamp(Math.round(q / 100 * 11 + gauss() * 1.8 - 1), 0, 15);
    const apNames = [];
    while (apNames.length < apCount) {
      const name = Math.random() < 0.45 ? pick(major.ap) : pick(D.AP_COURSES);
      if (!apNames.includes(name)) apNames.push(name);
    }
    const aps = apNames.map(name => ({ name, score: clamp(Math.round(1 + q / 26 + gauss() * 0.8), 1, 5) }));

    const gpa = round2(clamp(2.0 + q / 100 * 2.05 + gauss() * 0.18, 1.7, 4.0));
    const wgpa = round2(clamp(gpa + apCount * 0.06 + rand(0, 0.12), gpa, 5.0));

    // Some applicants go test-optional; the rest send an SAT or ACT score.
    let sat = null, act = null;
    const t = Math.random();
    if (t < 0.12) { /* test-optional */ }
    else if (t < 0.4) act = clamp(Math.round(12 + q / 100 * 24 + gauss() * 1.8), 1, 36);
    else sat = clamp(Math.round((700 + q * 8.8 + gauss() * 55) / 10) * 10, 400, 1600);

    let sport = null, stars = 0;
    const sportIds = opts.sports || (Math.random() < 0.7 ? s.sports : null);
    const sportPool = sportIds && sportIds.length ? D.SPORTS.filter(x => sportIds.includes(x.id)) : D.SPORTS;
    if (sportPool.length && Math.random() < (opts.athleteRate != null ? opts.athleteRate : 0.2)) {
      sport = pick(sportPool).id;
      stars = weightedPick([1, 2, 3, 4, 5], n => [30, 30, 22, 13, 5][n - 1]);
    }

    const a = {
      id: s.nextId++,
      name: pick(D.FIRST_NAMES) + ' ' + pick(D.LAST_NAMES),
      city, region, stateCode, intl,
      gpa, wgpa, aps, sat, act,
      major: major.id,
      sport, stars,
      activities: sample(D.ACTIVITIES, randInt(1, 3)),
      decision: 'pending'
    };
    a.idx = academicIndex(a);
    return a;
  }

  // A 0–100 blend of grades, test scores and course rigor.
  function academicIndex(a) {
    const gpaS = clamp((a.gpa - 2) / 2 * 100, 0, 100);
    const testS = a.sat ? clamp((a.sat - 700) / 880 * 100, 0, 100)
      : a.act ? clamp((a.act - 12) / 24 * 100, 0, 100)
      : gpaS * 0.95;
    const rigor = clamp(a.aps.length / 10 * 100, 0, 100);
    return Math.round(0.5 * gpaS + 0.3 * testS + 0.2 * rigor);
  }

  function generateApplicants() {
    const s = state;
    const n = Math.round((120 + s.prestige * 2 + s.majors.length * 5 + s.sports.length * 2) * rand(0.9, 1.1));
    s.applicants = [];
    for (let i = 0; i < n; i++) s.applicants.push(makeApplicant());
  }

  function tuitionFor(a) {
    const s = state;
    if (s.school.type === 'private') return s.tuitionIn;
    return a.stateCode === s.school.state ? s.tuitionIn : s.tuitionOut;
  }

  // Chance an admitted student says yes. Strong students are harder to land
  // at a low-prestige school; missing majors or teams and high tuition hurt.
  function enrollChance(a) {
    const s = state;
    let p = 0.5 + (s.prestige - a.idx) * 0.01;
    if (!s.majors.includes(a.major)) p *= 0.4;
    else if (classesInDept(a.major).length >= 2) p *= 1.1;
    if (a.sport) p *= s.sports.includes(a.sport) ? 1.3 : 0.6;
    p *= clamp(1.35 - tuitionFor(a) / 45000 * 0.6, 0.55, 1.35);
    if (a.stateCode === s.school.state) p *= 1.15;
    if (a.intl) p *= 0.85;
    return clamp(p, 0.03, 0.95);
  }

  function enrollFactors(a) {
    const s = state;
    const out = [];
    const gap = s.prestige - a.idx;
    if (gap < -15) out.push({ tone: 'bad', text: 'Strong student who may hold out for a more prestigious school' });
    else if (gap > 10) out.push({ tone: 'good', text: 'Your school is a reach for this student' });
    if (!s.majors.includes(a.major)) out.push({ tone: 'bad', text: 'You don’t offer their intended major' });
    else if (classesInDept(a.major).length >= 2) out.push({ tone: 'good', text: 'Their major has a full slate of classes' });
    else out.push({ tone: 'warn', text: 'Their major has fewer than 2 classes' });
    if (a.sport) {
      out.push(s.sports.includes(a.sport)
        ? { tone: 'good', text: 'Wants to play ' + sportById(a.sport).name + ' and you have a team' }
        : { tone: 'bad', text: 'Wants to play ' + sportById(a.sport).name + ' but you have no team' });
    }
    const t = tuitionFor(a);
    if (t > 35000) out.push({ tone: 'bad', text: 'Tuition of $' + t.toLocaleString() + ' is a stretch' });
    else if (t < 20000) out.push({ tone: 'good', text: 'Affordable tuition of $' + t.toLocaleString() });
    if (a.stateCode === s.school.state) out.push({ tone: 'good', text: 'Lives in your state' });
    if (a.intl) out.push({ tone: 'warn', text: 'International student; visas and distance lower yield' });
    return out;
  }

  // ---------- classes ----------
  function classesInDept(dept) {
    return state.classes.filter(c => c.dept === dept);
  }
  function totalSeats() {
    return state.classes.reduce((sum, c) => sum + D.CLASS_SIZES[c.size].seats, 0);
  }
  function seatsNeeded() {
    return state.students.length * SEATS_PER_STUDENT;
  }
  function seatCoverage() {
    const need = seatsNeeded();
    return need ? totalSeats() / need : 1;
  }
  function classQuality() {
    if (!state.classes.length) return 0;
    return state.classes.reduce((sum, c) => sum + D.CLASS_SIZES[c.size].quality, 0) / state.classes.length;
  }

  function addClass(dept, courseIndex, size) {
    const d = deptById(dept);
    const title = d.courses[courseIndex];
    const section = state.classes.filter(c => c.dept === dept && c.course === courseIndex).length + 1;
    const c = {
      id: state.nextId++,
      dept,
      course: courseIndex,
      code: d.dept + ' ' + (dept === 'gen' ? 101 + courseIndex : (courseIndex + 1) * 100 + 1),
      title,
      section,
      size
    };
    state.classes.push(c);
    save();
    return c;
  }
  function removeClass(id) {
    state.classes = state.classes.filter(c => c.id !== id);
    save();
  }

  // ---------- majors & sports ----------
  function addMajor(id) {
    if (!state.majors.includes(id)) state.majors.push(id);
    log('Opened the ' + majorById(id).name + ' department.');
    save();
  }
  function dropMajor(id) {
    state.majors = state.majors.filter(m => m !== id);
    state.classes = state.classes.filter(c => c.dept !== id);
    let moved = 0;
    for (const st of state.students) if (st.major === id) { st.major = 'undeclared'; moved++; }
    log('Closed the ' + majorById(id).name + ' department. ' + moved + ' students are now undeclared.');
    save();
  }
  function addSport(id) {
    if (!state.sports.includes(id)) state.sports.push(id);
    log('Launched a varsity ' + sportById(id).name + ' program.');
    save();
  }
  function cutSport(id) {
    state.sports = state.sports.filter(x => x !== id);
    delete state.sportRecords[id];
    log('Cut the ' + sportById(id).name + ' program.');
    save();
  }
  function rosterFor(id) {
    return state.students.filter(st => st.sport === id);
  }

  // ---------- money ----------
  function finances(records) {
    const s = state;
    records = records || s.sportRecords;
    const students = s.students;
    const inState = students.filter(st => st.stateCode === s.school.state).length;
    const tuition = students.reduce((sum, st) => sum + tuitionFor(st), 0);
    const revenue = [{ label: 'Tuition', amount: tuition }];
    if (s.school.type === 'public') {
      revenue.push({ label: 'State funding', amount: 6e6 + inState * 3000 });
    }
    const donationRate = s.school.type === 'private' ? 14000 : 8000;
    revenue.push({ label: 'Alumni donations', amount: Math.round(Math.pow(s.prestige, 1.5) * donationRate) });
    const sportsRev = s.sports.reduce((sum, id) => {
      const sp = sportById(id);
      const rec = records[id];
      const pct = rec ? rec.w / Math.max(1, rec.w + rec.l) : 0.5;
      return sum + sp.revenue * (0.5 + pct) * (0.6 + s.prestige / 100);
    }, 0);
    revenue.push({ label: 'Athletics tickets & media', amount: Math.round(sportsRev) });

    const expenses = [
      { label: 'Campus operations', amount: 2e6 + students.length * 6500 },
      { label: 'Academic departments', amount: s.majors.reduce((sum, id) => sum + majorById(id).cost, 0) },
      { label: 'Faculty for classes', amount: s.classes.reduce((sum, c) => sum + D.CLASS_SIZES[c.size].cost, 0) },
      { label: 'Athletic programs', amount: s.sports.reduce((sum, id) => sum + sportById(id).cost, 0) }
    ];
    const totalRev = revenue.reduce((x, l) => x + l.amount, 0);
    const totalExp = expenses.reduce((x, l) => x + l.amount, 0);
    return { revenue, expenses, totalRev, totalExp, net: totalRev - totalExp };
  }

  // ---------- season ----------
  function playSports() {
    const s = state;
    const results = [];
    s.sportRecords = {};
    for (const id of s.sports) {
      const sp = sportById(id);
      const roster = rosterFor(id);
      const talent = roster.length ? roster.reduce((x, st) => x + st.stars, 0) / roster.length / 5 : 0.2;
      const depth = Math.min(1, roster.length / Math.max(3, sp.roster * 0.4));
      const p = clamp(0.12 + 0.55 * talent * (0.4 + 0.6 * depth) + 0.2 * s.prestige / 100 + rand(-0.08, 0.08), 0.04, 0.96);
      let w = 0;
      for (let g = 0; g < sp.games; g++) if (Math.random() < p) w++;
      const rec = { w, l: sp.games - w, recruits: roster.length };
      s.sportRecords[id] = rec;
      results.push({ id, name: sp.name, ...rec });
    }
    return results;
  }

  function endSeason() {
    const s = state;
    const rep = {
      year: s.year,
      applied: s.applicants.length,
      admitted: 0, waitlisted: 0, denied: 0, untouched: 0,
      enrolled: 0, fromWaitlist: 0, graduated: 0, dropped: 0,
      prestigeBefore: s.prestige, budgetBefore: s.budget
    };
    for (const a of s.applicants) {
      if (a.decision === 'admit') rep.admitted++;
      else if (a.decision === 'waitlist') rep.waitlisted++;
      else if (a.decision === 'deny') rep.denied++;
      else rep.untouched++;
    }

    // 1. Admitted students decide.
    const incoming = s.applicants.filter(a => a.decision === 'admit' && Math.random() < enrollChance(a));
    // 2. Fill remaining room from the waitlist, best first.
    if (incoming.length < s.targetClass) {
      const wl = s.applicants.filter(a => a.decision === 'waitlist').sort((x, y) => y.idx - x.idx);
      for (const a of wl) {
        if (incoming.length >= s.targetClass) break;
        if (Math.random() < Math.min(0.95, enrollChance(a) * 1.4)) {
          incoming.push(a);
          rep.fromWaitlist++;
        }
      }
    }

    // 3. Current students move up a year; some leave, seniors graduate.
    const coverage = seatCoverage();
    const stay = [];
    for (const st of s.students) {
      let dropRate = 0.03 + (coverage < 1 ? (1 - coverage) * 0.15 : 0);
      if (st.major === 'undeclared' || !s.majors.includes(st.major)) dropRate += 0.05;
      if (Math.random() < dropRate) { rep.dropped++; continue; }
      st.yearInSchool++;
      if (st.yearInSchool > 4) { rep.graduated++; continue; }
      stay.push(st);
    }
    // 4. Freshmen arrive.
    for (const a of incoming) {
      stay.push({ ...a, yearInSchool: 1, classOf: s.year + 4, decision: undefined });
    }
    s.students = stay;
    rep.enrolled = incoming.length;
    rep.incomingAvgGpa = incoming.length ? round2(incoming.reduce((x, a) => x + a.gpa, 0) / incoming.length) : null;
    rep.incomingAvgIdx = incoming.length ? Math.round(incoming.reduce((x, a) => x + a.idx, 0) / incoming.length) : null;
    const satTakers = incoming.filter(a => a.sat);
    rep.incomingAvgSat = satTakers.length ? Math.round(satTakers.reduce((x, a) => x + a.sat, 0) / satTakers.length / 10) * 10 : null;
    rep.yieldRate = rep.admitted ? incoming.filter(a => a.decision === 'admit').length / rep.admitted : 0;
    rep.acceptRate = rep.applied ? rep.admitted / rep.applied : 0;

    // 5. Sports season.
    rep.sports = playSports();

    // 6. Money for the year.
    const fin = finances();
    rep.finance = fin;
    s.budget += fin.net;
    let gift = 0;
    if (Math.random() < 0.15 + s.prestige / 400) {
      gift = Math.round(rand(0.5, 3) * (0.5 + s.prestige / 50) * 1e6 / 1e5) * 1e5;
      s.budget += gift;
    }
    rep.gift = gift;

    // 7. Prestige drifts toward a score built from the school you ran this year.
    const incomingIdx = rep.incomingAvgIdx != null ? rep.incomingAvgIdx
      : (s.students.length ? s.students.reduce((x, st) => x + st.idx, 0) / s.students.length * 0.9 : 20);
    const games = rep.sports.reduce((x, r) => x + r.w + r.l, 0);
    const winPct = games ? rep.sports.reduce((x, r) => x + r.w, 0) / games : 0.4;
    // A tiny class isn't selective, it's empty: scale the academic credit by how full the class is.
    const fill = Math.min(1, rep.enrolled / Math.max(1, s.targetClass));
    const target = 0.4 * incomingIdx * (0.5 + 0.5 * fill)
      + 0.15 * Math.min(100, s.majors.length * 4)
      + 0.15 * Math.min(100, coverage * 100)
      + 0.15 * classQuality() * 100
      + 0.15 * winPct * 100;
    s.prestige = Math.round(clamp(s.prestige + (target - s.prestige) * 0.25, 1, 99) * 10) / 10;
    rep.prestigeAfter = s.prestige;
    rep.budgetAfter = s.budget;
    rep.coverage = coverage;

    // 8. Record the year and open the next cycle.
    s.history.push({
      year: s.year, applied: rep.applied, admitted: rep.admitted, enrolled: rep.enrolled,
      acceptRate: rep.acceptRate, yieldRate: rep.yieldRate, avgGpa: rep.incomingAvgGpa,
      students: s.students.length, prestige: s.prestige, budget: s.budget, net: fin.net
    });
    log('Class of ' + (s.year + 4) + ' enrolled: ' + rep.enrolled + ' freshmen from ' + rep.applied + ' applicants.', s.year);
    if (rep.graduated) log(rep.graduated + ' seniors graduated.', s.year);
    if (rep.dropped) log(rep.dropped + ' students left before finishing.', s.year);
    for (const r of rep.sports) log(r.name + ' finished ' + r.w + '–' + r.l + '.', s.year);
    if (gift) log('An alum donated $' + gift.toLocaleString() + ' to the endowment.', s.year);
    s.year++;
    generateApplicants();
    s.lastReport = rep;
    save();
    return rep;
  }

  function log(text, year) {
    state.news.unshift({ year: year != null ? year : state.year, text });
    if (state.news.length > 60) state.news.length = 60;
  }

  // ---------- lifecycle ----------
  function newGame(settings) {
    const cfg = START[settings.type];
    state = {
      version: 1,
      school: {
        name: settings.name, mascot: settings.mascot,
        primary: settings.primary, secondary: settings.secondary,
        state: settings.state, type: settings.type
      },
      year: START_YEAR,
      startYear: START_YEAR,
      budget: cfg.budget,
      prestige: cfg.prestige,
      tuitionIn: cfg.tuitionIn,
      tuitionOut: cfg.tuitionOut,
      targetClass: cfg.targetClass,
      majors: STARTER_MAJORS.slice(),
      sports: STARTER_SPORTS.slice(),
      classes: [],
      students: [],
      applicants: [],
      sportRecords: {},
      history: [],
      news: [],
      nextId: 1,
      lastReport: null
    };
    for (const m of STARTER_MAJORS) {
      addClass(m, 0, 'standard');
      addClass(m, 1, 'standard');
    }
    addClass('gen', 0, 'lecture');
    addClass('gen', 1, 'standard');

    // An existing student body of four classes.
    for (let y = 1; y <= 4; y++) {
      const n = Math.round(cfg.targetClass * rand(0.75, 0.9));
      for (let i = 0; i < n; i++) {
        const a = makeApplicant({
          q: clamp(30 + cfg.prestige * 0.5 + gauss() * 14, 5, 95),
          majors: STARTER_MAJORS, sports: STARTER_SPORTS, athleteRate: 0.12
        });
        delete a.decision;
        a.yearInSchool = y;
        a.classOf = START_YEAR + 4 - y;
        state.students.push(a);
      }
    }
    playSports();
    generateApplicants();
    log('Welcome to ' + settings.name + '. The ' + START_YEAR + ' admissions cycle is open.');
    save();
    return state;
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      state = JSON.parse(raw);
      return state;
    } catch (e) { return null; }
  }
  function peekSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function deleteSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  function randomSchoolName() {
    const P = D.NAME_PARTS;
    if (Math.random() < 0.25) return 'University of ' + pick(pick(D.STATES).cities);
    return pick(P.first) + pick(P.second) + ' ' + pick(P.kind);
  }

  window.Game = {
    get state() { return state; },
    set state(v) { state = v; },
    SEATS_PER_STUDENT,
    majorById, sportById, deptById, stateByCode,
    newGame, load, save, peekSave, deleteSave,
    academicIndex, enrollChance, enrollFactors, tuitionFor,
    classesInDept, totalSeats, seatsNeeded, seatCoverage, classQuality,
    addClass, removeClass, addMajor, dropMajor, addSport, cutSport, rosterFor,
    finances, endSeason, randomSchoolName, pick
  };
})();
