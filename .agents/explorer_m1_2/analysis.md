# Global Rebranding Analysis: Pokedexrr to CardDexrr

This analysis identifies all files that require modification for the global rebranding of "Pokedexrr" to "CardDexrr" (and similar cases like `pokedexrr`, `POKEDEXRR`, etc.).

---

## Summary of Rebranding Replacements
- **Title/Display Case**: `Pokedexrr` ➔ `CardDexrr`
- **Lowercase Name**: `pokedexrr` ➔ `carddexrr`
- **Title / Special Display**: `Pokedexrr` ➔ `CardDexrr`
- **Login Component Styling**: `Pokedex` with red `rr` ➔ `CardDex` with red `rr`

---

## 1. Frontend Files

### `frontend/index.html`
* **Current Line 7**: `<title>Pokedexrr - Pokémon Card Collection Organizer</title>`
* **Proposed Line 7**: `<title>CardDexrr - Card Collection Organizer</title>`

### `frontend/src/App.jsx`
* **Current Line 58**: `const token = localStorage.getItem('pokedexrr_token');`
  **Proposed Line 58**: `const token = localStorage.getItem('carddexrr_token');`
* **Current Line 69**: `window.dispatchEvent(new Event('pokedexrr_logout'));`
  **Proposed Line 69**: `window.dispatchEvent(new Event('carddexrr_logout'));`
* **Current Line 76**: `const [token, setToken] = useState(localStorage.getItem('pokedexrr_token'));`
  **Proposed Line 76**: `const [token, setToken] = useState(localStorage.getItem('carddexrr_token'));`
* **Current Line 79**: `const u = localStorage.getItem('pokedexrr_user');`
  **Proposed Line 79**: `const u = localStorage.getItem('carddexrr_user');`
* **Current Line 117**: `localStorage.removeItem('pokedexrr_token');`
  **Proposed Line 117**: `localStorage.removeItem('carddexrr_token');`
* **Current Line 118**: `localStorage.removeItem('pokedexrr_user');`
  **Proposed Line 118**: `localStorage.removeItem('carddexrr_user');`
* **Current Line 121**: `window.addEventListener('pokedexrr_logout', handleAutoLogout);`
  **Proposed Line 121**: `window.addEventListener('carddexrr_logout', handleAutoLogout);`
* **Current Line 122**: `return () => window.removeEventListener('pokedexrr_logout', handleAutoLogout);`
  **Proposed Line 122**: `return () => window.removeEventListener('carddexrr_logout', handleAutoLogout);`
* **Current Line 128**: `localStorage.setItem('pokedexrr_token', newToken);`
  **Proposed Line 128**: `localStorage.setItem('carddexrr_token', newToken);`
* **Current Line 129**: `localStorage.setItem('pokedexrr_user', JSON.stringify(newUser));`
  **Proposed Line 129**: `localStorage.setItem('carddexrr_user', JSON.stringify(newUser));`
* **Current Line 140**: `localStorage.removeItem('pokedexrr_token');`
  **Proposed Line 140**: `localStorage.removeItem('carddexrr_token');`
* **Current Line 141**: `localStorage.removeItem('pokedexrr_user');`
  **Proposed Line 141**: `localStorage.removeItem('carddexrr_user');`
* **Current Line 147**: `localStorage.setItem('pokedexrr_user', JSON.stringify(updatedUser));`
  **Proposed Line 147**: `localStorage.setItem('carddexrr_user', JSON.stringify(updatedUser));`

### `frontend/src/components/Dashboard.jsx`
* **Current Line 101**: `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to Pokedexrr!</h2>`
* **Proposed Line 101**: `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to CardDexrr!</h2>`

### `frontend/src/components/Login.jsx`
* **Current Line 117**: `Pokedex<span style={{ color: 'var(--accent-red)' }}>rr</span>`
* **Proposed Line 117**: `CardDex<span style={{ color: 'var(--accent-red)' }}>rr</span>`

### `frontend/src/components/Settings.jsx`
* **Current Line 132**: `a.download = \`pokedexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;`
* **Proposed Line 132**: `a.download = \`carddexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;`

### `frontend/src/components/SharedCollection.jsx`
* **Current Line 96**: `Go to Pokedexrr`
* **Proposed Line 96**: `Go to CardDexrr`

---

## 2. Backend Files

### `backend/src/routes/collection.js`
* **Current Line 1465**: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.json');`
  **Proposed Line 1465**: `res.setHeader('Content-Disposition', 'attachment; filename=carddexrr_collection.json');`
* **Current Line 1471**: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.csv');`
  **Proposed Line 1471**: `res.setHeader('Content-Disposition', 'attachment; filename=carddexrr_collection.csv');`

### `backend/src/server.js`
* **Current Line 186**: `console.log(\`Pokedexrr Server running on port \${PORT}\`);`
* **Proposed Line 186**: `console.log(\`CardDexrr Server running on port \${PORT}\`);`

