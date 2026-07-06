
const db = require('./src/db');
(async () => {
  try {
    const existing = await db.get(
        'SELECT id, quantity FROM collection WHERE card_id = ? AND condition = ? AND printing = ? AND language = ? AND location_id IS ? AND compartment_id IS ? AND user_id = ? AND list_type = ? AND is_trade = ?',
        [ 'test-card-123', 'Near Mint', 'Normal', 'English', null, null, 1, 'collection', 0 ]
    );
    console.log('Query existing success:', existing);
    const result = await db.run(
        'INSERT INTO collection (card_id, quantity, condition, printing, language, purchase_price, location_id, compartment_id, user_id, list_type, is_trade, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ 'test-card-123', 1, 'Near Mint', 'Normal', 'English', 0, null, null, 1, 'collection', 0, 0 ]
    );
    console.log('Insert success:', result);
    await db.run('DELETE FROM collection WHERE card_id = ?', ['test-card-123']);
  } catch (e) {
    console.error('Simulated error:', e);
  }
})();

