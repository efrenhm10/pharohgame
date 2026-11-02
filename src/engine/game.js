// Public game API. The UI only talks to this module.
//
//   newGame(seed)            → state (phase 'briefing')
//   currentEvent(state)      → the briefing's event definition
//   optionsFor(state)        → resolved options for the current briefing
//   decree(state, optionId)  → applies the decree   (phase → 'outcome' | 'ended')
//   advance(state)           → simulates the season (phase → 'briefing' | 'ended')
//
// The timeline never advances without a decree (DESIGN.md §1).
import { createInitialState } from './state.js';
import { applyEffects } from './effects.js';
import { endSeason } from './simulate.js';
import { endReign } from './ending.js';
import { random, chance } from './rng.js';
import { clamp, resolve } from './util.js';
import { approval } from './realm.js';
import { EVENTS } from '../content/index.js';

export function newGame(seed = Date.now()) {
  return createInitialState(seed);
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
  const api = {
    ctx,
    fx: (fx) => chips.push(...applyEffects(state, fx)),
    log: (text) => lines.push(text),
    chance: (p) => chance(state, p),
    random: () => random(state),
    /** Resolve a battle. base = win probability before army condition. */
    battle: ({ base }) => {
      let p = base + (approval(state, 'military') - 50) / 250 - state.arrears.army * 0.04;
      if (state.armyRation < 1) p -= 0.05;
      p = clamp(p, 0.1, 0.9);
      return chance(state, p);
    },
    end: (cause, text) => endReign(state, cause, text),
  };

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
  if (state.phase !== 'ended') state.phase = 'outcome';
  return state.lastOutcome;
}

export function advance(state) {
  if (state.phase !== 'outcome') throw new Error(`Cannot advance during phase "${state.phase}"`);
  state.lastOutcome = null;
  endSeason(state);
  if (state.phase !== 'ended') state.phase = 'briefing';
  return state;
}
