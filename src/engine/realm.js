// Shared state queries and mutators: Ma'at, power blocks, the court.
import { MAAT_STATES, ADULT_AGE, SEASONS } from './constants.js';
import { clamp } from './util.js';

// ── Ma'at ────────────────────────────────────────────────────────────────

export const maatState = (maat) => MAAT_STATES.find((s) => maat >= s.min).name;

/**
 * Change Ma'at. A hostile Priesthood (< 50%) amplifies losses ×1.5;
 * a friendly one (≥ 70%) softens them ×0.75. Returns the applied delta.
 */
export function changeMaat(state, delta) {
  let d = delta;
  if (d < 0) {
    const p = state.blocs.priesthood.approval;
    if (p < 50) d *= state.flags.northernCults ? 1.25 : 1.5;
    else if (p >= 70) d *= 0.75;
  }
  d = Math.round(d);
  const before = state.maat;
  state.maat = clamp(state.maat + d, 0, 100);
  return state.maat - before;
}

// ── Power blocks ─────────────────────────────────────────────────────────

export function approval(state, bloc) {
  if (bloc === 'harem') return haremApproval(state);
  return state.blocs[bloc].approval;
}

export function changeApproval(state, bloc, delta) {
  if (bloc === 'harem') {
    for (const w of courtWives(state)) w.satisfaction = clamp(w.satisfaction + delta, 0, 100);
    return delta;
  }
  const b = state.blocs[bloc];
  const before = b.approval;
  b.approval = clamp(b.approval + delta, 0, 100);
  return b.approval - before;
}

// ── The court ────────────────────────────────────────────────────────────

export const courtWives = (state) => state.wives.filter((w) => w.status === 'court');
export const wife = (state, id) => state.wives.find((w) => w.id === id);
export const son = (state, id) => state.sons.find((s) => s.id === id);
export const livingSons = (state) => state.sons.filter((s) => s.alive);
export const heir = (state) => son(state, state.heirId);
export const isAdult = (s) => s.age >= ADULT_AGE;

/** Influence-weighted average of each wife's satisfaction (DESIGN.md §4). */
export function haremApproval(state) {
  const ws = courtWives(state);
  const total = ws.reduce((s, w) => s + w.influence, 0);
  if (!total) return 50;
  return Math.round(ws.reduce((s, w) => s + w.satisfaction * w.influence, 0) / total);
}

/** The wife most likely to plot: lowest satisfaction, ties broken by ambition. */
export function mostDangerousWife(state) {
  const ws = courtWives(state);
  if (!ws.length) return null;
  return [...ws].sort((a, b) => a.satisfaction - b.satisfaction || b.ambition - a.ambition)[0];
}

export const sonsOf = (state, wifeId) => livingSons(state).filter((s) => s.motherId === wifeId);

/** The most dangerous rival claimant: a living, non-heir son with the highest legitimacy. */
export function rivalClaimant(state) {
  const rivals = livingSons(state).filter((s) => s.id !== state.heirId);
  if (!rivals.length) return null;
  return [...rivals].sort((a, b) => b.legitimacy - a.legitimacy)[0];
}

export function designateHeir(state, sonId) {
  const prev = heir(state);
  if (prev && prev.id !== sonId) prev.role = prev.prevRole || 'King’s Son';
  const next = son(state, sonId);
  next.prevRole = next.role;
  next.role = 'Crown Prince';
  state.heirId = sonId;
}

// ── Dates ────────────────────────────────────────────────────────────────

export const seasonName = (state) => SEASONS[state.season];
export const dateLabel = (state) => `Regnal Year ${state.year} · ${seasonName(state)}`;
