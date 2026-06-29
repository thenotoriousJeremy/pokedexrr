const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const tcgApi = require('./tcgApi');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database on startup
db.initDb()
  .then(() => {
    console.log('Database tables verified/created successfully.');
    // Schedule a weekly price update (every 7 days)
    setInterval(() => {
      tcgApi.updateCollectionPrices();
    }, 1000 * 60 * 60 * 24 * 7);

    // Run a price update in the background shortly after startup (after 30 seconds to not bog down init)
    setTimeout(() => {
      tcgApi.updateCollectionPrices();
    }, 30000);
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });

// --- API ROUTES ---

// 1. Search Pokémon TCG cards (proxies to Pokemon TCG API and database cache)
app.get('/api/search', async (req, res) => {
  const { name, number, set } = req.query;
  try {
    const results = await tcgApi.searchCards(name, number, set);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// 2. Get User's Collection
app.get('/api/collection', async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id as entry_id,
        c.card_id,
        c.quantity,
        c.condition,
        c.printing,
        c.language,
        c.purchase_price,
        c.sub_location_1,
        c.sub_location_2,
        c.added_at,
        cc.name,
        cc.supertype,
        cc.subtypes,
        cc.types,
        cc.rarity,
        cc.set_id,
        cc.set_name,
        cc.number,
        cc.image_url,
        cc.price_trend,
        l.id as location_id,
        l.name as location_name,
        l.type as location_type
      FROM collection c
      JOIN card_cache cc ON c.card_id = cc.id
      LEFT JOIN locations l ON c.location_id = l.id
      ORDER BY c.added_at DESC
    `;
    const rows = await db.all(query);
    
    // Parse JSON fields
    const formatted = rows.map(row => ({
      ...row,
      subtypes: JSON.parse(row.subtypes || '[]'),
      types: JSON.parse(row.types || '[]'),
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve collection', message: error.message });
  }
});

// 3. Add Card to Collection
app.post('/api/collection', async (req, res) => {
  const {
    card_id,
    quantity = 1,
    condition = 'Near Mint',
    printing = 'Normal',
    language = 'English',
    purchase_price = 0,
    location_id = null,
    sub_location_1 = '',
    sub_location_2 = ''
  } = req.body;

  if (!card_id) {
    return res.status(400).json({ error: 'card_id is required' });
  }

  try {
    // Ensure card is in the local metadata cache
    let card = await db.get(`SELECT id FROM card_cache WHERE id = ?`, [card_id]);
    if (!card) {
      console.log(`Card ${card_id} not found in cache. Fetching from API first...`);
      const apiCard = await tcgApi.getCardById(card_id);
      if (!apiCard) {
        return res.status(404).json({ error: `Card ID ${card_id} not found on Pokémon TCG API.` });
      }
    }

    // Insert into collection
    const result = await db.run(`
      INSERT INTO collection 
      (card_id, quantity, condition, printing, language, purchase_price, location_id, sub_location_1, sub_location_2)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      card_id,
      quantity,
      condition,
      printing,
      language,
      purchase_price || 0,
      location_id,
      sub_location_1,
      sub_location_2
    ]);

    res.status(201).json({ message: 'Card added to collection', id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add card', message: error.message });
  }
});

// 4. Update Card in Collection
app.put('/api/collection/:id', async (req, res) => {
  const { id } = req.params;
  const {
    quantity,
    condition,
    printing,
    language,
    purchase_price,
    location_id,
    sub_location_1,
    sub_location_2
  } = req.body;

  try {
    // Build dynamic UPDATE query based on passed values
    const fields = [];
    const params = [];

    if (quantity !== undefined) { fields.push('quantity = ?'); params.push(quantity); }
    if (condition !== undefined) { fields.push('condition = ?'); params.push(condition); }
    if (printing !== undefined) { fields.push('printing = ?'); params.push(printing); }
    if (language !== undefined) { fields.push('language = ?'); params.push(language); }
    if (purchase_price !== undefined) { fields.push('purchase_price = ?'); params.push(purchase_price); }
    if (location_id !== undefined) { fields.push('location_id = ?'); params.push(location_id); }
    if (sub_location_1 !== undefined) { fields.push('sub_location_1 = ?'); params.push(sub_location_1); }
    if (sub_location_2 !== undefined) { fields.push('sub_location_2 = ?'); params.push(sub_location_2); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    params.push(id);
    await db.run(`UPDATE collection SET ${fields.join(', ')} WHERE id = ?`, params);
    
    res.json({ message: 'Collection entry updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entry', message: error.message });
  }
});

// 5. Delete Card from Collection
app.delete('/api/collection/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.run(`DELETE FROM collection WHERE id = ?`, [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Collection entry not found' });
    }
    res.json({ message: 'Card removed from collection' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove card', message: error.message });
  }
});

