export const SEASONS = ['Akhet', 'Peret', 'Shemu'];
export const SEASON_MEANING = { Akhet: 'Inundation', Peret: 'Growing', Shemu: 'Harvest' };
export const MONTHS_PER_SEASON = 4;

export const BLOCS = ['priesthood', 'bureaucracy', 'military', 'harem'];
export const BLOC_LABELS = {
  priesthood: 'The Priesthood / Church',
  bureaucracy: 'The Nomarchs & Viziers / Bureaucracy',
  military: 'The Military / Nobles',
  harem: 'The Harem / Dynasty',
};
export const BLOC_ICONS = { priesthood: '🏛️', bureaucracy: '🦩', military: '⚔️', harem: '🪷' };

// DESIGN.md §2a — flood bands.
export const FLOOD_BANDS = {
  famine: { name: 'The Famine (Low Flood)', min: 10.5, max: 11.75, harvest: 0.5, maat: -15 },
  lean: { name: 'The Lean Year', min: 12, max: 14.75, harvest: 0.85, maat: 0 },
  blessing: { name: 'The Blessing (Perfect)', min: 15, max: 16.75, harvest: 1.25, maat: 10 },
  high: { name: 'The High Water', min: 17, max: 18, harvest: 1.0, maat: 0 },
  deluge: { name: 'The Deluge (Destruction)', min: 18.25, max: 20, harvest: 0.7, maat: -10 },
};
export const FLOOD_ORDER = ['famine', 'lean', 'blessing', 'high', 'deluge'];

// DESIGN.md §2a — Ma'at-weighted odds (percent).
export const FLOOD_ODDS = [
  { minMaat: 80, odds: { famine: 5, lean: 20, blessing: 45, high: 22, deluge: 8 } },
  { minMaat: 50, odds: { famine: 10, lean: 30, blessing: 35, high: 18, deluge: 7 } },
  { minMaat: 25, odds: { famine: 15, lean: 35, blessing: 28, high: 15, deluge: 7 } },
  { minMaat: 0, odds: { famine: 20, lean: 37, blessing: 22, high: 13, deluge: 8 } },
];

export const MAAT_STATES = [
  { min: 80, name: "Ma'at Upheld" },
  { min: 50, name: 'Order Contested' },
  { min: 25, name: 'Isfet Rising' },
  { min: 0, name: 'Rejected by the Gods' },
];

export const SURPLUS_MONTHS = 6;
export const ADULT_AGE = 16;
export const NUBIAN_TRIBUTE = 1200; // deben of gold per year
export const EVENT_COOLDOWN = 6; // turns before a non-unique event can repeat
