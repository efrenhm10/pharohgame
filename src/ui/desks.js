// The royal desks: every lever Pharaoh can pull besides the season's decree.
import { canPerform } from '../engine/game.js';
import { ACTIONS, matchOptions, OFFICES, CAMPAIGNS } from '../content/actions.js';
import { MONUMENT_CATALOG } from '../content/monuments.js';
import { STATIONS, units, commander, totalMen, avgMorale, coupThreat, armyPower, unitPower } from '../engine/army.js';
import { monthlyBurnBreakdown, monthlyBurn, reserveMonths, leakage, nomeYield, projectedIntake } from '../engine/economy.js';
import { heir, wife, sonsOf, isAdult, livingSons, kingWives, motherName, spouseName, livingDaughters } from '../engine/realm.js';
import { SCHOOLS, TRAITS } from '../engine/people.js';
import { goldLedger, provinceGrain, peaceTerms, reachable, defenseOf, frontPower, enemyFrontPower, provinceValue, powerTable, built, building, province } from '../engine/world.js';
import { spyOn, intel, targetName, SPY_TARGETS, SPY_UPKEEP } from '../engine/spies.js';
import { casusBelli, CASUS_BELLI } from '../content/actions2.js';
import { REGIONS, RESOURCES, NOME_BUILDINGS, PROVINCE_BUILDINGS, EXPEDITIONS } from '../content/world.js';
import { fmt, clamp } from '../engine/util.js';
import { portrait } from './portraits.js';
import { esc, md, meter, k, commandsLog } from './render.js';

// ── controls ─────────────────────────────────────────────────────────────

function cmd(s, id, args, label, { cls = '', hint = '' } = {}) {
  const ok = canPerform(s, id, args);
  const cost = ACTIONS[id].cost(s, args);
  const reason = ok === true ? hint : ok;
  // Unavailable commands stay tappable so they can explain why (tooltips do not work on phones).
  const off = ok === true ? '' : ` aria-disabled="true" data-reason="${esc(ok)}"`;
  return `<button class="cmd ${cls}${ok === true ? '' : ' is-off'}" data-cmd="${id}" data-args="${esc(JSON.stringify(args))}"${off} ${reason ? `title="${esc(reason)}"` : ''}>${label}${cost ? ` <span class="cost">⚡${cost}</span>` : ''}</button>`;
}

/** A segmented control for a standing policy. */
function seg(s, id, base, key, choices, current) {
  return `<div class="seg" role="group">${choices
    .map(([value, label]) => {
      const on = value === current;
      return `<button class="seg__btn${on ? ' on' : ''}" data-cmd="${id}" data-args="${esc(JSON.stringify({ ...base, [key]: value }))}" ${on ? 'aria-pressed="true" disabled' : 'aria-pressed="false"'}>${label}</button>`;
    })
    .join('')}</div>`;
}

/** A select that fires a command with the chosen value merged into args. */
function pickCmd(s, id, args, argName, choices, placeholder) {
  const cost = ACTIONS[id].cost(s, args);
  const opts = choices
    .map(([v, label]) => {
      const ok = canPerform(s, id, { ...args, [argName]: v });
      return `<option value="${esc(v)}" ${ok === true ? '' : 'disabled'}>${ok === true ? '' : '✗ '}${esc(label)}${ok === true ? '' : ` — ${esc(ok)}`}</option>`;
    })
    .join('');
  return `<select class="pick" data-cmd="${id}" data-args="${esc(JSON.stringify(args))}" data-arg="${argName}" aria-label="${esc(placeholder)}"><option value="">${esc(placeholder)}${cost ? ` (⚡${cost})` : ''}</option>${opts}</select>`;
}

const stat = (label, value) => `<span class="kv"><small>${label}</small><b>${value}</b></span>`;
const person = (p, size = 56) => `<span class="pp">${portrait(p, size)}</span>`;
const loyaltyTone = (v) => (v >= 60 ? 'good' : v >= 35 ? 'warn' : 'bad');

function deskHead(title, intro, s) {
  return `<header class="desk__head"><h2>${title}</h2><p class="muted">${intro}</p><p class="small">Royal Attention left this season: <strong>${s.attention.left}/${s.attention.max}</strong>. Free orders (no ⚡) can be changed any time.</p></header>`;
}

// ── 🌾 GRANARIES ─────────────────────────────────────────────────────────


/** A spy badge if one is planted, otherwise a button to plant one. */
function spyBtn(s, type, id) {
  const spy = spyOn(s, type, id);
  if (spy) return `<span class="badge badge--spy" title="${esc(intel(s, spy).replace(/\*\*/g, ''))}">👁️ ${esc(spy.name)}</span>`;
  return cmd(s, 'spy.recruit', { type, target: id }, '👁️ Plant a spy (100 dbn)');
}

const STATION_OF_FRONT = { canaan: 'the northern front (Canaan, Syria, Mesopotamia, Alashiya)', south: 'the Kush front', west: 'the Libyan front' };

/** The front a war is fought on. */
function warFront(s, w) {
  const t = province(s, w.target) || province(s, w.defending);
  return t ? REGIONS[t.region].front : 'canaan';
}

/** Destinations for a unit: every station, plus each war by name. */
function stationChoices(s) {
  const wars = s.wars.map((w) => {
    const t = province(s, w.target);
    return [warFront(s, w), `⚔️ To the war with ${s.realms[w.enemy].name}${t ? ` (siege of ${t.name})` : ''}`];
  });
  return [...wars, ...Object.entries(STATIONS).map(([id, st]) => [id, st.name])];
}

// ── 💰 TREASURY & GRANARIES ─────────────────────────────────────────────