// 6. Manage Locations (Physical Storage)
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await db.all(`
      SELECT l.*, COUNT(c.id) as card_count, SUM(c.quantity) as total_cards 
      FROM locations l
      LEFT JOIN collection c ON l.id = c.location_id
      GROUP BY l.id
    `);
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve locations', message: error.message });
  }
});

app.post('/api/locations', async (req, res) => {
  const { name, type, description = '' } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }
  try {
    const result = await db.run(`
      INSERT INTO locations (name, type, description)
      VALUES (?, ?, ?)
    `, [name, type, description]);
    res.status(201).json({ message: 'Location created', id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create location', message: error.message });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, description } = req.body;
  try {
    await db.run(`
      UPDATE locations 
      SET name = COALESCE(?, name), type = COALESCE(?, type), description = COALESCE(?, description)
      WHERE id = ?
    `, [name, type, description, id]);
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location', message: error.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Check if location is in use
    const cards = await db.all(`SELECT id FROM collection WHERE location_id = ?`, [id]);
    if (cards.length > 0) {
      // Disassociate cards from this location instead of blocking delete
      await db.run(`UPDATE collection SET location_id = NULL, sub_location_1 = NULL, sub_location_2 = NULL WHERE location_id = ?`, [id]);
    }
    
    await db.run(`DELETE FROM locations WHERE id = ?`, [id]);
    res.json({ message: 'Location deleted successfully (any stored cards moved to Unsorted)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete location', message: error.message });
  }
});

// 7. Get Collection Statistics & Analytics
app.get('/api/stats', async (req, res) => {
  try {
    // Retrieve all collection items to compute statistics
    const query = `
      SELECT 
        c.quantity, c.purchase_price,
        cc.types, cc.rarity, cc.set_name, cc.set_id, cc.price_trend,
        l.name as location_name
      FROM collection c
      JOIN card_cache cc ON c.card_id = cc.id
      LEFT JOIN locations l ON c.location_id = l.id
    `;
    const rows = await db.all(query);

    let totalCards = 0;
    let uniqueCards = rows.length;
    let totalValue = 0;
    let totalSpent = 0;

    const typeCounts = {};
    const rarityCounts = {};
    const setCounts = {};
    const locationCounts = {};

    rows.forEach(row => {
      const qty = row.quantity || 1;
      const price = row.price_trend || 0;
      const spent = row.purchase_price || 0;

      totalCards += qty;
      totalValue += qty * price;
      totalSpent += qty * spent;

      // Parse types
      const types = JSON.parse(row.types || '[]');
      types.forEach(t => {
        typeCounts[t] = (typeCounts[t] || 0) + qty;
      });
      if (types.length === 0) {
        typeCounts['Colorless'] = (typeCounts['Colorless'] || 0) + qty;
      }

      // Rarity
      const rarity = row.rarity || 'Unknown';
      rarityCounts[rarity] = (rarityCounts[rarity] || 0) + qty;

      // Set
      const set = row.set_name || 'Other';
      if (!setCounts[row.set_id]) {
        setCounts[row.set_id] = { name: set, count: 0, value: 0 };
      }
      setCounts[row.set_id].count += qty;
      setCounts[row.set_id].value += qty * price;

      // Location
      const loc = row.location_name || 'Unassigned';
      locationCounts[loc] = (locationCounts[loc] || 0) + qty;
    });

    // Get top most valuable cards (limit 5)
    const topValuableQuery = `
      SELECT 
        c.quantity, c.condition, c.printing,
        cc.name, cc.rarity, cc.set_name, cc.image_url, cc.price_trend
      FROM collection c
      JOIN card_cache cc ON c.card_id = cc.id
      ORDER BY cc.price_trend DESC
      LIMIT 6
    `;
    const topValuable = await db.all(topValuableQuery);

    // Compute progress for top 4 sets in database (estimate set total)
    // To make it look real and beautiful, we will list some major sets with standard card counts
    const setSizes = {
      'base1': 102,  // Base Set
      'base2': 64,   // Jungle
      'base3': 62,   // Fossil
      'base4': 130,  // Base Set 2
      'neo1': 111,   // Neo Genesis
      'cel25': 25,   // Celebrations
      'swsh1': 202,  // Sword & Shield Base
      'swsh11': 196, // Lost Origin
      'swsh12': 98,  // Silver Tempest
      'sv1': 198,    // Scarlet & Violet Base
      'sv2': 193,    // Paldea Evolved
      'sv3': 197,    // Obsidian Flames
      'sv3pt5': 165, // 151
    };

    const setProgress = [];
    for (const setId in setCounts) {
      const userUniqueInSet = await db.get(`
        SELECT COUNT(DISTINCT card_id) as count 
        FROM collection c
        JOIN card_cache cc ON c.card_id = cc.id
        WHERE cc.set_id = ?
      `, [setId]);

      const size = setSizes[setId] || 150; // default estimate if set not in database
      const count = userUniqueInSet.count;
      setProgress.push({
        setId,
        setName: setCounts[setId].name,
        ownedUnique: count,
        totalCards: size,
        percent: Math.min(Math.round((count / size) * 100), 100)
      });
    }

    // Sort set progress by completion percentage descending
    setProgress.sort((a, b) => b.percent - a.percent);

    res.json({
      summary: {
        totalCards,
        uniqueCards,
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        roi: totalSpent > 0 ? parseFloat((((totalValue - totalSpent) / totalSpent) * 100).toFixed(1)) : 0
      },
      types: Object.keys(typeCounts).map(name => ({ name, value: typeCounts[name] })),
      rarities: Object.keys(rarityCounts).map(name => ({ name, value: rarityCounts[name] })),
      sets: Object.keys(setCounts).map(id => ({ 
        id, 
        name: setCounts[id].name, 
        count: setCounts[id].count, 
        value: parseFloat(setCounts[id].value.toFixed(2)) 
      })).sort((a,b) => b.value - a.value).slice(0, 8),
      locations: Object.keys(locationCounts).map(name => ({ name, value: locationCounts[name] })),
      topValuable,
      setProgress: setProgress.slice(0, 4)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute statistics', message: error.message });
  }
});

// 8. Export Database
app.get('/api/export', async (req, res) => {
  const { format = 'csv' } = req.query;
  try {
    const query = `
      SELECT 
        c.quantity,
        c.condition,
        c.printing,
        c.language,
        c.purchase_price,
        c.sub_location_1,
        c.sub_location_2,
        c.added_at,
        cc.id as card_id,
        cc.name as card_name,
        cc.supertype,
        cc.rarity,
        cc.set_id,
        cc.set_name,
        cc.number as card_number,
        cc.price_trend as market_price,
        l.name as location_name
      FROM collection c
      JOIN card_cache cc ON c.card_id = cc.id
      LEFT JOIN locations l ON c.location_id = l.id
    `;
    const rows = await db.all(query);

    if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=pokekeep_collection.json');
      return res.json(rows);
    }

    // Default to CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pokekeep_collection.csv');

    // Headers
    const headers = [
      'Card ID', 'Name', 'Set Name', 'Set ID', 'Card Number', 'Rarity',
      'Quantity', 'Condition', 'Printing', 'Language', 'Purchase Price',
      'Market Price', 'Location Container', 'Sub-Location Page/Row', 'Sub-Location Slot/Section', 'Added At'
    ];

    let csvContent = headers.join(',') + '\n';
    
    rows.forEach(r => {
      const line = [
        r.card_id,
        `"${r.card_name.replace(/"/g, '""')}"`,
        `"${r.set_name.replace(/"/g, '""')}"`,
        r.set_id,
        r.card_number,
        r.rarity,
        r.quantity,
        r.condition,
        r.printing,
        r.language,
        r.purchase_price || 0,
        r.market_price || 0,
        r.location_name ? `"${r.location_name.replace(/"/g, '""')}"` : 'Unassigned',
        r.sub_location_1 ? `"${r.sub_location_1.replace(/"/g, '""')}"` : '',
        r.sub_location_2 ? `"${r.sub_location_2.replace(/"/g, '""')}"` : '',
        r.added_at
      ];
      csvContent += line.join(',') + '\n';
    });

    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Export failed', message: error.message });
  }
});


// Serve production static assets from Frontend
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// Catch-all route to serve Index.html in production
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`PokeKeep Server running on port ${PORT}`);
  console.log(`Access local: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
