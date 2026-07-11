# E2E Test Infra: CardDexrr

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Global Rebranding | ORIGINAL_REQUEST R1 | 5      | 5      | ✓      |
| 2 | Database Schema Migration & Sorting | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 3 | Scryfall API Integration | ORIGINAL_REQUEST R3 | 5      | 5      | ✓      |
| 4 | Camera Scanner & UI Updates | ORIGINAL_REQUEST R4 | 5      | 5      | ✓      |

## Test Architecture
- Test runner: custom Node.js smoke tests
- Test case format: assert-based test scenarios in `backend/test/e2e`
- Directory layout:
  - `backend/test/e2e/rebrand.test.js` (Rebranding validation)
  - `backend/test/e2e/schema.test.js` (Database migration & sorting validation)
  - `backend/test/e2e/scryfall.test.js` (Scryfall API proxy validation)
  - `backend/test/e2e/ocr.test.js` (Camera scanner OCR flow validation)

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Global rebrand verify | F1 | Low |
| 2 | MTG and Pokémon sorting in binder | F2 | Medium |
| 3 | Proxy Scryfall search & add to collection | F2, F3 | Medium |
| 4 | Scanner OCR set/number code parsing | F4 | Medium |
| 5 | Full collector pipeline (OCR -> API Search -> Add -> View Inspector) | F1, F2, F3, F4 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
