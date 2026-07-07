require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./db');
const tcgApi = require('./tcgApi');

const authRoutes = require('./routes/auth');
const sharedRoutes = require('./routes/shared');
const adminRoutes = require('./routes/admin');
const collectionRoutes = require('./routes/collection');
const setsRoutes = require('./routes/sets');
const decksRoutes = require('./routes/decks');

const app = express();
const PORT = process.env.PORT || 3001;

// CSP is left to be configured deliberately for this app's asset setup rather than
// enabling helmet's restrictive default, which can silently break asset loading.
app.use(helmet({ contentSecurityPolicy: false }));

// Restrict cross-origin access to known frontend origins. Explicit CORS_ORIGIN
// wins for production. Without it (dev / self-hosted), allow localhost plus
// private-LAN origins on any port: the Vite dev server runs with host:true +
// HTTPS so the mobile scanner can reach it over the LAN, which makes the
// browser send an Origin like https://192.168.1.20:5173 on writes (PUT/POST/
// DELETE) — GETs are same-origin and send none, which is why only writes were
// being rejected before.
const explicitOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Loopback + RFC1918 private ranges (10/8, 172.16-31/12, 192.168/16) and
// *.local, with any scheme/port. Not internet-routable, so this is safe for a
// self-hosted app while still blocking arbitrary public websites.
const PRIVATE_ORIGIN = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|\[::1\]|[a-z0-9-]+\.local)(:\d+)?$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / non-browser client
  if (explicitOrigins.length > 0) return explicitOrigins.includes(origin);
  return PRIVATE_ORIGIN.test(origin);
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
// Default 100kb body limit is too small for the collection import/export
// feature: a JSON backup wraps the export payload in a string field, which
// added escaping overhead pushed a ~90-card collection past the default
// limit already. 15mb comfortably covers even large (multi-thousand card)
// collections.
app.use(express.json({ limit: '15mb' }));

// Initialize Database on startup
db.initDb()
  .then(async () => {
    console.log('Database tables verified/created successfully.');
    // Sync sets on startup
    await tcgApi.fetchAndCacheSets();
    
    // Load sets into compartmentSort memory cache
    const { loadSetsCache } = require('./utils/compartmentSort');
    await loadSetsCache(db);
    
    // Schedule a weekly price update (every 7 days)
    setInterval(() => {
      tcgApi.updateCollectionPrices();
    }, 1000 * 60 * 60 * 24 * 7);

    // Run a price update in the background shortly after startup (after 30 seconds to not bog down init)
    setTimeout(() => {
      tcgApi.updateCollectionPrices();
    }, 30000);

    // Periodically purge expired sessions so the table doesn't grow unbounded
    setInterval(() => {
      db.run(`DELETE FROM sessions WHERE expires_at <= DATETIME('now')`).catch(err => {
        console.error('Failed to purge expired sessions:', err);
      });
    }, 1000 * 60 * 60 * 24);
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/shared', sharedRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', collectionRoutes);
app.use('/api/sets', setsRoutes);
app.use('/api/decks', decksRoutes);

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

// Generic error handler (e.g. rejected CORS origins) — never leak stack traces to clients
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Upload too large. Try exporting/importing in smaller batches.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`Pokedexrr Server running on port ${PORT}`);
  console.log(`Access local: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
