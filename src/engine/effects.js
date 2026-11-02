// Declarative effects applied by decrees. Every applied change is returned as
// a "chip" so the UI can show exactly what a decree cost and bought.
import { clamp } from './util.js';
import { changeMaat, changeApproval, wife, son, designateHeir } from './realm.js';
import { MONUMENT_CATALOG } from '../content/monuments.js';

const chip = (label, delta, unit = '') => ({ label, delta, unit });

function addGrain(state, ledger, delta, chips, label) {
  const before = state.grain[ledger];
  state.grain[ledger] = Math.max(0, before + delta);
  const d = state.grain[ledger] - before;
  if (d) chips.push(chip(label, d, ' khar'));
  return d;
}

/**
 * fx fields (all optional):
 *  grain, temple, sealed, gold          numeric deltas
 *  maat                                  delta (Priesthood amplifies losses)
 *  approval: { bloc: delta }             'harem' shifts every wife
 *  wives: { id: delta | {satisfaction, influence, plot, ambition} }
 *  sons:  { id: { legitimacy, loyalty } }
 *  arrears: { army, workforce }          deltas in months
 *  burn: { army, workforce, palace }     deltas in khar/month
 *  armyRation                            absolute ration level (0.5 = half)
 *  intake                                multiplier applied to baseline intake
 *  health                                Pharaoh's health delta
 *  vizier: { competence, integrity, ambition }  deltas
 *  flags: { key: value }                 merged into state.flags
 *  omen: { ... } | [ ... ]               added to the horizon
 *  monument: catalogId                   start construction
 *  heir: sonId                           designate a new Crown Prince
 */
export function applyEffects(state, fx = {}) {
  const chips = [];
  if (fx.grain) addGrain(state, 'royal', fx.grain, chips, 'Royal grain');
  if (fx.temple) addGrain(state, 'temple', fx.temple, chips, 'Temple grain');
  if (fx.sealed) addGrain(state, 'sealed', fx.sealed, chips, 'Sealed reserve');
  if (fx.gold) {
    const before = state.gold;
    state.gold = Math.max(0, state.gold + fx.gold);
    chips.push(chip('Gold', state.gold - before, ' deben'));
  }
  if (fx.maat) {
    const d = changeMaat(state, fx.maat);
    chips.push(chip("Ma'at", d));
  }
  for (const [bloc, delta] of Object.entries(fx.approval || {})) {
    changeApproval(state, bloc, delta);
    chips.push(chip(blocShort(bloc), delta, '%'));
  }
  for (const [id, v] of Object.entries(fx.wives || {})) {
    const w = wife(state, id);
    if (!w) continue;
    const ch = typeof v === 'number' ? { satisfaction: v } : v;
    for (const [k, d] of Object.entries(ch)) {
      w[k] = clamp((w[k] || 0) + d, 0, k === 'plot' ? 200 : 100);
      if (k === 'satisfaction') chips.push(chip(w.name, d, '%'));
    }
  }
  for (const [id, ch] of Object.entries(fx.sons || {})) {
    const s = son(state, id);
    if (!s || !s.alive) continue;
    for (const [k, d] of Object.entries(ch)) {
      s[k] = clamp(s[k] + d, 0, 100);
      chips.push(chip(`${s.name} ${k === 'legitimacy' ? 'Legitimacy' : 'Loyalty'}`, d));
    }
  }
  for (const [k, d] of Object.entries(fx.arrears || {})) {
    state.arrears[k] = Math.max(0, Math.round((state.arrears[k] + d) * 10) / 10);
    chips.push(chip(k === 'army' ? 'Army arrears' : 'Workforce arrears', d, ' mo'));
  }
  for (const [k, d] of Object.entries(fx.burn || {})) {
    state.burn[k] = Math.max(0, state.burn[k] + d);
    chips.push(chip(`${k[0].toUpperCase()}${k.slice(1)} burn`, d, ' khar/mo'));
  }
  if (fx.armyRation !== undefined) state.armyRation = fx.armyRation;
  if (fx.intake) {
    const before = state.baselineIntake;
    state.baselineIntake = Math.round(state.baselineIntake * fx.intake);
    chips.push(chip('Annual tax intake', state.baselineIntake - before, ' khar'));
  }
  if (fx.health) {
    state.pharaoh.health = clamp(state.pharaoh.health + fx.health, 0, 100);
    chips.push(chip("Pharaoh's health", fx.health));
  }
  for (const [k, d] of Object.entries(fx.vizier || {})) {
    state.vizier[k] = clamp(state.vizier[k] + d, 0, 100);
  }
  if (fx.flags) Object.assign(state.flags, fx.flags);
  if (fx.omen) for (const o of [].concat(fx.omen)) addOmen(state, o);
  if (fx.monument) startMonument(state, fx.monument);
  if (fx.heir) designateHeir(state, fx.heir);
  return chips;
}

export function addOmen(state, omen) {
  if (state.omens.some((o) => o.id === omen.id)) return;
  state.omens.push({ ...omen, maturesTurn: state.turn + (omen.delay ?? 3) });
}

export function startMonument(state, catalogId) {
  const def = MONUMENT_CATALOG[catalogId];
  if (!def) return;
  const instanceId = `${catalogId}-${state.turn}`;
  state.monuments.push({
    id: instanceId,
    catalogId,
    name: def.name,
    progress: 0,
    seasons: def.seasons,
    crew: Math.round(def.grain / (def.seasons * 4)),
    active: true,
    done: false,
    reward: def.reward,
  });
}

function blocShort(bloc) {
  return { priesthood: 'Priesthood', bureaucracy: 'Bureaucracy', military: 'Military', harem: 'Harem' }[bloc];
}
