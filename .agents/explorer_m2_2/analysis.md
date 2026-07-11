# Analysis Report: DB Schema Migration & Sorting (Milestone 2)

## 1. DB Schema Migration Analysis

### 1.1 Table Definitions & Location
All database tables are initialized and defined in `backend/src/db.js` within the `initDb()` function.
Existing tables that require a `game` column (defaulting to `'pokemon'`) to support multi-game collections are:
- `card_cache`: Stores the card metadata cache.
- `collection`: Stores individual cards owned by users in specific locations/compartments.
- `decks`: Stores user decks.
- `sets`: Stores details about card sets.

### 1.2 Database Migration Strategy
In `backend/src/db.js`, the schema must be updated in two places:
1. **Schema Initialization (`CREATE TABLE IF NOT EXISTS`)**: Add `game TEXT DEFAULT 'pokemon'` to the column lists for `sets`, `card_cache`, `collection`, and `decks`.
2. **Idempotent Migration Block**: Add migration checks using `PRAGMA table_info` and run `ALTER TABLE ... ADD COLUMN game TEXT DEFAULT 'pokemon'` if the column does not already exist.

**Proposed Migrations in `db.js` (`initDb` function):**
```javascript
// For sets
const setsCols = await all(`PRAGMA table_info(sets)`);
if (!setsCols.some(c => c.name === 'game')) {
  console.log('Adding game column to sets table...');
  await run(`ALTER TABLE sets ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}

