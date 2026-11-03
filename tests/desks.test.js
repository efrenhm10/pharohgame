import { test } from 'node:test';
import assert from 'node:assert/strict';

import { newGame, perform, canPerform, decree, advance, optionsFor, currentEvent } from '../src/engine/game.js';
import { ACTIONS, matchOptions, OFFICES, CAMPAIGNS } from '../src/content/actions.js';
import { monthlyBurn } from '../src/engine/economy.js';
import { totalMen } from '../src/engine/army.js';

test('the army burn follows the number of men', () => {
  const s = newGame('army');
  assert.equal(totalMen(s), 20000);
  assert.equal(s.burn.army, 100000);
  perform(s, 'army.recruit', { unitId: 'amun' });
  assert.equal(s.burn.army, 105000);
});

test('commands cost Royal Attention and stop when it runs out', () => {
  const s = newGame('attention');
  assert.equal(s.attention.left, 4); // 3 + competent Vizier
  perform(s, 'granary.feed');
  perform(s, 'nome.visit', { nomeId: 'waset' });
  assert.equal(s.attention.left, 1);
  assert.match(canPerform(s, 'nome.visit', { nomeId: 'memphis' }), /Royal Attention/);
  decree(s, 'karnak');
  advance(s);
  assert.equal(s.attention.left, s.attention.max);
});

test('free policies change rations and taxes', () => {
  const s = newGame('policy');
  const before = monthlyBurn(s);
  perform(s, 'granary.ration', { group: 'army', level: 0.75 });
  perform(s, 'granary.palace', { level: 'austere' });
  assert.ok(monthlyBurn(s) < before);
  assert.equal(s.attention.left, s.attention.max);
});

test('every child of marriageable age has real matches, and marrying binds them', () => {
  const s = newGame('marry');
  const mer = s.daughters.find((d) => d.id === 'meritamun');
  const opts = matchOptions(s, mer);
  assert.ok(opts.length >= 3);
  const nomeMatch = opts.find((o) => o.id.startsWith('nome:'));
  const n = s.nomes.find((x) => x.id === nomeMatch.id.split(':')[1]);
  const before = n.loyalty;
  perform(s, 'family.marry', { childId: 'meritamun', matchId: nomeMatch.id });
  assert.ok(mer.spouse);
  assert.equal(n.loyalty, Math.min(100, before + 25));
  assert.notEqual(canPerform(s, 'family.marry', { childId: 'meritamun', matchId: nomeMatch.id }), true);
});

test('children too young cannot marry; schooling only between 4 and 15', () => {
  const s = newGame('young');
  assert.match(String(canPerform(s, 'family.marry', { childId: 'nebettawy', matchId: 'gods_wife' })), /young/);
  assert.equal(canPerform(s, 'family.educate', { childId: 'amenmose', school: 'scribe' }), true);
  assert.notEqual(canPerform(s, 'family.educate', { childId: 'khaemopet', school: 'scribe' }), true);
});

test('appointments need a shortlist; sons can be appointed directly', () => {
  const s = newGame('court');
  assert.notEqual(canPerform(s, 'court.appoint', { office: 'vizier', candidateId: 'x' }), true);
  perform(s, 'court.shortlist', { office: 'vizier' });
  const c = s.shortlists.vizier[0];
  perform(s, 'court.appoint', { office: 'vizier', candidateId: c.id });
  assert.equal(s.vizier.name, c.name);
  perform(s, 'court.appoint', { office: 'viceroy', candidateId: 'son:khaemopet' });
  assert.equal(s.viceroy.sonId, 'khaemopet');
});

test('a disloyal commander at the capital can trigger a coup', () => {
  const s = newGame('coup');
  const g = s.army.generals.find((x) => x.id === 'paramessu');
  g.loyalty = 5;
  for (const u of s.army.units) { u.commanderId = 'paramessu'; u.station = 'capital'; }
  let fired = false;
  for (let i = 0; i < 12 && !fired; i++) {
    if (s.phase === 'briefing') decree(s, optionsFor(s)[0].id);
    if (s.phase === 'ended') break;
    advance(s);
    fired = currentEvent(s).id === 'march_on_palace';
  }
  assert.ok(fired, 'expected a march on the palace');
});

