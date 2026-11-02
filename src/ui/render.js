// Renders the Strategic Briefing Dashboard (DESIGN.md §7) from game state.
import { currentEvent, optionsFor, briefText } from '../engine/game.js';
import { BLOCS, BLOC_LABELS, BLOC_ICONS, FLOOD_BANDS, SEASON_MEANING } from '../engine/constants.js';
import { monthlyBurnBreakdown, monthlyBurn, reserveMonths, surplusGrain } from '../engine/economy.js';
import { cubitsLabel } from '../engine/flood.js';
import {
  approval,
  maatState,
  heir,
  wife,
  courtWives,
  livingSons,
  rivalClaimant,
  mostDangerousWife,
  seasonName,
} from '../engine/realm.js';
import { fmt, resolve } from '../engine/util.js';
import { demands } from '../content/demands.js';

// ── helpers ──────────────────────────────────────────────────────────────

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Escape, then apply **bold** and *italic*. */
export const md = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

const k = (n) => (n >= 1000 ? `${fmt(n / 1000)}k` : fmt(n));

function meter(value, { tone = 'auto', label = '' } = {}) {
  const t = tone === 'auto' ? (value >= 60 ? 'good' : value >= 35 ? 'warn' : 'bad') : tone;
  return `<span class="meter meter--${t}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}" aria-label="${esc(label)}"><span style="width:${Math.max(2, Math.min(100, value))}%"></span></span>`;
}

const chipHtml = (c) => {
  const cls = c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : 'flat';
  const sign = c.delta > 0 ? '+' : c.delta < 0 ? '−' : '±';
  const v = Math.abs(c.delta);
  const num = v >= 1000 ? fmt(v) : Math.round(v * 10) / 10;
  return `<span class="chip chip--${cls}">${esc(c.label)} ${sign}${num}${esc(c.unit)}</span>`;
};

// ── header ───────────────────────────────────────────────────────────────

export function renderDate(state) {
  const s = seasonName(state);
  return `Regnal Year ${state.year} · ${s} <span class="muted">(${SEASON_MEANING[s]})</span>`;
}

// ── 👑 THE STATE OF THE REALM ────────────────────────────────────────────

function stateOfRealm(state) {
  const p = state.pharaoh;
  const band = FLOOD_BANDS[state.flood.band];
  const burn = monthlyBurnBreakdown(state);
  const total = monthlyBurn(state);
  const h = heir(state);
  const rival = rivalClaimant(state);
  const d = demands(state);
  const dw = mostDangerousWife(state);

  const health = p.health >= 60 ? 'Vigorous' : p.health >= 35 ? 'Ailing' : 'Failing';
  const preg = state.pregnancy ? wife(state, state.pregnancy.wifeId) : null;

  const blocRows = BLOCS.map((b) => {
    const a = approval(state, b);
    const extra =
      b === 'harem' && dw
        ? `Most dangerous wife: ${dw.name}, ${dw.satisfaction}% satisfied${livingSons(state).some((x) => x.motherId === dw.id) ? `, mother of ${livingSons(state).filter((x) => x.motherId === dw.id).map((x) => x.name).join(' & ')}` : ''}`
        : '';
    return `<li class="bloc">
      <div class="bloc__head"><span class="bloc__name">${BLOC_ICONS[b]} <em>${esc(BLOC_LABELS[b])}:</em></span> <strong class="bloc__pct">${a}%</strong> ${meter(a, { label: `${BLOC_LABELS[b]} approval` })}</div>
      <div class="bloc__demand">Current demands: ${esc(d[b])}${extra ? `<br><span class="muted">${esc(extra)}</span>` : ''}</div>
    </li>`;
  }).join('');

  return `<section class="panel realm" aria-labelledby="realm-h">
    <h2 id="realm-h">👑 THE STATE OF THE REALM</h2>
    <ul class="realm__list">
      <li><strong>Ruler Health &amp; Age:</strong> ${esc(p.name)} <span class="muted">(${esc(p.throneName)})</span>, age ${p.age}. ${health} (${p.health}/100). <span class="muted">${esc(p.condition)}.</span>
        <div class="maat-inline"><strong>Ma’at: ${state.maat}/100, ${esc(maatState(state.maat))}.</strong> ${meter(state.maat, { label: 'Ma’at' })}</div>
        <div class="muted">Nile this year: ${cubitsLabel(state.flood.height)} cubits, ${esc(band.name)}. Harvest projected at ${Math.round(state.harvestModifier * 100)}% of normal.</div>
      </li>
      <li><strong>The Treasury &amp; Granaries:</strong>
        Royal granaries <strong>${fmt(state.grain.royal)} khar</strong>. Burn ${fmt(total)} khar/month
        <span class="muted">(army ${k(burn.army)} · workforce ${k(burn.workforce)} · palace ${k(burn.palace)}${burn.monuments ? ` · monuments ${k(burn.monuments)}` : ''})</span>
        → <strong class="${reserveMonths(state) < 2 ? 'bad' : ''}">${reserveMonths(state).toFixed(1)} months</strong> of reserve.
        ${state.grain.sealed ? `<br>Sealed reserve: <strong>${fmt(state.grain.sealed)} khar</strong>.` : ''}
        <br>Gold: <strong>${fmt(state.gold)} deben</strong> <span class="muted">(diplomatic reserve ${fmt(state.goldReserve)})</span>.
        Amun’s granaries <span class="muted">(not yours)</span>: ${fmt(state.grain.temple)} khar.
        ${state.arrears.army || state.arrears.workforce ? `<br><span class="bad">Arrears: army ${state.arrears.army} mo · workforce ${state.arrears.workforce} mo.</span>` : ''}
        ${state.armyRation < 1 ? '<br><span class="warn">Native regiments on half rations.</span>' : ''}
      </li>
      <li><strong>The Dynastic Succession:</strong>
        ${h ? `Crown Prince <strong>${esc(h.name)}</strong>, age ${h.age}, son of ${esc(wife(state, h.motherId)?.name ?? 'an unknown mother')}. <strong>Legitimacy ${h.legitimacy} · Loyalty ${h.loyalty}</strong>.` : '<span class="bad">No designated heir.</span>'}
        ${rival ? `<br>Shadow claimant: <strong>Prince ${esc(rival.name)}</strong>, age ${rival.age}, son of ${esc(wife(state, rival.motherId)?.name ?? '?')}, ${esc(rival.role)}. Legitimacy ${rival.legitimacy} · Loyalty ${rival.loyalty}.` : ''}
        ${preg ? `<br><span class="muted">${esc(preg.name)} is with child.</span>` : ''}
      </li>
      <li><strong>Faction Support:</strong><ul class="blocs">${blocRows}</ul></li>
    </ul>
  </section>`;
}

