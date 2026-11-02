import { FLOOD_BANDS, FLOOD_ODDS, FLOOD_ORDER } from './constants.js';
import { random, between } from './rng.js';

/**
 * Odds (percent, summing to 100) for each flood band given current Ma'at,
 * the current famine streak and any omen bias. DESIGN.md §2a.
 */
export function floodOdds(maat, famineStreak = 0, bias = null) {
  const row = FLOOD_ODDS.find((r) => maat >= r.minMaat) || FLOOD_ODDS[FLOOD_ODDS.length - 1];
  const odds = { ...row.odds };

  // Famine streak cap: after two Famines in a row, Famine chance is halved.
  if (famineStreak >= 2) {
    const removed = odds.famine / 2;
    odds.famine -= removed;
    odds.lean += removed;
  }

  if (bias) {
    for (const k of FLOOD_ORDER) odds[k] = Math.max(0, odds[k] + (bias[k] || 0));
  }

  const total = FLOOD_ORDER.reduce((s, k) => s + odds[k], 0);
  for (const k of FLOOD_ORDER) odds[k] = (odds[k] / total) * 100;
  return odds;
}

/** Roll the Nile. Returns { band, height } where height is in quarter cubits. */
export function rollFlood(state, bias = null) {
  const odds = floodOdds(state.maat, state.famineStreak, bias);
  let r = random(state) * 100;
  let band = FLOOD_ORDER[FLOOD_ORDER.length - 1];
  for (const k of FLOOD_ORDER) {
    r -= odds[k];
    if (r < 0) {
      band = k;
      break;
    }
  }
  const b = FLOOD_BANDS[band];
  const height = Math.round(between(state, b.min, b.max) * 4) / 4;
  return { band, height };
}

export function cubitsLabel(height) {
  const whole = Math.floor(height);
  const frac = height - whole;
  const f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  return `${whole}${f}`;
}
