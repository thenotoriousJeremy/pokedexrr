# DB Schema Migration & Sorting Analysis Report

This report analyzes the necessary database schema migrations to support multiple games (Pokémon and Magic: The Gathering) and the updates required for the sorting algorithm to support MTG cards.

---

## 1. DB Schema Changes

### 1.1 Table Definitions
All database tables are defined and initialized in `backend/src/db.js` inside the `initDb()` function. The tables to be updated to support the game type are:
- `collection`
- `card_cache`
- `decks`
- `sets`

### 1.2 Migration Plan & Idempotency
To support the new `game` column (defaulting to `'pokemon'`) in an idempotent manner, we check if the column exists using `PRAGMA table_info(<table>)` before running the `ALTER TABLE ... ADD COLUMN` command.

Inside `initDb()`, the following migration blocks must be added:

#### For `collection` Table:
```javascript
const collectionCols = await all(`PRAGMA table_info(collection)`);
if (!collectionCols.some(c => c.name === 'game')) {
  console.log('Adding game column to collection table...');
  await run(`ALTER TABLE collection ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}
```

#### For `card_cache` Table:
```javascript
const cardCacheCols = await all(`PRAGMA table_info(card_cache)`);
if (!cardCacheCols.some(c => c.name === 'game')) {
  console.log('Adding game column to card_cache table...');
  await run(`ALTER TABLE card_cache ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}
```

#### For `decks` Table:
```javascript
const decksCols = await all(`PRAGMA table_info(decks)`);
if (!decksCols.some(c => c.name === 'game')) {
  console.log('Adding game column to decks table...');
  await run(`ALTER TABLE decks ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}
```

#### For `sets` Table:
```javascript
const setsCols = await all(`PRAGMA table_info(sets)`);
if (!setsCols.some(c => c.name === 'game')) {
  console.log('Adding game column to sets table...');
  await run(`ALTER TABLE sets ADD COLUMN game TEXT DEFAULT 'pokemon'`);
}
```

### 1.3 Updates to Queries and Insertions

#### `backend/src/tcgApi.js` (Pokémon-specific caching)
When caching fetched Pokémon cards or sets, `game` must be explicitly written as `'pokemon'`:
- **`cacheCards()`**:
  ```javascript
  await db.run(
    `INSERT OR REPLACE INTO card_cache
     (id, name, supertype, subtypes, types, rarity, set_id, set_name, number, image_url, price_trend, price_normal, price_holofoil, price_reverse_holofoil, price_avg1, price_avg7, price_avg30, game, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      // ... previous args ...,
      detailed.avg30,
      'pokemon'
    ]
  );
  ```
- **`fetchAndCacheSets()`**:
  ```javascript
  await db.run(
    `INSERT OR REPLACE INTO sets (id, name, series, printed_total, total, release_date, ptcgo_code, symbol_url, logo_url, game)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      // ... previous args ...,
      'pokemon'
    ]
  );
  ```

#### `backend/src/routes/collection.js`
- **POST `/collection` (Insert single card)**:
  First query the card's game from `card_cache` (either cached or freshly fetched via `tcgApi.getCardById`). Then insert it into the collection:
  ```javascript
  const card = await db.get(`SELECT id, game FROM card_cache WHERE id = ?`, [card_id]);
  const gameValue = card ? card.game : 'pokemon';
  ...
  await db.run(`
    INSERT INTO collection
    (card_id, game, quantity, condition, printing, language, purchase_price, location_id, compartment_id, user_id, list_type, is_trade, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    card_id,
    gameValue,
    // ... rest of args ...
  ]);
  ```
- **POST `/collection/import` (CSV bulk import)**:
  Verify if the CSV has a `game` column (from `card.game`). Write it to both `card_cache` and `collection` tables (falling back to `'pokemon'` if not provided):
  ```javascript
  let game = card.game || 'pokemon';
  let cached = await db.get(`SELECT id, game FROM card_cache WHERE id = ?`, [cardId]);
  if (!cached) {
    await db.run(
      `INSERT OR IGNORE INTO card_cache
       (id, name, supertype, subtypes, types, rarity, set_id, set_name, number, image_url, price_trend, game)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [..., game]
    );
  } else {
    game = cached.game || 'pokemon';
  }
  ...
  await db.run(
    `INSERT INTO collection
     (card_id, game, user_id, quantity, condition, printing, language, purchase_price, location_id, compartment_id, position, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cardId, game, req.user.id, ...]
  );
  ```
- **GET `/collection` (Retrieve list)**:
  Update the main collection query to return `c.game as game` in the select list:
  ```sql
  SELECT c.id as entry_id, c.card_id, c.game, c.quantity, ...
  ```

#### `backend/src/routes/decks.js`
- **POST `/` (Create deck)**:
  Extract the `game` from the body and write it:
  ```javascript
  const { name, description = '', game = 'pokemon' } = req.body;
  ...
  await db.run(
    `INSERT INTO decks (name, description, game, user_id) VALUES (?, ?, ?, ?)`,
    [name, description, game, req.user.id]
  );
  ```
- **GET `/:id` (Retrieve deck details)**:
  Add `cc.game` to the card select list:
  ```sql
  SELECT dc.quantity, cc.id, cc.name, cc.supertype, cc.subtypes, cc.types, cc.rarity, cc.set_id, cc.set_name, cc.number, cc.image_url, cc.price_trend, cc.game, ...
  ```

---

## 2. Sorting Updates

### 2.1 Current Sorting Behavior
Sorting is handled in `backend/src/utils/compartmentSort.js`. For the `type-name` sort scheme, cards are sorted based on their first type using the `POKEMON_TYPE_ORDER` mapping:
```javascript
const POKEMON_TYPE_ORDER = {
  'Grass': 1, 'Fire': 2, 'Water': 3, 'Lightning': 4, 'Psychic': 5,
  'Fighting': 6, 'Darkness': 7, 'Metal': 8, 'Fairy': 9, 'Dragon': 10, 'Colorless': 11, 'Trainer': 12, 'Energy': 13
};
```
Ranks range from 1 to 13, and unknown/unmatched types default to 50.

### 2.2 Magic: The Gathering (MTG) Color Sorting
MTG cards must follow the **WUBRG** color sequence (White -> Blue -> Black -> Red -> Green), followed by Multicolor and Colorless.
To prevent collision with Pokémon types and sort Pokémon cards before MTG cards (as expected in mixed-game tests like `F6-TC2`), MTG ranks should start after Pokémon's highest rank (e.g. from 20 onwards):

```javascript
const MTG_COLOR_ORDER = {
  'White': 20,
  'Blue': 21,
  'Black': 22,
  'Red': 23,
  'Green': 24,
  'Multicolor': 25,
  'Colorless': 26
};
```

MTG color category is determined as follows:
- 0 colors (empty `types` array): `'Colorless'`
- 1 color (length 1 `types` array): `types[0]` (e.g. `'White'`, `'Red'`)
- 2 or more colors (length > 1 `types` array): `'Multicolor'`

### 2.3 Required Changes in `backend/src/utils/compartmentSort.js`

#### Update `sortCards()`:
Change the `type-name` branch to check the game:
```javascript
  } else if (sortOrder === 'type-name') {
    sorted.sort((a, b) => {
      const getCardRank = (card) => {
        const game = card.game || 'pokemon';
        const types = card.types || [];
        if (game === 'mtg') {
          let mtgType;
          if (types.length === 0) {
            mtgType = 'Colorless';
          } else if (types.length > 1) {
            mtgType = 'Multicolor';
          } else {
            mtgType = types[0];
          }
          return MTG_COLOR_ORDER[mtgType] || 27;
        } else {
          const pokType = types[0] || 'Unknown';
          return POKEMON_TYPE_ORDER[pokType] || 50;
        }
      };

      const orderA = getCardRank(a);
      const orderB = getCardRank(b);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
```

#### Update `getSortCategory()`:
Ensure that the `type` category generator respects MTG cards:
```javascript
  if (sortOrder.startsWith('type')) {
    const game = card.game || 'pokemon';
    let types = [];
    if (card.types) {
      try {
        types = typeof card.types === 'string' ? JSON.parse(card.types) : card.types;
      } catch (e) {}
    }
    if (!Array.isArray(types)) types = [];

    if (game === 'mtg') {
      if (types.length === 0) return 'Colorless';
      if (types.length > 1) return 'Multicolor';
      return types[0] || 'Colorless';
    } else {
      return types[0] || 'Colorless';
    }
  }
```

#### Update Queries in `compartmentSort.js`
`recommendSlot` and `rebalanceCompartmentByScheme` read existing cards in a compartment/location and sort them. If the retrieved card rows do not contain `game`, they will default to `'pokemon'` in the sorting function. We must select the `game` column from `collection` table:
- **`recommendSlot()`**:
  ```sql
  SELECT c.id as entry_id, c.compartment_id, c.printing, c.language, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number,
         cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil, c.game
  FROM collection c
  JOIN card_cache cc ON c.card_id = cc.id
  WHERE c.user_id = ? AND c.location_id = ?
  ```
- **`rebalanceCompartmentByScheme()`**:
  ```sql
  SELECT c.id, c.printing, c.language, cc.name, cc.supertype, cc.types, cc.rarity, cc.set_name, cc.number,
         cc.price_trend, cc.price_normal, cc.price_holofoil, cc.price_reverse_holofoil, c.game
  FROM collection c JOIN card_cache cc ON c.card_id = cc.id
  WHERE c.compartment_id = ? AND c.user_id = ?
  ```
