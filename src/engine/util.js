export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const round = (v) => Math.round(v);

/** Format an integer with thousands separators (e.g. 610,000). */
export const fmt = (n) => Math.round(n).toLocaleString('en-US');

/** Signed number, e.g. "+5" / "−3". */
export const signed = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : '±0');

/** Resolve a value that may be a function of state. */
export const resolve = (v, ...args) => (typeof v === 'function' ? v(...args) : v);
