const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const tcgApi = require('../tcgApi');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, requireAdmin);

// Get all users with their statistics
router.get('/users', async (req, res) => {
  try {
    const users = await db.all(`
      SELECT id, username, role, share_enabled, created_at
      FROM users
      ORDER BY username ASC
    `);

    // Fetch stats for each user
    const usersWithStats = [];
    for (const u of users) {
      const stats = await db.get(`
        SELECT COUNT(c.id) as unique_cards, SUM(c.quantity) as total_cards,
          SUM(c.quantity * CASE
            WHEN c.printing = 'Holofoil' AND cc.price_holofoil IS NOT NULL AND cc.price_holofoil > 0 THEN cc.price_holofoil
            WHEN c.printing = 'Reverse Holofoil' AND cc.price_reverse_holofoil IS NOT NULL AND cc.price_reverse_holofoil > 0 THEN cc.price_reverse_holofoil
            WHEN c.printing = 'Normal' AND cc.price_normal IS NOT NULL AND cc.price_normal > 0 THEN cc.price_normal
            ELSE cc.price_trend
          END) as total_value
        FROM collection c
        JOIN card_cache cc ON c.card_id = cc.id
        WHERE c.user_id = ?
      `, [u.id]);

      usersWithStats.push({
        ...u,
        total_cards: stats.total_cards || 0,
        unique_cards: stats.unique_cards || 0,
        total_value: parseFloat((stats.total_value || 0).toFixed(2))
      });
    }

    res.json(usersWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve users list' });
  }
});

// Create a new user from Admin Panel
router.post('/users', async (req, res) => {
  const { username, password, role = 'member' } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (role !== 'member' && role !== 'admin') {
    return res.status(400).json({ error: 'Invalid role specification' });
  }

  try {
    const existingUser = await db.get(`SELECT id FROM users WHERE username = ?`, [cleanUsername]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const passwordHash = db.hashPassword(password);
    const shareToken = crypto.randomBytes(16).toString('hex');

    await db.run(`
      INSERT INTO users (username, password_hash, role, share_token, share_enabled)
      VALUES (?, ?, ?, ?, ?)
    `, [cleanUsername, passwordHash, role, shareToken, 0]);

    res.status(201).json({ message: `User "${cleanUsername}" created successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update a user (Change password or Role) from Admin Panel
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { password, role } = req.body;

  try {
    const targetUser = await db.get(`SELECT id, username, role FROM users WHERE id = ?`, [id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (password !== undefined) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      const newHash = db.hashPassword(password);
      await db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, id]);
    }

    if (role !== undefined) {
      if (role !== 'member' && role !== 'admin') {
        return res.status(400).json({ error: 'Invalid role' });
      }
      // Block admin demoting themselves
      if (parseInt(id, 10) === req.user.id && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot demote yourself from Administrator role.' });
      }
      await db.run(`UPDATE users SET role = ? WHERE id = ?`, [role, id]);
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user from Admin Panel
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own Administrator account.' });
  }

  try {
    const targetUser = await db.get(`SELECT id, username FROM users WHERE id = ?`, [id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.run(`DELETE FROM sessions WHERE user_id = ?`, [id]);
    await db.run(`DELETE FROM collection WHERE user_id = ?`, [id]);
    await db.run(`DELETE FROM locations WHERE user_id = ?`, [id]);
    await db.run(`DELETE FROM users WHERE id = ?`, [id]);

    res.json({ message: `User "${targetUser.username}" and all their card collections/locations have been permanently deleted.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Generate a random collection of various cards for admins database so we can test.
// Dev/test-data helper only — unreachable once NODE_ENV=production.
router.post('/seed-cards', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  try {
    // 1. Get or create Binder and Box locations for admin, each with a Page 1 / Row 1
    // compartment to seed into.
    let binder = await db.get(`SELECT id FROM locations WHERE user_id = ? AND type = 'Binder' LIMIT 1`, [req.user.id]);
    if (!binder) {
      const result = await db.run(`
        INSERT INTO locations (name, type, sort_order, user_id) VALUES (?, ?, ?, ?)
      `, ['Binder Seed Box', 'Binder', 'custom', req.user.id]);
      await db.createCompartments(result.lastID, 3, 9);
      binder = { id: result.lastID };
    }
    const binderPage1 = await db.get(`SELECT id FROM compartments WHERE location_id = ? AND idx = 1`, [binder.id]);

    let box = await db.get(`SELECT id FROM locations WHERE user_id = ? AND type = 'Box' LIMIT 1`, [req.user.id]);
    if (!box) {
      const result = await db.run(`
        INSERT INTO locations (name, type, sort_order, user_id) VALUES (?, ?, ?, ?)
      `, ['Box Seed Box', 'Box', 'custom', req.user.id]);
      await db.createCompartments(result.lastID, 2, 20);
      box = { id: result.lastID };
    }
    const boxRow1 = await db.get(`SELECT id FROM compartments WHERE location_id = ? AND idx = 1`, [box.id]);

    // Real card IDs spanning vintage (Base Set/Fossil/Jungle/Neo) and modern
    // (Scarlet & Violet) sets, so seeded data actually shows "old vs new" and
    // mixed rarities. Fetched live via tcgApi.getCardById (same path real
    // search/scan use) instead of hand-built image URLs, which previously had
    // a typo and 404'd for every seeded card.
    const MOCK_IDS = [
      'base1-58', // Pikachu - Base Set (vintage, Common)
      'base1-4',  // Charizard - Base Set (vintage, Rare Holo)
      'base1-2',  // Blastoise - Base Set (vintage, Rare Holo)
      'fossil-20', // Gengar - Fossil (vintage, Rare)
      'jungle-51', // Eevee - Jungle (vintage, Common)
      'neo1-9',   // Lugia - Neo Genesis (vintage, Rare Holo)
      'sv1-13',   // Sprigatito - Scarlet & Violet (modern, Common)
      'sv1-36',   // Fuecoco - Scarlet & Violet (modern, Common)
      'sv1-52',   // Quaxly - Scarlet & Violet (modern, Common)
      'sv1-227',  // Miraidon ex - Scarlet & Violet (modern, Ultra Rare)
    ];

    const MOCK_POOL = [];
    for (const id of MOCK_IDS) {
      const card = await tcgApi.getCardById(id);
      if (card) MOCK_POOL.push(card);
    }
    if (MOCK_POOL.length === 0) {
      return res.status(502).json({ error: 'Could not fetch seed card data from the Pokémon TCG API. Try again shortly.' });
    }

    // Clear out any previously-seeded copies of these specific cards first, so
    // running this repeatedly re-seeds a small fixed set instead of piling up
    // more copies every time. Scoped to MOCK_IDS so it never touches cards a
    // real scan/search added.
    const mockIdPlaceholders = MOCK_IDS.map(() => '?').join(',');
    await db.run(
      `DELETE FROM collection WHERE user_id = ? AND card_id IN (${mockIdPlaceholders})`,
      [req.user.id, ...MOCK_IDS]
    );

    // Insert random collection entries distributed across binder & box
    const conditions = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played'];
    const languages = ['English', 'English', 'English', 'Japanese']; // ~25% Japanese so both display modes are visible

    // Only offer printings the card actually has a tracked price for (e.g. a
    // modern Common has no Holofoil print/price) — otherwise resolveCardPrice
    // silently falls back to price_trend and the seeded card's "Holofoil"
    // price ends up identical to its Normal price, which looks like a bug.
    const printsForCard = (card) => {
      const options = [];
      if (card.price_normal > 0) options.push('Normal');
      if (card.price_holofoil > 0) options.push('Holofoil');
      if (card.price_reverse_holofoil > 0) options.push('Reverse Holofoil');
      return options.length > 0 ? options : ['Normal'];
    };

    let addedCount = 0;

    // Kept deliberately small — enough to see every feature (binder + box +
    // an unsorted pile to try Assistant Mode's bulk sort on) without having
    // to page through a large fake collection.

    // Seed binder entries (page 1 only, ~half the 9 slots)
    for (let s = 1; s <= 9; s++) {
      if (Math.random() > 0.5) {
        const card = MOCK_POOL[Math.floor(Math.random() * MOCK_POOL.length)];
        const prints = printsForCard(card);
        const print = prints[Math.floor(Math.random() * prints.length)];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const language = languages[Math.floor(Math.random() * languages.length)];
        const qty = Math.floor(Math.random() * 2) + 1; // 1-2 copies
        const purchasePrice = parseFloat((Math.random() * 10).toFixed(2));
        const pos = (s - 1) * 1000;

        await db.run(`
          INSERT INTO collection (card_id, quantity, condition, printing, language, purchase_price, location_id, compartment_id, position, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [card.id, qty, condition, print, language, purchasePrice, binder.id, binderPage1.id, pos, req.user.id]);
        addedCount += qty;
      }
    }

    // Seed box entries (row 1 only, ~40% of 10 slots)
    for (let s = 1; s <= 10; s++) {
      if (Math.random() > 0.6) {
        const card = MOCK_POOL[Math.floor(Math.random() * MOCK_POOL.length)];
        const prints = printsForCard(card);
        const print = prints[Math.floor(Math.random() * prints.length)];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const language = languages[Math.floor(Math.random() * languages.length)];
        const qty = Math.floor(Math.random() * 2) + 1; // 1-2 copies
        const purchasePrice = parseFloat((Math.random() * 5).toFixed(2));
        const pos = (s - 1) * 1000;

        await db.run(`
          INSERT INTO collection (card_id, quantity, condition, printing, language, purchase_price, location_id, compartment_id, position, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [card.id, qty, condition, print, language, purchasePrice, box.id, boxRow1.id, pos, req.user.id]);
        addedCount += qty;
      }
    }

    // A handful of genuinely unsorted cards (no location_id) so there's
    // something real to try Assistant Mode / bulk sort on right away.
    let unsortedAdded = 0;
    for (let i = 0; i < 6; i++) {
      if (Math.random() > 0.3) {
        const card = MOCK_POOL[Math.floor(Math.random() * MOCK_POOL.length)];
        const prints = printsForCard(card);
        const print = prints[Math.floor(Math.random() * prints.length)];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const language = languages[Math.floor(Math.random() * languages.length)];
        const qty = 1;
        const purchasePrice = parseFloat((Math.random() * 5).toFixed(2));

        await db.run(`
          INSERT INTO collection (card_id, quantity, condition, printing, language, purchase_price, location_id, compartment_id, position, user_id)
          VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?)
        `, [card.id, qty, condition, print, language, purchasePrice, req.user.id]);
        addedCount += qty;
        unsortedAdded++;
      }
    }

    res.json({ message: `Successfully seeded a small test collection: ${addedCount} cards for admin user (${unsortedAdded} left unsorted to try Assistant Mode on).` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to seed test cards' });
  }
});

module.exports = router;
