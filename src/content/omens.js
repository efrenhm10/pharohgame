// Omens on the Horizon (DESIGN.md §8). Each one is a pressure building toward
// a future crisis. Flood omens tilt the next Akhet roll instead of forcing an event.
export const OMEN_POOL = [
  {
    id: 'thin_rains',
    text: 'The priests of Khnum at Elephantine say the southern rains were thin. Hapi may come weak next Akhet.',
    floodBias: { famine: 15, lean: 10, blessing: -20, high: -5 },
    delay: 3,
  },
  {
    id: 'hatti_hunger',
    text: 'Messengers from Hattusa arrive gaunt. The Great King’s letters speak of empty storehouses in Anatolia.',
    eventId: 'hittite_plea',
    delay: 3,
  },
  {
    id: 'sea_sails',
    text: 'Fishermen at the Rosetta mouth report strange ships with bird-headed prows beyond the sandbars.',
    eventId: 'sea_peoples',
    delay: 3,
  },
  {
    id: 'kush_unrest',
    text: 'The gold caravans from Kush arrive late and short. The Viceroy writes of trouble in Irem.',
    eventId: 'nubian_revolt',
    delay: 3,
    when: (s) => !s.flags.nubianGoldLost,
  },
  {
    id: 'scribe_whispers',
    text: 'A junior scribe in the Treasury has asked, very quietly, for an audience with Pharaoh alone.',
    eventId: 'vizier_ledger',
    delay: 2,
  },
  {
    id: 'nomarch_feasts',
    text: 'The Nomarchs of Middle Egypt have been feasting together at Hermopolis. No royal scribe was invited.',
    eventId: 'nomarch_league',
    delay: 3,
  },
];
