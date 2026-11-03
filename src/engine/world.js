// The known world: provinces, vassals, wars of conquest, buildings, expeditions
// and the ranking of the great powers.
import { clamp, fmt } from './util.js';
import { random, chance } from './rng.js';
import { units, unitPower, syncArmyBurn } from './army.js';
import { changeMaat, changeApproval } from './realm.js';
import { PROVINCES, REGIONS, REALM_POWER, NOME_BUILDINGS, PROVINCE_BUILDINGS, EXPEDITIONS } from '../content/world.js';

export const initialProvinces = () => PROVINCES.map((p) => ({ unrest: 0, buildings: [], occupiedBy: null, siege: 0, ...p }));
export function initialRealmPower(realms) {
  for (const [id, r] of Object.entries(realms)) Object.assign(r, { ...REALM_POWER[id], baseArmy: REALM_POWER[id]?.army ?? 3000, truceUntil: 0 });
}

export const province = (s, id) => s.provinces.find((p) => p.id === id);
export const frontOf = (p) => REGIONS[p.region].front;
export const isEgyptian = (p) => p.owner === 'egypt';
export const egyptProvinces = (s) => s.provinces.filter((p) => p.owner === 'egypt');
export const realmProvinces = (s, realm) => s.provinces.filter((p) => p.owner === realm);
export const provinceValue = (p) => Math.round(10 + p.dev / 5 + (p.capital ? 15 : 0));
export const built = (s, place, type) => (place.buildings || []).some((b) => b.type === type && b.readyTurn <= s.turn);
export const building = (place, type) => (place.buildings || []).find((b) => b.type === type);

/** Can Egypt's armies reach this province? */
export function reachable(s, p) {
  if (!p.requires) return true;
  return p.requires.some((id) => {
    const q = province(s, id);
    return q && (q.owner === 'egypt' || q.occupiedBy === 'egypt');
  });
}

export function defenseOf(s, p) {
  return p.defense + (built(s, p, 'fort') ? 30 : 0);
}

/** Men of Egypt's army standing at a front (police excluded). */
export function frontPower(s, front) {
  return units(s).filter((u) => u.station === front && u.kind !== 'police').reduce((t, u) => t + unitPower(s, u), 0);
}

export function enemyFrontPower(s, realm) {
  const r = s.realms[realm];
  const share = ['hatti', 'assyria', 'babylon'].includes(realm) ? 0.6 : 1;
  return r.army * share * (r.quality / 60);
}

// ── Income ──────────────────────────────────────────────────────────────

/** The year's gold, line by line. Paid out at the end of Shemu. */
export function goldLedger(s) {
  const lines = [];
  for (const p of egyptProvinces(s)) {
    if (p.occupiedBy) continue;
    const base = p.gold * (p.dev / 50) * (1 - p.unrest / 150);
    const amount = Math.round(p.status === 'vassal' ? base * 0.5 : base);
    lines.push({ label: `${p.status === 'vassal' ? 'Tribute' : 'Taxes'}: ${p.name}`, amount });
    for (const b of p.buildings || []) {
      const def = PROVINCE_BUILDINGS[b.type];
      if (def.income && b.readyTurn <= s.turn) lines.push({ label: `${def.name}, ${p.name}`, amount: def.income });
    }
  }
  for (const n of s.nomes) {
    for (const b of n.buildings || []) {
      const def = NOME_BUILDINGS[b.type];
      if (def.income && b.readyTurn <= s.turn) lines.push({ label: `${def.name}, ${n.name}`, amount: def.income });
    }
  }
  const estates = s.flags.estatesOverseer && [...s.daughters || []].find((d) => d.id === s.flags.estatesOverseer && d.alive);
  if (estates) lines.push({ label: `Royal estates at Mi-wer (Princess ${estates.name})`, amount: 150 });
  const sherden = units(s).filter((u) => u.kind === 'mercenary').reduce((t, u) => t + u.men, 0);
  if (sherden) lines.push({ label: 'Pay of the foreign mercenaries', amount: -Math.round(sherden / 10) });
  return { lines, total: lines.reduce((t, l) => t + l.amount, 0) };
}

