// DESIGN.md §6. Grain is the total cost, paid as a monthly crew over `seasons`.
export const MONUMENT_CATALOG = {
  obelisks: {
    name: 'Obelisk pair at Karnak',
    grain: 60000,
    seasons: 3,
    reward: { maat: 5, approval: { priesthood: 8 } },
  },
  pylon: {
    name: 'Great Pylon and Festival Hall',
    grain: 250000,
    seasons: 8,
    reward: { maat: 10, approval: { priesthood: 15 }, heirLegitimacy: 5 },
  },
  ptah_temple: {
    name: 'Temple of Ptah at Memphis',
    grain: 150000,
    seasons: 6,
    reward: { maat: 5, approval: { priesthood: 8, bureaucracy: 5 } },
  },
  west_forts: {
    name: 'Chain of fortresses on the western road',
    grain: 100000,
    seasons: 4,
    reward: { approval: { military: 5 }, flags: { westFortified: true } },
  },
  granaries: {
    name: 'Great Granaries of Pi-Ramesses',
    grain: 120000,
    seasons: 4,
    reward: { approval: { bureaucracy: 3 }, flags: { granaryComplex: true } },
  },
  mortuary: {
    name: 'Mortuary Temple, "Mansion of Millions of Years"',
    grain: 400000,
    seasons: 12,
    reward: { maat: 8, dynastyLegitimacy: 10 },
  },
};
