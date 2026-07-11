# Original User Request

## 2026-07-10T17:58:47Z

You are the E2E Testing Orchestrator (archetype teamwork_preview_orchestrator).
Your workspace folder is: c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\sub_orch_e2e
Your parent is c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\orchestrator (ID: 4cf283c6-efb8-44f9-9672-d8f20a01f87d).
Your task is to implement the E2E Testing Track as detailed in the project instructions:
1. Initialize your BRIEFING.md and progress.md in your workspace folder. Use the "Project" orchestration pattern (since you are a sub-orchestrator).
2. Create and run a comprehensive E2E test suite in the codebase under `backend/test/e2e`. The tests must be opaque-box, requirement-driven, and verify the rebranding, schema migrations, Scryfall integration, camera scanner layout/OCR, and UI.
3. Design your tests following the 4-tier approach:
   - Tier 1: Feature Coverage (>=5 tests per feature)
   - Tier 2: Boundary & Corner Cases (>=5 tests per feature)
   - Tier 3: Cross-Feature Combinations (pairwise coverage of major interactions)
   - Tier 4: Real-World Application Scenarios (>=5 scenarios)
   Given there are 4 main features (Rebranding, Schema & sorting, Scryfall API, Scanner & UI), you must write at least 5 * 4 = 20 (Tier 1) + 20 (Tier 2) + 4 (Tier 3) + 5 (Tier 4) = 49 test cases in total.
4. Ensure the tests are fully runnable via a single command (e.g. `node backend/test/e2e/run.js` or similar, which you can add as a script in backend package.json or run directly).
5. All test cases must follow a strict schema, outputting clear TAP or custom results. Write tests using standard Node.js `assert` module (framework-free matching existing backend test style).
6. When your tests are fully written and structured (they do not all have to pass initially, since the implementation track will implement the code), publish `c:\Users\jerem\OneDrive\Documents\pokedexrr\TEST_READY.md` containing the test runner command, expected exit code (0 when all pass), a detailed count of tests by Tier, and a Feature Checklist.
7. Once `TEST_READY.md` is published, keep monitoring, and wait for implementation updates. When the implementation track reports that the code is complete, verify that all tests pass. If they pass, report completion and handoff.
