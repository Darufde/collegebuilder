/* College Builder — game state and yearly simulation. No DOM code lives here. */
(function () {
  'use strict';
  const D = window.CB_DATA;

  const SAVE_KEY = 'collegebuilder.save.v2';
  const META_KEY = 'collegebuilder.meta';
  const OLD_SAVE_KEY = 'collegebuilder.save.v1';
  const SEATS_PER_STUDENT = 3;
  const START_YEAR = new Date().getFullYear();
  // Course numbers by position in a department's catalog.
  const COURSE_NUMBERS = [101, 201, 301, 401, 250, 350];
  const DINING_PER_RESIDENT = 4500;
  const CONFERENCE_EXIT_FEE = 500000;
  const HOOK_RATE = 0.07;
  // Bump when makeApplicant changes: a saved pool can only be rebuilt by the generator that made it.
  const POOL_GEN = 4;

  const START = {
    public: {
      budget: 25e6, prestige: 35, tuitionIn: 11000, tuitionOut: 28000, roomBoard: 11500, targetClass: 90,
      aid: { needMet: 0.4, rules: [{ metric: 'gpa', min: 3.5, amount: 2000, who: 'all' }, { metric: 'idx', min: 80, amount: 5000, who: 'all' }] }, alumni: 4000, dorms: ['traditional', 'traditional'],
      early: { ed: false, ea: true }, division: 'D2'
    },
    private: {
      budget: 40e6, prestige: 45, tuitionIn: 42000, tuitionOut: 42000, roomBoard: 14000, targetClass: 70,
      aid: { needMet: 0.7, rules: [{ metric: 'gpa', min: 3.5, amount: 6000, who: 'all' }, { metric: 'idx', min: 75, amount: 12000, who: 'all' }] }, alumni: 3000, dorms: ['traditional', 'suites'],
      early: { ed: true, ea: false }, division: 'D3'
    }
  };
  // Admissions office, recruiting, athletics and outcomes settings every school starts with.
  function officeDefaults(type) {
    const cfg = START[type] || START.public;
    return {
      early: Object.assign({}, cfg.early),
      phase: 'regular',
      earlyReport: null,
      staff: { readers: 1, used: 0, autoRead: true, rules: { admit: 75, wait: 55, athleteStars: 4, standouts: 'flag', records: 'deny', stopAtTarget: true } },
      recruit: { marketing: 0, states: [], countries: [], athletics: 0 },
      athletics: { division: cfg.division, conference: defaultConference(cfg.division).id, transition: 0, titleIX: 0 },
      outcomes: [],
      cohorts: {}
    };
  }
  const STARTER_MAJORS = ['bio', 'bus', 'cs', 'engl', 'psych', 'hist'];
  const STARTER_SPORTS = ['m-basketball', 'w-basketball', 'm-soccer', 'w-soccer'];

  // ---------- random helpers ----------
  // Everything random goes through rng, so an applicant pool can be rebuilt from its seed.
  let rng = Math.random;
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = (a, b) => a + rng() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round2 = v => Math.round(v * 100) / 100;
  const roundTo = (v, step) => Math.round(v / step) * step;
  function gauss() {
    let u = 0, v = 0;
    while (!u) u = rng();
    while (!v) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function weightedPick(items, weight) {
    const total = items.reduce((s, it) => s + weight(it), 0);
    let r = rng() * total;
    for (const it of items) {
      r -= weight(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
  function sample(arr, n) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  // ---------- lookups ----------
  const MAJOR_MAP = new Map(D.MAJORS.map(m => [m.id, m]));
  const SPORT_MAP = new Map(D.SPORTS.map(x => [x.id, x]));
  const ACT_TAG = new Map(D.ACTIVITIES.map(([name, tag]) => [name, tag]));
  const ACT_NAMES = D.ACTIVITIES.map(a => a[0]);
  const majorById = id => MAJOR_MAP.get(id);
  const sportById = id => SPORT_MAP.get(id);
  const deptById = id => (id === 'gen' ? D.GEN_ED : majorById(id));
  const stateByCode = code => D.STATES.find(s => s.code === code);
  const courseCode = (dept, i) => deptById(dept).dept + ' ' + (dept === 'gen' ? 101 + i : COURSE_NUMBERS[i]);
  const tagsOf = p => {
    const out = new Set();
    for (const a of p.activities || []) { const t = ACT_TAG.get(a); if (t) out.add(t); }
    return out;
  };
  const shortYear = y => '’' + String(y).slice(-2);

  let state = null;

  // ---------- derived campus metrics (cached until the next save) ----------
  let cache = null;
  function invalidate() { cache = null; }

  function metrics() {
    if (cache) return cache;
    const s = state;
    const n = s.students.length;
    const m = {
      n, female: 0, inState: 0, outState: 0, intl: 0, firstGen: 0, legacy: 0, greekMembers: 0,
      athletes: 0, athletesF: 0, aidTotal: 0, hooks: 0,
      byYear: [0, 0, 0, 0], majorCount: {}, chapterCount: {}, chapterTrouble: {},
      tagCount: {}, hookByTag: {}, states: {}
    };
    for (const t in D.LIFE_TAGS) { m.tagCount[t] = 0; m.hookByTag[t] = 0; }
    for (const st of s.students) {
      if (st.gender === 'F') m.female++;
      if (st.intl) m.intl++;
      else if (st.stateCode === s.school.state) m.inState++;
      else m.outState++;
      if (st.stateCode) m.states[st.stateCode] = (m.states[st.stateCode] || 0) + 1;
      if (st.firstGen) m.firstGen++;
      if (st.legacy) m.legacy++;
      if (st.sport) { m.athletes++; if (st.gender === 'F') m.athletesF++; }
      m.aidTotal += st.aid || 0;
      if (st.yearInSchool >= 1 && st.yearInSchool <= 4) m.byYear[st.yearInSchool - 1]++;
      m.majorCount[st.major] = (m.majorCount[st.major] || 0) + 1;
      if (st.greek) {
        m.greekMembers++;
        m.chapterCount[st.greek] = (m.chapterCount[st.greek] || 0) + 1;
        if (st.hook === 'trouble') m.chapterTrouble[st.greek] = (m.chapterTrouble[st.greek] || 0) + 1;
      }
      for (const t of tagsOf(st)) m.tagCount[t]++;
      if (st.hook) {
        m.hooks++;
        const t = D.HOOKS[st.hook] && D.HOOKS[st.hook].life;
        if (t) m.hookByTag[t]++;
      }
    }

    // Department seats against the students majoring there (each needs a seat in their department).
    m.deptSeats = {};
    m.deptClasses = {};
    for (const c of s.classes) {
      m.deptSeats[c.dept] = (m.deptSeats[c.dept] || 0) + D.CLASS_SIZES[c.size].seats;
      m.deptClasses[c.dept] = (m.deptClasses[c.dept] || 0) + 1;
    }

    m.housing = housingStats(m);
    m.life = campusLife(m);
    cache = m;
    return m;
  }

  function deptCoverage(id) {
    const m = metrics();
    const need = m.majorCount[id] || 0;
    if (!need) return 1;
    return (m.deptSeats[id] || 0) / need;
  }

  // ---------- housing ----------
  function totalBeds() {
    const s = state;
    return s.dorms.reduce((x, d) => x + D.DORMS[d.type].beds, 0) +
      s.greek.filter(c => c.house).length * D.GREEK.houseBeds;
  }
  function housingStats(m) {
    const s = state;
    const beds = totalBeds();
    const avgAppeal = beds ? s.dorms.reduce((x, d) => x + D.DORMS[d.type].appeal * D.DORMS[d.type].beds, 0) / beds : 0;
    // Upperclassmen choose whether to stay on campus. Nicer halls keep them; pricey room and board pushes them off.
    const wantRate = clamp(0.5 + avgAppeal * 0.1 - (s.roomBoard - 12000) / 30000, 0.12, 0.92);
    const freshmen = m.byYear[0];
    const upper = m.n - freshmen;
    const demand = freshmen + Math.round(upper * wantRate);
    const residents = Math.min(beds, demand);
    // Next fall: students now in years 1–3 return as upperclassmen and claim beds first.
    const returning = Math.round((m.byYear[0] + m.byYear[1] + m.byYear[2]) * 0.94 * wantRate);
    const freshBeds = Math.max(0, beds - returning);
    let score;
    if (!demand) score = 60;
    else if (beds >= demand) score = clamp(55 + avgAppeal * 15 + Math.min(15, (beds - demand) / demand * 50), 0, 100);
    else score = clamp(55 * beds / demand - 10, 0, 100);
    return { beds, demand, residents, wantRate, freshBeds, returning, score, avgAppeal, overflow: Math.max(0, demand - beds) };
  }

  // ---------- campus life ----------
  // Every dimension runs 0–100. Students' activities and standouts feed most of them directly.
  function campusLife(m) {
    const s = state;
    const n = Math.max(1, m.n);
    const dims = [];
    for (const t in D.LIFE_TAGS) {
      const v = m.tagCount[t] / n * 160 + m.hookByTag[t] / n * 1500;
      dims.push({ id: t, label: D.LIFE_TAGS[t], value: clamp(v, 0, 100) });
    }
    const policy = D.GREEK_POLICIES[s.greekPolicy] || D.GREEK_POLICIES.standard;
    dims.push({ id: 'greek', label: 'Greek life', value: clamp(m.greekMembers / n * 250 * policy.life, 0, 100) });
    const recs = Object.values(s.sportRecords || {});
    const games = recs.reduce((x, r) => x + r.w + r.l, 0);
    const winPct = games ? recs.reduce((x, r) => x + r.w, 0) / games : 0.4;
    dims.push({ id: 'spirit', label: 'School spirit', value: clamp(25 + winPct * 45 + Math.min(20, m.athletes / n * 100) + Math.min(10, s.sports.length), 0, 100) });
    dims.push({ id: 'housing', label: 'Housing', value: m.housing.score });
    const fShare = m.female / n;
    const genderBal = 1 - Math.abs(fShare - 0.5) * 2;
    const outShare = (m.outState + m.intl) / n;
    dims.push({ id: 'diversity', label: 'Diversity of backgrounds', value: clamp(50 * genderBal + 30 * Math.min(1, outShare / 0.45) + 20 * Math.min(1, m.intl / n / 0.08), 0, 100) });
    const score = dims.reduce((x, d) => x + d.value, 0) / dims.length;
    return { score: Math.round(score * 10) / 10, dims };
  }

  // ---------- money per student ----------
  function tuitionFor(a) {
    const s = state;
    return a.stateCode === s.school.state && !a.intl ? s.tuitionIn : s.tuitionOut;
  }

  // The aid package a student would get under today's policy.
  function aidPackage(a) {
    const s = state;
    const coa = tuitionFor(a) + s.roomBoard;
    const best = meritFor(a);
    const merit = Math.min(best ? best.amount : 0, coa);
    const need = Math.max(0, coa - a.efc);
    const needGrant = Math.max(0, need - merit) * s.aid.needMet;
    const total = Math.min(coa, Math.round((merit + needGrant) / 100) * 100);
    const net = coa - total;
    const gap = Math.max(0, net - a.efc);
    return { coa, merit, meritRule: best, needGrant: Math.round(needGrant), need, total, net, gap };
  }

  // ---------- merit scholarships ----------
  // The office awards merit aid automatically from your rules. A student gets the single best award they qualify for.
  const MERIT_METRICS = {
    gpa: { label: 'GPA', value: a => a.gpa, min: 0, max: 4, step: 0.01, start: 3.5, fmt: v => v.toFixed(2) },
    wgpa: { label: 'Weighted GPA', value: a => a.wgpa, min: 0, max: 5, step: 0.01, start: 4, fmt: v => v.toFixed(2) },
    idx: { label: 'Academic Index', value: a => a.idx, min: 0, max: 100, step: 1, start: 75, fmt: v => String(v) },
    sat: { label: 'SAT', value: a => a.sat, min: 400, max: 1600, step: 10, start: 1300, fmt: v => String(v) },
    act: { label: 'ACT', value: a => a.act, min: 1, max: 36, step: 1, start: 28, fmt: v => String(v) }
  };
  const MERIT_WHO = {
    all: { label: 'Everyone', test: () => true },
    instate: { label: 'In-state', test: a => !a.intl && a.stateCode === state.school.state },
    outstate: { label: 'Out-of-state', test: a => !a.intl && a.stateCode !== state.school.state },
    intl: { label: 'International', test: a => !!a.intl },
    firstgen: { label: 'First-generation', test: a => !!a.firstGen },
    athlete: { label: 'Recruited athletes', test: a => !!a.sport && state.sports.includes(a.sport) }
  };
  function meritFor(a) {
    let best = null;
    for (const r of state.aid.rules || []) {
      const m = MERIT_METRICS[r.metric], w = MERIT_WHO[r.who] || MERIT_WHO.all;
      if (!m || !r.amount) continue;
      const v = m.value(a);
      if (v == null || v < r.min || !w.test(a)) continue;
      if (!best || r.amount > best.amount) best = r;
    }
    return best;
  }
  function addMeritRule() {
    state.aid.rules.push({ metric: 'gpa', min: 3.75, amount: 5000, who: 'all' });
    save();
  }
  function updateMeritRule(i, key, value) {
    const r = state.aid.rules[i];
    if (!r) return;
    if (key === 'metric') {
      const m = MERIT_METRICS[value];
      if (!m) return;
      if (r.metric !== value) r.min = m.start;
      r.metric = value;
    } else if (key === 'who') {
      if (MERIT_WHO[value]) r.who = value;
    } else if (key === 'min') {
      const m = MERIT_METRICS[r.metric];
      r.min = clamp(Math.round(value / m.step) * m.step, m.min, m.max);
      r.min = Math.round(r.min * 100) / 100;
    } else if (key === 'amount') {
      r.amount = clamp(Math.round(value / 100) * 100, 0, 200000);
    }
    save();
  }
  function removeMeritRule(i) {
    state.aid.rules.splice(i, 1);
    save();
  }
  function meritRuleText(r) {
    const m = MERIT_METRICS[r.metric];
    return (r.who && r.who !== 'all' ? MERIT_WHO[r.who].label + ', ' : '') + m.label + ' ' + m.fmt(r.min) + '+';
  }

  // ---------- applicant pool ----------
  // How the pool splits between your state and everywhere else, and how far your name carries.
  // Recruiting campaigns in other states and countries pull more applicants from there.
  function residencyMix() {
    const s = state;
    const rec = s.recruit;
    const home = s.school.state;
    let base = s.school.type === 'public' ? 0.55 : 0.25;
    base *= clamp(1.25 - s.prestige / 100, 0.35, 1.1);
    if (rec.states.includes(home)) base *= 1.4;
    const outAppeal = clamp(1.25 - (s.tuitionOut - s.tuitionIn) / 40000 - Math.max(0, s.tuitionOut - 30000) / 100000, 0.3, 1.35);
    let w0 = 0, w1 = 0;
    for (const st of D.STATES) {
      if (st.code === home) continue;
      w0 += st.pop;
      w1 += st.pop * (rec.states.includes(st.code) ? 3 : 1);
    }
    const campaign = w1 / w0;
    const intlRate = clamp((0.07 + s.prestige / 1500) * (1 + rec.countries.length * 0.25), 0, 0.45);
    const volume = base + (1 - base) * outAppeal * campaign;
    return { inShare: base / volume, volume, outAppeal, campaign, intlRate, states: rec.states.slice(), countries: rec.countries.slice() };
  }

  // Sticker shock for a typical middle-income family, after aid.
  function typicalNetPrice() {
    const s = state;
    const probe = { idx: 60, efc: 12000, stateCode: s.school.state, intl: false };
    const inNet = aidPackage(probe).net;
    const outNet = aidPackage(Object.assign({}, probe, { stateCode: null })).net;
    const mix = residencyMix();
    return inNet * mix.inShare + outNet * (1 - mix.inShare);
  }

  function buzzMult(buzz) {
    return buzz >= 0 ? 1 + Math.sqrt(buzz) / 12 : 1 - Math.min(0.3, Math.sqrt(-buzz) / 12);
  }

  // Next cycle's application volume and what drives it. There is no ceiling.
  function applicantOutlook() {
    const s = state, m = metrics();
    const mix = residencyMix();
    const net = typicalNetPrice();
    const f = [
      { label: 'Prestige', mult: Math.exp((s.prestige - 35) / 22) },
      { label: 'Majors offered', mult: 0.7 + 0.05 * Math.min(s.majors.length, 20) + 0.015 * Math.max(0, s.majors.length - 20) },
      { label: 'Varsity sports', mult: 1 + 0.01 * s.sports.length },
      { label: 'Campus life', mult: 0.8 + m.life.score / 250 },
      { label: 'Buzz', mult: buzzMult(s.buzz) },
      { label: 'Alumni network', mult: 1 + Math.log10(1 + s.alumni / 4000) * 0.35 },
      { label: 'Net price', mult: clamp(1.15 - (net - 15000) / 60000, 0.55, 1.3) },
      { label: 'Out-of-state draw & campaigns', mult: mix.volume / (s.school.type === 'public' ? 0.92 : 1.1) },
      { label: 'Housing guarantee', mult: m.housing.freshBeds >= s.targetClass ? 1 : 0.88 + 0.12 * m.housing.freshBeds / Math.max(1, s.targetClass) },
      { label: 'Marketing', mult: 1 + 0.12 * Math.log2(1 + s.recruit.marketing / 200000) },
      { label: 'Early programs', mult: 1 + (s.early.ea ? 0.06 : 0) + (s.early.ed ? 0.03 : 0) },
      { label: 'Career outcomes', mult: 0.85 + outcomeScore() / 333 },
      { label: 'Athletics exposure', mult: D.DIVISIONS[s.athletics.division].appMult * (1 + conferenceOf().tv / 1e8) }
    ];
    const base = 90 + 3.5 * s.prestige;
    const total = f.reduce((x, k) => x * k.mult, base);
    return { base, total: Math.max(25, Math.round(total)), factors: f, mix, net };
  }

  // The parts of the school an applicant pool is drawn from, frozen when the pool is generated.
  function poolContext() {
    const s = state;
    return {
      prestige: s.prestige, majors: s.majors.slice(), sports: s.sports.slice(), alumni: s.alumni, mix: residencyMix(),
      ed: s.early.ed, ea: s.early.ea, athletics: s.recruit.athletics, starTilt: D.DIVISIONS[s.athletics.division].starTilt
    };
  }

  function makeApplicant(opts) {
    opts = opts || {};
    const s = state;
    const ctx = opts.ctx || poolContext();
    const q = clamp(opts.q != null ? opts.q : 35 + ctx.prestige * 0.45 + gauss() * 17, 3, 99);

    // Hometown: public schools draw more heavily from their own state; prestige widens the reach.
    let city, region, stateCode = null, intl = false;
    const mix = ctx.mix;
    const r = rng();
    if (r < mix.inShare) {
      const st = stateByCode(s.school.state);
      city = pick(st.cities); region = st.code; stateCode = st.code;
    } else if (rng() < (mix.intlRate != null ? mix.intlRate : 0.07 + ctx.prestige / 1500)) {
      [city, region] = weightedPick(D.INTERNATIONAL, x => (mix.countries && mix.countries.includes(x[1]) ? 4 : 1));
      intl = true;
    } else {
      let st;
      do st = weightedPick(D.STATES, x => x.pop * (mix.states && mix.states.includes(x.code) ? 3 : 1)); while (st.code === s.school.state);
      city = pick(st.cities); region = st.code; stateCode = st.code;
    }

    // Most students apply to schools that offer what they want to study.
    const majorIds = opts.majors || (rng() < 0.8 ? ctx.majors : null);
    const majorPool = majorIds && majorIds.length ? majorIds.map(majorById).filter(Boolean) : D.MAJORS;
    const major = weightedPick(majorPool, m => m.pop);
    const gender = rng() < major.f ? 'F' : 'M';
    let name;
    if (intl) {
      const [women, men, family] = D.INTL_NAMES[region];
      name = pick(gender === 'F' ? women : men) + ' ' + pick(family);
    } else {
      name = (rng() < 0.08 ? pick(D.NEUTRAL_NAMES) : pick(gender === 'F' ? D.FEMALE_NAMES : D.MALE_NAMES)) + ' ' + pick(D.LAST_NAMES);
    }

    // Two sides of ability: classwork drives grades, test-taking drives the SAT, ACT and AP exams.
    // Both center on q, so a transcript hangs together: strong exam scores go with strong test scores.
    const gradeSkill = clamp(q + gauss() * 7, 0, 100);
    const testSkill = clamp(q + gauss() * 7, 0, 100);
    const gpa = round2(clamp(2.0 + gradeSkill / 100 * 2.05 + gauss() * 0.12, 1.7, 4.0));

    // AP classes lean toward the intended major's subjects. Strong students take more of them.
    const apCount = clamp(Math.round(q / 100 * 11 + gauss() * 1.5 - 1), 0, 14);
    const apNames = [];
    const excluded = n => D.AP_EXCLUSIVE.some(pair => pair.includes(n) && pair.some(o => o !== n && apNames.includes(o)));
    let guard = 0;
    while (apNames.length < apCount && guard++ < 200) {
      const n = rng() < 0.45 ? pick(major.ap) : pick(D.AP_COURSES);
      if (!apNames.includes(n) && !excluded(n)) apNames.push(n);
    }
    // Applications go in during senior year, before that spring's exams: those classes show as in progress.
    const seniorPicks = apNames.filter(n => D.SENIOR_APS.includes(n)).concat(apNames.filter(n => !D.SENIOR_APS.includes(n)));
    const inProgress = new Set(seniorPicks.slice(0, Math.min(apNames.length, Math.round(apNames.length * rand(0.3, 0.45)))));
    const aps = apNames.map(n => ({
      name: n,
      score: inProgress.has(n) ? null : clamp(Math.round(0.1 + testSkill * 0.05 + (major.ap.includes(n) ? 0.3 : 0) + gauss() * 0.6), 1, 5)
    }));
    const apsDone = apNames.length - inProgress.size;

    // Weighted GPA: 21 graded classes in grades 9–11, with +1.0 for each finished AP and +0.5 for each honors class.
    const honors = clamp(Math.round(gradeSkill / 100 * 7 + gauss() * 1.5 - 1), 0, 10);
    const wgpa = round2(clamp(gpa + (apsDone * 1 + honors * 0.5) / 21, gpa, 5.0));

    // Some applicants go test-optional, mostly weaker test-takers; the rest send an SAT or ACT score.
    let sat = null, act = null;
    if (rng() < 0.05 + Math.max(0, 60 - testSkill) / 220) { /* test-optional */ }
    else if (rng() < 0.32) act = clamp(Math.round(12 + testSkill / 100 * 24 + gauss() * 1.2), 1, 36);
    else sat = clamp(Math.round((700 + testSkill * 8.8 + gauss() * 35) / 10) * 10, 400, 1600);

    // Men's and women's programs are separate teams: recruits only pick programs for their own gender.
    let sport = null, stars = 0;
    const sportIds = opts.sports || (rng() < 0.7 ? ctx.sports : null);
    const fits = x => !x.g || x.g === gender;
    let sportPool = (sportIds && sportIds.length ? sportIds.map(sportById).filter(Boolean) : D.SPORTS).filter(fits);
    if (!sportPool.length) sportPool = D.SPORTS.filter(fits);
    // Higher divisions and a bigger recruiting budget draw more, and better, recruits.
    const recruitSpend = Math.min(1, (ctx.athletics || 0) / 2000000);
    const tilt = (ctx.starTilt || 0) + recruitSpend * 0.6;
    if (rng() < (opts.athleteRate != null ? opts.athleteRate : 0.2 + recruitSpend * 0.08)) {
      sport = pick(sportPool).id;
      stars = weightedPick([1, 2, 3, 4, 5], n => Math.max(2, [30 - 8 * tilt, 30 - 4 * tilt, 22 + 2 * tilt, 13 + 5 * tilt, 5 + 5 * tilt][n - 1]));
    }

    // Family finances. Stronger students skew a little wealthier, as they do in real applicant pools.
    const wealthTilt = (q - 50) / 100;
    const bracket = weightedPick(D.INCOME, b => b.w * Math.max(0.2, 1 + wealthTilt * (b.id - 1.5) * 0.6));
    let efc = roundTo(rand(bracket.efc[0], bracket.efc[1]), 500);
    const firstGen = rng() < [0.45, 0.25, 0.08, 0.02][bracket.id];
    const legacy = !firstGen && rng() < Math.min(0.1, (ctx.alumni || 0) / 60000);

    const activities = sample(ACT_NAMES, randInt(1, 3) + (q > 70 && rng() < 0.4 ? 1 : 0));

    let hook = null;
    if (opts.hooks !== false && rng() < HOOK_RATE) {
      const options = Object.keys(D.HOOKS).filter(k => q >= D.HOOKS[k].min);
      hook = weightedPick(options, k => D.HOOKS[k].w);
    }
    let income = bracket.id;
    if (hook === 'olympian') {
      if (!sport) sport = pick(sportPool).id;
      stars = 5;
    } else if (hook === 'donor') {
      income = 3;
      efc = roundTo(rand(150000, 400000), 1000);
    }

    // Early Decision is binding, so those applicants tend to be families who can pay; Early Action isn't.
    let round = 'RD';
    const rr = rng();
    const edShare = ctx.ed ? 0.06 + ctx.prestige / 1000 : 0;
    const eaShare = ctx.ea ? 0.18 + ctx.prestige / 800 : 0;
    if (rr < edShare) {
      round = 'ED';
      if (hook !== 'donor') efc = roundTo(Math.max(efc * 1.4, efc + 8000), 500);
    } else if (rr < edShare + eaShare) round = 'EA';

    let greekP = 0.22 + (activities.some(x => ACT_TAG.get(x) === 'social') ? 0.15 : 0) + (income >= 2 ? 0.08 : 0) - (firstGen ? 0.06 : 0) + (legacy ? 0.1 : 0);

    const a = {
      id: opts.id != null ? opts.id : s.nextId++,
      name,
      gender,
      city, region, stateCode, intl,
      gpa, wgpa, honors, aps, sat, act,
      major: major.id,
      sport, stars,
      activities,
      income, efc, firstGen, legacy, hook,
      greekInt: rng() < greekP,
      round,
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

  // A cycle's pool is saved as its seed and context, not file by file, so it can run to the tens of thousands.
  function generateApplicants() {
    const s = state;
    const out = applicantOutlook();
    const ctx = poolContext();
    s.pool = { gen: POOL_GEN, seed: Math.floor(Math.random() * 2147483647), n: Math.round(out.total * rand(0.92, 1.08)), firstId: s.nextId, ctx };
    s.nextId += s.pool.n;
    s.applicants = buildPool(s.pool);
    s.phase = s.applicants.some(isEarly) ? 'early' : 'regular';
    s.earlyReport = null;
    s.staff.used = 0;
  }
  function buildPool(pool) {
    const prev = rng;
    rng = seeded(pool.seed);
    try {
      const list = [];
      for (let i = 0; i < pool.n; i++) list.push(makeApplicant({ ctx: pool.ctx, id: pool.firstId + i }));
      return list;
    } finally {
      rng = prev;
    }
  }

  // Chance an admitted student says yes. Strong students are harder to land
  // at a low-prestige school; missing majors or teams, cost and a cramped campus hurt.
  function enrollChance(a) {
    const s = state, m = metrics();
    if (a.committed) return 1;
    // Before release, an Early Decision admit is a commitment unless the aid falls short.
    if (a.round === 'ED' && !a.deferred && s.phase === 'early') return edCommitChance(a);
    let p = 0.5 + (s.prestige - a.idx) * 0.01;
    if (!s.majors.includes(a.major)) p *= 0.4;
    else {
      if ((m.deptClasses[a.major] || 0) >= 2) p *= 1.1;
      const cov = deptCoverage(a.major);
      if (cov < 1) p *= 0.75 + 0.25 * cov;
    }
    if (a.sport) p *= s.sports.includes(a.sport) ? 1.3 * D.DIVISIONS[s.athletics.division].yield : 0.6;
    if (a.round === 'EA' && !a.deferred) p *= 1.25;
    p *= 0.95 + outcomeScore() / 1200;
    const pkg = aidPackage(a);
    p *= pkg.gap <= 0 ? 1.15 : clamp(1.1 - pkg.gap / 40000, 0.15, 1.1);
    if (pkg.merit > 0) p *= 1 + Math.min(0.4, pkg.merit / 40000);
    p *= 0.85 + m.life.score / 100 * 0.3;
    if (m.housing.freshBeds < s.targetClass) p *= 0.75 + 0.25 * m.housing.freshBeds / Math.max(1, s.targetClass);
    if (!a.intl && a.stateCode === s.school.state) p *= 1.15;
    if (a.intl) p *= 0.85;
    if (a.legacy) p *= 1.3;
    if (a.greekInt) p *= greekChapters(a.gender).length ? 1.08 : 0.94;
    return clamp(p, 0.03, 0.95);
  }

  function enrollFactors(a) {
    const s = state, m = metrics();
    const out = [];
    if (a.committed) return [{ tone: 'good', text: 'Committed through Early Decision' }];
    if (a.round === 'ED' && !a.deferred && s.phase === 'early') {
      const pkg = aidPackage(a);
      return [pkg.gap > 0
        ? { tone: 'warn', text: 'Early Decision is binding, but the family is $' + pkg.gap.toLocaleString() + ' a year short and may be released' }
        : { tone: 'good', text: 'Early Decision is binding: if you admit them, they come' }];
    }
    if (a.round === 'EA' && !a.deferred) out.push({ tone: 'good', text: 'Applied Early Action, a sign you’re a top choice' });
    if (a.deferred) out.push({ tone: 'warn', text: 'Deferred from the early round' });
    const gap = s.prestige - a.idx;
    if (gap < -15) out.push({ tone: 'bad', text: 'Strong student who may hold out for a more prestigious school' });
    else if (gap > 10) out.push({ tone: 'good', text: 'Your school is a reach for this student' });
    if (!s.majors.includes(a.major)) out.push({ tone: 'bad', text: 'You don’t offer their intended major' });
    else {
      if ((m.deptClasses[a.major] || 0) >= 2) out.push({ tone: 'good', text: 'Their major has a full slate of classes' });
      else out.push({ tone: 'warn', text: 'Their major has fewer than 2 classes' });
      if (deptCoverage(a.major) < 1) out.push({ tone: 'bad', text: 'Their department is short on seats for its majors' });
    }
    if (a.sport) {
      out.push(s.sports.includes(a.sport)
        ? { tone: 'good', text: 'Wants to play ' + sportById(a.sport).name + ' and you have a team' }
        : { tone: 'bad', text: 'Wants to play ' + sportById(a.sport).name + ' but you have no team' });
    }
    const pkg = aidPackage(a);
    if (pkg.gap > 0) out.push({ tone: pkg.gap > 15000 ? 'bad' : 'warn', text: 'Family is $' + pkg.gap.toLocaleString() + ' a year short of the net price' });
    else out.push({ tone: 'good', text: 'Family can cover the net price' });
    if (pkg.merit > 0) out.push({ tone: 'good', text: 'Earns a $' + pkg.merit.toLocaleString() + ' merit scholarship (' + meritRuleText(pkg.meritRule) + ')' });
    if (m.life.score >= 60) out.push({ tone: 'good', text: 'Lively campus (campus life ' + Math.round(m.life.score) + ')' });
    else if (m.life.score < 40) out.push({ tone: 'bad', text: 'Quiet campus (campus life ' + Math.round(m.life.score) + ')' });
    if (m.housing.freshBeds < s.targetClass) out.push({ tone: 'bad', text: 'Not enough dorm beds to guarantee freshman housing' });
    if (!a.intl && a.stateCode === s.school.state) out.push({ tone: 'good', text: 'Lives in your state' });
    if (a.intl) out.push({ tone: 'warn', text: 'International student; visas and distance lower yield' });
    if (a.legacy) out.push({ tone: 'good', text: 'A parent graduated from your school' });
    if (a.greekInt) {
      out.push(greekChapters(a.gender).length
        ? { tone: 'good', text: 'Wants to go Greek and you have ' + (a.gender === 'F' ? 'sororities' : 'fraternities') }
        : { tone: 'warn', text: 'Wants to go Greek but you have no ' + (a.gender === 'F' ? 'sororities' : 'fraternities') });
    }
    return out;
  }

  // ---------- early round ----------
  const isEarly = a => a.round === 'ED' || a.round === 'EA';
  // Files the office can see right now. Regular applicants arrive once early decisions go out.
  function visibleApplicants() {
    const s = state;
    return s.phase === 'early' ? s.applicants.filter(isEarly) : s.applicants;
  }
  // Early files decided in the early round can't be reopened in the regular round.
  function isLocked(a) {
    return state.phase === 'regular' && isEarly(a) && !a.deferred;
  }
  // The middle option: defer in the early round, waitlist in the regular round.
  function holdDecision() {
    return state.phase === 'early' ? 'defer' : 'waitlist';
  }
  function setDecision(a, d) {
    if (!a || isLocked(a)) return false;
    if (d === 'waitlist' || d === 'defer') d = holdDecision();
    a.decision = d;
    return true;
  }
  // Early Decision is binding, but a family can walk away if the aid package leaves them short.
  function edCommitChance(a) {
    const gap = aidPackage(a).gap;
    return gap <= 0 ? 0.98 : clamp(1 - gap / 25000, 0.2, 0.95);
  }
  function releaseEarly() {
    const s = state;
    if (s.phase !== 'early') return null;
    const r = { edAdmitted: 0, committed: 0, released: 0, eaAdmitted: 0, deferred: 0, autoDeferred: 0, denied: 0 };
    for (const a of s.applicants) {
      if (!isEarly(a)) continue;
      if (a.decision === 'pending') { a.decision = 'defer'; r.autoDeferred++; }
      if (a.decision === 'defer') { a.deferred = true; a.decision = 'pending'; r.deferred++; }
      else if (a.decision === 'deny') r.denied++;
      else if (a.decision === 'admit') {
        if (a.round === 'ED') {
          r.edAdmitted++;
          if (rng() < edCommitChance(a)) { a.committed = true; r.committed++; } else r.released++;
        } else r.eaAdmitted++;
      }
    }
    s.phase = 'regular';
    s.earlyReport = r;
    log('Early decisions went out: ' + r.committed + ' students committed through Early Decision, ' + r.eaAdmitted + ' admitted Early Action, ' + r.deferred + ' deferred.');
    save();
    return r;
  }
  function expectedFreshmen() {
    return state.applicants.reduce((x, a) => x + (a.decision === 'admit' ? enrollChance(a) : 0), 0);
  }
  function setEarlyPrograms(ed, ea) {
    state.early = { ed: !!ed, ea: !!ea };
    save();
  }

  // ---------- admissions staff ----------
  function staffCapacity() { return state.staff.readers * D.STAFF.filesPerReader; }
  function staffRemaining() { return Math.max(0, staffCapacity() - state.staff.used); }
  function setReaders(n) {
    state.staff.readers = clamp(Math.round(n), 0, 2000);
    save();
  }
  function setStaffRule(key, value) {
    state.staff.rules[key] = value;
    save();
  }
  // Readers work through pending files in the order they arrived, applying your rules.
  // Files they flag stay pending for you to read yourself.
  function staffRead(list) {
    const s = state, r = s.staff.rules;
    const out = { read: 0, admit: 0, hold: 0, deny: 0, flagged: 0 };
    let cap = staffRemaining();
    const files = (list || visibleApplicants()).filter(a => a.decision === 'pending' && !a.flagged && !isLocked(a)).sort((x, y) => x.id - y.id);
    let expected = expectedFreshmen();
    const hold = holdDecision();
    for (const a of files) {
      if (cap <= 0) break;
      cap--;
      s.staff.used++;
      out.read++;
      const good = a.hook && a.hook !== 'trouble';
      if ((a.hook === 'trouble' && r.records === 'flag') || (good && r.standouts === 'flag')) {
        a.flagged = true;
        out.flagged++;
        continue;
      }
      let d;
      if (a.hook === 'trouble' && r.records === 'deny') d = 'deny';
      else if (good && r.standouts === 'admit') d = 'admit';
      else if (a.sport && s.sports.includes(a.sport) && a.stars >= r.athleteStars) d = 'admit';
      else if (a.idx >= r.admit) d = 'admit';
      else if (a.idx >= r.wait) d = hold;
      else d = 'deny';
      if (d === 'admit' && r.stopAtTarget && expected >= s.targetClass * 1.05) d = hold;
      a.decision = d;
      if (d === 'admit') { expected += enrollChance(a); out.admit++; }
      else if (d === 'deny') out.deny++;
      else out.hold++;
    }
    save();
    return out;
  }

  // ---------- recruiting ----------
  function setRecruit(key, value) {
    state.recruit[key] = value;
    save();
  }
  function toggleCampaign(kind, id) {
    const list = state.recruit[kind];
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    save();
  }

  // ---------- graduation & careers ----------
  function careerFor(st) {
    const s = state;
    const out = D.OUTCOMES[st.major] || D.OUTCOMES.undeclared;
    const placed = rng() < clamp(out[1] * (0.85 + (st.idx || 50) / 400 + s.prestige / 500), 0.3, 0.99);
    const salary = placed ? roundTo(out[0] * (0.75 + (st.idx || 50) / 250 + s.prestige / 400) * Math.exp(gauss() * 0.15), 500) : 0;
    return { placed, salary };
  }
  function median(list) {
    if (!list.length) return 0;
    const v = list.slice().sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  }
  // 0–100 from recent graduation rates, job placement and pay. New schools get a neutral 60.
  function outcomeScore() {
    const o = state.outcomes;
    if (!o || !o.length) return 60;
    const recent = o.slice(-3);
    const avg = k => recent.reduce((x, r) => x + r[k], 0) / recent.length;
    return clamp(avg('gradRate') * 50 + avg('placed') * 30 + clamp((avg('salary') - 35000) / 40000, 0, 1) * 20, 0, 100);
  }
  // How a major's graduates have done at your school over the last few years.
  function majorOutcome(id) {
    let n = 0, placed = 0, pay = 0;
    for (const r of state.outcomes.slice(-3)) {
      const b = r.byMajor[id];
      if (b) { n += b[0]; placed += b[1]; pay += b[2]; }
    }
    return n ? { n, placed: placed / n, salary: placed ? Math.round(pay / placed) : 0 } : null;
  }

  // ---------- athletics: divisions, conferences, Title IX ----------
  function conferenceOf() {
    return D.CONFERENCES.find(c => c.id === state.athletics.conference) || D.CONFERENCES[0];
  }
  function defaultConference(div) {
    return D.CONFERENCES.filter(c => c.div === div).sort((a, b) => a.minPrestige - b.minPrestige)[0];
  }
  // How far the share of women among athletes is from the share among students. Small rosters swing
  // by chance, so the allowance starts wide and narrows toward 10 points as the athletic program grows.
  function titleIX() {
    const m = metrics();
    if (!m.athletes || !m.n) return { gap: 0, allowed: 0.1, over: false, women: 0, students: 0 };
    const women = m.athletesF / m.athletes, students = m.female / m.n;
    const gap = Math.abs(women - students);
    const allowed = 0.1 + 0.6 / Math.sqrt(m.athletes);
    return { gap, allowed, over: m.athletes >= 20 && gap > allowed, women, students };
  }
  function titleIXGap() { const t = titleIX(); return t.over ? t.gap - t.allowed + 0.1 : 0; }
  function divisionCheck(target) {
    const s = state;
    const d = D.DIVISIONS[target];
    const cur = D.DIVISIONS[s.athletics.division];
    const reasons = [];
    if (target === s.athletics.division) reasons.push('You’re already in ' + d.label + '.');
    if (d.rank < cur.rank) {
      const progs = s.sports.map(sportById).filter(Boolean);
      const women = progs.filter(x => x.g === 'F').length;
      if (progs.length < d.minPrograms) reasons.push('Needs ' + d.minPrograms + ' varsity programs (you have ' + progs.length + ').');
      if (women < d.minWomen) reasons.push('Needs ' + d.minWomen + ' women’s programs (you have ' + women + ').');
      if (s.prestige < d.minPrestige) reasons.push('Needs prestige ' + d.minPrestige + '.');
      if (titleIX().over) reasons.push('Your athletes’ gender mix is too far from your student body’s (Title IX). Add teams for the underrepresented gender.');
      if (s.athletics.transition > 0) reasons.push('Finish your current transition first.');
      if (s.budget < d.fee) reasons.push('Needs ' + d.fee.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) + ' for the membership fee.');
    }
    return { ok: !reasons.length, reasons, up: d.rank < cur.rank };
  }
  function changeDivision(target) {
    const s = state;
    const chk = divisionCheck(target);
    if (!chk.ok) return chk;
    const d = D.DIVISIONS[target];
    if (chk.up) { s.budget -= d.fee; s.athletics.transition = d.transition; }
    else s.athletics.transition = 0;
    s.athletics.division = target;
    s.athletics.conference = defaultConference(target).id;
    log((chk.up ? 'Moved up to ' : 'Moved down to ') + d.label + ' and joined the ' + conferenceOf().name + '.');
    save();
    return chk;
  }
  function conferenceCheck(id) {
    const s = state;
    const c = D.CONFERENCES.find(x => x.id === id);
    const reasons = [];
    if (!c) return { ok: false, reasons: ['Unknown conference.'] };
    if (c.id === s.athletics.conference) reasons.push('You’re already a member.');
    if (c.div !== s.athletics.division) reasons.push('It’s a ' + D.DIVISIONS[c.div].label + ' conference.');
    if (s.prestige < c.minPrestige) reasons.push('Invites schools with prestige ' + c.minPrestige + '+.');
    if (c.needsFootball && !s.sports.includes('m-football')) reasons.push('Requires a football program.');
    if (s.athletics.transition > 0 && c.tv > defaultConference(c.div).tv) reasons.push('Finish your division transition first.');
    if (s.budget < CONFERENCE_EXIT_FEE) reasons.push('Needs $500K to cover the exit fee.');
    return { ok: !reasons.length, reasons };
  }
  function joinConference(id) {
    const s = state;
    const chk = conferenceCheck(id);
    if (!chk.ok) return chk;
    s.budget -= CONFERENCE_EXIT_FEE;
    s.athletics.conference = id;
    log('Joined the ' + conferenceOf().name + '.');
    save();
    return chk;
  }

  // Conference titles, rivalry games, postseason runs and Title IX complaints.
  function athleticsEvents(results) {
    const s = state;
    const ev = [];
    const add = (tone, text, fx) => ev.push(Object.assign({ tone, text, prestige: 0, buzz: 0, money: 0 }, fx));
    const conf = conferenceOf();
    const div = D.DIVISIONS[s.athletics.division];
    const big = s.athletics.division === 'D1' ? 1.5 : 1;
    for (const r of results) {
      const pct = r.w / Math.max(1, r.w + r.l);
      if (s.athletics.transition > 0) continue;
      if (pct >= 0.7 && rng() < (pct - 0.55) * 1.6) {
        add('good', r.name + ' won the ' + conf.name + ' championship.', { prestige: 0.15 * big, buzz: 1 * big });
        if (pct >= 0.8 && rng() < 0.35) {
          const flagship = r.id === 'm-football' || r.id === 'm-basketball' || r.id === 'w-basketball';
          const money = flagship ? roundTo(rand(0.3, 1.2) * div.revenue * 1e6, 50000) : 0;
          add('good', r.name + ' made a deep run in the national ' + (r.id === 'm-football' ? 'playoff' : 'tournament') + '.', { prestige: 0.2 * big, buzz: 3 * big, money });
        }
      }
    }
    const marquee = ['m-football', 'm-basketball', 'w-basketball'].find(id => s.sports.includes(id));
    const mr = results.find(r => r.id === marquee);
    if (mr) {
      const rival = conf.rivals[s.year % conf.rivals.length];
      if (rng() < mr.w / Math.max(1, mr.w + mr.l)) add('good', mr.name + ' beat ' + rival + ' in the rivalry game. Students celebrated all night.', { buzz: 1.2 });
      else add('warn', mr.name + ' lost the rivalry game to ' + rival + '.', { buzz: -0.3 });
    }
    // Title IX: athletic opportunities should track the student body.
    const gap = titleIXGap();
    if (titleIX().over) {
      s.athletics.titleIX++;
      if (rng() < Math.min(0.85, (gap - 0.1) * 3 + 0.1 * (s.athletics.titleIX - 1))) {
        if (s.athletics.titleIX >= 3) add('bad', 'A federal Title IX investigation found ' + s.school.name + ' gives women unequal athletic opportunities.', { prestige: -2, buzz: -3, money: -2000000 });
        else add('bad', 'A Title IX complaint was filed over unequal athletic opportunities for women.', { prestige: -0.6, buzz: -1, money: -300000 });
      }
    } else s.athletics.titleIX = 0;
    if (s.athletics.transition > 0) {
      s.athletics.transition--;
      if (!s.athletics.transition) add('good', s.school.name + ' completed its move to ' + div.label + '. Teams can now win conference titles.', { buzz: 2 });
    }
    return ev;
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

  function addClass(dept, courseIndex, size, quiet) {
    const d = deptById(dept);
    const title = d.courses[courseIndex];
    const section = state.classes.filter(c => c.dept === dept && c.course === courseIndex).length + 1;
    const c = {
      id: state.nextId++,
      dept,
      course: courseIndex,
      code: courseCode(dept, courseIndex),
      title,
      section,
      size
    };
    state.classes.push(c);
    invalidate();
    if (!quiet) save();
    return c;
  }
  function removeClass(id) {
    state.classes = state.classes.filter(c => c.id !== id);
    save();
  }
  // Drop the most recently added section of a course in a given format.
  function removeSection(dept, courseIndex, size) {
    const list = state.classes.filter(c => c.dept === dept && c.course === courseIndex && c.size === size);
    if (!list.length) return false;
    removeClass(list[list.length - 1].id);
    return true;
  }
  // Add standard sections, spread across the catalog, until the department seats all its majors with some room.
  function staffDepartment(dept) {
    const d = deptById(dept);
    const goal = Math.ceil((metrics().majorCount[dept] || 0) * 1.1);
    let seats = metrics().deptSeats[dept] || 0;
    let added = 0;
    while ((seats < goal || classesInDept(dept).length < 2) && added < 400) {
      // Fill the least-staffed course first.
      const counts = d.courses.map((_, k) => state.classes.filter(c => c.dept === dept && c.course === k).length);
      const k = counts.indexOf(Math.min.apply(null, counts));
      addClass(dept, k, 'standard', true);
      seats += D.CLASS_SIZES.standard.seats;
      added++;
    }
    save();
    return added;
  }
  // Add Gen Ed lecture halls until every student has their seats.
  function fillSeatGap() {
    let added = 0;
    while (totalSeats() < seatsNeeded() && added < 500) {
      const counts = D.GEN_ED.courses.map((_, k) => state.classes.filter(c => c.dept === 'gen' && c.course === k).length);
      addClass('gen', counts.indexOf(Math.min.apply(null, counts)), 'lecture', true);
      added++;
    }
    save();
    return added;
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

  // ---------- housing ----------
  const HALL_SUFFIX = { traditional: 'Hall', suites: 'Suites', apartments: 'Apartments', honors: 'Honors House', tower: 'Tower' };
  function newHallName(type) {
    const used = new Set(state.dorms.map(d => d.name));
    for (const base of sample(D.HALL_NAMES, D.HALL_NAMES.length)) {
      const name = base + ' ' + HALL_SUFFIX[type];
      if (!used.has(name)) return name;
    }
    return 'Residence Hall ' + (state.dorms.length + 1);
  }
  function buildDorm(type) {
    const spec = D.DORMS[type];
    if (state.budget < spec.cost) return null;
    state.budget -= spec.cost;
    const d = { id: state.nextId++, type, name: newHallName(type), built: state.year };
    state.dorms.push(d);
    log('Opened ' + d.name + ', adding ' + spec.beds + ' beds.');
    save();
    return d;
  }
  function closeDorm(id) {
    const d = state.dorms.find(x => x.id === id);
    if (!d) return;
    state.dorms = state.dorms.filter(x => x.id !== id);
    log('Closed ' + d.name + '.');
    save();
  }

  // ---------- Greek life ----------
  function greekChapters(gender) {
    const kind = gender === 'F' ? 'sorority' : 'fraternity';
    return state.greek.filter(c => c.kind === kind);
  }
  function chapterMembers(id) {
    return metrics().chapterCount[id] || 0;
  }
  function charterChapter(name, kind) {
    if (state.greek.some(c => c.name === name)) return null;
    if (state.budget < D.GREEK.charterCost) return null;
    state.budget -= D.GREEK.charterCost;
    const c = { id: state.nextId++, name, kind, house: false, probation: 0, founded: state.year };
    state.greek.push(c);
    log('Chartered a chapter of ' + name + '.');
    save();
    return c;
  }
  function closeChapter(id) {
    const c = state.greek.find(x => x.id === id);
    if (!c) return;
    state.greek = state.greek.filter(x => x.id !== id);
    let n = 0;
    for (const st of state.students) if (st.greek === id) { st.greek = null; n++; }
    log('Shut down the ' + c.name + ' chapter. ' + n + ' members lost their chapter.');
    save();
  }
  function buildChapterHouse(id) {
    const c = state.greek.find(x => x.id === id);
    if (!c || c.house || state.budget < D.GREEK.houseCost) return false;
    state.budget -= D.GREEK.houseCost;
    c.house = true;
    log(c.name + ' moved into a new chapter house with ' + D.GREEK.houseBeds + ' beds.');
    save();
    return true;
  }
  function setGreekPolicy(p) {
    if (!D.GREEK_POLICIES[p]) return;
    state.greekPolicy = p;
    save();
  }
  // Interested students pledge a chapter of their own kind that has room and isn't on probation.
  function rush(students, rate) {
    const s = state, m = metrics();
    const policy = D.GREEK_POLICIES[s.greekPolicy];
    const counts = Object.assign({}, m.chapterCount);
    let joined = 0;
    for (const st of students) {
      if (st.greek || !st.greekInt || rng() > rate * policy.interest) continue;
      const open = greekChapters(st.gender).filter(c => !c.probation && (counts[c.id] || 0) < D.GREEK.cap);
      if (!open.length) continue;
      const c = pick(open);
      st.greek = c.id;
      counts[c.id] = (counts[c.id] || 0) + 1;
      joined++;
    }
    invalidate();
    return joined;
  }

  // Enrolled students keep only what the campus uses; transcripts stay in the admissions file.
  function toStudent(a, yearInSchool, classOf) {
    const st = {};
    for (const k of STUDENT_KEYS) if (a[k] !== undefined) st[k] = a[k];
    st.yearInSchool = yearInSchool;
    st.classOf = classOf;
    st.greek = null;
    return st;
  }

  // ---------- applicants: per-file actions ----------

  // ---------- money ----------
  function finances(records) {
    const s = state, m = metrics();
    records = records || s.sportRecords;
    const students = s.students;
    const tuition = students.reduce((sum, st) => sum + tuitionFor(st), 0);
    const revenue = [{ label: 'Tuition (sticker price)', amount: tuition }];
    revenue.push({ label: 'Room & board', amount: m.housing.residents * s.roomBoard });
    if (s.school.type === 'public') {
      revenue.push({ label: 'State funding', amount: 6e6 + m.inState * 3000 });
    }
    const donationRate = s.school.type === 'private' ? 14000 : 8000;
    revenue.push({ label: 'Alumni donations', amount: Math.round(Math.pow(s.prestige, 1.5) * donationRate * 0.7 + s.alumniGiving) });
    const sportsRev = s.sports.reduce((sum, id) => {
      const sp = sportById(id);
      const rec = records[id];
      const pct = rec ? rec.w / Math.max(1, rec.w + rec.l) : 0.5;
      return sum + sp.revenue * (0.5 + pct) * (0.6 + s.prestige / 100);
    }, 0);
    const div = D.DIVISIONS[s.athletics.division];
    revenue.push({ label: 'Athletics tickets & media', amount: Math.round(sportsRev * div.revenue) });
    const tv = conferenceOf().tv * (s.athletics.transition > 0 ? 0.5 : 1);
    if (tv) revenue.push({ label: 'Conference TV deal', amount: tv });
    // Scholarships cover roster spots, not every recruit on campus.
    const onRoster = {};
    for (const st of students) if (st.sport) onRoster[st.sport] = (onRoster[st.sport] || 0) + 1;
    const scholarshipAthletes = s.sports.reduce((x, id) => x + Math.min(onRoster[id] || 0, sportById(id).roster), 0);
    const rec = s.recruit;

    const hallUpkeep = s.dorms.reduce((x, d) => x + D.DORMS[d.type].beds * D.DORMS[d.type].upkeep, 0);
    const greekCost = s.greek.length * D.GREEK.upkeep + s.greek.filter(c => c.house).length * D.GREEK.houseBeds * D.GREEK.houseUpkeep;
    const expenses = [
      { label: 'Financial aid', amount: m.aidTotal },
      { label: 'Campus operations', amount: 2e6 + students.length * 6500 },
      { label: 'Academic departments', amount: s.majors.reduce((sum, id) => sum + majorById(id).cost, 0) },
      { label: 'Faculty for classes', amount: s.classes.reduce((sum, c) => sum + D.CLASS_SIZES[c.size].cost, 0) },
      { label: 'Residence halls & dining', amount: hallUpkeep + m.housing.residents * DINING_PER_RESIDENT },
      { label: 'Athletic programs', amount: s.sports.reduce((sum, id) => sum + sportById(id).cost, 0) },
      { label: 'Admissions staff', amount: s.staff.readers * D.STAFF.readerCost },
      { label: 'Recruiting & marketing', amount: rec.marketing + rec.athletics + rec.states.length * D.RECRUITING.stateCost + rec.countries.length * D.RECRUITING.countryCost }
    ];
    if (div.schol) expenses.push({ label: 'Athletic scholarships', amount: scholarshipAthletes * div.schol });
    if (s.greek.length) expenses.push({ label: 'Greek life office & houses', amount: greekCost });
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
      const elite = roster.filter(st => st.hook === 'olympian').length;
      const talent = roster.length ? Math.min(1.2, roster.reduce((x, st) => x + st.stars, 0) / roster.length / 5 + elite * 0.04) : 0.2;
      const depth = Math.min(1, roster.length / Math.max(3, sp.roster * 0.4));
      // Opponents get better as you move up a division.
      const p = clamp(0.12 + 0.55 * talent * (0.4 + 0.6 * depth) + 0.2 * s.prestige / 100 - D.DIVISIONS[s.athletics.division].starTilt * 0.06 + rand(-0.08, 0.08), 0.04, 0.96);
      let w = 0;
      for (let g = 0; g < sp.games; g++) if (rng() < p) w++;
      const rec = { w, l: sp.games - w, recruits: roster.length };
      s.sportRecords[id] = rec;
      results.push({ id, name: sp.name, ...rec });
    }
    return results;
  }

  // What alumni give back each year, for life.
  function givingFor(st, salary) {
    let g = 40 + (salary ? salary * 0.003 : (st.idx || 50));
    if (st.income === 3) g += 600;
    if (st.greek) g *= 1.6;
    if (st.hook === 'startup') g += 5000;
    if (st.hook === 'donor') g += 8000;
    return Math.round(g);
  }

  // Your students make the news. Standouts drive most of it; campus culture and Greek life do the rest.
  function campusEvents(m) {
    const s = state;
    const ev = [];
    const add = (tone, text, fx) => ev.push(Object.assign({ tone, text, prestige: 0, buzz: 0, money: 0 }, fx));
    const who = st => st.name + ' ' + shortYear(st.classOf);
    const school = s.school.name;
    for (const st of s.students) {
      if (!st.hook) continue;
      const r = rng();
      switch (st.hook) {
        case 'merit':
          if (r < 0.22) add('good', who(st) + ' won a ' + pick(['Rhodes', 'Marshall', 'Goldwater', 'Truman', 'Fulbright']) + ' Scholarship.', { prestige: 0.5, buzz: 1 });
          break;
        case 'research':
          if (r < 0.28) add('good', who(st) + ' published undergraduate research in a top journal.', { prestige: 0.4 });
          break;
        case 'debate':
          if (r < 0.3) add('good', who(st) + ' led the debate team to a national title.', { prestige: 0.3, buzz: 1.5 });
          break;
        case 'founder':
          if (r < 0.25) add('good', who(st) + '’s nonprofit won a national service award.', { prestige: 0.2, buzz: 2 });
          break;
        case 'startup':
          if (r < 0.22) {
            const g = roundTo(rand(100000, 800000), 50000);
            add('good', who(st) + '’s startup raised a funding round, and they gave $' + g.toLocaleString() + ' back to ' + school + '.', { money: g, buzz: 1.5 });
          }
          break;
        case 'influencer':
          if (r < 0.1) add('bad', who(st) + ' posted a video that went viral for the wrong reasons.', { prestige: -0.6, buzz: 2 });
          else if (r < 0.55) add('good', who(st) + '’s campus vlogs went viral. High schoolers everywhere are talking about ' + school + '.', { buzz: Math.round(rand(4, 9)) });
          break;
        case 'performer':
          if (r < 0.3) add('good', who(st) + ' performed on national TV and gave ' + school + ' a shout-out.', { buzz: 4 });
          break;
        case 'artist':
          if (r < 0.25) add('good', who(st) + '’s work was shown at a national museum.', { prestige: 0.2, buzz: 1 });
          break;
        case 'activist':
          if (r < 0.15) add('warn', who(st) + ' led a campus protest that made national news. Some donors grumbled.', { buzz: 3, money: -200000 });
          else if (r < 0.35) add('good', who(st) + ' organized a service drive that made national news.', { buzz: 3, prestige: 0.1 });
          break;
        case 'olympian':
          if (r < 0.25 && st.sport) add('good', who(st) + ' won a national ' + sportById(st.sport).name.toLowerCase() + ' title.', { buzz: 3, prestige: 0.3 });
          break;
        case 'trouble':
          if (r < 0.28) add('bad', who(st) + ' was arrested after an off-campus incident.', { prestige: -0.5, buzz: -1 });
          break;
      }
    }

    // Greek chapters: philanthropy, parties and the occasional scandal.
    const policy = D.GREEK_POLICIES[s.greekPolicy];
    for (const c of s.greek) {
      if (c.probation > 0) c.probation--;
      const members = m.chapterCount[c.id] || 0;
      if (!members) continue;
      const risk = 0.05 * (members / 50) * policy.risk * (1 + (m.chapterTrouble[c.id] || 0) * 0.5);
      const r = rng();
      if (r < risk) {
        c.probation = 2;
        add('bad', c.name + ' was suspended after a hazing investigation. The chapter can’t recruit for 2 years.', { prestige: -rand(0.6, 1.2), buzz: -2 });
      } else if (r < risk + 0.15) {
        const g = roundTo(rand(20000, 120000), 5000);
        add('good', c.name + '’s philanthropy week raised $' + g.toLocaleString() + ' for charity.', { buzz: 0.5, prestige: 0.05 });
      }
    }

    // Campus culture: strong scenes produce highlights, weak ones produce complaints.
    const lines = {
      arts: ['The spring musical sold out every night of its run.', { buzz: 1.5 }],
      service: ['Students logged a record number of volunteer hours this year.', { prestige: 0.1, buzz: 0.5 }],
      leader: ['Student government won a national award for campus leadership.', { prestige: 0.1, buzz: 0.5 }],
      stem: ['An undergraduate team won a national research competition.', { prestige: 0.2 }],
      media: ['The student newspaper won a national journalism award.', { buzz: 1 }],
      social: ['Homecoming drew its biggest crowd in school history.', { buzz: 1 }],
      greek: ['Greek Week brought thousands of alumni back to campus.', { buzz: 0.5, money: 150000 }],
      spirit: ['Students packed the stands all season. The student section went viral.', { buzz: 1.5 }]
    };
    for (const d of m.life.dims) {
      const l = lines[d.id];
      if (!l) continue;
      if (d.value >= 75 && rng() < 0.35) add('good', l[0], l[1]);
    }
    if (m.life.score < 35 && rng() < 0.5) add('bad', 'Students complain there’s nothing to do on weekends. Tour guides are struggling.', { buzz: -1.5 });

    // Housing crunch.
    if (m.housing.overflow > 0) {
      const share = m.housing.overflow / Math.max(1, m.housing.demand);
      add('bad', m.housing.overflow + ' students who wanted campus housing couldn’t get a bed. Some are living in hotel rooms.', { prestige: -Math.min(1.5, 0.3 + share * 3), buzz: -Math.min(4, 1 + share * 8) });
    }

    // Wealthy alumni remember you.
    for (const al of s.notableAlumni) {
      if ((al.hook === 'startup' || al.hook === 'donor') && rng() < 0.06) {
        const g = roundTo(rand(1, 8) * 1e6, 250000);
        add('good', al.name + ' ' + shortYear(al.classOf) + ' gave $' + g.toLocaleString() + ' to name a new endowed fund.', { money: g });
      }
    }
    return ev;
  }

  function endSeason() {
    const s = state;
    // Early decisions go out first if you haven't sent them, then staff read whatever is left.
    const early = s.phase === 'early' ? releaseEarly() : s.earlyReport;
    const staffOut = s.staff.autoRead && staffRemaining() ? staffRead() : null;
    const m0 = metrics();
    const rep = {
      early, staffRead: staffOut,
      year: s.year,
      applied: s.applicants.length,
      admitted: 0, waitlisted: 0, denied: 0, untouched: 0,
      enrolled: 0, fromWaitlist: 0, graduated: 0, dropped: 0,
      prestigeBefore: s.prestige, budgetBefore: s.budget,
      events: []
    };
    for (const a of s.applicants) {
      if (a.decision === 'admit') rep.admitted++;
      else if (a.decision === 'waitlist') rep.waitlisted++;
      else if (a.decision === 'deny') rep.denied++;
      else rep.untouched++;
    }
    const appF = s.applicants.filter(a => a.gender === 'F').length;
    rep.appliedFemalePct = rep.applied ? appF / rep.applied : 0;

    // 1. Admitted students decide.
    const incoming = s.applicants.filter(a => a.decision === 'admit' && rng() < enrollChance(a));
    // 2. Fill remaining room from the waitlist, best first.
    if (incoming.length < s.targetClass) {
      const wl = s.applicants.filter(a => a.decision === 'waitlist').sort((x, y) => y.idx - x.idx);
      for (const a of wl) {
        if (incoming.length >= s.targetClass) break;
        if (rng() < Math.min(0.95, enrollChance(a) * 1.4)) {
          incoming.push(a);
          rep.fromWaitlist++;
        }
      }
    }
    // Aid is locked in at the package they accepted.
    for (const a of incoming) a.aid = aidPackage(a).total;
    rep.committed = incoming.filter(a => a.committed).length;
    s.cohorts[s.year + 4] = incoming.length;

    // 3. Current students move up a year; some leave, seniors graduate.
    const coverage = seatCoverage();
    const lifeBonus = (m0.life.score - 50) / 2000;
    const stay = [];
    const grads = [];
    let newAlumni = 0;
    for (const st of s.students) {
      let dropRate = 0.03 + (coverage < 1 ? (1 - coverage) * 0.15 : 0);
      if (st.major === 'undeclared' || !s.majors.includes(st.major)) dropRate += 0.05;
      else {
        const dc = deptCoverage(st.major);
        if (dc < 1) dropRate += (1 - dc) * 0.1;
      }
      if (st.idx < 45) dropRate += (45 - st.idx) / 600;
      if (st.greek) dropRate -= 0.01;
      dropRate -= lifeBonus;
      if (m0.housing.overflow > 0 && st.yearInSchool === 1) dropRate += 0.03;
      if (rng() < Math.max(0.005, dropRate)) { rep.dropped++; continue; }
      st.yearInSchool++;
      if (st.yearInSchool > 4) {
        rep.graduated++;
        newAlumni++;
        const career = careerFor(st);
        grads.push({ major: st.major, placed: career.placed, salary: career.salary });
        s.alumniGiving += givingFor(st, career.salary);
        if (st.hook && st.hook !== 'trouble') {
          s.notableAlumni.unshift({ name: st.name, classOf: st.classOf, hook: st.hook, major: st.major });
          if (s.notableAlumni.length > 200) s.notableAlumni.length = 200;
        }
        continue;
      }
      stay.push(st);
    }
    s.alumni += newAlumni;

    // Where the graduating class landed.
    const byMajor = {};
    for (const g of grads) {
      const b = byMajor[g.major] || (byMajor[g.major] = [0, 0, 0]);
      b[0]++;
      if (g.placed) { b[1]++; b[2] += g.salary; }
    }
    const cohort = s.cohorts[s.year] || Math.round(grads.length / 0.85);
    const pays = grads.filter(g => g.placed).map(g => g.salary);
    rep.outcome = {
      year: s.year, graduated: grads.length, cohort,
      gradRate: cohort ? Math.min(1, grads.length / cohort) : 0,
      placed: grads.length ? pays.length / grads.length : 0,
      salary: median(pays), byMajor
    };
    if (grads.length) {
      s.outcomes.push(rep.outcome);
      if (s.outcomes.length > 40) s.outcomes.shift();
    }
    delete s.cohorts[s.year];

    // 4. Freshmen arrive.
    const freshmen = incoming.map(a => {
      return toStudent(a, 1, s.year + 4);
    });
    s.students = stay.concat(freshmen);
    invalidate();

    // Philanthropic families celebrate move-in day.
    for (const st of freshmen) {
      if (st.hook === 'donor') {
        const g = roundTo(rand(1, 5) * 1e6, 250000);
        rep.events.push({ tone: 'good', text: 'The family of ' + st.name + ' ' + shortYear(st.classOf) + ' pledged $' + g.toLocaleString() + ' for a new building.', prestige: 0.2, buzz: 1, money: g });
      }
    }

    rep.enrolled = incoming.length;
    const pctOf = (list, fn) => (list.length ? list.filter(fn).length / list.length : 0);
    rep.femalePct = pctOf(incoming, a => a.gender === 'F');
    rep.inStatePct = pctOf(incoming, a => !a.intl && a.stateCode === s.school.state);
    rep.intlPct = pctOf(incoming, a => a.intl);
    rep.firstGenPct = pctOf(incoming, a => a.firstGen);
    rep.avgAid = incoming.length ? Math.round(incoming.reduce((x, a) => x + a.aid, 0) / incoming.length) : 0;
    rep.standouts = incoming.filter(a => a.hook && a.hook !== 'trouble').map(a => ({ name: a.name, hook: a.hook }));
    rep.troubleIn = incoming.filter(a => a.hook === 'trouble').length;
    rep.incomingAvgGpa = incoming.length ? round2(incoming.reduce((x, a) => x + a.gpa, 0) / incoming.length) : null;
    rep.incomingAvgIdx = incoming.length ? Math.round(incoming.reduce((x, a) => x + a.idx, 0) / incoming.length) : null;
    const satTakers = incoming.filter(a => a.sat);
    rep.incomingAvgSat = satTakers.length ? Math.round(satTakers.reduce((x, a) => x + a.sat, 0) / satTakers.length / 10) * 10 : null;
    rep.yieldRate = rep.admitted ? incoming.filter(a => a.decision === 'admit').length / rep.admitted : 0;
    rep.acceptRate = rep.applied ? rep.admitted / rep.applied : 0;

    // 5. Rush: freshmen pledge, and a few sophomores who waited.
    rep.pledged = rush(freshmen, 0.85) + rush(stay.filter(st => st.yearInSchool === 2), 0.25);

    // 6. Sports season.
    rep.sports = playSports();
    invalidate();
    const m = metrics();

    // 7. Campus news driven by the students you admitted, plus the athletic season.
    rep.events = rep.events.concat(campusEvents(m), athleticsEvents(rep.sports));
    // A big school makes more news, but each headline matters less: yearly effects level off.
    const evPrestige = clamp(rep.events.reduce((x, e) => x + e.prestige, 0), -2, 2);
    const evBuzz = 15 * Math.tanh(rep.events.reduce((x, e) => x + e.buzz, 0) / 15);
    const evMoney = rep.events.reduce((x, e) => x + e.money, 0);

    // 8. Money for the year.
    const fin = finances();
    rep.finance = fin;
    s.budget += fin.net + evMoney;
    rep.eventMoney = evMoney;
    let gift = 0;
    if (rng() < 0.15 + s.prestige / 400) {
      gift = Math.round(rand(0.5, 3) * (0.5 + s.prestige / 50) * 1e6 / 1e5) * 1e5;
      s.budget += gift;
    }
    rep.gift = gift;

    // 9. Prestige drifts toward a score built from the school you ran this year, plus what your students did.
    const incomingIdx = rep.incomingAvgIdx != null ? rep.incomingAvgIdx
      : (s.students.length ? s.students.reduce((x, st) => x + st.idx, 0) / s.students.length * 0.9 : 20);
    const games = rep.sports.reduce((x, r) => x + r.w + r.l, 0);
    const winPct = games ? rep.sports.reduce((x, r) => x + r.w, 0) / games : 0.4;
    // A tiny class isn't selective, it's empty: scale the academic credit by how full the class is.
    const fill = Math.min(1, rep.enrolled / Math.max(1, s.targetClass));
    const target = 0.3 * incomingIdx * (0.5 + 0.5 * fill)
      + 0.11 * Math.min(100, s.majors.length * 4)
      + 0.11 * Math.min(100, coverage * 100)
      + 0.11 * classQuality() * 100
      + 0.11 * winPct * 100
      + 0.16 * m.life.score
      + 0.1 * outcomeScore();
    s.prestige = Math.round(clamp(s.prestige + (target - s.prestige) * 0.25 + evPrestige, 1, 99) * 10) / 10;
    rep.prestigeAfter = s.prestige;
    rep.eventPrestige = evPrestige;
    rep.budgetAfter = s.budget;
    rep.coverage = coverage;
    rep.life = m.life.score;
    rep.housing = m.housing;

    // 10. Buzz fades, then this year's headlines add to it.
    rep.buzzBefore = s.buzz;
    s.buzz = Math.round((s.buzz * 0.6 + evBuzz) * 10) / 10;
    rep.buzzAfter = s.buzz;

    // 11. Record the year and open the next cycle.
    s.history.push({
      year: s.year, applied: rep.applied, admitted: rep.admitted, enrolled: rep.enrolled,
      acceptRate: rep.acceptRate, yieldRate: rep.yieldRate, avgGpa: rep.incomingAvgGpa,
      femalePct: rep.femalePct, inStatePct: rep.inStatePct, life: m.life.score,
      gradRate: grads.length ? rep.outcome.gradRate : null, salary: grads.length ? rep.outcome.salary : null,
      students: s.students.length, prestige: s.prestige, budget: s.budget, net: fin.net
    });
    log('Class of ' + (s.year + 4) + ' enrolled: ' + rep.enrolled + ' freshmen from ' + rep.applied.toLocaleString() + ' applicants.', s.year);
    if (rep.graduated) log(rep.graduated + ' seniors graduated.', s.year);
    if (rep.dropped) log(rep.dropped + ' students left before finishing.', s.year);
    for (const r of rep.sports) log(r.name + ' finished ' + r.w + '–' + r.l + '.', s.year);
    for (const e of rep.events.slice(0, 10)) log(e.text, s.year);
    if (gift) log('An alum donated $' + gift.toLocaleString() + ' to the endowment.', s.year);
    s.year++;
    invalidate();
    generateApplicants();
    s.lastReport = rep;
    saveNow();
    return rep;
  }

  function log(text, year) {
    state.news.unshift({ year: year != null ? year : state.year, text });
    if (state.news.length > 80) state.news.length = 80;
  }

  // ---------- lifecycle ----------
  function newGame(settings) {
    const cfg = START[settings.type];
    state = {
      version: 5,
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
      roomBoard: cfg.roomBoard,
      aid: { needMet: cfg.aid.needMet, rules: cfg.aid.rules.map(r => Object.assign({}, r)) },
      targetClass: cfg.targetClass,
      majors: STARTER_MAJORS.slice(),
      sports: STARTER_SPORTS.slice(),
      classes: [],
      students: [],
      applicants: [],
      sportRecords: {},
      dorms: [],
      greek: [],
      greekPolicy: 'standard',
      buzz: 0,
      alumni: cfg.alumni,
      alumniGiving: Math.round(Math.pow(cfg.prestige, 1.5) * (settings.type === 'private' ? 14000 : 8000) * 0.3),
      notableAlumni: [],
      history: [],
      news: [],
      nextId: 1,
      lastReport: null
    };
    Object.assign(state, officeDefaults(settings.type));
    state.version = 5;
    invalidate();
    for (const m of STARTER_MAJORS) {
      addClass(m, 0, 'standard', true);
      addClass(m, 1, 'standard', true);
    }
    addClass('gen', 0, 'lecture', true);
    addClass('gen', 1, 'standard', true);
    for (const t of cfg.dorms) state.dorms.push({ id: state.nextId++, type: t, name: newHallName(t), built: START_YEAR - 30 });
    state.greek.push({ id: state.nextId++, name: pick(D.FRATERNITIES), kind: 'fraternity', house: false, probation: 0, founded: START_YEAR - 20 });
    state.greek.push({ id: state.nextId++, name: pick(D.SORORITIES), kind: 'sorority', house: false, probation: 0, founded: START_YEAR - 20 });

    // An existing student body of four classes.
    for (let y = 1; y <= 4; y++) {
      const n = Math.round(cfg.targetClass * rand(0.75, 0.9));
      for (let i = 0; i < n; i++) {
        const a = makeApplicant({
          q: clamp(30 + cfg.prestige * 0.5 + gauss() * 14, 5, 95),
          majors: STARTER_MAJORS, sports: STARTER_SPORTS, athleteRate: 0.12, hooks: rng() < 0.6
        });
        a.aid = aidPackage(a).total;
        state.students.push(toStudent(a, y, START_YEAR + 4 - y));
      }
      // Each class started a little bigger than it is now; some students have left.
      state.cohorts[START_YEAR + 4 - y] = Math.round(n / (1 - 0.035 * (y - 1)));
    }
    invalidate();
    rush(state.students, 0.8);
    playSports();
    invalidate();
    generateApplicants();
    log('Welcome to ' + settings.name + '. The ' + START_YEAR + ' admissions cycle is open.');
    saveNow();
    return state;
  }

  // ---------- saving ----------
  // Students are saved as compact arrays. The applicant pool is saved as its seed plus your decisions.
  const STUDENT_KEYS = ['id', 'name', 'gender', 'region', 'stateCode', 'intl', 'gpa', 'major', 'sport', 'stars',
    'activities', 'idx', 'income', 'firstGen', 'legacy', 'hook', 'greekInt', 'aid', 'yearInSchool', 'classOf', 'greek'];
  const APPLICANT_KEYS = ['id', 'name', 'gender', 'city', 'region', 'stateCode', 'intl', 'gpa', 'wgpa', 'aps', 'sat', 'act',
    'major', 'sport', 'stars', 'activities', 'idx', 'income', 'efc', 'firstGen', 'legacy', 'hook', 'greekInt', 'decision', 'scholarship' /* unused since v5 */, 'honors', 'round', 'deferred', 'committed', 'flagged'];
  const NULLABLE = new Set(['sat', 'act', 'sport', 'hook', 'stateCode', 'greek']);
  const BOOL_KEYS = new Set(['intl', 'firstGen', 'legacy', 'greekInt', 'deferred', 'committed', 'flagged']);
  const AP_INDEX = new Map(D.AP_COURSES.map((n, i) => [n, i]));
  const ACT_INDEX = new Map(ACT_NAMES.map((n, i) => [n, i]));
  const DECISION_CODE = { pending: 'p', admit: 'a', waitlist: 'w', deny: 'd', defer: 'f' };
  const DECISION_FROM = { p: 'pending', a: 'admit', w: 'waitlist', d: 'deny', f: 'defer' };
  // Early-round state per file, as a digit: 1 deferred, 2 committed, 4 flagged by staff.
  const flagBits = a => (a.deferred ? 1 : 0) | (a.committed ? 2 : 0) | (a.flagged ? 4 : 0);

  function pack(p, keys) {
    const out = keys.map(k => {
      const v = p[k];
      if (v === undefined || v === null) return null;
      if (k === 'aps') return v.map(x => AP_INDEX.get(x.name) * 10 + (x.score || 0));
      if (k === 'activities') return v.map(x => (ACT_INDEX.has(x) ? ACT_INDEX.get(x) : x));
      if (BOOL_KEYS.has(k)) return v ? 1 : 0;
      return v;
    });
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  }
  function unpack(arr, keys) {
    const p = {};
    keys.forEach((k, i) => {
      const v = arr[i];
      if (BOOL_KEYS.has(k)) p[k] = !!v;
      else if (v === undefined || v === null) { if (NULLABLE.has(k)) p[k] = null; }
      else if (k === 'aps') p[k] = v.map(n => ({ name: D.AP_COURSES[Math.floor(n / 10)], score: n % 10 || null }));
      else if (k === 'activities') p[k] = v.map(x => (typeof x === 'number' ? ACT_NAMES[x] : x));
      else p[k] = v;
    });
    return p;
  }

  let saveTimer = null;
  let saveOk = true;
  // Called after every change. Derived numbers refresh at once; the write to storage is batched.
  function save() {
    invalidate();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    invalidate();
    if (!state) return true;
    try {
      const out = Object.assign({}, state, { format: 2, students: state.students.map(st => pack(st, STUDENT_KEYS)) });
      if (state.pool && state.applicants.length === state.pool.n) {
        out.applicants = null;
        out.decisions = state.applicants.map(a => DECISION_CODE[a.decision] || 'p').join('');
        out.flags = state.applicants.map(flagBits).join('');
      } else {
        out.pool = null;
        out.applicants = state.applicants.map(a => pack(a, APPLICANT_KEYS));
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(out));
      localStorage.setItem(META_KEY, JSON.stringify({ name: state.school.name, year: state.year }));
      saveOk = true;
    } catch (e) {
      saveOk = false;
    }
    return saveOk;
  }
  function flush() { if (saveTimer) saveNow(); }

  function hydrate(raw) {
    const st = JSON.parse(raw);
    if (st.format !== 2) return st;
    delete st.format;
    st.students = st.students.map(x => unpack(x, STUDENT_KEYS));
    state = st;
    if (st.pool && st.pool.gen !== POOL_GEN) {
      // Made by an older generator: it can't be rebuilt faithfully, so a fresh pool is drawn after loading.
      st.applicants = [];
      st.pool = null;
      st.stalePool = true;
    } else if (st.pool) {
      st.applicants = buildPool(st.pool);
      const codes = st.decisions || '';
      const flags = st.flags || '';
      st.applicants.forEach((a, i) => {
        a.decision = DECISION_FROM[codes[i]] || 'pending';
        const f = +(flags[i] || 0);
        if (f & 1) a.deferred = true;
        if (f & 2) a.committed = true;
        if (f & 4) a.flagged = true;
      });
    } else {
      st.applicants = st.applicants.map(x => unpack(x, APPLICANT_KEYS));
    }
    delete st.decisions;
    delete st.scholarships;
    delete st.flags;
    return st;
  }
  function load() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) raw = localStorage.getItem(OLD_SAVE_KEY);
      if (!raw) return null;
      state = migrate(hydrate(raw));
      invalidate();
      if (state.stalePool) {
        delete state.stalePool;
        generateApplicants();
        log('The game was updated, so this cycle’s applicant pool was redrawn.');
        saveNow();
      }
      return state;
    } catch (e) { return null; }
  }
  function peekSave() {
    try {
      const meta = localStorage.getItem(META_KEY);
      if (meta && localStorage.getItem(SAVE_KEY)) return { school: { name: JSON.parse(meta).name }, year: JSON.parse(meta).year };
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function deleteSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(META_KEY);
      localStorage.removeItem(OLD_SAVE_KEY);
    } catch (e) { /* ignore */ }
  }

  // Bring a save from an earlier version of the game up to date, one version at a time.
  function migrate(st) {
    if (st.version >= 5) return st;
    state = st;
    if (!(st.version >= 2)) migrateTo2(st);
    if (st.version < 3) migrateTo3(st);
    if (st.version < 4) migrateTo4(st);
    migrateTo5(st);
    return st;
  }

  // Version 5 replaced the single merit cutoff with automatic scholarship rules and added more hometowns.
  function migrateTo5(st) {
    const a = st.aid || {};
    const rules = a.rules || (a.meritAmount ? [{ metric: 'idx', min: a.meritIdx, amount: a.meritAmount, who: 'all' }] : []);
    st.aid = { needMet: a.needMet != null ? a.needMet : 0.5, rules };
    st.version = 5;
    st.applicants = [];
    st.pool = null;
    st.stalePool = true;
    invalidate();
  }

  // Version 4 added early rounds, the admissions staff, recruiting, athletics divisions and career outcomes.
  function migrateTo4(st) {
    Object.assign(st, officeDefaults(st.school.type));
    for (const p of st.students) st.cohorts[p.classOf] = (st.cohorts[p.classOf] || 0) + 1;
    for (const k in st.cohorts) st.cohorts[k] = Math.round(st.cohorts[k] / 0.9);
    for (const h of st.history) { if (h.gradRate === undefined) h.gradRate = null; }
    st.version = 4;
    // The pool came from an older generator; draw a fresh one once loading finishes.
    st.applicants = [];
    st.pool = null;
    st.stalePool = true;
    invalidate();
  }

  // Version 3 split shared teams into separate men's and women's programs.
  function migrateTo3(st) {
    const newIds = old => ['m-' + old, 'w-' + old, old].filter(id => SPORT_MAP.has(id));
    const forPerson = (old, gender) => {
      if (!old || SPORT_MAP.has(old) && old.indexOf('-') > 0) return old;
      return newIds(old).find(id => { const sp = sportById(id); return !sp.g || sp.g === gender; }) || null;
    };
    const programs = [];
    for (const old of st.sports) for (const id of newIds(old)) if (!programs.includes(id)) programs.push(id);
    st.sports = programs;
    const records = {};
    for (const [old, rec] of Object.entries(st.sportRecords || {})) for (const id of newIds(old)) records[id] = rec;
    st.sportRecords = records;
    for (const p of st.students) {
      p.sport = forPerson(p.sport, p.gender);
      if (!p.sport) p.stars = 0;
    }
    st.version = 3;
    // Applicants were drawn by the old generator; draw a fresh pool once loading finishes.
    st.applicants = [];
    st.pool = null;
    st.stalePool = true;
    invalidate();
  }

  function migrateTo2(st) {
    const cfg = START[st.school.type] || START.public;
    st.version = 2;
    if (st.tuitionOut == null) st.tuitionOut = st.tuitionIn;
    st.roomBoard = cfg.roomBoard;
    st.aid = { needMet: cfg.aid.needMet, rules: cfg.aid.rules.map(r => Object.assign({}, r)) };
    st.dorms = [];
    st.greek = [];
    st.greekPolicy = 'standard';
    st.buzz = 0;
    st.alumni = cfg.alumni;
    st.alumniGiving = Math.round(Math.pow(st.prestige, 1.5) * (st.school.type === 'private' ? 14000 : 8000) * 0.3);
    st.notableAlumni = [];
    const female = new Set(D.FEMALE_NAMES);
    const male = new Set(D.MALE_NAMES);
    const fill = p => {
      const first = p.name.split(' ')[0];
      p.gender = female.has(first) ? 'F' : male.has(first) ? 'M' : (rng() < 0.5 ? 'F' : 'M');
      const b = weightedPick(D.INCOME, x => x.w);
      p.income = b.id;
      p.efc = roundTo(rand(b.efc[0], b.efc[1]), 500);
      p.firstGen = rng() < [0.45, 0.25, 0.08, 0.02][b.id];
      p.legacy = false;
      p.hook = null;
      p.greekInt = rng() < 0.25;
      if (p.stateCode === undefined) p.stateCode = null;
    };
    for (const a of st.applicants) fill(a);
    for (const s of st.students) { fill(s); s.greek = null; }
    invalidate();
    for (const s of st.students) s.aid = aidPackage(s).total;
    st.students = st.students.map(s => toStudent(s, s.yearInSchool, s.classOf));
    // Enough halls for the students already on campus.
    while (totalBeds() < st.students.length * 0.75) st.dorms.push({ id: st.nextId++, type: 'traditional', name: newHallName('traditional'), built: st.year - 30 });
    invalidate();
  }

  function randomSchoolName() {
    const P = D.NAME_PARTS;
    if (rng() < 0.25) return 'University of ' + pick(pick(D.STATES).cities);
    return pick(P.first) + pick(P.second) + ' ' + pick(P.kind);
  }

  window.Game = {
    get state() { return state; },
    set state(v) { state = v; invalidate(); },
    get saveOk() { return saveOk; },
    SEATS_PER_STUDENT, COURSE_NUMBERS, DINING_PER_RESIDENT,
    majorById, sportById, deptById, stateByCode, courseCode, tagsOf,
    newGame, load, save, saveNow, flush, peekSave, deleteSave,
    metrics, invalidate, applicantOutlook, residencyMix, typicalNetPrice,
    academicIndex, enrollChance, enrollFactors, tuitionFor, aidPackage,
    MERIT_METRICS, MERIT_WHO, meritFor, addMeritRule, updateMeritRule, removeMeritRule, meritRuleText,
    classesInDept, totalSeats, seatsNeeded, seatCoverage, classQuality, deptCoverage,
    addClass, removeClass, removeSection, staffDepartment, fillSeatGap,
    addMajor, dropMajor, addSport, cutSport, rosterFor,
    totalBeds, buildDorm, closeDorm,
    greekChapters, chapterMembers, charterChapter, closeChapter, buildChapterHouse, setGreekPolicy,
    finances, endSeason, randomSchoolName, pick,
    isEarly, visibleApplicants, isLocked, holdDecision, setDecision, releaseEarly, edCommitChance, expectedFreshmen, setEarlyPrograms,
    staffCapacity, staffRemaining, setReaders, setStaffRule, staffRead, setRecruit, toggleCampaign,
    outcomeScore, majorOutcome, conferenceOf, titleIX, titleIXGap, divisionCheck, changeDivision, conferenceCheck, joinConference
  };
})();
