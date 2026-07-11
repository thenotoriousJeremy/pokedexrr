# E2E Test Plan Handoff Report

## 1. Observation

During our investigation of the `pokedexrr` codebase, we observed the following:

- **Database Connection**: `backend/src/db.js` lines 7-8:
  ```javascript
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/pokemon_cards.db');
  ```
- **Filing Order**: `backend/src/utils/compartmentSort.js` lines 46-49 defines:
  ```javascript
  const POKEMON_TYPE_ORDER = {
    'Grass': 1, 'Fire': 2, 'Water': 3, 'Lightning': 4, 'Psychic': 5,
    'Fighting': 6, 'Darkness': 7, 'Metal': 8, 'Fairy': 9, 'Dragon': 10, 'Colorless': 11, 'Trainer': 12, 'Energy': 13
  };
  ```
- **Express Port & Logging**: `backend/src/server.js` lines 185-187 logs:
  ```javascript
  console.log(`Pokedexrr Server running on port ${PORT}`);
  ```
- **Existing Smoke Tests**: `backend/package.json` line 9 specifies the test script:
  ```json
  "test": "node test/sort.test.js && node test/auth.test.js"
  ```
  Both `sort.test.js` and `auth.test.js` are framework-free scripts using `assert` and a temporary local database file.

---

## 2. Logic Chain

1. **Environmental Isolation**: To prevent tests from interfering with the main database (`pokemon_cards.db`), they must use temporary SQLite database paths, identical to the pattern observed in `sort.test.js` (line 12: `os.tmpdir()`).
2. **Process Isolation**: Concurrency issues and database locks (even with WAL mode enabled on SQLite in `db.js` line 28) can happen if multiple tests run in the same process. Thus, we conclude that a custom runner (`run.js`) spawning each `*.test.js` suite in a child process is the most robust way to ensure clean test runs.
3. **Rebranding Verification**: Since rebranding applies case-insensitively to Docker files, packaging, titles, and readme files, E2E tests must verify this via filesystem reads rather than active API endpoints.
4. **Proxy & Mock Validation**: To verify Scryfall API proxy queries without hitting external rate limits, we must test using a mock API interceptor or isolated database caches, comparing responses against the contract defined in `PROJECT.md`.
5. **OCR Scanner Checking**: Testing OCR logic without a browser context is best done by separating the parsing regex in `CameraScanner.jsx` and validating it against diverse set/number strings.

---

## 3. Caveats

- **External Integrations**: We assume that Scryfall queries will map cards according to the interface contract in `PROJECT.md`.
- **Camera OCR Limits**: Testing real camera video streams in a headless Node.js environment is not feasible. The E2E tests instead simulate OCR scan text payloads dispatched to the API.

---

## 4. Conclusion

We have designed a comprehensive E2E test plan of **49 test cases** divided across 4 tiers and 4 features:
1. **Global Rebranding**: 10 tests verifying Monorepo, Backend, Docker compose, HTML title, default DB name, and API custom headers.
2. **Schema & Sorting**: 10 tests verifying `game` columns, MTG WUBRG sorting, physical compartments, and migration idempotency.
3. **Scryfall Integration**: 10 tests verifying Scryfall search proxy, caching, rate limiting, and interface contracts.
4. **Scanner & UI**: 10 tests verifying layout toggles, set/number regex parsing, and mana symbol UI renderings.
5. **Cross-Feature combinations**: 4 tests verifying pairwise interactions.
6. **Real-World Application scenarios**: 5 tests verifying complete collector workflows.

The complete design document and draft code snippets are saved in `test_plan.md`.

---

## 5. Verification Method

Once implemented, the E2E test suite can be independently run and verified:
1. Run the custom runner script:
   ```powershell
   node backend/test/e2e/run.js
   ```
2. Verify that the output displays `PASS` for all 6 test files and prints a summary.
3. Verify that the command exits with code `0`.
