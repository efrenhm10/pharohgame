// Names, traits and candidate shortlists for appointments and marriages.
import { random } from './rng.js';

export const MALE_NAMES = [
  'Amenemope', 'Huy', 'Paser', 'Nebamun', 'Penre', 'Djehutymose', 'Bakenkhonsu', 'Iuny', 'Hatiay', 'Neferhotep',
  'Panehsy', 'Rekhmire', 'Sennefer', 'Userhat', 'Khay', 'Mery', 'Nakht', 'Roma', 'Tjay', 'Yuya', 'Wenamun', 'Pentaweret',
];
export const FEMALE_NAMES = ['Tuya', 'Nofret', 'Baketamun', 'Iset', 'Mutnofret', 'Henut', 'Takhat', 'Wernuro', 'Nebet', 'Sitre', 'Tiaa', 'Mutemwia'];
export const FOREIGN_BRIDES = {
  hatti: ['Kilušhepa', 'Ašmunikal', 'Gaššulawiya', 'Puduhepa'],
  babylon: ['Ishtar-ummi', 'Belessunu', 'Ina-Esagil-rimat'],
  assyria: ['Mullissu-mukannishat', 'Ashur-sharrat'],
  alashiya: ['Kypria', 'Alasa'],
  canaan: ['Baalat', 'Anat-em-heb', 'Asherat'],
};

export const TRAITS = {
  brave: { name: 'Brave', icon: '🦁', desc: 'Fights well; commands well.' },
  pious: { name: 'Pious', icon: '🪔', desc: 'Beloved of the temples.' },
  clever: { name: 'Clever', icon: '📜', desc: 'Quick with the scribes and the ledgers.' },
  ambitious: { name: 'Ambitious', icon: '🔥', desc: 'Wants more than he is given.' },
  charming: { name: 'Charming', icon: '🌸', desc: 'Wins hearts at court and abroad.' },
  reckless: { name: 'Reckless', icon: '🎲', desc: 'Bold, and sometimes foolish.' },
  gentle: { name: 'Gentle', icon: '🕊️', desc: 'Loyal, and easily overlooked.' },
  frail: { name: 'Frail', icon: '🩹', desc: 'Born of the divine blood, and sickly. May die young.' },
};
const TRAIT_KEYS = Object.keys(TRAITS).filter((k) => k !== 'frail');

export const SCHOOLS = {
  kap: { name: 'The Kap (royal nursery school)', skill: 'statecraft', note: 'Raised beside the heir. Loyalty to the crown +10.', fx: {} },
  scribe: { name: 'House of Life at Memphis', skill: 'administration', note: 'Scribal training. Bureaucracy +2%.', fx: { approval: { bureaucracy: 2 } } },
  chariot: { name: 'The Chariot Corps stables', skill: 'martial', note: 'A soldier’s training (age 10+). Military +3%.', fx: { approval: { military: 3 } }, minAge: 10, sons: true },
  temple: { name: 'Temple of Amun at Karnak', skill: 'piety', note: 'Raised among priests. Priesthood +3%.', fx: { approval: { priesthood: 3 } } },
};

export const pickFrom = (state, arr) => arr[Math.floor(random(state) * arr.length)];
export const randTrait = (state) => pickFrom(state, TRAIT_KEYS);
export const seedNum = (state) => Math.floor(random(state) * 1e6);

let idCounter = 0;
export const newId = (state, prefix) => `${prefix}-${state.turn}-${++idCounter}-${Math.floor(random(state) * 1e4)}`;

const ORIGINS = {
  scribe: { label: 'A career scribe', kind: 'scribe', fx: {}, integrity: [60, 90], competence: [45, 75], ambition: [20, 50], loyalty: [55, 80] },
  priest: { label: 'A priest of Amun', kind: 'priest', fx: { priesthood: 6 }, integrity: [40, 70], competence: [45, 75], ambition: [40, 75], loyalty: [35, 65] },
  nome: { label: 'A Nomarch’s son', kind: 'nomarch', fx: { bureaucracy: 6 }, integrity: [30, 60], competence: [45, 70], ambition: [45, 80], loyalty: [35, 60] },
  army: { label: 'A veteran officer', kind: 'general', fx: { military: 6 }, integrity: [45, 75], competence: [40, 70], ambition: [35, 70], loyalty: [50, 80] },
};
const roll = (state, [a, b]) => Math.round(a + random(state) * (b - a));

/** Three candidates for an office, plus any adult sons who could hold it. */
export function candidates(state, office) {
  const kinds = office === 'highPriest' ? ['priest', 'priest', 'scribe'] : office === 'viceroy' ? ['army', 'army', 'scribe'] : ['scribe', 'priest', 'nome', 'army'];
  const out = [];
  const used = new Set();
  for (const k of kinds.slice(0, 3)) {
    const o = ORIGINS[k];
    let name = pickFrom(state, MALE_NAMES);
    while (used.has(name)) name = pickFrom(state, MALE_NAMES);
    used.add(name);
    out.push({
      id: newId(state, k),
      kind: o.kind,
      seed: seedNum(state),
      name,
      age: 30 + Math.floor(random(state) * 25),
      origin: k,
      originLabel: o.label,
      competence: roll(state, o.competence),
      integrity: roll(state, o.integrity),
      ambition: roll(state, o.ambition),
      loyalty: roll(state, o.loyalty),
      fx: o.fx,
    });
  }
  return out;
}
