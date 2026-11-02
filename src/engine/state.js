import { seedFrom } from './rng.js';

/**
 * The Year 9 opening scenario: the Hunger-Flood and the Western Fire.
 * Akhet of Regnal Year 9 of Djehutymes V. The flood has already been read.
 */
export function createInitialState(seed = Date.now()) {
  return {
    version: 1,
    seed: String(seed),
    rng: seedFrom(seed),
    turn: 1,
    year: 9,
    season: 0, // 0 Akhet · 1 Peret · 2 Shemu
    phase: 'briefing', // briefing → outcome → (advance) → briefing … → ended

    pharaoh: {
      name: 'Djehutymes V',
      throneName: 'Sekhemkheperre',
      age: 41,
      health: 70,
      condition: 'Strong in the chariot, but plagued by abscessed molars since the Opet Festival',
      away: false,
    },

    maat: 44,
    famineStreak: 1,
    flood: { band: 'famine', height: 11.75 },
    harvestModifier: 0.5,
    floodBias: null,

    grain: { royal: 610000, temple: 2100000, sealed: 0 },
    gold: 3900,
    goldReserve: 1200,
    baselineIntake: 3000000,
    burn: { army: 100000, workforce: 45000, palace: 45000 }, // khar / month
    armyRation: 1,
    arrears: { army: 2, workforce: 0 },

    blocs: {
      priesthood: { approval: 57 },
      bureaucracy: { approval: 39 },
      military: { approval: 31 },
    },

    vizier: { name: 'Hori-Ankh', title: 'Vizier of the South', competence: 72, integrity: 38, ambition: 64 },
    highPriest: { name: 'Amenemopet-Ankh' },

    wives: [
      {
        id: 'tiy',
        name: 'Tiy-Merenmut',
        title: 'Great Royal Wife',
        origin: 'Theban priestly family (her brother is Second Prophet of Amun)',
        tie: 'priesthood',
        influence: 30,
        ambition: 55,
        satisfaction: 70,
        plot: 0,
        status: 'court',
      },
      {
        id: 'henuttawy',
        name: 'Henuttawy',
        title: 'Secondary Wife',
        origin: 'Daughter of Nakhtmin, Nomarch of the Hare Nome',
        tie: 'bureaucracy',
        influence: 80,
        ambition: 85,
        satisfaction: 33,
        plot: 0,
        status: 'court',
      },
      {
        id: 'asmunikal',
        name: 'Ašmunikal',
        title: 'Hittite Royal Wife (Maathorneferure)',
        origin: 'Daughter of the Great King of Hatti',
        tie: 'hatti',
        influence: 25,
        ambition: 45,
        satisfaction: 50,
        plot: 0,
        status: 'court',
      },
    ],
    sons: [
      {
        id: 'ramose',
        name: 'Ramose',
        age: 11,
        motherId: 'tiy',
        legitimacy: 61,
        loyalty: 92,
        role: 'Crown Prince',
        alive: true,
      },
      {
        id: 'khaemopet',
        name: 'Khaemopet',
        age: 26,
        motherId: 'henuttawy',
        legitimacy: 48,
        loyalty: 55,
        role: 'General of the Chariotry at Pi-Ramesses',
        alive: true,
      },
    ],
    heirId: 'ramose',
    pregnancy: { wifeId: 'asmunikal', dueTurn: 2 },

    monuments: [
      {
        id: 'tomb',
        name: 'Royal Tomb in the Valley of the Kings',
        progress: 55,
        ongoing: true,
        active: true,
        done: false,
        perSeason: 3,
      },
    ],

    omens: [],
    flags: {},
    forced: [], // [{ eventId, priority, ctx }]
    rotation: { history: ['crisis'], respite: false },
    usedEvents: {},
    briefing: { type: 'crisis', eventId: 'hunger_flood', ctx: {} },
    seasonReport: [],
    lastOutcome: null,
    chronicle: [],
    ending: null,
  };
}
