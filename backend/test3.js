
const db = require('./src/db');
(async () => {
  try {
    const table = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='price_history'");
    console.log('price_history:', table);
  } catch (e) {
    console.error('Error:', e);
  }
})();

