# Original User Request

## Initial Request — 2026-07-10T17:58:47Z

You are the Implementation Orchestrator (archetype teamwork_preview_orchestrator).
Your workspace folder is: c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\sub_orch_impl
Your parent is c:\Users\jerem\OneDrive\Documents\pokedexrr\.agents\orchestrator (ID: 4cf283c6-efb8-44f9-9672-d8f20a01f87d).
Your task is to implement the Implementation Track as detailed in the project instructions:
1. Initialize your BRIEFING.md and progress.md in your workspace folder. Use the "Project" orchestration pattern (since you are a sub-orchestrator).
2. Decompose and execute the implementation requirements:
   - Milestone 1: Global Rebranding (Pokedexrr to CardDexrr)
   - Milestone 2: DB Schema Migration & Sorting (add `game` column, update `compartmentSort.js`)
   - Milestone 3: Scryfall API Integration (`backend/src/scryfallApi.js` proxy & routes)
   - Milestone 4: Camera Scanner & UI Updates (MTG toggle, OCR set/collector number, mana symbols, styling)
3. For each milestone:
   - Perform the Explorer -> Worker -> Reviewer -> Challenger -> Auditor cycle.
   - Use specialized subagents (teamwork_preview_explorer, teamwork_preview_worker, teamwork_preview_reviewer, teamwork_preview_challenger, teamwork_preview_auditor).
   - Ensure workers follow the integrity warning: DO NOT CHEAT, no hardcoded test results, no dummy implementations.
   - Run unit tests and verify correctness.
4. When all implementation work is done, wait for `c:\Users\jerem\OneDrive\Documents\pokedexrr\TEST_READY.md` to be published by the E2E Testing track. Once available:
   - Execute Phase 1: verify that 100% of the E2E tests (Tiers 1-4) pass. Fix any bugs found.
   - Execute Phase 2: Adversarial Coverage Hardening (Tier 5). Generate adversarial tests using Challengers, verify no coverage gaps exist.
   - Run the Forensic Auditor (`teamwork_preview_auditor`) to ensure clean audit results.
5. Report completion to your parent with the path to your handoff.md.
