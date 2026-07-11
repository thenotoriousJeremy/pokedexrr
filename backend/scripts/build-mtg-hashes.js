/*
 * Build the MTG perceptual-hash database the scanner matches against.
 *
 * Fetches Scryfall's `unique_artwork` bulk (one entry per distinct art),
 * downloads each card's `small` image, computes a 16x16 dHash (256 bits),
 * and writes two files the frontend loads:
 *
 *   frontend/public/mtg-hashes.bin   raw Uint8, N * 32 bytes (hash per card)
 *   frontend/public/mtg-hash-meta.json  { cards: [[name, set, number], ...] }
 *
 * The two arrays are parallel: row i of the .bin is card i of the meta.
 *
 * This is a heavy, one-time build: ~50k images downloaded at --delay ms each
 * (Scryfall asks callers to space requests ~100ms apart), so a full run takes
 * 1-2 hours. Prices/images are NOT stored, only the 32-byte hash + name/set/num.
 *
 * Builds either game (writes {game}-hashes.bin + {game}-hash-meta.json):
 *   --game mtg      (default) Scryfall unique_artwork bulk, no key
 *   --game pokemon  pages pokemontcg.io /cards, uses POKEMON_TCG_API_KEY if set
 *
 * Usage:
 *   node scripts/build-mtg-hashes.js                     full MTG build
 *   node scripts/build-mtg-hashes.js --game pokemon      full Pokémon build
 *   node scripts/build-mtg-hashes.js --limit 200         dev: first 200 cards only
 *   node scripts/build-mtg-hashes.js --delay 150         slower request spacing
 *   node scripts/build-mtg-hashes.js --selftest          run hash asserts, no network
 *
 * Needs `sharp` (build-time dep). Big JSON parse may need more heap:
 *   node --max-old-space-size=2048 scripts/build-mtg-hashes.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
// Load backend/.env so POKEMON_TCG_API_KEY is available when run standalone
// (server.js loads dotenv for the app; this script must do it itself).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ---- dHash spec (MUST stay byte-identical to frontend/src/utils/mtgHashMatch.js) ----
// Resize image to (HASH_W+1) x HASH_W, row-major. luma = 0.299R+0.587G+0.114B.
// bit i = row*HASH_W + col  (col 0..HASH_W-1, row 0..HASH_W-1);
// bit = luma(row,col) > luma(row,col+1). Packed LSB-first into bytes.
const HASH_W = 16;
const HASH_BYTES = (HASH_W * HASH_W) / 8; // 32

// dHash from a raw RGB buffer of a (HASH_W+1) x HASH_W image (length (HASH_W+1)*HASH_W*3).
function dHashFromRaw(buf, stride /* pixels per row = HASH_W+1 */) {
  const out = new Uint8Array(HASH_BYTES);
  for (let row = 0; row < HASH_W; row++) {
    for (let col = 0; col < HASH_W; col++) {
      const iL = (row * stride + col) * 3;
      const iR = (row * stride + col + 1) * 3;
      const lumaL = 0.299 * buf[iL] + 0.587 * buf[iL + 1] + 0.114 * buf[iL + 2];
      const lumaR = 0.299 * buf[iR] + 0.587 * buf[iR + 1] + 0.114 * buf[iR + 2];
      if (lumaL > lumaR) {
        const bit = row * HASH_W + col;
        out[bit >> 3] |= 1 << (bit & 7);
      }
    }
  }
  return out;
}

function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < HASH_BYTES; i++) {
    let x = a[i] ^ b[i];
    while (x) { d++; x &= x - 1; }
  }
  return d;
}

