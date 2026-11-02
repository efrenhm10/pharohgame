// HUD, dock and the Throne Room (the Strategic Briefing Dashboard, DESIGN.md §7).
import { currentEvent, optionsFor, briefText } from '../engine/game.js';
import { BLOCS, BLOC_LABELS, BLOC_ICONS, FLOOD_BANDS, SEASON_MEANING } from '../engine/constants.js';
import { monthlyBurnBreakdown, monthlyBurn, reserveMonths, surplusGrain } from '../engine/economy.js';
import { cubitsLabel } from '../engine/flood.js';
import { totalMen, avgMorale } from '../engine/army.js';
import { approval, maatState, heir, wife, rivalClaimant, mostDangerousWife, seasonName, livingSons } from '../engine/realm.js';
import { fmt, resolve } from '../engine/util.js';
import { demands } from '../content/demands.js';
import { portrait } from './portraits.js';

// ── helpers ──────────────────────────────────────────────────────────────

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Escape, then apply **bold** and *italic*. */
export const md = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

export const k = (n) => (Math.abs(n) >= 1000 ? `${fmt(n / 1000)}k` : fmt(n));

export function meter(value, { tone = 'auto', label = '' } = {}) {
  const t = tone === 'auto' ? (value >= 60 ? 'good' : value >= 35 ? 'warn' : 'bad') : tone;
  return `<span class="meter meter--${t}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}" aria-label="${esc(label)}"><span style="width:${Math.max(2, Math.min(100, value))}%"></span></span>`;
}

export const chipHtml = (c) => {
  const cls = c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : 'flat';
  const sign = c.delta > 0 ? '+' : c.delta < 0 ? '−' : '±';
  const v = Math.abs(c.delta);
  const num = v >= 1000 ? fmt(v) : Math.round(v * 10) / 10;
  return `<span class="chip chip--${cls}">${esc(c.label)} ${sign}${num}${esc(c.unit)}</span>`;
};

// ── HUD & dock ───────────────────────────────────────────────────────────

export const DESKS = [
  ['throne', '👑', 'Throne Room'],
  ['granary', '🌾', 'Granaries'],
  ['army', '⚔️', 'Army'],
  ['family', '🪷', 'Royal Family'],
  ['court', '🏛️', 'Court'],
  ['nomes', '🗺️', 'Two Lands'],
  ['foreign', '🌍', 'Foreign Courts'],
  ['monuments', '🧱', 'Monuments'],
  ['chronicle', '📜', 'Chronicle'],
];

export function renderHud(state) {
  const s = seasonName(state);
  const h = heir(state);
  const rm = reserveMonths(state);
  const stat = (label, value, cls = '') => `<div class="hstat ${cls}"><small>${label}</small><b>${value}</b></div>`;
  const pips = Array.from({ length: state.attention.max }, (_, i) => `<i class="${i < state.attention.left ? 'on' : ''}"></i>`).join('');
  const canEnd = state.phase === 'court';
  return `<div class="hud__inner">
    <div class="hud__who">
      <span class="hud__portrait">${portrait(state.pharaoh, 46)}</span>
      <div><b class="hud__name">${esc(state.pharaoh.name)}</b><span class="hud__date">Year ${state.year} · ${s} <span class="muted">(${SEASON_MEANING[s]})</span></span></div>
    </div>
    <div class="hud__stats">
      ${stat('Ma’at', `${state.maat}`, state.maat >= 50 ? 'good' : state.maat < 25 ? 'bad' : 'warn')}
      ${stat('Grain', `${k(state.grain.royal)} · ${rm.toFixed(1)} mo`, rm < 2 ? 'bad' : rm >= 6 ? 'good' : '')}
      ${stat('Gold', `${fmt(state.gold)} dbn`)}
      ${stat('Army', `${k(totalMen(state))} · ${Math.round(avgMorale(state))}% morale`, avgMorale(state) < 35 ? 'bad' : '')}
      ${stat('Heir', h ? `${esc(h.name)} (${h.legitimacy})` : 'None', h ? '' : 'bad')}
      <div class="hstat attention" title="Royal Attention: what Pharaoh can personally see to this season"><small>Royal Attention</small><b class="pips">${pips} <span>${state.attention.left}/${state.attention.max}</span></b></div>
    </div>
    <button class="btn btn--primary hud__end" data-action="advance" ${canEnd ? '' : 'disabled'} title="${canEnd ? 'End the season' : 'Seal this season’s decree in the Throne Room first'}">${canEnd ? 'End the season →' : 'Decree pending'}</button>
  </div>`;
}

