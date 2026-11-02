import { test } from 'node:test';
import assert from 'node:assert/strict';

import { newGame, currentEvent, optionsFor, decree, advance, briefText } from '../src/engine/game.js';
import { floodOdds, rollFlood } from '../src/engine/flood.js';
import { FLOOD_ODDS, FLOOD_ORDER } from '../src/engine/constants.js';
import { monthlyBurn, reserveMonths, paySeason } from '../src/engine/economy.js';
import { haremApproval, changeMaat } from '../src/engine/realm.js';
import { opportunityChance, chooseBriefing } from '../src/engine/rotation.js';
import { EVENTS } from '../src/content/index.js';
import { demands } from '../src/content/demands.js';
import { resolve } from '../src/engine/util.js';

test('the Year 9 opening matches the briefing', () => {
  const s = newGame('opening');
  assert.equal(s.year, 9);
  assert.equal(s.season, 0);
  assert.equal(currentEvent(s).id, 'hunger_flood');
  assert.equal(optionsFor(s).length, 4);
  assert.equal(monthlyBurn(s), 190000);
  assert.equal(reserveMonths(s).toFixed(1), '3.2');
  assert.equal(haremApproval(s), 44);
  assert.equal(s.harvestModifier, 0.5);
});

test('flood odds rows sum to 100 and the famine streak cap halves famine', () => {
  for (const row of FLOOD_ODDS) {
    assert.equal(FLOOD_ORDER.reduce((t, k) => t + row.odds[k], 0), 100);
  }
  const normal = floodOdds(40, 0);
  const capped = floodOdds(40, 2);
  assert.ok(Math.abs(capped.famine - normal.famine / 2) < 1e-9);
  assert.ok(Math.abs(FLOOD_ORDER.reduce((t, k) => t + capped[k], 0) - 100) < 1e-9);
});

test('flood bias from omens is normalized', () => {
  const o = floodOdds(60, 0, { famine: 15, blessing: -20 });
  assert.ok(Math.abs(FLOOD_ORDER.reduce((t, k) => t + o[k], 0) - 100) < 1e-9);
  assert.ok(o.famine > floodOdds(60, 0).famine);
});

test('rolled flood heights fall inside their band', () => {
  const s = newGame('floods');
  const counts = {};
  for (let i = 0; i < 4000; i++) {
    const { band, height } = rollFlood(s);
    counts[band] = (counts[band] || 0) + 1;
    if (band === 'famine') assert.ok(height < 12);
    if (band === 'lean') assert.ok(height >= 12 && height < 15);
    if (band === 'blessing') assert.ok(height >= 15 && height < 17);
    if (band === 'high') assert.ok(height >= 17 && height <= 18);
    if (band === 'deluge') assert.ok(height > 18);
  }
  // Ma'at 44 → 25–49 row: famine 15%, blessing 28%.
  assert.ok(Math.abs(counts.famine / 4000 - 0.15) < 0.03);
  assert.ok(Math.abs(counts.blessing / 4000 - 0.28) < 0.03);
});

test('a hostile priesthood amplifies Ma\'at losses', () => {
  const s = newGame('maat');
  s.blocs.priesthood.approval = 40;
  assert.equal(changeMaat(s, -10), -15);
  s.blocs.priesthood.approval = 80;
  assert.equal(changeMaat(s, -8), -6);
});

test('empty granaries turn into arrears', () => {
  const s = newGame('arrears');
  s.grain.royal = 380000; // half of one season
  const before = s.arrears.army;
  paySeason(s, []);
  assert.equal(s.grain.royal, 0);
  assert.equal(s.arrears.army, before + 2);
});

test('decree → court → advance; never advances without a decree', () => {
  const s = newGame('flow');
  assert.throws(() => advance(s));
  decree(s, 'karnak');
  assert.equal(s.phase, 'court');
  assert.ok(s.lastOutcome.lines.length > 0);
  assert.throws(() => decree(s, 'karnak'));
  advance(s);
  assert.equal(s.phase, 'briefing');
  assert.equal(s.turn, 2);
  assert.equal(s.season, 1);
});

test('respite rule: surviving a major crisis earns an Opportunity', () => {
  const s = newGame('respite');
  s.maat = 60;
  decree(s, 'karnak');
  assert.equal(s.rotation.respite, true);
  s.forced = [];
  chooseBriefing(s);
  assert.equal(s.briefing.type, 'opportunity');
  assert.equal(s.rotation.respite, false);
});

