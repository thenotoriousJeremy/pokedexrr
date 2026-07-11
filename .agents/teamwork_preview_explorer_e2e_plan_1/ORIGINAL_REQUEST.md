## 2026-07-10T17:59:26Z

Analyze the codebase at c:\Users\jerem\OneDrive\Documents\pokedexrr to design a comprehensive E2E test suite under backend/test/e2e. 
Your working directory is: c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\teamwork_preview_explorer_e2e_plan_1

You must plan and draft the design for at least 49 test cases matching the 4 tiers across these 4 features:
1. Global Rebranding (Pokedexrr -> CardDexrr in package files, Docker configs, README, UI labels, API headers, etc.)
2. Database Schema & Sorting (Migrate db tables to add `game` columns in backend/src/db.js, track MTG color sorting rules, physical locations sorting)
3. Scryfall API Integration (Fetch MTG cards from Scryfall API, cache them locally in card_cache, proxy queries correctly)
4. Scanner & UI (Camera scanner OCR lower-left layout toggle for MTG, set/number regex, display MTG styling/symbols)

The 4 Tiers:
- Tier 1: Feature Coverage (>= 5 tests per feature = 20 tests total)
- Tier 2: Boundary & Corner Cases (>= 5 tests per feature = 20 tests total)
- Tier 3: Cross-Feature Combinations (>= 4 tests total, pairwise interaction of features)
- Tier 4: Real-World Application Scenarios (>= 5 tests total)

The tests must be framework-free Node.js scripts using the standard 'assert' module, and run using a custom test runner (e.g. node backend/test/e2e/run.js) with exit code 0 when all tests pass.
Opaque-box and requirement-driven means testing through public API endpoints, CLI, config checks, database structures, or UI page contents.
Write a detailed report 'handoff.md' and update 'progress.md' inside your working directory c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\teamwork_preview_explorer_e2e_plan_1.
When done, send a message back.