/** Phone-only bar fixed to the bottom of the screen. */
export function renderMobileBar(state) {
  const pips = Array.from({ length: state.attention.max }, (_, i) => `<i class="${i < state.attention.left ? 'on' : ''}"></i>`).join('');
  const canEnd = state.phase === 'court';
  if (state.phase === 'ended') return '';
  return `<span class="pips" aria-label="Royal Attention ${state.attention.left} of ${state.attention.max}">⚡ ${pips}</span>
    ${canEnd ? '<button class="btn btn--primary" data-action="advance">End the season →</button>' : '<button class="btn btn--ghost" data-tab="throne">Decree pending: go to the Throne Room</button>'}`;
}

export function renderDock(state, tab) {
  return DESKS.map(
    ([id, icon, name]) =>
      `<button class="dock__tab${tab === id ? ' on' : ''}" data-tab="${id}" aria-pressed="${tab === id}">${icon} <span>${name}</span>${id === 'throne' && state.phase === 'briefing' ? '<i class="dot" title="A decree is waiting"></i>' : ''}</button>`,
  ).join('');
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
        ${state.armyRation < 1 ? `<br><span class="warn">The army is on ${state.armyRation === 0.5 ? 'half' : 'reduced'} rations.</span>` : ''}
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

  const labels = opp ? ['Investment', 'Political Dividend', 'Long-Term Dynastic Legacy'] : ['Immediate Cost', 'Political Fallout', 'Long-Term Dynastic Risk'];

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
      <p class="muted small">You can also give orders from the other desks before or after sealing this decree. The season ends when you choose.</p>
      <div class="options__grid">${options}</div>
    </section>`;
}

function seasonReport(state) {
  if (!state.seasonReport || !state.seasonReport.length) return '';
  return `<details class="panel report" ${state.phase === 'briefing' ? 'open' : ''}>
    <summary>📯 Since last season</summary>
    <ul>${state.seasonReport.map((r) => `<li>${md(r)}</li>`).join('')}</ul>
  </details>`;
}

export function commandsLog(state) {
  if (!state.commands?.length) return '';
  return `<section class="panel commands">
    <h2>🪶 This season’s commands</h2>
    <ul>${state.commands.map((c) => `<li><strong>${md(c.title)}.</strong> ${c.lines.map(md).join(' ')} <span class="chips chips--inline">${c.chips.map(chipHtml).join('')}</span></li>`).join('')}</ul>
  </section>`;
}

function outcome(state, { withButton = true } = {}) {
  const o = state.lastOutcome;
  if (!o) return '';
  return `<section class="panel outcome" aria-labelledby="out-h">
    <h2 id="out-h">📜 THE CHRONICLE RECORDS</h2>
    <h3 class="brief__title">${md(o.eventTitle)}</h3>
    <p class="decree-seal">Decree: <strong>${md(o.decree)}</strong></p>
    ${o.lines.map((l) => `<p>${md(l)}</p>`).join('')}
    <div class="chips">${o.chips.filter((c) => c.delta).map(chipHtml).join('')}</div>
    ${withButton ? `<div class="outcome__next">
      <p class="muted">The decree is sealed. You have <strong>${state.attention.left} Royal Attention</strong> left: visit the desks to give orders, or end the season.</p>
      <div class="row">${DESKS.slice(1, 7).map(([id, icon, name]) => `<button class="btn btn--ghost" data-tab="${id}">${icon} ${name}</button>`).join('')}</div>
      <button class="btn btn--primary" data-action="advance">End the season → <kbd>Enter</kbd></button>
    </div>` : ''}
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

export function renderThrone(state) {
  if (state.phase === 'ended') return outcome(state, { withButton: false }) + seasonReport(state) + ended(state);
  if (state.phase === 'court') return outcome(state) + commandsLog(state) + seasonReport(state) + stateOfRealm(state);
  return seasonReport(state) + commandsLog(state) + stateOfRealm(state) + briefing(state);
}
