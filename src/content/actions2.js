// More royal commands: conquest, building, trade, spies, the regency,
// appointing the royal children, and paying the army right now.
import { fmt, clamp } from '../engine/util.js';
import { son, child as anyChild, isAdult, wife } from '../engine/realm.js';
import { unit, units, syncArmyBurn } from '../engine/army.js';
import { province, reachable, frontOf, newWar, peaceTerms, makePeace, provinceValue, egyptProvinces, building } from '../engine/world.js';
import { spyOn, targetName, SPY_TARGETS } from '../engine/spies.js';
import { MALE_NAMES, FEMALE_NAMES, seedNum } from '../engine/people.js';
import { NOME_BUILDINGS, PROVINCE_BUILDINGS, EXPEDITIONS, REGIONS } from './world.js';

const nome = (s, id) => s.nomes.find((n) => n.id === id);
const child = (s, id) => {
  const c = anyChild(s, id);
  return c && c.alive && !c.abroad ? c : null;
};
const war = (s, id) => s.wars.find((w) => w.id === id);
const GOLD_PER_KHAR = 1 / 180; // what grain costs abroad

export const CASUS_BELLI = {
  claim: { name: 'Reclaim Egypt’s lost lands', note: 'Pharaohs held Kadesh and Amurru in the days of Thutmose III. No penalty.' },
  rebellion: { name: 'Punish a rebel vassal', note: 'Rebels against Pharaoh defy Ma’at itself. No penalty.' },
  retribution: { name: 'Avenge the raids', note: 'They burned Egyptian villages. No penalty.' },
  conquest: { name: 'Extend the borders of Egypt', note: 'A Pharaoh’s ancient duty, but every foreign court takes note: all relations −10.' },
};

/** Which reason for war applies against this realm and province. */
export function casusBelli(s, realm, p) {
  if (p?.claim) return 'claim';
  if (p && p.natural !== realm && p.natural === 'canaan' && realm === 'canaan') return 'rebellion';
  if (realm === 'canaan' || (realm === 'kush' && s.provinces.some((x) => x.id === 'irem' && x.owner === 'kush'))) return 'rebellion';
  if (realm === 'libu' && s.realms.libu.relation < -40) return 'retribution';
  return 'conquest';
}

function placeOf(s, kind, id) {
  return kind === 'nome' ? nome(s, id) : province(s, id);
}

