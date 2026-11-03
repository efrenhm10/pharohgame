import { test } from 'node:test';
import assert from 'node:assert/strict';

import { newGame, perform, canPerform, decree, advance, optionsFor } from '../src/engine/game.js';
import { province, peaceTerms, goldLedger, powerTable, reachable } from '../src/engine/world.js';
import { succeed } from '../src/engine/dynasty.js';

const turnOver = (s) => {
  if (s.phase === 'briefing') decree(s, optionsFor(s)[0].id);
  if (s.phase === 'court') advance(s);
};

test('conquest: declare war, besiege, annex', () => {
  const s = newGame('conquest');
  s.attention.left = 9;
  assert.match(String(canPerform(s, 'war.declare', { realm: 'libu', target: 'siwa' })), /out of reach/);
  perform(s, 'war.declare', { realm: 'libu', target: 'marmarica' });
  const w = s.wars[0];
  assert.equal(w.cb, 'retribution');
  // Put a strong army on the western front and fight until Marmarica falls.
  for (const u of s.army.units) if (u.kind !== 'police') { u.station = 'west'; u.morale = 90; u.quality = 90; }
  s.realms.libu.army = 2000;
  for (let i = 0; i < 12 && !province(s, 'marmarica').occupiedBy; i++) { s.pharaoh.health = 90; turnOver(s); }
  assert.equal(province(s, 'marmarica').occupiedBy, 'egypt');
  const annex = peaceTerms(s, s.wars[0]).find((t) => t.id === 'annex');
  assert.ok(annex.ok, `war score ${s.wars[0].score} should allow annexation`);
  s.attention.left = 9;
  perform(s, 'war.peace', { warId: s.wars[0].id, terms: 'annex' });
  assert.equal(province(s, 'marmarica').owner, 'egypt');
  assert.equal(s.wars.length, 0);
  assert.ok(reachable(s, province(s, 'siwa')));
});

test('breaking the Hittite treaty angers the gods', () => {
  const s = newGame('treaty');
  s.attention.left = 9;
  const maat = s.maat;
  perform(s, 'war.declare', { realm: 'hatti', target: 'kadesh' });
  assert.equal(s.wars[0].cb, 'claim');
  assert.equal(s.flags.hattiTreaty, false);
  assert.ok(s.maat < maat);
});

test('restless vassals revolt and start a war', () => {
  const s = newGame('revolt');
  province(s, 'gezer').unrest = 99;
  for (const u of s.army.units) u.station = 'capital';
  turnOver(s);
  assert.equal(province(s, 'gezer').owner, 'canaan');
  assert.ok(s.wars.some((w) => w.enemy === 'canaan' && w.cb === 'rebellion'));
});

test('the gold ledger counts provinces, tribute and buildings', () => {
  const s = newGame('ledger');
  const before = goldLedger(s).total;
  s.attention.left = 9;
  perform(s, 'build', { kind: 'province', id: 'wawat', type: 'mine' });
  for (let i = 0; i < 4; i++) { s.pharaoh.health = 90; turnOver(s); }
  assert.ok(goldLedger(s).lines.some((l) => l.label.startsWith('Royal mines')));
  assert.ok(goldLedger(s).total > before);
  assert.equal(powerTable(s).length, 8);
});

test('owing the army: pay arrears right now in grain or gold', () => {
  const s = newGame('arrears');
  assert.equal(s.arrears.army, 2);
  perform(s, 'army.pay', { months: 1, with: 'grain' });
  assert.equal(s.arrears.army, 1);
  perform(s, 'army.pay', { months: 'all', with: 'gold' });
  assert.equal(s.arrears.army, 0);
  assert.equal(s.attention.left, s.attention.max, 'paying the army costs no Royal Attention');
});

test('a spy turns rumours into an arrest', () => {
  const s = newGame('spy');
  s.attention.left = 9;
  assert.notEqual(canPerform(s, 'spy.arrest', { type: 'wife', target: 'henuttawy' }), true);
  perform(s, 'spy.recruit', { type: 'wife', target: 'henuttawy' });
  s.wives.find((w) => w.id === 'henuttawy').plot = 70;
  perform(s, 'spy.arrest', { type: 'wife', target: 'henuttawy' });
  assert.equal(s.wives.find((w) => w.id === 'henuttawy').plot, 0);
});

test('a child king: you rule as regent, and the nobles prey on a weak regency', () => {
  const s = newGame('regency');
  assert.equal(succeed(s, []), true);
  assert.equal(s.regency.who, 'mother');
  assert.equal(s.regency.regent, 'Tiy-Merenmut');
  s.regency.authority = 15;
  turnOver(s);
  assert.ok(s.forced.some((f) => f.eventId === 'regency_challenge') || s.briefing.eventId === 'regency_challenge' || s.usedEvents.regency_challenge);
});

test('royal children can be appointed to offices and nomes', () => {
  const s = newGame('appoint');
  s.attention.left = 9;
  perform(s, 'family.appoint', { childId: 'khaemopet', post: 'nome:hare' });
  assert.equal(s.nomes.find((n) => n.id === 'hare').governorId, 'khaemopet');
  perform(s, 'family.appoint', { childId: 'meritamun', post: 'estates' });
  assert.ok(goldLedger(s).lines.some((l) => l.label.includes('Mi-wer')));
  // Marry into any nome's house, not just the weakest two.
  s.attention.left = 9;
  perform(s, 'family.marry', { childId: 'meritamun', matchId: 'nome:memphis' });
  assert.equal(s.nomes.find((n) => n.id === 'memphis').royalKin, 'meritamun');
});

test('daughters can govern nomes and provinces', () => {
  const s = newGame('governess');
  s.attention.left = 9;
  perform(s, 'family.appoint', { childId: 'meritamun', post: 'nome:delta' });
  const d = s.nomes.find((n) => n.id === 'delta');
  assert.equal(d.governorId, 'meritamun');
  assert.equal(d.nomarch, 'Princess Meritamun');
  perform(s, 'family.appoint', { childId: 'meritamun', post: 'province:gaza' });
  assert.equal(province(s, 'gaza').governorId, 'meritamun');
  assert.notEqual(canPerform(s, 'family.appoint', { childId: 'meritamun', post: 'vizier' }), true);
});