function granaryDesk(s) {
  const b = monthlyBurnBreakdown(s);
  const total = monthlyBurn(s);
  const intake = projectedIntake(s);
  const pg = Math.round(provinceGrain(s));
  const net = intake + pg - total * 4;
  const o = s.overseer;
  const ledger = goldLedger(s);
  const hist = (s.history || []).slice(-10);
  const upkeep = (s.spies || []).length * SPY_UPKEEP;
  return `${deskHead('💰 The Treasury and Granaries', 'Grain pays everyone at home; gold buys everything abroad. A wealthy Egypt has both, and the granaries to survive a bad Nile.', s)}
  <div class="grid2">
    <section class="panel">
      <h3>🌾 Grain</h3>
      <div class="kvs">
        ${stat('Royal granaries', `${fmt(s.grain.royal)} khar`)}
        ${stat('Sealed reserve', `${fmt(s.grain.sealed)} khar`)}
        ${stat('Monthly burn', `${fmt(total)} khar`)}
        ${stat('Reserve', `${reserveMonths(s).toFixed(1)} months`)}
        ${stat('Next tax barges', `≈ ${fmt(intake)}`)}
        ${stat('From provinces', `≈ ${fmt(pg)}`)}
        ${stat('Season balance', `<span class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</span>`)}
      </div>
      <p class="small muted">Burn: army ${k(b.army)} · workforce ${k(b.workforce)} · palace ${k(b.palace)}${b.monuments ? ` · monuments ${k(b.monuments)}` : ''} khar a month. Scribal leakage ${Math.round(leakage(s) * 100)}%. The nomes report ${Math.round(nomeYield(s) * 100)}% of their harvest.</p>
      ${s.arrears.army ? `<p class="bad small">The army is owed ${s.arrears.army} months.</p><div class="cmds">${cmd(s, 'army.pay', { months: 1, with: 'grain' }, 'Pay 1 month in grain')}${cmd(s, 'army.pay', { months: 'all', with: 'grain' }, 'Pay all in grain')}${cmd(s, 'army.pay', { months: 'all', with: 'gold' }, 'Pay all in gold')}</div>` : ''}
      ${s.templeLoan ? `<p class="warn small">You owe Karnak ${fmt(s.templeLoan.amount * 1.1)} khar, due in ${Math.max(0, s.templeLoan.dueTurn - s.turn)} season(s).</p>` : ''}
    </section>
    <section class="panel">
      <h3>🪙 Gold this year</h3>
      <div class="kvs">${stat('Treasury', `${fmt(s.gold)} deben`)}${stat('Yearly income', `<span class="${ledger.total >= 0 ? 'good' : 'bad'}">${ledger.total >= 0 ? '+' : '−'}${fmt(Math.abs(ledger.total))} + Nubian tribute</span>`)}</div>
      <table class="ledger"><tbody>${ledger.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="${l.amount >= 0 ? 'good' : 'bad'}">${l.amount >= 0 ? '+' : '−'}${fmt(Math.abs(l.amount))}</td></tr>`).join('')}${upkeep ? `<tr><td>The King’s Eyes and Ears (${s.spies.length} spies)</td><td class="bad">−${upkeep}</td></tr>` : ''}</tbody></table>
      ${hist.length > 1 ? `<p class="small muted">Treasury by year: ${hist.map((h) => `Y${h.year} ${k(h.gold)}`).join(' · ')}</p>` : ''}
      <p class="hint">Grow it: build workshops and harbors in the nomes (Two Lands desk), mines and trading posts in provinces, conquer rich cities (The World desk), and send expeditions.</p>
    </section>
  </div>
  <section class="panel">
    <h3>Standing orders <span class="muted small">(free)</span></h3>
    <div class="policy"><span>Army rations</span>${seg(s, 'granary.ration', { group: 'army' }, 'level', [[1, 'Full'], [0.75, 'Reduced'], [0.5, 'Half']], s.armyRation)}</div>
    <p class="hint">Each step down saves ${fmt(s.burn.army / 4)} khar a month. Morale falls every season you stay below full.</p>
    <div class="policy"><span>Workforce rations</span>${seg(s, 'granary.ration', { group: 'workforce' }, 'level', [[1, 'Full'], [0.75, 'Reduced']], s.policy.workforceRation)}</div>
    <div class="policy"><span>Palace household</span>${seg(s, 'granary.palace', {}, 'level', [['lavish', 'Lavish'], ['normal', 'Normal'], ['austere', 'Austere']], s.policy.palace)}</div>
    <div class="policy"><span>Tax quota</span>${seg(s, 'granary.tax', {}, 'level', [['light', 'Light'], ['standard', 'Standard'], ['heavy', 'Heavy']], s.policy.tax)}</div>
    <p class="hint">Heavy: +15% intake, but every nome loses loyalty and Ma’at slips each season. Light: −15%, nomes grow loyal.</p>
  </section>
  <section class="panel">
    <h3>Get grain now</h3>
    <div class="cmds">
      ${['canaan', 'alashiya', 'babylon'].map((r) => cmd(s, 'granary.buy', { realm: r }, `Buy ~50k from ${s.realms[r].name.split(' ')[0]} (250 dbn)`)).join('')}
      ${['alashiya', 'babylon'].map((r) => cmd(s, 'granary.bulk', { realm: r }, `Buy 150k from ${s.realms[r].name.split(' ')[0]} (900 dbn)`)).join('')}
      ${cmd(s, 'granary.unseal', { amount: 100000 }, 'Open 100k of the sealed reserve')}
      ${cmd(s, 'granary.borrow', {}, 'Borrow 250k from Karnak')}
      ${cmd(s, 'granary.repay', {}, 'Repay Karnak early')}
    </div>
    <p class="hint">You can also requisition grain from any nome on the Two Lands desk, or pause monuments to free their crews.</p>
    <h3>Store and give</h3>
    <div class="cmds">
      ${cmd(s, 'granary.seal', { amount: 100000 }, 'Seal 100k khar')}${cmd(s, 'granary.seal', { amount: 250000 }, 'Seal 250k khar')}
      ${cmd(s, 'granary.feed', {}, 'Feed the people (100k khar)')}
    </div>
    <p class="hint">Sealed grain is safe from rot and rations, and unlocks <span class="badge">Prepared</span> options when famine, strikes or riots strike.</p>
  </section>
  <section class="panel">
    <h3>⛵ Expeditions</h3>
    ${Object.entries(EXPEDITIONS).map(([id, e]) => `<div class="mon"><div><strong>${esc(e.name)}</strong><br><span class="small muted">${esc(e.note)} Costs ${e.gold ? `${e.gold} deben and ` : ''}${fmt(e.grain)} khar; ${e.seasons} season${e.seasons > 1 ? 's' : ''}; ${Math.round(e.risk * 100)}% risk of loss.</span></div><span></span><span></span>${(s.expeditions || []).some((x) => x.type === id) ? '<span class="badge">under way</span>' : cmd(s, 'expedition', { type: id }, 'Send')}</div>`).join('')}
  </section>
  <section class="panel official">
    ${person(o, 64)}
    <div><h3>${esc(o.name)}, ${esc(o.title)}</h3><p class="small">Competence ${o.competence} · Integrity ${o.integrity} · Loyalty ${o.loyalty}. About ${(((0.005 + ((100 - o.integrity) / 100) * 0.03) * (s.flags.granaryComplex ? 0.5 : 1)) * 100).toFixed(1)}% of the royal grain rots or vanishes each season under him.</p></div>
  </section>`;
}

// ── ⚔️ ARMY ───────────────────────────────────────────────────────────────

function armyDesk(s) {
  const threat = coupThreat(s);
  const watched = threat && units(s).some((u) => u.commanderId === threat.person.id && spyOn(s, 'unit', u.id));
  const people = [
    ...s.army.generals.map((g) => [g.id, `General ${g.name} (martial ${g.martial}, loyalty ${g.loyalty})`]),
    ...livingSons(s).filter(isAdult).filter((x) => !String(x.role).includes('Exiled')).map((x) => [x.id, `Prince ${x.name} (${x.skill === 'martial' ? 'trained soldier' : 'untrained'}, loyalty ${x.loyalty})`]),
  ];
  const rows = units(s)
    .map((u) => {
      const c = commander(s, u.commanderId);
      return `<article class="unit">
        <div class="unit__head">
          ${c ? person(c, 48) : '<span class="pp pp--empty" aria-hidden="true">?</span>'}
          <div><h4>${esc(u.name)}</h4><span class="small muted">${fmt(u.men)} men · ${esc(STATIONS[u.station].name)} · power ${fmt(unitPower(s, u))}</span>
          <div class="small">${c ? `Commander: <strong>${esc(c.isSon ? `Prince ${c.name}` : `General ${c.name}`)}</strong> (loyalty ${c.loyalty})` : '<span class="warn">No commander</span>'}</div></div>
        </div>
        <div class="bars"><span>Quality</span>${meter(u.quality, { tone: 'lapis', label: 'quality' })}<b>${u.quality}</b><span>Morale</span>${meter(u.morale, { label: 'morale' })}<b>${u.morale}</b></div>
        <div class="cmds">
          ${cmd(s, 'army.recruit', { unitId: u.id }, u.kind === 'mercenary' ? '+1,000 (300 dbn)' : '+1,000 men')}
          ${cmd(s, 'army.disband', { unitId: u.id }, '−1,000 men')}
          ${cmd(s, 'army.drill', { unitId: u.id }, 'Drill')}
          ${spyBtn(s, 'unit', u.id)}
        </div>
        <div class="cmds">
          ${pickCmd(s, 'army.command', { unitId: u.id }, 'personId', people, 'Change commander')}
          ${pickCmd(s, 'army.station', { unitId: u.id }, 'station', stationChoices(s), 'Send to…')}
        </div>
        ${spyOn(s, 'unit', u.id) ? `<p class="small intel">👁️ ${md(intel(s, spyOn(s, 'unit', u.id)))}</p>${cmd(s, 'spy.arrest', { type: 'unit', target: u.id }, 'Arrest the commander on the spy’s evidence')}` : ''}
      </article>`;
    })
    .join('');
  const camp = Object.entries(CAMPAIGNS)
    .map(([id, t]) => {
      const power = armyPower(s, ['capital', t.station]);
      const p = clamp(0.5 + (power / t.difficulty - 1) * 0.5, 0.1, 0.9);
      const odds = p >= 0.7 ? 'good' : p >= 0.5 ? 'even' : 'poor';
      return `<div class="camp"><div><strong>Raid ${esc(t.name)}</strong><br><span class="small muted">${esc(t.note)}. Odds: <span class="${odds === 'poor' ? 'bad' : odds === 'good' ? 'good' : 'warn'}">${odds}</span>.</span></div>
        <div class="cmds">${cmd(s, 'army.campaign', { target: id, leader: 'commanders' }, 'Send the army')}${cmd(s, 'army.campaign', { target: id, leader: 'pharaoh' }, 'Pharaoh leads')}</div></div>`;
    })
    .join('');
  const gens = s.army.generals
    .map((g) => {
      const commands = units(s).filter((u) => u.commanderId === g.id).map((u) => u.name);
      return `<div class="mini-person">${person(g, 44)}<div><strong>${esc(g.name)}</strong><br><span class="small">Martial ${g.martial} · Loyalty <span class="${loyaltyTone(g.loyalty)}">${g.loyalty}</span> · Ambition ${g.ambition}${g.royalKin ? ' · royal son-in-law' : ''}</span><br><span class="small muted">${commands.length ? `Commands the ${esc(commands.join(', the '))}` : 'No command yet'}</span></div>${cmd(s, 'army.dismiss_general', { id: g.id }, 'Dismiss')}</div>`;
    })
    .join('');
  const recruits = (s.shortlists?.generals || [])
    .map((g) => `<div class="cand">${person(g, 44)}<div><strong>${esc(g.name)}</strong> <span class="small muted">${esc(g.originLabel)}, ${g.age}</span><br><span class="small">Martial ${g.martial} · Loyalty ${g.loyalty} · Ambition ${g.ambition}</span></div>${cmd(s, 'army.hire_general', { id: g.id }, 'Make general (100 dbn)')}</div>`)
    .join('');
  return `${deskHead('⚔️ The Army', 'The divisions of Amun, Ra, Ptah and Seth, the Chariot Corps, the Medjay and the Sherden guard. Armies fight where they are stationed: send them to a front before you go to war.', s)}
  <section class="panel">
    <div class="kvs">${stat('Men under arms', fmt(totalMen(s)))}${stat('Grain a month', `${fmt(s.burn.army * s.armyRation)} khar`)}${stat('Average morale', `${Math.round(avgMorale(s))}%`)}${stat('Rations', s.armyRation === 1 ? 'Full' : s.armyRation === 0.5 ? 'Half' : 'Reduced')}${stat('Arrears', `${s.arrears.army} months`)}</div>
    ${s.arrears.army ? `<div class="cmds">${cmd(s, 'army.pay', { months: 1, with: 'grain' }, 'Pay 1 month in grain')}${cmd(s, 'army.pay', { months: 'all', with: 'grain' }, 'Pay all in grain')}${cmd(s, 'army.pay', { months: 'all', with: 'gold' }, 'Pay all in gold')}</div>` : ''}
    ${threat && threat.risk > 0.05
      ? watched
        ? `<p class="bad small">⚠ Your spy confirms it: ${esc(threat.person.isSon ? `Prince ${threat.person.name}` : `General ${threat.person.name}`)} commands ${fmt(threat.men)} men at the capital, loyalty ${threat.person.loyalty}. Coup risk about ${Math.round(threat.risk * 100)}% a season.</p>`
        : '<p class="warn small">⚠ Rumours in the barracks of a disloyal commander at the capital. Plant a spy in a unit to learn who.</p>'
      : '<p class="small good">No commander at the capital is a danger to the throne.</p>'}
    <div class="cmds">${cmd(s, 'army.bonus', {}, 'Award the Gold of Valor (400 dbn)')}</div>
  </section>
  <div class="units">${rows}</div>
  <div class="grid2">
    <section class="panel"><h3>Raids and punitive expeditions</h3>${camp}<p class="hint">For real conquest, declare war on the World desk.</p></section>
    <section class="panel"><h3>Generals (${s.army.generals.length}/8)</h3><div class="people">${gens}</div>
      <div class="cmds" style="margin-top:0.6rem">${cmd(s, 'army.general_shortlist', {}, 'Summon candidates for general')}</div>
      ${recruits ? `<div class="cands" style="margin-top:0.5rem">${recruits}</div>` : ''}
      <p class="hint">A veteran is steady; a Nomarch’s son brings his family’s favour and ambition; a foreign captain fights best and is loyal to pay. Princes trained in the chariot stables also make fine commanders.</p></section>
  </div>`;
}

// ── 🌍 THE WORLD ─────────────────────────────────────────────────────────

const TRADE_TEXT = { hatti: 'Grain for chariot horses (100k khar)', alashiya: 'Grain for copper (80k khar)', canaan: 'Sell grain for silver (50k khar)', babylon: 'Gold for lapis and horses (300 dbn)', assyria: 'Gold for luxuries (300 dbn)' };
const OWNER_GLYPH = { egypt: '☥', hatti: '🏔️', babylon: '🏺', assyria: '🦁', alashiya: '⛵', canaan: '🏰', libu: '🏜️', kush: '🏹' };

function worldDesk(s) {
  const wars = s.wars
    .map((w) => {
      const r = s.realms[w.enemy];
      const t = province(s, w.target);
      const front = warFront(s, w);
      const ours = frontPower(s, front);
      const theirs = enemyFrontPower(s, w.enemy);
      const targets = s.provinces.filter((p) => p.owner === w.enemy && !p.occupiedBy && reachable(s, p));
      const terms = peaceTerms(s, w);
      return `<article class="card war">
        <div class="card__head"><span class="realm-glyph">${OWNER_GLYPH[w.enemy] || '⚔️'}</span><div><h4>War with ${esc(r.name)}</h4><span class="small">${esc(CASUS_BELLI[w.cb]?.name || (w.cb === 'invasion' ? 'They invaded us' : w.cb))} · ${s.turn - w.start} seasons</span></div></div>
        <div class="bars"><span>War score</span>${meter(clamp((w.score + 100) / 2, 0, 100), { tone: w.score >= 0 ? 'good' : 'bad', label: 'war score' })}<b>${w.score}</b></div>
        <p class="small">Front: <strong>${STATION_OF_FRONT[front]}</strong>. Your power there ${fmt(ours)} against about ${fmt(theirs)}.${ours === 0 ? ' <span class="bad">No Egyptian units are on this front! Station divisions there on the Army desk.</span>' : ''}</p>
        <p class="small">Siege target: <strong>${t ? `${esc(t.name)} (${t.siege}%)` : 'none'}</strong></p>
        ${troopsPanel(s, front)}
        <div class="cmds">${pickCmd(s, 'war.target', { warId: w.id }, 'provinceId', targets.map((p) => [p.id, `${p.name} (defense ${defenseOf(s, p)})`]), 'Change siege target')}</div>
        <details class="match"><summary>🕊️ Peace terms</summary><div class="match__list">${terms.map((x) => `<div class="match__item"><div><strong>${esc(x.label)}</strong><br><span class="small muted">${x.ok ? 'They will accept.' : `Needs war score ${x.need}.`}</span></div>${cmd(s, 'war.peace', { warId: w.id, terms: x.id }, 'Offer')}</div>`).join('')}</div></details>
        ${w.log.length ? `<p class="small muted">Last: ${md(w.log[w.log.length - 1])}</p>` : ''}
      </article>`;
    })
    .join('');

  const regions = Object.entries(REGIONS)
    .map(([rid, reg]) => {
      const ps = s.provinces.filter((p) => p.region === rid);
      if (!ps.length) return '';
      return `<h3 class="section-title">${esc(reg.name)}</h3><div class="cards">${ps.map((p) => provinceCard(s, p)).join('')}</div>`;
    })
    .join('');

  const realms = Object.entries(s.realms)
    .map(([id, r]) => {
      const rel = r.relation;
      const tone = rel >= 40 ? 'good' : rel >= 0 ? 'warn' : 'bad';
      const ally = s.wives.find((w) => w.status === 'court' && w.tie === id);
      return `<article class="card">
        <div class="card__head"><span class="realm-glyph" aria-hidden="true">${OWNER_GLYPH[id] || '🏳️'}</span><div><h4>${esc(r.name)}</h4><span class="small">${esc(r.ruler)} · about ${fmt(r.army)} men</span><br><span class="small muted">${esc(r.note)}${ally ? ` · <strong>marriage alliance</strong> through ${esc(ally.name)}` : ''}${id === 'hatti' && s.flags.hattiTreaty !== false ? ' · <strong>eternal treaty</strong>' : ''}${r.truceUntil > s.turn ? ` · truce ${r.truceUntil - s.turn} more seasons` : ''}</span></div></div>
        <div class="bars"><span>Relation</span>${meter(clamp((rel + 100) / 2, 0, 100), { tone, label: 'relation' })}<b>${rel}</b></div>
        <div class="cmds">
          ${r.hostile ? '' : `${cmd(s, 'foreign.gift', { realm: id, size: 'modest' }, 'Gifts (300 dbn)')}${cmd(s, 'foreign.gift', { realm: id, size: 'lavish' }, 'Lavish gifts (900 dbn)')}${TRADE_TEXT[id] ? cmd(s, 'foreign.trade', { realm: id }, TRADE_TEXT[id]) : ''}${cmd(s, 'family.take_wife', { source: `foreign:${id}` }, s.pharaoh.sex === 'f' ? 'Request a royal consort' : 'Request a royal bride')}`}
          ${spyBtn(s, 'realm', id)}${spyOn(s, 'realm', id) ? cmd(s, 'spy.sabotage', { target: id }, 'Sabotage their army (200 dbn)') : ''}
        </div>
        ${spyOn(s, 'realm', id) ? `<p class="small intel">👁️ ${md(intel(s, spyOn(s, 'realm', id)))}</p>` : ''}
      </article>`;
    })
    .join('');

  const ranking = powerTable(s)
    .map((r) => `<tr class="${r.id === 'egypt' ? 'me' : ''}"><td>#${r.rank}</td><td>${OWNER_GLYPH[r.id] || ''} ${esc(r.name)}</td><td>${meter(r.score, { tone: r.id === 'egypt' ? 'good' : 'lapis', label: 'power' })}</td><td>${r.score}</td><td class="small muted">${fmt(r.wealth)} wealth · ${k(r.army)} men · ${r.land} land</td></tr>`)
    .join('');

  return `${deskHead('🌍 The Known World', 'Canaan, Syria, Kush and Libya: provinces to tax, vassals to keep, and lands to take. Every Pharaoh is expected to extend the borders of Egypt.', s)}
  ${wars ? `<h3 class="section-title">⚔️ Wars</h3><div class="cards">${wars}</div>` : ''}
  <section class="panel"><h3>🏆 The great powers</h3><div class="table-wrap"><table class="power"><tbody>${ranking}</tbody></table></div><p class="hint">Score: wealth 40%, army 30%, land 15%, prestige 15%.</p></section>
  ${regions}
  <h3 class="section-title">Foreign courts</h3><div class="cards">${realms}</div>`;
}

