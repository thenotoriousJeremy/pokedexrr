# Original User Request

## Initial Request — 2026-07-10T17:57:33Z

Update the existing pokedexrr codebase to add support for Magic: The Gathering (MTG) cards and rebrand the application to "CardDexrr". 

Working directory: c:\Users\jerem\OneDrive\Documents\pokedexrr
Integrity mode: development

## Requirements

### R1. Global Rebranding
Rename "Pokedexrr" to "CardDexrr" globally, including in README.md, package files, HTML titles, React components, and Docker configurations. 

### R2. Database Schema Migration
Add a `game` column (defaulting to 'pokemon', but supporting 'mtg') to the `card_cache` and `collection` tables in `backend/src/db.js`. Update the sorting logic in `compartmentSort.js` so that "Sort by Type" recognizes MTG colors/types alongside Pokémon energy types.

### R3. Scryfall API Integration
Create `backend/src/scryfallApi.js` to proxy requests to the Scryfall API. Update the main search route to dispatch queries to either the existing Pokémon API or the new Scryfall API based on the requested game. Map Scryfall's JSON response to match the existing `card_cache` schema fields.

### R4. Camera Scanner & UI Updates
Update `CameraScanner.jsx` to include an "MTG" layout toggle. When selected, the scanner must target the bottom-left of the card to OCR the set code and collector number (MTG layout), rather than the standard Pokémon fractional number format. Update UI components (like CardInspector) to display MTG mana symbols where appropriate without breaking the unified dark theme.

## Acceptance Criteria

### Verification
- [ ] `npm test` in the backend directory passes successfully after schema modifications.
- [ ] Database migrations execute cleanly on application startup without constraint failures.
- [ ] The Camera Scanner successfully extracts an MTG set code and number from a test image and returns a valid Scryfall result.
- [ ] The UI renders MTG cards gracefully (prices, types, and sets appear correctly in the Card Inspector and Dashboard).
