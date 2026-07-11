## 2026-07-10T18:02:37Z
You are Worker 1 for Milestone 1: Global Rebranding (Pokedexrr to CardDexrr).
Your working directory is: c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\worker_m1_1
Your task is to implement the global rebranding of "Pokedexrr" to "CardDexrr" (and case variants like pokedexrr, pokedexrr-frontend, pokedexrr-backend, pokedexrr-monorepo, POKEDEXRR, pokedexrr_token, pokedexrr_collection etc.) across all files identified in the explorers' handoff.
Here are the files and locations:
- frontend/index.html (Line 7): Pokedexrr -> CardDexrr
- frontend/package.json (Line 2): pokedexrr-frontend -> carddexrr-frontend
- frontend/src/App.jsx (Line 58): pokedexrr_token -> carddexrr_token
- frontend/src/components/Dashboard.jsx (Line 101): Welcome to Pokedexrr! -> Welcome to CardDexrr!
- frontend/src/components/Login.jsx (Line 117): Pokedex<span style={{ color: 'var(--accent-red)' }}>rr</span> -> CardDex<span style={{ color: 'var(--accent-red)' }}>rr</span>
- frontend/src/components/Settings.jsx (Line 132): pokedexrr_collection -> carddexrr_collection
- frontend/src/components/SharedCollection.jsx (Line 96): Go to Pokedexrr -> Go to CardDexrr
- backend/package.json (Line 2): pokedexrr-backend -> carddexrr-backend
- backend/src/routes/collection.js (Line 1465): pokedexrr_collection.json -> carddexrr_collection.json
- backend/src/server.js (Line 186): Pokedexrr Server running... -> CardDexrr Server running...
- backend/test/auth.test.js (Line 9): pokedexrr-auth-test-... -> carddexrr-auth-test-...
- package.json (Line 2): pokedexrr-monorepo -> carddexrr-monorepo
- docker-compose.yml (Lines 4, 8, 22, 25): services/container/volume names update pokedexrr to carddexrr
- .env.example (Line 1): Pokedexrr -> CardDexrr
- README.md: all occurrences of Pokedexrr / pokedexrr -> CardDexrr / carddexrr

Important:
Make sure you replace all case variants correctly.
Ensure that the build and tests pass after changes:
Run tests using:
npm test in the backend directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

When completed, produce a handoff report at c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\worker_m1_1\handoff.md including details of modified files, build/test results, and notify the Implementation Orchestrator (conversation ID: b7ea662e-4712-4c93-ac82-0b2772b4d497) with the path to your handoff report.