/** Finished buildings with what they do; unfinished ones with the seasons left. */
function buildingList(s, place, defs) {
  const items = (place.buildings || []).map((b) => {
    const d = defs[b.type];
    if (!d) return '';
    const left = b.readyTurn - s.turn;
    return left > 0
      ? `<li class="bld bld--building">🏗️ <strong>${esc(d.name)}</strong>: under construction, ready in ${left} season${left === 1 ? '' : 's'}</li>`
      : `<li class="bld bld--done">✅ <strong>${esc(d.name)}</strong>: ${esc(d.note)}</li>`;
  });
  return items.length ? `<ul class="blds">${items.join('')}</ul>` : '';
}

/** Who is on a front, and buttons to send everyone else there. */
function troopsPanel(s, front) {
  const here = units(s).filter((u) => u.station === front && u.kind !== 'police');
  const away = units(s).filter((u) => u.station !== front && u.kind !== 'police');
  return `<div class="troops">
    <p class="small"><strong>On this front:</strong> ${here.length ? here.map((u) => `${esc(u.name)} (${fmt(u.men)})`).join(', ') : '<span class="bad">nobody</span>'}</p>
    <div class="cmds">${cmd(s, 'army.march', { front }, 'Send everything at the capital')}${away.map((u) => cmd(s, 'army.station', { unitId: u.id, station: front }, `Send the ${esc(u.name)} (${fmt(u.men)}, now at ${esc(STATIONS[u.station].name.split(':')[0].split(' (')[0])})`)).join('')}</div>
  </div>`;
}

