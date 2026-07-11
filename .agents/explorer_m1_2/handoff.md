# Handoff Report - Global Rebranding (Pokedexrr to CardDexrr)

## 1. Observation
We searched for case-insensitive occurrences of the term "pokedexrr" (and similar variants) across the workspace using the `grep_search` tool:
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\package.json`
  - Line 2: `"name": "pokedexrr-monorepo",`
  - Line 4: `"description": "Monorepo for Pokedexrr Pokémon Card Collection Manager",`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\package-lock.json`
  - Line 2: `"name": "pokedexrr-monorepo",`
  - Line 8: `"name": "pokedexrr-monorepo",`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\package.json`
  - Line 2: `"name": "pokedexrr-frontend",`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\package-lock.json`
  - Line 2: `"name": "pokedexrr-frontend",`
  - Line 8: `"name": "pokedexrr-frontend",`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\index.html`
  - Line 7: `<title>Pokedexrr - Pokémon Card Collection Organizer</title>`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\src\App.jsx`
  - Line 58: `const token = localStorage.getItem('pokedexrr_token');`
  - Line 69: `window.dispatchEvent(new Event('pokedexrr_logout'));`
  - Line 76: `const [token, setToken] = useState(localStorage.getItem('pokedexrr_token'));`
  - Line 79: `const u = localStorage.getItem('pokedexrr_user');`
  - Line 117: `localStorage.removeItem('pokedexrr_token');`
  - Line 118: `localStorage.removeItem('pokedexrr_user');`
  - Line 121: `window.addEventListener('pokedexrr_logout', handleAutoLogout);`
  - Line 122: `return () => window.removeEventListener('pokedexrr_logout', handleAutoLogout);`
  - Line 128: `localStorage.setItem('pokedexrr_token', newToken);`
  - Line 129: `localStorage.setItem('pokedexrr_user', JSON.stringify(newUser));`
  - Line 140: `localStorage.removeItem('pokedexrr_token');`
  - Line 141: `localStorage.removeItem('pokedexrr_user');`
  - Line 147: `localStorage.setItem('pokedexrr_user', JSON.stringify(updatedUser));`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\src\components\Dashboard.jsx`
  - Line 101: `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to Pokedexrr!</h2>`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\src\components\Login.jsx`
  - Line 117: `Pokedex<span style={{ color: 'var(--accent-red)' }}>rr</span>`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\src\components\Settings.jsx`
  - Line 132: `a.download = \`pokedexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\frontend\src\components\SharedCollection.jsx`
  - Line 96: `Go to Pokedexrr`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\backend\package.json`
  - Line 2: `"name": "pokedexrr-backend",`
  - Line 4: `"description": "Backend API for Pokedexrr",`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\backend\package-lock.json`
  - Line 2: `"name": "pokedexrr-backend",`
  - Line 8: `"name": "pokedexrr-backend",`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\backend\src\routes\collection.js`
  - Line 1465: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.json');`
  - Line 1471: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.csv');`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\backend\src\server.js`
  - Line 186: `console.log(\`Pokedexrr Server running on port \${PORT}\`);`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\backend\test\auth.test.js`
  - Line 9: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-auth-test-\${process.pid}.db\`);`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\backend\test\sort.test.js`
  - Line 12: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-test-\${process.pid}.db\`);`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\docker-compose.yml`
  - Line 4: `pokedexrr:`
  - Line 8: `container_name: pokedexrr`
  - Line 22: `- pokedexrr-data:/app/database`
  - Line 25: `pokedexrr-data:`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\.env.example`
  - Line 1: `# Pokedexrr Environment Configuration Example`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\README.md`
  - Line 1: `# Pokedexrr 🎴`
  - Line 3: `Pokedexrr is a self-hostable, mobile-friendly full-stack web application designed for Pokémon card collectors.`
  - Line 71: `On its **first startup**, Pokedexrr creates...`
  - Line 95: `Pokedexrr is packaged as a...`
  - Line 103: `...persisted in the \`pokedexrr-data\` Docker volume.`
  - Line 106: `You can configure Pokedexrr by...`
  - Line 109: `...While Pokedexrr works without one...`
  - Line 122: `...the \`pokedexrr-data\` volume in Docker...`
  - Line 123: `...-v pokedexrr-data:/data...`
  - Line 135: `/pokedexrr`
- `c:\Users\jerem\OneDrive\Documents\pokedexrr\PROJECT.md`
  - Line 25: `| 1 | Global Rebranding | Rebrand "Pokedexrr" to "CardDexrr" globally... |`

## 2. Logic Chain
1. We identified files containing references to `pokedexrr` using recursive searches across the repository.
2. Based on the target name `CardDexrr`, we established a case-preserving replacement schema:
   - `Pokedexrr` ➔ `CardDexrr`
   - `pokedexrr` ➔ `carddexrr`
3. We mapped each matched line to its proposed replacement value.
4. We verified the file contents of the source files to ensure no other occurrences of the pattern are present, verifying that the lists in `analysis.md` cover all required modifications.

## 3. Caveats
- We did not modify any source code files directly, as per the read-only investigator instructions.
- We did not modify local database binaries (`.db`, `.sqlite`) as these are transient developer assets and are git-ignored.
- We assumed the user has a local `.env` file that is git-ignored and may also need rebranding references to match `.env.example`.

## 4. Conclusion
All files requiring rebranding are documented with exact line-by-line substitutions in `analysis.md`. The rebranding is clean, surgical, and safe to execute.

## 5. Verification Method
1. Apply the replacement patches/commands or edit the files as suggested.
2. Run backend and frontend tests to ensure no regressions:
   - `npm run dev` to start dev mode.
   - `npm test --prefix backend` to verify the tests in `backend/test/sort.test.js` and `backend/test/auth.test.js` still pass after rebranding.
