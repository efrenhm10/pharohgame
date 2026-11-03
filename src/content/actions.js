// Royal commands: everything Pharaoh can personally order from the desks.
//
// action: {
//   desk, label(s,a), cost(s,a) (Royal Attention), cooldown? (turns, keyed by key(a)),
//   available?(s,a) → true | 'reason it is not', run(s, a, api)
// }
import { fmt, clamp } from '../engine/util.js';
import { heir, son, wife, sonsOf, isAdult, kingWives, designateHeir, child as anyChild } from '../engine/realm.js';
import { unit, units, syncArmyBurn, commander, armyPower, STATIONS } from '../engine/army.js';
import { SCHOOLS, FOREIGN_BRIDES, FEMALE_NAMES, MALE_NAMES, candidates, seedNum, newId } from '../engine/people.js';
import { MONUMENT_CATALOG } from './monuments.js';
import { MORE_ACTIONS } from './actions2.js';

const nome = (s, id) => s.nomes.find((n) => n.id === id);
const child = (s, id) => { const c = anyChild(s, id); return c && c.alive ? c : null; };
const hashPick = (arr, key) => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
};
const UNIT_CAPS = { infantry: 8000, chariots: 4000, police: 3000, mercenary: 3000 };
export const OFFICES = {
  vizier: 'Vizier of the South',
  vizierNorth: 'Vizier of the North',
  highPriest: 'High Priest of Amun',
  overseer: 'Overseer of the Granaries',
  viceroy: 'King’s Son of Kush (Viceroy)',
};
export const CAMPAIGNS = {
  canaan: { name: 'Canaan', station: 'canaan', difficulty: 14000, note: 'Booty, silver and cowed vassals' },
  libya: { name: 'the Libyan desert', station: 'west', difficulty: 16000, note: 'Punish the Libu; win back the western Delta' },
  kush: { name: 'Upper Kush', station: 'south', difficulty: 10000, note: 'Secure the gold country' },
};

// ── Marriage shortlists (deterministic, no dice) ─────────────────────────

export function matchOptions(s, c) {
  const out = [];
  const female = c.sex === 'f';
  const h = heir(s);
  const weakNomes = [...s.nomes].sort((a, b) => a.loyalty - b.loyalty).slice(0, 2);
  if (female) {
    if (!s.flags.godsWife)
      out.push({ id: 'gods_wife', label: 'Consecrate her as God’s Wife of Amun', hint: 'She never marries. Priesthood +12%, Ma’at +3, and a royal voice inside Karnak.' });
    if (h && h.alive && isAdult(h) && !h.spouse && h.motherId !== c.motherId)
      out.push({ id: 'heir', label: `Marry her to Crown Prince ${h.name}`, hint: 'The divine blood: his Legitimacy +15, she becomes his Great Royal Wife, and their children are born with +15 Legitimacy, which locks the palace against rival mothers. But about 3 in 10 children of such marriages are born frail and may die young.' });
    for (const n of weakNomes)
      out.push({ id: `nome:${n.id}`, label: `The heir of ${n.nomarch}, Nomarch of ${n.name}`, hint: `Binds a wavering nome to the crown: loyalty +25 (now ${n.loyalty}). His family gains royal kin.` });
    for (const g of s.army.generals.slice(0, 2))
      out.push({ id: `general:${g.id}`, label: `General ${g.name}`, hint: `Military +5%; ${g.name}’s loyalty +25, but a son-in-law of Pharaoh grows ambitious.` });
    for (const r of ['hatti', 'babylon'])
      if (s.realms[r].relation > -20)
        out.push({ id: `foreign:${r}`, label: `Send her to ${s.realms[r].ruler}`, hint: `“No daughter of the king of Egypt has ever been given to anyone.” Breaking that: Ma’at −6, Priesthood −8%. ${s.realms[r].name} relation +35, and 600 deben of bride-price.` });
  } else {
    for (const n of weakNomes)
      out.push({ id: `nome:${n.id}`, label: `${hashPick(FEMALE_NAMES, c.id + n.id)}, daughter of Nomarch ${n.nomarch} of ${n.name}`, hint: `Nome loyalty +20. But ${c.name} gains a power base of his own.` });
    for (const r of ['hatti', 'babylon', 'alashiya'])
      if (s.realms[r].relation >= 20)
        out.push({ id: `foreign:${r}`, label: `${hashPick(FOREIGN_BRIDES[r] || FEMALE_NAMES, c.id)}, a princess of ${s.realms[r].name}`, hint: `A marriage alliance: ${s.realms[r].name} relation +15 and a dowry of 300 deben.${c.id === s.heirId ? ` When ${c.name} is king and she is his queen, ${s.realms[r].name} will not make war on Egypt. But the priests count her children’s blood as half foreign.` : ` ${c.name}’s Legitimacy +5.`}` });
    out.push({ id: 'priestly', label: `${hashPick(FEMALE_NAMES, c.id + 'hp')}, niece of the High Priest`, hint: 'Priesthood +6%, Legitimacy +3.' });
    if (c.id === s.heirId) {
      const sis = (s.daughters || []).find((d) => d.alive && isAdult(d) && !d.spouse && d.office !== 'gods_wife' && d.motherId !== c.motherId);
      if (sis) out.push({ id: `sister:${sis.id}`, label: `Princess ${sis.name}, his half-sister`, hint: 'The divine blood: Legitimacy +15, both mothers pleased, and children born with +15 Legitimacy. But about 3 in 10 are born frail, and no foreign king gains a reason to keep the peace.' });
    }
  }
  return out;
}

// ── Helpers shared by several actions ────────────────────────────────────

function newWife(s, { name, title, origin, tie, kind, influence, ambition, satisfaction }) {
  s.wives.push({ id: newId(s, 'wife'), kind, seed: seedNum(s), name, title, origin, tie, age: 17 + (s.turn % 8), influence, ambition, satisfaction, plot: 0, status: 'court' });
}

function personFromSon(sn) {
  const comp = sn.skill === 'administration' ? 72 : sn.skill === 'statecraft' ? 66 : sn.skill === 'piety' ? 60 : 50;
  return { id: sn.id, kind: 'prince', seed: sn.seed, name: `Prince ${sn.name}`, age: sn.age, competence: comp, integrity: 70, ambition: sn.trait === 'ambitious' ? 80 : 45, loyalty: sn.loyalty, origin: 'son', sonId: sn.id };
}

// ── The registry ─────────────────────────────────────────────────────────

