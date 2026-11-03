// The army: units, commanders, stations, strength and battle odds.
import { clamp } from './util.js';

export const STATIONS = {
  capital: { name: 'Pi-Ramesses (the capital)', note: 'Guards the throne against coups and riots' },
  west: { name: 'Western forts', note: 'Holds the Libyan frontier' },
  delta: { name: 'Delta river mouths', note: 'Watches the sea for raiders' },
  south: { name: 'Kush (Buhen)', note: 'Protects the gold country' },
  canaan: { name: 'Canaan garrisons', note: 'Keeps the vassal kings paying' },
};

export const RATIONS_PER_MAN = 5; // khar / month

export const units = (state) => state.army.units;
export const unit = (state, id) => state.army.units.find((u) => u.id === id);
export const totalMen = (state) => units(state).reduce((s, u) => s + u.men, 0);

/** Keep the army's monthly grain burn in step with its size. */
export function syncArmyBurn(state) {
  state.burn.army = totalMen(state) * RATIONS_PER_MAN;
}

/** Any person who can command: generals and adult sons. */
export function commander(state, id) {
  if (!id) return null;
  const g = state.army.generals.find((x) => x.id === id);
  if (g) return { ...g, martial: g.martial, loyalty: g.loyalty, isSon: false };
  const s = state.sons.find((x) => x.id === id && x.alive);
  if (s) return { ...s, martial: s.skill === 'martial' ? 70 : s.trait === 'brave' ? 60 : 45, isSon: true };
  return null;
}

export function commandOf(state, personId) {
  return units(state).filter((u) => u.commanderId === personId);
}

/** Combat value of one unit: men × quality × morale × commander. */
export function unitPower(state, u) {
  const c = commander(state, u.commanderId);
  const lead = c ? 0.8 + c.martial / 250 : 0.8;
  const kind = u.kind === 'chariots' ? 2.2 : u.kind === 'mercenary' ? 1.3 : u.kind === 'police' ? 0.6 : 1;
  const ration = state.armyRation < 1 ? 0.85 + state.armyRation * 0.15 : 1;
  return u.men * kind * (u.quality / 60) * (0.6 + u.morale / 125) * lead * ration;
}

export function armyPower(state, stations = null) {
  return units(state)
    .filter((u) => !stations || stations.includes(u.station))
    .reduce((s, u) => s + unitPower(state, u), 0);
}

/** Bonus to battle odds from the army's actual condition (about −0.15 to +0.15). */
export function strengthBonus(state, stations = null) {
  const baseline = stations ? 9000 : 22000;
  return clamp((armyPower(state, stations) / baseline - 1) * 0.25, -0.15, 0.15);
}

export const avgMorale = (state) => {
  const m = totalMen(state);
  return m ? units(state).reduce((s, u) => s + u.morale * u.men, 0) / m : 0;
};

/**
 * Coup danger from commanders: a disloyal, ambitious commander leading many
 * men near the capital. Returns { person, men, risk } for the worst one.
 */
export function coupThreat(state) {
  let worst = null;
  const byCommander = {};
  for (const u of units(state)) {
    if (!u.commanderId || u.station !== 'capital') continue;
    byCommander[u.commanderId] = (byCommander[u.commanderId] || 0) + u.men;
  }
  for (const [id, men] of Object.entries(byCommander)) {
    const c = commander(state, id);
    if (!c) continue;
    const ambition = c.ambition ?? (c.trait === 'ambitious' ? 75 : 45);
    const risk = clamp(((60 - c.loyalty) / 100) * (ambition / 100) * (men / 3000), 0, 0.5);
    if (!worst || risk > worst.risk) worst = { person: c, men, risk };
  }
  return worst;
}

/** Seasonal drift: morale follows rations, pay and approval. */
export function armySeason(state, report) {
  for (const u of units(state)) {
    let d = 0;
    if (state.armyRation <= 0.5) d -= 6;
    else if (state.armyRation < 1) d -= 3;
    if (state.arrears.army > 0) d -= Math.min(6, Math.round(state.arrears.army * 2));
    if (u.kind === 'mercenary' && state.gold < 300) d -= 8;
    d += (state.blocs.military.approval - u.morale) > 0 ? 1 : -1;
    u.morale = clamp(Math.round(u.morale + d), 5, 100);
  }
}
