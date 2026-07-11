// Client-side card identification by perceptual hash (MTG + Pokémon).
//
// Loads a per-game prebuilt hash DB (public/{game}-hashes.bin +
// {game}-hash-meta.json, built by backend/scripts/build-mtg-hashes.js),
// computes a 16x16 dHash of the captured card canvas, and returns the closest
// matches by Hamming distance.
//
// The dHash spec MUST stay byte-identical to the build script, or distances are
// meaningless: resize to (HASH_W+1) x HASH_W, luma = 0.299R+0.587G+0.114B,
// bit i = row*HASH_W+col => luma(row,col) > luma(row,col+1), packed LSB-first.
const HASH_W = 16;
const HASH_BYTES = (HASH_W * HASH_W) / 8; // 32

// popcount lookup for a byte, so Hamming over the DB is a few table reads/row.
const POPCOUNT = new Uint8Array(256);
for (let i = 0; i < 256; i++) POPCOUNT[i] = (i & 1) + POPCOUNT[i >> 1];

const dbs = {};          // game -> { hashes: Uint8Array (N*32), cards: [[name,set,num],...], n }
const loadPromises = {}; // game -> in-flight load, so concurrent callers share one fetch

// dHash a canvas. Draws it into a tiny (HASH_W+1) x HASH_W canvas (browser does
// the downscale), reads RGBA, and packs the difference bits.
function hashCanvas(sourceCanvas) {
  const c = document.createElement('canvas');
  c.width = HASH_W + 1;
  c.height = HASH_W;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, HASH_W + 1, HASH_W);
  const data = ctx.getImageData(0, 0, HASH_W + 1, HASH_W).data; // RGBA row-major
  const stride = HASH_W + 1;
  const out = new Uint8Array(HASH_BYTES);
  for (let row = 0; row < HASH_W; row++) {
    for (let col = 0; col < HASH_W; col++) {
      const iL = (row * stride + col) * 4;
      const iR = (row * stride + col + 1) * 4;
      const lumaL = 0.299 * data[iL] + 0.587 * data[iL + 1] + 0.114 * data[iL + 2];
      const lumaR = 0.299 * data[iR] + 0.587 * data[iR + 1] + 0.114 * data[iR + 2];
      if (lumaL > lumaR) {
        const bit = row * HASH_W + col;
        out[bit >> 3] |= 1 << (bit & 7);
      }
    }
  }
  return out;
}

export function isReady(game) {
  return !!dbs[game];
}

// Fetch + parse a game's hash DB once. Safe to call repeatedly (idempotent).
// Returns true on success, false if the DB is absent (build not run yet).
export async function loadHashDb(game) {
  if (dbs[game]) return true;
  if (loadPromises[game]) return loadPromises[game];
  loadPromises[game] = (async () => {
    try {
      const [binResp, metaResp] = await Promise.all([
        fetch(`/${game}-hashes.bin`),
        fetch(`/${game}-hash-meta.json`),
      ]);
      if (!binResp.ok || !metaResp.ok) return false;
      const hashes = new Uint8Array(await binResp.arrayBuffer());
      const meta = await metaResp.json();
      if (meta.w !== HASH_W) throw new Error(`hash width mismatch: db=${meta.w} client=${HASH_W}`);
      const n = meta.cards.length;
      if (hashes.length !== n * HASH_BYTES) {
        throw new Error(`hash count mismatch: bin=${hashes.length / HASH_BYTES} meta=${n}`);
      }
      dbs[game] = { hashes, cards: meta.cards, n };
      return true;
    } catch (e) {
      console.warn(`${game} hash DB load failed:`, e.message);
      return false;
    } finally {
      loadPromises[game] = null;
    }
  })();
  return loadPromises[game];
}

// Identify a captured card canvas against a game's DB. Returns up to topK
// candidates sorted by ascending Hamming distance: [{ name, set, number,
// distance }]. Empty if the DB isn't loaded. distance is 0-256; lower is closer
// (a clean match is typically < ~40, scan noise dominates so this is a
// shortlist, not a verdict).
export function match(sourceCanvas, game, topK = 6) {
  const db = dbs[game];
  if (!db) return [];
  const probe = hashCanvas(sourceCanvas);
  const { hashes, cards, n } = db;

  // Track the topK smallest distances with a simple insertion into a small array.
  const best = []; // sorted ascending, length <= topK
  for (let r = 0; r < n; r++) {
    const base = r * HASH_BYTES;
    let d = 0;
    for (let b = 0; b < HASH_BYTES; b++) d += POPCOUNT[probe[b] ^ hashes[base + b]];
    if (best.length < topK || d < best[best.length - 1].distance) {
      const row = cards[r];
      const cand = { name: row[0], set: row[1], number: row[2], distance: d };
      let pos = best.length;
      while (pos > 0 && best[pos - 1].distance > d) pos--;
      best.splice(pos, 0, cand);
      if (best.length > topK) best.pop();
    }
  }
  return best;
}
