
const db = require('./src/db');
(async () => {
  try {
    const card_id = 'base1-1';
    const cacheCard = await db.get('SELECT price_trend FROM card_cache WHERE id = ?', [card_id]);
    console.log('Cache card:', cacheCard);
    if (cacheCard && cacheCard.price_trend > 0) {
      await db.run('INSERT OR IGNORE INTO price_history (card_id, price) VALUES (?, ?)', [card_id, cacheCard.price_trend]);
      console.log('Inserted price_history');
    }
  } catch (e) {
    console.error('Simulated error:', e);
  }
})();