test('every desk command can run from a fresh game without throwing', () => {
  const argsFor = {
    'granary.ration': [{ group: 'army', level: 0.5 }, { group: 'workforce', level: 0.75 }],
    'granary.palace': [{ level: 'lavish' }],
    'granary.tax': [{ level: 'heavy' }],
    'granary.seal': [{ amount: 100000 }],
    'granary.unseal': [{ amount: 100000 }],
    'granary.buy': [{ realm: 'canaan' }],
    'granary.feed': [{}], 'granary.borrow': [{}], 'granary.repay': [{}],
    'army.recruit': [{ unitId: 'sherden' }], 'army.disband': [{ unitId: 'seth' }], 'army.drill': [{ unitId: 'ra' }],
    'army.bonus': [{}], 'army.command': [{ unitId: 'ptah', personId: 'mahu' }], 'army.station': [{ unitId: 'ptah', station: 'canaan' }],
    'army.campaign': Object.keys(CAMPAIGNS).map((target) => ({ target, leader: 'pharaoh' })),
    'family.educate': [{ childId: 'amenmose', school: 'temple' }],
    'family.marry': [{ childId: 'meritamun', matchId: 'gods_wife' }],
    'family.designate': [{ sonId: 'khaemopet' }], 'family.ptah': [{ sonId: 'khaemopet' }],
    'family.favor': [{ wifeId: 'asmunikal' }], 'family.gift': [{ wifeId: 'henuttawy' }],
    'family.elevate': [{ wifeId: 'asmunikal' }], 'family.wed_dowager': [{ wifeId: 'asmunikal' }], 'family.wed_sibling': [{ childId: 'meritamun' }], 'family.sideline': [{ wifeId: 'henuttawy' }],
    'family.take_wife': [{ source: 'nome:delta' }, { source: 'foreign:hatti' }, { source: 'general:urhiya' }, { source: 'harem' }],
    'court.shortlist': Object.keys(OFFICES).map((office) => ({ office })),
    'court.appoint': [{ office: 'viceroy', candidateId: 'son:khaemopet' }], 'court.reward': [{ office: 'overseer' }],
    'nome.audit': [{ nomeId: 'hare' }], 'nome.visit': [{ nomeId: 'delta' }], 'nome.heredity': [{ nomeId: 'asyut' }],
    'nome.revoke': [{ nomeId: 'asyut' }], 'nome.replace': [{ nomeId: 'hare' }], 'nome.canal': [{ nomeId: 'memphis' }],
    'foreign.gift': [{ realm: 'babylon', size: 'lavish' }], 'foreign.trade': [{ realm: 'hatti' }, { realm: 'alashiya' }, { realm: 'babylon' }],
    'foreign.tribute': [{}], 'monument.start': [{ catalogId: 'obelisks' }], 'monument.pause': [{ id: 'none' }],
    'army.pay': [{ months: 1, with: 'grain' }, { months: 'all', with: 'gold' }], 'army.pay_workforce': [{}],
    'granary.bulk': [{ realm: 'alashiya' }], 'nome.requisition': [{ nomeId: 'delta' }],
    'build': [{ kind: 'nome', id: 'coptos', type: 'harbor' }, { kind: 'province', id: 'wawat', type: 'mine' }],
    'expedition': [{ type: 'turquoise' }, { type: 'punt' }],
    'war.declare': [{ realm: 'libu', target: 'marmarica' }, { realm: 'hatti', target: 'kadesh' }],
    'war.target': [{ warId: 'none', provinceId: 'siwa' }], 'war.peace': [{ warId: 'none', terms: 'white' }],
    'province.integrate': [{ id: 'byblos' }], 'province.garrison_pay': [{ id: 'gezer' }],
    'spy.recruit': [{ type: 'wife', target: 'henuttawy' }, { type: 'realm', target: 'hatti' }], 'spy.recall': [{ spyId: 'x' }],
    'spy.arrest': [{ type: 'wife', target: 'henuttawy' }], 'spy.sabotage': [{ target: 'hatti' }],
    'regency.assert': [{}], 'regency.bribe': [{}], 'regency.present': [{}],
    'family.appoint': [{ childId: 'khaemopet', post: 'nome:hare' }, { childId: 'meritamun', post: 'estates' }, { childId: 'khaemopet', post: 'vizier' }],
  };
  for (const id of Object.keys(ACTIONS)) {
    assert.ok(argsFor[id], `test needs args for ${id}`);
    for (const a of argsFor[id]) {
      const s = newGame(`cmd-${id}`);
      s.attention.left = 10;
      s.templeLoan = id === 'granary.repay' ? { amount: 100000, dueTurn: 5 } : null;
      if (id === 'granary.unseal') s.grain.sealed = 200000;
      const ok = canPerform(s, id, a);
      if (ok === true) perform(s, id, a);
      assert.ok(typeof ok === 'string' || ok === true);
    }
  }
});

