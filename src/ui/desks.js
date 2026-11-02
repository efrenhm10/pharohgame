// The royal desks: every lever Pharaoh can pull besides the season's decree.
import { canPerform } from '../engine/game.js';
import { ACTIONS, matchOptions, OFFICES, CAMPAIGNS } from '../content/actions.js';
import { MONUMENT_CATALOG } from '../content/monuments.js';
import { STATIONS, units, commander, totalMen, avgMorale, coupThreat, armyPower, unitPower } from '../engine/army.js';
import { monthlyBurnBreakdown, monthlyBurn, reserveMonths, leakage, nomeYield, projectedIntake } from '../engine/economy.js';
import { heir, wife, sonsOf, isAdult, courtWives, livingSons } from '../engine/realm.js';
import { SCHOOLS, TRAITS } from '../engine/people.js';
import { fmt, clamp } from '../engine/util.js';
import { portrait } from './portraits.js';
import { esc, md, meter, k, commandsLog } from './render.js';

// ── controls ─────────────────────────────────────────────────────────────

function cmd(s, id, args, label, { cls = '', hint = '' } = {}) {
  const ok = canPerform(s, id, args);
  const cost = ACTIONS[id].cost(s, args);
  const reason = ok === true ? hint : ok;
  return `<button class="cmd ${cls}" data-cmd="${id}" data-args="${esc(JSON.stringify(args))}" ${ok === true ? '' : 'disabled'} ${reason ? `title="${esc(reason)}"` : ''}>${label}${cost ? ` <span class="cost">⚡${cost}</span>` : ''}</button>`;
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
      return `<option value="${esc(v)}" ${ok === true ? '' : 'disabled'}>${esc(label)}${ok === true ? '' : ' (unavailable)'}</option>`;
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

function granaryDesk(s) {
  const b = monthlyBurnBreakdown(s);
  const total = monthlyBurn(s);
  const intake = projectedIntake(s);
  const net = intake - total * 4;
  const o = s.overseer;
  return `${deskHead('🌾 The Granaries', 'Grain is the true currency of the Black Land. It pays the soldiers, the tomb-builders and the palace, and keeps the people from rioting.', s)}
  <div class="grid2">
    <section class="panel">
      <h3>The ledger</h3>
      <div class="kvs">
        ${stat('Royal granaries', `${fmt(s.grain.royal)} khar`)}
        ${stat('Sealed reserve', `${fmt(s.grain.sealed)} khar`)}
        ${stat('Monthly burn', `${fmt(total)} khar`)}
        ${stat('Reserve', `${reserveMonths(s).toFixed(1)} months`)}
        ${stat('Next tax barges', `≈ ${fmt(intake)} khar`)}
        ${stat('Season balance', `<span class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</span>`)}
      </div>
      <p class="small muted">Burn: army ${k(b.army)} · workforce ${k(b.workforce)} · palace ${k(b.palace)}${b.monuments ? ` · monuments ${k(b.monuments)}` : ''} khar a month. Scribal leakage ${Math.round(leakage(s) * 100)}%. The nomes report ${Math.round(nomeYield(s) * 100)}% of their harvest.</p>
      ${s.templeLoan ? `<p class="warn small">You owe Karnak ${fmt(s.templeLoan.amount * 1.1)} khar, due in ${Math.max(0, s.templeLoan.dueTurn - s.turn)} season(s).</p>` : ''}
    </section>
    <section class="panel">
      <h3>Standing orders <span class="muted small">(free)</span></h3>
      <div class="policy"><span>Army rations</span>${seg(s, 'granary.ration', { group: 'army' }, 'level', [[1, 'Full'], [0.75, 'Reduced'], [0.5, 'Half']], s.armyRation)}</div>
      <p class="hint">Each step down saves ${fmt(s.burn.army / 4)} khar a month. Morale falls every season you stay below full.</p>
      <div class="policy"><span>Workforce rations</span>${seg(s, 'granary.ration', { group: 'workforce' }, 'level', [[1, 'Full'], [0.75, 'Reduced']], s.policy.workforceRation)}</div>
      <p class="hint">Reduced rations save ${fmt(s.burn.workforce / 4)} khar a month, but halve work on your tomb and risk a strike.</p>
      <div class="policy"><span>Palace household</span>${seg(s, 'granary.palace', {}, 'level', [['lavish', 'Lavish'], ['normal', 'Normal'], ['austere', 'Austere']], s.policy.palace)}</div>
      <p class="hint">Lavish pleases the harem each season; austere angers it.</p>
      <div class="policy"><span>Tax quota</span>${seg(s, 'granary.tax', {}, 'level', [['light', 'Light'], ['standard', 'Standard'], ['heavy', 'Heavy']], s.policy.tax)}</div>
      <p class="hint">Heavy: +15% intake, but every nome loses loyalty and Ma’at slips each season. Light: −15%, nomes grow loyal.</p>
    </section>
  </div>
  <section class="panel">
    <h3>Orders</h3>
    <div class="cmds">
      ${cmd(s, 'granary.seal', { amount: 100000 }, 'Seal 100,000 khar')}
      ${cmd(s, 'granary.seal', { amount: 250000 }, 'Seal 250,000 khar')}
      ${cmd(s, 'granary.unseal', { amount: 100000 }, 'Open 100,000 of the reserve')}
      ${cmd(s, 'granary.feed', {}, 'Feed the people (100,000 khar)')}
      ${['canaan', 'alashiya', 'hatti'].map((r) => cmd(s, 'granary.buy', { realm: r }, `Buy grain from ${s.realms[r].name} (250 dbn)`)).join('')}
      ${cmd(s, 'granary.borrow', {}, 'Borrow 250,000 khar from Karnak')}
      ${cmd(s, 'granary.repay', {}, 'Repay Karnak early')}
    </div>
    <p class="hint">Sealed grain is safe from rot and rations, and unlocks <span class="badge">Prepared</span> options when famine, strikes or riots strike.</p>
  </section>
  <section class="panel official">
    ${person(o, 64)}
    <div><h3>${esc(o.name)}, ${esc(o.title)}</h3><p class="small">Competence ${o.competence} · Integrity ${o.integrity} · Loyalty ${o.loyalty}. About ${(((0.005 + ((100 - o.integrity) / 100) * 0.03) * (s.flags.granaryComplex ? 0.5 : 1)) * 100).toFixed(1)}% of the royal grain rots or vanishes each season under him.</p>
    <p class="small muted">Replace him from the Court desk.</p></div>
  </section>`;
}

// ── ⚔️ ARMY ───────────────────────────────────────────────────────────────

function armyDesk(s) {
  const threat = coupThreat(s);
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
        </div>
        <div class="cmds">
          ${pickCmd(s, 'army.command', { unitId: u.id }, 'personId', people, 'Change commander')}
          ${pickCmd(s, 'army.station', { unitId: u.id }, 'station', Object.entries(STATIONS).map(([id, st]) => [id, st.name]), 'Send to')}
        </div>
      </article>`;
    })
    .join('');
  const camp = Object.entries(CAMPAIGNS)
    .map(([id, t]) => {
      const power = armyPower(s, ['capital', t.station]);
      const p = clamp(0.5 + (power / t.difficulty - 1) * 0.5, 0.1, 0.9);
      const odds = p >= 0.7 ? 'good' : p >= 0.5 ? 'even' : 'poor';
      return `<div class="camp"><div><strong>${esc(t.name)}</strong><br><span class="small muted">${esc(t.note)}. Forces at the capital and ${esc(STATIONS[t.station].name)}: power ${fmt(power)}. Odds: <span class="${odds === 'poor' ? 'bad' : odds === 'good' ? 'good' : 'warn'}">${odds}</span>.</span></div>
        <div class="cmds">${cmd(s, 'army.campaign', { target: id, leader: 'commanders' }, 'Send the army')}${cmd(s, 'army.campaign', { target: id, leader: 'pharaoh' }, 'Pharaoh leads')}</div></div>`;
    })
    .join('');
  const gens = s.army.generals
    .map((g) => `<div class="mini-person">${person(g, 44)}<div><strong>${esc(g.name)}</strong><br><span class="small">Martial ${g.martial} · Loyalty <span class="${loyaltyTone(g.loyalty)}">${g.loyalty}</span> · Ambition ${g.ambition}${g.royalKin ? ' · royal son-in-law' : ''}</span></div></div>`)
    .join('');
  return `${deskHead('⚔️ The Army', 'The Ramesside divisions, the Chariot Corps, the Medjay and the Sherden guard. An unpaid army marches on the palace; a loyal one wins wars.', s)}
  <section class="panel">
    <div class="kvs">${stat('Men under arms', fmt(totalMen(s)))}${stat('Grain a month', `${fmt(s.burn.army * s.armyRation)} khar`)}${stat('Average morale', `${Math.round(avgMorale(s))}%`)}${stat('Rations', s.armyRation === 1 ? 'Full' : s.armyRation === 0.5 ? 'Half' : 'Reduced')}${stat('Arrears', `${s.arrears.army} months`)}</div>
    ${threat && threat.risk > 0.05 ? `<p class="bad small">⚠ ${esc(threat.person.isSon ? `Prince ${threat.person.name}` : `General ${threat.person.name}`)} commands ${fmt(threat.men)} men at the capital with loyalty ${threat.person.loyalty}. Coup risk each season: about ${Math.round(threat.risk * 100)}%.</p>` : '<p class="small good">No commander at the capital is a danger to the throne.</p>'}
    <div class="cmds">${cmd(s, 'army.bonus', {}, 'Award the Gold of Valor (400 dbn)')}</div>
  </section>
  <div class="units">${rows}</div>
  <div class="grid2">
    <section class="panel"><h3>Campaigns</h3>${camp}<p class="hint">One campaign a year. Pharaoh leading improves the odds and the glory, but risks his health and leaves the palace to the harem.</p></section>
    <section class="panel"><h3>Generals</h3><div class="people">${gens}</div><p class="hint">Marry a daughter to a general from the Royal Family desk to bind his loyalty.</p></section>
  </div>`;
}

// ── 🪷 ROYAL FAMILY ──────────────────────────────────────────────────────

function familyDesk(s) {
  const p = s.pharaoh;
  const h = heir(s);
  const wifeCards = courtWives(s)
    .map((w) => {
      const kids = [...sonsOf(s, w.id), ...(s.daughters || []).filter((d) => d.alive && d.motherId === w.id)];
      return `<article class="card">
        <div class="card__head">${person(w, 72)}<div><h4>${esc(w.name)}${w.rumored ? ' <span class="badge badge--bad">whispers</span>' : ''}</h4>
          <span class="small">${esc(w.title)}${w.age ? `, ${w.age}` : ''}</span><br><span class="small muted">${esc(w.origin)}</span></div></div>
        <div class="bars"><span>Satisfaction</span>${meter(w.satisfaction, { label: 'satisfaction' })}<b>${w.satisfaction}</b><span>Influence</span>${meter(w.influence, { tone: 'lapis', label: 'influence' })}<b>${w.influence}</b></div>
        <p class="small">${kids.length ? `Children: ${kids.map((c) => esc(c.name)).join(', ')}` : 'No children yet'}${s.pregnancy?.wifeId === w.id ? ' · <strong>with child</strong>' : ''}</p>
        <div class="cmds">
          ${cmd(s, 'family.favor', { wifeId: w.id }, 'Spend the season with her', { hint: 'Her satisfaction +12, the others −3. She may conceive.' })}
          ${cmd(s, 'family.gift', { wifeId: w.id }, 'Grant estates (250 dbn)')}
          ${w.title.startsWith('Great') ? '' : cmd(s, 'family.elevate', { wifeId: w.id }, 'Make Great Royal Wife', { hint: 'Her sons gain Legitimacy; the current queen and her sons lose it.' })}
          ${cmd(s, 'family.sideline', { wifeId: w.id }, 'Banish from your presence')}
        </div>
      </article>`;
    })
    .join('');

  const children = [...livingSons(s), ...(s.daughters || []).filter((d) => d.alive)].sort((a, b) => b.age - a.age);
  const childCards = children
    .map((c) => {
      const mother = wife(s, c.motherId);
      const isHeir = c.id === s.heirId;
      const trait = TRAITS[c.trait];
      const schoolSel =
        !c.edu && c.age >= 4 && c.age <= 15
          ? pickCmd(s, 'family.educate', { childId: c.id }, 'school', Object.entries(SCHOOLS).map(([id, sc]) => [id, `${sc.name}: ${sc.note}`]), 'Send to school…')
          : '';
      const matches = !c.spouse && c.office !== 'gods_wife' && !c.abroad && isAdult(c) ? matchOptions(s, c) : [];
      const marry = matches.length
        ? `<details class="match"><summary>💍 Arrange a marriage <span class="cost">⚡2</span></summary><div class="match__list">${matches
            .map((m) => `<div class="match__item"><div><strong>${esc(m.label)}</strong><br><span class="small muted">${esc(m.hint)}</span></div>${cmd(s, 'family.marry', { childId: c.id, matchId: m.id }, 'Arrange')}</div>`)
            .join('')}</div></details>`
        : '';
      const sonCmds =
        c.sex === 'm'
          ? `${isHeir ? '' : cmd(s, 'family.designate', { sonId: c.id }, 'Name Crown Prince')}${isAdult(c) && !s.flags.ptahPriest ? cmd(s, 'family.ptah', { sonId: c.id }, 'High Priest of Ptah') : ''}`
          : '';
      return `<article class="card${isHeir ? ' card--heir' : ''}">
        <div class="card__head">${person(c, 72)}<div><h4>${isHeir ? '👑 ' : ''}${c.sex === 'm' ? 'Prince' : 'Princess'} ${esc(c.name)}</h4>
          <span class="small">Age ${c.age} · ${esc(c.role || '')}</span><br><span class="small muted">Mother: ${esc(mother?.name ?? '—')}${trait ? ` · ${trait.icon} ${trait.name}` : ''}${c.edu ? ` · 🎓 ${esc(SCHOOLS[c.edu]?.name ?? c.edu)}` : ''}</span></div></div>
        ${c.sex === 'm' ? `<div class="bars"><span>Legitimacy</span>${meter(c.legitimacy, { tone: 'lapis', label: 'legitimacy' })}<b>${c.legitimacy}</b><span>Loyalty</span>${meter(c.loyalty, { label: 'loyalty' })}<b>${c.loyalty}</b></div>` : ''}
        <p class="small">${c.spouse ? `💍 Married to ${esc(c.spouse)}` : c.office === 'gods_wife' ? '🪔 God’s Wife of Amun' : isAdult(c) ? 'Unmarried' : 'Too young to marry'}</p>
        <div class="cmds">${schoolSel}${sonCmds}</div>${marry}
      </article>`;
    })
    .join('');

  const weakNomes = [...s.nomes].sort((a, b) => a.loyalty - b.loyalty).slice(0, 3);
  const sources = [
    ...weakNomes.map((n) => [`nome:${n.id}`, `A daughter of Nomarch ${n.nomarch} of ${n.name} (loyalty +15)`]),
    ...['hatti', 'babylon', 'alashiya', 'canaan', 'assyria'].map((r) => [`foreign:${r}`, `A princess of ${s.realms[r].name} (relation ${s.realms[r].relation}, needs 30)`]),
    ...s.army.generals.map((g) => [`general:${g.id}`, `The daughter of General ${g.name}`]),
    ['harem', 'A beauty of the royal household (no politics)'],
  ];

  return `${deskHead('🪷 The Royal Family', 'Every wife is a faction and every child is a card to play: schooled, married, appointed, or named heir.', s)}
  <section class="panel official">
    ${person(p, 84)}
    <div><h3>${esc(p.name)} <span class="muted">(${esc(p.throneName)})</span></h3><p class="small">Age ${p.age} · Health ${p.health}/100. ${esc(p.condition)}.</p>
    <p class="small">${h ? `Crown Prince: <strong>${esc(h.name)}</strong> (Legitimacy ${h.legitimacy}).` : '<span class="bad">No heir is designated.</span>'} ${s.flags.godsWife ? 'A royal daughter serves as God’s Wife of Amun.' : ''}</p></div>
  </section>
  <h3 class="section-title">Wives</h3>
  <div class="cards">${wifeCards}</div>
  <section class="panel"><h3>Take a new wife <span class="cost">⚡2</span></h3><div class="cmds">${pickCmd(s, 'family.take_wife', {}, 'source', sources, 'Choose a bride…')}</div><p class="hint">Every new wife pleases her family and annoys the harem. Seven wives at most.</p></section>
  <h3 class="section-title">Children</h3>
  <div class="cards">${childCards || '<p class="muted">No living children.</p>'}</div>`;
}

// ── 🏛️ COURT ─────────────────────────────────────────────────────────────

const OFFICE_EFFECT = {
  vizier: (s, o) => `Runs the southern scribes. With the northern Vizier he sets scribal leakage (now ${Math.round(leakage(s) * 100)}%). Competence above 70 gives Pharaoh +1 Royal Attention each season${o.competence >= 70 ? ' (active)' : ''}.`,
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
      const cands = short
        ? `<div class="cands">${short
            .map((c) => `<div class="cand">${person(c, 48)}<div><strong>${esc(c.name)}</strong> <span class="small muted">${esc(c.originLabel)}, ${c.age}</span><br><span class="small">Competence ${c.competence} · Integrity ${c.integrity} · Ambition ${c.ambition} · Loyalty ${c.loyalty}</span></div>${cmd(s, 'court.appoint', { office, candidateId: c.id }, 'Appoint')}</div>`)
            .join('')}</div>`
        : '';
      const sonOpts = office !== 'highPriest' && sons.length ? `<div class="cmds">${sons.map((x) => cmd(s, 'court.appoint', { office, candidateId: `son:${x.id}` }, `Appoint Prince ${esc(x.name)}`, { hint: 'A son in office: his Legitimacy and Loyalty rise, and so does his power.' })).join('')}</div>` : '';
      return `<article class="card">
        <div class="card__head">${person(o, 72)}<div><h4>${esc(o.name)}</h4><span class="small">${esc(OFFICES[office])}${o.age ? `, ${o.age}` : ''}</span></div></div>
        <div class="bars"><span>Competence</span>${meter(o.competence, { tone: 'lapis', label: 'competence' })}<b>${o.competence}</b><span>Integrity</span>${meter(o.integrity, { label: 'integrity' })}<b>${o.integrity}</b><span>Loyalty</span>${meter(o.loyalty ?? 50, { label: 'loyalty' })}<b>${o.loyalty ?? 50}</b></div>
        <p class="small">${esc(OFFICE_EFFECT[office](s, o))}</p>
        <div class="cmds">${cmd(s, 'court.reward', { office }, 'Reward (200 dbn)')}${cmd(s, 'court.shortlist', { office }, 'Summon candidates')}</div>
        ${cands}${sonOpts}
      </article>`;
    })
    .join('');
  return `${deskHead('🏛️ The Court', 'Egypt is ruled through its officials. A loyal Vizier is Pharaoh’s strongest tool, and an ambitious one his greatest danger.', s)}<div class="cards">${cards}</div>`;
}

// ── 🗺️ THE TWO LANDS ────────────────────────────────────────────────────

function nomesDesk(s) {
  const rows = s.nomes
    .map((n) => {
      const honesty = n.loyalty < 30 ? 'hides a quarter of its harvest' : n.loyalty < 45 ? 'under-reports its harvest' : 'reports honestly';
      return `<article class="card">
        <div class="card__head">${person({ kind: 'nomarch', seed: n.seed, age: 50 }, 60)}<div><h4>${esc(n.name)}</h4><span class="small">Nomarch ${esc(n.nomarch)}${n.hereditary ? ' · <span class="badge">hereditary</span>' : ''}${n.kinOf ? ` · kin of ${esc(wife(s, n.kinOf)?.name ?? '')}` : ''}${n.royalKin ? ' · married into the royal house' : ''}</span></div></div>
        <div class="bars"><span>Loyalty</span>${meter(n.loyalty, { label: 'loyalty' })}<b>${n.loyalty}</b></div>
        <p class="small">${Math.round(n.share * 100)}% of the realm’s harvest · yield ×${n.yield.toFixed(2)} · <span class="${n.loyalty < 45 ? 'warn' : 'good'}">${honesty}</span>${n.canalUntil ? ' · canals being dug' : ''}</p>
        <div class="cmds">
          ${cmd(s, 'nome.audit', { nomeId: n.id }, 'Audit', { hint: 'Find hidden grain. The less loyal the nome, the more you find, and the angrier it gets.' })}
          ${cmd(s, 'nome.visit', { nomeId: n.id }, 'Royal progress')}
          ${n.hereditary ? cmd(s, 'nome.revoke', { nomeId: n.id }, 'Revoke heredity') : cmd(s, 'nome.heredity', { nomeId: n.id }, 'Confirm heredity')}
          ${cmd(s, 'nome.replace', { nomeId: n.id }, 'Replace Nomarch')}
          ${cmd(s, 'nome.canal', { nomeId: n.id }, 'Dig canals (60k khar)')}
        </div>
      </article>`;
    })
    .join('');
  return `${deskHead('🗺️ The Two Lands', 'Eight great nomes from Thebes to the Delta. Their Nomarchs collect your grain and draft your laborers, and each wants his office to pass to his son.', s)}
  <section class="panel"><div class="kvs">${stat('Bureaucracy approval', `${s.blocs.bureaucracy.approval}%`)}${stat('Harvest reported', `${Math.round(nomeYield(s) * 100)}%`)}${stat('Hereditary nomes', `${s.nomes.filter((n) => n.hereditary).length} of 8`)}${stat('Tax quota', s.policy.tax)}</div></section>
  <div class="cards">${rows}</div>`;
}

// ── 🌍 FOREIGN COURTS ───────────────────────────────────────────────────

const TRADE_TEXT = { hatti: 'Grain for chariot horses (100k khar)', alashiya: 'Grain for copper (80k khar)', canaan: 'Sell grain for silver (50k khar)', babylon: 'Gold for lapis and horses (300 dbn)', assyria: 'Gold for luxuries (300 dbn)' };

function foreignDesk(s) {
  const cards = Object.entries(s.realms)
    .map(([id, r]) => {
      const rel = r.relation;
      const tone = rel >= 40 ? 'good' : rel >= 0 ? 'warn' : 'bad';
      return `<article class="card">
        <div class="card__head"><span class="realm-glyph" aria-hidden="true">${{ hatti: '🏔️', babylon: '🏺', assyria: '🦁', alashiya: '⛵', canaan: '🏰', libu: '🏜️' }[id]}</span><div><h4>${esc(r.name)}</h4><span class="small">${esc(r.ruler)}</span><br><span class="small muted">${esc(r.note)}</span></div></div>
        <div class="bars"><span>Relation</span>${meter(clamp((rel + 100) / 2, 0, 100), { tone, label: 'relation' })}<b>${rel}</b></div>
        <div class="cmds">
          ${r.hostile ? '<span class="small muted">Only the army speaks to the Libu. See the Army desk.</span>' : `
          ${cmd(s, 'foreign.gift', { realm: id, size: 'modest' }, 'Gifts (300 dbn)')}
          ${cmd(s, 'foreign.gift', { realm: id, size: 'lavish' }, 'Lavish gifts (900 dbn)')}
          ${cmd(s, 'foreign.trade', { realm: id }, TRADE_TEXT[id])}
          ${id === 'canaan' ? cmd(s, 'foreign.tribute', {}, 'Demand tribute', { hint: 'Works only with a garrison stationed in Canaan.' }) : cmd(s, 'family.take_wife', { source: `foreign:${id}` }, 'Request a royal bride', { hint: 'Needs a relation of 30. Brings a dowry and a new faction into your harem.' })}`}
        </div>
      </article>`;
    })
    .join('');
  return `${deskHead('🌍 Foreign Courts', '“Gold is as common as dust in Egypt,” the foreign kings write, and ask for more. Gold buys their friendship; brides bind it.', s)}<div class="cards">${cards}</div>`;
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

function chronicleDesk(s) {
  const items = [...s.chronicle].reverse().map((c) => `<li><span class="muted small">Year ${c.year}, ${['Akhet', 'Peret', 'Shemu'][c.season]}</span><br><strong>${md(c.title)}</strong>${c.text ? `<br><span class="small">${md(c.text)}</span>` : ''}</li>`).join('');
  return `${deskHead('📜 The Chronicle', 'What the scribes have recorded of your reign.', s)}${commandsLog(s)}<section class="panel"><ol class="chronicle">${items || '<li class="muted">The scribes await your first decree.</li>'}</ol></section>`;
}

export const DESK_RENDERERS = {
  granary: granaryDesk,
  army: armyDesk,
  family: familyDesk,
  court: courtDesk,
  nomes: nomesDesk,
  foreign: foreignDesk,
  monuments: monumentsDesk,
  chronicle: chronicleDesk,
};