/** Grain sent home each season from provinces under direct rule. */
export function provinceGrain(s) {
  return egyptProvinces(s)
    .filter((p) => p.status === 'province' && !p.occupiedBy)
    .reduce((t, p) => t + (p.grain / 3) * (1 - p.unrest / 200), 0);
}

// ── Seasonal world simulation ──────────────────────────────────────────

export function worldSeason(s, report) {
  // Provinces: unrest drifts, buildings finish, revolts break out.
  for (const p of egyptProvinces(s)) {
    const garrison = units(s).filter((u) => u.station === frontOf(p)).reduce((t, u) => t + u.men, 0);
    let d = p.status === 'vassal' ? 1 : 2;
    if (garrison >= 2000) d -= 3;
    else if (garrison >= 1000) d -= 1;
    if (built(s, p, 'fort')) d -= 2;
    if (built(s, p, 'temple')) d -= 1;
    if (s.maat < 30) d += 2;
    p.unrest = clamp(p.unrest + d, 0, 100);
    if (p.unrest >= 85 && !s.wars.some((w) => w.enemy === p.natural)) revolt(s, p, report);
  }
  for (const place of [...s.provinces, ...s.nomes]) {
    for (const b of place.buildings || []) {
      if (b.readyTurn === s.turn + 1 && !b.announced) {
        b.announced = true;
        finishBuilding(s, place, b, report);
      }
    }
  }
  // Foreign armies recover.
  for (const r of Object.values(s.realms)) {
    if (r.baseArmy) r.army = Math.min(r.baseArmy, Math.round(r.army * 1.04 + 100));
  }
  // Wars.
  for (const w of [...s.wars]) warSeason(s, w, report);
  // Expeditions return.
  for (const e of [...(s.expeditions || [])]) {
    if (e.returnTurn > s.turn + 1) continue;
    s.expeditions = s.expeditions.filter((x) => x !== e);
    returnExpedition(s, e, report);
  }
}

function finishBuilding(s, place, b, report) {
  const def = NOME_BUILDINGS[b.type] && place.nomarch ? NOME_BUILDINGS[b.type] : PROVINCE_BUILDINGS[b.type];
  report.push(`The ${def.name} at ${place.name} is finished.`);
  if (b.type === 'temple' && place.nomarch) {
    changeMaat(s, 2);
    changeApproval(s, 'priesthood', 3);
    place.loyalty = clamp(place.loyalty + 5, 0, 100);
  } else if (b.type === 'temple') changeMaat(s, 1);
  if (b.type === 'stud') {
    const c = units(s).find((u) => u.kind === 'chariots');
    if (c) c.quality = clamp(c.quality + 10, 0, 95);
  }
  if (b.type === 'storehouse') place.yield = Math.round(place.yield * 1.03 * 100) / 100;
}

function revolt(s, p, report) {
  const rebel = p.natural === 'egypt' ? 'canaan' : p.natural;
  p.owner = rebel;
  p.status = 'province';
  p.unrest = 0;
  report.push(`**${p.name} rises in revolt** and throws out the Egyptian commissioner. It now answers to ${s.realms[rebel].name}.`);
  changeMaat(s, -4);
  if (!s.wars.some((w) => w.enemy === rebel)) {
    s.wars.push(newWar(s, rebel, 'rebellion', p.id, true));
    report.push(`Egypt is at war with ${s.realms[rebel].name}.`);
  }
}

export function newWar(s, enemy, cb, target, defensive = false) {
  return { id: `war-${enemy}-${s.turn}`, enemy, cb, target, score: 0, start: s.turn, defensive, log: [] };
}

