// Set field supports multiple sets at once (e.g. "ltr, ltc"). Split into tokens
// and build match clauses so a search spans every listed set.

// "ltr, ltc" -> ['ltr','ltc']. Empty/blank -> [].
function parseSetList(setQuery) {
  return (setQuery || '').split(',').map(s => s.trim()).filter(Boolean);
}

// SQL fragment matching card_cache rows in ANY of the sets (by name or id).
// `col` is the table alias for aliased joins ('cc' -> cc.set_name). Returns null
// when no sets, so callers skip adding the clause.
function setSqlFilter(setList, col = '') {
  if (!setList.length) return null;
  const p = col ? `${col}.` : '';
  const clause = setList.map(() => `(${p}set_name LIKE ? OR ${p}set_id = ?)`).join(' OR ');
  const params = setList.flatMap(s => [`%${s}%`, s]);
  return { clause: `(${clause})`, params };
}

module.exports = { parseSetList, setSqlFilter };
