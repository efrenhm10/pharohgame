import { test } from 'node:test';
import assert from 'node:assert/strict';

import { newGame, decree, advance, optionsFor, currentEvent, perform, canPerform } from '../src/engine/game.js';
import { succeed, findSuccessor } from '../src/engine/dynasty.js';

function killAndAdvance(s) {
  if (s.phase === 'briefing') decree(s, optionsFor(s)[0].id);
  s.pharaoh.health = 1;
  s.pharaoh.age = 90; // the yearly decline or a fever will finish him
  while (s.phase !== 'ended' && s.reigns === 1) {
    s.pharaoh.health = 0;
    advance(s);
    if (s.phase === 'briefing' && s.reigns === 1) decree(s, optionsFor(s)[0].id);
  }
}

test('when Pharaoh dies, the player rules on as the heir', () => {
  const s = newGame('succession');
  killAndAdvance(s);
  assert.notEqual(s.phase, 'ended');
  assert.equal(s.reigns, 2);
  assert.equal(s.pharaoh.personal, 'Ramose');
  assert.equal(s.pharaoh.name, 'Ramose I');
  assert.equal(s.year, 1);
  assert.equal(s.dynasty.length, 1);
  assert.equal(s.dynasty[0].name, 'Djehutymes V');
  // A child king rules under a regent.
  assert.ok(s.regency);
  assert.equal(s.attention.max, s.vizier.competence >= 70 ? 3 : 2);
  // The old wives are dowagers; the new king's mother is King's Mother.
  assert.equal(s.wives.find((w) => w.id === 'tiy').title, 'King’s Mother');
  assert.ok(s.wives.every((w) => w.status !== 'court' || w.id.startsWith('queen')));
  // Brothers are now siblings, with a new tomb begun.
  assert.equal(s.sons.find((x) => x.id === 'khaemopet').rel, 'sibling');
  assert.ok(s.monuments.some((m) => m.name.includes('Ramose I')));
  // The first briefing of the new reign is the accession or a disputed crown.
  assert.ok(['accession', 'succession_war'].includes(currentEvent(s).id));
});

test('a married heir brings a queen and grandchildren to the throne', () => {
  const s = newGame('grandkids');
  const k = s.sons.find((x) => x.id === 'khaemopet');
  perform(s, 'family.designate', { sonId: 'khaemopet' });
  k.spouse = { name: 'Lady Tuya', kind: 'wife', seed: 9, age: 22, tie: 'bureaucracy', origin: 'A Nomarch’s daughter' };
  k.kids = [{ id: 'gk1', sex: 'm', name: 'Seti', age: 4, seed: 3 }, { id: 'gk2', sex: 'f', name: 'Iset', age: 2, seed: 4 }];
  const report = [];
  assert.equal(succeed(s, report), true);
  assert.equal(s.pharaoh.personal, 'Khaemopet');
  const queen = s.wives.find((w) => w.status === 'court');
  assert.equal(queen.title, 'Great Royal Wife');
  assert.equal(s.heirId, 'gk1');
  assert.ok(s.daughters.some((d) => d.id === 'gk2' && d.rel === 'child'));
});

test('a daughter can be named heir and rules as a female Pharaoh', () => {
  const s = newGame('hatshepsut');
  perform(s, 'family.designate', { sonId: 'meritamun' });
  assert.equal(s.heirId, 'meritamun');
  assert.equal(findSuccessor(s).id, 'meritamun');
  assert.equal(succeed(s, []), true);
  assert.equal(s.pharaoh.sex, 'f');
  assert.equal(s.pharaoh.kind, 'pharaoh-f');
  // She takes a consort, not a harem, and bears her own heirs.
  s.attention.left = 9;
  perform(s, 'family.take_wife', { source: 'harem' });
  assert.notEqual(canPerform(s, 'family.take_wife', { source: 'harem' }), true);
});

test('with nobody of the blood left, the dynasty ends', () => {
  const s = newGame('extinct');
  for (const x of [...s.sons, ...s.daughters]) x.alive = false;
  s.heirId = null;
  assert.equal(succeed(s, []), false);
});

test('the new king can marry a dowager queen, but never his own mother', () => {
  const s = newGame('dowager');
  perform(s, 'family.designate', { sonId: 'khaemopet' });
  assert.equal(succeed(s, []), true);
  s.attention.left = 9;
  assert.notEqual(canPerform(s, 'family.wed_dowager', { wifeId: 'henuttawy' }), true, 'Henuttawy is his mother');
  const kh = s.sons.find((x) => x.id === 'amenmose');
  perform(s, 'family.wed_dowager', { wifeId: 'asmunikal' });
  const a = s.wives.find((w) => w.id === 'asmunikal');
  assert.equal(a.status, 'court');
  assert.match(a.title, /widow of Djehutymes V/);
  assert.ok(kh);
});

test('a reigning Pharaoh can marry his sister; their children carry the divine blood', () => {
  const s = newGame('sister');
  perform(s, 'family.designate', { sonId: 'khaemopet' });
  assert.equal(succeed(s, []), true);
  s.attention.left = 9;
  assert.notEqual(canPerform(s, 'family.wed_sibling', { childId: 'amenmose' }), true, 'not a brother');
  perform(s, 'family.wed_sibling', { childId: 'meritamun' });
  const q = s.wives.find((w) => w.id === 'sib-meritamun');
  assert.equal(q.status, 'court');
  assert.equal(q.royalBlood, 'half');
  assert.match(q.title, /Great Royal Wife/);
  assert.ok(!s.daughters.some((d) => d.id === 'meritamun' && d.alive));
});