function provinceCard(s, p) {
  const mine = p.owner === 'egypt';
  const r = s.realms[p.owner];
  const status = mine ? (p.status === 'vassal' ? 'Egyptian vassal' : 'Egyptian province') : `${r?.name ?? p.owner}`;
  const occ = p.occupiedBy ? ` · <span class="bad">occupied by ${p.occupiedBy === 'egypt' ? 'Egypt' : esc(s.realms[p.occupiedBy]?.name)}</span>` : '';
  const atWar = s.wars.find((w) => w.enemy === p.owner);
  const reach = reachable(s, p);
  const cb = !mine ? casusBelli(s, p.owner, p) : null;
  const buildable = Object.entries(PROVINCE_BUILDINGS).filter(([, d]) => !d.needs || d.needs.includes(p.resource));
  const blds = buildingList(s, p, PROVINCE_BUILDINGS);
  const yearly = goldLedger(s).lines.filter((l) => l.label.endsWith(p.name)).reduce((t, l) => t + l.amount, 0);
  const gov = p.governorId ? [...livingSons(s), ...livingDaughters(s)].find((x) => x.id === p.governorId) : null;
  return `<article class="card prov prov--${mine ? p.status : 'foreign'}">
    <div class="card__head"><span class="realm-glyph" aria-hidden="true">${OWNER_GLYPH[p.owner] || '🏳️'}</span><div><h4>${esc(p.name)}${p.capital ? ' ★' : ''}</h4><span class="small">${status}${occ}${p.claim && !mine ? ' · <strong>Egyptian claim</strong>' : ''}</span><br><span class="small muted">${p.resource ? RESOURCES[p.resource] + ' · ' : ''}${p.gold} gold · ${fmt(p.grain)} grain a year · defense ${defenseOf(s, p)}${gov ? ` · governed by ${gov.sex === 'f' ? 'Princess' : 'Prince'} ${esc(gov.name)}` : ''}</span></div></div>
    ${mine ? `<div class="bars"><span>Unrest</span>${meter(100 - p.unrest, { label: 'calm' })}<b>${p.unrest}</b></div>` : ''}
    ${mine ? `<p class="small">Sends Egypt <strong>${fmt(yearly)} deben</strong> a year${p.status === 'province' ? ` and about ${k(Math.round((p.grain / 3) * (1 - p.unrest / 200)))} khar of grain a season` : ''}.</p>` : ''}
    ${blds}
    <div class="cmds">
      ${mine && !p.occupiedBy ? pickCmd(s, 'build', { kind: 'province', id: p.id }, 'type', buildable.map(([id, d]) => [id, `${d.name}: ${d.gold} dbn + ${k(d.grain)} khar. ${d.note}`]), 'Build…') : ''}
      ${mine ? cmd(s, 'province.garrison_pay', { id: p.id }, 'Calm with gifts') : ''}
      ${mine && p.status === 'vassal' ? cmd(s, 'province.integrate', { id: p.id }, 'Direct rule') : ''}
      ${!mine && !atWar && r ? (reach ? cmd(s, 'war.declare', { realm: p.owner, target: p.id }, `⚔️ Declare war (${CASUS_BELLI[cb].name})`, { hint: CASUS_BELLI[cb].note }) : `<span class="small muted">Out of reach: take ${p.requires.map((id) => esc(province(s, id).name)).join(' or ')} first.</span>`) : ''}
      ${atWar ? '<span class="badge badge--bad">at war</span>' : ''}
    </div>
  </article>`;
}

