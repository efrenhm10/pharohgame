// Procedural portraits in the conventions of Egyptian tomb painting:
// red-ochre men and golden women, kohl-lined eyes, broad collars, and a
// headdress that tells you who someone is before you read their name.
//
// portrait(person, size) → <svg>. Deterministic for a given person.

const SKIN = {
  man: ['#a35a32', '#ad6339', '#b46c3f', '#9c5530'],
  woman: ['#d9a066', '#e0aa72', '#d49a5f', '#e5b27c'],
  kush: ['#5a3620', '#64402a', '#4f2f1c'],
  hatti: ['#d8ac85', '#cfa07a'],
  babylon: ['#c08656', '#b97f50'],
};
const COLLAR = ['#2f5fa8', '#d4a62a', '#b5432a', '#3a9e93', '#d4a62a'];
const INK = '#1b1410';
const WIG = '#17120f';
const LINEN = '#f3ede1';
const GOLD = '#d4a62a';
const LAPIS = '#2f5fa8';

function rng(seed) {
  let t = (Number(seed) || 1) >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

/** Normalise any person in the game state into a portrait spec. */
export function specOf(p) {
  let kind = p.kind || 'scribe';
  const female = ['queen', 'wife', 'wife-hatti', 'wife-babylon', 'wife-kush', 'princess', 'pharaoh-f'].includes(kind) || (p.sex === 'f' && kind !== 'consort');
  // A female Pharaoh wears the king's nemes and false beard, as Hatshepsut did; a consort dresses as a noble.
  if (kind === 'pharaoh-f') kind = 'pharaoh';
  if (kind === 'consort') kind = 'nomarch';
  const age = p.age ?? 35;
  return { kind, female, age, seed: p.seed ?? 7, child: (kind === 'prince' || kind === 'princess') && age < 12 };
}

export function portrait(p, size = 72) {
  const sp = specOf(p);
  const r = rng(sp.seed * 7 + 3);
  const skinSet = sp.kind === 'wife-kush' ? SKIN.kush : sp.kind === 'wife-hatti' ? SKIN.hatti : sp.kind === 'wife-babylon' ? SKIN.babylon : sp.female ? SKIN.woman : SKIN.man;
  const skin = pick(r, skinSet);
  const fw = sp.child ? 20 : 21 + r() * 3; // face half-width
  const fh = sp.child ? 22 : 25 + r() * 3;
  const cy = sp.child ? 58 : 54;
  const eyeY = cy - 2;
  const old = sp.age >= 50;

  const parts = [];
  // Shoulders and garment.
  parts.push(garment(sp, r, skin));
  // Neck.
  parts.push(`<rect x="52" y="${cy + fh - 8}" width="16" height="16" rx="5" fill="${skin}"/>`);
  // Collar (wesekh).
  if (!sp.child && sp.kind !== 'priest' && sp.kind !== 'wife-hatti' && sp.kind !== 'wife-babylon') parts.push(collar(r, sp.kind === 'pharaoh' || sp.kind === 'queen' ? 4 : 3));
  // Back of wig / headcloth (drawn behind the face).
  parts.push(headBack(sp, r));
  // Face.
  parts.push(`<ellipse cx="60" cy="${cy}" rx="${fw.toFixed(1)}" ry="${fh.toFixed(1)}" fill="${skin}"/>`);
  // Eyes with kohl, Egyptian brows.
  const ex = 9 + r() * 1.5;
  for (const side of [-1, 1]) {
    const x = 60 + side * ex;
    parts.push(
      `<path d="M${x - 5} ${eyeY} Q${x} ${eyeY - 3.6} ${x + 5} ${eyeY} Q${x} ${eyeY + 2.6} ${x - 5} ${eyeY} Z" fill="#fbf6ea"/>`,
      `<circle cx="${x}" cy="${eyeY}" r="1.9" fill="${INK}"/>`,
      `<path d="M${x - 5.5} ${eyeY} Q${x} ${eyeY - 4.2} ${x + 5.5} ${eyeY} L${x + side * 9.5} ${eyeY + (side > 0 ? 0.8 : 0.8)}" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
      `<path d="M${x - 6} ${eyeY - 7} Q${x} ${eyeY - 10.5} ${x + 6 + (side > 0 ? 2 : 0)} ${eyeY - 7}" stroke="${INK}" stroke-width="${sp.female ? 1.6 : 2}" fill="none" stroke-linecap="round"/>`,
    );
  }
  // Nose and mouth.
  parts.push(`<path d="M60 ${eyeY + 2} L57.5 ${eyeY + 11} Q60 ${eyeY + 12.5} 62.5 ${eyeY + 11}" stroke="rgba(0,0,0,.22)" stroke-width="1.4" fill="none"/>`);
  parts.push(`<path d="M54 ${eyeY + 17} Q60 ${eyeY + (sp.female ? 20.5 : 19.5)} 66 ${eyeY + 17}" stroke="${sp.female ? '#9a3f3a' : '#5e2f22'}" stroke-width="${sp.female ? 2.4 : 2}" fill="none" stroke-linecap="round"/>`);
  if (old) parts.push(`<path d="M47 ${eyeY - 13} Q60 ${eyeY - 15} 73 ${eyeY - 13} M50 ${eyeY + 13} Q52 ${eyeY + 17} 52 ${eyeY + 20} M70 ${eyeY + 13} Q68 ${eyeY + 17} 68 ${eyeY + 20}" stroke="rgba(0,0,0,.18)" stroke-width="1.1" fill="none"/>`);
  // Headdress, crowns, beards, jewellery (in front).
  parts.push(headFront(sp, r, cy, fh));

  return `<svg class="portrait" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-hidden="true">${parts.join('')}</svg>`;
}

function collar(r, rows) {
  const out = [];
  const order = [...COLLAR].sort(() => r() - 0.5);
  for (let i = 0; i < rows; i++) {
    const rr = 20 + i * 5;
    out.push(`<path d="M${60 - rr} 92 A${rr} ${rr * 0.7} 0 0 0 ${60 + rr} 92" stroke="${order[i % order.length]}" stroke-width="4.2" fill="none"/>`);
  }
  return out.join('');
}

function garment(sp, r, skin) {
  const shoulders = (fill) => `<path d="M10 120 C14 96 34 86 60 86 C86 86 106 96 110 120 Z" fill="${fill}"/>`;
  switch (sp.kind) {
    case 'priest':
      return shoulders(skin) + `<path d="M22 120 C26 100 40 92 56 92 L88 120 Z" fill="#d9a54a"/>` +
        Array.from({ length: 9 }, () => `<circle cx="${(36 + r() * 40).toFixed(1)}" cy="${(100 + r() * 18).toFixed(1)}" r="${(1.6 + r() * 1.4).toFixed(1)}" fill="#4a2a12"/>`).join('');
    case 'vizier':
      return shoulders(LINEN) + `<path d="M40 92 L40 120 M80 92 L80 120" stroke="#d8cfbd" stroke-width="2"/><path d="M50 88 L46 120 M70 88 L74 120" stroke="${GOLD}" stroke-width="1.2"/>`;
    case 'general':
      return shoulders('#8a5a2b') + Array.from({ length: 4 }, (_, i) => `<path d="M${22 + i * 4} ${104 + i * 4} H${98 - i * 4}" stroke="#5c3a1a" stroke-width="1.4"/>`).join('');
    case 'wife-hatti':
      return shoulders('#8e2a2a') + `<path d="M30 120 C36 100 46 92 60 92 C74 92 84 100 90 120" stroke="${GOLD}" stroke-width="2.5" fill="none"/>`;
    case 'wife-babylon':
      return shoulders('#2d4f8a') + Array.from({ length: 12 }, (_, i) => `<path d="M${22 + i * 7} 112 v8" stroke="${GOLD}" stroke-width="1.4"/>`).join('');
    default:
      return shoulders(sp.child ? skin : LINEN);
  }
}

function headBack(sp, r) {
  const longWig = `<path d="M30 40 C30 18 46 12 60 12 C74 12 90 18 90 40 L94 96 L74 98 L72 60 L48 60 L46 98 L26 96 Z" fill="${WIG}"/>`;
  switch (sp.kind) {
    case 'pharaoh':
      // Nemes lappets fall behind the shoulders.
      return `<path d="M30 46 L22 98 L40 100 L42 60 Z M90 46 L98 98 L80 100 L78 60 Z" fill="${GOLD}"/>` +
        Array.from({ length: 5 }, (_, i) => `<path d="M${29 - i * 1.4} ${56 + i * 9} L${40 - i * 0.3} ${58 + i * 9} M${91 + i * 1.4} ${56 + i * 9} L${80 + i * 0.3} ${58 + i * 9}" stroke="${LAPIS}" stroke-width="3"/>`).join('');
    case 'queen':
    case 'wife':
    case 'princess':
      return sp.child ? '' : longWig;
    case 'wife-hatti':
    case 'wife-babylon':
      return `<path d="M32 40 C32 18 46 14 60 14 C74 14 88 18 88 40 L92 104 L76 104 L72 60 L48 60 L44 104 L28 104 Z" fill="#2a1a12"/>`;
    case 'nomarch':
      return `<path d="M32 40 C32 20 46 14 60 14 C74 14 88 20 88 40 L90 80 L30 80 Z" fill="${WIG}"/>`;
    default:
      return '';
  }
}

function headFront(sp, r, cy, fh) {
  const top = cy - fh;
  switch (sp.kind) {
    case 'pharaoh': {
      // Nemes: striped headcloth ending in a band across the brow.
      const band = top + 12;
      const stripes = Array.from({ length: 7 }, (_, i) => `<path d="M${36 + i * 8} ${top - 5 + Math.abs(3 - i) * 1.4} L${37 + i * 7.7} ${band - 1}" stroke="${LAPIS}" stroke-width="3"/>`).join('');
      return `<path d="M30 ${band + 14} C28 ${top - 4} 44 ${top - 10} 60 ${top - 10} C76 ${top - 10} 92 ${top - 4} 90 ${band + 14} L82 ${band + 12} L82 ${band} L38 ${band} L38 ${band + 12} Z" fill="${GOLD}"/>${stripes}` +
        `<path d="M37 ${band} H83" stroke="${LAPIS}" stroke-width="2.6"/>` +
        // Uraeus.
        `<path d="M60 ${band - 1} C55 ${band - 9} 58 ${band - 17} 61 ${band - 17} C64 ${band - 15} 62 ${band - 9} 60 ${band - 1} Z" fill="${GOLD}" stroke="#8a6512" stroke-width="1"/>` +
        // False beard.
        `<path d="M57 ${cy + fh - 2} L56 ${cy + fh + 12} Q60 ${cy + fh + 15} 64 ${cy + fh + 12} L63 ${cy + fh - 2} Z" fill="${WIG}"/><path d="M56.5 ${cy + fh + 3} H63.5 M56.5 ${cy + fh + 7} H63.5" stroke="#3a2e25" stroke-width="1"/>`;
    }
    case 'queen':
      return `<path d="M34 ${top + 18} C34 ${top} 46 ${top - 6} 60 ${top - 6} C74 ${top - 6} 86 ${top} 86 ${top + 18} L80 ${top + 26} C78 ${top + 12} 70 ${top + 6} 60 ${top + 6} C50 ${top + 6} 42 ${top + 12} 40 ${top + 26} Z" fill="${GOLD}"/>` +
        `<path d="M36 ${top + 16} L26 ${top + 40} L40 ${top + 30} Z M84 ${top + 16} L94 ${top + 40} L80 ${top + 30} Z" fill="${LAPIS}"/>` +
        `<rect x="48" y="${top - 12}" width="24" height="7" fill="${GOLD}"/>` +
        `<path d="M53 ${top - 12} C50 ${top - 30} 54 ${top - 40} 56 ${top - 40} L58 ${top - 12} Z M67 ${top - 12} C70 ${top - 30} 66 ${top - 40} 64 ${top - 40} L62 ${top - 12} Z" fill="#f6f0e0" stroke="#c8b78f" stroke-width="0.8"/>` +
        `<path d="M60 ${top + 4} c-3 -5 -1 -9 1 -9 c2 1 1 5 -1 9z" fill="${GOLD}" stroke="#8a6512" stroke-width="0.8"/>`;
    case 'wife':
      return `<path d="M34 ${top + 20} C34 ${top} 46 ${top - 6} 60 ${top - 6} C74 ${top - 6} 86 ${top} 86 ${top + 20} C80 ${top + 8} 70 ${top + 4} 60 ${top + 4} C50 ${top + 4} 40 ${top + 8} 34 ${top + 20} Z" fill="${WIG}"/>` +
        `<path d="M36 ${top + 10} Q60 ${top - 2} 84 ${top + 10}" stroke="#e9f0f6" stroke-width="3" fill="none"/>` +
        Array.from({ length: 5 }, (_, i) => `<circle cx="${40 + i * 10}" cy="${top + 6 - (i === 2 ? 5 : i === 1 || i === 3 ? 3 : 0)}" r="2.4" fill="${i % 2 ? '#3a9e93' : '#f2f2f2'}"/>`).join('') +
        // Perfume cone.
        `<path d="M52 ${top - 4} L56 ${top - 16} H64 L68 ${top - 4} Z" fill="#efe2c2" stroke="#cdb98c" stroke-width="0.8"/>`;
    case 'princess':
      if (sp.child) return sidelock(top, cy);
      return `<path d="M34 ${top + 20} C34 ${top} 46 ${top - 6} 60 ${top - 6} C74 ${top - 6} 86 ${top} 86 ${top + 20} C80 ${top + 8} 70 ${top + 4} 60 ${top + 4} C50 ${top + 4} 40 ${top + 8} 34 ${top + 20} Z" fill="${WIG}"/>` +
        `<path d="M36 ${top + 9} Q60 ${top - 1} 84 ${top + 9}" stroke="${GOLD}" stroke-width="3" fill="none"/><circle cx="60" cy="${top + 3}" r="3" fill="#b5432a" stroke="${GOLD}" stroke-width="1"/>`;
    case 'prince':
      if (sp.child) return sidelock(top, cy);
      return `<path d="M34 ${top + 24} C32 ${top} 46 ${top - 6} 60 ${top - 6} C74 ${top - 6} 88 ${top} 86 ${top + 24} C80 ${top + 10} 72 ${top + 6} 60 ${top + 6} C48 ${top + 6} 40 ${top + 10} 34 ${top + 24} Z" fill="${WIG}"/>` +
        `<path d="M35 ${top + 12} Q60 ${top + 2} 85 ${top + 12}" stroke="${GOLD}" stroke-width="2.4" fill="none"/>` +
        // The princely sidelock, worn even as a man.
        `<path d="M84 ${top + 16} C92 ${top + 30} 90 ${top + 48} 86 ${top + 60}" stroke="${WIG}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M84 ${top + 30} l5 2 M85 ${top + 40} l5 1" stroke="${GOLD}" stroke-width="1.4"/>`;
    case 'priest':
      return `<ellipse cx="54" cy="${top + 8}" rx="9" ry="4" fill="rgba(255,255,255,.22)"/>`;
    case 'vizier':
    case 'scribe':
      return `<path d="M34 ${top + 22} C32 ${top} 46 ${top - 5} 60 ${top - 5} C74 ${top - 5} 88 ${top} 86 ${top + 22} C80 ${top + 10} 72 ${top + 6} 60 ${top + 6} C48 ${top + 6} 40 ${top + 10} 34 ${top + 22} Z" fill="${WIG}"/>` +
        (sp.kind === 'scribe' ? `<path d="M84 ${top + 14} L96 ${top - 2}" stroke="#c8a96a" stroke-width="2.2" stroke-linecap="round"/>` : '');
    case 'general':
      return `<path d="M32 ${top + 26} C30 ${top} 46 ${top - 6} 60 ${top - 6} C74 ${top - 6} 90 ${top} 88 ${top + 26} C82 ${top + 12} 72 ${top + 6} 60 ${top + 6} C48 ${top + 6} 38 ${top + 12} 32 ${top + 26} Z" fill="#e8e0cc"/>` +
        `<path d="M33 ${top + 14} Q60 ${top + 4} 87 ${top + 14}" stroke="#b5432a" stroke-width="3" fill="none"/>`;
    case 'nomarch':
      return `<path d="M34 ${top + 20} C34 ${top} 46 ${top - 6} 60 ${top - 6} C74 ${top - 6} 86 ${top} 86 ${top + 20} C80 ${top + 8} 70 ${top + 4} 60 ${top + 4} C50 ${top + 4} 40 ${top + 8} 34 ${top + 20} Z" fill="${WIG}"/>`;
    case 'wife-hatti':
      return `<path d="M42 ${top + 6} L44 ${top - 20} H76 L78 ${top + 6} Z" fill="#8e2a2a" stroke="${GOLD}" stroke-width="1.5"/><path d="M43 ${top - 6} H77" stroke="${GOLD}" stroke-width="2"/>` +
        `<path d="M36 ${top + 14} Q60 ${top + 2} 84 ${top + 14}" stroke="#2a1a12" stroke-width="6" fill="none"/>`;
    case 'wife-babylon':
      return `<path d="M34 ${top + 14} Q60 ${top - 2} 86 ${top + 14}" stroke="#2a1a12" stroke-width="8" fill="none"/><path d="M36 ${top + 10} Q60 ${top - 4} 84 ${top + 10}" stroke="${LAPIS}" stroke-width="4" fill="none"/><circle cx="60" cy="${top + 2}" r="3" fill="${GOLD}"/>`;
    case 'wife-kush':
      return `<path d="M33 ${top + 18} C31 ${top - 2} 46 ${top - 8} 60 ${top - 8} C74 ${top - 8} 89 ${top - 2} 87 ${top + 18} C82 ${top + 6} 72 ${top + 2} 60 ${top + 2} C48 ${top + 2} 38 ${top + 6} 33 ${top + 18} Z" fill="${WIG}"/>` +
        Array.from({ length: 7 }, (_, i) => `<circle cx="${38 + i * 7.3}" cy="${top + 4 - Math.sin((i / 6) * Math.PI) * 8}" r="1.6" fill="#2a2018"/>`).join('') +
        `<circle cx="36" cy="${cy + 10}" r="5" stroke="${GOLD}" stroke-width="2.4" fill="none"/><circle cx="84" cy="${cy + 10}" r="5" stroke="${GOLD}" stroke-width="2.4" fill="none"/>`;
    default:
      return '';
  }
}

function sidelock(top, cy) {
  return `<path d="M80 ${top + 10} C90 ${top + 24} 88 ${cy + 4} 84 ${cy + 16}" stroke="${WIG}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
}
