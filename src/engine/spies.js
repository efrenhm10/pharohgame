// The King's Eyes and Ears: spies planted in units, households, offices and
// foreign courts. A spy turns rumours into evidence, and evidence into arrests.
import { clamp } from './util.js';
import { chance } from './rng.js';
import { unit, commander, coupThreat } from './army.js';

export const SPY_TARGETS = {
  unit: 'an army unit',
  nome: 'a Nomarch’s household',
  wife: 'the household of a queen',
  child: 'the household of a prince',
  office: 'an official’s staff',
  realm: 'a foreign court',
};
export const SPY_UPKEEP = 30; // deben a year each

export const spyOn = (s, type, id) => (s.spies || []).find((x) => x.type === type && x.target === id);
export const knows = (s, type, id) => Boolean(spyOn(s, type, id));

export function targetName(s, type, id) {
  if (type === 'unit') return unit(s, id)?.name ?? id;
  if (type === 'nome') return s.nomes.find((n) => n.id === id)?.name ?? id;
  if (type === 'wife') return s.wives.find((w) => w.id === id)?.name ?? id;
  if (type === 'child') return [...s.sons, ...(s.daughters || [])].find((c) => c.id === id)?.name ?? id;
  if (type === 'office') return s[id]?.name ? `${s[id].name} (${s[id].title})` : id;
  if (type === 'realm') return s.realms[id]?.name ?? id;
  return id;
}

/** How watchful the target is: the chance each season that a spy is caught. */
function vigilance(s, type, id) {
  if (type === 'unit') return 0.04 + (commander(s, unit(s, id)?.commanderId)?.martial ?? 40) / 2000;
  if (type === 'nome') return 0.04 + (s.nomes.find((n) => n.id === id)?.ambition ?? 50) / 1500;
  if (type === 'wife') return 0.05 + (s.wives.find((w) => w.id === id)?.ambition ?? 50) / 1500;
  if (type === 'office') return 0.04 + (s[id]?.competence ?? 50) / 1500;
  if (type === 'realm') return 0.08;
  return 0.05;
}

/** What a spy can tell Pharaoh about the target right now. */
export function intel(s, spy) {
  const { type, target } = spy;
  if (type === 'wife') {
    const w = s.wives.find((x) => x.id === target);
    if (!w) return 'The household is gone.';
    return w.plot >= 60 ? `She is plotting, and close to acting (${Math.round(w.plot)}%). Her allies include a cupbearer and a captain of the guard.` : w.plot > 0 ? `Quiet meetings at night: a plot is forming (${Math.round(w.plot)}%).` : 'She is loyal, for now.';
  }
  if (type === 'unit') {
    const u = unit(s, target);
    const c = commander(s, u?.commanderId);
    if (!c) return 'No commander, so no one to plot. The men grumble about rations.';
    const t = coupThreat(s);
    const danger = t && t.person.id === c.id ? t.risk : 0;
    return `${c.isSon ? 'Prince' : 'General'} ${c.name}: true loyalty ${c.loyalty}. ${danger > 0.05 ? `**He is sounding out the officers about a coup** (about ${Math.round(danger * 100)}% a season).` : u.station !== 'capital' ? 'He is far from the throne.' : 'No talk of treason.'}`;
  }
  if (type === 'nome') {
    const n = s.nomes.find((x) => x.id === target);
    const hidden = n.loyalty < 30 ? 0.25 : n.loyalty < 45 ? 0.12 : 0.04;
    return `Nomarch ${n.nomarch} hides about ${Math.round(s.baselineIntake * n.share * hidden).toLocaleString('en-US')} khar from the scribes. True loyalty ${n.loyalty}, ambition ${n.ambition}.${n.loyalty < 25 ? ' **He speaks of ruling as a king in his own nome.**' : ''}`;
  }
  if (type === 'office') {
    const o = s[target];
    return `${o.name}: integrity ${o.integrity}, ambition ${o.ambition}, loyalty ${o.loyalty ?? 50}.${o.integrity < 40 ? ' **He is skimming grain.**' : ''}${(o.ambition ?? 0) > 70 && (o.loyalty ?? 50) < 45 ? ' **He talks of what he would do with the throne.**' : ''}`;
  }
  if (type === 'child') {
    const c = [...s.sons, ...(s.daughters || [])].find((x) => x.id === target);
    return c ? `${c.name}: true loyalty ${c.loyalty ?? '—'}.${(c.loyalty ?? 100) < 40 ? ' **Officers visit his house at night.**' : ''}` : 'Gone.';
  }
  if (type === 'realm') {
    const r = s.realms[target];
    return `${r.ruler} has about ${r.army.toLocaleString('en-US')} men under arms.${r.relation < -30 ? ' **His generals are planning a war against Egypt.**' : ' No plans for war.'}`;
  }
  return '';
}

export function spySeason(s, report) {
  for (const spy of [...(s.spies || [])]) {
    if (chance(s, vigilance(s, spy.type, spy.target))) {
      s.spies = s.spies.filter((x) => x !== spy);
      const who = targetName(s, spy.type, spy.target);
      report.push(`**Your spy ${spy.name} has been discovered** in ${who}. ${spy.type === 'realm' ? 'Relations suffer.' : 'Trust is broken.'}`);
      if (spy.type === 'realm') s.realms[spy.target].relation = clamp(s.realms[spy.target].relation - 15, -100, 100);
      if (spy.type === 'nome') {
        const n = s.nomes.find((x) => x.id === spy.target);
        n.loyalty = clamp(n.loyalty - 15, 0, 100);
      }
      if (spy.type === 'wife') {
        const w = s.wives.find((x) => x.id === spy.target);
        if (w) w.satisfaction = clamp(w.satisfaction - 15, 0, 100);
      }
      if (spy.type === 'office' && s[spy.target]) s[spy.target].loyalty = clamp((s[spy.target].loyalty ?? 50) - 15, 0, 100);
      if (spy.type === 'unit') {
        const c = commander(s, unit(s, spy.target)?.commanderId);
        if (c) {
          const g = s.army.generals.find((x) => x.id === c.id) || s.sons.find((x) => x.id === c.id);
          if (g) g.loyalty = clamp(g.loyalty - 15, 0, 100);
        }
      }
      continue;
    }
    // Urgent warnings arrive whether or not Pharaoh asks.
    const msg = intel(s, spy);
    if (msg.includes('**')) report.push(`👁️ *${spy.name}, your spy in ${targetName(s, spy.type, spy.target)}:* ${msg}`);
  }
}
