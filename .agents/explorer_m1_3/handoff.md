# Handoff Report: Rebranding Explorer Investigation (Pokedexrr to CardDexrr)

This handoff report summarizes the global rebranding investigation findings. All proposed edits are read-only findings; no codebase modifications have been made.

---

## 1. Observation

A full workspace search for the string "pokedexrr" (case-insensitive) was executed. Additionally, a search for the partial term "pokedex" was performed to detect split tags.

### Key Observations:
- **Root Configuration & Documentation**:
  - `/package.json:2`: `"name": "pokedexrr-monorepo",`
  - `/package.json:4`: `"description": "Monorepo for Pokedexrr Pokémon Card Collection Manager",`
  - `/docker-compose.yml:4`: `pokedexrr:`
  - `/docker-compose.yml:8`: `container_name: pokedexrr`
  - `/docker-compose.yml:22`: `- pokedexrr-data:/app/database`
  - `/docker-compose.yml:25`: `pokedexrr-data:`
  - `/.env.example:1`: `# Pokedexrr Environment Configuration Example`
  - `/README.md:1`: `# Pokedexrr 🎴`
  - `/README.md:135`: `/pokedexrr` (Directory tree listing)

- **Frontend Application**:
  - `/frontend/package.json:2`: `"name": "pokedexrr-frontend",`
  - `/frontend/index.html:7`: `<title>Pokedexrr - Pokémon Card Collection Organizer</title>`
  - `/frontend/src/components/Login.jsx:117`: `Pokedex<span style={{ color: 'var(--accent-red)' }}>rr</span>` (Split branding title representation)
  - `/frontend/src/components/Dashboard.jsx:101`: `<h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Welcome to Pokedexrr!</h2>`
  - `/frontend/src/components/SharedCollection.jsx:96`: `Go to Pokedexrr`
  - `/frontend/src/components/Settings.jsx:132`: `a.download = \`pokedexrr_collection.\${format === 'json' ? 'json' : 'csv'}\`;`
  - `/frontend/src/App.jsx:58`: `const token = localStorage.getItem('pokedexrr_token');` (Local storage token and logout event tracking matches lines 58, 69, 76, 79, 117, 118, 121, 122, 128, 129, 140, 141, 147)

- **Backend Application**:
  - `/backend/package.json:2`: `"name": "pokedexrr-backend",`
  - `/backend/package.json:4`: `"description": "Backend API for Pokedexrr",`
  - `/backend/src/routes/collection.js:1465`: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.json');`
  - `/backend/src/routes/collection.js:1471`: `res.setHeader('Content-Disposition', 'attachment; filename=pokedexrr_collection.csv');`
  - `/backend/src/server.js:186`: `console.log(\`Pokedexrr Server running on port \${PORT}\`);`
  - `/backend/test/auth.test.js:9`: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-auth-test-\${process.pid}.db\`);`
  - `/backend/test/sort.test.js:12`: `const tmpDb = path.join(os.tmpdir(), \`pokedexrr-test-\${process.pid}.db\`);`

---

## 2. Logic Chain

1. To successfully execute a global rebrand, all occurrences of the application name in code comments, descriptions, variable keys, file attachments, and orchestration files must be changed (from `Pokedexrr`/`pokedexrr` to `CardDexrr`/`carddexrr`).
2. By executing case-insensitive grep queries, we isolated all raw text instances of the name in the user-visible documentation (`README.md`, `.env.example`), monorepo structure manifests (`package.json`), backend server output (`server.js`, `collection.js`), and test databases (`auth.test.js`, `sort.test.js`).
3. Searching for "pokedex" revealed a split tag inside the JSX header of `/frontend/src/components/Login.jsx:117` (`Pokedex<span ...>rr</span>`). Leaving this unchanged would result in the login page showing "Pokedexrr" instead of "CardDexrr" while the rest of the application was rebranded.
4. Thus, all identified files must be edited in their exact line numbers with case-appropriate substitutions (e.g. `pokedexrr` to `carddexrr`, and `Pokedexrr` to `CardDexrr`).

---

## 3. Caveats

- We did not investigate local Git history modifications or GitHub repository name changes. The repository folder on the host disk is currently named `pokedexrr` but renaming the host directory does not impact the application run.
- The default SQLite database file is named `pokemon_cards.db` in `db.js`. While this does not contain the word "pokedexrr", renaming it to a generic name (e.g., `cards.db`) is recommended but not strictly required for rebranding.
- Lockfiles (`package-lock.json`) are assumed to be regenerated/updated by running `npm install` post-modification of the manifests.

---

## 4. Conclusion

A clean and complete global rebranding is fully scoped. The Implementation Orchestrator/Implementer must execute replacement edits across 13 target source/configuration files (plus lockfiles) using the substitutions outlined in `analysis.md`. Special care must be taken to update local storage event/key names in `App.jsx` and the split-span tag styling in `Login.jsx:117`.

---

## 5. Verification Method

To verify the rebranding:
1. **Search check**: Run the following search from the root folder to confirm zero occurrences of `pokedexrr` remain:
   ```bash
   # In powershell:
   git grep -i "pokedexrr"
   ```
2. **Build and Lint test**: Confirm that the frontend package lints and compiles cleanly:
   ```bash
   cd frontend
   npm run lint
   npm run build
   ```
3. **Backend test**: Ensure the backend test suite completes successfully:
   ```bash
   cd ../backend
   npm test
   ```