### `backend/test/auth.test.js`
* **Current Line 9**: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-auth-test-\${process.pid}.db\`);`
* **Proposed Line 9**: `const tmpDb = path.join(os.tmpdir(), \`carddexrr-auth-test-\${process.pid}.db\`);`

### `backend/test/sort.test.js`
* **Current Line 12**: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-test-\${process.pid}.db\`);`
* **Proposed Line 12**: `const tmpDb = path.join(os.tmpdir(), \`carddexrr-test-\${process.pid}.db\`);`

---

## 3. Configuration & Documentation Files

### `package.json` (Root)
* **Current Line 2**: `"name": "pokedexrr-monorepo",`
  **Proposed Line 2**: `"name": "carddexrr-monorepo",`
* **Current Line 4**: `"description": "Monorepo for Pokedexrr Pokémon Card Collection Manager",`
  **Proposed Line 4**: `"description": "Monorepo for CardDexrr Card Collection Manager",`

### `package-lock.json` (Root)
* **Current Line 2**: `"name": "pokedexrr-monorepo",`
  **Proposed Line 2**: `"name": "carddexrr-monorepo",`
* **Current Line 8**: `"name": "pokedexrr-monorepo",`
  **Proposed Line 8**: `"name": "carddexrr-monorepo",`

### `frontend/package.json`
* **Current Line 2**: `"name": "pokedexrr-frontend",`
* **Proposed Line 2**: `"name": "carddexrr-frontend",`

### `frontend/package-lock.json`
* **Current Line 2**: `"name": "pokedexrr-frontend",`
  **Proposed Line 2**: `"name": "carddexrr-frontend",`
* **Current Line 8**: `"name": "pokedexrr-frontend",`
  **Proposed Line 8**: `"name": "carddexrr-frontend",`

### `backend/package.json`
* **Current Line 2**: `"name": "pokedexrr-backend",`
  **Proposed Line 2**: `"name": "carddexrr-backend",`
* **Current Line 4**: `"description": "Backend API for Pokedexrr",`
  **Proposed Line 4**: `"description": "Backend API for CardDexrr",`

### `backend/package-lock.json`
* **Current Line 2**: `"name": "pokedexrr-backend",`
  **Proposed Line 2**: `"name": "carddexrr-backend",`
* **Current Line 8**: `"name": "pokedexrr-backend",`
  **Proposed Line 8**: `"name": "carddexrr-backend",`

### `docker-compose.yml`
* **Current Line 4**: `pokedexrr:`
  **Proposed Line 4**: `carddexrr:`
* **Current Line 8**: `container_name: pokedexrr`
  **Proposed Line 8**: `container_name: carddexrr`
* **Current Line 22**: `- pokedexrr-data:/app/database`
  **Proposed Line 22**: `- carddexrr-data:/app/database`
* **Current Line 25**: `pokedexrr-data:`
  **Proposed Line 25**: `carddexrr-data:`

### `.env.example`
* **Current Line 1**: `# Pokedexrr Environment Configuration Example`
* **Proposed Line 1**: `# CardDexrr Environment Configuration Example`

### `README.md`
* **Current Line 1**: `# Pokedexrr 🎴`
  **Proposed Line 1**: `# CardDexrr 🎴`
* **Current Line 3**: `Pokedexrr is a self-hostable, mobile-friendly full-stack web application designed for Pokémon card collectors...`
  **Proposed Line 3**: `CardDexrr is a self-hostable, mobile-friendly full-stack web application designed for trading card collectors...`
* **Current Line 71**: `On its **first startup**, Pokedexrr creates...`
  **Proposed Line 71**: `On its **first startup**, CardDexrr creates...`
* **Current Line 95**: `Pokedexrr is packaged as a...`
  **Proposed Line 95**: `CardDexrr is packaged as a...`
* **Current Line 103**: `...persisted in the \`pokedexrr-data\` Docker volume.`
  **Proposed Line 103**: `...persisted in the \`carddexrr-data\` Docker volume.`
* **Current Line 106**: `You can configure Pokedexrr by...`
  **Proposed Line 106**: `You can configure CardDexrr by...`
* **Current Line 109**: `...While Pokedexrr works without one...`
  **Proposed Line 109**: `...While CardDexrr works without one...`
* **Current Line 122**: `...the \`pokedexrr-data\` volume in Docker...`
  **Proposed Line 122**: `...the \`carddexrr-data\` volume in Docker...`
* **Current Line 123**: `...-v pokedexrr-data:/data...`
  **Proposed Line 123**: `...-v carddexrr-data:/data...`
* **Current Line 135**: `/pokedexrr`
  **Proposed Line 135**: `/carddexrr`

### `PROJECT.md`
* **Current Line 25**: `| 1 | Global Rebranding | Rebrand "Pokedexrr" to "CardDexrr" globally in package files, README.md, Docker, frontend components. | None | PLANNED |`
* **Proposed Line 25**: `| 1 | Global Rebranding | Rebrand "Pokedexrr" to "CardDexrr" globally in package files, README.md, Docker, frontend components. | None | COMPLETED |` *(Update status when rebranding is complete)*
