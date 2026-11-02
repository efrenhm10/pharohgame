// End-of-season simulation (DESIGN.md §1 step 1). Runs only after a decree.
import { FLOOD_BANDS, ADULT_AGE } from './constants.js';
import { clamp } from './util.js';
import { random, chance, between } from './rng.js';
import { paySeason, collectTaxes, collectTribute, reserveMonths, surplusGold } from './economy.js';
import { rollFlood, cubitsLabel } from './flood.js';
import {
  changeMaat,
  changeApproval,
  courtWives,
  sonsOf,
  heir,
  isAdult,
  livingSons,
  rivalClaimant,
} from './realm.js';
import { chooseBriefing } from './rotation.js';
import { endReign } from './ending.js';
import { SON_NAMES, DAUGHTER_NAMES } from '../content/names.js';

export function forceEvent(state, eventId, priority, ctx = {}) {
  const existing = state.forced.find((f) => f.eventId === eventId);
  if (existing) {
    existing.priority = Math.max(existing.priority, priority);
    Object.assign(existing.ctx, ctx);
    return;
  }
  state.forced.push({ eventId, priority, ctx, since: state.turn });
}

export function endSeason(state) {
  const report = [];
  const endingSeason = state.season;

  // 1. Taxes in, rations out.
  collectTaxes(state, report);
  const pay = paySeason(state, report);

  // Ma'at upkeep: rites performed and people fed slowly restore order;
  // a golden age needs constant maintenance.
  if (pay.shortfall === 0 && state.maat < 50) {
    state.maat += 1;
    report.push('The rites were performed and every ration paid. Ma’at +1.');
  } else if (state.maat > 80) {
    state.maat -= 1;
  }

  // Temporary measures expire.
  if (state.flags.rationCutUntil && state.turn + 1 >= state.flags.rationCutUntil) {
    state.flags.rationCutUntil = null;
    if (state.armyRation < 1) {
      state.armyRation = 1;
      report.push('The year of half rations is over. The native regiments eat full rations again.');
    }
  }

  // 2. Arrears pressure.
  if (state.arrears.army > 0) {
    const d = -Math.round(2 * state.arrears.army);
    changeApproval(state, 'military', d);
    report.push(
      `The army is owed ${state.arrears.army} months of rations. Military approval ${d}%.`,
    );
  }
  if (state.arrears.workforce >= 2) forceEvent(state, 'tomb_strike', 50);

  // 3. Monuments.
  progressMonuments(state, report);

  // 4. The court.
  courtSeason(state, report);

  // 5. Nubian tribute at the end of Shemu.
  if (endingSeason === 2) collectTribute(state, report);

  // 6. Power-block drift toward a Ma'at-set baseline.
  const target = 25 + state.maat * 0.5;
  for (const bloc of ['priesthood', 'bureaucracy', 'military']) {
    const a = state.blocs[bloc].approval;
    if (Math.abs(a - target) >= 1) changeApproval(state, bloc, a < target ? 1 : -1);
  }

  // 7. Calendar.
  state.turn += 1;
  state.season = (state.season + 1) % 3;
  state.pharaoh.away = false;
  if (state.season === 0) newYear(state, report);

  // 8. Seasonal illness.
  const illnessChance = 0.03 + Math.max(0, state.pharaoh.age - 45) * 0.005;
  if (chance(state, illnessChance)) {
    const dmg = Math.round(between(state, 8, 18));
    state.pharaoh.health = clamp(state.pharaoh.health - dmg, 0, 100);
    report.push(`**Pharaoh falls ill with a fever.** Health −${dmg}. The physicians call on Sekhmet.`);
  }
  if (state.pharaoh.health <= 0) {
    state.seasonReport = report;
    endReign(state, 'death', 'The Horus has flown to the horizon. Pharaoh is dead.');
    return;
  }
  if (state.pharaoh.health < 30) report.push('The court physicians whisper that Pharaoh will not see many more floods.');

  // 9. Threshold checks (DESIGN.md §4).
  thresholdChecks(state, report);

  // 10. Omens maturing.
  for (const o of [...state.omens]) {
    if (o.floodBias || o.maturesTurn > state.turn) continue;
    state.omens = state.omens.filter((x) => x !== o);
    if (o.eventId) {
      forceEvent(state, o.eventId, 40, { fromOmen: o.id });
      report.push(`*The omen comes to pass:* ${o.text}`);
    }
  }

  // 11. Expire stale forced entries (> 2 turns old and low priority).
  state.forced = state.forced.filter((f) => f.priority >= 80 || state.turn - f.since <= 2);

  state.seasonReport = report;
  chooseBriefing(state);
}

