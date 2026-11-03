// 🌅 Opportunity Briefings. DESIGN.md §7b / §8.4.
// Same option shape as crises; the UI labels the fields Investment /
// Political Dividend / Long-Term Dynastic Legacy.
import { fmt } from '../engine/util.js';
import { heir, son, wife, sonsOf, isAdult, livingSons } from '../engine/realm.js';
import { surplusGrain, surplusGold } from '../engine/economy.js';
import { cubitsLabel } from '../engine/flood.js';

const heirMotherFx = (s, delta, exceptWifeId) => {
  const h = heir(s);
  if (!h || h.motherId === exceptWifeId) return {};
  return { [h.motherId]: delta };
};

// ─────────────────────────────────────────────────────────────────────────
const blessing = {
  id: 'blessing_surplus',
  type: 'opportunity',
  title: 'The Blessing of Hapi',
  when: (s) => s.flood.band === 'blessing',
  weight: 25,
  cooldown: 3,
  brief: (s) => [
    `The Nilometer read **${cubitsLabel(s.flood.height)} cubits**, a perfect flood. Black silt covers every field from Elephantine to the Delta. The harvest will be a quarter above normal, and the work gangs sing at their labor.`,
    `**Everyone wants the credit.** High Priest ${s.highPriest.name} says Amun answered the temple’s prayers. The Nomarchs say their dykes held. The court poets say only Pharaoh could command the river. Whoever you thank will be stronger for it.`,
    `Royal granaries: **${fmt(s.grain.royal)} khar** (surplus above six months of rations: **${fmt(surplusGrain(s))}**).`,
  ],
  options: [
    {
      id: 'pylon',
      title: 'Raise a Great Pylon and Festival Hall at Karnak',
      cost: '250,000 khar over 8 seasons as a monthly crew cost (−20% this year).',
      fallout: 'Priesthood +5% now, and +15% with Ma’at +10 when it is finished. Bureaucracy −3%: the corvée is drawn from their nomes.',
      risk: 'Completion strengthens your heir’s claim (+5 Legitimacy). If you die with it unfinished, it shames your memory.',
      apply(s, api) {
        api.fx({ monument: 'pylon', approval: { priesthood: 5, bureaucracy: -3 } });
        api.log('Surveyors stretch cords at Karnak for the foundation of a new pylon, in your name.');
      },
    },
    {
      id: 'opet',
      title: 'Proclaim an Opet Festival of Unmatched Splendor',
      cost: '80,000 khar of bread and beer, and 200 deben of gold for the god’s new barque.',
      fallout: 'Ma’at +8. Every power block +4%. The Crown Prince is shown to the people.',
      risk: (s) => `Crown Prince ${heir(s) ? heir(s).name : ''} gains +5 Legitimacy. Grain spent on festivals cannot be eaten in a lean year.`,
      apply(s, api) {
        const fx = { grain: -80000, gold: -200, maat: 8, approval: { priesthood: 4, bureaucracy: 4, military: 4, harem: 4 } };
        if (heir(s)) fx.sons = { [s.heirId]: { legitimacy: 5 } };
        api.fx(fx);
        api.log('For eleven days Amun visits Luxor, with Pharaoh beside him and the Crown Prince behind. Thebes eats and drinks in your name.');
      },
    },
    {
      id: 'seal',
      title: 'Seal the Surplus Against the Lean Years',
      cost: (s) => `${fmt(Math.min(300000, s.grain.royal))} khar moved into sealed granaries. It is safe from rations and leakage.`,
      fallout: 'Bureaucracy −3%: they hoped for a remission. Priesthood is unmoved.',
      risk: '**Preparation:** it unlocks "Open the Hoarded Granaries" in future famine, strike and riot crises.',
      apply(s, api) {
        const amt = Math.min(300000, s.grain.royal);
        api.fx({ grain: -amt, sealed: amt, approval: { bureaucracy: -3 } });
        api.log('Mud-brick granaries are sealed with Pharaoh’s cartouche, and a scribe is set to count them every month.');
      },
    },
    {
      id: 'remit',
      title: 'Thank the Nomes: Remit a Third of the Tax',
      cost: 'This year’s harvest tax is cut by a third.',
      fallout: 'Bureaucracy +15%, Ma’at +3. Priesthood −5%: the credit went to the dykes, not to Amun.',
      risk: 'The Nomarchs grow richer and more confident.',
      apply(s, api) {
        api.fx({ approval: { bureaucracy: 15, priesthood: -5 }, maat: 3, flags: { taxRemissionYear: s.year } });
        api.log('Pharaoh credits the governors’ dykes with the good harvest. The Nomarchs feast in your honor.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const punt = {
  id: 'punt_return',
  type: 'opportunity',
  title: 'The Ships Return from Punt',
  weight: 8,
  cooldown: 12,
  brief: (s) => [
    'Five ships have come back up the Red Sea road to Coptos, loaded with **myrrh trees in baskets, incense, ebony, ivory, electrum, baboons and panther skins**. The admiral has been away two years and has lost only one ship.',
    'The Priesthood wants the myrrh trees for Amun’s terraces. The court wants the electrum. The admiral wants to be thanked. Each of these uses of the cargo makes a different friend.',
    `Treasury: **${fmt(s.gold)} deben** (above the diplomatic reserve: **${fmt(surplusGold(s))}**).`,
  ],
  options: [
    {
      id: 'myrrh',
      title: 'Plant the Myrrh Terraces at Amun’s Temple',
      cost: 'The trees and the incense go to Karnak.',
      fallout: 'Priesthood +15%, Ma’at +5. The court gets nothing.',
      risk: 'Amun is reminded that Pharaoh is generous. Next time he will expect the same.',
      apply(s, api) {
        api.fx({ approval: { priesthood: 15 }, maat: 5 });
        api.log('Living myrrh trees are planted in the terraces of Amun. The whole temple smells of Punt.');
      },
    },
    {
      id: 'electrum',
      title: 'Send the Electrum to Foreign Courts',
      cost: 'The cargo is converted into 900 deben of diplomatic gold.',
      fallout: 'Ašmunikal +5%. Babylon takes notice: a royal bride may be offered.',
      risk: 'Nobody at home is rewarded.',
      apply(s, api) {
        api.fx({ gold: 900, wives: { asmunikal: 5 }, flags: { babylonOffer: true } });
        api.log('Electrum ingots go north to Hattusa and east to Babylon. The Kassite king replies quickly, and mentions his daughters.');
      },
    },
    {
      id: 'admiral',
      title: 'Reward the Admiral and His Nome',
      cost: '300 deben of the electrum go to the admiral’s household. The rest goes to the treasury.',
      fallout: 'Bureaucracy +10%, Military +5%. Priesthood −3%.',
      risk: 'A favored admiral with a fleet and friends in the nomes.',
      apply(s, api) {
        api.fx({ gold: 300, approval: { bureaucracy: 10, military: 5, priesthood: -3 }, flags: { admiralFavored: true } });
        api.log('The admiral is given the Gold of Valor at the Window of Appearances.');
      },
    },
    {
      id: 'incense',
      title: 'Hold the Incense for the Crown Prince’s Rite',
      cost: 'The incense is stored for a great ceremony presenting the heir.',
      fallout: (s) => `Crown Prince ${heir(s) ? heir(s).name : ''}’s Legitimacy +10. His mother +10%. Rival mothers −10%.`,
      risk: 'You have publicly ranked your sons, and the losers will remember it.',
      apply(s, api) {
        const h = heir(s);
        const wives = {};
        for (const w of s.wives.filter((x) => x.status === 'court')) wives[w.id] = h && w.id === h.motherId ? 10 : sonsOf(s, w.id).length ? -10 : 0;
        api.fx({ sons: h ? { [h.id]: { legitimacy: 10 } } : {}, wives });
        api.log('Clouds of Punt incense surround the Crown Prince as he is presented before Amun.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const babylonPrincess = {
  id: 'babylonian_princess',
  type: 'opportunity',
  title: 'A Princess from Babylon',
  once: true,
  when: (s) => s.turn > 3,
  weight: (s) => (s.flags.babylonOffer ? 30 : 4),
  brief: () => [
    'A caravan of the Kassite king of Karduniash (Babylon) has reached Pi-Ramesses: lapis lazuli, horses, and **Princess Ishtar-ummi** with three hundred attendants. Her father’s letter asks that she be honored *"as befits my daughter, and not hidden away as the last one was."*',
    'Every wife in the harem has heard about her already. A Babylonian alliance balances Hatti, but a new royal wife changes the harem’s politics.',
  ],
  options: [
    {
      id: 'raise',
      title: 'Raise Her above the Secondary Wives',
      cost: 'She takes precedence over Henuttawy and Ašmunikal at court.',
      fallout: 'Babylon is allied, and her dowry adds 500 deben. Henuttawy −15%, Ašmunikal −10%.',
      risk: 'A powerful foreign queen with a dowry, and in time a son of her own.',
      apply(s, api) {
        api.fx({ gold: 500, wives: { henuttawy: -15, asmunikal: -10 }, flags: { babylonAllied: true } });
        s.wives.push({ id: 'ishtarummi', kind: 'wife-babylon', seed: 901, age: 19, name: 'Ishtar-ummi', title: 'Babylonian Royal Wife', origin: 'Daughter of the King of Karduniash', tie: 'babylon', influence: 40, ambition: 60, satisfaction: 75, plot: 0, status: 'court' });
        api.log('Ishtar-ummi is installed in the north palace with honors only a Great Royal Wife has received before.');
      },
    },
    {
      id: 'son',
      title: 'Marry Her to Your Eldest Adult Son',
      available: (s) => livingSons(s).some(isAdult),
      cost: 'She becomes a daughter-in-law, not a wife.',
      fallout: (s) => `${eldest(s).name}’s Legitimacy +12 and his mother +15%. Babylon is allied.`,
      risk: (s) => (eldest(s).id === s.heirId ? 'The heir gains a foreign queen and a foreign ally.' : 'A non-heir prince with Babylonian backing is a new and serious claimant.'),
      apply(s, api) {
        const e = eldest(s);
        api.fx({ sons: { [e.id]: { legitimacy: 12 } }, wives: { [e.motherId]: 15 }, flags: { babylonAllied: true } });
        api.log(`Prince ${e.name} is married to Ishtar-ummi. Babylon has its link to the throne, and so does the prince.`);
      },
    },
    {
      id: 'seclude',
      title: 'Seclude Her at Mi-wer; Keep the Dowry',
      cost: 'She is sent to the weaving-palace in the Fayum. The dowry stays.',
      fallout: '+800 deben of gold. The harem is relieved (+5%).',
      risk: 'Babylon is insulted. A humiliated foreign wife makes a natural conspirator.',
      apply(s, api) {
        api.fx({ gold: 800, approval: { harem: 5 }, flags: { babylonCold: true } });
        s.wives.push({ id: 'ishtarummi', kind: 'wife-babylon', seed: 901, age: 19, name: 'Ishtar-ummi', title: 'Babylonian Wife (secluded)', origin: 'Daughter of the King of Karduniash', tie: 'babylon', influence: 5, ambition: 70, satisfaction: 20, plot: 0, status: 'court' });
        api.log('Ishtar-ummi is taken to the Fayum. Her father’s next letter is angry.');
      },
    },
    {
      id: 'return',
      title: 'Return Her with Honors',
      cost: '200 deben in return gifts.',
      fallout: 'Harem +5%. Babylon is mildly offended.',
      risk: 'No new alliance.',
      apply(s, api) {
        api.fx({ gold: -200, approval: { harem: 5 } });
        api.log('Ishtar-ummi is escorted home with chests of gold. Babylon accepts, politely.');
      },
    },
  ],
};
const eldest = (s) => livingSons(s).filter(isAdult).sort((a, b) => b.age - a.age)[0];

// ─────────────────────────────────────────────────────────────────────────
const sonBorn = {
  id: 'son_born',
  type: 'opportunity',
  title: 'A Son of Horus Is Born',
  forcedOnly: true,
  brief: (s, ctx) => {
    const sn = son(s, ctx.sonId);
    const m = wife(s, sn.motherId) || { name: s.pharaoh.name, title: 'Pharaoh herself', origin: 'Born of the living Horus' };
    return [
      `**${m.name}** (${m.title}) has given birth to a healthy son: **Prince ${sn.name}**. The midwives have recited the spells of Bes and Taweret over him, and the court has celebrated for three days.`,
      `${m.origin}. The baby’s claim depends on how you present him, and each of the other mothers is already counting what he costs her son.`,
    ];
  },
  options: [
    {
      id: 'karnak',
      title: 'Present Him before Amun at Karnak',
      cost: '200 deben for the naming rite.',
      fallout: 'The infant’s Legitimacy +15, his mother +10%, Priesthood +5%. The heir’s mother −10%.',
      risk: 'A new claimant has a god’s blessing.',
      apply(s, api) {
        const sn = son(s, api.ctx.sonId);
        api.fx({ gold: -200, sons: { [sn.id]: { legitimacy: 15 } }, wives: { [sn.motherId]: 10, ...heirMotherFx(s, -10, sn.motherId) }, approval: { priesthood: 5 } });
        api.log(`Prince ${sn.name} is held up before Amun. The god’s barque bows to him.`);
      },
    },
    {
      id: 'foster',
      title: 'Foster Him with a Nomarch Family',
      cost: 'He is raised far from court by a governor’s household.',
      fallout: 'Bureaucracy +10%. His Legitimacy +5. His mother −5%.',
      risk: 'His Loyalty will belong partly to his foster house.',
      apply(s, api) {
        const sn = son(s, api.ctx.sonId);
        api.fx({ approval: { bureaucracy: 10 }, sons: { [sn.id]: { legitimacy: 5, loyalty: -10 } }, wives: { [sn.motherId]: -5 } });
        api.log(`Prince ${sn.name} is sent south to be raised in a Nomarch’s house.`);
      },
    },
    {
      id: 'priest',
      title: 'Dedicate Him to the Priesthood of Ptah',
      cost: 'He is removed from the succession for life.',
      fallout: 'Priesthood +10%. The heir’s mother +10%. His own mother −15%.',
      risk: 'One fewer claimant, and one more priest of royal blood. Royal high priests have founded dynasties before.',
      apply(s, api) {
        const sn = son(s, api.ctx.sonId);
        api.fx({ approval: { priesthood: 10 }, sons: { [sn.id]: { legitimacy: -40 } }, wives: { [sn.motherId]: -15, ...heirMotherFx(s, 10, sn.motherId) } });
        sn.role = 'Novice of Ptah at Memphis';
        api.log(`Prince ${sn.name} will wear the leopard skin of a priest of Ptah, not a crown.`);
      },
    },
    {
      id: 'hide',
      title: 'Keep Him Close in the Royal Nursery',
      cost: 'No announcement and no rite.',
      fallout: 'His mother +5%. No faction is moved.',
      risk: 'You keep your options open, and so does everyone in the harem.',
      apply(s, api) {
        const sn = son(s, api.ctx.sonId);
        api.fx({ wives: { [sn.motherId]: 5 } });
        api.log(`Prince ${sn.name} is kept in the royal nursery under trusted nurses.`);
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const victoryDividend = {
  id: 'victory_dividend',
  type: 'opportunity',
  title: 'The Spoils of the Western War',
  when: (s) => s.flags.victoryDividend,
  weight: 40,
  brief: () => [
    'The scribes are still counting the spoils: **Libyan captives, herds of cattle, bronze swords and the war-gear of Meryey’s chiefs**. The army parades them past the Window of Appearances.',
    'Captives and cattle are wealth, and wealth has to be given to someone. Whoever you reward will be stronger for it, and everyone else will notice.',
  ],
  options: [
    {
      id: 'corvee',
      title: 'Settle the Captives as Royal Laborers',
      cost: 'The captives are branded and settled on royal estates.',
      fallout: 'Royal tax intake +4% forever as new fields are opened. Bureaucracy +5%, Ma’at +3.',
      risk: 'A Libyan population inside Egypt. Their grandsons may remember who they were.',
      apply(s, api) {
        api.fx({ intake: 1.04, approval: { bureaucracy: 5 }, maat: 3, flags: { victoryDividend: false } });
        api.log('Libyan captives are settled on royal land in the Delta, and the fields there turn green.');
      },
    },
    {
      id: 'karnak',
      title: 'Endow Karnak with the Booty',
      cost: 'The cattle and captives go to Amun’s estates.',
      fallout: 'Priesthood +15%, Ma’at +3. Amun’s granaries +80,000 khar.',
      risk: 'The temple grows richer from your war.',
      apply(s, api) {
        api.fx({ temple: 80000, approval: { priesthood: 15 }, maat: 3, flags: { victoryDividend: false } });
        api.log('Long lines of captives and cattle are led through the pylons of Karnak.');
      },
    },
    {
      id: 'generals',
      title: 'Reward the Generals with Gold of Valor',
      cost: 'The booty goes to the officers.',
      fallout: 'Military +15%. The commanding prince’s Legitimacy +8.',
      risk: 'Generals who are well rewarded expect to be rewarded again.',
      apply(s, api) {
        const k = livingSons(s).find((x) => /General/.test(x.role));
        const fx = { approval: { military: 15 }, flags: { victoryDividend: false } };
        if (k) fx.sons = { [k.id]: { legitimacy: 8 } };
        api.fx(fx);
        api.log('Collars of golden flies are hung around the necks of the victorious officers.');
      },
    },
    {
      id: 'forts',
      title: 'Settle Veterans in Western Forts',
      cost: '50,000 khar to build and supply the forts.',
      fallout: 'Military +8%. The western border is secure.',
      risk: '**Preparation:** better odds against future invasions from the west and from the sea.',
      apply(s, api) {
        api.fx({ grain: -50000, approval: { military: 8 }, flags: { westFortified: true, victoryDividend: false } });
        api.log('A chain of veteran-held forts rises along the coastal road to the west.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const goldSeam = {
  id: 'gold_seam',
  type: 'opportunity',
  title: 'Gold in the Eastern Desert',
  weight: 5,
  cooldown: 12,
  brief: () => [
    'Prospectors working the Wadi Hammamat have found a new seam of gold-bearing quartz. The overseer of the desert mines estimates **2,000 deben** in its first year.',
    'Gold cannot feed Egypt, but it can buy almost everything else. The question is who gets to dig it, and what it should buy.',
  ],
  options: [
    {
      id: 'treasury',
      title: 'Keep It for the Crown Treasury',
      cost: 'Royal miners, royal guards, royal profit.',
      fallout: '+2,000 deben. Bureaucracy −3%: the desert governors wanted a share.',
      risk: 'A full treasury tempts foreign kings to ask for it, and generals to demand it.',
      apply(s, api) {
        api.fx({ gold: 2000, approval: { bureaucracy: -3 } });
        api.log('Gold dust arrives at the treasury in sealed leather bags.');
      },
    },
    {
      id: 'mercenaries',
      title: 'Hire Mercenaries and Clear the Arrears',
      cost: 'The gold goes straight to the army.',
      fallout: 'Military +12%. Army arrears cleared and full rations restored.',
      risk: 'An army that is paid in gold will expect gold again.',
      apply(s, api) {
        api.fx({ gold: 500, approval: { military: 12 }, arrears: { army: -s.arrears.army }, armyRation: 1 });
        api.log('Sherden and Nubian companies are paid in gold rings. The barracks are quiet for once.');
      },
    },
    {
      id: 'temple',
      title: 'Grant the Mine to Amun',
      cost: 'Karnak takes the mine and its profits.',
      fallout: 'Priesthood +18%, Ma’at +3. +500 deben as the god’s gift back to you.',
      risk: 'The temple now owns gold as well as grain.',
      apply(s, api) {
        api.fx({ gold: 500, approval: { priesthood: 18 }, maat: 3 });
        api.log('The mine is deeded to Amun-Ra, King of the Gods.');
      },
    },
    {
      id: 'alliance',
      title: 'Buy a Great Alliance Abroad',
      cost: '1,500 deben are sent to Hattusa as brotherly gifts.',
      fallout: 'Ašmunikal +10%. Hatti becomes a firm friend.',
      risk: 'A friend abroad is not a friend at home.',
      apply(s, api) {
        api.fx({ gold: 500, wives: { asmunikal: 10 }, flags: { hittiteFriend: true, hittiteCold: false } });
        api.log('Gold sails north. The Great King calls you "brother" in his own hand.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const canaanTribute = {
  id: 'canaan_tribute',
  type: 'opportunity',
  title: 'Tribute from Canaan',
  weight: 6,
  cooldown: 6,
  brief: () => [
    'The vassal kings of Gaza, Ashkelon and Megiddo have sent their yearly tribute: **cedar, silver, wine, chariots and young men for the guard**. Their envoys bow seven times and seven times again.',
    'Tribute shows Egypt’s power, but only if people see it. Where it goes decides who feels that power.',
  ],
  options: [
    {
      id: 'campaign',
      title: 'Campaign to Collect More',
      cost: '60,000 khar to march the army north.',
      fallout: 'Military +10% and +600 deben of extra tribute. Bureaucracy −3%: the corvée goes to war.',
      risk: 'The army grows used to booty.',
      apply(s, api) {
        api.fx({ grain: -60000, gold: 600, approval: { military: 10, bureaucracy: -3 } });
        api.log('The army marches as far as Megiddo. The vassal kings pay double to see it leave.');
      },
    },
    {
      id: 'display',
      title: 'Display It at the Window of Appearances',
      cost: 'The tribute is paraded through Pi-Ramesses before it goes to the treasury.',
      fallout: 'Ma’at +5. +400 deben.',
      risk: 'None, except that foreign envoys now know exactly what you have.',
      apply(s, api) {
        api.fx({ maat: 5, gold: 400 });
        api.log('The tribute of Canaan is paraded through the capital. The people cheer the lord of the foreign lands.');
      },
    },
    {
      id: 'temples',
      title: 'Share It with the Temples',
      cost: 'Half the tribute is dedicated to Amun, Ptah and Ra.',
      fallout: 'Priesthood +10%. +200 deben.',
      risk: 'The gods grow richer than the treasury.',
      apply(s, api) {
        api.fx({ approval: { priesthood: 10 }, gold: 200 });
        api.log('Cedar beams for the god’s barques and silver for the temple workshops.');
      },
    },
    {
      id: 'harem',
      title: 'Lavish It on the Harem and the Heir',
      cost: 'Jewelry, linen and fine wine for the royal women and the Crown Prince.',
      fallout: 'Harem +8%. Heir’s Legitimacy +4. +200 deben.',
      risk: 'Gifts calm the harem only for as long as they keep coming.',
      apply(s, api) {
        const fx = { approval: { harem: 8 }, gold: 200 };
        if (heir(s)) fx.sons = { [s.heirId]: { legitimacy: 4 } };
        api.fx(fx);
        api.log('Every wife receives gifts, carefully matched in value so that none feels slighted. They compare them anyway.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const quietSeason = {
  id: 'quiet_season',
  type: 'opportunity',
  title: 'A Season of Order',
  fallback: true,
  weight: 6,
  cooldown: 2,
  brief: (s) => [
    'The Nile runs in its banks, the tax barges arrive on time, and nobody is marching on anything. For once, the court is waiting to hear what *you* want.',
    `Royal granaries: **${fmt(s.grain.royal)} khar**. Treasury: **${fmt(s.gold)} deben**. A quiet season is a chance to build something, or to strengthen something before the next crisis tests it.`,
  ],
  options: [
    {
      id: 'obelisks',
      title: 'Commission a Pair of Obelisks for Karnak',
      cost: '60,000 khar over 3 seasons as a monthly crew cost.',
      fallout: 'When finished: Priesthood +8%, Ma’at +5.',
      risk: 'A small monument, quickly done. It will not be your greatest legacy.',
      apply(s, api) {
        api.fx({ monument: 'obelisks' });
        api.log('Quarrymen at Aswan begin cutting two granite needles from the bedrock.');
      },
    },
    {
      id: 'mortuary',
      title: 'Found Your Mortuary Temple',
      available: (s) => !s.monuments.some((m) => m.catalogId === 'mortuary'),
      cost: '400,000 khar over 12 seasons, the largest building project of your reign.',
      fallout: 'When finished: Ma’at +8, and every son of yours gains +10 Legitimacy.',
      risk: 'A three-year drain on the granaries. Leaving it unfinished would shame your memory.',
      apply(s, api) {
        api.fx({ monument: 'mortuary' });
        api.log('On the West Bank at Thebes, the foundation deposits of your Mansion of Millions of Years are laid.');
      },
    },
    {
      id: 'tour',
      title: 'Tour the Nomes by Royal Barge',
      cost: '150 deben in gifts. The journey is tiring.',
      fallout: 'Bureaucracy +8%. Ma’at +2: the people see the living god.',
      risk: 'Pharaoh’s health −3. The harem is left alone for the season.',
      apply(s, api) {
        s.pharaoh.away = true;
        api.fx({ gold: -150, approval: { bureaucracy: 8 }, maat: 2, health: -3 });
        api.log('The royal barge sails from nome to nome. Governors kneel on their own quays.');
      },
    },
    {
      id: 'justice',
      title: 'Hold Court and Hear Petitions',
      cost: 'A season spent judging cases at the palace gate.',
      fallout: 'Ma’at +5. Bureaucracy −3%: corrupt officials are exposed.',
      risk: 'Officials you shame have long memories.',
      apply(s, api) {
        api.fx({ maat: 5, approval: { bureaucracy: -3 }, vizier: { integrity: 3 } });
        api.log('Peasants, widows and scribes bring their cases to the gate. Pharaoh judges, and Ma’at is seen to be done.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const sedFestival = {
  id: 'sed_festival',
  type: 'opportunity',
  title: 'The Sed Festival: Thirty Years of the Horus',
  once: true,
  when: (s) => s.year >= 30,
  weight: 100,
  brief: () => [
    'Thirty years of reign. Tradition demands the **Heb-Sed**, the jubilee where Pharaoh runs the ritual course to show the gods his strength has been renewed.',
    'Envoys from every court will come. How you celebrate will decide how your reign is remembered.',
  ],
  options: [
    {
      id: 'lavish',
      title: 'Spend Lavishly: a Jubilee for the Ages',
      cost: '200,000 khar and 1,000 deben.',
      fallout: 'Ma’at +20. Every power block +8%.',
      risk: 'The granaries are thin afterward.',
      apply(s, api) {
        api.fx({ grain: -200000, gold: -1000, maat: 20, approval: { priesthood: 8, bureaucracy: 8, military: 8, harem: 8 } });
        api.log('Pharaoh runs the course between the boundary markers in front of every god of Egypt. The scribes write that he is young again.');
      },
    },
    {
      id: 'heir',
      title: 'Use the Festival to Crown the Heir Co-Regent',
      cost: '100,000 khar.',
      fallout: 'The heir’s Legitimacy +25. Ma’at +10. Rival mothers −20%.',
      risk: 'Two kings on the throne. The younger one is impatient.',
      apply(s, api) {
        const h = heir(s);
        const wives = {};
        for (const w of s.wives.filter((x) => x.status === 'court')) if (h && w.id !== h.motherId) wives[w.id] = -20;
        api.fx({ grain: -100000, maat: 10, sons: h ? { [h.id]: { legitimacy: 25 } } : {}, wives });
        api.log(h ? `Crown Prince ${h.name} is crowned beside you. The Two Lands have two Horuses.` : 'The festival is held, but there is no heir to crown.');
      },
    },
    {
      id: 'envoys',
      title: 'Invite the Foreign Kings',
      cost: '1,500 deben in return gifts.',
      fallout: 'Ma’at +10. Hatti and Babylon are honored.',
      risk: 'The whole world sees how rich Egypt is.',
      apply(s, api) {
        api.fx({ gold: -1500, maat: 10, flags: { hittiteFriend: true, babylonAllied: true } });
        api.log('Envoys from Hatti, Babylon, Assyria and Alashiya kneel together at the jubilee.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const accession = {
  id: 'accession',
  type: 'opportunity',
  title: (s) => `Long Live ${s.pharaoh.name}`,
  forcedOnly: true,
  brief: (s) => {
    const last = s.dynasty[s.dynasty.length - 1];
    return [
      `${last ? `${last.name} has been laid in the House of Eternity after ${last.years} years on the throne.` : 'The old king is dead.'} Seventy days of mourning are over. **${s.pharaoh.name}**, ${s.pharaoh.throneName}, steps onto the Horus throne at Memphis.`,
      `Every faction is watching the new ${s.pharaoh.sex === 'f' ? 'king, a woman wearing the false beard,' : 'king'} to see what kind of ruler ${s.pharaoh.sex === 'f' ? 'she' : 'he'} will be.${s.regency ? ` Until Pharaoh comes of age, ${s.regency.regent} holds the regency.` : ''}`,
    ];
  },
  options: [
    {
      id: 'coronation',
      title: 'A Coronation of Unmatched Splendor',
      cost: '100,000 khar and 300 deben of gold.',
      fallout: 'Ma’at +8. Every power block +3%.',
      risk: 'A full treasury is the strongest argument a new king has. This spends some of it.',
      apply(s, api) {
        api.fx({ grain: -Math.min(100000, s.grain.royal), gold: -Math.min(300, s.gold), maat: 8, approval: { priesthood: 3, bureaucracy: 3, military: 3, harem: 3 } });
        api.log('The double crown is placed on Pharaoh’s head at Memphis before every god and every Nomarch of the Two Lands.');
      },
    },
    {
      id: 'amnesty',
      title: 'Proclaim an Amnesty and a Tax Remission',
      cost: 'This year’s taxes are cut by a third; prisoners are freed.',
      fallout: 'Bureaucracy +8%, Ma’at +4.',
      risk: 'The granaries will be thin after Shemu.',
      apply(s, api) {
        for (const n of s.nomes) n.loyalty = Math.min(100, n.loyalty + 6);
        api.fx({ approval: { bureaucracy: 8 }, maat: 4, flags: { taxRemissionYear: s.year } });
        api.log('Heralds proclaim Pharaoh’s mercy in every nome. The prisons of Tjaru are opened.');
      },
    },
    {
      id: 'confirm',
      title: 'Confirm Every Official in Office',
      cost: 'You keep your father’s men, and their habits.',
      fallout: 'Every official’s loyalty +15. Bureaucracy +4%.',
      risk: 'Continuity, including the corruption you inherited.',
      apply(s, api) {
        for (const k of ['vizier', 'vizierNorth', 'highPriest', 'overseer', 'viceroy']) if (s[k]) s[k].loyalty = Math.min(100, (s[k].loyalty ?? 50) + 15);
        api.fx({ approval: { bureaucracy: 4 } });
        api.log('The Viziers, the High Priest and the Viceroy kneel and receive their seals again from the new king’s hand.');
      },
    },
    {
      id: 'purge',
      title: 'Purge the Old Court',
      cost: 'Your siblings are sent to distant temples and estates; their friends lose their posts.',
      fallout: 'Military +5%. Bureaucracy −8%. Ma’at −2.',
      risk: 'Your brothers and sisters lose 20 Legitimacy and 20 Loyalty. They remember.',
      apply(s, api) {
        const fx = { approval: { military: 5, bureaucracy: -8 }, maat: -2, sons: {} };
        for (const x of [...s.sons, ...(s.daughters || [])]) if (x.alive && x.rel === 'sibling' && x.legitimacy != null) fx.sons[x.id] = { legitimacy: -20, loyalty: -20 };
        api.fx(fx);
        api.log('One by one, Pharaoh’s brothers and sisters are given estates far from the capital, and guards to keep them there.');
      },
    },
  ],
};

export const OPPORTUNITIES = [blessing, punt, babylonPrincess, sonBorn, victoryDividend, goldSeam, canaanTribute, quietSeason, sedFestival, accession];