// ── 🪷 ROYAL FAMILY ──────────────────────────────────────────────────────

const POSTS = (s, c) => {
  const governorships = [
    ...s.nomes.map((n) => [`nome:${n.id}`, `Governor of ${n.name} (replaces ${n.nomarch})`]),
    ...s.provinces.filter((p) => p.owner === 'egypt').map((p) => [`province:${p.id}`, `Governor of ${p.name}`]),
  ];
  if (c.sex === 'f') return [['chantress', 'Chantress of Amun (Priesthood +4%)'], ['estates', 'Overseer of the royal estates at Mi-wer (+150 deben a year)'], ...governorships];
  return [
    ['vizier', 'Vizier of the South'],
    ['vizierNorth', 'Vizier of the North'],
    ['overseer', 'Overseer of the Granaries'],
    ['viceroy', 'Viceroy of Kush'],
    ...governorships,
  ];
};

function childCard(s, c) {
  const isHeir = c.id === s.heirId;
  const trait = TRAITS[c.trait];
  const schoolSel = c.age >= 4 && !c.abroad && c.office !== 'gods_wife'
    ? pickCmd(s, 'family.educate', { childId: c.id }, 'school', Object.entries(SCHOOLS).filter(([id, sc]) => id !== c.edu && !(sc.maxAge && c.age > sc.maxAge)).map(([id, sc]) => [id, `${sc.name}: ${sc.note}`]), c.age > 15 ? 'Train at… (100 dbn)' : c.edu ? 'Change school…' : 'Send to school…')
    : '';
  const matches = !c.spouse && c.office !== 'gods_wife' && !c.abroad && isAdult(c) ? matchOptions(s, c) : [];
  const marry = matches.length
    ? `<details class="match"><summary>💍 Arrange a marriage <span class="cost">⚡2</span></summary><div class="match__list">${matches.map((m) => `<div class="match__item"><div><strong>${esc(m.label)}</strong><br><span class="small muted">${esc(m.hint)}</span></div>${cmd(s, 'family.marry', { childId: c.id, matchId: m.id }, 'Arrange')}</div>`).join('')}<p class="hint">To marry into any Nomarch’s house, use that nome’s card on the Two Lands desk.</p></div></details>`
    : '';
  const appoint = isAdult(c) && !c.abroad && c.office !== 'gods_wife' ? pickCmd(s, 'family.appoint', { childId: c.id }, 'post', POSTS(s, c), 'Appoint to…') : '';
  const kids = (c.kids || []).length ? `<p class="small">👶 Children: ${c.kids.map((g) => `${esc(g.name)} (${g.age}${g.trait === 'frail' ? ', frail' : ''})`).join(', ')}</p>` : '';
  const badges = `${c.divine ? ' <span class="badge" title="Child of a royal sibling marriage">divine blood</span>' : ''}${c.trait === 'frail' ? ' <span class="badge badge--bad">frail</span>' : ''}`;
  return `<article class="card${isHeir ? ' card--heir' : ''}">
    <div class="card__head">${person(c, 72)}<div><h4>${isHeir ? '👑 ' : ''}${c.sex === 'm' ? 'Prince' : 'Princess'} ${esc(c.name)}${badges}</h4>
      <span class="small">Age ${c.age} · ${esc(c.role || '')}</span><br><span class="small muted">Mother: ${esc(motherName(s, c.motherId))}${trait ? ` · ${trait.icon} ${trait.name}` : ''}${c.edu ? ` · 🎓 ${esc(SCHOOLS[c.edu]?.name ?? c.edu)}` : ''}</span></div></div>
    ${c.legitimacy != null ? `<div class="bars"><span>Legitimacy</span>${meter(c.legitimacy, { tone: 'lapis', label: 'legitimacy' })}<b>${c.legitimacy}</b><span>Loyalty</span>${meter(c.loyalty ?? 50, { label: 'loyalty' })}<b>${c.loyalty ?? '—'}</b></div>` : ''}
    <p class="small">${c.abroad ? `👑 ${esc(c.role)}` : spouseName(c) ? `💍 Married to ${esc(spouseName(c))}` : c.office === 'gods_wife' ? '🪔 God’s Wife of Amun' : isAdult(c) ? 'Unmarried' : 'Too young to marry'}</p>
    ${kids}
    <div class="cmds">${schoolSel}${isHeir || c.abroad || c.office === 'gods_wife' ? '' : cmd(s, 'family.designate', { sonId: c.id }, c.sex === 'f' ? 'Name heir (as Hatshepsut)' : 'Name heir')}${c.sex === 'm' && isAdult(c) ? cmd(s, 'family.ptah', { sonId: c.id }, 'High Priest of Ptah') : ''}${appoint}${c.sex === 'm' && isAdult(c) ? spyBtn(s, 'child', c.id) : ''}${c.rel === 'sibling' && c.sex !== s.pharaoh.sex && isAdult(c) && !c.spouse && !c.abroad && c.office !== 'gods_wife' ? cmd(s, 'family.wed_sibling', { childId: c.id }, s.pharaoh.sex === 'f' ? '💍 Marry him (as consort)' : '💍 Marry her (as your queen)', { hint: 'The divine blood: children born with +15 Legitimacy, and the palace locked against rival mothers. But some will be born frail.' }) : ''}</div>${marry}
    ${spyOn(s, 'child', c.id) ? `<p class="small intel">👁️ ${md(intel(s, spyOn(s, 'child', c.id)))}</p>` : ''}
  </article>`;
}

