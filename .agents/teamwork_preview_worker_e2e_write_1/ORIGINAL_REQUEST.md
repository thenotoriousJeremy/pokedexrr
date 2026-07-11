## 2026-07-10T18:02:02Z
Create the E2E test suite under backend/test/e2e in the repository c:\Users\jerem\OneDrive\Documents\pokedexrr.
Your working directory is: c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\teamwork_preview_worker_e2e_write_1

You must implement 6 test files and a test runner run.js under backend/test/e2e/ that cover exactly 49 test cases matching these specifications:
1. rebrand.test.js: 10 test cases (F1-TC1 to F1-TC10). Verify case-insensitive renaming of Pokedexrr -> CardDexrr across package.json files, Docker files, index.html title, environment files, and health-check API headers.
2. schema.test.js: 10 test cases (F2-TC1 to F2-TC10). Verify the new database columns (e.g. game columns in collection/card_cache), WUBRG sorting rules for MTG colors, and location rules.
3. scryfall.test.js: 10 test cases (F3-TC1 to F3-TC10). Verify search proxy to Scryfall API, field mapping to standard schema (starts with mtg-, supertype: MTG, etc.), and local cache read/write behaviors.
4. ocr.test.js: 10 test cases (F4-TC1 to F4-TC10). Verify OCR parsing regex, set code matching lengths, collector number suffixes, noise filtering, layout state, and UI placeholders in front-end files.
5. cross_feature.test.js: 4 test cases (F5-TC1 to F5-TC4). Verify cross-feature combinations (e.g., Scryfall proxy matching schema, scanner querying proxy, location re-sorting on MTG addition).
6. scenarios.test.js: 5 test cases (F6-TC1 to F6-TC5). Verify complete user scenarios (e.g., mixed-game collection sorting, full collector scanning pipeline, user register -> search -> recommendation -> check-in).

Test Runner:
- Create run.js that discovers all files ending in .test.js, executes them as child processes, monitors their results, prints each test result status, and outputs a total count of passed and failed test cases/files.
- It must exit with code 0 if all pass, and 1 otherwise.

Mandatory rules:
- Use standard Node.js 'assert' module (framework-free matching existing backend test style).
- Standard SQLite database is loaded dynamically in tests using temporary DB files (e.g., process.env.DB_PATH set to temp path before requiring src/db) to avoid polluting production DB.
- Use global fetch (built into Node 18+) or custom http requests for API routes. If API calls fail because the backend server is not running or not yet implemented, the tests must exit with fail code or throw assertions, NOT bypass them.
- For UI files (e.g. CameraScanner.jsx), read their contents from the filesystem to assert that the required markup (like MTG mode button/toggles, bottom-left ROI, or MTG styling) is present.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

When finished, provide a handoff report in c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\teamwork_preview_worker_e2e_write_1\handoff.md detailing the created files and test results, and send a message.
