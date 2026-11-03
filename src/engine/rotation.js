// Briefing rotation & pacing — DESIGN.md §8.
import { EVENT_COOLDOWN } from './constants.js';
import { chance, weightedPick } from './rng.js';
import { resolve } from './util.js';
import { addOmen } from './effects.js';
import { EVENTS } from '../content/index.js';
import { OMEN_POOL } from '../content/omens.js';

export function opportunityChance(state) {
  let c = 30;
  const m = state.maat;
  c += m >= 80 ? 25 : m >= 50 ? 10 : m >= 25 ? -10 : -25;
  if (state.flood.band === 'blessing') c += 20;
  if (state.flood.band === 'lean') c -= 5;
  return Math.max(0, Math.min(100, c));
}

const lastN = (arr, n) => arr.slice(Math.max(0, arr.length - n));

/** Hard ceiling on consecutive crises, whatever Ma'at is (DESIGN.md §8.2). */
export const MAX_CRISIS_RUN = 4;

function crisisRun(hist) {
  let n = 0;
  for (let i = hist.length - 1; i >= 0 && hist[i] === 'crisis'; i--) n++;
  return n;
}

/** Decide the briefing type for the turn that is starting, then pick the event. */
export function chooseBriefing(state) {
  const hist = state.rotation.history;
  let type;
  let entry = null;

  // 1. Forced crises: famine, deluge, coups, plots, ignored omens.
  //    After two crises in a row, only existential threats (priority ≥ 80),
  //    matured omens, or a collapsing Ma'at may force a third (§8.2).
  const two = lastN(hist, 2);
  const crisisStreak = two.length === 2 && two.every((t) => t === 'crisis');
  const hardCap = crisisRun(hist) >= MAX_CRISIS_RUN; // even a collapsing realm gets a breath
  state.forced.sort((a, b) => b.priority - a.priority);
  const forcedIdx = state.forced.findIndex(
    (f) => f.priority >= 80 || (!hardCap && (!crisisStreak || state.maat < 25 || f.ctx.fromOmen)),
  );
  if (state.forcedOpportunity?.first && !state.forced.some((f) => f.priority >= 99)) {
    // A new reign always opens with its coronation.
    type = 'opportunity';
  } else if (forcedIdx >= 0) {
    entry = state.forced.splice(forcedIdx, 1)[0];
    type = 'crisis';
  } else if (state.forced.length) {
    for (const f of state.forced) f.since = state.turn; // deferred, not forgotten
    type = 'opportunity';
  } else if (state.rotation.respite) {
    type = 'opportunity';
  } else {
    const three = lastN(hist, 3);
    if (hardCap || (crisisStreak && state.maat >= 25)) type = 'opportunity';
    else if (three.length === 3 && three.every((t) => t === 'opportunity')) type = 'crisis';
    else type = chance(state, opportunityChance(state) / 100) ? 'opportunity' : 'crisis';
  }
  state.rotation.respite = false;

  if (type === 'opportunity') {
    // The third Opportunity in a row must show a storm about to break.
    const streak = lastN(hist, 2).every((t) => t === 'opportunity') && hist.length >= 2;
    ensureOmens(state, streak);
    if (state.forcedOpportunity) {
      entry = state.forcedOpportunity;
      state.forcedOpportunity = null;
    }
  } else if (state.forcedOpportunity && state.turn - state.forcedOpportunity.since > 2) {
    state.forcedOpportunity = null; // the moment to celebrate has passed
  }

  if (!entry) {
    const eventId = pickEvent(state, type);
    entry = { eventId, ctx: {} };
  }
  const ev = EVENTS[entry.eventId];
  state.briefing = { type: ev.type, eventId: ev.id, ctx: entry.ctx || {} };
  hist.push(ev.type);
  if (hist.length > 12) hist.splice(0, hist.length - 12);
}

export function eligibleEvents(state, type) {
  return Object.values(EVENTS).filter((ev) => {
    if (ev.type !== type || ev.forcedOnly) return false;
    const used = state.usedEvents[ev.id];
    if (used !== undefined) {
      if (ev.once) return false;
      if (state.turn - used < (ev.cooldown ?? EVENT_COOLDOWN)) return false;
    }
    return ev.when ? ev.when(state) : true;
  });
}

export function pickEvent(state, type) {
  let pool = eligibleEvents(state, type);
  if (!pool.length) pool = Object.values(EVENTS).filter((ev) => ev.type === type && ev.fallback);
  return weightedPick(
    state,
    pool.map((ev) => ({ item: ev.id, weight: resolve(ev.weight ?? 10, state) })),
  );
}

function ensureOmens(state, urgent) {
  const soon = state.omens.some((o) => !o.floodBias && o.maturesTurn <= state.turn + 1);
  if (state.omens.length && (!urgent || soon)) return;
  const available = OMEN_POOL.filter((o) => !state.omens.some((x) => x.id === o.id) && (!o.when || o.when(state)));
  if (!available.length) return;
  const { when, ...pick } = weightedPick(state, available.map((o) => ({ item: o, weight: 1 })));
  void when; // functions must not enter the (serialized) state
  addOmen(state, { ...pick, delay: urgent ? 1 : pick.delay });
}
