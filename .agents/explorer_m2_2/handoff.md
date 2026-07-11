# Handoff Report: DB Schema Migration & Sorting (Milestone 2)

## 1. Observation

Direct observations made in the codebase:
- **Table definitions**: In `backend/src/db.js` (lines 164-215), the `sets`, `card_cache`, `collection`, and `decks` tables are created:
  - `sets` table (lines 164-175)
  - `card_cache` table (lines 179-196)
  - `collection` table (lines 200-215)
  - `decks` table (lines 229-237)
- **Existing migrations**: In `backend/src/db.js` (lines 250-368), migrations check for missing columns and run `ALTER TABLE`:
  ```javascript
  const collectionCols = await all(`PRAGMA table_info(collection)`);
  if (!collectionCols.some(c => c.name === 'user_id')) {
    console.log('Adding user_id column to collection table...');
    await run(`ALTER TABLE collection ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  }
  ```
- **F2-TC1 & F2-TC2 Schema Requirements**: Observed in `backend/test/e2e/schema.test.js` (lines 27-48):
  - `collection` table must contain a `game` column (lines 27-36).
  - `card_cache` table must contain a `game` column (lines 38-47).
- **F2-TC3 & F2-TC7 Sorting Requirements**: Observed in `backend/test/e2e/schema.test.js` (lines 49-66 and lines 141-159):
  - MTG cards sorted by `type-name` must follow WUBRG order: `['White', 'Blue', 'Black', 'Red', 'Green']`.
  - Multicolor cards must sort after single-color cards: Plains (White) -> Island (Blue) -> Azorius Card (Multicolor) -> Boros Card (Multicolor).
- **Existing Sorting Logic**: In `backend/src/utils/compartmentSort.js` (lines 100-108), the `type-name` sorting is currently written as:
  ```javascript
  } else if (sortOrder === 'type-name') {
    sorted.sort((a, b) => {
      const typeA = (a.types && a.types[0]) || 'Unknown';
      const typeB = (b.types && b.types[0]) || 'Unknown';
      const orderA = POKEMON_TYPE_ORDER[typeA] || 50;
      const orderB = POKEMON_TYPE_ORDER[typeB] || 50;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }
  ```
- **Recommend Slot Queries**: In `backend/src/utils/compartmentSort.js` (lines 226-232 and lines 491-496), the database select queries do not currently fetch the card `game` column:
  - Line 227: `SELECT c.id as entry_id, c.compartment_id, c.printing, c.language, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number, cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil FROM collection c JOIN card_cache cc ON c.card_id = cc.id ...`

## 2. Logic Chain

1. Since `test/e2e/schema.test.js` asserts that the `collection` and `card_cache` tables must contain a `game` column, and we need to distinguish Pokemon and MTG cards/sets/decks, the database tables `sets`, `card_cache`, `collection`, and `decks` must be updated to include `game TEXT DEFAULT 'pokemon'`.
2. Since existing databases may already exist without this column, we must add idempotent migrations in `db.js` using `ALTER TABLE <table> ADD COLUMN game TEXT DEFAULT 'pokemon'` for all four tables.
3. Since `recommendSlot` and `rebalanceCompartmentByScheme` call `sortCards` using the fetched list of cards, and `sortCards` needs the card's `game` property to apply MTG sorting, the SQL queries in these functions must be updated to retrieve `cc.game`.
4. Since `test/e2e/schema.test.js` tests that MTG colors sort in WUBRG order (White -> Blue -> Black -> Red -> Green) and multicolor cards sort after single colors, we must define the `MTG_TYPE_ORDER` mapping:
   - `White`: 1, `Blue`: 2, `Black`: 3, `Red`: 4, `Green`: 5, `Colorless`: 6, `Multicolor`: 7.
5. In `sortCards`, when comparing cards of the same game:
   - If the game is `'mtg'`, we resolve each card's color/type category:
     - Multi-colored (`types.length > 1`) maps to `'Multicolor'`.
     - Single color (`types.length === 1` and color is one of WUBRG) maps to that color.
     - Otherwise, maps to `'Colorless'`.
   - We then sort using `MTG_TYPE_ORDER`.
6. When comparing cards from different games, they should be grouped by game first to avoid mixing cards of different games.

## 3. Caveats

- We assume that if `types` contains multiple elements, the card is multicolor.
- We assume that `card.game` will be populated correctly by the API search proxy (e.g. Scryfall API search populating `game = 'mtg'` and Pokemon TCG API populating `game = 'pokemon'`).

## 4. Conclusion

The exact implementation changes needed are:
1. **`backend/src/db.js`**:
   - Add `game TEXT DEFAULT 'pokemon'` to definitions of `sets`, `card_cache`, `collection`, and `decks`.
   - Add idempotent `ALTER TABLE` migration blocks in `initDb()` for these tables.
2. **`backend/src/utils/compartmentSort.js`**:
   - Add `MTG_TYPE_ORDER` constant.
   - Update `sortCards()`'s `'type-name'` branch to support MTG sorting logic (categorization and WUBRG order) and group by game name first.
   - Update `getSortCategory()`'s `'type'` branch to return `'Multicolor'`, the specific WUBRG color, or `'Colorless'` for MTG.
   - Update SQL select queries in `recommendSlot` and `rebalanceCompartmentByScheme` to retrieve `cc.game`.
3. **API and Routing Files**:
   - Update `tcgApi.js` (`fetchAndCacheSets`, `cacheCards`, `searchCards`) to write and query the `game` column, and integrate Scryfall API search for `game === 'mtg'`.
   - Update collection routes (`GET /collection`, `POST /collection`, `POST /collection/import`) to handle the `game` column.
   - Update deck routes (`GET /`, `POST /`, `GET /:id`) to handle the `game` column.
   - Update sets route (`GET /`) to filter sets by game.

## 5. Verification Method

To verify the changes, execute the following commands in the `backend/` directory:
1. Run E2E test runner to ensure the schema migration, MTG sorting, and Scryfall caching tests pass:
   ```powershell
   node test/e2e/run.js
   ```
   *Verify that `PASS: F2-TC1` through `PASS: F2-TC10` and `PASS: F3-TC1` through `PASS: F3-TC10` are printed.*
2. Run standard unit tests:
   ```powershell
   npm test
   ```
   *Verify that all unit tests pass.*
