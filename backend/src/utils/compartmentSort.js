// Single source of truth for "where should this card go" — replaces the old
// getSortedPositionForCard (server) and findNextRecommendedSlot (client, a
// 150-line duplicate that re-derived the same logic from sub_location
// strings). Every container type (binder page, box row, deck box slot) is
// just a compartment with a capacity, so one implementation covers all of
// them instead of branching on location.type everywhere.
const { resolveCardPrice } = require('./priceHelpers');

const POKEMON_TYPE_ORDER = {
  'Grass': 1, 'Fire': 2, 'Water': 3, 'Lightning': 4, 'Psychic': 5,
  'Fighting': 6, 'Darkness': 7, 'Metal': 8, 'Dragon': 9, 'Colorless': 10, 'Trainer': 11, 'Energy': 12
};

const PRINTING_ORDER_NORMALS_FIRST = { 'Normal': 1, 'Reverse Holofoil': 2, 'Holofoil': 3, '1st Edition': 4, 'Promo': 5 };
const PRINTING_ORDER_FOILS_FIRST = { 'Reverse Holofoil': 1, 'Holofoil': 2, 'Normal': 3, '1st Edition': 4, 'Promo': 5 };

function sortCards(cards, sortOrder, foilSorting) {
  const printingOrder = foilSorting === 'foils_first' ? PRINTING_ORDER_FOILS_FIRST : PRINTING_ORDER_NORMALS_FIRST;
  const sorted = [...cards];
  if (sortOrder === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === 'price-desc') {
    sorted.sort((a, b) => (b.price_trend || 0) - (a.price_trend || 0));
  } else if (sortOrder === 'set-number') {
    sorted.sort((a, b) => {
      const cmpSet = (a.set_name || '').localeCompare(b.set_name || '');
      if (cmpSet !== 0) return cmpSet;
      const numA = parseInt(a.number || '0', 10) || 0;
      const numB = parseInt(b.number || '0', 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.number || '').localeCompare(b.number || '');
    });
  } else if (sortOrder === 'set-number-printing') {
    sorted.sort((a, b) => {
      const cmpSet = (a.set_name || '').localeCompare(b.set_name || '');
      if (cmpSet !== 0) return cmpSet;
      const printA = printingOrder[a.printing] || 10;
      const printB = printingOrder[b.printing] || 10;
      if (printA !== printB) return printA - printB;
      const numA = parseInt(a.number || '0', 10) || 0;
      const numB = parseInt(b.number || '0', 10) || 0;
      if (numA !== numB) return numA - numB;
      const cmpNum = (a.number || '').localeCompare(b.number || '');
      if (cmpNum !== 0) return cmpNum;
      return a.name.localeCompare(b.name);
    });
  } else if (sortOrder === 'type-name') {
    sorted.sort((a, b) => {
      const typeA = (a.types && a.types[0]) || 'Unknown';
      const typeB = (b.types && b.types[0]) || 'Unknown';
      const orderA = POKEMON_TYPE_ORDER[typeA] || 50;
      const orderB = POKEMON_TYPE_ORDER[typeB] || 50;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }
  return sorted;
}

function compartmentLabel(compartment, locationType) {
  if (compartment.label) return compartment.label;
  const isBinder = locationType === 'Binder' || locationType === 'Toploader Binder';
  return isBinder ? `Page ${compartment.idx}` : `Row ${compartment.idx}`;
}

// Loads every compartment for a location with its current card count and
// assigned sets, so callers get one consistent view instead of separate
// queries scattered around.
async function loadCompartments(db, locationId, userId) {
  const compartments = await db.all(
    `SELECT id, idx, label, capacity FROM compartments WHERE location_id = ? ORDER BY idx ASC`,
    [locationId]
  );
  if (compartments.length === 0) return [];

  const ids = compartments.map(c => c.id);
  const placeholders = ids.map(() => '?').join(',');

  const assignmentRows = await db.all(
    `SELECT compartment_id, set_name FROM compartment_set_assignments WHERE compartment_id IN (${placeholders})`,
    ids
  );
  const setsByCompartment = new Map();
  assignmentRows.forEach(r => {
    if (!setsByCompartment.has(r.compartment_id)) setsByCompartment.set(r.compartment_id, []);
    setsByCompartment.get(r.compartment_id).push(r.set_name);
  });

  const countRows = await db.all(
    `SELECT compartment_id, COUNT(*) as cnt FROM collection WHERE user_id = ? AND compartment_id IN (${placeholders}) GROUP BY compartment_id`,
    [userId, ...ids]
  );
  const countByCompartment = new Map(countRows.map(r => [r.compartment_id, r.cnt]));

  return compartments.map(c => ({
    ...c,
    assignedSets: setsByCompartment.get(c.id) || [],
    count: countByCompartment.get(c.id) || 0,
    free: c.capacity - (countByCompartment.get(c.id) || 0)
  }));
}

// Recommends a {compartment_id, position, label} for placing cardMetadata
// (name/set_name/number/types/rarity/price_trend/printing) into a location.
// overrideCompartments lets a caller (e.g. a bulk "apply all" action) pass a
// simulated in-memory snapshot instead of hitting the DB fresh each call, so
// a batch of cards never collide on the same slot.
async function recommendSlot(db, location, cardMetadata, overrideCompartments = null) {
  const compartments = overrideCompartments || await loadCompartments(db, location.id, location.user_id);
  const candidates = compartments.filter(c => c.free > 0);
  if (candidates.length === 0) return null;

  const cardSet = cardMetadata.set_name;

  if (location.sort_order === 'custom') {
    const best = candidates.find(c => cardSet && c.assignedSets.includes(cardSet))
      || candidates.find(c => c.assignedSets.length === 0)
      || candidates[0];
    return {
      compartment_id: best.id,
      position: (best.count + 1) * 1000,
      label: compartmentLabel(best, location.type)
    };
  }

  // Categorized sort: restrict to compartments that would accept this card
  // (assigned to its set, or unassigned — never route into a compartment
  // dedicated to a different set), then sort the whole pool by scheme and
  // walk it into compartments in index order using their real capacities.
  const pool = candidates.filter(c => c.assignedSets.length === 0 || (cardSet && c.assignedSets.includes(cardSet)));
  const usablePool = pool.length > 0 ? pool : candidates;

  const existingCards = await db.all(`
    SELECT c.id as entry_id, c.compartment_id, c.printing, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number,
           cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil
    FROM collection c
    JOIN card_cache cc ON c.card_id = cc.id
    WHERE c.user_id = ? AND c.compartment_id IN (${usablePool.map(() => '?').join(',')})
  `, [location.user_id, ...usablePool.map(c => c.id)]);

  existingCards.forEach(c => {
    try { c.types = JSON.parse(c.types || '[]'); } catch { c.types = []; }
    c.price_trend = resolveCardPrice(c);
  });

  const newCard = {
    entry_id: -1,
    printing: cardMetadata.printing || 'Normal',
    name: cardMetadata.name || '',
    supertype: cardMetadata.supertype || '',
    types: cardMetadata.types || [],
    rarity: cardMetadata.rarity || '',
    set_name: cardMetadata.set_name || '',
    number: cardMetadata.number || '0',
    price_trend: resolveCardPrice(cardMetadata)
  };

  const sorted = sortCards([...existingCards, newCard], location.sort_order, location.foil_sorting);
  const targetIndex = sorted.findIndex(c => c.entry_id === -1);
  if (targetIndex === -1) return null;

  // Walk usablePool in index order, consuming capacity, until targetIndex falls inside one.
  let cursor = 0;
  for (const compartment of usablePool) {
    if (targetIndex < cursor + compartment.capacity) {
      const seq = targetIndex - cursor; // 0-based position within this compartment
      return {
        compartment_id: compartment.id,
        position: (seq + 1) * 1000,
        label: `${compartmentLabel(compartment, location.type)}, Pos ${seq + 1}`
      };
    }
    cursor += compartment.capacity;
  }

  return null; // whole pool is full
}

module.exports = { sortCards, compartmentLabel, loadCompartments, recommendSlot };
