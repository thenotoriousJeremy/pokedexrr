# Handoff Report: DB Schema Migration & Sorting Analysis

This report outlines the observations, reasoning, and conclusions regarding the database schema changes and sorting updates required for multiple games support (Pokémon & Magic: The Gathering).

---

## 1. Observation

### DB Schema definitions and migrations
- The database schema is initialized and migrated in `backend/src/db.js` under `initDb()` (line 72 onwards).
- Existing migrations are performed using `PRAGMA table_info()` check blocks to dynamically add columns without crashing. For example, line 251-256:
  ```javascript
  const collectionCols = await all(`PRAGMA table_info(collection)`);
  if (!collectionCols.some(c => c.name === 'user_id')) {
    console.log('Adding user_id column to collection table...');
    await run(`ALTER TABLE collection ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  }
  ```
- E2E tests in `backend/test/e2e/schema.test.js` check that `collection` and `card_cache` have a `game` column (lines 27-47):
  ```javascript
  // F2-TC1: Assert that the collection table contains a game column
  const cols = await db.all(`PRAGMA table_info(collection)`);
  const hasGame = cols.some(c => c.name === 'game');
  assert.ok(hasGame, 'collection table must have game column');
  ```
- Adding a card via the collection API (`backend/src/routes/collection.js`) inserts into the `collection` table (lines 269-272).
- Bulk importing cards via POST `/api/collection/import` (`backend/src/routes/collection.js`, lines 1615-1631 and lines 1656-1673) inserts into both `card_cache` and `collection` tables.

### Sorting logic
- The sorting algorithm is located in `backend/src/utils/compartmentSort.js` (lines 60-118).
- The `type-name` sorting scheme currently sorts by type using the `POKEMON_TYPE_ORDER` mapping (lines 46-49):
  ```javascript
  const POKEMON_TYPE_ORDER = {
    'Grass': 1, 'Fire': 2, 'Water': 3, 'Lightning': 4, 'Psychic': 5,
    'Fighting': 6, 'Darkness': 7, 'Metal': 8, 'Fairy': 9, 'Dragon': 10, 'Colorless': 11, 'Trainer': 12, 'Energy': 13
  };
  ```
- Test `F2-TC3` in `backend/test/e2e/schema.test.js` asserts that MTG cards are sorted in WUBRG sequence:
  ```javascript
  const cards = [
    { name: 'Mountain', types: ['Red'], game: 'mtg' },
    { name: 'Forest', types: ['Green'], game: 'mtg' },
    { name: 'Island', types: ['Blue'], game: 'mtg' },
    { name: 'Plains', types: ['White'], game: 'mtg' },
    { name: 'Swamp', types: ['Black'], game: 'mtg' }
  ];
  // WUBRG: White -> Blue -> Black -> Red -> Green
  const sorted = compartmentSort.sortCards(cards, 'type-name', 'normals_first');
  const colorsSorted = sorted.map(c => c.types[0]);
  assert.deepStrictEqual(colorsSorted, ['White', 'Blue', 'Black', 'Red', 'Green']);
  ```
- Test `F2-TC7` asserts multicolor card sorting order:
  ```javascript
  const cards = [
    { name: 'Azorius Card', types: ['White', 'Blue'], game: 'mtg' },
    { name: 'Island', types: ['Blue'], game: 'mtg' },
    { name: 'Boros Card', types: ['Red', 'White'], game: 'mtg' },
    { name: 'Plains', types: ['White'], game: 'mtg' }
  ];
  const sorted = compartmentSort.sortCards(cards, 'type-name', 'normals_first');
  // Expected order: Plains (White) -> Island (Blue) -> Azorius Card (Multicolor) -> Boros Card (Multicolor)
  ```

---

## 2. Logic Chain

- Since the database uses dynamic migrations in `db.js`, new migrations must use `PRAGMA table_info()` checks to add a `game TEXT DEFAULT 'pokemon'` column to the `collection`, `card_cache`, `decks`, and `sets` tables.
- Since cards can be added individually or in bulk, routes and TCG API helpers must write `'pokemon'` or `'mtg'` to the `game` column on insertion.
- Since tests like `F6-TC2` sort mixed Pokémon and MTG cards, the `type-name` sorting algorithm must assign rank ranges that avoid overlap. Pokémon uses ranks 1–13, so MTG can use ranks 20–26.
- Since MTG sorting requires WUBRG order followed by Multicolor and Colorless:
  - White (20) -> Blue (21) -> Black (22) -> Red (23) -> Green (24) -> Multicolor (25) -> Colorless (26).
  - Cards with >1 color/type in `types` are classified as `'Multicolor'`.
  - Cards with 0 colors/types in `types` are classified as `'Colorless'`.
- Since `recommendSlot` and `rebalanceCompartmentByScheme` fetch cards from the database and pass them to `sortCards()`, the database queries in these functions must explicitly select the `game` column (`c.game`). Without this, the game defaults to `'pokemon'`, causing MTG cards to sort incorrectly.

---

## 3. Caveats

- We assume Scryfall or other frontend integration will populate the `types` array of MTG cards with English color names (`'White'`, `'Blue'`, `'Black'`, `'Red'`, `'Green'`) as shown in the test cases.
- If a card has color names outside the WUBRG spectrum, they will default to rank 27.

---

## 4. Conclusion

The implementation requires:
1. **DB Migrations**: Add the `game` column to `collection`, `card_cache`, `decks`, and `sets` tables in `backend/src/db.js`.
2. **Insertion Updates**: Update SQL insertions in `tcgApi.js`, `routes/collection.js`, and `routes/decks.js` to populate the `game` column.
3. **Select Query Updates**: Update collection and deck retrieval queries to select the `game` column.
4. **Sorting Logic**: Implement WUBRG sequence sorting ranks (20–26) in `compartmentSort.js` for MTG cards.
5. **Retrieval Queries inside Sorting**: Select `c.game` in `recommendSlot` and `rebalanceCompartmentByScheme` queries.

Detailed proposed code edits and diff details are provided in `analysis.md`.

---

## 5. Verification Method

To verify the changes, run the following test commands:
- **Unit/Smoke tests**:
  ```bash
  node backend/test/sort.test.js
  ```
- **E2E/Schema validation tests**:
  ```bash
  node backend/test/e2e/run.js
  ```
All tests under `backend/test/e2e/schema.test.js` and `backend/test/e2e/scryfall.test.js` should pass.
