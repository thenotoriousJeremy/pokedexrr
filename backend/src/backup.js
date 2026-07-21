const fs = require('fs');
const path = require('path');
const db = require('./db');

// VACUUM INTO writes a consistent snapshot of the live DB (incl. WAL) to a new
// file with no locking issues, even while the server is serving requests.

const BACKUP_DIR = path.join(path.dirname(db.dbPath), 'backups');
const KEEP_LAST = parseInt(process.env.BACKUP_KEEP_LAST, 10) || 10;

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.bak'))
    .map(f => {
      const st = fs.statSync(path.join(BACKUP_DIR, f));
      return { file: f, size: st.size, created_at: st.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Create a snapshot, prune to the newest KEEP_LAST. Returns the new file's meta.
async function createBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `pokemon_cards.${stamp}.bak`);
  await db.run(`VACUUM INTO ?`, [dest]);

  for (const b of listBackups().slice(KEEP_LAST)) {
    fs.unlinkSync(path.join(BACKUP_DIR, b.file));
  }

  const st = fs.statSync(dest);
  return { file: path.basename(dest), size: st.size, created_at: st.mtime.toISOString() };
}

// Start a periodic auto-backup. Interval from BACKUP_INTERVAL_HOURS (default 24);
// set to 0 to disable. Returns the timer, or null when disabled.
function startAutoBackup() {
  const hours = process.env.BACKUP_INTERVAL_HOURS === undefined
    ? 24
    : parseFloat(process.env.BACKUP_INTERVAL_HOURS);
  if (!hours || hours <= 0) {
    console.log('Auto-backup disabled (BACKUP_INTERVAL_HOURS=0).');
    return null;
  }
  console.log(`Auto-backup enabled: every ${hours}h, keeping newest ${KEEP_LAST}.`);
  return setInterval(async () => {
    try {
      const b = await createBackup();
      console.log(`Auto-backup created: ${b.file} (${b.size} bytes).`);
    } catch (err) {
      console.error('Auto-backup failed:', err);
    }
  }, hours * 60 * 60 * 1000);
}

module.exports = { BACKUP_DIR, listBackups, createBackup, startAutoBackup };