export const MORE_ACTIONS = {
  // ⚔️ PAY THE ARMY NOW ─────────────────────────────────────────────────
  'army.pay': {
    desk: 'army',
    cost: () => 0,
    label: (s, a) => `Pay ${a.months === 'all' ? 'all' : a.months} month${a.months === 1 ? '' : 's'} of arrears in ${a.with}`,
    available(s, a) {
      if (s.arrears.army <= 0) return 'The army is owed nothing.';
      const months = a.months === 'all' ? s.arrears.army : Math.min(a.months, s.arrears.army);
      if (a.with === 'gold') return s.gold >= Math.round(months * s.burn.army * GOLD_PER_KHAR * 1.2) || 'Not enough gold.';
      return s.grain.royal >= months * s.burn.army || 'Not enough grain in the royal granaries. Buy some, open the reserve, or pay in gold.';
    },
    run(s, a, api) {
      const months = a.months === 'all' ? s.arrears.army : Math.min(a.months, s.arrears.army);
      const fx = { arrears: { army: -months }, approval: { military: Math.round(months * 3) } };
      if (a.with === 'gold') fx.gold = -Math.round(months * s.burn.army * GOLD_PER_KHAR * 1.2);
      else fx.grain = -Math.round(months * s.burn.army);
      api.fx(fx);
      api.log(a.with === 'gold' ? `The soldiers are paid ${months} month${months === 1 ? '' : 's'} of arrears in gold rings. They grumble that gold cannot be eaten, but they take it.` : `The granary scribes measure out ${fmt(months * s.burn.army)} khar for the regiments.`);
    },
  },
  'army.pay_workforce': {
    desk: 'army',
    cost: () => 0,
    label: () => 'Pay the tomb-builders’ arrears',
    available: (s) => (s.arrears.workforce <= 0 ? 'The workforce is owed nothing.' : s.grain.royal >= s.arrears.workforce * s.burn.workforce || 'Not enough grain.'),
    run(s, a, api) {
      api.fx({ grain: -Math.round(s.arrears.workforce * s.burn.workforce), arrears: { workforce: -s.arrears.workforce }, maat: 2 });
      api.log('The craftsmen of the Place of Truth are paid in full.');
    },
  },
  'granary.bulk': {
    desk: 'granary',
    cost: () => 1,
    cooldown: 1,
    key: (a) => `bulk-${a.realm}`,
    label: (s, a) => `Buy 150,000 khar from ${s.realms[a.realm]?.name}`,
    available: (s, a) => (!s.realms[a.realm] ? 'No such court.' : s.realms[a.realm].relation < 0 ? `${s.realms[a.realm].name} will not sell to you.` : s.wars.some((w) => w.enemy === a.realm) ? 'You are at war with them.' : s.gold >= 900 || 'Not enough gold (900 deben).'),
    run(s, a, api) {
      api.fx({ gold: -900, grain: 150000 });
      api.log(`A grain fleet from ${s.realms[a.realm].name} unloads 150,000 khar at Pi-Ramesses for 900 deben of gold. Egypt buying grain abroad: the foreign courts will talk.`);
    },
  },
  'nome.requisition': {
    desk: 'nomes',
    cost: () => 1,
    cooldown: 3,
    key: (a) => `req-${a.nomeId}`,
    label: (s, a) => `Requisition grain from ${nome(s, a.nomeId)?.name}`,
    available: (s, a) => Boolean(nome(s, a.nomeId)) || 'No such nome.',
    run(s, a, api) {
      const n = nome(s, a.nomeId);
      const amount = Math.round(s.baselineIntake * n.share * 0.08);
      n.loyalty = clamp(n.loyalty - 12, 0, 100);
      api.fx({ grain: amount, maat: -1, approval: { bureaucracy: -2 } });
      api.log(`Royal scribes empty the storehouses of ${n.name}: ${fmt(amount)} khar for the crown. Nomarch ${n.nomarch} smiles, and remembers.`);
    },
  },

  // 🏗️ BUILDING ─────────────────────────────────────────────────────────
  'build': {
    desk: 'nomes',
    cost: () => 1,
    label: (s, a) => `Build ${(a.kind === 'nome' ? NOME_BUILDINGS : PROVINCE_BUILDINGS)[a.type].name} in ${placeOf(s, a.kind, a.id)?.name}`,
    available(s, a) {
      const place = placeOf(s, a.kind, a.id);
      const def = (a.kind === 'nome' ? NOME_BUILDINGS : PROVINCE_BUILDINGS)[a.type];
      if (!place || !def) return 'Nothing to build.';
      if (a.kind === 'province' && place.owner !== 'egypt') return 'Not an Egyptian province.';
      if (a.kind === 'province' && place.occupiedBy) return 'The province is occupied by the enemy.';
      if (building(place, a.type)) return 'Already built.';
      if (def.only && !def.only.includes(place.id)) return 'Only river ports can have a harbor.';
      if (def.needs && !def.needs.includes(place.resource)) return 'This province lacks the resource.';
      if (s.gold < def.gold) return `Needs ${def.gold} deben of gold.`;
      return s.grain.royal >= def.grain || `Needs ${fmt(def.grain)} khar of grain.`;
    },
    run(s, a, api) {
      const place = placeOf(s, a.kind, a.id);
      const def = (a.kind === 'nome' ? NOME_BUILDINGS : PROVINCE_BUILDINGS)[a.type];
      place.buildings = place.buildings || [];
      place.buildings.push({ type: a.type, readyTurn: s.turn + def.seasons });
      api.fx({ gold: -def.gold, grain: -def.grain });
      api.log(`Work begins on the ${def.name} at ${place.name}. It will be ready in ${def.seasons} seasons.`);
    },
  },
  'expedition': {
    desk: 'granary',
    cost: () => 1,
    label: (s, a) => `Send the ${EXPEDITIONS[a.type].name}`,
    available(s, a) {
      const e = EXPEDITIONS[a.type];
      if (!e) return 'Unknown expedition.';
      if ((s.expeditions || []).some((x) => x.type === a.type)) return 'That expedition is already under way.';
      if (a.type === 'punt' && !building(nome(s, 'coptos'), 'harbor')) return 'Build a harbor at Coptos first (the Red Sea road).';
      if (a.type === 'cedar' && province(s, 'byblos').owner !== 'egypt') return 'Byblos must be Egyptian.';
      if (a.type === 'turquoise' && province(s, 'sinai').owner !== 'egypt') return 'Sinai must be Egyptian.';
      if (s.gold < e.gold) return `Needs ${e.gold} deben.`;
      return s.grain.royal >= e.grain || `Needs ${fmt(e.grain)} khar.`;
    },
    run(s, a, api) {
      const e = EXPEDITIONS[a.type];
      s.expeditions = s.expeditions || [];
      s.expeditions.push({ type: a.type, returnTurn: s.turn + e.seasons });
      api.fx({ gold: -e.gold, grain: -e.grain });
      api.log(`The ${e.name} sets out. It will return in ${e.seasons} season${e.seasons > 1 ? 's' : ''}, if the gods allow.`);
    },
  },

  // 🌍 WAR AND PEACE ───────────────────────────────────────────────────
  'war.declare': {
    desk: 'world',
    cost: () => 2,
    label: (s, a) => `Declare war on ${s.realms[a.realm].name}`,
    available(s, a) {
      const r = s.realms[a.realm];
      const p = province(s, a.target);
      if (!r || !p || p.owner !== a.realm) return 'Choose a province they hold.';
      if (s.wars.some((w) => w.enemy === a.realm)) return 'Already at war with them.';
      if (r.truceUntil > s.turn) return `A truce holds for ${r.truceUntil - s.turn} more season(s).`;
      if (!reachable(s, p)) return `${p.name} is out of reach. Take ${p.requires.map((id) => province(s, id).name).join(' or ')} first.`;
      if (s.wars.length >= 2) return 'Egypt cannot fight three wars at once.';
      return true;
    },
    run(s, a, api) {
      const r = s.realms[a.realm];
      const p = province(s, a.target);
      const cb = casusBelli(s, a.realm, p);
      s.wars.push(newWar(s, a.realm, cb, p.id));
      r.relation = -60;
      const fx = { approval: { military: 6 } };
      if (cb === 'conquest') for (const x of Object.values(s.realms)) if (x !== r) x.relation = clamp(x.relation - 10, -100, 100);
      if (a.realm === 'hatti' && s.flags.hattiTreaty !== false) {
        s.flags.hattiTreaty = false;
        fx.maat = -12;
        fx.approval.priesthood = -8;
        api.log('The silver tablet of the eternal treaty, sworn before a thousand gods of Hatti and a thousand gods of Egypt, is broken.');
      }
      api.fx(fx);
      api.log(`War is declared on ${r.name}: ${CASUS_BELLI[cb].name}. The target is ${p.name}. Send your divisions to the ${REGIONS[p.region].front === 'canaan' ? 'Canaan garrisons' : REGIONS[p.region].front === 'south' ? 'south (Kush)' : 'western forts'} front, or the war will be fought without them.`);
    },
  },
  'war.target': {
    desk: 'world',
    cost: () => 0,
    label: (s, a) => `Besiege ${province(s, a.provinceId)?.name}`,
    available(s, a) {
      const w = war(s, a.warId);
      const p = province(s, a.provinceId);
      if (!w || !p || p.owner !== w.enemy || p.occupiedBy) return 'Not a valid target.';
      return reachable(s, p) || 'Out of reach.';
    },
    run(s, a, api) {
      war(s, a.warId).target = a.provinceId;
      api.log(`The army turns toward ${province(s, a.provinceId).name}.`);
    },
  },
  'war.peace': {
    desk: 'world',
    cost: () => 1,
    label: (s, a) => `Make peace: ${a.terms}`,
    available(s, a) {
      const w = war(s, a.warId);
      if (!w) return 'No such war.';
      const t = peaceTerms(s, w).find((x) => x.id === a.terms);
      return t?.ok || `The enemy will not accept (needs war score ${t?.need}).`;
    },
    run(s, a, api) {
      const w = war(s, a.warId);
      api.fx(makePeace(s, w, a.terms, api.log));
    },
  },
  'province.integrate': {
    desk: 'world',
    cost: () => 1,
    label: (s, a) => `Bring ${province(s, a.id)?.name} under direct rule`,
    available: (s, a) => (!province(s, a.id) ? 'No such province.' : province(s, a.id).owner !== 'egypt' || province(s, a.id).status !== 'vassal' ? 'Only a vassal.' : province(s, a.id).unrest <= 30 || 'Unrest must be 30 or less.'),
    run(s, a, api) {
      const p = province(s, a.id);
      p.status = 'province';
      p.unrest = clamp(p.unrest + 25, 0, 100);
      api.log(`${p.name}’s king is pensioned off. An Egyptian governor takes his seat, and his taxes. Unrest rises.`);
    },
  },
  'province.garrison_pay': {
    desk: 'world',
    cost: () => 1,
    cooldown: 2,
    key: (a) => `calm-${a.id}`,
    label: (s, a) => `Calm ${province(s, a.id)?.name} with gifts`,
    available: (s, a) => (province(s, a.id)?.owner !== 'egypt' ? 'Not an Egyptian province.' : s.gold >= 150 || 'Needs 150 deben.'),
    run(s, a, api) {
      const p = province(s, a.id);
      p.unrest = clamp(p.unrest - 20, 0, 100);
      api.fx({ gold: -150 });
      api.log(`Gifts for the elders of ${p.name}. Unrest falls.`);
    },
  },

  // 👁️ SPIES ────────────────────────────────────────────────────────────
  'spy.recruit': {
    desk: 'spies',
    cost: () => 1,
    label: (s, a) => `Plant a spy in ${targetName(s, a.type, a.target)}`,
    available(s, a) {
      if (!SPY_TARGETS[a.type] || !a.target || targetName(s, a.type, a.target) === a.target) return 'Unknown target.';
      if (spyOn(s, a.type, a.target)) return 'You already have a spy there.';
      if ((s.spies || []).length >= 8) return 'Your network is stretched thin (8 spies).';
      return s.gold >= 100 || 'A spy costs 100 deben to recruit.';
    },
    run(s, a, api) {
      const pool = Math.floor(s.rng % 2) ? MALE_NAMES : FEMALE_NAMES;
      const name = pool[(s.turn * 7 + (s.spies || []).length * 13 + a.target.length) % pool.length];
      s.spies = s.spies || [];
      s.spies.push({ id: `spy-${s.turn}-${s.spies.length}`, name, type: a.type, target: a.target, since: s.turn, seed: seedNum(s) });
      api.fx({ gold: -100 });
      api.log(`${name}, ${a.type === 'unit' ? 'a quartermaster' : a.type === 'realm' ? 'a merchant' : a.type === 'office' ? 'a junior scribe' : 'a servant'}, now reports to the King’s Eyes and Ears from inside ${targetName(s, a.type, a.target)}.`);
    },
  },
  'spy.recall': {
    desk: 'spies',
    cost: () => 0,
    label: () => 'Recall a spy',
    run(s, a, api) {
      s.spies = (s.spies || []).filter((x) => x.id !== a.spyId);
      api.log('The spy is quietly brought home.');
    },
  },
  'spy.arrest': {
    desk: 'spies',
    cost: () => 1,
    label: (s, a) => `Arrest the plotters around ${targetName(s, a.type, a.target)}`,
    available(s, a) {
      if (!spyOn(s, a.type, a.target)) return 'You need a spy there to gather evidence.';
      if (a.type === 'wife') return (wife(s, a.target)?.plot ?? 0) > 0 || 'There is no plot to expose.';
      if (a.type === 'unit') return unit(s, a.target)?.commanderId ? true : 'No commander.';
      if (a.type === 'office') return (s[a.target]?.integrity ?? 100) < 45 || (s[a.target]?.loyalty ?? 100) < 40 || 'The spy has found nothing to charge him with.';
      if (a.type === 'nome') return true;
      return 'Nothing to arrest.';
    },
    run(s, a, api) {
      const fx = { maat: 3 };
      if (a.type === 'wife') {
        const w = wife(s, a.target);
        w.plot = 0;
        w.rumored = false;
        w.influence = clamp(w.influence - 15, 0, 100);
        fx.wives = { [w.id]: -10 };
        api.log(`With the spy’s evidence, the cupbearer and the guard captain in ${w.name}’s household are arrested at night. Her plot dies with them, and she knows that you know.`);
      } else if (a.type === 'unit') {
        const u = unit(s, a.target);
        const id = u.commanderId;
        const g = s.army.generals.find((x) => x.id === id);
        for (const x of units(s)) if (x.commanderId === id) x.commanderId = null;
        if (g) s.army.generals = s.army.generals.filter((x) => x !== g);
        const sn = son(s, id);
        if (sn) {
          sn.role = 'Under guard at Memphis';
          fx.sons = { [sn.id]: { loyalty: -20, legitimacy: -15 } };
        }
        fx.approval = { military: -4 };
        api.log(`With the quartermaster’s evidence, ${g ? `General ${g.name}` : `Prince ${sn?.name}`} is arrested before the officers he was courting can act. The army is shaken, but holds.`);
      } else if (a.type === 'office') {
        const o = s[a.target];
        o.loyalty = 0;
        o.integrity = clamp(o.integrity + 20, 0, 100);
        fx.grain = 40000;
        api.log(`${o.name}’s accomplices are flogged before the Vizier’s court and 40,000 khar is recovered. He keeps his office, on a very short leash.`);
      } else {
        const n = nome(s, a.target);
        const old = n.nomarch;
        n.nomarch = MALE_NAMES[(s.turn + n.id.length) % MALE_NAMES.length];
        n.loyalty = 55;
        n.hereditary = false;
        n.ambition = 40;
        fx.grain = Math.round(s.baselineIntake * n.share * 0.1);
        api.log(`Armed with the spy’s ledgers, the Vizier removes ${old} for theft from the crown. ${fmt(fx.grain)} khar is recovered, and the other Nomarchs cannot call it injustice.`);
      }
      api.fx(fx);
    },
  },
  'spy.sabotage': {
    desk: 'spies',
    cost: () => 1,
    cooldown: 3,
    key: (a) => `sabotage-${a.target}`,
    label: (s, a) => `Sabotage the army of ${s.realms[a.target]?.name}`,
    available: (s, a) => (spyOn(s, 'realm', a.target) ? s.gold >= 200 || 'Needs 200 deben.' : 'You need a spy at that court.'),
    run(s, a, api) {
      const r = s.realms[a.target];
      r.army = Math.round(r.army * 0.88);
      api.fx({ gold: -200 });
      api.log(`Granaries burn in ${r.name}; a stable of chariot horses sickens. Their army is weaker by about an eighth.`);
    },
  },

  // 🦅 REGENCY ──────────────────────────────────────────────────────────
  'regency.assert': {
    desk: 'court',
    cost: () => 1,
    label: () => 'Assert the regent’s authority',
    available: (s) => Boolean(s.regency) || 'There is no regency.',
    run(s, a, api) {
      s.regency.authority = clamp(s.regency.authority + 12, 0, 100);
      api.fx({ approval: { bureaucracy: -3 } });
      api.log(`${s.regency.regent} summons the great men of the Two Lands and reminds them in whose name they serve.`);
    },
  },
  'regency.bribe': {
    desk: 'court',
    cost: () => 1,
    label: () => 'Buy the nobles’ loyalty',
    available: (s) => (s.regency ? s.gold >= 300 || 'Needs 300 deben.' : 'There is no regency.'),
    run(s, a, api) {
      s.regency.authority = clamp(s.regency.authority + 10, 0, 100);
      api.fx({ gold: -300 });
      api.log('Gold collars and estates are handed out in the boy-king’s name.');
    },
  },
  'regency.present': {
    desk: 'court',
    cost: () => 1,
    cooldown: 2,
    key: () => 'present',
    label: () => 'Present the young king at a festival',
    available: (s) => (s.regency ? s.grain.royal >= 30000 || 'Needs 30,000 khar.' : 'There is no regency.'),
    run(s, a, api) {
      s.regency.authority = clamp(s.regency.authority + 8, 0, 100);
      api.fx({ grain: -30000, maat: 3 });
      api.log(`${s.pharaoh.name}, still a child, is carried before the people at the Festival of the Valley. The crowds cheer the living Horus, and the nobles count the cheers.`);
    },
  },

  // 🪷 APPOINTING THE ROYAL CHILDREN ────────────────────────────────────
  'family.appoint': {
    desk: 'family',
    cost: () => 1,
    label: (s, a) => `Appoint ${child(s, a.childId)?.name}`,
    available(s, a) {
      const c = child(s, a.childId);
      if (!c || !isAdult(c)) return 'Only an adult prince or princess.';
      if (!a.post) return 'Choose a post.';
      const [kind, ref] = a.post.split(':');
      if (kind === 'chantress' || kind === 'estates') return c.sex === 'f' || 'Only a princess.';
      if (c.sex !== 'm') return 'That office goes to a prince.';
      if (kind === 'nome') return nome(s, ref) ? true : 'No such nome.';
      if (kind === 'province') return province(s, ref)?.owner === 'egypt' || 'Not an Egyptian province.';
      if (['vizier', 'vizierNorth', 'overseer', 'viceroy'].includes(kind)) return s[kind]?.sonId !== c.id || 'He already holds it.';
      return 'Unknown post.';
    },
    run(s, a, api) {
      const c = child(s, a.childId);
      const [kind, ref] = a.post.split(':');
      const fx = { sons: { [c.id]: { loyalty: 5, legitimacy: 3 } }, approval: {} };
      if (kind === 'chantress') {
        c.role = 'Chantress of Amun';
        fx.approval.priesthood = 4;
        api.log(`Princess ${c.name} joins the choir of Amun at Karnak, and hears everything said in the god’s house.`);
      } else if (kind === 'estates') {
        c.role = 'Overseer of the royal estates at Mi-wer';
        s.flags.estatesOverseer = c.id;
        fx.gold = 150;
        api.log(`Princess ${c.name} takes charge of the royal weaving estates of the Fayum. The first season’s accounts are already better.`);
      } else if (kind === 'nome') {
        const n = nome(s, ref);
        const old = n.nomarch;
        fx.approval.bureaucracy = n.hereditary ? -8 : -4;
        n.nomarch = `Prince ${c.name}`;
        n.seed = c.seed;
        n.loyalty = 70;
        n.hereditary = false;
        n.ambition = c.trait === 'ambitious' ? 80 : 45;
        n.governorId = c.id;
        if (n.kinOf && wife(s, n.kinOf)) fx.wives = { [n.kinOf]: -15 };
        n.kinOf = null;
        c.role = `Governor of ${n.name}`;
        api.log(`${old} is retired. Prince ${c.name} governs ${n.name} now, and its grain answers to the royal house. The other Nomarchs wonder whose nome is next.`);
      } else if (kind === 'province') {
        const p = province(s, ref);
        p.unrest = clamp(p.unrest - 15, 0, 100);
        p.governorId = c.id;
        c.role = `Governor of ${p.name}`;
        api.log(`Prince ${c.name} sails to govern ${p.name}. A king’s son in residence calms the province.`);
      } else {
        const comp = c.skill === 'administration' ? 72 : c.skill === 'statecraft' ? 66 : c.skill === 'martial' && kind === 'viceroy' ? 70 : 50;
        const titles = { vizier: 'Vizier of the South', vizierNorth: 'Vizier of the North', overseer: 'Overseer of the Granaries', viceroy: 'King’s Son of Kush (Viceroy)' };
        const old = s[kind];
        s[kind] = { id: c.id, kind: 'prince', seed: c.seed, name: `Prince ${c.name}`, title: titles[kind], age: c.age, competence: comp, integrity: 70, ambition: c.trait === 'ambitious' ? 80 : 45, loyalty: c.loyalty ?? 70, origin: 'son', sonId: c.id };
        c.role = titles[kind];
        api.log(`Prince ${c.name} receives the seal of the ${titles[kind]}. ${old?.name ?? 'His predecessor'} retires to his estates.`);
      }
      api.fx(fx);
    },
  },
};

export { egyptProvinces, provinceValue, frontOf };