function warSeason(s, w, report) {
  const r = s.realms[w.enemy];
  const target = province(s, w.target);
  const front = target ? frontOf(target) : 'canaan';
  const ours = frontPower(s, front);
  const theirs = enemyFrontPower(s, w.enemy) + (target && target.owner === w.enemy ? defenseOf(s, target) * 40 : 0);
  // Supply.
  const supply = ours > 0 ? 20000 : 0;
  s.grain.royal = Math.max(0, s.grain.royal - supply);
  const ratio = theirs > 0 ? ours / theirs : 3;
  const p = clamp(0.5 + (ratio - 1) * 0.45, 0.06, 0.94);
  const front_units = units(s).filter((u) => u.station === front && u.kind !== 'police');
  let line;
  if (!front_units.length) {
    // Nobody to stop them: the enemy raids or besieges an Egyptian province on this front.
    const victim = egyptProvinces(s).filter((x) => frontOf(x) === front && !x.occupiedBy).sort((a, b) => defenseOf(s, a) - defenseOf(s, b))[0];
    w.score = clamp(w.score - 10, -100, 100);
    if (victim && chance(s, 0.5)) {
      victim.occupiedBy = w.enemy;
      w.score = clamp(w.score - provinceValue(victim), -100, 100);
      line = `With no Egyptian army on the ${REGIONS[victim.region].name} front, ${r.name} takes **${victim.name}**.`;
    } else line = `${r.name} raids unopposed. No Egyptian army stands on the ${front === 'canaan' ? 'northern' : front === 'south' ? 'southern' : 'western'} front.`;
  } else if (chance(s, p)) {
    r.army = Math.round(r.army * 0.9);
    for (const u of front_units) u.men = Math.max(500, Math.round((u.men * 0.97) / 100) * 100);
    w.score = clamp(w.score + 8, -100, 100);
    line = `Victory in the field against ${r.name}.`;
    if (target && target.owner === w.enemy && !target.occupiedBy) {
      target.siege = clamp(target.siege + Math.round(25 + 25 * Math.min(2, ratio)), 0, 100);
      if (target.siege >= 100) {
        target.occupiedBy = 'egypt';
        target.siege = 0;
        w.score = clamp(w.score + provinceValue(target), -100, 100);
        line += ` **${target.name} falls** and is occupied by Egyptian troops.`;
        s.flags.victory = true;
      } else line += ` The siege of ${target.name} advances (${target.siege}%).`;
    }
  } else {
    for (const u of front_units) {
      u.men = Math.max(500, Math.round((u.men * 0.9) / 100) * 100);
      u.morale = clamp(u.morale - 10, 5, 100);
    }
    r.army = Math.round(r.army * 0.96);
    w.score = clamp(w.score - 10, -100, 100);
    line = `Defeat. ${r.name} drives back the Egyptian army${target ? ` before ${target.name}` : ''}.`;
    changeMaat(s, -2);
  }
  syncArmyBurn(s);
  const seasons = s.turn - w.start;
  if (seasons >= 6) {
    changeApproval(s, 'military', -2);
    line += ' The army is weary of this war.';
  }
  w.log.push(line);
  report.push(`⚔️ *War with ${r.name}:* ${line} War score ${w.score}.${supply ? ` Supplying the army cost ${fmt(supply)} khar.` : ''}`);

  // The enemy decides whether this war is still worth fighting.
  const apply = (terms) => {
    const out = makePeace(s, w, terms, (t) => report.push(`🕊️ ${t}`));
    if (out.gold) s.gold = Math.max(0, s.gold + out.gold);
    if (out.maat) changeMaat(s, out.maat);
    for (const [b, d] of Object.entries(out.approval || {})) changeApproval(s, b, d);
  };
  if (w.score <= -60) {
    report.push(`**${r.ruler} dictates peace.** Egypt has lost this war.`);
    apply('concede');
  } else if (w.score >= 70 && w.defensive) {
    report.push(`**${r.ruler} sues for peace** and pays to be left alone.`);
    apply('tribute');
  } else if (seasons >= 9 && Math.abs(w.score) < 30) {
    report.push(`Both sides are exhausted. **The war with ${r.name} ends** without a victor.`);
    apply('white');
  }
}

