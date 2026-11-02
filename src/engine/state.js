import { seedFrom } from './rng.js';

/**
 * The Year 9 opening scenario: the Hunger-Flood and the Western Fire.
 * Akhet of Regnal Year 9 of Djehutymes V. The flood has already been read.
 *
 * Every person carries `kind` and `seed` so the UI can draw their portrait.
 */
export const SAVE_VERSION = 2;

export function createInitialState(seed = Date.now()) {
  return {
    version: SAVE_VERSION,
    seed: String(seed),
    rng: seedFrom(seed),
    turn: 1,
    year: 9,
    season: 0, // 0 Akhet · 1 Peret · 2 Shemu
    // briefing: a decree is still owed · court: decree sealed, desks open · ended
    phase: 'briefing',

    pharaoh: {
      id: 'pharaoh',
      kind: 'pharaoh',
      seed: 11,
      name: 'Djehutymes V',
      throneName: 'Sekhemkheperre',
      age: 41,
      health: 70,
      condition: 'Strong in the chariot, but plagued by abscessed molars since the Opet Festival',
      away: false,
    },

    // Royal Attention: what Pharaoh can personally see to each season.
    attention: { max: 3, left: 3 },

    maat: 44,
    famineStreak: 1,
    flood: { band: 'famine', height: 11.75 },
    harvestModifier: 0.5,

    grain: { royal: 610000, temple: 2100000, sealed: 0 },
    gold: 3900,
    goldReserve: 1200,
    baselineIntake: 3000000,
    burn: { army: 100000, workforce: 45000, palace: 45000 }, // khar / month (army is derived from units)
    armyRation: 1, // 1 full · 0.75 reduced · 0.5 half
    policy: { workforceRation: 1, palace: 'normal', tax: 'standard' },
    arrears: { army: 2, workforce: 0 },
    templeLoan: null, // { amount, dueTurn }

    blocs: {
      priesthood: { approval: 57 },
      bureaucracy: { approval: 39 },
      military: { approval: 31 },
    },

    // ── Officials ─────────────────────────────────────────────────────────
    vizier: { id: 'hori-ankh', kind: 'vizier', seed: 21, name: 'Hori-Ankh', title: 'Vizier of the South', age: 49, competence: 72, integrity: 38, ambition: 64, loyalty: 55, origin: 'scribe' },
    vizierNorth: { id: 'rahotep', kind: 'vizier', seed: 22, name: 'Rahotep', title: 'Vizier of the North', age: 57, competence: 55, integrity: 62, ambition: 40, loyalty: 65, origin: 'scribe' },
    highPriest: { id: 'amenemopet-ankh', kind: 'priest', seed: 23, name: 'Amenemopet-Ankh', title: 'High Priest of Amun', age: 61, competence: 70, integrity: 50, ambition: 80, loyalty: 40, origin: 'priest' },
    overseer: { id: 'siese', kind: 'scribe', seed: 24, name: 'Siese', title: 'Overseer of the Granaries', age: 44, competence: 58, integrity: 55, ambition: 45, loyalty: 60, origin: 'scribe' },
    viceroy: { id: 'setau', kind: 'general', seed: 25, name: 'Setau', title: 'King’s Son of Kush (Viceroy)', age: 47, competence: 64, integrity: 50, ambition: 55, loyalty: 60, origin: 'army' },

    // ── The army ──────────────────────────────────────────────────────────
    army: {
      units: [
        { id: 'amun', name: 'Division of Amun', kind: 'infantry', men: 4000, quality: 60, morale: 45, commanderId: 'urhiya', station: 'capital' },
        { id: 'ra', name: 'Division of Ra', kind: 'infantry', men: 4000, quality: 55, morale: 40, commanderId: 'paramessu', station: 'west' },
        { id: 'ptah', name: 'Division of Ptah', kind: 'infantry', men: 4000, quality: 50, morale: 40, commanderId: null, station: 'capital' },
        { id: 'seth', name: 'Division of Seth', kind: 'infantry', men: 4000, quality: 50, morale: 35, commanderId: null, station: 'west' },
        { id: 'chariotry', name: 'Chariot Corps', kind: 'chariots', men: 2000, quality: 70, morale: 45, commanderId: 'khaemopet', station: 'capital' },
        { id: 'medjay', name: 'Medjay', kind: 'police', men: 1000, quality: 55, morale: 60, commanderId: null, station: 'capital' },
        { id: 'sherden', name: 'Sherden Guard', kind: 'mercenary', men: 1000, quality: 75, morale: 50, commanderId: null, station: 'capital' },
      ],
      generals: [
        { id: 'paramessu', kind: 'general', seed: 31, name: 'Paramessu', title: 'General', age: 44, martial: 72, loyalty: 45, ambition: 75 },
        { id: 'urhiya', kind: 'general', seed: 32, name: 'Urhiya', title: 'General', age: 52, martial: 64, loyalty: 75, ambition: 35 },
        { id: 'mahu', kind: 'general', seed: 33, name: 'Mahu', title: 'General', age: 38, martial: 55, loyalty: 60, ambition: 50 },
      ],
      lastCampaign: -99,
    },

    // ── The Two Lands: eight great nomes ─────────────────────────────────
    nomes: [
      { id: 'waset', name: 'Waset (Thebes)', nomarch: 'Amenemhat', seed: 41, loyalty: 60, hereditary: false, share: 0.14, yield: 1 },
      { id: 'coptos', name: 'Gebtu (Coptos)', nomarch: 'Minmose', seed: 42, loyalty: 45, hereditary: false, share: 0.1, yield: 1 },
      { id: 'abydos', name: 'Thinis (Abydos)', nomarch: 'Wenennefer', seed: 43, loyalty: 55, hereditary: false, share: 0.1, yield: 1 },
      { id: 'asyut', name: 'Asyut', nomarch: 'Djefai', seed: 44, loyalty: 40, hereditary: false, share: 0.12, yield: 1 },
      { id: 'hare', name: 'Hare Nome (Hermopolis)', nomarch: 'Nakhtmin', seed: 45, loyalty: 25, hereditary: false, share: 0.12, yield: 1, kinOf: 'henuttawy' },
      { id: 'herakleopolis', name: 'Herakleopolis', nomarch: 'Sobekhotep', seed: 46, loyalty: 45, hereditary: false, share: 0.1, yield: 1 },
      { id: 'memphis', name: 'Memphis', nomarch: 'Ptahmose', seed: 47, loyalty: 55, hereditary: false, share: 0.14, yield: 1 },
      { id: 'delta', name: 'Western Delta (Sais)', nomarch: 'Neshi', seed: 48, loyalty: 35, hereditary: false, share: 0.18, yield: 1 },
    ],

    // ── Foreign courts ────────────────────────────────────────────────────
    realms: {
      hatti: { name: 'Hatti', ruler: 'Great King Tudhaliya', relation: 40, note: 'Bound by the eternal treaty' },
      babylon: { name: 'Karduniash (Babylon)', ruler: 'King Kashtiliash', relation: 15, note: 'Rich in lapis, hungry for gold' },
      assyria: { name: 'Assyria', ruler: 'King Tukulti-Ninurta', relation: -10, note: 'A rising power on the Tigris' },
      alashiya: { name: 'Alashiya (Cyprus)', ruler: 'The King of Alashiya', relation: 30, note: 'Copper for the chariot workshops' },
      canaan: { name: 'Canaanite vassals', ruler: 'The kings of Gaza, Ashkelon and Megiddo', relation: 50, vassal: true, note: 'Tribute, if a garrison stands near' },
      libu: { name: 'The Libu', ruler: 'Chief Meryey', relation: -70, hostile: true, note: 'Raiders of the western Delta' },
    },

    // ── The royal family ──────────────────────────────────────────────────
    wives: [
      { id: 'tiy', kind: 'queen', seed: 51, name: 'Tiy-Merenmut', title: 'Great Royal Wife', origin: 'Theban priestly family (her brother is Second Prophet of Amun)', tie: 'priesthood', age: 34, influence: 30, ambition: 55, satisfaction: 70, plot: 0, status: 'court' },
      { id: 'henuttawy', kind: 'wife', seed: 52, name: 'Henuttawy', title: 'Secondary Wife', origin: 'Daughter of Nakhtmin, Nomarch of the Hare Nome', tie: 'bureaucracy', age: 43, influence: 80, ambition: 85, satisfaction: 33, plot: 0, status: 'court' },
      { id: 'asmunikal', kind: 'wife-hatti', seed: 53, name: 'Ašmunikal', title: 'Hittite Royal Wife (Maathorneferure)', origin: 'Daughter of the Great King of Hatti', tie: 'hatti', age: 22, influence: 25, ambition: 45, satisfaction: 50, plot: 0, status: 'court' },
    ],
    sons: [
      { id: 'ramose', kind: 'prince', sex: 'm', seed: 61, name: 'Ramose', age: 11, motherId: 'tiy', legitimacy: 61, loyalty: 92, role: 'Crown Prince', trait: 'clever', edu: 'kap', skill: 'statecraft', spouse: null, alive: true },
      { id: 'khaemopet', kind: 'prince', sex: 'm', seed: 62, name: 'Khaemopet', age: 26, motherId: 'henuttawy', legitimacy: 48, loyalty: 55, role: 'General of the Chariotry at Pi-Ramesses', trait: 'ambitious', edu: 'chariot', skill: 'martial', spouse: null, alive: true },
      { id: 'amenmose', kind: 'prince', sex: 'm', seed: 63, name: 'Amenmose', age: 9, motherId: 'henuttawy', legitimacy: 30, loyalty: 80, role: 'King’s Son', trait: 'pious', edu: null, skill: null, spouse: null, alive: true },
    ],
    daughters: [
      { id: 'meritamun', kind: 'princess', sex: 'f', seed: 71, name: 'Meritamun', age: 16, motherId: 'tiy', role: 'King’s Daughter', trait: 'pious', edu: 'temple', skill: 'piety', spouse: null, alive: true },
      { id: 'nebettawy', kind: 'princess', sex: 'f', seed: 72, name: 'Nebettawy', age: 14, motherId: 'henuttawy', role: 'King’s Daughter', trait: 'charming', edu: null, skill: null, spouse: null, alive: true },
    ],
    heirId: 'ramose',
    pregnancy: { wifeId: 'asmunikal', dueTurn: 2 },

    monuments: [
      { id: 'tomb', name: 'Royal Tomb in the Valley of the Kings', progress: 55, ongoing: true, active: true, done: false, perSeason: 3 },
    ],

    omens: [],
    flags: {},
    forced: [], // [{ eventId, priority, ctx }]
    rotation: { history: ['crisis'], respite: false },
    usedEvents: {},
    cooldowns: {}, // desk action cooldowns: key → turn available again
    briefing: { type: 'crisis', eventId: 'hunger_flood', ctx: {} },
    seasonReport: [],
    lastOutcome: null,
    commands: [], // desk actions taken this season
    chronicle: [],
    ending: null,
  };
}
