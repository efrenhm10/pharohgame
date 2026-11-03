// What each power block is demanding right now, derived from the state.
import { heir, wife, rivalClaimant, mostDangerousWife, heirTitle } from '../engine/realm.js';
import { reserveMonths } from '../engine/economy.js';

export function demands(state) {
  const d = {};

  // Priesthood
  if (state.flood.band === 'famine') d.priesthood = 'Emergency grain distribution to the starving';
  else if (!state.flags.amunExempt) d.priesthood = 'Perpetual tax exemption for Amun’s estates and a hereditary High Priesthood';
  else if (!state.monuments.some((m) => !m.ongoing && m.active)) d.priesthood = 'A new pylon or obelisks for Karnak';
  else d.priesthood = 'Lavish offerings at the Opet Festival';

  // Bureaucracy
  if (state.flood.band === 'famine' || state.flood.band === 'lean') d.bureaucracy = 'A one-third tax remission for the failed flood';
  else if (!state.flags.nomarchHeredity) d.bureaucracy = 'Written royal confirmation that nomarchies pass from father to son';
  else d.bureaucracy = 'Freedom from the Vizier’s audits';

  // Military
  if (state.arrears.army > 0) d.military = `Payment of ${state.arrears.army} months of grain arrears, now`;
  else if (state.armyRation < 1) d.military = 'Restore full rations to the native regiments';
  else if (!state.flags.victory) d.military = 'A campaign in Syria-Canaan, for booty and captives';
  else d.military = 'Land grants for the veterans of the western war';

  // Harem
  const w = mostDangerousWife(state);
  const h = heir(state);
  const r = rivalClaimant(state);
  if (w && w.satisfaction < 40 && r && r.motherId === w.id) d.harem = `${w.name} wants her son ${r.name} named Crown Prince`;
  else if (h && h.age < 16 && wife(state, h.motherId)) d.harem = `${wife(state, h.motherId).name} wants ${heirTitle(h)} ${h.name} shown to the people at the Opet Festival`;
  else d.harem = 'Each mother wants her own son raised above his brothers';

  if (reserveMonths(state) < 1.5) d.military = `${d.military}. They will not march on empty bellies`;
  return d;
}