async function hashImageBuffer(sharp, imgBuf) {
  const raw = await sharp(imgBuf)
    .resize(HASH_W + 1, HASH_W, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
  return dHashFromRaw(raw, HASH_W + 1);
}

// ---- deterministic self-check (ponytail: the one runnable check for the hash logic) ----
function selftest() {
  const stride = HASH_W + 1;
  const px = stride * HASH_W * 3;
  // Horizontal gradient: luma increases left->right, so left < right => all bits 0.
  const grad = Buffer.alloc(px);
  for (let row = 0; row < HASH_W; row++) {
    for (let col = 0; col < stride; col++) {
      const v = Math.round((col / stride) * 255);
      const o = (row * stride + col) * 3;
      grad[o] = v; grad[o + 1] = v; grad[o + 2] = v;
    }
  }
  const h1 = dHashFromRaw(grad, stride);
  const assert = (c, m) => { if (!c) { throw new Error('selftest FAIL: ' + m); } };
  assert(hamming(h1, h1) === 0, 'self-distance must be 0');
  assert(h1.every(b => b === 0), 'increasing gradient => all bits 0');

  // Reversed gradient (decreasing): left > right => all bits 1.
  const rev = Buffer.alloc(px);
  for (let row = 0; row < HASH_W; row++) {
    for (let col = 0; col < stride; col++) {
      const v = 255 - Math.round((col / stride) * 255);
      const o = (row * stride + col) * 3;
      rev[o] = v; rev[o + 1] = v; rev[o + 2] = v;
    }
  }
  const h2 = dHashFromRaw(rev, stride);
  assert(hamming(h1, h2) === HASH_W * HASH_W, 'opposite gradients => max distance 256');

  // One flipped column pair => small distance.
  const nudged = Buffer.from(grad);
  const o = (0 * stride + 0) * 3;
  nudged[o] = 255; nudged[o + 1] = 255; nudged[o + 2] = 255; // pixel(0,0) now > pixel(0,1)
  const h3 = dHashFromRaw(nudged, stride);
  assert(hamming(h1, h3) === 1, 'single perturbation => distance 1');

  console.log('selftest OK (dHash + hamming: 3 asserts passed)');
}

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (flag, def) => {
    const i = a.indexOf(flag);
    return i >= 0 && a[i + 1] ? a[i + 1] : def;
  };
  return {
    selftest: a.includes('--selftest'),
    game: get('--game', 'mtg'),
    limit: parseInt(get('--limit', '0'), 10) || 0,
    delay: parseInt(get('--delay', '100'), 10),
    out: get('--out', path.join(__dirname, '..', '..', 'frontend', 'public')),
  };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Gather the card list to hash: [{ name, set, number, img }]. img is a small
// image URL. Each game has its own source.

// MTG: Scryfall's unique_artwork bulk is a single JSON file with every distinct
// art and its image URLs — one request, no key.
async function gatherMtg(http) {
  console.log('Fetching Scryfall bulk-data index...');
  const bulkIndex = await http.get('https://api.scryfall.com/bulk-data');
  const entry = (bulkIndex.data.data || []).find(d => d.type === 'unique_artwork');
  if (!entry) throw new Error('unique_artwork bulk entry not found');
  console.log(`Downloading ${entry.type} (${(entry.size / 1e6).toFixed(0)} MB): ${entry.download_uri}`);
  const bulkResp = await http.get(entry.download_uri, { responseType: 'json' });
  const cards = bulkResp.data;
  console.log(`Bulk contains ${cards.length} cards.`);
  const imgOf = (c) => c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || null;
  return cards
    .filter(imgOf)
    .map(c => ({ name: c.name || '', set: c.set || '', number: c.collector_number || '', img: imgOf(c) }));
}

// Pokémon: pokemontcg.io has no bulk file, so page /cards (250 at a time),
// selecting only the fields we need. Uses POKEMON_TCG_API_KEY if set (higher
// rate limits); ~82 pages either way. Images come from the CDN, unthrottled.
async function gatherPokemon(http, delay, limit) {
  const key = process.env.POKEMON_TCG_API_KEY || '';
  const headers = key ? { 'X-Api-Key': key } : {};
  if (!key) console.warn('No POKEMON_TCG_API_KEY set — paging may throttle. A key is recommended for the full build.');
  console.log(`Paging pokemontcg.io /cards${key ? ' (with API key)' : ' (no key)'}...`);
  const out = [];
  let page = 1;
  let total = Infinity;
  while ((page - 1) * 250 < total) {
    // pokemontcg.io is slow/flaky under load, so retry each page with exponential
    // backoff (2s, 4s, 8s, 16s) before giving up.
    let data = null;
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && data === null; attempt++) {
      try {
        const r = await http.get('https://api.pokemontcg.io/v2/cards', {
          params: { page, pageSize: 250, select: 'id,name,number,set,images' },
          headers,
          timeout: 30000,
        });
        total = r.data.totalCount || 0;
        data = r.data.data || [];
      } catch (e) {
        if (attempt === MAX_ATTEMPTS - 1) throw e;
        console.warn(`  page ${page} attempt ${attempt + 1} failed (${e.message}); retrying...`);
        await sleep(2000 * Math.pow(2, attempt));
      }
    }
    if (data.length === 0) break;
    for (const c of data) {
      const img = c.images?.small;
      if (img) out.push({ name: c.name || '', set: c.set?.id || '', number: c.number || '', img });
    }
    console.log(`  page ${page} (${out.length}/${total})`);
    if (limit && out.length >= limit) break; // dev: stop early for --limit smoke tests
    page++;
    await sleep(delay);
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  if (opts.selftest) { selftest(); return; }

  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('sharp is required for the build. Install it: npm i -D sharp');
    process.exit(1);
  }

  const game = opts.game;
  if (game !== 'mtg' && game !== 'pokemon') {
    console.error(`Unknown --game "${game}". Use mtg or pokemon.`);
    process.exit(1);
  }

  const http = axios.create({
    timeout: 20000,
    headers: { 'User-Agent': 'CardDexrr/1.0', 'Accept': 'application/json' },
  });

  let cards = game === 'pokemon' ? await gatherPokemon(http, opts.delay, opts.limit) : await gatherMtg(http);
  if (opts.limit) cards = cards.slice(0, opts.limit);
  console.log(`Hashing ${cards.length} ${game} cards (delay ${opts.delay}ms, est ${(cards.length * opts.delay / 60000).toFixed(0)} min)...`);

  const hashes = Buffer.alloc(cards.length * HASH_BYTES);
  const meta = [];
  let ok = 0, fail = 0;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    try {
      const imgResp = await http.get(c.img, { responseType: 'arraybuffer', timeout: 20000 });
      const hash = await hashImageBuffer(sharp, Buffer.from(imgResp.data));
      Buffer.from(hash).copy(hashes, meta.length * HASH_BYTES);
      meta.push([c.name, c.set, c.number]);
      ok++;
    } catch (e) {
      fail++;
    }
    if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/${cards.length} (ok ${ok}, fail ${fail})`);
    await sleep(opts.delay);
  }

  // Trim the hash buffer to the rows we actually wrote (failures were skipped).
  const finalHashes = hashes.subarray(0, meta.length * HASH_BYTES);

  fs.mkdirSync(opts.out, { recursive: true });
  const binPath = path.join(opts.out, `${game}-hashes.bin`);
  const metaPath = path.join(opts.out, `${game}-hash-meta.json`);
  fs.writeFileSync(binPath, finalHashes);
  fs.writeFileSync(metaPath, JSON.stringify({ w: HASH_W, cards: meta }));
  console.log(`Wrote ${meta.length} hashes (${fail} failed).`);
  console.log(`  ${binPath} (${(finalHashes.length / 1e6).toFixed(2)} MB)`);
  console.log(`  ${metaPath} (${(fs.statSync(metaPath).size / 1e6).toFixed(2)} MB)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