// For card_cache
const cardCacheCols = await all(`PRAGMA table_info(card_cache)`);
if (!cardCacheCols.some(c => c.name === 'game')) {
  console.log('Adding game column to card_cache table...');
  await run(`ALTER TABLE card_cache ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}

// For collection
const collectionCols = await all(`PRAGMA table_info(collection)`);
if (!collectionCols.some(c => c.name === 'game')) {
  console.log('Adding game column to collection table...');
  await run(`ALTER TABLE collection ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}

// For decks
const decksCols = await all(`PRAGMA table_info(decks)`);
if (!decksCols.some(c => c.name === 'game')) {
  console.log('Adding game column to decks table...');
  await run(`ALTER TABLE decks ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}
```

### 1.3 Query & Insertion Adjustments
The following files require updates to handle the `game` column during database insertions, updates, and selections:

#### 1.3.1 `backend/src/tcgApi.js`
- **`fetchAndCacheSets`**: Needs to write the `game` column as `'pokemon'` (or dynamic `game` parameter) during `sets` cache insertion:
  ```javascript
  `INSERT OR REPLACE INTO sets (id, name, series, printed_total, total, release_date, ptcgo_code, symbol_url, logo_url, game)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ```
- **`cacheCards`**: Needs to write the `game` column (retrieved from card object or defaulted) during `card_cache` insertion:
  ```javascript
  `INSERT OR REPLACE INTO card_cache
   (id, name, supertype, subtypes, types, rarity, set_id, set_name, number, image_url, price_trend, price_normal, price_holofoil, price_reverse_holofoil, price_avg1, price_avg7, price_avg30, game, last_updated)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ```
- **`searchCards`**:
  - Update signature to include `game = 'pokemon'`.
  - Collection-only local search query needs `AND cc.game = ?` and `game` parameter.
  - Local database cache search query needs `AND game = ?` and `game` parameter.
  - External API call must branch on the `game` value. If `game === 'mtg'`, query Scryfall API (and mock Scryfall API in test environment), extract cards, map their fields, and save them using `cacheCards` with `game: 'mtg'`. Otherwise, proceed with Pokémon TCG API.

#### 1.3.2 `backend/src/routes/collection.js`
- **`GET /collection`**: Allow filtering by `game` (e.g. `req.query.game`). Add `AND c.game = ?` (or `cc.game = ?`) to the SQL query filters. Include `cc.game` in the selected columns.
- **`POST /collection`**: Look up the card's `game` from `card_cache` first and write it to `collection`'s `game` column on insertion (or allow override via req.body).
- **`POST /collection/import`**: Insert the appropriate `game` (defaulting to `'pokemon'` or parsed from the import payload) into the `collection` table.

#### 1.3.3 `backend/src/routes/decks.js`
- **`GET /`**: Allow filtering by `game` (e.g. `req.query.game`). Add `AND d.game = ?` to filters and select `d.game`.
- **`POST /`**: Accept `game` from the body (defaulting to `'pokemon'`) and write it to the `game` column of the `decks` table.
- **`GET /:id`**: Include `d.game` in the query retrieving the deck details.

#### 1.3.4 `backend/src/routes/sets.js`
- **`GET /`**: Allow filtering sets by `game` (e.g. `req.query.game`) and return the `game` field.

---

## 2. Sorting Updates Analysis

### 2.1 Existing Sorting Algorithm (`backend/src/utils/compartmentSort.js`)
Currently, sorting of cards is managed by `sortCards(cards, sortOrder, foilSorting)` in `compartmentSort.js`.
- Under the `'type-name'` sorting scheme, the cards are sorted based on their first type using `POKEMON_TYPE_ORDER`, which defines ranks for Grass, Fire, Water, etc., defaulting to rank `50` (or `50` for unknown types).
- Category buckets are resolved by `getSortCategory(card, sortOrder)`. For `'type-name'`, it returns the first element of `card.types` or `'Colorless'` as a fallback.

### 2.2 MTG Card Sorting Requirements
For Magic: The Gathering (MTG) cards, sorting by type/color must follow the **WUBRG** color identity sequence, followed by colorless and multicolor:
1. **White** (W)
2. **Blue** (U)
3. **Black** (B)
4. **Red** (R)
5. **Green** (G)
6. **Colorless** (artifacts, colorless spells, lands with no color identity)
7. **Multicolor** (cards with more than one color, e.g. types: `['White', 'Blue']`)

In the database, MTG colors are stored in the `types` column of `card_cache` as a JSON string (e.g. `['Red']` or `['White', 'Blue']`).

### 2.3 Proposed Sorting Changes in `compartmentSort.js`

1. **Define MTG Type Ordering Constants:**
   ```javascript
   const MTG_TYPE_ORDER = {
     'White': 1,
     'Blue': 2,
     'Black': 3,
     'Red': 4,
     'Green': 5,
     'Colorless': 6,
     'Multicolor': 7
   };
   ```

2. **Update `sortCards` (in the `type-name` block):**
   We must branch based on the card's `game` property (which defaults to `'pokemon'`).
   If cards are from different games, group them by `game` first (alphabetic comparison).
   For cards belonging to `'mtg'`:
   - If a card has multiple colors (`types.length > 1`), its category is `'Multicolor'`.
   - If it has exactly one color (`types.length === 1`), map WUBRG color names directly.
   - Otherwise, its category is `'Colorless'`.
   Then, order the cards using `MTG_TYPE_ORDER`.

   **Proposed `type-name` logic in `sortCards`:**
   ```javascript
   } else if (sortOrder === 'type-name') {
     sorted.sort((a, b) => {
       const gameA = a.game || 'pokemon';
       const gameB = b.game || 'pokemon';
       if (gameA !== gameB) return gameA.localeCompare(gameB);

       if (gameA === 'mtg') {
         const getMtgCat = (card) => {
           let t = [];
           if (card.types) {
             try {
               t = typeof card.types === 'string' ? JSON.parse(card.types) : card.types;
             } catch (e) {}
           }
           if (!Array.isArray(t)) t = [];
           if (t.length > 1) return 'Multicolor';
           if (t.length === 1 && ['White', 'Blue', 'Black', 'Red', 'Green'].includes(t[0])) return t[0];
           return 'Colorless';
         };
         
         const catA = getMtgCat(a);
         const catB = getMtgCat(b);
         const orderA = MTG_TYPE_ORDER[catA] || 8;
         const orderB = MTG_TYPE_ORDER[catB] || 8;
         if (orderA !== orderB) return orderA - orderB;
         return a.name.localeCompare(b.name);
       } else {
         const typeA = (a.types && a.types[0]) || 'Unknown';
         const typeB = (b.types && b.types[0]) || 'Unknown';
         const orderA = POKEMON_TYPE_ORDER[typeA] || 50;
         const orderB = POKEMON_TYPE_ORDER[typeB] || 50;
         if (orderA !== orderB) return orderA - orderB;
         return a.name.localeCompare(b.name);
       }
     });
   }
   ```

3. **Update `getSortCategory`:**
   Branch on the card's `game` property (retrieved from `card.game || 'pokemon'`).
   
   **Proposed `type` block in `getSortCategory`:**
   ```javascript
   if (sortOrder.startsWith('type')) {
     const game = card.game || 'pokemon';
     let parsedTypes = [];
     if (card.types) {
       try {
         parsedTypes = typeof card.types === 'string' ? JSON.parse(card.types) : card.types;
       } catch (e) {}
     }
     if (!Array.isArray(parsedTypes)) parsedTypes = [];

     if (game === 'mtg') {
       if (parsedTypes.length > 1) return 'Multicolor';
       if (parsedTypes.length === 1) {
         const t = parsedTypes[0];
         if (['White', 'Blue', 'Black', 'Red', 'Green'].includes(t)) return t;
       }
       return 'Colorless';
     } else {
       return parsedTypes[0] || 'Colorless';
     }
   }
   ```

4. **Select `cc.game` in Compartment Queries:**
   To ensure that the card's `game` property is available to `sortCards` when recommendation slots are computed, we must update the SQL queries in `recommendSlot` and `rebalanceCompartmentByScheme` to retrieve `cc.game`:
   - In **`recommendSlot`** (line 227):
     ```javascript
     SELECT c.id as entry_id, c.compartment_id, c.printing, c.language, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number,
            cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil, cc.game
     ```
   - In **`rebalanceCompartmentByScheme`** (line 491):
     ```javascript
     SELECT c.id, c.printing, c.language, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number,
            cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil, cc.game
     ```