function wifeCard(s, w, dowager) {
  const kids = [...sonsOf(s, w.id), ...livingDaughters(s).filter((d) => d.motherId === w.id)];
  const spy = spyOn(s, 'wife', w.id);
  return `<article class="card">
    <div class="card__head">${person(w, 72)}<div><h4>${esc(w.name)}${w.rumored ? ' <span class="badge badge--bad">whispers</span>' : ''}${w.royalBlood ? ' <span class="badge">royal blood</span>' : ''}</h4>
      <span class="small">${esc(w.title)}${w.age ? `, ${w.age}` : ''}</span><br><span class="small muted">${esc(w.origin)}</span></div></div>
    <div class="bars"><span>Satisfaction</span>${meter(w.satisfaction, { label: 'satisfaction' })}<b>${w.satisfaction}</b><span>Influence</span>${meter(w.influence, { tone: 'lapis', label: 'influence' })}<b>${w.influence}</b></div>
    <p class="small">${kids.length ? `Children: ${kids.map((c) => esc(c.name)).join(', ')}` : 'No children'}${s.pregnancy?.wifeId === w.id ? ' · <strong>with child</strong>' : ''}${s.realms[w.tie] ? ` · alliance with ${esc(s.realms[w.tie].name)}` : ''}</p>
    <div class="cmds">
      ${dowager ? '' : cmd(s, 'family.favor', { wifeId: w.id }, s.pharaoh.sex === 'f' ? 'Spend the season with him' : 'Spend the season with her', { hint: 'Satisfaction +12, the others −3. A child may follow.' })}
      ${cmd(s, 'family.gift', { wifeId: w.id }, 'Grant estates (250 dbn)')}
      ${dowager || s.pharaoh.sex === 'f' || w.title.startsWith('Great') ? '' : cmd(s, 'family.elevate', { wifeId: w.id }, 'Make Great Royal Wife')}
      ${dowager && s.pharaoh.sex !== 'f' && w.id !== s.pharaoh.motherId && !w.title.startsWith('King’s Mother') ? cmd(s, 'family.wed_dowager', { wifeId: w.id }, '💍 Marry her', { hint: 'She becomes your wife; her sons grow loyal; a foreign dowager renews her kingdom’s alliance. The priests disapprove a little.' }) : ''}
      ${cmd(s, 'family.sideline', { wifeId: w.id }, 'Banish from court')}
      ${spyBtn(s, 'wife', w.id)}${spy ? cmd(s, 'spy.arrest', { type: 'wife', target: w.id }, 'Arrest her plotters') : ''}
    </div>
    ${spy ? `<p class="small intel">👁️ ${md(intel(s, spy))}</p>` : ''}
  </article>`;
}

function familyDesk(s) {
  const p = s.pharaoh;
  const h = heir(s);
  const female = p.sex === 'f';
  const wives = kingWives(s).map((w) => wifeCard(s, w, false)).join('');
  const dowagers = s.wives.filter((w) => w.status === 'dowager').map((w) => wifeCard(s, w, true)).join('');
  const all = [...livingSons(s), ...livingDaughters(s), ...(s.daughters || []).filter((d) => d.alive && d.abroad)];
  const children = all.filter((c) => c.rel !== 'sibling').sort((a, b) => b.age - a.age).map((c) => childCard(s, c)).join('');
  const siblings = all.filter((c) => c.rel === 'sibling').sort((a, b) => b.age - a.age).map((c) => childCard(s, c)).join('');
  const weakNomes = [...s.nomes].sort((a, b) => a.loyalty - b.loyalty).slice(0, 3);
  const sources = [
    ...weakNomes.map((n) => [`nome:${n.id}`, `${female ? 'A son' : 'A daughter'} of Nomarch ${n.nomarch} of ${n.name} (loyalty +15)`]),
    ...['hatti', 'babylon', 'alashiya', 'canaan', 'assyria'].map((r) => [`foreign:${r}`, `${female ? 'A prince' : 'A princess'} of ${s.realms[r].name} (relation ${s.realms[r].relation}, needs 30): a marriage alliance`]),
    ...s.army.generals.map((g) => [`general:${g.id}`, female ? `General ${g.name} himself` : `The daughter of General ${g.name}`]),
    ['harem', female ? 'A courtier (no politics)' : 'A beauty of the royal household (no politics)'],
  ];
  return `${deskHead('🪷 The Royal Family', 'Every wife is a faction and every child is a card to play: schooled, married, appointed, or named heir. When you die, you play on as your heir.', s)}
  <section class="panel official">
    ${person(p, 84)}
    <div><h3>${esc(p.name)} <span class="muted">(${esc(p.throneName)})</span></h3><p class="small">Age ${p.age} · Health ${p.health}/100. ${esc(p.condition)}.</p>
    <p class="small">${h ? `Heir: <strong>${esc(h.name)}</strong> (Legitimacy ${h.legitimacy}).` : '<span class="bad">No heir is designated. If you die now, the eldest of your blood takes the crown, or a brother.</span>'} ${s.flags.godsWife ? 'A royal daughter serves as God’s Wife of Amun.' : ''}</p>
    ${s.dynasty?.length ? `<p class="small muted">Your dynasty: ${s.dynasty.map((r) => esc(r.name)).join(' → ')} → <strong>${esc(p.name)}</strong></p>` : ''}</div>
  </section>
  <h3 class="section-title">${female ? 'Consort' : 'Wives'}</h3>
  <div class="cards">${wives || `<p class="muted">${female ? 'Pharaoh has no consort.' : 'Pharaoh has no wives.'}</p>`}</div>
  <section class="panel"><h3>${female ? 'Take a consort' : 'Take a new wife'} <span class="cost">⚡2</span></h3><div class="cmds">${pickCmd(s, 'family.take_wife', {}, 'source', sources, female ? 'Choose a consort…' : 'Choose a bride…')}</div><p class="hint">A royal sister as queen keeps the blood divine and the palace locked down. A foreign princess as queen buys peace: her father will not attack Egypt while she lives at court.</p></section>
  <h3 class="section-title">Children</h3>
  <div class="cards">${children || '<p class="muted">No living children.</p>'}</div>
  ${siblings ? `<h3 class="section-title">Brothers and sisters</h3><p class="hint">Your siblings are princes and princesses of the blood. Brothers are your most dangerous rivals for the crown.</p><div class="cards">${siblings}</div>` : ''}
  ${dowagers ? `<h3 class="section-title">Dowager queens</h3><p class="hint">Your father’s wives. They still scheme for their own sons. A king may marry a dowager who is not his own mother, binding her and her sons to his house.</p><div class="cards">${dowagers}</div>` : ''}`;
}

// ── 🏛️ COURT ─────────────────────────────────────────────────────────────

const OFFICE_EFFECT = {
  vizier: (s, o) => `Runs the southern scribes. With the northern Vizier he sets scribal leakage (now ${Math.round(leakage(s) * 100)}%). Competence above 70 gives +1 Royal Attention each season${o.competence >= 70 ? ' (active)' : ''}.`,
  vizierNorth: (s) => `Runs the northern scribes and shares in setting leakage (now ${Math.round(leakage(s) * 100)}%).`,
  highPriest: (s, o) => `His loyalty pulls Karnak toward you (loyalty ≥ 60) or away (below 35) every season. Replacing him angers the Priesthood${o.origin === 'priest' ? '' : ', more so if the new man is not a priest'}.`,
  overseer: (s, o) => `His integrity decides how much grain rots or disappears: about ${(((0.005 + ((100 - o.integrity) / 100) * 0.03) * (s.flags.granaryComplex ? 0.5 : 1)) * 100).toFixed(1)}% a season.`,
  viceroy: (s, o) => `His competence sets the Nubian gold tribute: about ${fmt(Math.round(1200 * (0.6 + o.competence / 125)))} deben a year.`,
};