function newYear(state, report) {
  state.year += 1;
  state.pharaoh.age += 1;
  for (const s of livingSons(state)) s.age += 1;
  for (const d of state.daughters || []) d.age += 1;

  // Yearly aging.
  const decline = Math.max(0, state.pharaoh.age - 40) * 0.4 + random(state) * 3;
  state.pharaoh.health = clamp(Math.round(state.pharaoh.health - decline), 0, 100);

  // The Nile.
  const biasOmens = state.omens.filter((o) => o.floodBias);
  let bias = null;
  for (const o of biasOmens) {
    bias = bias || {};
    for (const [k, v] of Object.entries(o.floodBias)) bias[k] = (bias[k] || 0) + v;
  }
  state.omens = state.omens.filter((o) => !o.floodBias);

  const { band, height } = rollFlood(state, bias);
  const b = FLOOD_BANDS[band];
  state.flood = { band, height };
  state.harvestModifier = b.harvest;
  state.famineStreak = band === 'famine' ? state.famineStreak + 1 : 0;

  let line = `**Akhet of Year ${state.year}: the Nilometer at Elephantine reads ${cubitsLabel(height)} cubits — ${b.name}.** `;
  line += `The coming harvest is projected at ${Math.round(b.harvest * 100)}% of normal.`;
  if (b.maat) {
    const d = changeMaat(state, b.maat);
    line += ` Ma'at ${d > 0 ? '+' : ''}${d}.`;
  }
  report.push(line);

  if (band === 'famine') {
    forceEvent(state, 'famine_year', 60);
  } else if (band === 'lean') {
    changeApproval(state, 'bureaucracy', -5);
    report.push('The Nomarchs grumble at the lean year. Bureaucracy approval −5%.');
  } else if (band === 'blessing') {
    state.flags.laborBlessingYear = state.year;
    report.push('High morale on the work gangs: monument labor costs −20% this year.');
  } else if (band === 'high') {
    if (surplusGold(state) >= 300) {
      state.gold -= 300;
      report.push('The Vizier spent 300 deben of gold repairing the canals the high water damaged.');
    } else {
      state.flags.canalPenaltyYear = state.year + 1;
      report.push('There is no gold to repair the canals the high water damaged. Next year’s harvest will suffer −10%.');
    }
  } else if (band === 'deluge') {
    forceEvent(state, 'deluge_damage', 60);
  }
}

function progressMonuments(state, report) {
  const workforceStriking = state.arrears.workforce >= 2;
  for (const m of state.monuments) {
    if (m.done || !m.active) continue;
    if (workforceStriking || state.flags.tombStalledUntil > state.turn) {
      if (m.ongoing) report.push('No work was done on the royal tomb this season.');
      continue;
    }
    if (m.ongoing) {
      m.progress = clamp(m.progress + m.perSeason, 0, 100);
      if (m.progress >= 100 && !m.done) {
        m.done = true;
        report.push(`**The ${m.name} is complete.** Pharaoh's house of eternity is ready.`);
      }
      continue;
    }
    if (state.grain.royal <= 0) {
      report.push(`Work on the ${m.name} stalled. There was no grain to feed the crews.`);
      continue;
    }
    m.progress = clamp(m.progress + 100 / m.seasons, 0, 100);
    if (m.progress >= 99.5) {
      m.progress = 100;
      m.done = true;
      const r = m.reward || {};
      if (r.maat) changeMaat(state, r.maat);
      for (const [bloc, d] of Object.entries(r.approval || {})) changeApproval(state, bloc, d);
      const h = heir(state);
      if (r.heirLegitimacy && h) h.legitimacy = clamp(h.legitimacy + r.heirLegitimacy, 0, 100);
      if (r.dynastyLegitimacy) for (const s of livingSons(state)) s.legitimacy = clamp(s.legitimacy + r.dynastyLegitimacy, 0, 100);
      report.push(`**The ${m.name} is complete!** The gods and the people see Pharaoh's power cut in stone.`);
    }
  }
}

