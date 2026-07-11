# Rebranding Analysis Report: Pokedexrr to CardDexrr

## Summary of Core Findings
Globally rebranding the application from "Pokedexrr" to "CardDexrr" requires modifying 13 distinct source, configuration, and documentation files (excluding lockfiles and agent metadata). The rebranding involves updating application names in package manifests, HTML metadata, user interface components (including a split-tag branding title in the login view), Docker orchestration configs, environment examples, and test database templates.

---

## 📂 Target Files and Required Changes

### 1. Root Configuration & Documentation

#### `package.json`
- **Location**: `/package.json`
- **Line 2**:
  - **Before**: `"name": "pokedexrr-monorepo",`
  - **After**: `"name": "carddexrr-monorepo",`
- **Line 4**:
  - **Before**: `"description": "Monorepo for Pokedexrr Pokémon Card Collection Manager",`
  - **After**: `"description": "Monorepo for CardDexrr Card Collection Manager",`

#### `docker-compose.yml`
- **Location**: `/docker-compose.yml`
- **Line 4**:
  - **Before**: `  pokedexrr:`
  - **After**: `  carddexrr:`
- **Line 8**:
  - **Before**: `    container_name: pokedexrr`
  - **After**: `    container_name: carddexrr`
- **Line 22**:
  - **Before**: `      - pokedexrr-data:/app/database`
  - **After**: `      - carddexrr-data:/app/database`
- **Line 25**:
  - **Before**: `  pokedexrr-data:`
  - **After**: `  carddexrr-data:`

#### `.env.example`
- **Location**: `/.env.example`
- **Line 1**:
  - **Before**: `# Pokedexrr Environment Configuration Example`
  - **After**: `# CardDexrr Environment Configuration Example`

#### `README.md`
- **Location**: `/README.md`
- **Line 1**:
  - **Before**: `# Pokedexrr 🎴`
  - **After**: `# CardDexrr 🎴`
- **Line 3**:
  - **Before**: `Pokedexrr is a self-hostable, mobile-friendly full-stack web application designed for Pokémon card collectors...`
  - **After**: `CardDexrr is a self-hostable, mobile-friendly full-stack web application designed for card collectors...`
- **Line 71**:
  - **Before**: `On its **first startup**, Pokedexrr creates...`
  - **After**: `On its **first startup**, CardDexrr creates...`
- **Line 95**:
  - **Before**: `Pokedexrr is packaged as...`
  - **After**: `CardDexrr is packaged as...`
- **Line 103**:
  - **Before**: `...persisted in the pokedexrr-data Docker volume.`
  - **After**: `...persisted in the carddexrr-data Docker volume.`
- **Line 106**:
  - **Before**: `You can configure Pokedexrr by...`
  - **After**: `You can configure CardDexrr by...`
- **Line 109**:
  - **Before**: `...While Pokedexrr works without one...`
  - **After**: `...While CardDexrr works without one...`
- **Line 122**:
  - **Before**: `...the pokedexrr-data volume in Docker...`
  - **After**: `...the carddexrr-data volume in Docker...`
- **Line 123**:
  - **Before**: `...docker run --rm -v pokedexrr-data:/data...`
  - **After**: `...docker run --rm -v carddexrr-data:/data...`
- **Line 135**:
  - **Before**: `/pokedexrr`
  - **After**: `/carddexrr`

---

### 2. Frontend Files

#### `frontend/package.json`
- **Location**: `/frontend/package.json`
- **Line 2**:
  - **Before**: `"name": "pokedexrr-frontend",`
  - **After**: `"name": "carddexrr-frontend",`

#### `frontend/index.html`
- **Location**: `/frontend/index.html`
- **Line 7**:
  - **Before**: `<title>Pokedexrr - Pokémon Card Collection Organizer</title>`
  - **After**: `<title>CardDexrr - Card Collection Organizer</title>`

#### `frontend/src/App.jsx`
*Note: This file contains the React state management and local storage keys.*
- **Line 58**:
  - **Before**: `const token = localStorage.getItem('pokedexrr_token');`
  - **After**: `const token = localStorage.getItem('carddexrr_token');`
- **Line 69**:
  - **Before**: `window.dispatchEvent(new Event('pokedexrr_logout'));`
  - **After**: `window.dispatchEvent(new Event('carddexrr_logout'));`
- **Line 76**:
  - **Before**: `const [token, setToken] = useState(localStorage.getItem('pokedexrr_token'));`
  - **After**: `const [token, setToken] = useState(localStorage.getItem('carddexrr_token'));`
- **Line 79**:
  - **Before**: `const u = localStorage.getItem('pokedexrr_user');`
  - **After**: `const u = localStorage.getItem('carddexrr_user');`
- **Line 117**:
  - **Before**: `localStorage.removeItem('pokedexrr_token');`
  - **After**: `localStorage.removeItem('carddexrr_token');`
- **Line 118**:
  - **Before**: `localStorage.removeItem('pokedexrr_user');`
  - **After**: `localStorage.removeItem('carddexrr_user');`
- **Line 121**:
  - **Before**: `window.addEventListener('pokedexrr_logout', handleAutoLogout);`
  - **After**: `window.addEventListener('carddexrr_logout', handleAutoLogout);`
