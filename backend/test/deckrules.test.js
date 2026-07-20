// Runnable smoke test for deck copy rules. No framework — plain node + assert.
// Run: `node test/deckrules.test.js`. Uses a fake db client so it never
// touches a real database.
const assert = require('assert');
const { isBasicEnergyOrLand, validateDeckAddition } = require('../src/utils/deckRules');

function testClassification() {
  // Pokémon basic energy exempt; special energy is not.
  assert.strictEqual(isBasicEnergyOrLand({ supertype: 'Energy', subtypes: '["Basic"]' }, 'pokemon'), true);
  assert.strictEqual(isBasicEnergyOrLand({ supertype: 'Energy', subtypes: '["Special"]' }, 'pokemon'), false);
  assert.strictEqual(isBasicEnergyOrLand({ supertype: 'Pokémon', subtypes: '[]' }, 'pokemon'), false);
  // MTG basic land exempt; nonbasic land is not.
  assert.strictEqual(isBasicEnergyOrLand({ name: 'Forest', supertype: 'Land', subtypes: '["Basic","Forest"]' }, 'mtg'), true);
  assert.strictEqual(isBasicEnergyOrLand({ name: 'Fabled Passage', supertype: 'Land', subtypes: '["Land"]' }, 'mtg'), false);
}

// Fake db: one owned card (3 copies of a normal Pokémon), a deck already
// holding 2 copies of that name under a different card_id.
function makeFakeDb({ owned = 3, otherSameName = 2 } = {}) {
  return {
    async get(sql, params) {
      if (/FROM card_cache WHERE id/.test(sql)) return { id: 'p1', name: 'Pikachu', supertype: 'Pokémon', subtypes: '[]', game: 'pokemon' };
      if (/AS owned/.test(sql)) return { owned };
      if (/FROM decks WHERE id/.test(sql)) return { game: 'pokemon' };
      if (/AS other/.test(sql)) return { other: otherSameName };
      return null;
    },
  };
}

async function testValidation() {
  const base = { deckId: 1, userId: 7, cardId: 'p1' };

  // Owned cap: 3 owned, asking for 4 fails; 3 ok (2 already elsewhere + 3 = 5 > 4 → blocked by 4-cap instead).
  assert.strictEqual((await validateDeckAddition({ ...base, newQty: 4, dbClient: makeFakeDb({ owned: 3 }) })).ok, false,
    'cannot exceed owned copies');

  // 4-cap by name: deck has 2 of this name already; adding 3 more (total 5) fails.
  const capFail = await validateDeckAddition({ ...base, newQty: 3, dbClient: makeFakeDb({ owned: 10, otherSameName: 2 }) });
  assert.strictEqual(capFail.ok, false, 'total copies by name capped at 4');
  assert.ok(/more than 4/.test(capFail.error), 'reports the 4-copy rule');

  // Within both limits: 2 already + 2 = 4, owned 10 → ok.
  assert.strictEqual((await validateDeckAddition({ ...base, newQty: 2, dbClient: makeFakeDb({ owned: 10, otherSameName: 2 }) })).ok, true,
    'exactly 4 total is allowed');
}

async function main() {
  testClassification();
  await testValidation();
  console.log('deckrules.test.js passed');
}

main().catch(err => { console.error(err); process.exit(1); });
