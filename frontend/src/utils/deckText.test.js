import assert from 'node:assert';
import { buildDeckExport, parseDeckLine } from './deckText.js';

const cards = [
  { quantity: 4, name: 'Pikachu ex', set_id: 'svi', number: '63', supertype: 'Pokémon' },
  { quantity: 2, name: "Boss's Orders", set_id: 'pal', number: '172', supertype: 'Trainer' },
  { quantity: 6, name: 'Lightning Energy', set_id: 'sve', number: '4', supertype: 'Energy' },
];

const ptcgl = buildDeckExport(cards, 'ptcgl');
assert.ok(ptcgl.includes('Pokémon: 4'), 'ptcgl Pokémon count');
assert.ok(ptcgl.includes('Energy: 6'), 'ptcgl Energy count');
assert.ok(ptcgl.includes('4 Pikachu ex SVI 63'), 'ptcgl card line');
assert.ok(ptcgl.trim().endsWith('Total Cards: 12'), 'ptcgl total');

const mtga = buildDeckExport(cards, 'mtga');
assert.ok(mtga.startsWith('Deck\n'), 'mtga header');
assert.ok(mtga.includes('4 Pikachu ex (SVI) 63'), 'mtga card line');

assert.strictEqual(buildDeckExport(cards, 'plain').split('\n')[0], '4 Pikachu ex', 'plain line');

assert.deepStrictEqual(parseDeckLine('4 Pikachu ex SVI 63'), { qty: 4, name: 'Pikachu ex' });
assert.deepStrictEqual(parseDeckLine('4 Lightning Bolt (2X2) 117'), { qty: 4, name: 'Lightning Bolt' });
assert.deepStrictEqual(parseDeckLine('2 Pikachu (SVI) #63'), { qty: 2, name: 'Pikachu' });
assert.deepStrictEqual(parseDeckLine('4 Pikachu'), { qty: 4, name: 'Pikachu' });
assert.deepStrictEqual(parseDeckLine('1 Mewtwo GX'), { qty: 1, name: 'Mewtwo GX' }, 'trailing GX kept');
assert.deepStrictEqual(parseDeckLine('3 Pikachu V'), { qty: 3, name: 'Pikachu V' }, 'trailing V kept');
assert.strictEqual(parseDeckLine('not a card line'), null);

console.log('deckText self-check passed');

// buylist: only shortfall vs owned, TCGplayer mass-entry lines
const bl = buildDeckExport([
  { quantity: 4, name: 'Pikachu ex', owned_qty: 1 },
  { quantity: 2, name: 'Ultra Ball', owned_qty: 2 },
  { quantity: 3, name: 'Iono', owned_qty: 0 },
], 'buylist');
assert.strictEqual(bl, '3 Pikachu ex\n3 Iono', 'buylist shortfall lines');

console.log('deckText buylist check passed');