- **Line 122**:
  - **Before**: `return () => window.removeEventListener('pokedexrr_logout', handleAutoLogout);`
  - **After**: `return () => window.removeEventListener('carddexrr_logout', handleAutoLogout);`
- **Line 128**:
  - **Before**: `localStorage.setItem('pokedexrr_token', newToken);`
  - **After**: `localStorage.setItem('carddexrr_token', newToken);`
- **Line 129**:
  - **Before**: `localStorage.setItem('pokedexrr_user', JSON.stringify(newUser));`
  - **After**: `localStorage.setItem('carddexrr_user', JSON.stringify(newUser));`
- **Line 140**:
  - **Before**: `localStorage.removeItem('pokedexrr_token');`
  - **After**: `localStorage.removeItem('carddexrr_user');`
  - **After**: `localStorage.removeItem('carddexrr_token');`
- **Line 141**:
  - **Before**: `localStorage.removeItem('pokedexrr_user');`
  - **After**: `localStorage.removeItem('carddexrr_user');`
- **Line 147**:
  - **Before**: `localStorage.setItem('pokedexrr_user', JSON.stringify(updatedUser));`
  - **After**: `localStorage.setItem('carddexrr_user', JSON.stringify(updatedUser));`

#### `frontend/src/components/Dashboard.jsx`
- **Location**: `/frontend/src/components/Dashboard.jsx`
- **Line 101**:
  - **Before**: `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to Pokedexrr!</h2>`
  - **After**: `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to CardDexrr!</h2>`

#### `frontend/src/components/Login.jsx`
*Note: This contains a split HTML branding title that was not caught by simple substring matches.*
- **Line 117**:
  - **Before**: `Pokedex<span style={{ color: 'var(--accent-red)' }}>rr</span>`
  - **After**: `CardDex<span style={{ color: 'var(--accent-red)' }}>rr</span>`

#### `frontend/src/components/Settings.jsx`
- **Location**: `/frontend/src/components/Settings.jsx`
- **Line 132**:
  - **Before**: `a.download = \`pokedexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;`
  - **After**: `a.download = \`carddexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;`

#### `frontend/src/components/SharedCollection.jsx`
- **Location**: `/frontend/src/components/SharedCollection.jsx`
- **Line 96**:
  - **Before**: `Go to Pokedexrr`
  - **After**: `Go to CardDexrr`

---

### 3. Backend Files

#### `backend/package.json`
- **Location**: `/backend/package.json`
- **Line 2**:
  - **Before**: `"name": "pokedexrr-backend",`
  - **After**: `"name": "carddexrr-backend",`
- **Line 4**:
  - **Before**: `"description": "Backend API for Pokedexrr",`
  - **After**: `"description": "Backend API for CardDexrr",`

#### `backend/src/routes/collection.js`
- **Location**: `/backend/src/routes/collection.js`
- **Line 1465**:
  - **Before**: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.json');`
  - **After**: `res.setHeader('Content-Disposition', 'attachment; filename=carddexrr_collection.json');`
- **Line 1471**:
  - **Before**: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.csv');`
  - **After**: `res.setHeader('Content-Disposition', 'attachment; filename=carddexrr_collection.csv');`

#### `backend/src/server.js`
- **Location**: `/backend/src/server.js`
- **Line 186**:
  - **Before**: `console.log(\`Pokedexrr Server running on port \${PORT}\`);`
  - **After**: `console.log(\`CardDexrr Server running on port \${PORT}\`);`

#### `backend/test/auth.test.js`
- **Location**: `/backend/test/auth.test.js`
- **Line 9**:
  - **Before**: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-auth-test-\${process.pid}.db\`);`
  - **After**: `const tmpDb = path.join(os.tmpdir(), \`carddexrr-auth-test-\${process.pid}.db\`);`

#### `backend/test/sort.test.js`
- **Location**: `/backend/test/sort.test.js`
- **Line 12**:
  - **Before**: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-test-\${process.pid}.db\`);`
  - **After**: `const tmpDb = path.join(os.tmpdir(), \`carddexrr-test-\${process.pid}.db\`);`

---

## 📦 Lockfiles (Automatic Updates Recommended)
The name values inside the lockfiles should also be updated to ensure clean installs:
1. `/package-lock.json` (Lines 2 and 8: rename `pokedexrr-monorepo` to `carddexrr-monorepo`)
2. `/frontend/package-lock.json` (Lines 2 and 8: rename `pokedexrr-frontend` to `carddexrr-frontend`)
3. `/backend/package-lock.json` (Lines 2 and 8: rename `pokedexrr-backend` to `carddexrr-backend`)
*Recommendation: When changing the manifests (`package.json`), running `npm install` in their respective directories will regenerate/update these lockfiles automatically.*

---

## 🔍 Design Recommendations (Optional)
- **Database Filename**: The default database filename in `/backend/src/db.js` (line 7) and `Dockerfile` (line 28) is `pokemon_cards.db`. Since CardDexrr supports Multi-Game Card collections (such as Magic: The Gathering), the database filename could optionally be rebranded to a neutral name (e.g., `cards.db` or `carddexrr.db`) in a future milestone.
