
const db = require('./src/db');
(async () => {
  try {
    const session = await db.get("SELECT token FROM sessions WHERE expires_at > DATETIME('now') LIMIT 1");
    console.log('Token:', session ? session.token : 'None');
  } catch (e) {
    console.error('Error:', e);
  }
})();

