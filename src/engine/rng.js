// Seeded PRNG (mulberry32). Its state lives on the game state so that saves
// and replays are deterministic.

export function random(state) {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (state, p) => random(state) < p;

export const between = (state, lo, hi) => lo + random(state) * (hi - lo);

/** entries: [{ item, weight }] → item */
export function weightedPick(state, entries) {
  const total = entries.reduce((s, e) => s + Math.max(0, e.weight), 0);
  if (total <= 0) return entries.length ? entries[0].item : undefined;
  let r = random(state) * total;
  for (const e of entries) {
    r -= Math.max(0, e.weight);
    if (r < 0) return e.item;
  }
  return entries[entries.length - 1].item;
}

export function seedFrom(value) {
  // Accepts a number or string, returns a uint32 seed.
  const s = String(value);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