function courtDesk(s) {
  const sons = livingSons(s).filter(isAdult);
  const cards = Object.keys(OFFICES)
    .map((office) => {
      const o = s[office];
      const short = s.shortlists?.[office];
      const spy = spyOn(s, 'office', office);
      const cands = short
        ? `<div class="cands">${short.map((c) => `<div class="cand">${person(c, 48)}<div><strong>${esc(c.name)}</strong> <span class="small muted">${esc(c.originLabel)}, ${c.age}</span><br><span class="small">Competence ${c.competence} · Integrity ${c.integrity} · Ambition ${c.ambition} · Loyalty ${c.loyalty}</span></div>${cmd(s, 'court.appoint', { office, candidateId: c.id }, 'Appoint')}</div>`).join('')}</div>`
        : '';
      const sonOpts = office !== 'highPriest' && sons.length ? `<div class="cmds">${sons.map((x) => cmd(s, 'court.appoint', { office, candidateId: `son:${x.id}` }, `Appoint Prince ${esc(x.name)}`, { hint: 'A son in office: his Legitimacy and Loyalty rise, and so does his power.' })).join('')}</div>` : '';
      return `<article class="card">
        <div class="card__head">${person(o, 72)}<div><h4>${esc(o.name)}</h4><span class="small">${esc(OFFICES[office])}${o.age ? `, ${o.age}` : ''}</span></div></div>
        <div class="bars"><span>Competence</span>${meter(o.competence, { tone: 'lapis', label: 'competence' })}<b>${o.competence}</b><span>Integrity</span>${meter(o.integrity, { label: 'integrity' })}<b>${spy ? o.integrity : '?'}</b><span>Loyalty</span>${meter(o.loyalty ?? 50, { label: 'loyalty' })}<b>${o.loyalty ?? 50}</b></div>
        <p class="small">${esc(OFFICE_EFFECT[office](s, o))}</p>
        <div class="cmds">${cmd(s, 'court.reward', { office }, 'Reward (200 dbn)')}${cmd(s, 'court.shortlist', { office }, 'Summon candidates')}${spyBtn(s, 'office', office)}${spy ? cmd(s, 'spy.arrest', { type: 'office', target: office }, 'Charge him') : ''}</div>
        ${spy ? `<p class="small intel">👁️ ${md(intel(s, spy))}</p>` : ''}
        ${cands}${sonOpts}
      </article>`;
    })
    .join('');
  return `${deskHead('🏛️ The Court', 'Egypt is ruled through its officials. A loyal Vizier is Pharaoh’s strongest tool, and an ambitious one his greatest danger. Without a spy on his staff, you only know his integrity by its results.', s)}<div class="cards">${cards}</div>`;
}

// ── 🗺️ THE TWO LANDS ────────────────────────────────────────────────────

function nomesDesk(s) {
  const unmarried = [...livingSons(s), ...livingDaughters(s)].filter((c) => isAdult(c) && !c.spouse && c.office !== 'gods_wife');
  const princes = [...livingSons(s), ...livingDaughters(s)].filter(isAdult).filter((c) => c.office !== 'gods_wife');
  const rows = s.nomes
    .map((n) => {
      const honesty = n.loyalty < 30 ? 'hides a quarter of its harvest' : n.loyalty < 45 ? 'under-reports its harvest' : 'reports honestly';
      const spy = spyOn(s, 'nome', n.id);
      const kin = [];
      if (n.kinOf && wife(s, n.kinOf)) kin.push(`father of ${wife(s, n.kinOf).name}`);
      if (n.royalKin) {
        const c = [...s.sons, ...(s.daughters || [])].find((x) => x.id === n.royalKin);
        if (c) kin.push(`his house married ${c.sex === 'm' ? 'Prince' : 'Princess'} ${c.name}`);
      }
      if (n.governorId) kin.push(`a royal ${n.governorSex === 'f' ? 'princess' : 'prince'} governs here`);
      const blds = buildingList(s, n, NOME_BUILDINGS);
      const buildable = Object.entries(NOME_BUILDINGS).filter(([, d]) => !d.only || d.only.includes(n.id));
      return `<article class="card">
        <div class="card__head">${person({ kind: n.governorId ? (n.governorSex === 'f' ? 'princess' : 'prince') : 'nomarch', seed: n.seed, age: n.governorId ? 25 : n.nomarchAge ?? 50 }, 60)}<div><h4>${esc(n.name)}</h4><span class="small">${n.governorId ? '' : 'Nomarch '}${esc(n.nomarch)}${n.nomarchAge ? `, ${n.nomarchAge}` : ''}${n.hereditary ? ' · <span class="badge">hereditary</span>' : ''}</span>${kin.length ? `<br><span class="small muted">${esc(kin.join(' · '))}</span>` : ''}</div></div>
        <div class="bars"><span>Loyalty</span>${meter(n.loyalty, { label: 'loyalty' })}<b>${n.loyalty}</b><span>Ambition</span>${meter(n.ambition ?? 50, { tone: 'lapis', label: 'ambition' })}<b>${n.ambition ?? 50}</b></div>
        <p class="small">${Math.round(n.share * 100)}% of the realm’s harvest · yield ×${n.yield.toFixed(2)} · <span class="${n.loyalty < 45 ? 'warn' : 'good'}">${honesty}</span>${n.canalUntil ? ' · canals being dug' : ''}</p>
        ${blds}
        <div class="cmds">
          ${cmd(s, 'nome.audit', { nomeId: n.id }, 'Audit')}
          ${cmd(s, 'nome.requisition', { nomeId: n.id }, 'Requisition grain')}
          ${cmd(s, 'nome.visit', { nomeId: n.id }, 'Royal progress')}
          ${n.hereditary ? cmd(s, 'nome.revoke', { nomeId: n.id }, 'Revoke heredity') : cmd(s, 'nome.heredity', { nomeId: n.id }, 'Confirm heredity')}
          ${cmd(s, 'nome.replace', { nomeId: n.id }, 'Replace the Nomarch')}
          ${cmd(s, 'nome.canal', { nomeId: n.id }, 'Dig canals (60k)')}
          ${spyBtn(s, 'nome', n.id)}${spy ? cmd(s, 'spy.arrest', { type: 'nome', target: n.id }, 'Remove him on the evidence') : ''}
        </div>
        <div class="cmds">
          ${pickCmd(s, 'build', { kind: 'nome', id: n.id }, 'type', buildable.map(([id, d]) => [id, `${d.name}: ${d.gold} dbn + ${k(d.grain)} khar. ${d.note}`]), 'Build…')}
          ${n.governorId ? '' : pickCmd(s, 'family.marry', { matchId: `nome:${n.id}` }, 'childId', unmarried.map((c) => [c.id, `${c.sex === 'm' ? 'Prince' : 'Princess'} ${c.name} marries into his house`]), 'Marry a royal child into his house…')}
          ${n.governorId ? '' : cmd(s, 'family.take_wife', { source: `nome:${n.id}` }, s.pharaoh.sex === 'f' ? 'Take his son as consort' : 'Take his daughter as wife')}
          ${pickCmd(s, 'family.appoint', { post: `nome:${n.id}` }, 'childId', princes.filter((c) => c.id !== n.governorId).map((c) => [c.id, `${c.sex === 'f' ? 'Princess' : 'Prince'} ${c.name} governs ${n.name}`]), 'Make a royal child governor…')}
        </div>
        ${spy ? `<p class="small intel">👁️ ${md(intel(s, spy))}</p>` : ''}
      </article>`;
    })
    .join('');
  return `${deskHead('🗺️ The Two Lands', 'Eight great nomes from Thebes to the Delta. Their Nomarchs collect your grain and draft your laborers. Bind them by marriage, buy them, watch them, or replace them with your own sons.', s)}
  <section class="panel"><div class="kvs">${stat('Bureaucracy approval', `${s.blocs.bureaucracy.approval}%`)}${stat('Harvest reported', `${Math.round(nomeYield(s) * 100)}%`)}${stat('Hereditary nomes', `${s.nomes.filter((n) => n.hereditary).length} of 8`)}${stat('Tax quota', s.policy.tax)}</div></section>
  <div class="cards">${rows}</div>`;
}