test('fuzz: random reigns mixing decrees and desk commands stay sane', () => {
  for (let g = 0; g < 120; g++) {
    const s = newGame(`mix-${g}`);
    let r = g * 7919 + 1;
    const rnd = (n) => ((r = (r * 1103515245 + 12345) >>> 0) % n);
    for (let t = 0; t < 80 && s.phase !== 'ended'; t++) {
      // A few random desk commands each season.
      for (let k = 0; k < 4; k++) {
        const ids = Object.keys(ACTIONS);
        const id = ids[rnd(ids.length)];
        const pool = {
          unitId: s.army.units.map((u) => u.id), wifeId: s.wives.map((w) => w.id), nomeId: s.nomes.map((n) => n.id),
          sonId: s.sons.map((x) => x.id), childId: [...s.sons, ...s.daughters].map((x) => x.id), realm: Object.keys(s.realms),
        };
        const pick = (arr) => arr[rnd(arr.length)];
        const child = [...s.sons, ...s.daughters].find((c) => c.alive && c.age >= 16 && !c.spouse);
        const a = {
          unitId: pick(pool.unitId), wifeId: pick(pool.wifeId), nomeId: pick(pool.nomeId), sonId: pick(pool.sonId), childId: child ? child.id : pick(pool.childId),
          realm: pick(pool.realm), group: pick(['army', 'workforce']), level: pick([0.5, 0.75, 1]), amount: 100000, school: pick(['kap', 'scribe', 'chariot', 'temple']),
          station: pick(['capital', 'west', 'delta', 'south', 'canaan']), target: pick(Object.keys(CAMPAIGNS)), leader: pick(['pharaoh', 'commanders']),
          office: pick(Object.keys(OFFICES)), catalogId: pick(['obelisks', 'pylon', 'west_forts', 'granaries']), size: 'modest', source: pick(['harem', 'nome:waset', 'foreign:hatti']),
          personId: pick([...s.army.generals.map((x) => x.id), ...s.sons.map((x) => x.id)]), id: s.monuments[s.monuments.length - 1].id,
        };
        if (id === 'granary.palace') a.level = pick(['lavish', 'normal', 'austere']);
        if (id === 'granary.tax') a.level = pick(['light', 'standard', 'heavy']);
        if (id === 'family.marry' && child) a.matchId = matchOptions(s, child)[0]?.id;
        Object.assign(a, {
          months: pick([1, 'all']), with: pick(['grain', 'gold']), kind: pick(['nome', 'province']), type: pick(['harbor', 'workshop', 'temple', 'fort', 'mine', 'punt', 'cedar', 'turquoise', 'unit', 'wife', 'nome', 'realm']),
          terms: pick(['annex', 'vassal', 'tribute', 'white', 'concede']), warId: s.wars[0]?.id, post: pick(['vizier', 'overseer', 'estates', 'chantress', `nome:${pick(pool.nomeId)}`, 'province:gaza']),
        });
        if (id === 'build') a.id = a.kind === 'nome' ? pick(pool.nomeId) : pick(s.provinces.map((p) => p.id));
        if (id === 'war.declare') { const p = pick(s.provinces.filter((x) => x.owner !== 'egypt')); if (p) { a.realm = p.owner; a.target = p.id; } }
        if (id === 'war.target') a.provinceId = pick(s.provinces.map((p) => p.id));
        if (id.startsWith('spy.')) { a.target = a.type === 'realm' ? pick(pool.realm) : a.type === 'wife' ? pick(pool.wifeId) : a.type === 'nome' ? pick(pool.nomeId) : a.type === 'unit' ? pick(pool.unitId) : a.target; a.spyId = s.spies[0]?.id; }
        if (id.startsWith('province.')) a.id = pick(s.provinces.map((p) => p.id));
        if (id === 'court.appoint') a.candidateId = s.shortlists?.[a.office]?.[0]?.id || `son:${pick(pool.sonId)}`;
        if (canPerform(s, id, a) === true) perform(s, id, a);
        if (s.phase === 'ended') break;
      }
      if (s.phase === 'ended') break;
      if (s.phase === 'briefing') {
        const opts = optionsFor(s);
        decree(s, opts[rnd(opts.length)].id);
      }
      if (s.phase === 'ended') break;
      advance(s);
      assert.ok(s.maat >= 0 && s.maat <= 100);
      assert.ok(s.grain.royal >= 0 && s.gold >= 0);
      assert.ok(Number.isFinite(s.burn.army) && Number.isFinite(s.baselineIntake));
      for (const n of s.nomes) assert.ok(n.loyalty >= 0 && n.loyalty <= 100);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  }
});