/** Peace terms the enemy will accept at the current war score. */
export function peaceTerms(s, w) {
  const occupied = s.provinces.filter((p) => p.owner === w.enemy && p.occupiedBy === 'egypt');
  const lost = s.provinces.filter((p) => p.owner === 'egypt' && p.occupiedBy === w.enemy);
  const need = occupied.reduce((t, p) => t + provinceValue(p), 0);
  const small = !['hatti', 'assyria', 'babylon'].includes(w.enemy);
  return [
    { id: 'annex', label: `Annex ${occupied.map((p) => p.name).join(', ') || 'occupied provinces'}`, ok: occupied.length > 0 && w.score >= need, need },
    { id: 'vassal', label: `Make ${s.realms[w.enemy].name} a vassal of Egypt`, ok: small && w.score >= 60 && realmProvinces(s, w.enemy).length > 0, need: 60 },
    { id: 'tribute', label: `Demand ${fmt(Math.max(0, w.score) * 25)} deben in tribute`, ok: w.score >= 25, need: 25 },
    { id: 'white', label: 'Make peace with no gains', ok: w.score >= -20, need: -20 },
    { id: 'concede', label: `Concede${lost.length ? ` ${lost.map((p) => p.name).join(', ')}` : ''} and pay ${fmt(Math.max(0, -w.score) * 20)} deben`, ok: true, need: -100 },
  ];
}

export function makePeace(s, w, termId, log) {
  const r = s.realms[w.enemy];
  const occupied = s.provinces.filter((p) => p.owner === w.enemy && p.occupiedBy === 'egypt');
  const lost = s.provinces.filter((p) => p.owner === 'egypt' && p.occupiedBy === w.enemy);
  const fx = {};
  if (termId === 'annex') {
    for (const p of occupied) Object.assign(p, { owner: 'egypt', status: 'province', unrest: 50, occupiedBy: null, siege: 0 });
    fx.maat = 6 + occupied.length * 2;
    fx.approval = { military: 8 };
    log(`${r.ruler} signs away ${occupied.map((p) => p.name).join(', ')}. Egypt’s borders grow, as a Pharaoh’s should.`);
  } else if (termId === 'vassal') {
    for (const p of realmProvinces(s, w.enemy)) Object.assign(p, { owner: 'egypt', status: 'vassal', unrest: 40, occupiedBy: null, siege: 0 });
    fx.maat = 10;
    fx.approval = { military: 10 };
    log(`${r.ruler} kneels and swears to be the servant of Pharaoh. All of ${r.name} now pays tribute to Egypt.`);
  } else if (termId === 'tribute') {
    fx.gold = Math.max(0, w.score) * 25;
    fx.maat = 3;
    log(`${r.name} pays ${fmt(fx.gold)} deben of gold to end the war.`);
  } else if (termId === 'white') {
    log(`Peace with ${r.name}. The armies go home, and nobody carves a victory stela.`);
  } else {
    for (const p of lost) Object.assign(p, { owner: w.enemy, status: 'province', occupiedBy: null, unrest: 0 });
    fx.gold = -Math.min(s.gold, Math.max(0, -w.score) * 20);
    fx.maat = -6 - lost.length * 3;
    fx.approval = { military: -6 };
    log(`Egypt sues for peace.${lost.length ? ` ${lost.map((p) => p.name).join(', ')} ${lost.length > 1 ? 'are' : 'is'} lost.` : ''} The scribes will not carve this on any wall.`);
  }
  // Anything still occupied goes home.
  for (const p of s.provinces) if (p.occupiedBy === w.enemy || (p.owner === w.enemy && p.occupiedBy === 'egypt')) Object.assign(p, { occupiedBy: null, siege: 0 });
  s.wars = s.wars.filter((x) => x !== w);
  r.truceUntil = s.turn + 6;
  r.relation = clamp(termId === 'white' ? -20 : -40, -100, 100);
  return fx;
}

