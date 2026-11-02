import { MONTHS_PER_SEASON, SURPLUS_MONTHS, NUBIAN_TRIBUTE } from './constants.js';
import { clamp, fmt } from './util.js';

/** Monthly crew cost of all active monuments (Blessing year: −20%). */
export function monumentCrew(state) {
  const factor = state.flags.laborBlessingYear === state.year ? 0.8 : 1;
  return state.monuments
    .filter((m) => m.active && !m.done && !m.ongoing && !m.paused)
    .reduce((s, m) => s + m.crew * factor, 0);
}

export const PALACE_LEVELS = { lavish: 1.3, normal: 1, austere: 0.75 };
export const TAX_LEVELS = { light: 0.85, standard: 1, heavy: 1.15 };

export function monthlyBurnBreakdown(state) {
  const army = state.burn.army * state.armyRation;
  const relief = state.flags.nomeSupplyUntil && state.flags.nomeSupplyUntil > state.turn ? 50000 : 0;
  const policy = state.policy || { workforceRation: 1, palace: 'normal' };
  return {
    army: Math.max(0, army - relief),
    workforce: state.burn.workforce * policy.workforceRation,
    palace: state.burn.palace * (PALACE_LEVELS[policy.palace] ?? 1),
    monuments: monumentCrew(state),
  };
}

/** Share of the realm’s harvest the nomes actually report, 0.75–1.06. */
export function nomeYield(state) {
  if (!state.nomes) return 1;
  return state.nomes.reduce((s, n) => {
    const honesty = n.loyalty < 30 ? 0.75 : n.loyalty < 45 ? 0.9 : 1;
    return s + n.share * n.yield * honesty;
  }, 0);
}

export function monthlyBurn(state) {
  const b = monthlyBurnBreakdown(state);
  return b.army + b.workforce + b.palace + b.monuments;
}

export const reserveMonths = (state) => state.grain.royal / Math.max(1, monthlyBurn(state));

export const surplusGrain = (state) =>
  Math.max(0, state.grain.royal - monthlyBurn(state) * SURPLUS_MONTHS);

export const surplusGold = (state) => Math.max(0, state.gold - state.goldReserve);

/** Scribal leakage (2–15%), DESIGN.md §2a / §4. */
export function leakage(state) {
  const integrity = state.vizierNorth ? (state.vizier.integrity + state.vizierNorth.integrity) / 2 : state.vizier.integrity;
  let l = 0.02 + ((100 - integrity) / 100) * 0.08;
  const b = state.blocs.bureaucracy.approval;
  if (b < 50) l += ((50 - b) / 50) * 0.05;
  return clamp(l, 0.02, 0.15);
}

/** Pay the season's rations. Shortfalls become arrears. */
export function paySeason(state, report) {
  const need = monthlyBurn(state) * MONTHS_PER_SEASON;
  if (state.grain.royal >= need) {
    state.grain.royal -= need;
    report.push(`The granaries paid ${fmt(need)} khar in rations this season.`);
    return { need, paid: need, shortfall: 0 };
  }
  const paid = state.grain.royal;
  const frac = 1 - paid / need;
  state.grain.royal = 0;
  const months = Math.round(MONTHS_PER_SEASON * frac * 10) / 10;
  state.arrears.army = Math.round((state.arrears.army + months) * 10) / 10;
  state.arrears.workforce = Math.round((state.arrears.workforce + months) * 10) / 10;
  report.push(
    `**The granaries ran dry.** Only ${fmt(paid)} of ${fmt(need)} khar could be paid. ` +
      `The army and the royal workforce fall ${months} more months into arrears.`,
  );
  return { need, paid, shortfall: need - paid };
}

/**
 * End of every season: one third of the year's harvest tax arrives by barge.
 * Nubian tribute arrives once a year, at the end of Shemu.
 */
/** What the next tax barges should bring (before spoilage). */
export function projectedIntake(state) {
  const tax = TAX_LEVELS[state.policy?.tax] ?? 1;
  let v = (state.baselineIntake / 3) * state.harvestModifier * nomeYield(state) * tax * (1 - leakage(state));
  if (state.flags.deltaLost) v *= 0.92;
  if (state.flags.canalPenaltyYear === state.year) v *= 0.9;
  if (state.flags.taxRemissionYear === state.year) v *= 0.67;
  return Math.round(v);
}

export function collectTaxes(state, report) {
  const tax = TAX_LEVELS[state.policy?.tax] ?? 1;
  let intake = (state.baselineIntake / 3) * state.harvestModifier * nomeYield(state) * tax * (1 - leakage(state));
  if (state.flags.deltaLost) intake *= 0.92;
  if (state.flags.canalPenaltyYear === state.year) intake *= 0.9;
  if (state.flags.taxRemissionYear === state.year) intake *= 0.67;
  intake = Math.round(intake);
  state.grain.royal += intake;
  report.push(
    `The tax barges delivered ${fmt(intake)} khar ` +
      `(harvest at ${Math.round(state.harvestModifier * 100)}% of normal, ${Math.round(leakage(state) * 100)}% lost to scribal leakage` +
      `${nomeYield(state) < 0.97 ? `, the nomes reporting only ${Math.round(nomeYield(state) * 100)}% of their harvest` : ''}).`,
  );
  // Grain rots: the Overseer of the Granaries decides how much.
  if (state.overseer) {
    const store = state.flags.granaryComplex ? 0.5 : 1;
    const rot = Math.round(state.grain.royal * (0.005 + ((100 - state.overseer.integrity) / 100) * 0.03) * store);
    if (rot > 0) {
      state.grain.royal -= rot;
      report.push(`${fmt(rot)} khar spoiled or vanished from the royal granaries (Overseer ${state.overseer.name}).`);
    }
  }
  // Temples' own estates refill their granaries.
  state.grain.temple += Math.round((500000 / 3) * state.harvestModifier);
  return intake;
}

export function collectTribute(state, report) {
  if (!state.flags.nubianGoldLost) {
    const viceroyFactor = state.viceroy ? 0.6 + state.viceroy.competence / 125 : 1;
    const tribute = Math.round((state.flags.nubianHalf ? NUBIAN_TRIBUTE / 2 : NUBIAN_TRIBUTE) * viceroyFactor);
    state.gold += tribute;
    report.push(`The Viceroy of Kush delivered ${fmt(tribute)} deben of Nubian gold.`);
  } else {
    report.push('No gold came north from Kush this year.');
  }
}
