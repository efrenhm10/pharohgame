// The Weighing of the Heart — judgment of a reign when it ends.
import { heir, rivalClaimant, isAdult, heirTitle, possessive } from './realm.js';

const MONUMENT_POINTS = { obelisks: 4, pylon: 10, mortuary: 15 };

const CAUSES = {
  death: 'Death of Pharaoh',
  usurped: 'The Throne Usurped',
  civil_war: 'Religious Civil War',
  fragmented: 'The Two Lands Fragmented',
};

export function endReign(state, cause, detail) {
  state.phase = 'ended';
  state.ending = { cause, title: CAUSES[cause] || cause, detail, ...weighHeart(state, cause) };
  // The dynasty's whole record, this ruler included.
  const reigns = [...(state.dynasty || []), { name: state.pharaoh.name, throneName: state.pharaoh.throneName, years: state.year, score: state.ending.score, verdict: state.ending.verdict }];
  state.ending.dynasty = reigns;
  state.ending.dynastyScore = reigns.reduce((t, r) => t + r.score, 0);
  state.chronicle.push({
    turn: state.turn,
    year: state.year,
    season: state.season,
    title: state.ending.title,
    text: detail,
  });
}

export function weighHeart(state, cause) {
  const lines = [];
  let score = 0;

  const maatPts = Math.round(state.maat * 0.5);
  score += maatPts;
  lines.push(`Ma'at at the end of the reign: ${state.maat} → ${maatPts} points.`);

  // Bigger monuments weigh more; repeating the same kind adds little.
  const built = state.monuments.filter((m) => m.done && !m.ongoing);
  const counted = new Set();
  let monumentPts = 0;
  for (const m of built) {
    monumentPts += counted.has(m.catalogId) ? 2 : MONUMENT_POINTS[m.catalogId] || 4;
    counted.add(m.catalogId);
  }
  score += monumentPts;
  if (built.length) lines.push(`Monuments raised: ${built.map((m) => m.name).join(', ')} → ${monumentPts} points.`);

  const tomb = state.monuments.find((m) => m.ongoing);
  const h = heir(state);
  if (tomb && tomb.done) {
    score += 10;
    lines.push('The royal tomb was complete → 10 points.');
  } else if (h) {
    h.legitimacy = Math.max(0, h.legitimacy - 15);
    lines.push('The royal tomb was left unfinished. The heir begins the new reign at −15 Legitimacy.');
  }

  const reignYears = Math.min(30, state.year);
  score += reignYears;
  lines.push(`Years ruled in this chronicle: ${reignYears} → ${reignYears} points.`);

  let succession;
  if (cause === 'usurped' || cause === 'civil_war' || cause === 'fragmented') {
    score -= 30;
    succession = 'The bloodline has lost the throne. Your name will be chiselled from the monuments.';
  } else if (!h || !h.alive) {
    score -= 20;
    succession = 'No designated heir survives. The court will choose a king, and it will not be your son.';
  } else {
    const heirPts = Math.round(h.legitimacy * 0.3);
    score += heirPts;
    lines.push(`${heirTitle(h)} ${h.name}'s Legitimacy: ${h.legitimacy} → ${heirPts} points.`);
    const rival = rivalClaimant(state);
    if (rival && isAdult(rival) && rival.legitimacy >= h.legitimacy && rival.loyalty < 60) {
      succession = `${heirTitle(h)} ${h.name} (Legitimacy ${h.legitimacy}) claims the throne, but Prince ${rival.name} (Legitimacy ${rival.legitimacy}) has the army's ear. A war of succession is likely.`;
    } else if (!isAdult(h)) {
      succession = `${heirTitle(h)} ${h.name} is only ${h.age}. A regency will rule in ${possessive(h)} name, and regents have their own ambitions.`;
    } else {
      succession = `${heirTitle(h)} ${h.name} (Legitimacy ${h.legitimacy}) takes the Double Crown. The succession holds.`;
    }
  }

  const verdict =
    score >= 90
      ? 'True of Voice: your heart balances against the feather of Maʿat.'
      : score >= 60
        ? 'The scales waver: Thoth records a reign of mixed deeds.'
        : 'Your heart is heavier than the feather. Ammit, the Devourer, waits.';

  return { score, verdict, succession, lines };
}
