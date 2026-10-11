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
  const HOOK_RATE = 0.07;

  const START = {
    public: {
      budget: 25e6, prestige: 35, tuitionIn: 11000, tuitionOut: 28000, roomBoard: 11500, targetClass: 90,
      aid: { needMet: 0.4, meritAmount: 3000, meritIdx: 75 }, alumni: 4000, dorms: ['traditional', 'traditional']
    },
    private: {
      budget: 40e6, prestige: 45, tuitionIn: 42000, tuitionOut: 42000, roomBoard: 14000, targetClass: 70,
      aid: { needMet: 0.7, meritAmount: 8000, meritIdx: 72 }, alumni: 3000, dorms: ['traditional', 'suites']
    }
  };
  const STARTER_MAJORS = ['bio', 'bus', 'cs', 'engl', 'psych', 'hist'];
  const STARTER_SPORTS = ['basketball', 'soccer', 'track'];

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
      athletes: 0, aidTotal: 0, hooks: 0,
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
      if (st.sport) m.athletes++;
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
    const merit = a.idx >= s.aid.meritIdx ? s.aid.meritAmount : 0;
    const scholarship = a.scholarship || 0;
    const need = Math.max(0, coa - a.efc);
    const needGrant = Math.max(0, need - merit - scholarship) * s.aid.needMet;
    const total = Math.min(coa, Math.round((merit + scholarship + needGrant) / 100) * 100);
    const net = coa - total;
    const gap = Math.max(0, net - a.efc);
    return { coa, merit: Math.min(merit, coa), scholarship, needGrant: Math.round(needGrant), need, total, net, gap };
  }

  // ---------- applicant pool ----------
  // How the pool splits between your state and everywhere else, and how far your name carries.
  function residencyMix() {
    const s = state;
    let base = s.school.type === 'public' ? 0.55 : 0.25;
    base *= clamp(1.25 - s.prestige / 100, 0.35, 1.1);
    const outAppeal = clamp(1.25 - (s.tuitionOut - s.tuitionIn) / 40000 - Math.max(0, s.tuitionOut - 30000) / 100000, 0.3, 1.35);
    const volume = base + (1 - base) * outAppeal;
    return { inShare: base / volume, volume, outAppeal };
  }

  // Sticker shock for a typical middle-income family, after aid.
  function typicalNetPrice() {
    const s = state;
    const probe = { idx: 60, efc: 12000, stateCode: s.school.state, intl: false, scholarship: 0 };
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
      { label: 'Varsity sports', mult: 1 + 0.015 * s.sports.length },
      { label: 'Campus life', mult: 0.8 + m.life.score / 250 },
      { label: 'Buzz', mult: buzzMult(s.buzz) },
      { label: 'Alumni network', mult: 1 + Math.log10(1 + s.alumni / 4000) * 0.35 },
      { label: 'Net price', mult: clamp(1.15 - (net - 15000) / 60000, 0.55, 1.3) },
      { label: 'Out-of-state draw', mult: mix.volume / (s.school.type === 'public' ? 0.92 : 1.1) },
      { label: 'Housing guarantee', mult: m.housing.freshBeds >= s.targetClass ? 1 : 0.88 + 0.12 * m.housing.freshBeds / Math.max(1, s.targetClass) }
    ];
    const base = 90 + 3.5 * s.prestige;
    const total = f.reduce((x, k) => x * k.mult, base);
    return { base, total: Math.max(25, Math.round(total)), factors: f, mix, net };
  }

  // The parts of the school an applicant pool is drawn from, frozen when the pool is generated.
  function poolContext() {
    const s = state;
    return { prestige: s.prestige, majors: s.majors.slice(), sports: s.sports.slice(), alumni: s.alumni, mix: residencyMix() };
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
    } else if (rng() < 0.07 + ctx.prestige / 1500) {
      [city, region] = pick(D.INTERNATIONAL);
      intl = true;
    } else {
      let st;
      do st = weightedPick(D.STATES, x => x.cities.length); while (st.code === s.school.state);
      city = pick(st.cities); region = st.code; stateCode = st.code;
    }

    // Most students apply to schools that offer what they want to study.
    const majorIds = opts.majors || (rng() < 0.8 ? ctx.majors : null);
    const majorPool = majorIds && majorIds.length ? majorIds.map(majorById).filter(Boolean) : D.MAJORS;
    const major = weightedPick(majorPool, m => m.pop);
    const gender = rng() < major.f ? 'F' : 'M';
    const firstName = rng() < 0.08 ? pick(D.NEUTRAL_NAMES) : pick(gender === 'F' ? D.FEMALE_NAMES : D.MALE_NAMES);

    // AP classes lean toward the intended major's subjects. Scores track ability.
    const apCount = clamp(Math.round(q / 100 * 11 + gauss() * 1.8 - 1), 0, 15);
    const apNames = [];
    while (apNames.length < apCount) {
      const name = rng() < 0.45 ? pick(major.ap) : pick(D.AP_COURSES);
      if (!apNames.includes(name)) apNames.push(name);
    }
    const aps = apNames.map(name => ({ name, score: clamp(Math.round(1 + q / 26 + gauss() * 0.8), 1, 5) }));

    const gpa = round2(clamp(2.0 + q / 100 * 2.05 + gauss() * 0.18, 1.7, 4.0));
    const wgpa = round2(clamp(gpa + apCount * 0.06 + rand(0, 0.12), gpa, 5.0));

    // Some applicants go test-optional; the rest send an SAT or ACT score.
    let sat = null, act = null;
    const t = rng();
    if (t < 0.12) { /* test-optional */ }
    else if (t < 0.4) act = clamp(Math.round(12 + q / 100 * 24 + gauss() * 1.8), 1, 36);
    else sat = clamp(Math.round((700 + q * 8.8 + gauss() * 55) / 10) * 10, 400, 1600);

    // Recruits only play for their own squad: no women on the football roster, no men in softball.
    let sport = null, stars = 0;
    const sportIds = opts.sports || (rng() < 0.7 ? ctx.sports : null);
    const fits = x => !x.g || x.g === gender;
    let sportPool = (sportIds && sportIds.length ? sportIds.map(sportById) : D.SPORTS).filter(fits);
    if (!sportPool.length) sportPool = D.SPORTS.filter(fits);
    if (rng() < (opts.athleteRate != null ? opts.athleteRate : 0.2)) {
      sport = pick(sportPool).id;
      stars = weightedPick([1, 2, 3, 4, 5], n => [30, 30, 22, 13, 5][n - 1]);
    }

    // Family finances. Stronger students skew a little wealthier, as they do in real applicant pools.
    const tilt = (q - 50) / 100;
    const bracket = weightedPick(D.INCOME, b => b.w * Math.max(0.2, 1 + tilt * (b.id - 1.5) * 0.6));
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

    let greekP = 0.22 + (activities.some(x => ACT_TAG.get(x) === 'social') ? 0.15 : 0) + (income >= 2 ? 0.08 : 0) - (firstGen ? 0.06 : 0) + (legacy ? 0.1 : 0);

    const a = {
      id: opts.id != null ? opts.id : s.nextId++,
      name: firstName + ' ' + pick(D.LAST_NAMES),
      gender,
      city, region, stateCode, intl,
      gpa, wgpa, aps, sat, act,
      major: major.id,
      sport, stars,
      activities,
      income, efc, firstGen, legacy, hook,
      greekInt: rng() < greekP,
      scholarship: 0,
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
    s.pool = { seed: Math.floor(Math.random() * 2147483647), n: Math.round(out.total * rand(0.92, 1.08)), firstId: s.nextId, ctx };
    s.nextId += s.pool.n;
    s.applicants = buildPool(s.pool);
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
    let p = 0.5 + (s.prestige - a.idx) * 0.01;
    if (!s.majors.includes(a.major)) p *= 0.4;
    else {
      if ((m.deptClasses[a.major] || 0) >= 2) p *= 1.1;
      const cov = deptCoverage(a.major);
      if (cov < 1) p *= 0.75 + 0.25 * cov;
    }
    if (a.sport) p *= s.sports.includes(a.sport) ? 1.3 : 0.6;
    const pkg = aidPackage(a);
    p *= pkg.gap <= 0 ? 1.15 : clamp(1.1 - pkg.gap / 40000, 0.15, 1.1);
    const gift = pkg.merit + pkg.scholarship;
    if (gift > 0) p *= 1 + Math.min(0.4, gift / 40000);
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
    if (pkg.merit + pkg.scholarship > 0) out.push({ tone: 'good', text: 'Offered $' + (pkg.merit + pkg.scholarship).toLocaleString() + ' a year in merit aid' });
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
  function setScholarship(id, amount) {
    const a = state.applicants.find(x => x.id === id);
    if (!a) return;
    a.scholarship = Math.max(0, Math.round(amount));
    save();
  }

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
    revenue.push({ label: 'Athletics tickets & media', amount: Math.round(sportsRev) });

    const hallUpkeep = s.dorms.reduce((x, d) => x + D.DORMS[d.type].beds * D.DORMS[d.type].upkeep, 0);
    const greekCost = s.greek.length * D.GREEK.upkeep + s.greek.filter(c => c.house).length * D.GREEK.houseBeds * D.GREEK.houseUpkeep;
    const expenses = [
      { label: 'Financial aid', amount: m.aidTotal },
      { label: 'Campus operations', amount: 2e6 + students.length * 6500 },
      { label: 'Academic departments', amount: s.majors.reduce((sum, id) => sum + majorById(id).cost, 0) },
      { label: 'Faculty for classes', amount: s.classes.reduce((sum, c) => sum + D.CLASS_SIZES[c.size].cost, 0) },
      { label: 'Residence halls & dining', amount: hallUpkeep + m.housing.residents * DINING_PER_RESIDENT },
      { label: 'Athletic programs', amount: s.sports.reduce((sum, id) => sum + sportById(id).cost, 0) }
    ];
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
      const p = clamp(0.12 + 0.55 * talent * (0.4 + 0.6 * depth) + 0.2 * s.prestige / 100 + rand(-0.08, 0.08), 0.04, 0.96);
      let w = 0;
      for (let g = 0; g < sp.games; g++) if (rng() < p) w++;
      const rec = { w, l: sp.games - w, recruits: roster.length };
      s.sportRecords[id] = rec;
      results.push({ id, name: sp.name, ...rec });
    }
    return results;
  }

  // What alumni give back each year, for life.
  function givingFor(st) {
    let g = 40 + (st.idx || 50) * 2;
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
    const m0 = metrics();
    const rep = {
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

    // 3. Current students move up a year; some leave, seniors graduate.
    const coverage = seatCoverage();
    const lifeBonus = (m0.life.score - 50) / 2000;
    const stay = [];
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
        s.alumniGiving += givingFor(st);
        if (st.hook && st.hook !== 'trouble') {
          s.notableAlumni.unshift({ name: st.name, classOf: st.classOf, hook: st.hook, major: st.major });
          if (s.notableAlumni.length > 200) s.notableAlumni.length = 200;
        }
        continue;
      }
      stay.push(st);
    }
    s.alumni += newAlumni;

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

    // 7. Campus news driven by the students you admitted.
    rep.events = rep.events.concat(campusEvents(m));
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
    const target = 0.32 * incomingIdx * (0.5 + 0.5 * fill)
      + 0.12 * Math.min(100, s.majors.length * 4)
      + 0.12 * Math.min(100, coverage * 100)
      + 0.12 * classQuality() * 100
      + 0.12 * winPct * 100
      + 0.2 * m.life.score;
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
      version: 2,
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
      aid: Object.assign({}, cfg.aid),
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
    'major', 'sport', 'stars', 'activities', 'idx', 'income', 'efc', 'firstGen', 'legacy', 'hook', 'greekInt', 'decision', 'scholarship'];
  const NULLABLE = new Set(['sat', 'act', 'sport', 'hook', 'stateCode', 'greek']);
  const BOOL_KEYS = new Set(['intl', 'firstGen', 'legacy', 'greekInt']);
  const AP_INDEX = new Map(D.AP_COURSES.map((n, i) => [n, i]));
  const ACT_INDEX = new Map(ACT_NAMES.map((n, i) => [n, i]));
  const DECISION_CODE = { pending: 'p', admit: 'a', waitlist: 'w', deny: 'd' };
  const DECISION_FROM = { p: 'pending', a: 'admit', w: 'waitlist', d: 'deny' };

  function pack(p, keys) {
    const out = keys.map(k => {
      const v = p[k];
      if (v === undefined || v === null) return null;
      if (k === 'aps') return v.map(x => AP_INDEX.get(x.name) * 10 + x.score);
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
      else if (k === 'aps') p[k] = v.map(n => ({ name: D.AP_COURSES[Math.floor(n / 10)], score: n % 10 }));
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
        out.scholarships = state.applicants.filter(a => a.scholarship).map(a => [a.id, a.scholarship]);
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
    if (st.pool) {
      st.applicants = buildPool(st.pool);
      const codes = st.decisions || '';
      const schol = new Map(st.scholarships || []);
      st.applicants.forEach((a, i) => {
        a.decision = DECISION_FROM[codes[i]] || 'pending';
        a.scholarship = schol.get(a.id) || 0;
      });
    } else {
      st.applicants = st.applicants.map(x => unpack(x, APPLICANT_KEYS));
    }
    delete st.decisions;
    delete st.scholarships;
    return st;
  }
  function load() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) raw = localStorage.getItem(OLD_SAVE_KEY);
      if (!raw) return null;
      state = migrate(hydrate(raw));
      invalidate();
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

  // Bring a save from an earlier version of the game up to date.
  function migrate(st) {
    if (st.version >= 2) return st;
    state = st;
    const cfg = START[st.school.type] || START.public;
    st.version = 2;
    if (st.tuitionOut == null) st.tuitionOut = st.tuitionIn;
    st.roomBoard = cfg.roomBoard;
    st.aid = Object.assign({}, cfg.aid);
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
    for (const a of st.applicants) { fill(a); a.scholarship = 0; }
    for (const s of st.students) { fill(s); s.greek = null; }
    invalidate();
    for (const s of st.students) s.aid = aidPackage(s).total;
    st.students = st.students.map(s => toStudent(s, s.yearInSchool, s.classOf));
    // Enough halls for the students already on campus.
    while (totalBeds() < st.students.length * 0.75) st.dorms.push({ id: st.nextId++, type: 'traditional', name: newHallName('traditional'), built: st.year - 30 });
    invalidate();
    return st;
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
    academicIndex, enrollChance, enrollFactors, tuitionFor, aidPackage, setScholarship,
    classesInDept, totalSeats, seatsNeeded, seatCoverage, classQuality, deptCoverage,
    addClass, removeClass, removeSection, staffDepartment, fillSeatGap,
    addMajor, dropMajor, addSport, cutSport, rosterFor,
    totalBeds, buildDorm, closeDorm,
    greekChapters, chapterMembers, charterChapter, closeChapter, buildChapterHouse, setGreekPolicy,
    finances, endSeason, randomSchoolName, pick
  };
})();
