// ⚡ Crisis Decrees. DESIGN.md §7a.
// brief(state, ctx) → paragraphs (mini-markdown: **bold**, *italic*)
// option: { id, title, cost, fallout, risk, available?(s,ctx), unlocked?, apply(s, api) }
import { fmt } from '../engine/util.js';
import { heir, son, wife, sonsOf, rivalClaimant, isAdult, approval, livingSons } from '../engine/realm.js';
import { reserveMonths } from '../engine/economy.js';
import { cubitsLabel } from '../engine/flood.js';
import { commander, units, syncArmyBurn } from '../engine/army.js';

const heirName = (s) => (heir(s) ? heir(s).name : 'no one');
const victory = (api, extra = {}) =>
  api.fx({ maat: 10, ...extra, flags: { victory: true, victoryDividend: true, ...(extra.flags || {}) } });
const defeat = (api, extra = {}) =>
  api.fx({ maat: -20, approval: { military: -10 }, ...extra, flags: { deltaLost: true, ...(extra.flags || {}) } });

// ─────────────────────────────────────────────────────────────────────────
// The opening crisis: Year 9, the Hunger-Flood and the Western Fire.
// ─────────────────────────────────────────────────────────────────────────
const hungerFlood = {
  id: 'hunger_flood',
  type: 'crisis',
  title: 'The Hunger-Flood and the Western Fire',
  once: true,
  forcedOnly: true,
  major: true,
  brief: () => [
    'Three dispatches reached the Window of Appearances within the same week.',
    '**First:** scouts at the fortress of Zawiyet Umm el-Rakham report that **Meryey, chief of the Libu**, is moving east with his wives, his cattle and his warriors. With him are Sherden, Shekelesh and Lukka sea-raiders. This is not a raid. They are bringing their families, which means they intend to stay, and they are heading for the fields of the western Delta. They will reach the Canopic branch by Peret.',
    '**Second:** **Prince Khaemopet** has sent a sealed letter from Pi-Ramesses, and his officers made sure it was read aloud in the barracks. He says the chariotry *will not march on empty bellies*. He will lead them only if he is paid and named **"Generalissimo and Eldest King’s Son,"** a title no heir has held without also being made co-regent.',
    '**Third:** **Hori-Ankh, Vizier of the South**, reports that the Hare Nome under **Nakhtmin**, Khaemopet’s grandfather, declared its harvest destroyed. His scribes counted about **140,000 khar** held back in Hermopolis’s granaries. Hori-Ankh’s own scribes have taken about 6% of every transfer this year, and he expects you not to look too closely at that.',
    '**Meanwhile, at Karnak:** High Priest **Amenemopet-Ankh** has offered to open Amun’s granaries "for the love the god bears his son." His price is engraved on a stela draft already waiting for your seal.',
    'If Meryey settles the Delta, it will be the first loss of Egyptian soil in three generations. If the army mutinies first, the throne will not go to Ramose.',
  ],
  options: [
    {
      id: 'karnak',
      title: 'Bend the Knee to Amun (The Karnak Bargain)',
      cost: 'Seal the stela: Amun’s estates become tax-exempt in perpetuity (−9% royal tax intake forever), and the High Priesthood becomes hereditary. You receive a 450,000 khar loan, of which 200,000 clears the army’s arrears.',
      fallout: 'Priesthood +18%. Military +12% once fed, but Khaemopet knows the priests fed his men, not you. Bureaucracy −15%: the Nomarchs were refused remission while the temples got exemption.',
      risk: 'Ramose’s Legitimacy +10, since his mother’s family runs the temple that now has its own wealth. Your heirs will owe Karnak, and in later reigns the High Priesthood could crown kings.',
      apply(s, api) {
        api.fx({
          grain: 250000,
          temple: -450000,
          intake: 0.91,
          approval: { priesthood: 18, military: 12, bureaucracy: -15 },
          arrears: { army: -2 },
          sons: { ramose: { legitimacy: 10 } },
          wives: { tiy: 10, henuttawy: -5 },
          flags: { amunExempt: true, amunDebt: true },
        });
        api.log('The stela is sealed. Amun’s granaries open, and the chariotry eats.');
        if (api.battle({ base: 0.65, stations: ['capital', 'west'] })) {
          victory(api, { sons: { khaemopet: { legitimacy: 10 } } });
          api.log('At the Canopic branch Khaemopet breaks Meryey’s host. The Libu chief flees west and leaves his bow and sandals behind. The army cheers its general first, and you second.');
        } else {
          defeat(api);
          api.log('Fed but badly led, the army is broken in the western marshes. The Libu settle the western Delta, and Karnak’s priests ask what the god’s grain was for.');
        }
      },
    },
    {
      id: 'audit',
      title: 'The Audit of Hermopolis (Strike the Hare Nome)',
      cost: 'Send Vizier Hori-Ankh with the Medjay and 300 scribes to seize Nakhtmin’s hidden 140,000 khar. That is less than a month of burn, and the Medjay will be in Middle Egypt instead of at the front. You must also let Hori-Ankh’s own skimming go unpunished.',
      fallout: 'Bureaucracy −20%: every governor sees the king’s scribes can open any granary. Ma’at +6 for visible justice. Military −10%: Khaemopet takes his grandfather’s humiliation personally. Priesthood +5%.',
      risk: 'Henuttawy turns against you. A secondary wife with a disgraced father and a passed-over son is how harem conspiracies begin. The army marches hungry and short-handed.',
      apply(s, api) {
        api.fx({
          grain: 40000,
          arrears: { army: -1 },
          approval: { bureaucracy: -20, military: -10, priesthood: 5 },
          maat: 6,
          wives: { henuttawy: -15 },
          sons: { khaemopet: { loyalty: -20 } },
          vizier: { ambition: 5 },
          flags: { nakhtminDisgraced: true },
        });
        const hare = s.nomes.find((n) => n.id === 'hare');
        hare.nomarch = 'Thutnakht';
        hare.loyalty = 40;
        hare.kinOf = null;
        api.log('Nakhtmin is stripped of his office in front of his own granary doors. His grain goes north on royal barges.');
        if (api.battle({ base: 0.4, stations: ['capital', 'west'] })) {
          victory(api, { sons: { khaemopet: { legitimacy: 5 } } });
          api.log('Half-fed, the army wins anyway. Khaemopet crushes the Libu at the Canopic branch and sends you Meryey’s captured war-standard without a word of greeting.');
        } else {
          defeat(api);
          api.log('Without the Medjay and on half bellies, the army breaks. The Libu settle the western Delta. In the barracks they say the king fought his own governors instead of the enemy.');
        }
      },
    },
    {
      id: 'golden_spear',
      title: 'The Golden Spear (Pharaoh Takes the Field)',
      cost: 'Spend 2,800 deben of gold paying the Sherden, Nubian and Libyan-born mercenaries. Native conscripts go on half rations for a year. You strip Khaemopet of command and lead the army yourself. No gold is left for the Hittite king’s grain request.',
      fallout: 'Military: high variance. Mercenaries are loyal while the gold lasts; the native chariotry resents half rations and Khaemopet’s removal. Priesthood and Nomarchs wait to see whether the gods give you victory.',
      risk: 'You are away from the palace for a season, leaving the harem and the Vizier alone with an 11-year-old heir. Your infected jaw and the campaign may kill you. Hatti’s goodwill cools.',
      apply(s, api) {
        s.pharaoh.away = true;
        api.fx({
          gold: -2800,
          armyRation: 0.5,
          arrears: { army: -1 },
          approval: { military: -5 },
          sons: { khaemopet: { loyalty: -15, legitimacy: -5 } },
          wives: { henuttawy: -10 },
          flags: { rationCutUntil: s.turn + 3, hittiteCold: true },
          omen: { id: 'hatti_hunger', text: 'Messengers from Hattusa arrive gaunt. The Great King’s letters speak of empty storehouses, and of Egypt’s silence.', eventId: 'hittite_plea', delay: 3 },
        });
        api.log('Pharaoh mounts his chariot at Memphis with the gold-paid guard around him.');
        if (api.chance(0.3)) {
          api.fx({ health: -15 });
          api.log('The march is hard. Your jaw swells with fever and the physicians bleed you in your tent.');
        }
        if (api.battle({ base: 0.65, stations: ['capital', 'west'] })) {
          victory(api, { maat: 20, approval: { military: 15 }, sons: { ramose: { legitimacy: 5 } } });
          api.log('**Victory.** You drive your chariot through Meryey’s line yourself. Six thousand Libu fall and their families are taken as captives. Poets at Thebes are already writing the hymn.');
        } else {
          defeat(api, { health: -10 });
          api.log('**Defeat.** The Horus himself is seen fleeing the field. The Libu settle the western Delta, and every faction now wonders whether the gods have left you.');
        }
      },
    },
    {
      id: 'compact',
      title: 'Raise the Eldest Son (The Khaemopet Compact)',
      cost: 'Grant Khaemopet the title "Generalissimo and Eldest King’s Son," making him co-regent in all but name. Nakhtmin "discovers" his 140,000 khar for his grandson’s army, and the Hare Nome is unofficially granted heredity.',
      fallout: 'Military +25% and Bureaucracy +15%: a Nomarch’s grandson now stands beside the throne. Priesthood −25%: Tiy-Merenmut’s family sees a child of Amun’s house being disinherited.',
      risk: 'Crown Prince Ramose’s Legitimacy −20. If Khaemopet beats Meryey, nobody can remove him, possibly not even you. The Great Royal Wife becomes the centre of a harem faction allied with the priests.',
      apply(s, api) {
        const k = son(s, 'khaemopet');
        k.role = 'Generalissimo and Eldest King’s Son';
        const hare = s.nomes.find((n) => n.id === 'hare');
        hare.hereditary = true;
        hare.loyalty = 75;
        api.fx({
          sons: { khaemopet: { legitimacy: 25, loyalty: 20 }, ramose: { legitimacy: -20 } },
          approval: { military: 25, bureaucracy: 15, priesthood: -25 },
          wives: { tiy: -35, henuttawy: 35 },
          arrears: { army: -2 },
          flags: { coRegent: 'khaemopet', nomeSupplyUntil: s.turn + 3 },
        });
        api.log('The title is proclaimed in the barracks at Pi-Ramesses. The Hare Nome’s barges arrive the same week, as if they had been waiting.');
        if (api.battle({ base: 0.7, stations: ['capital', 'west'] })) {
          victory(api, { sons: { khaemopet: { legitimacy: 10 } } });
          api.log('Khaemopet wins a crushing victory at the Canopic branch. The army now calls him “the Bull of the West.” At Karnak, the priests say nothing at all.');
        } else {
          defeat(api, { sons: { khaemopet: { legitimacy: -15 } } });
          api.log('Even fed and flattered, the army breaks. The Libu settle the western Delta, and your new co-regent blames the gods, the priests, and you.');
        }
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const famineYear = {
  id: 'famine_year',
  type: 'crisis',
  title: 'Isfet in the Granaries',
  forcedOnly: true,
  major: true,
  brief: (s) => [
    `The Nilometer at Elephantine stopped at **${cubitsLabel(s.flood.height)} cubits**. The harvest will be half of what Egypt needs. In the villages, families are already eating the seed grain.`,
    `The royal granaries hold **${fmt(s.grain.royal)} khar**, about **${reserveMonths(s).toFixed(1)} months** of rations. Amun’s granaries at Karnak hold **${fmt(s.grain.temple)} khar**, and they are not yours.`,
    `The Priesthood demands emergency distribution, *for a king who lets his people starve has lost Ma’at*. The generals warn that every basket given to a peasant is a basket taken from a soldier. The Nomarchs want the tax quota cut, and they will under-report the harvest whether you agree or not.`,
  ],
  options: [
    {
      id: 'distribute',
      title: 'Open the Royal Granaries to the People',
      cost: '150,000 khar of royal grain handed out at the temple gates and nome capitals.',
      fallout: 'Ma’at +8 and the people see Pharaoh feeding them. Priesthood +5%, Bureaucracy +5%. Military −8%: they see their own rations shrinking.',
      risk: 'Reserves fall toward empty. If the army goes unpaid next season, the generals will remember who ate their bread.',
      apply(s, api) {
        api.fx({ grain: -150000, maat: 8, approval: { priesthood: 5, bureaucracy: 5, military: -8 } });
        api.log('Royal scribes ladle grain into the baskets of the hungry under Pharaoh’s cartouche. The people bless the living Horus.');
      },
    },
    {
      id: 'karnak_relief',
      title: 'Petition Karnak to Feed the People',
      available: (s) => s.blocs.priesthood.approval >= 40,
      cost: 'Amun distributes 300,000 khar from his own granaries, in his own name. In return the temple asks for more estates: −3% royal tax intake forever.',
      fallout: 'Priesthood +8%. Ma’at +4, but the people thank Amun, not you. Tiy-Merenmut +5%.',
      risk: 'Egypt learns that the god feeds them when the king cannot. The High Priest’s authority grows at the expense of your own.',
      apply(s, api) {
        api.fx({ temple: -300000, intake: 0.97, maat: 4, approval: { priesthood: 8 }, wives: { tiy: 5 }, flags: { amunFedEgypt: true } });
        api.log('Amun’s barque is carried through Thebes, and grain follows it. The crowds chant the god’s name. Yours is not mentioned.');
      },
    },
    {
      id: 'army_first',
      title: 'Hold the Grain for the Army',
      cost: 'Nothing leaves the granaries. The people are left to the mercy of the Nomarchs.',
      fallout: 'Military +10%. Ma’at −8: a king who hoards while children starve. Bureaucracy −10%: the nomes must feed their own.',
      risk: 'Hunger turns into anger. Bread riots in Thebes are likely within a season.',
      apply(s, api) {
        api.fx({
          maat: -8,
          approval: { military: 10, bureaucracy: -10 },
          omen: { id: 'riot_brewing', text: 'Mobs gather each evening at the granary walls of Thebes.', eventId: 'grain_riot', delay: 1 },
        });
        api.log('The granary doors stay shut and sealed with Pharaoh’s seal. Soldiers stand guard over them while the city goes hungry.');
      },
    },
    {
      id: 'hoard',
      title: 'Open the Hoarded Granaries',
      unlocked: true,
      available: (s) => s.grain.sealed >= 100000,
      cost: (s) => `Break the seals on the reserve you stored in the fat years: ${fmt(Math.min(s.grain.sealed, 400000))} khar, half to the people and half to the royal stores.`,
      fallout: 'Ma’at +12: your foresight is proven in public. Bureaucracy +8%, Priesthood +5%, and no faction pays for it.',
      risk: 'The reserve is gone. The next lean year will find you without it.',
      apply(s, api) {
        const amt = Math.min(s.grain.sealed, 400000);
        api.fx({ sealed: -amt, grain: Math.round(amt / 2), maat: 12, approval: { bureaucracy: 8, priesthood: 5 } });
        api.log('The sealed granaries are opened. The scribes record that Pharaoh foresaw the hunger, and the people believe that he did.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const tombStrike = {
  id: 'tomb_strike',
  type: 'crisis',
  title: 'The Tomb-Builders Down Tools',
  major: true,
  when: (s) => s.arrears.workforce >= 1,
  weight: 15,
  brief: (s) => [
    `The crew of the Place of Truth, the stonecutters and painters of your tomb, have walked out of the Valley. They are sitting behind the mortuary temples shouting **"We are hungry!"** They are owed **${s.arrears.workforce} months** of rations.`,
    `Your tomb is **${tombProgress(s)}% complete**. If you die before it is finished, your heir begins his reign weakened. The scribe of the tomb is begging the Vizier for grain. The Vizier is looking at you.`,
  ],
  options: [
    {
      id: 'pay',
      title: 'Pay the Workers from the Royal Granaries',
      cost: (s) => `${fmt(workforceDebt(s))} khar to clear the workforce’s arrears.`,
      fallout: 'Ma’at +4: the king keeps his word to his craftsmen. Military −5%: the soldiers see the stonecutters paid first.',
      risk: 'The granaries drain further. The army learns that striking works.',
      apply(s, api) {
        const cost = Math.min(s.grain.royal, workforceDebt(s));
        api.fx({ grain: -cost, arrears: { workforce: -s.arrears.workforce }, maat: 4, approval: { military: -5 } });
        api.log('Grain goes up to the Valley on donkeys. The crew picks up its chisels.');
      },
    },
    {
      id: 'medjay',
      title: 'Break the Strike with the Medjay',
      cost: 'The debt is written off by force. The crew returns to work under guard, and resentful.',
      fallout: 'Ma’at −8: the king beat his own craftsmen. Military +3%, Bureaucracy +3%.',
      risk: 'Work on the tomb stops for two seasons while the injured recover and the crew drags its feet. An unfinished tomb weakens your heir.',
      apply(s, api) {
        api.fx({
          arrears: { workforce: -s.arrears.workforce },
          maat: -8,
          approval: { military: 3, bureaucracy: 3 },
          flags: { tombStalledUntil: s.turn + 3 },
        });
        api.log('The Medjay drive the strikers back into the Valley with staves. The scribe of the tomb notes the injuries in his journal.');
      },
    },
    {
      id: 'karnak',
      title: 'Let Karnak Feed the Workers',
      available: (s) => s.blocs.priesthood.approval >= 45,
      cost: (s) => `Amun’s granaries pay ${fmt(workforceDebt(s))} khar. Amun’s scribes take a permanent seat in the Valley.`,
      fallout: 'Priesthood +5%, Tiy-Merenmut +5%. Ma’at −3: the god pays the king’s men.',
      risk: 'The priests of Amun now oversee the building of Pharaoh’s eternity. They will remember that they paid for it.',
      apply(s, api) {
        api.fx({ temple: -workforceDebt(s), arrears: { workforce: -s.arrears.workforce }, maat: -3, approval: { priesthood: 5 }, wives: { tiy: 5 }, flags: { templeTomb: true } });
        api.log('Grain arrives from Karnak stamped with Amun’s seal, not yours.');
      },
    },
    {
      id: 'hoard',
      title: 'Open the Hoarded Granaries',
      unlocked: true,
      available: (s) => s.grain.sealed >= workforceDebt(s),
      cost: (s) => `${fmt(workforceDebt(s))} khar from the sealed reserve.`,
      fallout: 'Ma’at +6. No faction pays for it.',
      risk: 'The reserve shrinks before the next lean year.',
      apply(s, api) {
        api.fx({ sealed: -workforceDebt(s), arrears: { workforce: -s.arrears.workforce }, maat: 6 });
        api.log('Your stored grain feeds the Valley. The craftsmen sing Pharaoh’s name over their chisels.');
      },
    },
  ],
};

function tombProgress(s) {
  const t = s.monuments.find((m) => m.ongoing);
  return t ? Math.round(t.progress) : 0;
}
const workforceDebt = (s) => Math.round(s.arrears.workforce * s.burn.workforce);

// ─────────────────────────────────────────────────────────────────────────
const hittitePlea = {
  id: 'hittite_plea',
  type: 'crisis',
  title: 'Grain for Hatti',
  when: (s) => s.turn > 3,
  weight: 6,
  brief: (s) => [
    'A clay tablet arrives from Hattusa, sealed with the Great King’s seal. *"My brother, the land of Hatti is hungry. Send grain on ships to Ugarit, so that my people may live. Are we not brothers?"*',
    `Your Hittite wife **Ašmunikal** has asked to speak with you, and she is crying. The peace treaty between your houses is only as strong as the bread it carries. The royal granaries hold **${fmt(s.grain.royal)} khar**. The Nomarchs are already saying that Egyptian grain belongs in Egyptian bellies.`,
  ],
  options: [
    {
      id: 'ship',
      title: 'Ship 150,000 Khar to Ugarit',
      available: (s) => s.grain.royal >= 150000,
      cost: '150,000 khar of royal grain, gone north on Egyptian ships.',
      fallout: 'Ašmunikal +20%. Ma’at +4: the Horus feeds the world. Bureaucracy −5% and Military −3%: Egyptian bread for foreigners.',
      risk: 'An eternal brotherhood with Hatti. A son of Ašmunikal’s would gain prestige as a bridge between the two empires, and so become a rival.',
      apply(s, api) {
        const fx = { grain: -150000, wives: { asmunikal: 20 }, maat: 4, approval: { bureaucracy: -5, military: -3 }, flags: { hittiteFriend: true, hittiteCold: false } };
        const hs = sonsOf(s, 'asmunikal');
        if (hs.length) fx.sons = { [hs[0].id]: { legitimacy: 10 } };
        api.fx(fx);
        api.log('The grain fleet sails for Ugarit. The Great King’s next letter calls you "my beloved brother, the Sun."');
      },
    },
    {
      id: 'gold',
      title: 'Send Gold Instead of Grain',
      available: (s) => s.gold >= 800,
      cost: '800 deben of gold. Hatti can buy its own grain elsewhere, if there is any.',
      fallout: 'Ašmunikal +5%. Nobody at home objects.',
      risk: 'Hatti takes the gold and remembers that Egypt kept its bread. The treaty cools.',
      apply(s, api) {
        api.fx({ gold: -800, wives: { asmunikal: 5 }, flags: { hittiteLukewarm: true } });
        api.log('Gold goes north. The Great King’s reply is polite, and short.');
      },
    },
    {
      id: 'refuse',
      title: 'Refuse: Egypt’s Grain Is for Egypt',
      cost: 'Nothing, for now.',
      fallout: 'Bureaucracy +5%, Military +3%. Ašmunikal −20%: she is humiliated in front of the harem.',
      risk: 'The treaty strains. A humiliated foreign wife becomes dangerous, and her son loses Legitimacy.',
      apply(s, api) {
        const fx = { wives: { asmunikal: -20 }, approval: { bureaucracy: 5, military: 3 }, flags: { hittiteCold: true } };
        const hs = sonsOf(s, 'asmunikal');
        if (hs.length) fx.sons = { [hs[0].id]: { legitimacy: -10 } };
        api.fx(fx);
        api.log('The Hittite envoy leaves Pi-Ramesses without a farewell banquet.');
      },
    },
    {
      id: 'horses',
      title: 'Grain for Horses and Copper',
      available: (s) => s.grain.royal >= 150000,
      cost: '150,000 khar of grain, traded for Hittite chariot horses and Alashiya copper.',
      fallout: 'Military +10%: new horses for the chariotry. Ašmunikal +5%. Hatti pays, but resents bargaining while its people starve.',
      risk: 'Your armies grow stronger. The brotherhood becomes a trade deal.',
      apply(s, api) {
        api.fx({ grain: -150000, approval: { military: 10 }, wives: { asmunikal: 5 }, flags: { hittiteHorses: true } });
        api.log('Hittite horses arrive at Pi-Ramesses. The chariotry is delighted. The Great King’s letter is cold.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const vizierLedger = {
  id: 'vizier_ledger',
  type: 'crisis',
  title: 'The Vizier’s Ledger',
  when: (s) => s.vizier.integrity < 60,
  weight: 6,
  brief: (s) => [
    `A junior Treasury scribe named **Penbuy** has asked to see you alone. He lays out tally-boards showing that **${s.vizier.name}** has been taking grain from every transfer between the nomes and the royal granaries: perhaps **${fmt(s.baselineIntake * 0.05)} khar** a year.`,
    `${s.vizier.name} runs the scribes, the courts and the tax collectors. He is competent (${s.vizier.competence}) and ambitious (${s.vizier.ambition}). If he falls, his network falls with him, and those people will look for a new patron.`,
  ],
  options: [
    {
      id: 'dismiss',
      title: 'Dismiss Him and Raise the Honest Scribe',
      cost: 'You lose an experienced administrator. Penbuy is honest but untested (Competence 48).',
      fallout: 'Ma’at +6 for visible justice. About 60,000 khar is recovered. Bureaucracy −10%: the Vizier’s clients are purged.',
      risk: 'A disgraced Vizier with a network looks for a new patron. If a wife in the harem is already unhappy, he will find her.',
      apply(s, api) {
        const old = s.vizier.name;
        const fx = { grain: 60000, maat: 6, approval: { bureaucracy: -10 } };
        const w = [...s.wives].filter((x) => x.status === 'court').sort((a, b) => a.satisfaction - b.satisfaction)[0];
        if (w && w.satisfaction < 40) fx.wives = { [w.id]: { plot: 25 } };
        api.fx(fx);
        s.vizier = { id: 'penbuy', kind: 'scribe', seed: 777, name: 'Penbuy', title: 'Vizier of the South', age: 31, competence: 48, integrity: 85, ambition: 30, loyalty: 80, origin: 'scribe' };
        api.log(`${old} hands over his seal of office. Penbuy takes it with shaking hands.`);
      },
    },
    {
      id: 'leash',
      title: 'Keep Him on a Leash',
      cost: 'You keep the evidence in a sealed jar. The skimming slows, but does not stop.',
      fallout: 'Bureaucracy +5%: the system keeps running. Ma’at −3: justice was seen to be bought.',
      risk: 'A Vizier being blackmailed is a Vizier waiting for his moment.',
      apply(s, api) {
        api.fx({ approval: { bureaucracy: 5 }, maat: -3, vizier: { ambition: -15, integrity: 10 }, flags: { vizierResent: true } });
        api.log(`${s.vizier.name} reads the tallies, bows very low, and leaves without a word.`);
      },
    },
    {
      id: 'split',
      title: 'Give the Treasury to Karnak’s Scribes',
      cost: 'Amun’s scribes take over the counting of royal grain. You lose direct control of your own treasury.',
      fallout: 'Priesthood +12%. Bureaucracy −8%. Leakage falls, because priests do not want Pharaoh robbed by anyone but themselves.',
      risk: 'The Priesthood now knows exactly how much grain you have, and exactly how much you lack.',
      apply(s, api) {
        api.fx({ approval: { priesthood: 12, bureaucracy: -8 }, vizier: { competence: -10, integrity: 15 }, flags: { templeTreasury: true } });
        api.log('Priests in white linen take seats in the Treasury. The Vizier’s men pack their palettes.');
      },
    },
    {
      id: 'execute',
      title: 'Execute Him for Theft from the God-King',
      cost: 'The Vizier is impaled at the gate of the Treasury. His estates are confiscated.',
      fallout: 'Ma’at +10. About 90,000 khar is recovered. Bureaucracy −18%: every official now fears the audit.',
      risk: 'Every Nomarch and scribe wonders if he is next. Expect them to organize.',
      apply(s, api) {
        api.fx({
          grain: 90000,
          maat: 10,
          approval: { bureaucracy: -18 },
          omen: { id: 'nomarch_feasts', text: 'The Nomarchs of Middle Egypt have been feasting together at Hermopolis. No royal scribe was invited.', eventId: 'nomarch_league', delay: 2 },
        });
        const old = s.vizier.name;
        s.vizier = { id: 'penbuy', kind: 'scribe', seed: 777, name: 'Penbuy', title: 'Vizier of the South', age: 31, competence: 48, integrity: 85, ambition: 30, loyalty: 80, origin: 'scribe' };
        api.log(`${old} is executed at the Treasury gate. Penbuy is made Vizier the same afternoon.`);
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const nubianRevolt = {
  id: 'nubian_revolt',
  type: 'crisis',
  title: 'Irem Rises in Kush',
  when: (s) => !s.flags.nubianGoldLost && s.turn > 2,
  weight: 6,
  brief: (s) => [
    'The Viceroy of Kush writes from Buhen: the chiefs of **Irem** have risen and burned the gold-washing stations along the Second Cataract. The caravans have stopped.',
    `Nubian gold pays for Egypt’s foreign marriages, its treaties and its mercenaries. Treasury: **${fmt(s.gold)} deben**. Without the Kush tribute, ${fmt(1200)} deben stops arriving every year.`,
  ],
  options: [
    {
      id: 'viceroy',
      title: 'Send the Viceroy with the Medjay',
      cost: '60,000 khar to supply the expedition upriver.',
      fallout: 'If he wins: Ma’at +5, Military +5%, and captured gold. If he loses, the gold stations fall.',
      risk: 'A victorious Viceroy of Kush has his own army and his own gold.',
      apply(s, api) {
        api.fx({ grain: -60000 });
        if (api.battle({ base: 0.55, stations: ['south'] })) {
          api.fx({ maat: 5, approval: { military: 5 }, gold: 600 });
          api.log('The Viceroy burns the rebel villages of Irem and sends their chiefs north in chains, with 600 deben of captured gold.');
        } else {
          api.fx({ maat: -8, flags: { nubianGoldLost: true } });
          api.log('The expedition is ambushed in the cataracts. Irem holds the gold country.');
        }
      },
    },
    {
      id: 'prince',
      title: (s) => `Send Prince ${eldestAdultRival(s)?.name ?? 'Khaemopet'} to Crush Them`,
      available: (s) => Boolean(eldestAdultRival(s)),
      cost: '60,000 khar. Your eldest non-heir son leaves court at the head of an army.',
      fallout: 'If he wins: the prince’s Legitimacy +12, Military +8%, Ma’at +5. His mother is delighted.',
      risk: 'A prince with a Nubian army and the gold mines behind him. He is away from court and its plots, but he is also away from your control.',
      apply(s, api) {
        const r = eldestAdultRival(s);
        api.fx({ grain: -60000, wives: { [r.motherId]: 10 } });
        if (api.battle({ base: 0.65 })) {
          api.fx({ maat: 5, approval: { military: 8 }, sons: { [r.id]: { legitimacy: 12 } }, gold: 400 });
          api.log(`Prince ${r.name} breaks Irem in a single season. The Nubian archers now cheer his name.`);
        } else {
          api.fx({ sons: { [r.id]: { legitimacy: -10 } }, flags: { nubianGoldLost: true }, maat: -5 });
          api.log(`Prince ${r.name} retreats from the cataracts in disgrace. Kush is lost.`);
        }
      },
    },
    {
      id: 'marry',
      title: 'Negotiate: Marry the Chief’s Daughter',
      cost: 'The tribute is halved for good. A Kushite princess enters your harem.',
      fallout: 'Military −5%: they wanted a war. Ma’at −3: the Horus bargains with rebels.',
      risk: 'Another wife, another faction, perhaps another son with a claim.',
      apply(s, api) {
        api.fx({ approval: { military: -5 }, maat: -3, flags: { nubianHalf: true } });
        s.wives.push({ id: `kushite-${s.turn}`, kind: 'wife-kush', seed: 779 + s.turn, age: 19, name: 'Tabiry', title: 'Kushite Wife', origin: 'Daughter of the Chief of Irem', tie: 'kush', influence: 15, ambition: 50, satisfaction: 55, plot: 0, status: 'court' });
        api.log('Tabiry of Irem arrives at Thebes with ebony and ivory. Half the gold flows again.');
      },
    },
    {
      id: 'abandon',
      title: 'Let Kush Go',
      cost: 'The Nubian tribute stops entirely.',
      fallout: 'Military −8%, Ma’at −8: the borders of the Two Lands shrink.',
      risk: 'Without Nubian gold, foreign alliances must be bought some other way.',
      apply(s, api) {
        api.fx({ approval: { military: -8 }, maat: -8, flags: { nubianGoldLost: true } });
        api.log('The forts of the Second Cataract are abandoned. Scribes stop writing Kush in the lists of Pharaoh’s lands.');
      },
    },
  ],
};
function eldestAdultRival(s) {
  return livingSons(s)
    .filter((x) => x.id !== s.heirId && isAdult(x))
    .sort((a, b) => b.age - a.age)[0];
}

// ─────────────────────────────────────────────────────────────────────────
const nomarchLeague = {
  id: 'nomarch_league',
  type: 'crisis',
  title: (s, ctx) => (ctx.secession ? 'The Nomes Turn Their Backs' : 'The League of Hermopolis'),
  major: true,
  when: (s) => s.blocs.bureaucracy.approval < 45,
  weight: 7,
  brief: (s, ctx) => [
    ctx.secession
      ? '**The nomes are slipping away.** Nomarchs from Asyut to Coptos have stopped sending tax barges. Some have begun calling themselves "Great Chief" in their own inscriptions, as the Nomarchs did in the bad centuries.'
      : 'Eight Nomarchs of Middle Egypt have sent a joint petition, sealed together at Hermopolis. They ask for **hereditary right to their offices**, written in stone and confirmed by Pharaoh, and a cut in the tax quota.',
    `Bureaucracy approval: **${s.blocs.bureaucracy.approval}%**. The Nomarchs collect your grain and draft your labor. Without them the granaries stay empty. With them hereditary, the throne becomes a first among equals.`,
  ],
  options: [
    {
      id: 'grant',
      title: 'Grant Hereditary Rights',
      cost: 'The nomarchies become family property. Royal tax intake −5% forever as the families take a larger cut.',
      fallout: 'Bureaucracy +22%. Henuttawy +10%: her father’s house is secure.',
      risk: 'Egypt drifts toward a land of nomes. Your grandsons will rule governors who answer to their fathers, not to the king.',
      apply(s, api) {
        api.fx({ approval: { bureaucracy: 22 }, intake: 0.95, wives: { henuttawy: 10 }, flags: { nomarchHeredity: true } });
        for (const n of s.nomes) if (n.id !== 'waset' && n.id !== 'memphis') Object.assign(n, { hereditary: true, loyalty: Math.min(100, n.loyalty + 20) });
        api.log('The decree is carved at Hermopolis. Eight families will rule their nomes for as long as their bloodlines last.');
      },
    },
    {
      id: 'rotate',
      title: 'Refuse and Rotate the Governors',
      cost: 'The Vizier’s scribes replace the petitioning Nomarchs with men loyal to the Crown.',
      fallout: 'Bureaucracy −15%. Royal tax intake +5%. Ma’at +3: central order is restored.',
      risk: (s, ctx) => (ctx.secession ? 'The nomes are already defying you. Refusing them now may break the Two Lands apart.' : 'The Vizier’s power grows, and the deposed families plot.'),
      apply(s, api) {
        api.fx({ approval: { bureaucracy: -15 }, intake: 1.05, maat: 3, vizier: { ambition: 5 } });
        for (const n of s.nomes) Object.assign(n, { hereditary: false, loyalty: Math.max(0, n.loyalty - 10) });
        if (api.ctx.secession && s.blocs.bureaucracy.approval < 10 && s.maat < 40 && api.chance(0.35)) {
          api.log('The deposed Nomarchs refuse to go. Middle Egypt declares for its own chiefs, and the Delta follows. The Two Lands are two again, and then many.');
          api.end('fragmented', 'The nomes broke away from the Crown. Egypt has entered an Intermediate Period.');
          return;
        }
        api.log('Royal scribes arrive with the Medjay to take the seals of eight Nomarchs. Most hand them over.');
      },
    },
    {
      id: 'marry',
      title: 'Marry the Daughter of the Nomarch of Asyut',
      available: (s) => s.gold >= 200,
      cost: '200 deben in bridal gifts. A new wife joins the harem.',
      fallout: 'Bureaucracy +12%. Every wife already in the harem −5%.',
      risk: 'Another mother, and in time another son, with a governor’s army of laborers behind him.',
      apply(s, api) {
        const wives = {};
        for (const w of s.wives.filter((x) => x.status === 'court')) wives[w.id] = -5;
        api.fx({ gold: -200, approval: { bureaucracy: 12 }, wives });
        s.wives.push({ id: `asyut-${s.turn}`, kind: 'wife', seed: 780 + s.turn, age: 18, name: 'Neferure', title: 'Secondary Wife', origin: 'Daughter of the Nomarch of Asyut', tie: 'bureaucracy', influence: 30, ambition: 60, satisfaction: 60, plot: 0, status: 'court' });
        const asy = s.nomes.find((n) => n.id === 'asyut');
        asy.loyalty = Math.min(100, asy.loyalty + 20);
        api.log('Neferure of Asyut arrives with forty barges of grain as her dowry, and her father’s ambitions.');
      },
    },
    {
      id: 'remit',
      title: 'Grant a One-Year Tax Remission',
      cost: 'This year’s harvest tax is cut by a third.',
      fallout: 'Bureaucracy +15%, Ma’at +3. Priesthood −3%: the temples were not offered the same.',
      risk: 'The granaries will be thin after Shemu. The petition for heredity will come back.',
      apply(s, api) {
        api.fx({ approval: { bureaucracy: 15, priesthood: -3 }, maat: 3, flags: { taxRemissionYear: s.year } });
        for (const n of s.nomes) n.loyalty = Math.min(100, n.loyalty + 8);
        api.log('Pharaoh’s mercy is proclaimed in the nome capitals. The Nomarchs bow, and put their petition away for later.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const poisonedCup = {
  id: 'poisoned_cup',
  type: 'crisis',
  title: 'The Poisoned Cup',
  forcedOnly: true,
  major: true,
  brief: (s, ctx) => {
    const w = wife(s, ctx.wifeId);
    const sons = sonsOf(s, w.id);
    return [
      'At the evening meal your food taster clutches his belly, falls, and dies convulsing on the tiles before the second course is served.',
      `The palace guard follow the trail of the poisoned wine to the chambers of **${w.name}** (${w.title}). A cupbearer, two harem officials and a captain of the guard are named.${sons.length ? ` Her son **Prince ${sons[0].name}** knew, or did not.` : ''}`,
      'Every wife in the harem is watching to see what you do. So are the officials who were *not* named.',
    ];
  },
  options: [
    {
      id: 'tribunal',
      title: 'Convene a Public Tribunal',
      cost: (s, ctx) => `${wife(s, ctx.wifeId).name} and her co-conspirators are tried before twelve judges. She is condemned, and her sons are stained by her crime.`,
      fallout: (s, ctx) => `Ma’at +6: justice is seen. The power block tied to her family turns against you (${tieLabel(wife(s, ctx.wifeId).tie)}).`,
      risk: 'Her sons lose 30 Legitimacy and 30 Loyalty. A prince whose mother you executed does not forget.',
      apply(s, api) {
        const w = wife(s, api.ctx.wifeId);
        const fx = { maat: 6, approval: {} };
        if (w.tie === 'bureaucracy' || w.tie === 'priesthood') fx.approval[w.tie] = -12;
        if (w.tie === 'hatti') fx.flags = { hittiteCold: true };
        const sons = sonsOf(s, w.id);
        fx.sons = {};
        for (const x of sons) fx.sons[x.id] = { legitimacy: -30, loyalty: -30 };
        if (sons.some((x) => isAdult(x))) fx.approval.military = -5;
        api.fx(fx);
        w.status = 'condemned';
        w.plot = 0;
        api.log(`${w.name} is condemned. She is permitted to take her own life. The judges record her only as "the great criminal."`);
      },
    },
    {
      id: 'exile',
      title: 'Exile Her to the Harem-Palace at Mi-wer',
      cost: (s, ctx) => `${wife(s, ctx.wifeId).name} is sent to the weaving-palace in the Fayum, cut off from the court.`,
      fallout: 'The power block tied to her −5%. No public scandal, so Ma’at is unchanged.',
      risk: 'She lives, she remembers, and her sons can still visit her.',
      apply(s, api) {
        const w = wife(s, api.ctx.wifeId);
        const fx = { approval: {} };
        if (w.tie === 'bureaucracy' || w.tie === 'priesthood') fx.approval[w.tie] = -5;
        fx.sons = {};
        for (const x of sonsOf(s, w.id)) fx.sons[x.id] = { loyalty: -10 };
        api.fx(fx);
        w.influence = 5;
        w.satisfaction = 20;
        w.plot = 0;
        w.status = 'exiled';
        w.title = `${w.title} (exiled to Mi-wer)`;
        api.log(`${w.name} leaves Pi-Ramesses by boat at dawn, under guard.`);
      },
    },
    {
      id: 'elevate',
      title: 'Buy Her Silence: Raise Her Son',
      available: (s, ctx) => sonsOf(s, ctx.wifeId).length > 0,
      cost: (s, ctx) => `Prince ${sonsOf(s, ctx.wifeId)[0].name} is given new titles and estates. The conspirators are quietly strangled, but she is not touched.`,
      fallout: (s) => `Her satisfaction +40%. Crown Prince ${heirName(s)}’s Legitimacy −10, and his mother is furious.`,
      risk: 'The harem learns that poison works.',
      apply(s, api) {
        const w = wife(s, api.ctx.wifeId);
        const sn = sonsOf(s, w.id)[0];
        const h = heir(s);
        const fx = { wives: { [w.id]: 40 }, sons: { [sn.id]: { legitimacy: 15 } } };
        if (h && h.id !== sn.id) {
          fx.sons[h.id] = { legitimacy: -10 };
          if (h.motherId !== w.id) fx.wives[h.motherId] = -20;
        }
        api.fx(fx);
        w.plot = 0;
        api.log(`Prince ${sn.name} is named Overseer of Horses. His mother smiles at court again.`);
      },
    },
    {
      id: 'ignore',
      title: 'Feign Ignorance; Double the Tasters',
      cost: '200 deben for new tasters, guards and physicians. Nobody is punished.',
      fallout: 'No faction is offended.',
      risk: 'The plot is slowed, not stopped. The poison may reach you anyway.',
      apply(s, api) {
        const w = wife(s, api.ctx.wifeId);
        api.fx({ gold: -200 });
        w.plot = 40; // slowed, not stopped
        if (api.chance(0.3)) {
          api.fx({ health: -30 });
          api.log('Three nights later the poison is in your bread. You live, but you will never be strong again.');
        } else {
          api.log('The new tasters eat first at every meal. For now, nobody dies.');
        }
      },
    },
  ],
};
function tieLabel(tie) {
  return { bureaucracy: 'Bureaucracy −12%', priesthood: 'Priesthood −12%', hatti: 'Hatti cools', kush: 'Kush resents it', babylon: 'Babylon is insulted' }[tie] || 'her kin are insulted';
}

// ─────────────────────────────────────────────────────────────────────────
const oracleSpeaks = {
  id: 'oracle_speaks',
  type: 'crisis',
  title: 'The Oracle of Amun Speaks',
  forcedOnly: true,
  major: true,
  brief: (s) => [
    `During the Festival of the Valley, Amun’s sacred barque, carried on the shoulders of forty priests, **stops** in front of the royal pavilion. Then it **lurches backward**. The crowd falls silent.`,
    `High Priest **${s.highPriest.name}** declares that the god is *displeased*. He does not say with whom. Priesthood approval: **${s.blocs.priesthood.approval}%**. Ma’at: **${s.maat}**. If the oracle names a rival claimant, Thebes will rise in the god’s name.`,
  ],
  options: [
    {
      id: 'endow',
      title: 'Appease the God with Great Endowments',
      available: (s) => s.gold >= 1000,
      cost: '1,000 deben of gold and new estates for Karnak (−5% royal tax intake forever).',
      fallout: 'Priesthood +25%. Ma’at +8 when the barque moves forward again.',
      risk: 'Amun has learned that a stopped barque is worth a fortune.',
      apply(s, api) {
        api.fx({ gold: -1000, intake: 0.95, approval: { priesthood: 25 }, maat: 8 });
        api.log('Gold and land deeds are presented at Karnak. At the next procession, the barque glides forward.');
      },
    },
    {
      id: 'north',
      title: 'Raise Ptah of Memphis and Ra of Heliopolis',
      cost: 'You pour royal favor into the northern temples to weaken Thebes.',
      fallout: 'Priesthood −10%. Ma’at −5. Bureaucracy +5%: the northern nomes are pleased.',
      risk: 'From now on Amun alone cannot define Ma’at, but his priests will hate you for it.',
      apply(s, api) {
        api.fx({ approval: { priesthood: -10, bureaucracy: 5 }, maat: -5, flags: { northernCults: true } });
        api.log('A new chapel of Ptah rises at Memphis. Heliopolis receives obelisks. Karnak watches.');
      },
    },
    {
      id: 'arrest',
      title: 'Arrest the High Priest',
      cost: 'The Medjay and the chariotry seize Karnak’s gates.',
      fallout: (s) => (approval(s, 'military') >= 50 ? 'The army is with you. Karnak will submit under a new High Priest, but Ma’at −10.' : 'The army is not firmly with you. This may start a religious civil war.'),
      risk: 'Laying hands on Amun’s servant is the most dangerous thing a Pharaoh can do.',
      apply(s, api) {
        if (approval(s, 'military') >= 50) {
          api.fx({ approval: { priesthood: 35 - s.blocs.priesthood.approval, military: 5 }, maat: -10 });
          const old = s.highPriest.name;
          s.highPriest = { id: 'bakenamun', kind: 'priest', seed: 778, name: 'Bakenamun', title: 'High Priest of Amun', age: 50, competence: 60, integrity: 55, ambition: 40, loyalty: 75, origin: 'priest' };
          api.log(`${old} is dragged from the sanctuary. Bakenamun, a man of your choosing, is installed in his place.`);
        } else if (api.chance(0.5)) {
          api.log('The temple guard and the Theban mob drive off the Medjay. Thebes proclaims that Amun has rejected you.');
          api.end('civil_war', 'Thebes rose in Amun’s name. The south declares for the god and the priests, and the dynasty is torn in two.');
        } else {
          api.fx({ maat: -20, approval: { priesthood: -20 } });
          api.log('The arrest fails. The High Priest escapes to the sanctuary, and the whole of Thebes heard what you tried to do.');
        }
      },
    },
    {
      id: 'submit',
      title: 'Let the God Confirm the Heir of His Choice',
      cost: 'You let Amun’s oracle name the Crown Prince.',
      fallout: 'Priesthood +20%, Ma’at +5. The god chooses the son of his own house.',
      risk: 'The Priesthood has now crowned your heir. Every rival son loses Loyalty.',
      apply(s, api) {
        const tiySons = sonsOf(s, 'tiy');
        const choice = tiySons[0] || heir(s);
        const fx = { approval: { priesthood: 20 }, maat: 5, sons: {} };
        if (choice) fx.sons[choice.id] = { legitimacy: 15 };
        for (const x of livingSons(s)) if (!choice || x.id !== choice.id) fx.sons[x.id] = { loyalty: -20 };
        if (choice && choice.id !== s.heirId) fx.heir = choice.id;
        api.fx(fx);
        api.log(choice ? `The barque bows toward Prince ${choice.name}. Amun has chosen.` : 'The barque bows, and moves on.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
function coupLeader(s, ctx = {}) {
  if (ctx.leaderId) {
    const c = commander(s, ctx.leaderId);
    if (c?.isSon) return { son: s.sons.find((x) => x.id === c.id), name: `Prince ${c.name}` };
    if (c) return { son: null, general: s.army.generals.find((g) => g.id === c.id), name: `General ${c.name}` };
  }
  const r = rivalClaimant(s);
  if (r && isAdult(r) && r.loyalty < 60) return { son: r, name: `Prince ${r.name}` };
  const g = [...s.army.generals].sort((a, b) => a.loyalty - b.loyalty)[0];
  return { son: null, general: g, name: g ? `General ${g.name}` : 'A general of the chariotry' };
}

const marchOnPalace = {
  id: 'march_on_palace',
  type: 'crisis',
  title: 'The March on the Palace',
  forcedOnly: true,
  major: true,
  brief: (s, ctx) => {
    const L = coupLeader(s, ctx);
    return [
      `Chariots on the Memphis road. **${L.name}** is marching on Pi-Ramesses with two divisions, the divisions of Ptah and Seth, which are owed **${s.arrears.army} months** of rations.`,
      `They have not yet crossed the palace canal. Their envoy says the army only wants *"what is owed, and a king who pays it."* The Sherden guard is loyal for as long as your gold holds out: **${fmt(s.gold)} deben**. Military approval: **${s.blocs.military.approval}%**.`,
    ];
  },
  options: [
    {
      id: 'pay',
      title: 'Pay Everything Owed, Today',
      cost: (s) => `${fmt(Math.round(s.arrears.army * s.burn.army * 1.2))} khar (arrears plus a bonus), with gold making up any shortfall.`,
      fallout: 'Military +20%. Ma’at −5: a king who buys off his own soldiers.',
      risk: 'The army has learned that marching on the palace gets results.',
      apply(s, api) {
        const need = Math.round(s.arrears.army * s.burn.army * 1.2);
        const fromGrain = Math.min(s.grain.royal, need);
        const shortfall = need - fromGrain;
        const L = coupLeader(s, api.ctx);
        if (L.general) L.general.loyalty = Math.min(100, L.general.loyalty + 25);
        api.fx({ grain: -fromGrain, gold: shortfall ? -Math.min(s.gold, 1000) : 0, arrears: { army: -s.arrears.army }, approval: { military: 20 }, maat: -5, sons: L.son ? { [L.son.id]: { loyalty: 25 } } : {} });
        api.log('Grain carts and gold rings meet the army on the Memphis road. The divisions turn around, cheering a king they nearly overthrew.');
      },
    },
    {
      id: 'concede',
      title: (s, ctx) => (coupLeader(s, ctx).son ? `Name ${coupLeader(s, ctx).name} Crown Prince` : `Name ${coupLeader(s, ctx).name} Deputy of the Two Lands`),
      cost: (s, ctx) => (coupLeader(s, ctx).son ? `Prince ${coupLeader(s, ctx).son.name} replaces ${heirName(s)} as heir.` : `${coupLeader(s, ctx).name} becomes regent-in-waiting, as Horemheb once did.`),
      fallout: 'Military +30%. Priesthood −15%. The displaced heir’s mother will never forgive you.',
      risk: 'The throne passes to whoever had the army. Everyone at court has seen it happen.',
      apply(s, api) {
        const L = coupLeader(s, api.ctx);
        const h = heir(s);
        if (L.son) {
          const fx = { approval: { military: 30, priesthood: -15 }, arrears: { army: -1 }, sons: { [L.son.id]: { legitimacy: 30, loyalty: 30 } }, heir: L.son.id };
          if (h && h.motherId !== L.son.motherId) fx.wives = { [h.motherId]: -40 };
          api.fx(fx);
          api.log(`${L.name} rides into Pi-Ramesses as Crown Prince. ${h ? h.name : 'The former heir'} is moved to the women’s quarters.`);
        } else {
          const fx = { approval: { military: 30, priesthood: -15 }, arrears: { army: -1 }, maat: -5, flags: { generalRegent: true } };
          if (h) fx.sons = { [h.id]: { legitimacy: -15 } };
          if (L.general) L.general.loyalty = Math.min(100, L.general.loyalty + 30);
          api.fx(fx);
          api.log(`${L.name} kneels before you as Deputy of the Two Lands. Everyone knows which of you holds the army.`);
        }
      },
    },
    {
      id: 'fight',
      title: 'Fight: the Sherden Guard and the Medjay',
      available: (s) => s.gold >= 500,
      cost: '500 deben to pay the guard for one night of loyalty.',
      fallout: 'If you win: the leader is broken, Military −10% from the purges, Ma’at −5. If you lose, you lose the throne.',
      risk: 'Everything. This is the throne itself.',
      apply(s, api) {
        const L = coupLeader(s, api.ctx);
        api.fx({ gold: -500 });
        const p = 0.45 + (s.gold >= 2000 ? 0.1 : 0) + (s.flags.sherdenSettled ? 0.1 : 0);
        if (api.chance(p)) {
          const fx = { approval: { military: -10 }, maat: -5 };
          if (L.son) {
            fx.sons = { [L.son.id]: { legitimacy: -40, loyalty: -40 } };
            L.son.role = 'Exiled to the Kharga Oasis';
          }
          const leaderId = L.son ? L.son.id : L.general?.id;
          for (const u of units(s)) if (u.commanderId === leaderId) u.commanderId = null;
          if (L.general) s.army.generals = s.army.generals.filter((g) => g !== L.general);
          api.fx(fx);
          api.log(`The Sherden hold the canal bridge until dawn. ${L.name}’s divisions break and scatter. The ringleaders are impaled along the Memphis road.`);
        } else {
          api.log(`The guard breaks. ${L.name} enters the palace at sunrise.`);
          api.end('usurped', `${L.name} seized the throne. Your bloodline’s claim died at the palace canal.`);
        }
      },
    },
    {
      id: 'flee',
      title: 'Flee to Thebes under Amun’s Protection',
      available: (s) => s.blocs.priesthood.approval >= 50,
      cost: 'You abandon the northern capital. Its taxes go to whoever holds Pi-Ramesses (−40% royal intake).',
      fallout: 'Priesthood +10%: they now hold Pharaoh himself. Military −20%, Bureaucracy −10%, Ma’at −20.',
      risk: 'You rule from a temple city at the High Priest’s pleasure. The north may crown someone else.',
      apply(s, api) {
        api.fx({ intake: 0.6, approval: { priesthood: 10, military: -20, bureaucracy: -10 }, maat: -20, arrears: { army: -s.arrears.army }, flags: { dividedKingdom: true } });
        api.log('The royal barge sails south by night. At Karnak, Amenemopet-Ankh greets you as a father greets a son, and you understand what that means.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const delugeDamage = {
  id: 'deluge_damage',
  type: 'crisis',
  title: 'Hapi Drowns the Land',
  forcedOnly: true,
  major: true,
  brief: (s) => [
    `The river rose to **${cubitsLabel(s.flood.height)} cubits** and kept rising. Dykes have burst from Coptos to Memphis. Whole villages are under water, and the sacred lake at Karnak has overflowed into the temple courts.`,
    'Everyone wants to be rebuilt first. The temples say the gods cannot wait. The Nomarchs say that without canals there will be no harvest. The army says that without order there will be no one left to rebuild anything.',
  ],
  options: [
    {
      id: 'temples',
      title: 'Restore the Temples First',
      cost: '120,000 khar of grain and corvée labor sent to the sacred precincts.',
      fallout: 'Priesthood +10%. Bureaucracy −8%: their canals wait.',
      risk: 'Silt-choked canals cut next year’s harvest by 10%.',
      apply(s, api) {
        api.fx({ grain: -120000, approval: { priesthood: 10, bureaucracy: -8 }, flags: { canalPenaltyYear: s.year + 1 } });
        api.log('The gods’ houses are cleared of mud first. The fields can wait for next year.');
      },
    },
    {
      id: 'canals',
      title: 'Rebuild the Dykes and Canals',
      cost: '120,000 khar for the corvée gangs.',
      fallout: 'Bureaucracy +8%. Priesthood −5%: the gods’ houses wait.',
      risk: 'The temples stay damaged for a season, and the priests will tell everyone why.',
      apply(s, api) {
        api.fx({ grain: -120000, approval: { bureaucracy: 8, priesthood: -5 } });
        api.log('Corvée gangs rebuild the dykes. The harvest will survive.');
      },
    },
    {
      id: 'army',
      title: 'Send the Army to Keep Order',
      cost: 'Soldiers patrol the flooded nomes to stop looting.',
      fallout: 'Military +5%. Ma’at −3. Bureaucracy −5%: soldiers in the nomes, giving orders to governors.',
      risk: 'Next year’s harvest −10%. The generals see how much the realm depends on them.',
      apply(s, api) {
        api.fx({ approval: { military: 5, bureaucracy: -5 }, maat: -3, flags: { canalPenaltyYear: s.year + 1 } });
        api.log('Chariots splash through flooded villages. There is no looting, and no rebuilding either.');
      },
    },
    {
      id: 'neglect',
      title: 'Let the Nomes Rebuild Themselves',
      cost: 'Nothing from the royal stores.',
      fallout: 'Bureaucracy −5%. Ma’at −5: Pharaoh was absent when the waters came.',
      risk: 'Next year’s harvest −10%. The Nomarchs learn they do not need you.',
      apply(s, api) {
        api.fx({ approval: { bureaucracy: -5 }, maat: -5, flags: { canalPenaltyYear: s.year + 1 } });
        api.log('The nomes dig themselves out. Their governors remember who helped them, and it was not you.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const rivalClaim = {
  id: 'rival_claim',
  type: 'crisis',
  title: 'Two Princes, One Throne',
  forcedOnly: true,
  major: true,
  brief: (s, ctx) => {
    const r = son(s, ctx.rivalId);
    const h = heir(s);
    return [
      `Prince **${r.name}** (age ${r.age}, Legitimacy ${r.legitimacy}, Loyalty ${r.loyalty}) has been receiving petitioners as though he were already king. His mother’s people go in and out of his house every evening.`,
      `Crown Prince **${h.name}** (age ${h.age}, Legitimacy ${h.legitimacy}) has the title, but the court can count. Unless you settle this, Egypt will have two kings the moment you die.`,
    ];
  },
  options: [
    {
      id: 'designate',
      title: (s, ctx) => `Designate Prince ${son(s, ctx.rivalId).name} as Heir`,
      cost: (s) => `Crown Prince ${heirName(s)} is set aside.`,
      fallout: 'Military +10%. The new heir’s mother is triumphant; the old heir’s mother is your enemy for life.',
      risk: 'The faction tied to the old heir’s mother turns on you, and you have shown that pressure can change the succession.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        const h = heir(s);
        const oldMother = wife(s, h.motherId);
        const fx = { heir: r.id, approval: { military: 10 }, wives: { [r.motherId]: 25 }, sons: { [r.id]: { loyalty: 25 } } };
        if (oldMother && oldMother.id !== r.motherId) {
          fx.wives[oldMother.id] = -35;
          if (oldMother.tie === 'priesthood' || oldMother.tie === 'bureaucracy') fx.approval[oldMother.tie] = -15;
        }
        api.fx(fx);
        api.log(`Prince ${r.name} is proclaimed Crown Prince in the Hall of Appearances.`);
      },
    },
    {
      id: 'oracle',
      title: 'Reaffirm the Heir through Amun’s Oracle',
      available: (s) => s.gold >= 600,
      cost: '600 deben in offerings for the god’s confirmation.',
      fallout: (s, ctx) => `Priesthood +5%. ${heirName(s)}’s Legitimacy +15. Prince ${son(s, ctx.rivalId).name}’s Loyalty −15, and his mother −15%.`,
      risk: 'The rival does not accept the god’s word. Neither does his mother.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        api.fx({ gold: -600, approval: { priesthood: 5 }, sons: { [s.heirId]: { legitimacy: 15 }, [r.id]: { loyalty: -15 } }, wives: { [r.motherId]: -15 } });
        api.log(`Amun’s barque bows to Crown Prince ${heirName(s)}. Prince ${r.name} watches without expression.`);
      },
    },
    {
      id: 'kush',
      title: (s, ctx) => `Send Prince ${son(s, ctx.rivalId).name} South as Viceroy of Kush`,
      cost: 'He leaves court with a high title, far from Thebes.',
      fallout: 'His Legitimacy −10, Loyalty +5. Military −8%: they lose their favorite.',
      risk: 'A prince with the Nubian army and the gold mines can come back north one day.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        api.fx({ sons: { [r.id]: { legitimacy: -10, loyalty: 5 } }, approval: { military: -8 }, flags: { rivalInKush: r.id } });
        r.role = 'Viceroy of Kush';
        api.log(`Prince ${r.name} sails south to Buhen as King’s Son of Kush. His barge is very large.`);
      },
    },
    {
      id: 'marry',
      title: 'Marry the Heir to a Royal Daughter',
      available: (s) => heir(s) && isAdult(heir(s)) && (s.daughters || []).some((d) => d.age >= 16 && d.motherId !== heir(s).motherId) && s.gold >= 300,
      cost: '300 deben for the wedding festival.',
      fallout: 'The heir’s Legitimacy +15. The rival’s mother −5%.',
      risk: 'The bloodline narrows. Every princess married at home is one not sent abroad to secure a treaty.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        api.fx({ gold: -300, sons: { [s.heirId]: { legitimacy: 15 } }, wives: { [r.motherId]: -5 } });
        api.log(`Crown Prince ${heirName(s)} is married to a daughter of Pharaoh. His claim is now doubly royal.`);
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const seaPeoples = {
  id: 'sea_peoples',
  type: 'crisis',
  title: 'Ships of the Sea Peoples',
  when: (s) => s.turn > 2,
  weight: 5,
  brief: (s) => [
    'Ships with bird-headed prows have entered the Rosetta and Sebennytic mouths. **Peleset, Tjeker and Denyen** raiders are burning fishing villages and asking for land, as the Libu did before them.',
    `They are a nation looking for a home, not a raiding party. Military approval: **${s.blocs.military.approval}%**. ${s.flags.westFortified ? 'Your veterans’ forts in the west stand ready.' : 'The Delta forts are undermanned.'}`,
  ],
  options: [
    {
      id: 'ambush',
      title: 'Ambush Them in the River Mouths',
      cost: '80,000 khar to muster the fleet and archers.',
      fallout: 'If you win: Ma’at +12, Military +10%, and Sherden captives for your guard. If you lose: Ma’at −15 and the Delta is raided.',
      risk: 'A defeat in the Delta is seen by the whole of Egypt.',
      apply(s, api) {
        api.fx({ grain: -80000 });
        if (api.battle({ base: 0.55 + (s.flags.westFortified ? 0.1 : 0) + (s.flags.hittiteHorses ? 0.05 : 0), stations: ['capital', 'delta'] })) {
          api.fx({ maat: 12, approval: { military: 10 }, flags: { victory: true, sherdenSettled: true } });
          api.log('Archers on the riverbanks shoot the raiders’ ships to pieces. The survivors are branded with Pharaoh’s name and enrolled in his guard.');
        } else {
          api.fx({ maat: -15, intake: 0.95 });
          api.log('The fleet is outmaneuvered. The raiders burn three Delta towns and take the farmland around them.');
        }
      },
    },
    {
      id: 'settle',
      title: 'Settle Them as Garrison Troops',
      available: (s) => s.gold >= 700,
      cost: '700 deben in gifts and land. They will need 5,000 khar a month in rations.',
      fallout: 'Military −5%: native soldiers resent foreigners being given land. Ma’at −3.',
      risk: 'A foreign garrison inside Egypt, loyal to whoever pays it.',
      apply(s, api) {
        api.fx({ gold: -700, approval: { military: -5 }, maat: -3, flags: { sherdenSettled: true } });
        const pel = units(s).find((u) => u.id === 'peleset');
        if (pel) pel.men += 1000;
        else s.army.units.push({ id: 'peleset', name: 'Peleset Garrison', kind: 'mercenary', men: 1000, quality: 65, morale: 55, commanderId: null, station: 'delta' });
        syncArmyBurn(s);
        api.log('The Peleset are given land and garrison duty. They take both.');
      },
    },
    {
      id: 'fortify',
      title: 'Fortify the Towns and Wait',
      cost: '40,000 khar and Delta corvée.',
      fallout: 'Bureaucracy −5%. Ma’at −5: the Horus hides behind walls.',
      risk: 'The raiders take the open countryside. Royal tax intake −3% forever.',
      apply(s, api) {
        api.fx({ grain: -40000, approval: { bureaucracy: -5 }, maat: -5, intake: 0.97 });
        api.log('The towns close their gates. The countryside burns until the raiders move on.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const grainRiot = {
  id: 'grain_riot',
  type: 'crisis',
  title: 'Bread Riots at Thebes',
  forcedOnly: true,
  major: true,
  brief: (s) => [
    `A mob has broken into the granary of the West Bank. The royal granaries hold **${fmt(s.grain.royal)} khar**, less than a month of rations. Priests of Amun are watching from the temple walls. Nobody knows whose side they are on.`,
    'Bread has never been cheaper to promise, or harder to give.',
  ],
  options: [
    {
      id: 'distribute',
      title: 'Hand Out What Remains',
      cost: (s) => `${fmt(Math.min(100000, s.grain.royal))} khar from the last royal stores.`,
      fallout: 'Ma’at +6. Military −10%: the soldiers’ bread goes to the mob.',
      risk: 'The granaries are empty. The army is next.',
      apply(s, api) {
        api.fx({ grain: -Math.min(100000, s.grain.royal), maat: 6, approval: { military: -10 } });
        api.log('The last baskets go out. The mob goes home, and the soldiers watch the empty granaries.');
      },
    },
    {
      id: 'temple',
      title: 'Beg Karnak to Feed the City',
      available: (s) => s.blocs.priesthood.approval >= 35,
      cost: '200,000 khar from Amun’s stores, and a confession that the king cannot feed his people.',
      fallout: 'Priesthood +5%. Ma’at −3.',
      risk: 'The people learn that the god is richer than the king.',
      apply(s, api) {
        api.fx({ temple: -200000, approval: { priesthood: 5 }, maat: -3, flags: { amunFedEgypt: true } });
        api.log('Priests hand out bread in Amun’s name. The riot ends.');
      },
    },
    {
      id: 'crush',
      title: 'Crush the Riot with the Medjay',
      cost: 'Blood in the streets of the god’s city.',
      fallout: 'Ma’at −10. Military +5%. Bureaucracy −5%.',
      risk: 'Hungry people with grievances, and martyrs.',
      apply(s, api) {
        api.fx({ maat: -10, approval: { military: 5, bureaucracy: -5 } });
        api.log('The Medjay clear the granary with clubs and spears. The dead are left in the street.');
      },
    },
    {
      id: 'hoard',
      title: 'Open the Hoarded Granaries',
      unlocked: true,
      available: (s) => s.grain.sealed >= 100000,
      cost: (s) => `${fmt(Math.min(s.grain.sealed, 250000))} khar from the sealed reserve.`,
      fallout: 'Ma’at +10, and no faction pays for it.',
      risk: 'The reserve is spent.',
      apply(s, api) {
        const amt = Math.min(s.grain.sealed, 250000);
        api.fx({ sealed: -amt, grain: Math.round(amt / 2), maat: 10 });
        api.log('Pharaoh’s foresight feeds Thebes. The riot becomes a festival.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const coptosFraud = {
  id: 'coptos_fraud',
  type: 'crisis',
  title: 'The Missing Grain of Coptos',
  fallback: true,
  weight: 4,
  brief: (s) => [
    `Tax barges from Coptos arrived at Thebes one-fifth short. The Nomarch blames rot. The barge captains blame the Nomarch. The scribe who counted the cargo blames nobody, because he has gone missing.`,
    `${s.vizier.name} asks how you want it handled. Every Nomarch in Upper Egypt is watching.`,
  ],
  options: [
    {
      id: 'prosecute',
      title: 'Prosecute the Nomarch',
      cost: 'A trial before the Vizier’s court.',
      fallout: 'Ma’at +4. About 40,000 khar is recovered. Bureaucracy −8%.',
      risk: 'The Nomarchs close ranks against your scribes.',
      apply(s, api) {
        api.fx({ grain: 40000, maat: 4, approval: { bureaucracy: -8 } });
        api.log('The Nomarch of Coptos is beaten before the Vizier’s court and his granaries are emptied into royal barges.');
      },
    },
    {
      id: 'ignore',
      title: 'Accept the Story of Rot',
      cost: 'The grain is gone.',
      fallout: 'Bureaucracy +3%. Ma’at −3.',
      risk: 'Next year, every nome’s grain will "rot."',
      apply(s, api) {
        api.fx({ approval: { bureaucracy: 3 }, maat: -3, vizier: { integrity: -3 } });
        api.log('The matter is closed. In Coptos, the Nomarch builds a new house.');
      },
    },
    {
      id: 'split',
      title: 'Split the Difference Quietly',
      cost: 'The Nomarch returns half, and the matter is forgotten.',
      fallout: 'About 20,000 khar is recovered. Bureaucracy +4%.',
      risk: 'The Vizier’s scribes learn how much a royal investigation can be bought for.',
      apply(s, api) {
        api.fx({ grain: 20000, approval: { bureaucracy: 4 }, vizier: { integrity: -5 } });
        api.log('Half the grain reappears. Everyone agrees there was a counting error.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const westPower = (s) => units(s).filter((u) => u.station === 'west').reduce((t, u) => t + u.men, 0);
const libyanRaid = {
  id: 'libyan_raid',
  type: 'crisis',
  title: 'Raiders on the Western Road',
  when: (s) => s.realms.libu.relation < -40 && westPower(s) < 6000 && s.turn > 2,
  weight: 9,
  brief: (s) => [
    `Libu war-bands have crossed the western desert and are burning villages along the Canopic branch. The western forts hold **${fmt(westPower(s))} men**. That is not enough to stop them.`,
    'The Nomarch of the Western Delta begs for soldiers. The generals say the capital cannot be left bare. The raiders will be gone with their cattle before anyone decides.',
  ],
  options: [
    {
      id: 'march',
      title: 'March the Capital Divisions West',
      cost: '30,000 khar for a fast march. The capital is guarded only by what you leave behind.',
      fallout: 'If you win: Ma’at +6, Military +5%, the Libu are cowed. If you lose: Ma’at −10, the Delta suffers.',
      risk: 'Your best troops are away from the throne for a season.',
      apply(s, api) {
        api.fx({ grain: -30000 });
        if (api.battle({ base: 0.55, stations: ['capital', 'west'] })) {
          s.realms.libu.relation = Math.min(100, s.realms.libu.relation + 20);
          api.fx({ maat: 6, approval: { military: 5 } });
          api.log('The chariotry catches the raiders at the edge of the desert. Few of them see their tents again.');
        } else {
          api.fx({ maat: -10, intake: 0.98 });
          api.log('The raiders slip away into the desert with their plunder. The army arrives to find smoking villages.');
        }
      },
    },
    {
      id: 'payoff',
      title: 'Pay the Raiders to Leave',
      available: (s) => s.gold >= 500,
      cost: '500 deben of gold.',
      fallout: 'Military −6%: soldiers despise a king who pays tribute to nomads. Ma’at −4.',
      risk: 'The Libu learn that Egypt pays. They will be back.',
      apply(s, api) {
        s.realms.libu.relation = Math.min(100, s.realms.libu.relation + 10);
        api.fx({ gold: -500, approval: { military: -6 }, maat: -4 });
        api.log('Gold is left at a desert well. The war-bands ride west, for now.');
      },
    },
    {
      id: 'abandon',
      title: 'Pull the Villagers Back behind the Forts',
      cost: 'The western fields are left to the raiders for a season.',
      fallout: 'Bureaucracy −5%: the Western Delta feels abandoned. Ma’at −5.',
      risk: 'Royal tax intake −3% forever as villages are lost.',
      apply(s, api) {
        const d = s.nomes.find((n) => n.id === 'delta');
        d.loyalty = Math.max(0, d.loyalty - 15);
        api.fx({ approval: { bureaucracy: -5 }, maat: -5, intake: 0.97 });
        api.log('Families crowd into the fortified towns. Behind them, the raiders burn what they cannot carry.');
      },
    },
  ],
};

const canaanRevolt = {
  id: 'canaan_revolt',
  type: 'crisis',
  title: 'The Vassals of Canaan Stop Paying',
  when: (s) => s.realms.canaan.relation < 30 && !units(s).some((u) => u.station === 'canaan') && s.turn > 3,
  weight: 7,
  brief: (s) => [
    'The king of Gezer has thrown out the Egyptian commissioner. Ashkelon has closed its gates. Megiddo writes that it is "the loyal servant of Pharaoh, at the feet of the king seven times and seven times," and sends nothing.',
    `No Egyptian garrison stands in Canaan. Relations with the vassals: **${s.realms.canaan.relation}**. If one city defies Pharaoh and lives, they all will.`,
  ],
  options: [
    {
      id: 'campaign',
      title: 'March on Gezer',
      cost: '50,000 khar to supply the army across Sinai.',
      fallout: 'If you win: Ma’at +8, Military +8%, 700 deben of silver. If you lose: Ma’at −10.',
      risk: 'The army is far from home for a season.',
      apply(s, api) {
        api.fx({ grain: -50000 });
        if (api.battle({ base: 0.55, stations: ['capital', 'canaan'] })) {
          s.realms.canaan.relation = Math.min(100, s.realms.canaan.relation + 30);
          api.fx({ maat: 8, approval: { military: 8 }, gold: 700 });
          api.log('“Gezer is seized,” the scribes carve. The other cities send their tribute before the army even arrives.');
        } else {
          s.realms.canaan.relation = Math.max(-100, s.realms.canaan.relation - 10);
          api.fx({ maat: -10, approval: { military: -5 } });
          api.log('The army fails before the walls of Gezer and marches home through the summer heat.');
        }
      },
    },
    {
      id: 'garrison',
      title: 'Send the Division of Ptah as a Permanent Garrison',
      cost: 'The Division of Ptah moves to Canaan and stays there.',
      fallout: 'Vassal relation +15. Military +2%.',
      risk: 'Four thousand fewer men at home for any coup, riot or raid.',
      apply(s, api) {
        const u = units(s).find((x) => x.id === 'ptah') || units(s).find((x) => x.kind === 'infantry');
        u.station = 'canaan';
        s.realms.canaan.relation = Math.min(100, s.realms.canaan.relation + 15);
        api.fx({ approval: { military: 2 } });
        api.log(`The ${u.name} marches up the Way of Horus to garrison Gaza and Megiddo.`);
      },
    },
    {
      id: 'forgive',
      title: 'Accept Their Excuses',
      cost: 'No tribute this year.',
      fallout: 'Ma’at −3. Military −3%.',
      risk: 'Every vassal now knows Pharaoh’s reach is short.',
      apply(s, api) {
        s.realms.canaan.relation = Math.min(100, s.realms.canaan.relation + 5);
        api.fx({ maat: -3, approval: { military: -3 } });
        api.log('Pharaoh accepts the letters of excuse. In Gezer, they laugh.');
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// A brother with an army disputes the new Pharaoh's crown.
const successionWar = {
  id: 'succession_war',
  type: 'crisis',
  title: (s, ctx) => `The Crown Disputed: ${son(s, ctx.rivalId)?.name ?? 'a rival'} Claims the Throne`,
  forcedOnly: true,
  major: true,
  brief: (s, ctx) => {
    const r = son(s, ctx.rivalId);
    const men = units(s).filter((u) => u.commanderId === r.id).reduce((t, u) => t + u.men, 0);
    return [
      `The embalmers have not yet finished their work on ${s.dynasty[s.dynasty.length - 1]?.name ?? 'the old king'}, and already **${r.name}** has refused to kneel. He says the gods chose *him*. His mother’s kin and ${men ? `**${fmt(men)} soldiers** under his command` : 'a faction of officers'} stand behind him.`,
      `**${s.pharaoh.name}** is crowned, but a crown is only as strong as the army that guards it. Legitimacy: **${r.name} ${r.legitimacy}** against the throne’s Ma’at of **${s.maat}**. Military approval: **${s.blocs.military.approval}%**.`,
    ];
  },
  options: [
    {
      id: 'buy',
      title: (s, ctx) => `Buy ${son(s, ctx.rivalId)?.name}’s Submission`,
      available: (s) => s.gold >= 800,
      cost: '800 deben of gold and the Viceroyalty of Kush for your brother, far from the capital.',
      fallout: 'Military +5%. Ma’at −3: the new king paid for his crown.',
      risk: 'He keeps his claim, his gold and a Nubian army.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        r.role = 'Viceroy of Kush';
        for (const u of units(s)) if (u.commanderId === r.id) u.commanderId = null;
        api.fx({ gold: -800, approval: { military: 5 }, maat: -3, sons: { [r.id]: { loyalty: 25 } } });
        api.log(`${r.name} kneels, and sails south as King’s Son of Kush with a fortune in gold.`);
      },
    },
    {
      id: 'fight',
      title: 'Crush the Pretender',
      cost: 'Civil war between the regiments at the capital.',
      fallout: 'If you win: Ma’at +6, your rival is gone for good. If you lose, you lose the throne.',
      risk: 'Everything. A new reign that begins in blood is remembered for it.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        const theirs = units(s).filter((u) => u.commanderId === r.id).reduce((t, u) => t + u.men, 0);
        const base = 0.55 + (s.blocs.military.approval - 50) / 200 - theirs / 40000;
        if (api.chance(Math.max(0.2, Math.min(0.85, base)))) {
          r.alive = false;
          for (const u of units(s)) if (u.commanderId === r.id) u.commanderId = null;
          api.fx({ maat: 6, approval: { military: -5 } });
          api.log(`${r.name}’s men break at the palace canal. The pretender dies on the field, and his name is chiselled from his own monuments.`);
        } else {
          api.log(`${r.name}’s chariots ride into Pi-Ramesses. ${s.pharaoh.name} reigned for one season.`);
          api.end('usurped', `${r.name} took the crown from ${s.pharaoh.name}. Your line of the dynasty ends here.`);
        }
      },
    },
    {
      id: 'share',
      title: (s, ctx) => `Make ${son(s, ctx.rivalId)?.name} Your Heir`,
      cost: 'Your brother becomes heir to the throne, ahead of your own children.',
      fallout: 'Military +8%. Your own children’s mothers will hate it.',
      risk: 'Your children lose the succession unless you take it back later, and taking it back means war.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        api.fx({ heir: r.id, approval: { military: 8 }, sons: { [r.id]: { loyalty: 30, legitimacy: 10 } } });
        api.log(`${r.name} is proclaimed heir to the Two Lands. He kneels, smiling.`);
      },
    },
    {
      id: 'oracle',
      title: 'Let Amun’s Oracle Choose',
      available: (s) => s.blocs.priesthood.approval >= 45,
      cost: '500 deben in offerings, and the Priesthood’s word becomes law.',
      fallout: 'Priesthood +10%. If the god chooses you, Ma’at +8 and your rival is disgraced.',
      risk: 'The priests decide who is king. Next time they may decide differently.',
      apply(s, api) {
        const r = son(s, api.ctx.rivalId);
        api.fx({ gold: -Math.min(500, s.gold), approval: { priesthood: 10 } });
        if (api.chance(0.5 + (s.blocs.priesthood.approval - 50) / 100)) {
          api.fx({ maat: 8, sons: { [r.id]: { legitimacy: -30, loyalty: -10 } } });
          r.role = 'King’s Brother (disgraced)';
          api.log(`The barque of Amun bows to ${s.pharaoh.name}. ${r.name} has no answer to the god.`);
        } else {
          api.fx({ heir: r.id, maat: -6, sons: { [r.id]: { legitimacy: 15 } } });
          api.log(`The barque of Amun bows to ${r.name}. The priests proclaim him heir, and ${s.pharaoh.name} rules on their sufferance.`);
        }
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
const warDeclared = {
  id: 'war_declared',
  type: 'crisis',
  title: (s, ctx) => `${s.realms[ctx.realm]?.name ?? 'An enemy'} Marches on Egypt`,
  forcedOnly: true,
  major: true,
  brief: (s, ctx) => {
    const r = s.realms[ctx.realm];
    const p = s.provinces.find((x) => x.id === ctx.provinceId);
    return [
      `A runner arrives from the frontier: **${r.ruler}** has declared war. His army, about **${fmt(r.army)} men**, is marching on **${p?.name ?? 'the frontier'}**.`,
      'The army will fight wherever its divisions are stationed. If no division stands on that front, the enemy will take what it wants. Open the World desk to set your war target and peace terms.',
    ];
  },
  options: [
    {
      id: 'rally',
      title: 'Send the Capital Divisions to the Front',
      cost: 'Every infantry division and the Chariot Corps at the capital marches to the threatened front.',
      fallout: 'Military +5%. The capital is left with the Medjay and the Sherden.',
      risk: 'A palace with no army near it is a palace that can be taken.',
      apply(s, api) {
        const p = s.provinces.find((x) => x.id === api.ctx.provinceId);
        const front = p ? ({ canaan: 'canaan', syria: 'canaan', mesopotamia: 'canaan', islands: 'canaan', sinai: 'canaan', kush: 'south', libya: 'west' })[p.region] : 'canaan';
        for (const u of units(s)) if (u.station === 'capital' && (u.kind === 'infantry' || u.kind === 'chariots')) u.station = front;
        api.fx({ approval: { military: 5 } });
        api.log('Trumpets at Pi-Ramesses. The divisions march out, standards high.');
      },
    },
    {
      id: 'buy',
      title: 'Buy Peace before the First Battle',
      available: (s, ctx) => s.gold >= 600,
      cost: '600 deben of gold to the enemy king.',
      fallout: 'Ma’at −6. Military −5%.',
      risk: 'A Pharaoh who pays tribute invites every neighbour to try the same.',
      apply(s, api) {
        const w = s.wars.find((x) => x.enemy === api.ctx.realm);
        if (w) s.wars = s.wars.filter((x) => x !== w);
        s.realms[api.ctx.realm].truceUntil = s.turn + 4;
        s.realms[api.ctx.realm].relation = -20;
        api.fx({ gold: -600, maat: -6, approval: { military: -5 } });
        api.log('Gold buys a truce. The enemy goes home richer, and the scribes do not carve it on any wall.');
      },
    },
    {
      id: 'ally',
      title: 'Call on Your Marriage Allies',
      available: (s) => s.wives.some((w) => w.status === 'court' && s.realms[w.tie]) || s.flags.hattiTreaty !== false,
      cost: 'You owe your allies a favour, and gold for their troops (300 deben).',
      fallout: 'The enemy’s army is a quarter weaker on your front.',
      risk: 'Allies remember what they gave, and will ask for it back.',
      apply(s, api) {
        const r = s.realms[api.ctx.realm];
        r.army = Math.round(r.army * 0.75);
        api.fx({ gold: -Math.min(300, s.gold) });
        api.log('Envoys ride north with gold. Allied chariots harass the enemy’s flank before the first battle.');
      },
    },
    {
      id: 'stand',
      title: 'Hold the Fortresses and Wait',
      cost: 'The army stays where it is.',
      fallout: 'No immediate cost.',
      risk: 'If no division stands on that front, the enemy will take provinces.',
      apply(s, api) {
        api.log('Pharaoh orders the frontier forts to hold. Messengers wait for news.');
      },
    },
  ],
};

const regencyChallenge = {
  id: 'regency_challenge',
  type: 'crisis',
  title: 'The Regency Is Challenged',
  forcedOnly: true,
  major: true,
  brief: (s) => {
    const strong = [...s.army.generals].sort((a, b) => b.ambition - a.ambition)[0];
    return [
      `${s.regency?.regent ?? 'The regent'} rules in the name of a child, and the great men of Egypt have stopped pretending to obey. Regent’s authority: **${s.regency?.authority ?? 0}**.`,
      `General **${strong?.name ?? 'Paramessu'}** and High Priest **${s.highPriest.name}** have both let it be known that they could protect the young king better.`,
    ];
  },
  options: [
    {
      id: 'share',
      title: 'Share the Regency with the General',
      cost: 'A regency council: the General governs the army in the king’s name.',
      fallout: 'Authority +40. Military +10%.',
      risk: 'When the king comes of age, the General may not want to give the army back.',
      apply(s, api) {
        const g = [...s.army.generals].sort((a, b) => b.ambition - a.ambition)[0];
        if (s.regency) s.regency.authority = Math.min(100, s.regency.authority + 40);
        if (g) g.ambition = Math.min(100, g.ambition + 15);
        api.fx({ approval: { military: 10 } });
        api.log(`General ${g?.name ?? ''} joins the regency council. The barracks fall silent, and obedient.`);
      },
    },
    {
      id: 'priests',
      title: 'Place the Young King under Amun’s Protection',
      cost: 'Karnak becomes the guardian of the throne. New royal estates for Amun (−3% tax intake forever).',
      fallout: 'Authority +35. Priesthood +12%.',
      risk: 'The priests will expect to be thanked when the king is grown.',
      apply(s, api) {
        if (s.regency) s.regency.authority = Math.min(100, s.regency.authority + 35);
        api.fx({ intake: 0.97, approval: { priesthood: 12 } });
        api.log('The oracle of Amun declares the young king the god’s own son, and his regent the god’s servant. Nobody argues with Amun.');
      },
    },
    {
      id: 'crush',
      title: 'Strike First: Arrest the Ringleaders',
      cost: 'The Medjay move against the boldest nobles.',
      fallout: 'If it works: authority +30, Ma’at −3. If not: authority collapses.',
      risk: 'A failed purge makes a regent’s enemies bolder.',
      apply(s, api) {
        if (api.chance(0.4 + s.blocs.military.approval / 200)) {
          if (s.regency) s.regency.authority = Math.min(100, s.regency.authority + 30);
          api.fx({ maat: -3, approval: { bureaucracy: -6 } });
          api.log('Three Nomarchs and a general’s deputy are seized at dawn. The others remember their oaths.');
        } else {
          if (s.regency) s.regency.authority = 5;
          api.fx({ approval: { military: -10, bureaucracy: -8 } });
          api.log('The arrests fail. The nobles close ranks against the regent.');
        }
      },
    },
    {
      id: 'marry',
      title: 'Bind the Strongest Noble by Marriage',
      available: (s) => s.daughters.some((d) => d.alive && d.age >= 16 && !d.spouse && !d.abroad && d.office !== 'gods_wife'),
      cost: 'A royal princess marries the most dangerous general.',
      fallout: 'Authority +30. Military +6%.',
      risk: 'A general married into the royal house has a claim of his own.',
      apply(s, api) {
        const d = s.daughters.find((x) => x.alive && x.age >= 16 && !x.spouse && !x.abroad && x.office !== 'gods_wife');
        const g = [...s.army.generals].sort((a, b) => b.ambition - a.ambition)[0];
        if (d && g) {
          d.spouse = { name: `General ${g.name}`, kind: 'general', seed: g.seed, tie: 'military', origin: 'A general of the army' };
          g.loyalty = Math.min(100, g.loyalty + 30);
          g.royalKin = d.id;
        }
        if (s.regency) s.regency.authority = Math.min(100, s.regency.authority + 30);
        api.fx({ approval: { military: 6 } });
        api.log(`Princess ${d?.name} marries General ${g?.name}. The most dangerous man in Egypt is now family.`);
      },
    },
  ],
};

export const CRISES = [
  hungerFlood,
  famineYear,
  tombStrike,
  hittitePlea,
  vizierLedger,
  nubianRevolt,
  nomarchLeague,
  poisonedCup,
  oracleSpeaks,
  marchOnPalace,
  delugeDamage,
  rivalClaim,
  seaPeoples,
  grainRiot,
  coptosFraud,
  libyanRaid,
  canaanRevolt,
  successionWar,
  warDeclared,
  regencyChallenge,
];
