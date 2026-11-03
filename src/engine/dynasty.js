// The dynasty: when Pharaoh dies, the player rules on as the heir.
//
// succeed(state, report) → true if the bloodline holds (play continues as the
// new Pharaoh), false if there is nobody left to take the crown.
import { clamp } from './util.js';
import { chance, random } from './rng.js';
import { heir, child, livingSons, livingDaughters, isAdult, wife } from './realm.js';
import { weighHeart } from './ending.js';
import { seedNum, randTrait, MALE_NAMES, FEMALE_NAMES } from './people.js';

const THRONE_NAMES_M = ['Usermaatre', 'Menkheperre', 'Nebmaatre', 'Menmaatre', 'Heqamaatre', 'Userkhaure', 'Neferkheperre', 'Akheperre', 'Sekhemkhaure', 'Baenre', 'Djeserkheperure'];
const THRONE_NAMES_F = ['Maatkare', 'Sobekkare', 'Sitre-Meritamun', 'Neferneferuaten', 'Hatnefer-Maatre'];
const ROMAN = ['', ' I', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII'];

/** Who takes the crown: the designated heir, else the eldest son, else the eldest brother. */
export function findSuccessor(state) {
  const h = heir(state);
  if (h && h.alive && !h.abroad) return h;
  const kids = livingSons(state).filter((s) => s.rel !== 'sibling' && !String(s.role).includes('Exiled'));
  if (kids.length) return [...kids].sort((a, b) => b.age - a.age)[0];
  const brothers = livingSons(state).filter((s) => !String(s.role).includes('Exiled'));
  if (brothers.length) return [...brothers].sort((a, b) => b.legitimacy - a.legitimacy)[0];
  const daughters = livingDaughters(state).filter((d) => d.office !== 'gods_wife');
  if (daughters.length) return [...daughters].sort((a, b) => b.age - a.age)[0];
  return null;
}

function regnalOrdinal(state, personal) {
  const prior = (state.dynasty || []).filter((r) => r.personal === personal).map((r) => r.ordinal || 1);
  return prior.length ? Math.max(...prior) + 1 : 1;
}

function throneName(state, female) {
  const used = new Set([state.pharaoh.throneName, ...(state.dynasty || []).map((r) => r.throneName)]);
  const pool = female ? THRONE_NAMES_F : THRONE_NAMES_M;
  return pool.find((n) => !used.has(n)) || `${pool[0]}-Setepenre`;
}

export function succeed(state, report) {
  const old = state.pharaoh;
  const judgment = weighHeart(state, 'death');
  state.dynasty = state.dynasty || [];
  state.dynasty.push({
    name: old.name,
    personal: old.personal || old.name.replace(/ [IVX]+$/, ''),
    ordinal: old.ordinal || 1,
    throneName: old.throneName,
    sex: old.sex || 'm',
    seed: old.seed,
    years: state.year,
    died: old.age,
    score: judgment.score,
    verdict: judgment.verdict,
  });
  state.lastReign = { name: old.name, ...judgment };

  const h = findSuccessor(state);
  if (!h) return false;

  const female = h.sex === 'f';
  const personal = h.name;
  const ordinal = regnalOrdinal(state, personal);
  const king = {
    id: h.id,
    kind: female ? 'pharaoh-f' : 'pharaoh',
    sex: female ? 'f' : 'm',
    seed: h.seed,
    personal,
    motherId: h.motherId,
    ordinal,
    name: `${personal}${ROMAN[ordinal] || ` ${ordinal}`}`,
    throneName: throneName(state, female),
    age: h.age,
    health: clamp(95 - Math.max(0, h.age - 25), 45, 95),
    condition: h.age < 16 ? 'A child on the Horus throne' : female ? 'A woman wearing the nemes and the false beard of kingship, as Hatshepsut did' : 'Newly crowned, and watched by everyone',
    away: false,
    trait: h.trait,
    skill: h.skill,
  };
  report.push(`**${old.name} has flown to the horizon.** ${female ? 'Princess' : 'Prince'} ${personal} takes the Double Crown as **${king.name}**, ${king.throneName}.`);

  // The old king's wives become dowagers; the new king's mother is Queen Mother.
  for (const w of state.wives) {
    if (w.status !== 'court') continue;
    w.status = 'dowager';
    if (w.id === h.motherId) {
      w.title = 'King’s Mother';
      w.influence = clamp(w.influence + 20, 0, 100);
      w.satisfaction = clamp(w.satisfaction + 20, 0, 100);
    } else {
      w.title = 'Dowager Queen';
      w.influence = clamp(w.influence - 10, 0, 100);
    }
  }

  // The new king's own spouse joins the court.
  let queenId = null;
  const sp = h.spouse && typeof h.spouse === 'object' ? h.spouse : null;
  if (sp) {
    const sister = sp.ref ? child(state, sp.ref) : null;
    queenId = `queen-${state.turn}`;
    if (sister) {
      sister.alive = false; // she leaves the list of princesses to become queen
      sister.becameQueen = true;
    }
    state.wives.push({
      royalBlood: Boolean(sister),
      id: queenId,
      kind: female ? 'consort' : 'queen',
      seed: sister ? sister.seed : sp.seed ?? seedNum(state),
      name: sister ? sister.name : sp.name.replace(/^(Princess|Prince|General|Lady) /, ''),
      title: female ? 'King’s Husband (consort)' : 'Great Royal Wife',
      origin: sister ? `Daughter of ${old.name}` : sp.origin || 'A noble house',
      tie: sp.tie || 'none',
      age: sister ? sister.age : sp.age ?? h.age,
      influence: 50,
      ambition: 50,
      satisfaction: 75,
      plot: 0,
      status: 'court',
    });
  }

  // Brothers and sisters lose ground; the new king's children become the royal children.
  for (const s of [...state.sons, ...(state.daughters || [])]) {
    if (!s.alive || s.id === h.id) continue;
    s.rel = 'sibling';
    s.role = s.office === 'gods_wife' ? s.role : s.sex === 'f' ? 'King’s Sister' : String(s.role).includes('Exiled') ? s.role : 'King’s Brother';
    if (s.legitimacy != null) s.legitimacy = Math.round(s.legitimacy * 0.7);
  }
  state.sons = state.sons.filter((s) => s.id !== h.id);
  state.daughters = (state.daughters || []).filter((d) => d.id !== h.id);
  for (const k of h.kids || []) {
    const motherId = female ? 'pharaoh' : queenId || 'unknown';
    const base = { id: k.id, kind: k.sex === 'f' ? 'princess' : 'prince', sex: k.sex, seed: k.seed, name: k.name, age: k.age, motherId, trait: k.trait || randTrait(state), edu: null, skill: null, spouse: null, alive: true, rel: 'child', divine: Boolean(k.divine) };
    const bonus = k.divine ? 15 : 0;
    if (k.sex === 'f') state.daughters.push({ ...base, role: 'King’s Daughter', legitimacy: 40 + bonus, loyalty: 85 });
    else state.sons.push({ ...base, role: 'King’s Son', legitimacy: (queenId || female ? 60 : 45) + bonus, loyalty: 85 });
  }

  // The new heir: the eldest son of the new king, or nobody yet.
  const sons = state.sons.filter((s) => s.alive && s.rel === 'child');
  state.heirId = null;
  if (sons.length) {
    const first = [...sons].sort((a, b) => b.age - a.age)[0];
    state.heirId = first.id;
    first.role = 'Crown Prince';
  }

  // Commands held by the new king fall vacant.
  for (const u of state.army.units) if (u.commanderId === h.id) u.commanderId = null;

  state.pharaoh = king;
  state.pregnancy = null;
  state.reigns = (state.reigns || 1) + 1;
  state.year = 1;
  state.regency = king.age < 16 ? makeRegency(state, h) : null;
  if (state.regency) report.push(`${king.name} is only ${king.age}. **You now rule as ${state.regency.regent}, regent of the Two Lands**, until the king comes of age at 16. The nobles smell weakness.`);
  if (h.trait === 'frail') king.health = Math.min(king.health, 65);

  // A new reign renews Ma'at, and every faction waits to see the new king.
  state.maat = clamp(Math.round(state.maat * 0.6 + 22), 0, 100);
  for (const b of Object.values(state.blocs)) b.approval = clamp(b.approval + 4, 0, 100);
  if (female) {
    state.blocs.priesthood.approval = clamp(state.blocs.priesthood.approval - 8, 0, 100);
    report.push('The priests of Amun must decide whether a woman can be the son of the god. Priesthood −8%.');
  }

  // Every king needs a house of eternity.
  for (const m of state.monuments) if (m.ongoing) m.active = m.done; // keep finished tombs on the record
  state.monuments.push({ id: `tomb-${state.reigns}`, name: `Tomb of ${king.name} in the Valley of the Kings`, progress: 0, ongoing: true, active: true, done: false, perSeason: 4 });

  // The first briefing of the new reign.
  const rival = rivalForThrone(state, h);
  if (rival) state.forced.push({ eventId: 'succession_war', priority: 99, ctx: { rivalId: rival.id }, since: state.turn + 1 });
  else state.forcedOpportunity = { eventId: 'accession', ctx: {}, since: state.turn + 1, first: true };
  state.rotation.respite = false;

  state.chronicle.push({ turn: state.turn, year: state.year, season: state.season, title: `Accession of ${king.name}`, text: `${old.name} died after ${state.dynasty[state.dynasty.length - 1].years} years. ${king.name} (${king.throneName}) takes the throne.` });
  return true;
}

/** A brother or uncle who might fight for the crown. */
export function rivalForThrone(state, h) {
  const strong = livingSons(state)
    .filter((s) => isAdult(s) && s.loyalty < 60 && !String(s.role).includes('Exiled'))
    .sort((a, b) => b.legitimacy - a.legitimacy)[0];
  if (!strong) return null;
  const commands = state.army.units.filter((u) => u.commanderId === strong.id).reduce((t, u) => t + u.men, 0);
  const threat = strong.legitimacy + commands / 400 - (h.legitimacy ?? 50);
  return threat > 5 ? strong : null;
}

/** Married princes (and a married crown princess) have children of their own. */
export function grandchildrenSeason(state, report) {
  const parents = [...state.sons, ...(state.daughters || [])].filter((c) => c.alive && c.spouse && !c.abroad && c.age >= 18 && c.age <= 44);
  for (const c of parents) {
    c.kids = c.kids || [];
    if (c.kids.length >= 4 || c.sex === 'f' && c.id !== state.heirId) continue;
    if (!chance(state, 0.1)) continue;
    const sex = chance(state, 0.5) ? 'm' : 'f';
    const pool = sex === 'm' ? MALE_NAMES : FEMALE_NAMES;
    const name = pool[(c.kids.length * 7 + c.name.length * 3 + state.turn) % pool.length];
    const divine = Boolean(c.spouse.ref); // a royal sibling marriage
    const trait = divine && chance(state, 0.3) ? 'frail' : randTrait(state);
    c.kids.push({ id: `gk-${c.id}-${state.turn}`, sex, name, age: 0, seed: seedNum(state), trait, divine });
    report.push(`A ${sex === 'm' ? 'grandson' : 'granddaughter'}, ${name}, is born to ${c.sex === 'm' ? 'Prince' : 'Princess'} ${c.name}.`);
  }
}

export function ageGrandchildren(state) {
  for (const c of [...state.sons, ...(state.daughters || [])]) for (const k of c.kids || []) k.age += 1;
}


// ── Regency ─────────────────────────────────────────────────────────────

/** The player rules as the King's Mother if she lives, otherwise as the Vizier. */
export function makeRegency(state, h) {
  const mother = state.wives.find((w) => w.id === h.motherId && w.status !== 'condemned' && w.status !== 'exiled');
  if (mother) return { regent: mother.name, kind: mother.kind === 'wife' ? 'queen' : mother.kind, seed: mother.seed, sex: 'f', age: mother.age, who: 'mother', authority: 60, untilAge: 16 };
  const v = state.vizier;
  return { regent: v.name, kind: 'vizier', seed: v.seed, sex: 'm', age: v.age, who: 'vizier', authority: 50, untilAge: 16, ambition: v.ambition };
}

const GRABS = [
  (s) => {
    const n = s.nomes.filter((x) => !x.hereditary).sort((a, b) => b.ambition - a.ambition)[0];
    if (!n) return null;
    n.hereditary = true;
    n.yield = Math.round(n.yield * 0.95 * 100) / 100;
    return `Nomarch ${n.nomarch} of ${n.name} declares his office hereditary, and nobody stops him.`;
  },
  (s) => {
    const g = [...s.army.generals].sort((a, b) => b.ambition - a.ambition)[0];
    if (!g) return null;
    const u = s.army.units.find((x) => !x.commanderId && x.kind !== 'police') || s.army.units.find((x) => x.station === 'capital' && x.kind !== 'police');
    if (!u) return null;
    u.commanderId = g.id;
    g.loyalty = clamp(g.loyalty - 8, 0, 100);
    return `General ${g.name} takes command of the ${u.name} without asking the regent.`;
  },
  (s) => {
    s.baselineIntake = Math.round(s.baselineIntake * 0.98);
    s.blocs.priesthood.approval = clamp(s.blocs.priesthood.approval + 3, 0, 100);
    return `The High Priest of Amun quietly adds royal fields to Karnak’s estates. Royal tax intake −2%.`;
  },
  (s) => {
    s.vizier.integrity = clamp(s.vizier.integrity - 8, 0, 100);
    return `${s.vizier.name}’s scribes help themselves to the royal granaries while no adult king is watching.`;
  },
];

export function regencySeason(state, report) {
  const r = state.regency;
  if (!r) return;
  r.authority = clamp(r.authority - 2 + (state.maat >= 60 ? 1 : 0), 0, 100);
  if (r.authority < 60 && chance(state, (60 - r.authority) / 100 + 0.1)) {
    const grab = GRABS[Math.floor(random(state) * GRABS.length)];
    const text = grab(state);
    if (text) {
      r.authority = clamp(r.authority - 3, 0, 100);
      report.push(`🦅 *The regency is weak:* ${text}`);
    }
  }
  if (r.authority < 20 && !(state.usedEvents.regency_challenge > state.turn - 4)) {
    state.forced.push({ eventId: 'regency_challenge', priority: 85, ctx: {}, since: state.turn + 1 });
  }
}

/** Children die young, the frail most of all. */
export function childMortality(state, report) {
  for (const c of [...state.sons, ...(state.daughters || [])]) {
    if (!c.alive || c.age > 12) continue;
    const p = c.trait === 'frail' ? 0.06 : c.age < 5 ? 0.02 : 0.008;
    if (!chance(state, p)) continue;
    c.alive = false;
    report.push(`**${c.sex === 'm' ? 'Prince' : 'Princess'} ${c.name} has died, aged ${c.age}.**${c.trait === 'frail' ? ' The child was always frail.' : ''} The court goes into mourning.`);
    if (state.heirId === c.id) {
      state.heirId = null;
      report.push('Egypt has no heir.');
    }
  }
}
