# Analysis Report — Global Rebranding (Pokedexrr to CardDexrr)

This report details the investigation of the codebase to identify all case-insensitive references to "Pokedexrr" and lists the precise changes and substitutions required for the rebranding to "CardDexrr".

---

## 1. Frontend Modifications

The following table lists all files under the `frontend/` directory requiring changes, including the exact line numbers and replacement targets:

| File Path | Line No. | Original Code | Proposed Code | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/index.html` | 7 | `<title>Pokedexrr - Pokémon Card Collection Organizer</title>` | `<title>CardDexrr - Pokémon Card Collection Organizer</title>` | Page title rebranding |
| `frontend/package.json` | 2 | `"name": "pokedexrr-frontend",` | `"name": "carddexrr-frontend",` | Package name update |
| `frontend/package-lock.json` | 2 | `"name": "pokedexrr-frontend",` | `"name": "carddexrr-frontend",` | Lockfile package name update |
| `frontend/package-lock.json` | 8 | `"name": "pokedexrr-frontend",` | `"name": "carddexrr-frontend",` | Lockfile dependency name update |
| `frontend/src/App.jsx` | 58 | `const token = localStorage.getItem('pokedexrr_token');` | `const token = localStorage.getItem('carddexrr_token');` | Storage token key rebranding |
| `frontend/src/App.jsx` | 69 | `window.dispatchEvent(new Event('pokedexrr_logout'));` | `window.dispatchEvent(new Event('carddexrr_logout'));` | Custom event rebranding |
| `frontend/src/App.jsx` | 76 | `const [token, setToken] = useState(localStorage.getItem('pokedexrr_token'));` | `const [token, setToken] = useState(localStorage.getItem('carddexrr_token'));` | Storage token key rebranding |
| `frontend/src/App.jsx` | 79 | `const u = localStorage.getItem('pokedexrr_user');` | `const u = localStorage.getItem('carddexrr_user');` | User profile key rebranding |
| `frontend/src/App.jsx` | 117 | `localStorage.removeItem('pokedexrr_token');` | `localStorage.removeItem('carddexrr_token');` | Storage token key cleanup |
| `frontend/src/App.jsx` | 118 | `localStorage.removeItem('pokedexrr_user');` | `localStorage.removeItem('carddexrr_user');` | User profile key cleanup |
| `frontend/src/App.jsx` | 121 | `window.addEventListener('pokedexrr_logout', handleAutoLogout);` | `window.addEventListener('carddexrr_logout', handleAutoLogout);` | Custom event listener rebranding |
| `frontend/src/App.jsx` | 122 | `return () => window.removeEventListener('pokedexrr_logout', handleAutoLogout);` | `return () => window.removeEventListener('carddexrr_logout', handleAutoLogout);` | Custom event cleanup |
| `frontend/src/App.jsx` | 128 | `localStorage.setItem('pokedexrr_token', newToken);` | `localStorage.setItem('carddexrr_token', newToken);` | Storage token key persistence |
| `frontend/src/App.jsx` | 129 | `localStorage.setItem('pokedexrr_user', JSON.stringify(newUser));` | `localStorage.setItem('carddexrr_user', JSON.stringify(newUser));` | User profile key persistence |
| `frontend/src/App.jsx` | 140 | `localStorage.removeItem('pokedexrr_token');` | `localStorage.removeItem('carddexrr_token');` | Storage token key logout cleanup |
| `frontend/src/App.jsx` | 141 | `localStorage.removeItem('pokedexrr_user');` | `localStorage.removeItem('carddexrr_user');` | User profile key logout cleanup |
| `frontend/src/App.jsx` | 147 | `localStorage.setItem('pokedexrr_user', JSON.stringify(updatedUser));` | `localStorage.setItem('carddexrr_user', JSON.stringify(updatedUser));` | User profile key update |
| `frontend/src/components/Dashboard.jsx` | 101 | `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to Pokedexrr!</h2>` | `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to CardDexrr!</h2>` | Dashboard header text |
| `frontend/src/components/Login.jsx` | 117 | `Pokedex<span style={{ color: 'var(--accent-red)' }}>rr</span>` | `CardDex<span style={{ color: 'var(--accent-red)' }}>rr</span>` | Login page logo/header text |
| `frontend/src/components/Settings.jsx` | 132 | `a.download = \`pokedexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;` | `a.download = \`carddexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;` | Exported file name pattern |
| `frontend/src/components/SharedCollection.jsx` | 96 | `Go to Pokedexrr` | `Go to CardDexrr` | Public shared page link back to application |

---

## 2. Backend Modifications

The following table lists all files under the `backend/` directory requiring changes, including the exact line numbers and replacement targets:

| File Path | Line No. | Original Code | Proposed Code | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `backend/package.json` | 2 | `"name": "pokedexrr-backend",` | `"name": "carddexrr-backend",` | Package name update |
| `backend/package.json` | 4 | `"description": "Backend API for Pokedexrr",` | `"description": "Backend API for CardDexrr",` | Package description update |
| `backend/package-lock.json` | 2 | `"name": "pokedexrr-backend",` | `"name": "carddexrr-backend",` | Lockfile package name update |
| `backend/package-lock.json` | 8 | `"name": "pokedexrr-backend",` | `"name": "carddexrr-backend",` | Lockfile dependency name update |
| `backend/src/routes/collection.js` | 1465 | `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.json');` | `res.setHeader('Content-Disposition', 'attachment; filename=carddexrr_collection.json');` | Export JSON filename |
| `backend/src/routes/collection.js` | 1471 | `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.csv');` | `res.setHeader('Content-Disposition', 'attachment; filename=carddexrr_collection.csv');` | Export CSV filename |
| `backend/src/server.js` | 186 | `console.log(\`Pokedexrr Server running on port \${PORT}\`);` | `console.log(\`CardDexrr Server running on port \${PORT}\`);` | Server startup message |
| `backend/test/auth.test.js` | 9 | `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-auth-test-\${process.pid}.db\`);` | `const tmpDb = path.join(os.tmpdir(), \`carddexrr-auth-test-\${process.pid}.db\`);` | Temporary auth test DB naming |
| `backend/test/sort.test.js` | 12 | `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-test-\${process.pid}.db\`);` | `const tmpDb = path.join(os.tmpdir(), \`carddexrr-test-\${process.pid}.db\`);` | Temporary test DB naming |

---

## 3. Configuration and Documentation Modifications

The following table lists all root configuration and documentation files requiring changes:

| File Path | Line No. | Original Code | Proposed Code | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `package.json` | 2 | `"name": "pokedexrr-monorepo",` | `"name": "carddexrr-monorepo",` | Monorepo name update |
| `package.json` | 4 | `"description": "Monorepo for Pokedexrr Pokémon Card Collection Manager",` | `"description": "Monorepo for CardDexrr Pokémon Card Collection Manager",` | Monorepo description update |
| `package-lock.json` | 2 | `"name": "pokedexrr-monorepo",` | `"name": "carddexrr-monorepo",` | Lockfile monorepo name update |
| `package-lock.json` | 8 | `"name": "pokedexrr-monorepo",` | `"name": "carddexrr-monorepo",` | Lockfile monorepo dependency name |
| `docker-compose.yml` | 4 | `pokedexrr:` | `carddexrr:` | Compose service name |
| `docker-compose.yml` | 8 | `container_name: pokedexrr` | `container_name: carddexrr` | Container name |
| `docker-compose.yml` | 22 | `- pokedexrr-data:/app/database` | `- carddexrr-data:/app/database` | Volume mount source name |
| `docker-compose.yml` | 25 | `pokedexrr-data:` | `carddexrr-data:` | Volume definition name |
| `.env.example` | 1 | `# Pokedexrr Environment Configuration Example` | `# CardDexrr Environment Configuration Example` | Configuration header comment |
| `README.md` | 1 | `# Pokedexrr 🎴` | `# CardDexrr 🎴` | Main README header |
| `README.md` | 3 | `Pokedexrr is a self-hostable...` | `CardDexrr is a self-hostable...` | App description |
| `README.md` | 71 | `...first startup, Pokedexrr creates...` | `...first startup, CardDexrr creates...` | Instructions documentation |
| `README.md` | 95 | `Pokedexrr is packaged as...` | `CardDexrr is packaged as...` | Docker documentation |
| `README.md` | 103 | `...pokedexrr-data Docker volume.` | `...carddexrr-data Docker volume.` | Docker compose setup docs |
| `README.md` | 106 | `You can configure Pokedexrr by...` | `You can configure CardDexrr by...` | Configuration instructions |
| `README.md` | 109 | `...While Pokedexrr works without one...` | `...While CardDexrr works without one...` | API keys instructions |
| `README.md` | 122 | `...the pokedexrr-data volume in Docker...` | `...the carddexrr-data volume in Docker...` | Backup instructions |
| `README.md` | 123 | `...-v pokedexrr-data:/data...` | `...-v carddexrr-data:/data...` | Backup command snippet |
| `README.md` | 135 | `/pokedexrr` | `/carddexrr` | Project directory diagram |
| `PROJECT.md` | 25 | `Rebrand "Pokedexrr" to "CardDexrr" globally...` | `Rebrand "CardDexrr" globally...` | Project milestone name (optional) |

---

## 4. Verification Check

To confirm complete removal of the "pokedexrr" pattern (case-insensitive) once implementation completes, execute the following ripgrep command from the project root:

```powershell
rg -i "pokedexrr" --glob "!**/.agents/**" --glob "!**/node_modules/**" --glob "!**/.git/**"
```

This query should return zero results.