function courtSeason(state, report) {
  for (const w of courtWives(state)) {
    const sons = sonsOf(state, w.id);
    const motherOfHeir = sons.some((s) => s.id === state.heirId);
    const passedOver = sons.some((s) => s.id !== state.heirId && isAdult(s));
    if (motherOfHeir && w.satisfaction < 75) w.satisfaction += 1;
    else if (passedOver) w.satisfaction = Math.max(0, w.satisfaction - 1);

    if (w.satisfaction < 30) {
      w.plot += 10 + w.ambition / 10 + random(state) * 10 + (state.pharaoh.away ? 15 : 0);
      if (w.plot >= 50 && !w.rumored && chance(state, 0.4 + state.vizier.competence / 250)) {
        w.rumored = true;
        report.push(`*A eunuch of the harem reports whispers around ${w.name}'s chambers: new faces among the food tasters.*`);
      }
    } else if (w.plot > 0) {
      w.plot = Math.max(0, w.plot - 10);
      if (w.plot === 0) w.rumored = false;
    }
    w.plot = Math.min(w.plot, 120);
    const recentlyExposed = state.usedEvents.poisoned_cup > state.turn - 2;
    if (w.plot >= 100 && !recentlyExposed) forceEvent(state, 'poisoned_cup', 90, { wifeId: w.id });
  }

  // Passed-over adult sons grow restless.
  for (const s of livingSons(state)) {
    if (s.id === state.heirId || !isAdult(s)) continue;
    const mother = state.wives.find((w) => w.id === s.motherId);
    if (mother && mother.satisfaction < 40) s.loyalty = clamp(s.loyalty - 2, 0, 100);
  }

  // Births.
  const p = state.pregnancy;
  if (p && state.turn + 1 >= p.dueTurn) {
    state.pregnancy = null;
    birth(state, p.wifeId, report);
  } else if (!p) {
    for (const w of courtWives(state)) {
      if (chance(state, 0.05)) {
        state.pregnancy = { wifeId: w.id, dueTurn: state.turn + 3 };
        report.push(`The physicians announce that ${w.name} is with child.`);
        break;
      }
    }
  }
}

function birth(state, wifeId, report) {
  const w = state.wives.find((x) => x.id === wifeId);
  if (!w) return;
  if (chance(state, 0.5)) {
    const used = new Set(state.sons.map((s) => s.name));
    const name = SON_NAMES.find((n) => !used.has(n)) || `Son of Year ${state.year}`;
    const id = `son-${state.turn}`;
    const legitimacy = w.title.startsWith('Great') ? 55 : w.tie === 'hatti' || w.tie === 'babylon' ? 40 : 30;
    state.sons.push({ id, name, age: 0, motherId: w.id, legitimacy, loyalty: 80, role: 'Infant King’s Son', alive: true });
    w.satisfaction = clamp(w.satisfaction + 15, 0, 100);
    w.influence = clamp(w.influence + 10, 0, 100);
    state.forcedOpportunity = { eventId: 'son_born', ctx: { sonId: id }, since: state.turn };
    report.push(`**${w.name} has borne Pharaoh a son: Prince ${name}.** A new piece enters the game of succession.`);
  } else {
    const name = DAUGHTER_NAMES[(state.daughters || []).length % DAUGHTER_NAMES.length];
    state.daughters = state.daughters || [];
    state.daughters.push({ name, age: 0, motherId: w.id });
    w.satisfaction = clamp(w.satisfaction + 5, 0, 100);
    report.push(`${w.name} has borne Pharaoh a daughter, Princess ${name}.`);
  }
}

function thresholdChecks(state, report) {
  const mil = state.blocs.military.approval;
  const coupCooldown = state.usedEvents.march_on_palace > state.turn - 3;
  if (mil < 30 && state.arrears.army >= 2 && !coupCooldown) {
    const p = ((30 - mil) * 2 + state.arrears.army * 5) / 100;
    if (chance(state, p)) forceEvent(state, 'march_on_palace', 100);
    else report.push('Officers at Pi-Ramesses speak openly of who should wear the Blue Crown.');
  } else if (mil < 50 && state.arrears.army >= 3) {
    report.push('Units of the chariotry refuse to leave barracks until they are fed.');
  }

  if (state.blocs.priesthood.approval < 30 || state.maat <= 5) {
    if (!(state.usedEvents.oracle_speaks > state.turn - 4)) forceEvent(state, 'oracle_speaks', 80);
  }

  if (state.blocs.bureaucracy.approval < 15 && state.maat < 50) {
    forceEvent(state, 'nomarch_league', 70, { secession: true });
  }

  const h = heir(state);
  const rival = rivalClaimant(state);
  if (h && rival && rival.age >= ADULT_AGE && rival.legitimacy > h.legitimacy + 10 && rival.loyalty < 60) {
    if (!(state.usedEvents.rival_claim > state.turn - 4)) forceEvent(state, 'rival_claim', 45, { rivalId: rival.id });
  }

  if (reserveMonths(state) < 1 && state.season !== 0) {
    if (!(state.usedEvents.grain_riot > state.turn - 3)) forceEvent(state, 'grain_riot', 55);
  }
}