/** At the start of each year, a hostile neighbour may attack. */
export function aiWars(s, report) {
  for (const [id, r] of Object.entries(s.realms)) {
    if (!r.baseArmy || s.wars.some((w) => w.enemy === id) || r.truceUntil > s.turn) continue;
    if (s.wives.some((w) => w.status === 'court' && w.tie === id)) continue; // a marriage alliance holds
    if (id === 'hatti' && s.flags.hattiTreaty !== false && r.relation > -50) continue;
    if (r.relation > -30) continue;
    const victims = egyptProvinces(s).filter((p) => !p.occupiedBy && s.provinces.some((q) => q.owner === id && REGIONS[q.region].front === frontOf(p)));
    if (!victims.length) continue;
    const victim = victims[Math.floor(random(s) * victims.length)];
    const odds = r.aggression * Math.min(2, enemyFrontPower(s, id) / Math.max(4000, frontPower(s, frontOf(victim))));
    if (!chance(s, odds * 0.5)) continue;
    const w = newWar(s, id, 'invasion', null, true);
    w.defending = victim.id;
    s.wars.push(w);
    report.push(`**${r.ruler} declares war on Egypt!** His armies march on ${victim.name}.`);
    s.forced.push({ eventId: 'war_declared', priority: 70, ctx: { realm: id, provinceId: victim.id }, since: s.turn + 1 });
  }
}

function returnExpedition(s, e, report) {
  const def = EXPEDITIONS[e.type];
  if (chance(s, def.risk)) {
    report.push(`**The ${def.name} is lost.** Storms, or worse. No ship comes home.`);
    return;
  }
  if (e.type === 'punt') {
    s.gold += 900;
    changeApproval(s, 'priesthood', 8);
    report.push('**The ships return from Punt** with myrrh trees, incense, ebony and electrum: 900 deben, and the temples rejoice. Priesthood +8%.');
  } else if (e.type === 'cedar') {
    s.gold += 200;
    for (const m of s.monuments) if (!m.done && !m.ongoing) m.progress = Math.min(99, m.progress + 15);
    report.push('Cedar logs from Byblos arrive at Pi-Ramesses. Every monument under construction jumps ahead, and the surplus sells for 200 deben.');
  } else if (e.type === 'turquoise') {
    s.gold += 250;
    report.push('The mining expedition returns from Sinai with turquoise and copper worth 250 deben.');
  }
}

// ── The great powers ────────────────────────────────────────────────────

export function powerTable(s) {
  const rows = [];
  const egyptGold = goldLedger(s).total + 1200;
  const egyptArmy = units(s).reduce((t, u) => t + u.men, 0);
  const egyptLand = 8 + egyptProvinces(s).length;
  rows.push({ id: 'egypt', name: 'Egypt', wealth: egyptGold + (s.baselineIntake / 1000) * 0.8, army: egyptArmy, land: egyptLand, prestige: s.maat });
  for (const [id, r] of Object.entries(s.realms)) {
    if (!r.baseArmy) continue;
    const provs = realmProvinces(s, id);
    const wealth = (r.gold || 0) + provs.reduce((t, p) => t + p.gold * (p.dev / 50), 0);
    rows.push({ id, name: r.name, wealth, army: r.army, land: provs.length * 2 + (id === 'hatti' || id === 'assyria' || id === 'babylon' ? 6 : 1), prestige: clamp(50 + provs.length * 3, 0, 100) });
  }
  const max = { wealth: 0, army: 0, land: 0 };
  for (const r of rows) for (const k of Object.keys(max)) max[k] = Math.max(max[k], r[k]);
  for (const r of rows) r.score = Math.round(40 * (r.wealth / max.wealth) + 30 * (r.army / max.army) + 15 * (r.land / max.land) + 15 * (r.prestige / 100));
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
