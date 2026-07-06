// Single source of truth for "where should this card go" — replaces the old
// getSortedPositionForCard (server) and findNextRecommendedSlot (client, a
// 150-line duplicate that re-derived the same logic from sub_location
// strings). Every container type (binder page, box row, deck box slot) is
// just a compartment with a capacity, so one implementation covers all of
// them instead of branching on location.type everywhere.
const { resolveCardPrice, rebalanceCompartmentPositions } = require('./priceHelpers');

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

function getSortCategory(card, sortOrder) {
  if (!card || !sortOrder || sortOrder === 'custom') return null;
  if (sortOrder.startsWith('name')) return card.name ? card.name.charAt(0).toUpperCase() : '?';
  if (sortOrder.startsWith('set')) return card.set_name || 'Unknown Set';
  if (sortOrder.startsWith('type')) {
    let typeStr = 'Colorless';
    if (card.types) {
      try {
        const t = typeof card.types === 'string' ? JSON.parse(card.types) : card.types;
        if (t && t.length > 0) typeStr = t[0];
      } catch (e) {}
    }
    return typeStr;
  }
  if (sortOrder.startsWith('price')) {
    const p = card.price_trend || 0;
    if (p >= 100) return '$100+';
    if (p >= 50) return '$50+';
    if (p >= 20) return '$20+';
    if (p >= 10) return '$10+';
    if (p >= 5) return '$5+';
    if (p >= 1) return '$1+';
    return '< $1';
  }
  return null;
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
// Recommends a {compartment_id, position, label} for placing cardMetadata
// (name/set_name/number/types/rarity/price_trend/printing) into a location.
// overrideCompartments lets a caller (e.g. a bulk "apply all" action) pass a
// simulated in-memory snapshot instead of hitting the DB fresh each call, so
// a batch of cards never collide on the same slot.
async function recommendSlot(db, location, cardMetadata, overrideCompartments = null, mockCards = []) {
  const compartments = overrideCompartments || await loadCompartments(db, location.id, location.user_id);
  if (compartments.length === 0) return null;

  const cardSet = cardMetadata.set_name;

  // 1. Get all cards in this location to check which sets are currently in which compartments
  const allLocationCards = await db.all(`
    SELECT c.id as entry_id, c.compartment_id, c.printing, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number,
           cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil
    FROM collection c
    JOIN card_cache cc ON c.card_id = cc.id
    WHERE c.user_id = ? AND c.location_id = ?
  `, [location.user_id, location.id]);

  allLocationCards.push(...mockCards);

  allLocationCards.forEach(c => {
    try { c.types = JSON.parse(c.types || '[]'); } catch { c.types = []; }
    c.price_trend = resolveCardPrice(c);
  });

  // Group cards by compartment ID
  const cardsByCompId = new Map();
  allLocationCards.forEach(c => {
    if (!c.compartment_id) return;
    if (!cardsByCompId.has(c.compartment_id)) cardsByCompId.set(c.compartment_id, []);
    cardsByCompId.get(c.compartment_id).push(c);
  });

  // Check if this location is full
  const allCompartmentsFull = compartments.every(c => {
    const count = overrideCompartments
      ? (overrideCompartments.find(oc => oc.id === c.id)?.count || 0)
      : (cardsByCompId.get(c.id) || []).length;
    return count >= c.capacity;
  });

  if (allCompartmentsFull) {
    // Look for other locations of the same user
    const otherLocations = await db.all(
      `SELECT id, name, type, sort_order, foil_sorting, user_id FROM locations WHERE user_id = ? AND id != ? ORDER BY id ASC`,
      [location.user_id, location.id]
    );
    for (const otherLoc of otherLocations) {
      const otherComps = await loadCompartments(db, otherLoc.id, location.user_id);
      const hasSpace = otherComps.some(c => c.free > 0);
      if (hasSpace) {
        const rec = await recommendSlot(db, otherLoc, cardMetadata, otherComps);
        if (rec) {
          return {
            ...rec,
            location_id: otherLoc.id
          };
        }
      }
    }
    return null;
  }

  const cardCat = getSortCategory(cardMetadata, location.sort_order);

  // Determine dynamic categories for each compartment based on sort_order
  const dynamicCatsByCompId = new Map();
  compartments.forEach(c => {
    const compCards = cardsByCompId.get(c.id) || [];
    const cardCats = compCards.map(card => getSortCategory(card, location.sort_order)).filter(Boolean);
    // Explicit assignedSets act as category overrides
    const combinedCats = new Set([...(c.assignedSets || []), ...cardCats]);
    dynamicCatsByCompId.set(c.id, Array.from(combinedCats));
  });

  // Find compartments assigned to the card's category (explicitly or dynamically)
  const assignedComps = compartments.filter(c => {
    const cats = dynamicCatsByCompId.get(c.id) || [];
    return cardCat && cats.includes(cardCat);
  });

  // Find unassigned/empty compartments (no explicit assignments and no categorized cards)
  const unassignedComps = compartments.filter(c => {
    const cats = dynamicCatsByCompId.get(c.id) || [];
    return cats.length === 0;
  });

  // Build the eligible pool (assigned first, then unassigned as overflow)
  let pool = [...assignedComps, ...unassignedComps];
  pool.sort((a, b) => a.idx - b.idx);

  // If the pool has no free space, fall back to all compartments in the location
  const poolHasFreeSpace = pool.some(c => {
    const count = overrideCompartments
      ? (overrideCompartments.find(oc => oc.id === c.id)?.count || 0)
      : (cardsByCompId.get(c.id) || []).length;
    return count < c.capacity;
  });

  if (pool.length === 0 || !poolHasFreeSpace) {
    pool = [...compartments];
  }

  // Handle custom sort order recommendation
  if (location.sort_order === 'custom') {
    const usableCandidates = pool.filter(c => {
      const count = overrideCompartments
        ? (overrideCompartments.find(oc => oc.id === c.id)?.count || 0)
        : (cardsByCompId.get(c.id) || []).length;
      return count < c.capacity;
    });
    const best = usableCandidates.find(c => {
      const cats = dynamicCatsByCompId.get(c.id) || [];
      return cardCat && cats.includes(cardCat);
    }) || usableCandidates.find(c => {
      const cats = dynamicCatsByCompId.get(c.id) || [];
      return cats.length === 0;
    }) || usableCandidates[0];

    if (!best) return null;
    const bestCards = cardsByCompId.get(best.id) || [];
    return {
      location_id: location.id,
      compartment_id: best.id,
      position: (bestCards.length + 1) * 1000,
      label: `${compartmentLabel(best, location.type)} (in ${location.name})`
    };
  }

  // Structured sort:
  const poolIds = pool.map(c => c.id);
  const existingCardsInPool = allLocationCards.filter(c => poolIds.includes(c.compartment_id));

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

  const sorted = sortCards([...existingCardsInPool, newCard], location.sort_order, location.foil_sorting);
  const targetIndex = sorted.findIndex(c => c.entry_id === -1);
  if (targetIndex === -1) return null;

  let cursor = 0;
  for (const compartment of pool) {
    if (targetIndex < cursor + compartment.capacity) {
      const seq = targetIndex - cursor;
      return {
        location_id: location.id,
        compartment_id: compartment.id,
        position: (seq + 1) * 1000,
        label: `${compartmentLabel(compartment, location.type)}, Pos ${seq + 1} (in ${location.name})`
      };
    }
    cursor += compartment.capacity;
  }

  return null;
}

// Renumbers a compartment's cards so stored `position` matches the container's
// sort scheme (1000, 2000, ...). Incremental inserts assign a colliding
// (seq+1)*1000 and the old position-only rebalance couldn't tell #10 from #50
// on a tie; re-deriving from the scheme here keeps display order, the "place
// here" label, and REC SPOT all in agreement. Custom order = manual, so it
// falls back to honoring the existing position order.
async function rebalanceCompartmentByScheme(db, compartmentId, userId, location) {
  if (!compartmentId) return;
  if (!location || location.sort_order === 'custom') {
    return rebalanceCompartmentPositions(db, compartmentId, userId);
  }
  const cards = await db.all(`
    SELECT c.id, c.printing, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number,
           cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil
    FROM collection c JOIN card_cache cc ON c.card_id = cc.id
    WHERE c.compartment_id = ? AND c.user_id = ?
  `, [compartmentId, userId]);
  cards.forEach(c => {
    try { c.types = JSON.parse(c.types || '[]'); } catch { c.types = []; }
    c.price_trend = resolveCardPrice(c);
  });
  const sorted = sortCards(cards, location.sort_order, location.foil_sorting);
  for (let i = 0; i < sorted.length; i++) {
    await db.run(`UPDATE collection SET position = ? WHERE id = ?`, [(i + 1) * 1000, sorted[i].id]);
  }
}

module.exports = { sortCards, compartmentLabel, loadCompartments, recommendSlot, rebalanceCompartmentByScheme };
