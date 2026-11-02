// Public game API. The UI only talks to this module.
//
//   newGame(seed)            → state (phase 'briefing')
//   currentEvent(state)      → the briefing's event definition
//   optionsFor(state)        → resolved options for the current briefing
//   decree(state, optionId)  → applies the decree   (phase → 'court' | 'ended')
//   perform(state, id, args) → a royal command from a desk (costs Royal Attention)
//   advance(state)           → ends the season      (phase → 'briefing' | 'ended')
//
// The timeline never advances without a decree (DESIGN.md §1).
import { createInitialState } from './state.js';
import { applyEffects } from './effects.js';
import { endSeason, newSeasonCourt } from './simulate.js';
import { endReign } from './ending.js';
import { random, chance } from './rng.js';
import { clamp, resolve } from './util.js';
import { approval } from './realm.js';
import { strengthBonus } from './army.js';
import { EVENTS } from '../content/index.js';
import { ACTIONS } from '../content/actions.js';
import { syncArmyBurn } from './army.js';

export function newGame(seed = Date.now()) {
  const s = createInitialState(seed);
  syncArmyBurn(s);
  newSeasonCourt(s);
  return s;
}

function makeApi(state, ctx, chips, lines) {
  return {
    ctx,
    fx: (fx) => chips.push(...applyEffects(state, fx)),
    log: (text) => lines.push(text),
    chance: (p) => chance(state, p),
    random: () => random(state),
    /** Resolve a battle. base = win probability before the army's condition. */
    battle: ({ base, stations = null }) => {
      let p = base + (approval(state, 'military') - 50) / 250 - state.arrears.army * 0.04;
      if (state.armyRation < 1) p -= 0.05;
      p += strengthBonus(state, stations);
      p = clamp(p, 0.1, 0.9);
      return chance(state, p);
    },
    end: (cause, text) => endReign(state, cause, text),
  };
}

// ── Royal commands (the desks) ───────────────────────────────────────────

/** Can this command be given now? Returns true or a reason string. */
export function canPerform(state, id, args = {}) {
  const a = ACTIONS[id];
  if (!a) return `Unknown command ${id}`;
  if (state.phase === 'ended') return 'The reign is over.';
  const cost = a.cost(state, args);
  if (cost > state.attention.left) return `Needs ${cost} Royal Attention; ${state.attention.left} left this season.`;
  if (a.cooldown) {
    const k = a.key(args);
    if ((state.cooldowns[k] ?? -1) > state.turn) return `Not again until ${state.cooldowns[k] - state.turn} more season(s) have passed.`;
  }
  return a.available ? a.available(state, args) : true;
}

export function perform(state, id, args = {}) {
  const ok = canPerform(state, id, args);
  if (ok !== true) throw new Error(ok);
  const a = ACTIONS[id];
  const chips = [];
  const lines = [];
  const title = a.label(state, args);
  state.attention.left -= a.cost(state, args);
  if (a.cooldown) state.cooldowns[a.key(args)] = state.turn + a.cooldown;
  a.run(state, args, makeApi(state, {}, chips, lines));
  const result = { title, lines, chips: chips.filter((c) => c.delta), desk: a.desk };
  state.commands.push(result);
  if (a.cost(state, args) >= 2 || ['family.marry', 'court.appoint', 'army.campaign', 'family.designate'].includes(id)) {
    state.chronicle.push({ turn: state.turn, year: state.year, season: state.season, title, text: lines.join(' ') });
  }
  return result;
}

export function currentEvent(state) {
  return EVENTS[state.briefing.eventId];
}

export function optionsFor(state) {
  const ev = currentEvent(state);
  const ctx = state.briefing.ctx || {};
  return ev.options
    .filter((o) => !o.available || o.available(state, ctx))
    .map((o) => ({
      id: o.id,
      title: resolve(o.title, state, ctx),
      cost: resolve(o.cost, state, ctx),
      fallout: resolve(o.fallout, state, ctx),
      risk: resolve(o.risk, state, ctx),
      unlocked: Boolean(o.unlocked),
    }));
}

export function briefText(state) {
  const ev = currentEvent(state);
  return resolve(ev.brief, state, state.briefing.ctx || {});
}

export function decree(state, optionId) {
  if (state.phase !== 'briefing') throw new Error(`Cannot decree during phase "${state.phase}"`);
  const ev = currentEvent(state);
  const ctx = state.briefing.ctx || {};
  const opt = ev.options.find((o) => o.id === optionId);
  if (!opt) throw new Error(`Unknown option "${optionId}" for event "${ev.id}"`);
  if (opt.available && !opt.available(state, ctx)) throw new Error(`Option "${optionId}" is not available`);

  const chips = [];
  const lines = [];
  const api = makeApi(state, ctx, chips, lines);

  const title = resolve(opt.title, state, ctx);
  opt.apply(state, api);

  state.usedEvents[ev.id] = state.turn;
  if (ev.type === 'crisis' && ev.major && state.maat >= 25) state.rotation.respite = true;

  state.lastOutcome = { eventTitle: resolve(ev.title, state, ctx), decree: title, lines, chips };
  state.chronicle.push({
    turn: state.turn,
    year: state.year,
    season: state.season,
    title: `${resolve(ev.title, state, ctx)}: ${title}`,
    text: lines.join(' '),
  });
  if (state.chronicle.length > 60) state.chronicle.splice(0, state.chronicle.length - 60);
  if (state.phase !== 'ended') state.phase = 'court';
  return state.lastOutcome;
}

export function advance(state) {
  if (state.phase !== 'court') throw new Error(`Cannot end the season during phase "${state.phase}": seal a decree first`);
  state.lastOutcome = null;
  endSeason(state);
  if (state.phase !== 'ended') state.phase = 'briefing';
  return state;
}
