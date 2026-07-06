
const db = require('./src/db');
(async () => {
  try {
    const card = await db.get('SELECT id FROM card_cache LIMIT 1');
    console.log('Using card:', card.id);
    const result = await db.run(
        'INSERT INTO collection (card_id, quantity, condition, printing, language, purchase_price, location_id, compartment_id, user_id, list_type, is_trade, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ card.id, 1, 'Near Mint', 'Normal', 'English', 0, null, null, 1, 'collection', 0, 0 ]
    );
    console.log('Insert success:', result);
    await db.run('DELETE FROM collection WHERE id = ?', [result.lastID]);
  } catch (e) {
    console.error('Simulated error:', e);
  }
})();

