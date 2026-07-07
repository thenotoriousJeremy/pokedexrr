// Shared comparator logic for ordering collection cards. Previously copy-pasted
// across autoSortContainerCards, findNextRecommendedSlot, the sorting assistant
// queue, and the unsorted list view in LocationManager.jsx.
export const POKEMON_TYPE_ORDER = {
  'Grass': 1,
  'Fire': 2,
  'Water': 3,
  'Lightning': 4,
  'Psychic': 5,
  'Fighting': 6,
  'Darkness': 7,
  'Metal': 8,
  'Fairy': 9,
  'Dragon': 10,
  'Colorless': 11,
  'Unknown': 100
};

const PRINTING_ORDER_NORMALS_FIRST = {
  'Normal': 1,
  'Reverse Holofoil': 2,
  'Holofoil': 3,
  '1st Edition': 4,
  'Promo': 5
};

const PRINTING_ORDER_FOILS_FIRST = {
  'Reverse Holofoil': 1,
  'Holofoil': 2,
  'Normal': 3,
  '1st Edition': 4,
  'Promo': 5
};

export function getPrintingRank(printing, foilSorting) {
  const order = foilSorting === 'foils_first' ? PRINTING_ORDER_FOILS_FIRST : PRINTING_ORDER_NORMALS_FIRST;
  return order[printing] || 10;
}

// Sorts `cards` in place (and returns it) according to `sortOrder`. `foilSorting`
// only affects the 'set-number-printing' order. Unrecognized/'custom' orders are
// left untouched (stable no-op), matching each call site's original fallback.
// `setsList` (from /api/sets, release-date order) makes the set-based schemes
// sort chronologically, matching the backend's placement engine — without it
// the display order would disagree with where recommendSlot files cards.
export function sortCardsByOrder(cards, sortOrder, foilSorting, setsList = []) {
  const setRank = (name) => {
    if (!setsList || setsList.length === 0) return 0;
    const idx = setsList.findIndex(s => s.name === name);
    return idx >= 0 ? idx : 999999;
  };
  if (sortOrder === 'scanned-desc') {
    cards.sort((a, b) => {
      const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
      const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.entry_id - a.entry_id;
    });
  } else if (sortOrder === 'scanned-asc') {
    cards.sort((a, b) => {
      const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
      const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.entry_id - b.entry_id;
    });
  } else if (sortOrder === 'name-asc') {
    cards.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === 'price-desc') {
    cards.sort((a, b) => (b.price_trend || 0) - (a.price_trend || 0));
  } else if (sortOrder === 'set-number') {
    cards.sort((a, b) => {
      const cmpChrono = setRank(a.set_name) - setRank(b.set_name);
      if (cmpChrono !== 0) return cmpChrono;
      const cmpSet = (a.set_name || '').localeCompare(b.set_name || '');
      if (cmpSet !== 0) return cmpSet;
      const numA = parseInt(a.number || '0', 10) || 0;
      const numB = parseInt(b.number || '0', 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.number || '').localeCompare(b.number || '');
    });
  } else if (sortOrder === 'set-number-printing') {
    cards.sort((a, b) => {
      const cmpChrono = setRank(a.set_name) - setRank(b.set_name);
      if (cmpChrono !== 0) return cmpChrono;
      const setA = a.set_name || '';
      const setB = b.set_name || '';
      const cmpSet = setA.localeCompare(setB);
      if (cmpSet !== 0) return cmpSet;

      const printA = getPrintingRank(a.printing, foilSorting);
      const printB = getPrintingRank(b.printing, foilSorting);
      if (printA !== printB) return printA - printB;

      const numA = parseInt(a.number || '0', 10) || 0;
      const numB = parseInt(b.number || '0', 10) || 0;
      if (numA !== numB) return numA - numB;

      const cmpNum = (a.number || '').localeCompare(b.number || '');
      if (cmpNum !== 0) return cmpNum;

      return a.name.localeCompare(b.name);
    });
  } else if (sortOrder === 'type-name') {
    cards.sort((a, b) => {
      const typeA = (a.types && a.types[0]) || 'Unknown';
      const typeB = (b.types && b.types[0]) || 'Unknown';
      const orderA = POKEMON_TYPE_ORDER[typeA] || 50;
      const orderB = POKEMON_TYPE_ORDER[typeB] || 50;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }
  return cards;
}