// ── 👁️ SPIES ─────────────────────────────────────────────────────────────

function spiesDesk(s) {
  const net = (s.spies || [])
    .map((sp) => `<article class="card"><div class="card__head">${person({ kind: 'scribe', seed: sp.seed, age: 35 }, 52)}<div><h4>${esc(sp.name)}</h4><span class="small">Inside ${esc(targetName(s, sp.type, sp.target))} for ${s.turn - sp.since} season${s.turn - sp.since === 1 ? '' : 's'}</span></div></div>
      <p class="small intel">${md(intel(s, sp))}</p>
      <div class="cmds">${['wife', 'unit', 'office', 'nome'].includes(sp.type) ? cmd(s, 'spy.arrest', { type: sp.type, target: sp.target }, 'Act on the evidence') : ''}${sp.type === 'realm' ? cmd(s, 'spy.sabotage', { target: sp.target }, 'Sabotage (200 dbn)') : ''}${cmd(s, 'spy.recall', { spyId: sp.id }, 'Recall')}</div></article>`)
    .join('');
  const targets = [
    ['wife', s.wives.filter((w) => w.status === 'court' || w.status === 'dowager').map((w) => [w.id, w.name])],
    ['child', livingSons(s).filter(isAdult).map((c) => [c.id, `Prince ${c.name}`])],
    ['unit', units(s).map((u) => [u.id, u.name])],
    ['office', Object.keys(OFFICES).map((o) => [o, `${s[o].name} (${OFFICES[o]})`])],
    ['nome', s.nomes.map((n) => [n.id, `${n.name} (${n.nomarch})`])],
    ['realm', Object.entries(s.realms).map(([id, r]) => [id, r.name])],
  ];
  const pickers = targets.map(([type, list]) => `<div class="policy"><span>${esc(SPY_TARGETS[type])}</span>${pickCmd(s, 'spy.recruit', { type }, 'target', list.filter(([id]) => !spyOn(s, type, id)), 'Plant a spy in…')}</div>`).join('');
  return `${deskHead('👁️ The King’s Eyes and Ears', 'Officials who report to Pharaoh in secret. A spy turns rumours into evidence: exact plots, hidden grain, a general’s true loyalty, a foreign king’s plans. Evidence lets you arrest without the usual outrage. Spies cost 100 deben to place and 30 a year, and each season one may be caught.', s)}
  <section class="panel"><h3>Recruit</h3>${pickers}</section>
  <h3 class="section-title">Your network (${(s.spies || []).length}/8)</h3>
  <div class="cards">${net || '<p class="muted">You have no spies. Everything you know, you know from rumours.</p>'}</div>`;
}

// ── 📜 DYNASTY & CHRONICLE ───────────────────────────────────────────────

function chronicleDesk(s) {
  const rulers = [...(s.dynasty || []), { name: s.pharaoh.name, throneName: s.pharaoh.throneName, years: s.year, score: null, kind: s.pharaoh.kind, seed: s.pharaoh.seed, sex: s.pharaoh.sex }];
  const line = rulers.map((r) => `<div class="mini-person">${person({ kind: r.sex === 'f' ? 'pharaoh-f' : 'pharaoh', seed: r.seed ?? 11, age: 45, sex: r.sex }, 48)}<div><strong>${esc(r.name)}</strong> <span class="muted small">${esc(r.throneName || '')}</span><br><span class="small">${r.score == null ? `reigning, Year ${r.years}` : `${r.years} years · judged ${r.score}: ${esc(r.verdict.split(':')[0])}`}</span></div></div>`).join('');
  const items = [...s.chronicle].reverse().map((c) => `<li><span class="muted small">Year ${c.year}, ${['Akhet', 'Peret', 'Shemu'][c.season]}</span><br><strong>${md(c.title)}</strong>${c.text ? `<br><span class="small">${md(c.text)}</span>` : ''}</li>`).join('');
  return `${deskHead('📜 The Dynasty and its Chronicle', 'Your line of kings, and what the scribes recorded of each reign.', s)}
  <section class="panel"><h3>The kings of your line</h3><div class="people">${line}</div></section>
  ${commandsLog(s)}<section class="panel"><h3>Chronicle</h3><ol class="chronicle">${items || '<li class="muted">The scribes await your first decree.</li>'}</ol></section>`;
}

// ── 🧱 MONUMENTS ────────────────────────────────────────────────────────

function rewardText(r) {
  const out = [];
  if (r.maat) out.push(`Ma’at +${r.maat}`);
  for (const [b, d] of Object.entries(r.approval || {})) out.push(`${b[0].toUpperCase()}${b.slice(1)} +${d}%`);
  if (r.heirLegitimacy) out.push(`heir Legitimacy +${r.heirLegitimacy}`);
  if (r.dynastyLegitimacy) out.push(`every son +${r.dynastyLegitimacy} Legitimacy`);
  if (r.flags?.westFortified) out.push('the western frontier is fortified');
  if (r.flags?.granaryComplex) out.push('half as much grain rots');
  return out.join(', ');
}

function monumentsDesk(s) {
  const active = s.monuments
    .filter((m) => m.active)
    .map((m) => `<div class="mon"><div><strong>${esc(m.name)}</strong>${m.done ? ' <span class="badge">complete</span>' : m.paused ? ' <span class="badge badge--bad">paused</span>' : ''}<br><span class="small muted">${m.ongoing ? 'Built by the royal workforce of the Place of Truth.' : `${fmt(m.crew)} khar a month in crew rations.`}</span></div>
      ${meter(m.progress, { tone: m.done ? 'good' : 'lapis', label: m.name })}<b>${Math.round(m.progress)}%</b>
      ${!m.ongoing && !m.done ? cmd(s, 'monument.pause', { id: m.id }, m.paused ? 'Resume' : 'Pause') : ''}</div>`)
    .join('');
  const catalog = Object.entries(MONUMENT_CATALOG)
    .map(([id, d]) => `<div class="mon"><div><strong>${esc(d.name)}</strong><br><span class="small muted">${fmt(d.grain)} khar over ${d.seasons} seasons. On completion: ${esc(rewardText(d.reward))}.</span></div>${cmd(s, 'monument.start', { catalogId: id }, 'Begin')}</div>`)
    .join('');
  return `${deskHead('🧱 Monuments', 'Stone is how a Pharaoh speaks to eternity. Every monument eats grain while it rises, and an unfinished one shames your memory.', s)}
  <section class="panel"><h3>Under construction</h3>${active}</section>
  <section class="panel"><h3>Commission</h3>${catalog}</section>`;
}

// ── 📜 CHRONICLE ────────────────────────────────────────────────────────


export const DESK_RENDERERS = {
  granary: granaryDesk,
  army: armyDesk,
  world: worldDesk,
  family: familyDesk,
  court: courtDesk,
  nomes: nomesDesk,
  spies: spiesDesk,
  monuments: monumentsDesk,
  chronicle: chronicleDesk,
};