test('forced crises override the respite rule', () => {
  const s = newGame('respite2');
  s.rotation.respite = true;
  s.forced = [{ eventId: 'march_on_palace', priority: 100, ctx: {}, since: s.turn }];
  chooseBriefing(s);
  assert.equal(s.briefing.eventId, 'march_on_palace');
});

test('no more than two random crises in a row at healthy Ma\'at', () => {
  const s = newGame('guard');
  s.maat = 60;
  s.forced = [];
  s.rotation = { history: ['crisis', 'crisis'], respite: false };
  chooseBriefing(s);
  assert.equal(s.briefing.type, 'opportunity');
});

test('three opportunities in a row force a crisis', () => {
  const s = newGame('guard2');
  s.maat = 90;
  s.forced = [];
  s.rotation = { history: ['opportunity', 'opportunity', 'opportunity'], respite: false };
  chooseBriefing(s);
  assert.equal(s.briefing.type, 'crisis');
});

test('opportunity briefings always show at least one omen', () => {
  const s = newGame('omens');
  s.forced = [];
  s.omens = [];
  s.rotation = { history: ['crisis', 'crisis'], respite: false };
  s.maat = 60;
  chooseBriefing(s);
  assert.equal(s.briefing.type, 'opportunity');
  assert.ok(s.omens.length >= 1);
});

test('opportunity chance follows Ma\'at and the flood', () => {
  const s = newGame('chance');
  s.maat = 85;
  s.flood.band = 'blessing';
  assert.equal(opportunityChance(s), 75);
  s.maat = 10;
  s.flood.band = 'lean';
  assert.equal(opportunityChance(s), 0);
});

test('every event has 3–4 options with all three trade-off fields', () => {
  for (const ev of Object.values(EVENTS)) {
    assert.ok(ev.options.length >= 3 && ev.options.length <= 4, `${ev.id} has ${ev.options.length} options`);
    for (const o of ev.options) {
      for (const k of ['title', 'cost', 'fallout', 'risk']) assert.ok(o[k], `${ev.id}.${o.id} missing ${k}`);
      assert.equal(typeof o.apply, 'function');
    }
  }
});

test('demands exist for all four power blocks', () => {
  const d = demands(newGame('demands'));
  for (const k of ['priesthood', 'bureaucracy', 'military', 'harem']) assert.ok(d[k]);
});

// Fuzz: random decrees for many reigns must never crash, and state must stay sane.
test('fuzz: 300 random reigns run to completion without errors', () => {
  const seen = new Set();
  for (let g = 0; g < 300; g++) {
    const s = newGame(`fuzz-${g}`);
    let pick = g * 7919;
    for (let t = 0; t < 120 && s.phase !== 'ended'; t++) {
      const ev = currentEvent(s);
      seen.add(ev.id);
      const ctx = s.briefing.ctx;
      // Render everything the UI would render.
      assert.ok(Array.isArray(briefText(s)));
      resolve(ev.title, s, ctx);
      const opts = optionsFor(s);
      assert.ok(opts.length >= 1, `no options available for ${ev.id}`);
      for (const o of opts) for (const k of ['title', 'cost', 'fallout', 'risk']) assert.equal(typeof o[k], 'string', `${ev.id}.${o.id}.${k}`);
      demands(s);
      pick = (pick * 1103515245 + 12345) >>> 0;
      decree(s, opts[pick % opts.length].id);
      if (s.phase === 'ended') break;
      advance(s);

      assert.ok(s.maat >= 0 && s.maat <= 100);
      assert.ok(s.grain.royal >= 0 && s.grain.temple >= 0 && s.grain.sealed >= 0);
      assert.ok(s.gold >= 0);
      for (const b of Object.values(s.blocs)) assert.ok(b.approval >= 0 && b.approval <= 100);
      assert.ok(Number.isFinite(s.baselineIntake));
      assert.ok(EVENTS[s.briefing.eventId], `unknown event ${s.briefing.eventId}`);
    }
    // State must survive a JSON round trip (save/load).
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  }
  // Most of the catalog should be reachable.
  const total = Object.keys(EVENTS).length;
  assert.ok(seen.size >= total - 3, `only reached ${seen.size}/${total}: missing ${Object.keys(EVENTS).filter((k) => !seen.has(k))}`);
});

test('an exiled wife leaves the court and stops plotting', () => {
  const s = newGame('exile');
  s.briefing = { type: 'crisis', eventId: 'poisoned_cup', ctx: { wifeId: 'henuttawy' } };
  decree(s, 'exile');
  const w = s.wives.find((x) => x.id === 'henuttawy');
  assert.equal(w.status, 'exiled');
  advance(s);
  assert.equal(w.plot, 0);
});
