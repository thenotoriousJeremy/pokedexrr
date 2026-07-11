# Scope: Implementation Track

## Architecture
- **Backend API**: Node.js/Express app (`backend/src/server.js`) backed by SQLite (`backend/src/db.js`).
  - `backend/src/tcgApi.js` coordinates queries to Pokémon TCG API.
  - `backend/src/scryfallApi.js` (to be created) will query Scryfall API for MTG cards.
  - Search routes (`backend/src/routes/collection.js`, `backend/src/routes/decks.js`, etc.) will dispatch queries to Pokémon or Scryfall APIs.
  - `backend/src/utils/compartmentSort.js` sorts collections by type, name, language, etc.
- **Frontend SPA**: React with Vite.
  - `frontend/src/components/CameraScanner.jsx` captures video frame, performs OCR.
  - `frontend/src/components/CardInspectorModal.jsx` displays card details, pricing, types, locations.
  - Rebranding applies to all React files, Docker configurations, README.md, package.json.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Global Rebranding | Rebrand "Pokedexrr" to "CardDexrr" globally in package files, README.md, Docker, frontend components. | None | DONE |
| 2 | Schema & Sorting Logic | Migrate DB tables to add `game` columns in `backend/src/db.js` and update `compartmentSort.js` for MTG color types. | None | IN_PROGRESS |
| 3 | Scryfall API Integration | Create `backend/src/scryfallApi.js` and update search routing in `backend/src/routes/collection.js` etc. to fetch and cache MTG cards. | M2 | PLANNED |
| 4 | Camera Scanner & UI | Add layout toggle in `CameraScanner.jsx` for MTG (lower-left set code and collector number scanner) and display MTG styling/symbols. | M3 | PLANNED |

## Interface Contracts
### `backend/src/scryfallApi.js`
- `searchCards(name, number, set)` -> maps Scryfall cards to:
  ```json
  {
    "id": "mtg-<id>",
    "name": "...",
    "supertype": "MTG",
    "subtypes": "[\"Creature\", \"Elf\"]",
    "types": "[\"Green\"]",
    "rarity": "Rare",
    "set_id": "...",
    "set_name": "...",
    "number": "...",
    "image_url": "...",
    "price_trend": 0.0,
    "price_normal": 0.0,
    "price_holofoil": 0.0,
    "price_reverse_holofoil": 0.0,
    "game": "mtg"
  }
  ```