// ── ⚡ / 🌅 the briefing ─────────────────────────────────────────────────

function briefing(state) {
  const ev = currentEvent(state);
  const ctx = state.briefing.ctx || {};
  const title = resolve(ev.title, state, ctx);
  const paras = briefText(state).map((p) => `<p>${md(p)}</p>`).join('');
  const opp = ev.type === 'opportunity';

  const omens = opp
    ? `<section class="panel omens" aria-labelledby="omens-h">
        <h2 id="omens-h">🔭 OMENS ON THE HORIZON</h2>
        <ul>${state.omens.map((o) => `<li>${md(o.text)}</li>`).join('') || '<li class="muted">The horizon is clear, for now.</li>'}</ul>
      </section>`
    : '';

  const labels = opp
    ? ['Investment', 'Political Dividend', 'Long-Term Dynastic Legacy']
    : ['Immediate Cost', 'Political Fallout', 'Long-Term Dynastic Risk'];

  const options = optionsFor(state)
    .map(
      (o, i) => `<article class="option${o.unlocked ? ' option--unlocked' : ''}">
        <h3><span class="option__num">Option ${i + 1}:</span> ${md(o.title)}${o.unlocked ? ' <span class="badge">Prepared</span>' : ''}</h3>
        <dl>
          <dt>${labels[0]}</dt><dd>${md(o.cost)}</dd>
          <dt>${labels[1]}</dt><dd>${md(o.fallout)}</dd>
          <dt>${labels[2]}</dt><dd>${md(o.risk)}</dd>
        </dl>
        <button class="btn btn--decree" data-decree="${esc(o.id)}" data-key="${i + 1}">Seal this decree <kbd>${i + 1}</kbd></button>
      </article>`,
    )
    .join('');

  return `<section class="panel brief brief--${ev.type}" aria-labelledby="brief-h">
      <h2 id="brief-h">${opp ? '🌅 THE GODS SMILE: OPPORTUNITY OF THE SEASON' : '⚡ CURRENT CRISIS DECREE'}</h2>
      <h3 class="brief__title">${md(title)}</h3>
      ${opp ? `<p class="muted">Surplus above six months of rations: <strong>${fmt(surplusGrain(state))} khar</strong>.</p>` : ''}
      ${paras}
    </section>
    ${omens}
    <section class="panel options" aria-labelledby="opts-h">
      <h2 id="opts-h">${opp ? '🏛️ THE ROYAL INVESTMENTS' : '📜 THE STRATEGIC OPTIONS'}</h2>
      <div class="options__grid">${options}</div>
      <p class="muted counter">Counter-proposals are judged by the court oracle, which is not built yet. For now, choose one of the decrees above.</p>
    </section>`;
}

function seasonReport(state) {
  if (!state.seasonReport || !state.seasonReport.length) return '';
  return `<details class="panel report" open>
    <summary>📯 Since last season</summary>
    <ul>${state.seasonReport.map((r) => `<li>${md(r)}</li>`).join('')}</ul>
  </details>`;
}

