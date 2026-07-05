const rateLimit = require('express-rate-limit');
const db = require('../db');

async function authenticateToken(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const session = await db.get(`
      SELECT s.user_id, u.username, u.role, u.share_token, u.share_enabled, u.tcg_api_key
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > DATETIME('now')
    `, [token]);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    req.user = {
      id: session.user_id,
      username: session.username,
      role: session.role,
      share_token: session.share_token,
      share_enabled: session.share_enabled,
      tcg_api_key: session.tcg_api_key || ''
    };
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Restrict to admin role only. Must run after authenticateToken.
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
}

// Throttle auth endpoints to slow down credential-stuffing/brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

module.exports = { authenticateToken, requireAdmin, authLimiter };
