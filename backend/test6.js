
const db = require('./src/db');
(async () => {
  try {
    const table = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='collection'");
    console.log('collection:', table);
  } catch (e) {
    console.error('Error:', e);
  }
})();

