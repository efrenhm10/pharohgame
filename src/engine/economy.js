import { MONTHS_PER_SEASON, SURPLUS_MONTHS, NUBIAN_TRIBUTE } from './constants.js';
import { clamp, fmt } from './util.js';

/** Monthly crew cost of all active monuments (Blessing year: −20%). */
export function monumentCrew(state) {
  const factor = state.flags.laborBlessingYear === state.year ? 0.8 : 1;
  return state.monuments
    .filter((m) => m.active && !m.done && !m.ongoing)
    .reduce((s, m) => s + m.crew * factor, 0);
}

export function monthlyBurnBreakdown(state) {
  const army = state.burn.army * state.armyRation;
  const relief = state.flags.nomeSupplyUntil && state.flags.nomeSupplyUntil > state.turn ? 50000 : 0;
  return {
    army: Math.max(0, army - relief),
    workforce: state.burn.workforce,
    palace: state.burn.palace,
    monuments: monumentCrew(state),
  };
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
  const integrity = state.vizier.integrity;
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
export function collectTaxes(state, report) {
  let intake = (state.baselineIntake / 3) * state.harvestModifier * (1 - leakage(state));
  if (state.flags.deltaLost) intake *= 0.92;
  if (state.flags.canalPenaltyYear === state.year) intake *= 0.9;
  if (state.flags.taxRemissionYear === state.year) intake *= 0.67;
  intake = Math.round(intake);
  state.grain.royal += intake;
  report.push(
    `The tax barges delivered ${fmt(intake)} khar ` +
      `(harvest at ${Math.round(state.harvestModifier * 100)}% of normal, ${Math.round(leakage(state) * 100)}% lost to scribal leakage).`,
  );
  // Temples' own estates refill their granaries.
  state.grain.temple += Math.round((500000 / 3) * state.harvestModifier);
  return intake;
}

export function collectTribute(state, report) {
  if (!state.flags.nubianGoldLost) {
    const tribute = state.flags.nubianHalf ? NUBIAN_TRIBUTE / 2 : NUBIAN_TRIBUTE;
    state.gold += tribute;
    report.push(`The Viceroy of Kush delivered ${fmt(tribute)} deben of Nubian gold.`);
  } else {
    report.push('No gold came north from Kush this year.');
  }
}
