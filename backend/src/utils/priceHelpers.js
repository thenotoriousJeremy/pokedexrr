function resolveCardPrice(card) {
  if (!card) return 0;
  if (card.printing === 'Holofoil' && card.price_holofoil !== null && card.price_holofoil > 0) {
    return card.price_holofoil;
  }
  if (card.printing === 'Reverse Holofoil' && card.price_reverse_holofoil !== null && card.price_reverse_holofoil > 0) {
    return card.price_reverse_holofoil;
  }
  if (card.printing === 'Normal' && card.price_normal !== null && card.price_normal > 0) {
    return card.price_normal;
  }
  return card.price_trend || 0;
}

async function rebalanceLocationPositions(db, locationId, userId) {
  if (!locationId) return;
  const cards = await db.all(`SELECT id FROM collection WHERE location_id = ? AND user_id = ? ORDER BY position ASC`, [locationId, userId]);
  for (let i = 0; i < cards.length; i++) {
    const cleanPos = (i + 1) * 1000;
    await db.run(`UPDATE collection SET position = ? WHERE id = ?`, [cleanPos, cards[i].id]);
  }
}

async function getSortedPositionForCard(db, locationId, userId, cardMetadata) {
  const loc = await db.get(`SELECT type, sort_order, foil_sorting FROM locations WHERE id = ? AND user_id = ?`, [locationId, userId]);
  if (!loc || loc.sort_order === 'custom') {
    const maxRow = await db.get(`SELECT MAX(position) as maxPos FROM collection WHERE location_id = ? AND user_id = ?`, [locationId, userId]);
    return maxRow && maxRow.maxPos !== null ? maxRow.maxPos + 1000 : 1000;
  }

  const sortOrder = loc.sort_order;

  const query = `
    SELECT c.id as entry_id, c.position, c.printing, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number, cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil
    FROM collection c
    JOIN card_cache cc ON c.card_id = cc.id
    WHERE c.location_id = ? AND c.user_id = ?
  `;
  const existing = await db.all(query, [locationId, userId]);

  existing.forEach(c => {
    try {
      c.types = JSON.parse(c.types || '[]');
    } catch {
      c.types = [];
    }
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
  existing.push(newCard);

  const POKEMON_TYPE_ORDER = {
    'Grass': 1, 'Fire': 2, 'Water': 3, 'Lightning': 4, 'Psychic': 5,
    'Fighting': 6, 'Darkness': 7, 'Metal': 8, 'Dragon': 9, 'Colorless': 10, 'Trainer': 11, 'Energy': 12
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

  const isFoilsFirst = loc && loc.foil_sorting === 'foils_first';
  const PRINTING_ORDER = isFoilsFirst ? PRINTING_ORDER_FOILS_FIRST : PRINTING_ORDER_NORMALS_FIRST;

  if (sortOrder === 'name-asc') {
    existing.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === 'price-desc') {
    existing.sort((a, b) => (b.price_trend || 0) - (a.price_trend || 0));
  } else if (sortOrder === 'set-number') {
    existing.sort((a, b) => {
      const cmpSet = (a.set_name || '').localeCompare(b.set_name || '');
      if (cmpSet !== 0) return cmpSet;
      const numA = parseInt(a.number || '0', 10) || 0;
      const numB = parseInt(b.number || '0', 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.number || '').localeCompare(b.number || '');
    });
  } else if (sortOrder === 'set-number-printing') {
    existing.sort((a, b) => {
      const setA = a.set_name || '';
      const setB = b.set_name || '';
      const cmpSet = setA.localeCompare(setB);
      if (cmpSet !== 0) return cmpSet;

      const printA = PRINTING_ORDER[a.printing] || 10;
      const printB = PRINTING_ORDER[b.printing] || 10;
      if (printA !== printB) return printA - printB;

      const numA = parseInt(a.number || '0', 10) || 0;
      const numB = parseInt(b.number || '0', 10) || 0;
      if (numA !== numB) return numA - numB;

      const cmpNum = (a.number || '').localeCompare(b.number || '');
      if (cmpNum !== 0) return cmpNum;

      return a.name.localeCompare(b.name);
    });
  } else if (sortOrder === 'type-name') {
    existing.sort((a, b) => {
      const typeA = (a.types && a.types[0]) || 'Unknown';
      const typeB = (b.types && b.types[0]) || 'Unknown';
      const orderA = POKEMON_TYPE_ORDER[typeA] || 50;
      const orderB = POKEMON_TYPE_ORDER[typeB] || 50;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }

  const targetIndex = existing.findIndex(c => c.entry_id === -1);
  if (targetIndex === -1) return 1000;

  if (existing.length === 1) return 1000;
  if (targetIndex === 0) {
    return existing[1].position / 2;
  }
  if (targetIndex === existing.length - 1) {
    return existing[targetIndex - 1].position + 1000;
  }
  return (existing[targetIndex - 1].position + existing[targetIndex + 1].position) / 2;
}

// Deterministic price simulation over history, seeded from the card ID so the
// same card always produces the same "historical" curve.
const getSimulatedPriceAt = (cardId, currentPrice, t, now) => {
  const timeDiff = now - t;
  const yearsAgo = timeDiff / (365.25 * 24 * 60 * 60 * 1000);

  let seed = 0;
  for (let i = 0; i < cardId.length; i++) {
    seed += cardId.charCodeAt(i);
  }

  const trend = 0.05 * Math.sin(seed * 0.1) * yearsAgo; // up or down trend
  const noise = 0.03 * Math.sin(seed + yearsAgo * 12); // monthly waves
  const factor = Math.max(0.1, 1.0 - (yearsAgo * 0.06) + trend + noise);

  return parseFloat((currentPrice * factor).toFixed(2));
};

const isVintageSet = (setId) => {
  const id = (setId || '').toLowerCase();
  return id.startsWith('base') || id.startsWith('gym') || id.startsWith('neo') ||
         id.startsWith('lc') || id.startsWith('ecard') || id.startsWith('ex') ||
         id.startsWith('pop') || id.startsWith('promo1') || id.startsWith('si') ||
         id.startsWith('xy12') || id.startsWith('cel25');
};

module.exports = {
  resolveCardPrice,
  rebalanceLocationPositions,
  getSortedPositionForCard,
  getSimulatedPriceAt,
  isVintageSet
};
