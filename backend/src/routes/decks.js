const express = require('express');
const db = require('../db');
const tcgApi = require('../tcgApi');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Get User Decks
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        d.id,
        d.name,
        d.description,
        d.created_at,
        d.checked_out,
        d.checked_out_at,
        COUNT(dc.card_id) as total_card_types,
        COALESCE(SUM(dc.quantity), 0) as total_cards
      FROM decks d
      LEFT JOIN deck_cards dc ON d.id = dc.deck_id
      WHERE d.user_id = ?
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;
    const rows = await db.all(query, [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve decks' });
  }
});

// Create Deck
router.post('/', async (req, res) => {
  const { name, description = '' } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Deck name is required' });
  }

  try {
    const result = await db.run(
      `INSERT INTO decks (name, description, user_id) VALUES (?, ?, ?)`,
      [name, description, req.user.id]
    );
    res.status(201).json({ message: 'Deck created successfully', id: result.lastID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// Get Deck Details (with Cards)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deck = await db.get(`SELECT * FROM decks WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const cardsQuery = `
      SELECT
        dc.quantity,
        cc.id,
        cc.name,
        cc.supertype,
        cc.subtypes,
        cc.types,
        cc.rarity,
        cc.set_id,
        cc.set_name,
        cc.number,
        cc.image_url,
        cc.price_trend
      FROM deck_cards dc
      JOIN card_cache cc ON dc.card_id = cc.id
      WHERE dc.deck_id = ?
    `;
    const cards = await db.all(cardsQuery, [id]);

    const formatted = cards.map(c => ({
      ...c,
      subtypes: JSON.parse(c.subtypes || '[]'),
      types: JSON.parse(c.types || '[]')
    }));

    res.json({
      ...deck,
      cards: formatted
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve deck details' });
  }
});

// Update Deck Metadata
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Deck name is required' });
  }

  try {
    const result = await db.run(
      `UPDATE decks SET name = ?, description = ? WHERE id = ? AND user_id = ?`,
      [name, description || '', id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deck not found or unauthorized' });
    }

    res.json({ message: 'Deck updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// Delete Deck
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Verify ownership
    const deck = await db.get(`SELECT id FROM decks WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found or unauthorized' });
    }

    // Manual cascade deletion
    await db.run(`DELETE FROM deck_cards WHERE deck_id = ?`, [id]);
    await db.run(`DELETE FROM decks WHERE id = ?`, [id]);

    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// Add/Update Card in Deck
router.post('/:id/cards', async (req, res) => {
  const { id } = req.params;
  const { card_id, quantity = 1 } = req.body;

  if (!card_id) {
    return res.status(400).json({ error: 'card_id is required' });
  }

  try {
    // Verify deck ownership
    const deck = await db.get(`SELECT id FROM decks WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found or unauthorized' });
    }

    // Ensure card metadata exists in cache
    let card = await db.get(`SELECT id FROM card_cache WHERE id = ?`, [card_id]);
    if (!card) {
      console.log(`Card ${card_id} not in cache. Fetching...`);
      const apiCard = await tcgApi.getCardById(card_id, req.user.tcg_api_key);
      if (!apiCard) {
        return res.status(404).json({ error: 'Card not found on Pokémon TCG API.' });
      }
    }

    // Insert or update quantities
    await db.run(`
      INSERT INTO deck_cards (deck_id, card_id, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(deck_id, card_id) DO UPDATE SET quantity = ?
    `, [id, card_id, parseInt(quantity, 10), parseInt(quantity, 10)]);

    // Record initial price history trend if card is added
    const cacheCard = await db.get(`SELECT price_trend FROM card_cache WHERE id = ?`, [card_id]);
    if (cacheCard && cacheCard.price_trend > 0) {
      await db.run(`INSERT OR IGNORE INTO price_history (card_id, price) VALUES (?, ?)`, [card_id, cacheCard.price_trend]);
    }

    res.json({ message: 'Card added/updated in deck successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add card to deck' });
  }
});

// Remove Card from Deck
router.delete('/:id/cards/:card_id', async (req, res) => {
  const { id, card_id } = req.params;
  try {
    // Verify deck ownership
    const deck = await db.get(`SELECT id FROM decks WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found or unauthorized' });
    }

    await db.run(`DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ?`, [id, card_id]);
    res.json({ message: 'Card removed from deck successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove card from deck' });
  }
});

// Checkout Deck (mark as in play)
router.put('/:id/checkout', async (req, res) => {
  const { id } = req.params;
  try {
    const deck = await db.get(`SELECT id FROM decks WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found or unauthorized' });
    }
    await db.run(
      `UPDATE decks SET checked_out = 1, checked_out_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    res.json({ message: 'Deck checked out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to checkout deck' });
  }
});

// Return Deck (mark as returned to storage)
router.put('/:id/return', async (req, res) => {
  const { id } = req.params;
  try {
    const deck = await db.get(`SELECT id FROM decks WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found or unauthorized' });
    }
    await db.run(
      `UPDATE decks SET checked_out = 0, checked_out_at = NULL WHERE id = ?`,
      [id]
    );
    res.json({ message: 'Deck returned to storage successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to return deck' });
  }
});

module.exports = router;