function outcome(state) {
  const o = state.lastOutcome;
  return `<section class="panel outcome" aria-labelledby="out-h">
    <h2 id="out-h">📜 THE CHRONICLE RECORDS</h2>
    <h3 class="brief__title">${md(o.eventTitle)}</h3>
    <p class="decree-seal">Decree: <strong>${md(o.decree)}</strong></p>
    ${o.lines.map((l) => `<p>${md(l)}</p>`).join('')}
    <div class="chips">${o.chips.filter((c) => c.delta).map(chipHtml).join('')}</div>
    <button class="btn btn--primary" data-action="advance">Let the season turn → <kbd>Enter</kbd></button>
  </section>`;
}

function ended(state) {
  const e = state.ending;
  return `<section class="panel ending" aria-labelledby="end-h">
    <h2 id="end-h">⚖️ THE WEIGHING OF THE HEART</h2>
    <h3 class="brief__title">${esc(e.title)}</h3>
    <p>${md(e.detail)}</p>
    <ul>${e.lines.map((l) => `<li>${md(l)}</li>`).join('')}</ul>
    <p><strong>Succession:</strong> ${md(e.succession)}</p>
    <p class="verdict"><span class="verdict__score">${e.score}</span> ${md(e.verdict)}</p>
    <button class="btn btn--primary" data-action="new">Begin a new reign</button>
  </section>`;
}

export function renderMain(state) {
  if (state.phase === 'ended') return (state.lastOutcome ? outcome(state).replace(/<button[\s\S]*?<\/button>/, '') : '') + seasonReport(state) + ended(state);
  if (state.phase === 'outcome') return outcome(state);
  return seasonReport(state) + stateOfRealm(state) + briefing(state);
}

// ── sidebar ──────────────────────────────────────────────────────────────

export function renderSidebar(state) {
  const h = heir(state);
  const wives = courtWives(state)
    .map(
      (w) => `<li>
        <div class="row"><strong>${esc(w.name)}</strong>${w.rumored ? ' <span class="badge badge--bad" title="Whispers of a plot">whispers</span>' : ''}<span class="pct">${w.satisfaction}%</span></div>
        <div class="muted small">${esc(w.title)}. Influence ${w.influence}.</div>
        ${meter(w.satisfaction, { label: `${w.name} satisfaction` })}
      </li>`,
    )
    .join('');
  const sons = livingSons(state)
    .map(
      (s) => `<li>
        <div class="row"><strong>${s.id === state.heirId ? '👑 ' : ''}${esc(s.name)}</strong><span class="muted small">age ${s.age}</span></div>
        <div class="muted small">${esc(s.role)}. Mother: ${esc(wife(state, s.motherId)?.name ?? '?')}</div>
        <div class="small">Legitimacy ${s.legitimacy} · Loyalty ${s.loyalty}</div>
      </li>`,
    )
    .join('');
  const daughters = (state.daughters || []).length
    ? `<p class="muted small">Daughters: ${(state.daughters || []).map((d) => `${esc(d.name)} (${d.age})`).join(', ')}</p>`
    : '';
  const monuments = state.monuments
    .filter((m) => m.active)
    .map(
      (m) => `<li><div class="row"><span>${esc(m.name)}</span><span class="pct">${Math.round(m.progress)}%</span></div>${meter(m.progress, { tone: m.done ? 'good' : 'lapis', label: m.name })}</li>`,
    )
    .join('');
  const chron = [...state.chronicle]
    .reverse()
    .slice(0, 10)
    .map((c) => `<li><span class="muted small">Year ${c.year}, ${['Akhet', 'Peret', 'Shemu'][c.season]}</span><br>${md(c.title)}</li>`)
    .join('');

  return `
    <section class="panel side maat">
      <h2>⚖️ Ma’at vs. Isfet</h2>
      <div class="maat__scale"><span>Isfet</span><span>Ma’at</span></div>
      ${meter(state.maat, { label: 'Ma’at' })}
      <p class="small"><strong>${state.maat}/100</strong>: ${esc(maatState(state.maat))}</p>
    </section>
    <section class="panel side">
      <h2>🪷 The Harem</h2>
      <ul class="roster">${wives}</ul>
    </section>
    <section class="panel side">
      <h2>🦅 King’s Sons</h2>
      <ul class="roster">${sons || '<li class="muted">No living sons.</li>'}</ul>
      ${daughters}
      ${h ? '' : '<p class="bad small">No heir has been designated.</p>'}
    </section>
    <section class="panel side">
      <h2>🦩 The Vizier</h2>
      <p class="small"><strong>${esc(state.vizier.name)}</strong>, ${esc(state.vizier.title)}<br>Competence ${state.vizier.competence} · Integrity ${state.vizier.integrity} · Ambition ${state.vizier.ambition}</p>
    </section>
    <section class="panel side">
      <h2>🧱 Monuments</h2>
      <ul class="roster">${monuments}</ul>
    </section>
    <section class="panel side">
      <h2>📜 Chronicle</h2>
      <ol class="chronicle">${chron || '<li class="muted">The scribes await your first decree.</li>'}</ol>
    </section>`;
}
