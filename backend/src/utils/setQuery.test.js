// Run: node src/utils/setQuery.test.js  (no framework, asserts only)
const assert = require('assert');
const { parseSetList, setSqlFilter } = require('./setQuery');

// parseSetList: split, trim, drop blanks.
assert.deepStrictEqual(parseSetList('ltr, ltc'), ['ltr', 'ltc']);
assert.deepStrictEqual(parseSetList('  ltr '), ['ltr']);
assert.deepStrictEqual(parseSetList(',,'), []);
assert.deepStrictEqual(parseSetList(''), []);
assert.deepStrictEqual(parseSetList(null), []);

// setSqlFilter: null when empty, OR-joined clause + flat params otherwise.
assert.strictEqual(setSqlFilter([]), null);

const one = setSqlFilter(['ltr']);
assert.strictEqual(one.clause, '((set_name LIKE ? OR set_id = ?))');
assert.deepStrictEqual(one.params, ['%ltr%', 'ltr']);

const two = setSqlFilter(['ltr', 'ltc'], 'cc');
assert.strictEqual(two.clause, '((cc.set_name LIKE ? OR cc.set_id = ?) OR (cc.set_name LIKE ? OR cc.set_id = ?))');
assert.deepStrictEqual(two.params, ['%ltr%', 'ltr', '%ltc%', 'ltc']);

console.log('setQuery OK');