export const ACTIONS = {
  // 🌾 GRANARIES ──────────────────────────────────────────────────────────
  'granary.ration': {
    desk: 'granary',
    cost: () => 0,
    label: (s, a) => `Set ${a.group} rations to ${a.level}`,
    available: (s, a) => (a.group === 'army' ? s.armyRation !== a.level : s.policy.workforceRation !== a.level) || 'Already in force.',
    run(s, a, api) {
      if (a.group === 'army') {
        const lower = a.level < s.armyRation;
        s.armyRation = a.level;
        s.flags.rationCutUntil = null;
        api.fx({ approval: { military: lower ? -6 : 4 } });
        api.log(lower ? 'The barracks hear that their bread is being cut.' : 'Full rations return to the barracks.');
      } else {
        const lower = a.level < s.policy.workforceRation;
        s.policy.workforceRation = a.level;
        api.fx({ maat: lower ? -2 : 1 });
        api.log(lower ? 'The tomb-builders’ rations are cut. The scribe of the tomb notes their anger.' : 'The workforce eats its full ration again.');
      }
    },
  },
  'granary.palace': {
    desk: 'granary',
    cost: () => 0,
    label: (s, a) => `Palace household: ${a.level}`,
    available: (s, a) => s.policy.palace !== a.level || 'Already in force.',
    run(s, a, api) {
      s.policy.palace = a.level;
      api.fx({ approval: { harem: a.level === 'lavish' ? 6 : a.level === 'austere' ? -6 : 0 } });
      api.log(a.level === 'austere' ? 'The palace kitchens are told to economize. The harem notices first.' : a.level === 'lavish' ? 'Banquets every night: the court approves.' : 'The palace returns to its normal household.');
    },
  },
  'granary.tax': {
    desk: 'granary',
    cost: () => 0,
    label: (s, a) => `Tax quota: ${a.level}`,
    available: (s, a) => s.policy.tax !== a.level || 'Already in force.',
    run(s, a, api) {
      const was = s.policy.tax;
      s.policy.tax = a.level;
      const d = a.level === 'heavy' ? -5 : a.level === 'light' ? 4 : was === 'heavy' ? 3 : -2;
      api.fx({ approval: { bureaucracy: d } });
      api.log(`The scribes are sent out with a ${a.level} quota for every nome.`);
    },
  },
  'granary.seal': {
    desk: 'granary',
    cost: () => 1,
    label: (s, a) => `Seal ${fmt(a.amount)} khar in reserve`,
    available: (s, a) => s.grain.royal >= a.amount || 'Not enough grain in the royal granaries.',
    run(s, a, api) {
      api.fx({ grain: -a.amount, sealed: a.amount });
      api.log(`${fmt(a.amount)} khar is sealed with Pharaoh’s cartouche, safe from rations and rot.`);
    },
  },
  'granary.unseal': {
    desk: 'granary',
    cost: () => 1,
    label: (s, a) => `Open ${fmt(a.amount)} khar of the reserve`,
    available: (s, a) => s.grain.sealed >= a.amount || 'The sealed reserve is smaller than that.',
    run(s, a, api) {
      api.fx({ sealed: -a.amount, grain: a.amount });
      api.log('The seals are broken and the reserve flows back into the royal granaries.');
    },
  },
  'granary.buy': {
    desk: 'granary',
    cost: () => 1,
    cooldown: 1,
    key: (a) => `buy-${a.realm}`,
    label: (s, a) => `Buy grain from ${s.realms[a.realm].name}`,
    available: (s, a) => (s.gold >= 250 ? (s.realms[a.realm].relation >= -10 || `${s.realms[a.realm].name} will not trade with you.`) : 'Not enough gold (250 deben).'),
    run(s, a, api) {
      const amount = s.realms[a.realm].relation >= 40 ? 60000 : 45000;
      api.fx({ gold: -250, grain: amount });
      s.realms[a.realm].relation = clamp(s.realms[a.realm].relation + 2, -100, 100);
      api.log(`Ships from ${s.realms[a.realm].name} unload ${fmt(amount)} khar at Pi-Ramesses for 250 deben of gold.`);
    },
  },
  'granary.feed': {
    desk: 'granary',
    cost: () => 1,
    label: () => 'Feed the people from the royal stores',
    available: (s) => s.grain.royal >= 100000 || 'Not enough grain (100,000 khar).',
    run(s, a, api) {
      api.fx({ grain: -100000, maat: 4, approval: { bureaucracy: 2, priesthood: 2 } });
      api.log('Bread and beer are handed out at the temple gates under Pharaoh’s name.');
    },
  },
  'granary.borrow': {
    desk: 'granary',
    cost: () => 1,
    label: () => 'Borrow 250,000 khar from Karnak',
    available: (s) => (s.templeLoan ? 'You already owe Karnak.' : s.blocs.priesthood.approval >= 40 || 'The High Priest will not lend to you (Priesthood below 40%).'),
    run(s, a, api) {
      api.fx({ grain: 250000, temple: -250000, approval: { priesthood: -3 } });
      s.templeLoan = { amount: 250000, dueTurn: s.turn + 3 };
      api.log('Amun lends to his son. Repayment, with a tenth more, falls due in a year.');
    },
  },
  'granary.repay': {
    desk: 'granary',
    cost: () => 1,
    label: () => 'Repay Karnak early',
    available: (s) => (!s.templeLoan ? 'You owe Karnak nothing.' : s.grain.royal >= s.templeLoan.amount * 1.05 || 'Not enough grain to repay.'),
    run(s, a, api) {
      const owed = Math.round(s.templeLoan.amount * 1.05);
      api.fx({ grain: -owed, temple: owed, approval: { priesthood: 4 } });
      s.templeLoan = null;
      api.log('The debt to Amun is paid early. The priests are surprised, and pleased.');
    },
  },

  // ⚔️ ARMY ────────────────────────────────────────────────────────────────
  'army.recruit': {
    desk: 'army',
    cost: () => 1,
    label: (s, a) => `Recruit for the ${unit(s, a.unitId).name}`,
    available(s, a) {
      const u = unit(s, a.unitId);
      if (u.men + 1000 > UNIT_CAPS[u.kind]) return 'The unit is at full strength.';
      if (u.kind === 'mercenary') return s.gold >= 300 || 'Mercenaries cost 300 deben.';
      return s.grain.royal >= 20000 || 'Not enough grain to equip recruits.';
    },
    run(s, a, api) {
      const u = unit(s, a.unitId);
      u.men += 1000;
      u.quality = clamp(u.quality - 3, 20, 95);
      if (u.kind === 'mercenary') api.fx({ gold: -300 });
      else api.fx({ grain: -20000, approval: { bureaucracy: -2 } });
      syncArmyBurn(s);
      api.log(`1,000 new men join the ${u.name} (${fmt(u.men)} now). The army will eat 5,000 more khar a month.`);
    },
  },
  'army.disband': {
    desk: 'army',
    cost: () => 1,
    label: (s, a) => `Discharge men from the ${unit(s, a.unitId).name}`,
    available: (s, a) => unit(s, a.unitId).men > 1000 || 'Cannot go below 1,000 men.',
    run(s, a, api) {
      const u = unit(s, a.unitId);
      u.men -= 1000;
      u.morale = clamp(u.morale - 5, 5, 100);
      syncArmyBurn(s);
      api.fx({ approval: { military: -3 } });
      api.log(`1,000 men of the ${u.name} are sent home to their villages. The army eats 5,000 khar a month less.`);
    },
  },
  'army.drill': {
    desk: 'army',
    cost: () => 1,
    cooldown: 2,
    key: (a) => `drill-${a.unitId}`,
    label: (s, a) => `Drill the ${unit(s, a.unitId).name}`,
    available: (s) => s.grain.royal >= 15000 || 'Not enough grain (15,000 khar).',
    run(s, a, api) {
      const u = unit(s, a.unitId);
      u.quality = clamp(u.quality + 6, 0, 95);
      u.morale = clamp(u.morale + 4, 0, 100);
      api.fx({ grain: -15000 });
      api.log(`The ${u.name} drills on the parade ground: quality ${u.quality}.`);
    },
  },
  'army.bonus': {
    desk: 'army',
    cost: () => 1,
    cooldown: 3,
    key: () => 'bonus',
    label: () => 'Award the Gold of Valor',
    available: (s) => s.gold >= 400 || 'Not enough gold (400 deben).',
    run(s, a, api) {
      for (const u of units(s)) u.morale = clamp(u.morale + 8, 0, 100);
      api.fx({ gold: -400, approval: { military: 5 } });
      api.log('Golden flies and collars are hung on the bravest officers at the Window of Appearances.');
    },
  },
  'army.command': {
    desk: 'army',
    cost: () => 1,
    label: (s, a) => `Give the ${unit(s, a.unitId).name} to ${commander(s, a.personId)?.name ?? 'no one'}`,
    available(s, a) {
      const u = unit(s, a.unitId);
      if (u.commanderId === a.personId) return 'Already in command.';
      if (a.personId && !commander(s, a.personId)) return 'That person cannot command.';
      return true;
    },
    run(s, a, api) {
      const u = unit(s, a.unitId);
      const prev = u.commanderId;
      u.commanderId = a.personId || null;
      const fx = { approval: {}, sons: {} };
      const c = commander(s, a.personId);
      if (c?.isSon) {
        fx.sons[c.id] = { legitimacy: 3, loyalty: 5 };
        fx.approval.military = 2;
        son(s, c.id).role = `Commander of the ${u.name}`;
      }
      if (prev && !units(s).some((x) => x.commanderId === prev)) {
        const g = s.army.generals.find((x) => x.id === prev);
        if (g) g.loyalty = clamp(g.loyalty - 10, 0, 100);
        const sp = son(s, prev);
        if (sp) {
          fx.sons[sp.id] = { loyalty: -12 };
          sp.role = 'King’s Son';
        }
      }
      api.fx(fx);
      api.log(c ? `${c.name} takes command of the ${u.name}.` : `The ${u.name} is left without a commander.`);
    },
  },
  'army.station': {
    desk: 'army',
    cost: () => 0,
    cooldown: 1,
    key: (a) => `station-${a.unitId}`,
    label: (s, a) => `Send the ${unit(s, a.unitId).name} to ${STATIONS[a.station].name}`,
    available: (s, a) => unit(s, a.unitId).station !== a.station || 'Already there.',
    run(s, a, api) {
      const u = unit(s, a.unitId);
      u.station = a.station;
      if (a.station === 'west') s.flags.westFortified = s.flags.westFortified || false;
      api.log(`The ${u.name} marches to ${STATIONS[a.station].name}.`);
    },
  },
  'army.campaign': {
    desk: 'army',
    cost: () => 2,
    label: (s, a) => `Campaign in ${CAMPAIGNS[a.target].name}${a.leader === 'pharaoh' ? ', led by Pharaoh' : ''}`,
    available(s, a) {
      if (s.turn - s.army.lastCampaign < 3) return 'The army needs a year between campaigns.';
      if (s.grain.royal < 60000) return 'Not enough grain to supply a campaign (60,000 khar).';
      return true;
    },
    run(s, a, api) {
      const t = CAMPAIGNS[a.target];
      const force = units(s).filter((u) => u.kind !== 'police' && (u.station === 'capital' || u.station === t.station));
      const power = armyPower(s, ['capital', t.station]) * (force.length ? 1 : 0);
      let p = clamp(0.5 + (power / t.difficulty - 1) * 0.5, 0.1, 0.9);
      if (a.leader === 'pharaoh') {
        p = clamp(p + 0.08, 0.1, 0.92);
        s.pharaoh.away = true;
      }
      s.army.lastCampaign = s.turn;
      api.fx({ grain: -60000 });
      const sonsInCommand = force.map((u) => commander(s, u.commanderId)).filter((c) => c?.isSon);
      const win = api.chance(p);
      for (const u of force) {
        u.men = Math.max(500, Math.round(u.men * (win ? 0.95 : 0.85) / 100) * 100);
        u.morale = clamp(u.morale + (win ? 10 : -15), 5, 100);
      }
      syncArmyBurn(s);
      if (a.leader === 'pharaoh' && api.chance(0.25)) {
        api.fx({ health: -10 });
        api.log('Pharaoh returns from the field exhausted and feverish.');
      }
      if (win) {
        const fx = { maat: a.leader === 'pharaoh' ? 10 : 6, approval: { military: 8 }, sons: {} };
        for (const c of sonsInCommand) fx.sons[c.id] = { legitimacy: 6 };
        if (a.target === 'canaan') {
          fx.gold = 900;
          s.realms.canaan.relation = clamp(s.realms.canaan.relation + 15, -100, 100);
          api.log('The army storms a rebel town in Canaan. Silver, cattle and captives come home; the vassal kings send gifts unasked.');
        } else if (a.target === 'libya') {
          fx.flags = { deltaLost: false, westFortified: true };
          s.realms.libu.relation = clamp(s.realms.libu.relation + 30, -100, 100);
          api.log('The Libu are driven deep into the desert. The western Delta is Egypt’s again, and the forts are rebuilt.');
        } else {
          fx.gold = 700;
          fx.flags = { nubianGoldLost: false, nubianHalf: false };
          api.log('The chiefs of Kush kneel at Buhen. The gold caravans move again.');
        }
        api.fx(fx);
      } else {
        api.fx({ maat: -10, approval: { military: -8 } });
        api.log(`The campaign in ${t.name} fails. The army comes home thinner, and angry.`);
      }
    },
  },

  // 🪷 ROYAL FAMILY ────────────────────────────────────────────────────────
  'family.educate': {
    desk: 'family',
    cost: () => 1,
    label: (s, a) => `Send ${child(s, a.childId)?.name} to ${SCHOOLS[a.school].name}`,
    available(s, a) {
      const c = child(s, a.childId);
      if (!c) return 'No such child.';
      if (c.edu) return 'Already educated.';
      if (c.age < 4 || c.age > 15) return 'Children are schooled between 4 and 15.';
      const sc = SCHOOLS[a.school];
      if (sc.minAge && c.age < sc.minAge) return `Too young for ${sc.name}.`;
      if (sc.sons && c.sex !== 'm') return 'The chariot stables take only sons.';
      return true;
    },
    run(s, a, api) {
      const c = child(s, a.childId);
      const sc = SCHOOLS[a.school];
      c.edu = a.school;
      c.skill = sc.skill;
      const fx = { ...sc.fx };
      if (a.school === 'kap' && c.sex === 'm') fx.sons = { [c.id]: { loyalty: 10 } };
      api.fx(fx);
      api.log(`${c.sex === 'm' ? 'Prince' : 'Princess'} ${c.name} is sent to ${sc.name}.`);
    },
  },
  'family.marry': {
    desk: 'family',
    cost: () => 2,
    label: (s, a) => `Marry ${child(s, a.childId)?.name}`,
    available(s, a) {
      const c = child(s, a.childId);
      if (!c || !c.alive) return 'No such child.';
      if (c.spouse || c.office === 'gods_wife') return 'Already married or consecrated.';
      if (!isAdult(c)) return 'Too young to marry (16).';
      if (String(a.matchId).startsWith('nome:') && nome(s, a.matchId.slice(5))) return true;
      return matchOptions(s, c).some((m) => m.id === a.matchId) || 'That match is not available.';
    },
    run(s, a, api) {
      const c = child(s, a.childId);
      const [kind, ref] = a.matchId.split(':');
      const m = matchOptions(s, c).find((x) => x.id === a.matchId) || { label: `${hashPick(FEMALE_NAMES, c.id + ref)}, daughter of Nomarch ${nome(s, ref)?.nomarch}` };
      const fx = { approval: {}, sons: {}, wives: {} };
      const title = c.sex === 'm' ? 'Prince' : 'Princess';
      if (kind === 'gods_wife') {
        c.office = 'gods_wife';
        c.role = 'God’s Wife of Amun';
        s.flags.godsWife = c.id;
        Object.assign(fx, { maat: 3 });
        fx.approval.priesthood = 12;
        api.log(`Princess ${c.name} is consecrated as God’s Wife of Amun at Karnak. She will never marry, and the priests must now share Amun’s house with Pharaoh’s daughter.`);
      } else if (kind === 'heir' || kind === 'sister') {
        const h = kind === 'heir' ? heir(s) : c;
        const bride = kind === 'heir' ? c : child(s, ref);
        h.spouse = { name: `Princess ${bride.name}`, ref: bride.id, kind: 'queen', seed: bride.seed, age: bride.age, tie: 'none', origin: `Daughter of ${s.pharaoh.name}` };
        bride.spouse = { name: `Crown Prince ${h.name}`, ref: h.id };
        fx.sons[h.id] = { legitimacy: 15 };
        fx.wives[bride.motherId] = 10;
        fx.wives[h.motherId] = 10;
        api.log(`Crown Prince ${h.name} marries his half-sister ${bride.name}. The heir’s claim is now royal twice over, and she will be his Great Royal Wife.`);
      } else if (kind === 'nome') {
        const n = nome(s, ref);
        n.loyalty = clamp(n.loyalty + (c.sex === 'f' ? 25 : 20), 0, 100);
        n.royalKin = c.id;
        fx.approval.bureaucracy = 4;
        c.spouse = c.sex === 'f'
          ? { name: `${hashPick(MALE_NAMES, n.id + c.id)}, heir of Nomarch ${n.nomarch}`, kind: 'consort', seed: seedNum(s), age: c.age + 3, tie: 'bureaucracy', origin: `Son of Nomarch ${n.nomarch} of ${n.name}`, nomeId: n.id }
          : { name: m.label.split(',')[0], kind: 'wife', seed: seedNum(s), age: Math.max(16, c.age - 3), tie: 'bureaucracy', origin: `Daughter of Nomarch ${n.nomarch} of ${n.name}`, nomeId: n.id };
        if (c.sex === 'm') fx.sons[c.id] = { legitimacy: 3 };
        api.log(`${title} ${c.name} is married into the house of ${n.nomarch} of ${n.name}. The nome celebrates for a week.`);
      } else if (kind === 'general') {
        const g = s.army.generals.find((x) => x.id === ref);
        g.loyalty = clamp(g.loyalty + 25, 0, 100);
        g.ambition = clamp(g.ambition + 10, 0, 100);
        g.royalKin = c.id;
        fx.approval.military = 5;
        c.spouse = { name: `General ${g.name}`, kind: 'general', seed: g.seed, age: g.age, tie: 'military', origin: 'A general of the army' };
        api.log(`Princess ${c.name} marries General ${g.name}. The army has a royal son-in-law now.`);
      } else if (kind === 'foreign') {
        const r = s.realms[ref];
        if (c.sex === 'f') {
          r.relation = clamp(r.relation + 35, -100, 100);
          Object.assign(fx, { maat: -6, gold: 600 });
          fx.approval.priesthood = -8;
          c.spouse = { name: r.ruler, kind: 'consort', seed: seedNum(s), tie: ref, origin: r.name };
          c.abroad = ref;
          c.role = `Queen in ${r.name}`;
          if (s.heirId === c.id) s.heirId = null;
          api.log(`Princess ${c.name} sails for ${r.name} to marry ${r.ruler}. Foreign courts cannot believe it, and the priests of Amun cannot forgive it.`);
        } else {
          r.relation = clamp(r.relation + 15, -100, 100);
          Object.assign(fx, { gold: 300 });
          fx.sons[c.id] = { legitimacy: 5 };
          c.spouse = { name: m.label.split(',')[0], kind: ref === 'hatti' ? 'wife-hatti' : ref === 'babylon' ? 'wife-babylon' : 'wife', seed: seedNum(s), age: Math.max(16, c.age - 4), tie: ref, origin: `A princess of ${r.name}` };
          api.log(`Prince ${c.name} marries ${c.spouse.name}. ${r.name} sends a dowry and its blessing.`);
        }
      } else if (kind === 'priestly') {
        fx.approval.priesthood = 6;
        fx.sons[c.id] = { legitimacy: 3 };
        c.spouse = c.sex === 'f'
          ? { name: m.label.split(',')[0], kind: 'consort', seed: seedNum(s), age: c.age + 2, tie: 'priesthood', origin: 'Nephew of the High Priest of Amun' }
          : { name: m.label.split(',')[0], kind: 'wife', seed: seedNum(s), age: Math.max(16, c.age - 3), tie: 'priesthood', origin: 'Niece of the High Priest of Amun' };
        api.log(`${title} ${c.name} marries into the High Priest’s family. Karnak approves.`);
      }
      api.fx(fx);
    },
  },
  'family.designate': {
    desk: 'family',
    cost: () => 2,
    label: (s, a) => `Name ${child(s, a.sonId)?.name} heir to the throne`,
    available(s, a) {
      const c = child(s, a.sonId);
      if (!c || !c.alive || c.abroad) return 'No such prince or princess.';
      if (s.heirId === a.sonId) return 'Already the heir.';
      if (c.office === 'gods_wife') return 'The God’s Wife of Amun cannot be heir.';
      return true;
    },
    run(s, a, api) {
      const old = heir(s);
      const nu = child(s, a.sonId);
      const fx = { sons: { [nu.id]: { legitimacy: 10, loyalty: 10 } }, wives: { [nu.motherId]: 25 }, approval: {} };
      if (old) {
        fx.sons[old.id] = { legitimacy: -10, loyalty: -20 };
        if (old.motherId !== nu.motherId) fx.wives[old.motherId] = -30;
      }
      const nuMother = wife(s, nu.motherId);
      if (nuMother && !nuMother.title.startsWith('Great') && !nuMother.title.startsWith('King’s Mother')) fx.approval.priesthood = -5;
      if (nu.sex === 'f') {
        fx.approval.priesthood = (fx.approval.priesthood || 0) - 10;
        fx.approval.military = -5;
        fx.maat = -4;
      }
      if (nu.rel === 'sibling') fx.sons[nu.id].legitimacy = 5;
      designateHeir(s, nu.id);
      api.fx(fx);
      api.log(nu.sex === 'f'
        ? `Princess ${nu.name} is proclaimed heir to the Two Lands. The priests search the temple archives for a precedent, and find Hatshepsut.`
        : `${nu.rel === 'sibling' ? 'Your brother ' : 'Prince '}${nu.name} is proclaimed Crown Prince in the Hall of Appearances.${old ? ` ${old.name} bows, and does not look up.` : ''}`);
    },
  },
  'family.ptah': {
    desk: 'family',
    cost: () => 1,
    label: (s, a) => `Make ${son(s, a.sonId)?.name} High Priest of Ptah`,
    available(s, a) {
      const sn = son(s, a.sonId);
      if (!sn || !sn.alive || !isAdult(sn)) return 'Only an adult prince.';
      if (s.flags.ptahPriest && son(s, s.flags.ptahPriest)?.alive) return 'Memphis already has a royal High Priest.';
      return true;
    },
    run(s, a, api) {
      const sn = son(s, a.sonId);
      s.flags.ptahPriest = sn.id;
      sn.role = 'High Priest of Ptah at Memphis';
      for (const u of units(s)) if (u.commanderId === sn.id) u.commanderId = null;
      api.fx({ approval: { priesthood: 6 }, sons: { [sn.id]: { loyalty: 5, legitimacy: 3 } } });
      api.log(`Prince ${sn.name} puts on the leopard skin of Ptah at Memphis. The northern temples have a royal master.`);
    },
  },
  'family.favor': {
    desk: 'family',
    cost: () => 1,
    label: (s, a) => `Spend the season with ${wife(s, a.wifeId)?.name}`,
    available: (s, a) => wife(s, a.wifeId)?.status === 'court' || 'Only the reigning Pharaoh’s own spouse.',
    run(s, a, api) {
      const w = wife(s, a.wifeId);
      const wives = {};
      for (const x of kingWives(s)) wives[x.id] = x.id === w.id ? 12 : -3;
      api.fx({ wives });
      const femaleKing = s.pharaoh.sex === 'f';
      api.log(femaleKing ? `Pharaoh spends the season with her consort ${w.name}.` : `Pharaoh spends the season in ${w.name}’s apartments. The rest of the harem counts the nights.`);
      const motherAge = femaleKing ? s.pharaoh.age : w.age ?? 30;
      if (!s.pregnancy && motherAge <= 40 && api.chance(0.35)) {
        s.pregnancy = { wifeId: femaleKing ? 'pharaoh' : w.id, dueTurn: s.turn + 3 };
        api.log(femaleKing ? 'Before the season ends, the physicians announce that Pharaoh herself is with child.' : `Before the season ends, the physicians announce that ${w.name} is with child.`);
      }
    },
  },
  'family.gift': {
    desk: 'family',
    cost: () => 1,
    label: (s, a) => `Grant estates to ${wife(s, a.wifeId)?.name}`,
    available: (s) => s.gold >= 250 || 'Not enough gold (250 deben).',
    run(s, a, api) {
      const w = wife(s, a.wifeId);
      w.influence = clamp(w.influence + 5, 0, 100);
      api.fx({ gold: -250, wives: { [w.id]: 15 } });
      api.log(`${w.name} receives a weaving estate in the Fayum and a chest of jewelry.`);
    },
  },
  'family.elevate': {
    desk: 'family',
    cost: () => 2,
    label: (s, a) => `Make ${wife(s, a.wifeId)?.name} Great Royal Wife`,
    available(s, a) {
      const w = wife(s, a.wifeId);
      if (s.pharaoh.sex === 'f') return 'A female Pharaoh has a consort, not a Great Royal Wife.';
      if (w?.title.startsWith('Great')) return 'She already is.';
      return w?.status === 'court' || 'Only the reigning Pharaoh’s own wives.';
    },
    run(s, a, api) {
      const nu = wife(s, a.wifeId);
      const old = s.wives.find((w) => w.status === 'court' && w.title.startsWith('Great'));
      const fx = { wives: { [nu.id]: 30 }, sons: {}, approval: {} };
      if (old) {
        old.title = 'Secondary Wife (set aside)';
        old.kind = old.kind === 'queen' ? 'wife' : old.kind;
        old.influence = clamp(old.influence - 15, 0, 100);
        fx.wives[old.id] = -40;
        for (const x of sonsOf(s, old.id)) fx.sons[x.id] = { legitimacy: -10 };
        if (old.tie === 'priesthood' || old.tie === 'bureaucracy') fx.approval[old.tie] = -10;
      }
      nu.title = 'Great Royal Wife';
      if (nu.kind === 'wife') nu.kind = 'queen';
      nu.influence = clamp(nu.influence + 20, 0, 100);
      for (const x of sonsOf(s, nu.id)) fx.sons[x.id] = { legitimacy: 10 };
      if (s.realms[nu.tie]) s.realms[nu.tie].relation = clamp(s.realms[nu.tie].relation + 20, -100, 100);
      if (s.realms[nu.tie]) fx.maat = -3;
      api.fx(fx);
      api.log(`${nu.name} is crowned Great Royal Wife.${old ? ` ${old.name} is moved to lesser apartments.` : ''}`);
    },
  },
  'family.sideline': {
    desk: 'family',
    cost: () => 1,
    label: (s, a) => `Banish ${wife(s, a.wifeId)?.name} from your presence`,
    run(s, a, api) {
      const w = wife(s, a.wifeId);
      w.influence = clamp(w.influence - 15, 0, 100);
      api.fx({ wives: { [w.id]: -20 } });
      api.log(`${w.name} is no longer received by Pharaoh. Her friends at court melt away, and she notices who leaves first.`);
    },
  },
  'family.take_wife': {
    desk: 'family',
    cost: () => 2,
    label: (s) => (s.pharaoh.sex === 'f' ? 'Take a consort' : 'Take a new wife'),
    available(s, a) {
      if (s.pharaoh.age < 14) return 'The king is too young to marry.';
      if (s.pharaoh.sex === 'f' && kingWives(s).length >= 1) return 'Pharaoh already has a consort.';
      if (kingWives(s).length >= 7) return 'The harem is full (7 wives at court).';
      const [kind, ref] = a.source.split(':');
      if (kind === 'foreign' && s.realms[ref].relation < 30) return `${s.realms[ref].name} will not send a ${s.pharaoh.sex === 'f' ? 'prince' : 'bride'} (relation below 30).`;
      return true;
    },
    run(s, a, api) {
      const [kind, ref] = a.source.split(':');
      const fk = s.pharaoh.sex === 'f';
      const others = {};
      for (const w of kingWives(s)) others[w.id] = -5;
      const spouseKind = (k) => (fk ? 'consort' : k);
      const spouseTitle = (t) => (fk ? 'King’s Husband (consort)' : t);
      const pickName = (key, female) => hashPick(female ? FEMALE_NAMES : MALE_NAMES, key);
      if (kind === 'nome') {
        const n = nome(s, ref);
        n.loyalty = clamp(n.loyalty + 15, 0, 100);
        newWife(s, { name: pickName(n.id + s.turn, !fk), title: spouseTitle('Secondary Wife'), origin: `${fk ? 'Son' : 'Daughter'} of ${n.nomarch}, Nomarch of ${n.name}`, tie: 'bureaucracy', kind: spouseKind('wife'), influence: 30, ambition: 60, satisfaction: 65 });
        api.fx({ wives: others, approval: { bureaucracy: 3 } });
        api.log(`The ${fk ? 'son' : 'daughter'} of ${n.nomarch} of ${n.name} comes to court. Her father is suddenly very loyal.`.replace('Her father', fk ? 'His father' : 'Her father'));
      } else if (kind === 'foreign') {
        const r = s.realms[ref];
        r.relation = clamp(r.relation + 15, -100, 100);
        const name = fk ? pickName(ref + s.turn, false) : hashPick(FOREIGN_BRIDES[ref] || FEMALE_NAMES, ref + s.turn);
        newWife(s, { name, title: spouseTitle(`${r.name.split(' ')[0]} Royal Wife`), origin: `${fk ? 'Son' : 'Daughter'} of ${r.ruler}`, tie: ref, kind: spouseKind(ref === 'hatti' ? 'wife-hatti' : ref === 'babylon' ? 'wife-babylon' : 'wife'), influence: 35, ambition: 55, satisfaction: 70 });
        api.fx({ wives: others, gold: 500 });
        api.log(`${name} arrives from ${r.name} with a dowry of gold, horses and three hundred attendants.`);
      } else if (kind === 'general') {
        const g = s.army.generals.find((x) => x.id === ref);
        g.loyalty = clamp(g.loyalty + 15, 0, 100);
        newWife(s, { name: fk ? `General ${g.name}` : pickName(g.id + s.turn, true), title: spouseTitle('Secondary Wife'), origin: fk ? 'A general of the army' : `Daughter of General ${g.name}`, tie: 'military', kind: spouseKind('wife'), influence: 25, ambition: 50, satisfaction: 65 });
        api.fx({ wives: others, approval: { military: 4 } });
        api.log(fk ? `General ${g.name} becomes Pharaoh’s consort. The army is delighted.` : `General ${g.name}’s daughter enters the harem. The general’s loyalty is assured, for now.`);
      } else {
        newWife(s, { name: pickName('harem' + s.turn, !fk), title: spouseTitle('Lady of the Harem'), origin: fk ? 'A courtier of the palace' : 'A beauty of the royal household', tie: 'none', kind: spouseKind('wife'), influence: 10, ambition: 30, satisfaction: 80 });
        api.fx({ wives: others });
        api.log(fk ? 'Pharaoh chooses a consort from among the courtiers. He brings no allies, and no enemies yet.' : 'A new lady of the harem catches Pharaoh’s eye. She brings no allies, and no enemies yet.');
      }
    },
  },

  // 🏛️ COURT ───────────────────────────────────────────────────────────────
  'court.shortlist': {
    desk: 'court',
    cost: () => 0,
    label: (s, a) => `Summon candidates for ${OFFICES[a.office]}`,
    available: (s, a) => !(s.shortlists && s.shortlists[a.office]) || 'Candidates already summoned this season.',
    run(s, a, api) {
      s.shortlists = s.shortlists || {};
      s.shortlists[a.office] = candidates(s, a.office);
      api.log(`Three candidates wait in the antechamber for the office of ${OFFICES[a.office]}.`);
    },
  },
  'court.appoint': {
    desk: 'court',
    cost: () => 1,
    label: (s, a) => `Appoint a new ${OFFICES[a.office]}`,
    available(s, a) {
      if (a.candidateId.startsWith('son:')) {
        const sn = son(s, a.candidateId.slice(4));
        if (!sn || !isAdult(sn)) return 'Only an adult son.';
        if (a.office === 'highPriest') return 'Karnak will not take a prince as High Priest of Amun.';
        return true;
      }
      return (s.shortlists?.[a.office] || []).some((c) => c.id === a.candidateId) || 'Summon candidates first.';
    },
    run(s, a, api) {
      const old = s[a.office];
      let nu;
      const fx = { approval: {} };
      if (a.candidateId.startsWith('son:')) {
        const sn = son(s, a.candidateId.slice(4));
        nu = personFromSon(sn);
        sn.role = OFFICES[a.office];
        fx.sons = { [sn.id]: { legitimacy: 5, loyalty: 5 } };
      } else {
        const c = s.shortlists[a.office].find((x) => x.id === a.candidateId);
        nu = { ...c };
        delete nu.fx;
        Object.assign(fx.approval, c.fx);
      }
      nu.title = OFFICES[a.office];
      if (a.office === 'highPriest') {
        fx.approval.priesthood = (fx.approval.priesthood || 0) + (nu.origin === 'priest' ? -5 : -15);
        s.flags.amunDebt = false;
      }
      if (old?.sonId) {
        const prev = son(s, old.sonId);
        if (prev) {
          prev.role = 'King’s Son';
          fx.sons = { ...(fx.sons || {}), [prev.id]: { loyalty: -10 } };
        }
      }
      s[a.office] = nu;
      if (s.shortlists) s.shortlists[a.office] = null;
      api.fx(fx);
      api.log(`${nu.name} receives the seal of ${OFFICES[a.office]}. ${old ? `${old.name} retires to his estates${old.ambition > 65 ? ', and does not forgive it' : ''}.` : ''}`);
    },
  },
  'court.reward': {
    desk: 'court',
    cost: () => 1,
    cooldown: 3,
    key: (a) => `reward-${a.office}`,
    label: (s, a) => `Reward ${s[a.office]?.name}`,
    available: (s) => s.gold >= 200 || 'Not enough gold (200 deben).',
    run(s, a, api) {
      const o = s[a.office];
      o.loyalty = clamp(o.loyalty + 15, 0, 100);
      o.integrity = clamp(o.integrity - 3, 0, 100);
      api.fx({ gold: -200 });
      api.log(`${o.name} receives the Gold of Praise. His loyalty grows, and so does his appetite.`);
    },
  },

  // 🗺️ THE TWO LANDS ───────────────────────────────────────────────────────
  'nome.audit': {
    desk: 'nomes',
    cost: () => 1,
    cooldown: 3,
    key: (a) => `audit-${a.nomeId}`,
    label: (s, a) => `Audit ${nome(s, a.nomeId).name}`,
    run(s, a, api) {
      const n = nome(s, a.nomeId);
      const hidden = n.loyalty < 30 ? 0.25 : n.loyalty < 45 ? 0.12 : 0.04;
      const found = Math.round(s.baselineIntake * n.share * hidden * (s.vizier.competence / 65));
      n.loyalty = clamp(n.loyalty - 15, 0, 100);
      const fx = { grain: found, approval: { bureaucracy: -2 }, maat: 1 };
      if (n.kinOf && wife(s, n.kinOf)) fx.wives = { [n.kinOf]: -8 };
      api.fx(fx);
      api.log(`The Vizier’s scribes count the granaries of ${n.name} and find ${fmt(found)} khar that nobody had reported.`);
    },
  },
  'nome.visit': {
    desk: 'nomes',
    cost: () => 2,
    cooldown: 3,
    key: (a) => `visit-${a.nomeId}`,
    label: (s, a) => `Royal progress to ${nome(s, a.nomeId).name}`,
    run(s, a, api) {
      const n = nome(s, a.nomeId);
      n.loyalty = clamp(n.loyalty + 15, 0, 100);
      s.pharaoh.away = true;
      api.fx({ maat: 2, health: -2 });
      api.log(`The royal barge moors at ${n.name}. Nomarch ${n.nomarch} kneels on his own quay before his people.`);
    },
  },
  'nome.heredity': {
    desk: 'nomes',
    cost: () => 1,
    label: (s, a) => `Confirm heredity in ${nome(s, a.nomeId).name}`,
    available: (s, a) => !nome(s, a.nomeId).hereditary || 'Already hereditary.',
    run(s, a, api) {
      const n = nome(s, a.nomeId);
      n.hereditary = true;
      n.loyalty = clamp(n.loyalty + 25, 0, 100);
      n.yield = Math.round(n.yield * 0.95 * 100) / 100;
      const fx = { approval: { bureaucracy: 3 } };
      if (n.kinOf && wife(s, n.kinOf)) fx.wives = { [n.kinOf]: 10 };
      api.fx(fx);
      api.log(`A stela at ${n.name} declares that the house of ${n.nomarch} will hold the nome forever. It will send a little less grain from now on.`);
    },
  },
  'nome.revoke': {
    desk: 'nomes',
    cost: () => 1,
    label: (s, a) => `Revoke heredity in ${nome(s, a.nomeId).name}`,
    available: (s, a) => nome(s, a.nomeId).hereditary || 'The nome is not hereditary.',
    run(s, a, api) {
      const n = nome(s, a.nomeId);
      n.hereditary = false;
      n.loyalty = clamp(n.loyalty - 30, 0, 100);
      n.yield = Math.round(n.yield * 1.05 * 100) / 100;
      api.fx({ approval: { bureaucracy: -4 } });
      api.log(`The stela at ${n.name} is pulled down. Nomarch ${n.nomarch} serves at Pharaoh’s pleasure again.`);
    },
  },
  'nome.replace': {
    desk: 'nomes',
    cost: () => 2,
    label: (s, a) => `Replace the Nomarch of ${nome(s, a.nomeId).name}`,
    run(s, a, api) {
      const n = nome(s, a.nomeId);
      const old = n.nomarch;
      n.nomarch = hashPick(MALE_NAMES, n.id + s.turn);
      n.seed = seedNum(s);
      const fx = { approval: { bureaucracy: n.hereditary ? -8 : -4 } };
      n.loyalty = n.hereditary ? 25 : 55;
      n.hereditary = false;
      if (n.kinOf && wife(s, n.kinOf)) {
        fx.wives = { [n.kinOf]: -20 };
        for (const x of sonsOf(s, n.kinOf)) (fx.sons = fx.sons || {})[x.id] = { loyalty: -8 };
        n.kinOf = null;
      }
      api.fx(fx);
      api.log(`${old} is removed. ${n.nomarch}, a man of the Vizier’s choosing, takes the seals of ${n.name}.`);
    },
  },
  'nome.canal': {
    desk: 'nomes',
    cost: () => 1,
    label: (s, a) => `Dig new canals in ${nome(s, a.nomeId).name}`,
    available: (s, a) => (nome(s, a.nomeId).canalUntil ? 'Canals are already being dug.' : s.grain.royal >= 60000 || 'Not enough grain (60,000 khar).'),
    run(s, a, api) {
      const n = nome(s, a.nomeId);
      n.canalUntil = s.turn + 3;
      n.loyalty = clamp(n.loyalty + 3, 0, 100);
      api.fx({ grain: -60000, approval: { bureaucracy: 1 } });
      api.log(`Corvée gangs begin digging new canals in ${n.name}. In a year, its fields will yield more.`);
    },
  },

  // 🌍 FOREIGN COURTS ─────────────────────────────────────────────────────
  'foreign.gift': {
    desk: 'foreign',
    cost: () => 1,
    cooldown: 1,
    key: (a) => `gift-${a.realm}`,
    label: (s, a) => `Send ${a.size === 'lavish' ? 'lavish' : 'modest'} gifts to ${s.realms[a.realm].name}`,
    available: (s, a) => s.gold >= (a.size === 'lavish' ? 900 : 300) || 'Not enough gold.',
    run(s, a, api) {
      const r = s.realms[a.realm];
      const d = a.size === 'lavish' ? 25 : 10;
      r.relation = clamp(r.relation + d, -100, 100);
      api.fx({ gold: a.size === 'lavish' ? -900 : -300 });
      if (a.realm === 'babylon' && r.relation >= 40) s.flags.babylonOffer = true;
      if (a.realm === 'hatti' && r.relation >= 50) Object.assign(s.flags, { hittiteCold: false, hittiteFriend: true });
      api.log(`Gold goes to ${r.ruler}. “Gold is as dust in Egypt,” his scribes write, and ask for more. Relation +${d}.`);
    },
  },
  'foreign.trade': {
    desk: 'foreign',
    cost: () => 1,
    cooldown: 3,
    key: (a) => `trade-${a.realm}`,
    label: (s, a) => `Trade with ${s.realms[a.realm].name}`,
    available(s, a) {
      const r = s.realms[a.realm];
      if (r.hostile) return 'They do not trade; they raid.';
      if (r.relation < 0) return `${r.name} refuses to trade.`;
      const need = { hatti: 100000, alashiya: 80000, canaan: 50000 }[a.realm];
      if (need) return s.grain.royal >= need || `Not enough grain (${fmt(need)} khar).`;
      return s.gold >= 300 || 'Not enough gold (300 deben).';
    },
    run(s, a, api) {
      const r = s.realms[a.realm];
      r.relation = clamp(r.relation + 5, -100, 100);
      if (a.realm === 'hatti') {
        unit(s, 'chariotry').quality = clamp(unit(s, 'chariotry').quality + 8, 0, 95);
        api.fx({ grain: -100000 });
        api.log('Egyptian grain for Hittite horses. The Chariot Corps gets the best teams it has had in a generation.');
      } else if (a.realm === 'alashiya') {
        for (const u of units(s)) if (u.kind === 'infantry') u.quality = clamp(u.quality + 3, 0, 95);
        api.fx({ grain: -80000 });
        api.log('Copper ingots from Alashiya become bronze spearheads for every division.');
      } else if (a.realm === 'canaan') {
        api.fx({ grain: -50000, gold: 350 });
        api.log('Canaanite merchants pay for Egyptian grain in silver.');
      } else {
        api.fx({ gold: -300, approval: { priesthood: 4 }, maat: 2 });
        api.log(`Lapis lazuli and fine horses from ${r.name} adorn the temples and the royal stables.`);
      }
    },
  },
  'foreign.tribute': {
    desk: 'foreign',
    cost: () => 1,
    cooldown: 3,
    key: () => 'tribute',
    label: () => 'Demand tribute from the Canaanite vassals',
    run(s, a, api) {
      const r = s.realms.canaan;
      const garrison = units(s).some((u) => u.station === 'canaan');
      if (garrison) {
        r.relation = clamp(r.relation - 10, -100, 100);
        api.fx({ gold: 600, maat: 2 });
        api.log('With Egyptian spears in their streets, the vassal kings pay: silver, cedar and chariots.');
      } else {
        r.relation = clamp(r.relation - 15, -100, 100);
        api.fx({ approval: { military: -2 } });
        api.log('Without a garrison to enforce it, the demand is met with excuses and a little silver. The vassals have noticed that the army is far away.');
      }
    },
  },

  // 🧱 MONUMENTS ──────────────────────────────────────────────────────────
  'monument.start': {
    desk: 'monuments',
    cost: () => 1,
    label: (s, a) => `Begin the ${MONUMENT_CATALOG[a.catalogId].name}`,
    available: (s, a) => !s.monuments.some((m) => m.catalogId === a.catalogId && !m.done) || 'Already under construction.',
    run(s, a, api) {
      api.fx({ monument: a.catalogId });
      api.log(`Surveyors stretch the cords for the ${MONUMENT_CATALOG[a.catalogId].name}.`);
    },
  },
  'monument.pause': {
    desk: 'monuments',
    cost: () => 0,
    label: (s, a) => `${s.monuments.find((m) => m.id === a.id)?.paused ? 'Resume' : 'Pause'} work`,
    available: (s, a) => Boolean(s.monuments.find((m) => m.id === a.id && !m.done && !m.ongoing)) || 'Nothing to pause.',
    run(s, a, api) {
      const m = s.monuments.find((x) => x.id === a.id);
      m.paused = !m.paused;
      if (m.paused) api.fx({ maat: -1, approval: { priesthood: -2 } });
      api.log(m.paused ? `Work stops on the ${m.name}. The crews go home and the priests frown.` : `The crews return to the ${m.name}.`);
    },
  },
};


Object.assign(ACTIONS, MORE_ACTIONS);
