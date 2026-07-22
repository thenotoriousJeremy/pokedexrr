// In-app management of the GLOBAL scan indexes (whole-game CLIP + ORB DBs used
// when a scan has no set hint). Building these is heavy (tens of thousands of
// images, the CLIP model on CPU, ~1GB output, hours), so we reuse the existing,
// battle-tested build scripts rather than reimplement them: spawn each as a
// child process, parse its stdout for progress, write to a staging dir, then
// swap the finished files over the live ones and evict the in-memory caches.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const scanMatch = require('./scanMatch');
const embedMatch = require('./embedMatch');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const GAMES = ['mtg', 'pokemon'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// The files each build kind produces, relative to the data dir.
const FILES = {
  embed: (g) => [`${g}-embed.bin`, `${g}-embed-meta.json`],
  orb: (g) => [`${g}-orb-desc.bin`, `${g}-orb-kp.bin`, `${g}-orb-meta.json`],
};

const progress = {};   // game -> { phase:'embed'|'orb'|'done', done, total, status, error?, startedAt }
const running = {};    // game -> ChildProcess | null

function statOf(name) {
  try { const st = fs.statSync(path.join(DATA_DIR, name)); return { size: st.size, mtime: st.mtimeMs }; }
  catch { return null; }
}

// On-disk status per game: for each kind, whether it's built, byte size,
// card/row count, and build time. Drives the admin table.
function listGlobals() {
  return GAMES.map((game) => {
    const kinds = {};
    for (const kind of ['embed', 'orb']) {
      const stats = FILES[kind](game).map(statOf);
      const present = stats.every(Boolean);
      const bytes = stats.reduce((s, x) => s + (x ? x.size : 0), 0);
      const builtAt = stats.reduce((m, x) => Math.max(m, x ? x.mtime : 0), 0);
      let cards = 0;
      try { cards = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${game}-${kind === 'embed' ? 'embed' : 'orb'}-meta.json`))).cards.length; }
      catch { /* not built yet */ }
      kinds[kind] = { present, bytes, builtAt, cards };
    }
    return { game, embed: kinds.embed, orb: kinds.orb };
  });
}

function getProgress() { return progress; }

function parseLine(game, line) {
  const p = progress[game];
  if (!p) return;
  const tot = line.match(/of (\d+) (?:mtg|pokemon) cards/);
  if (tot) p.total = +tot[1];
  const cur = line.match(/^\s*(\d+)\/(\d+)/);
  if (cur) { p.done = +cur[1]; p.total = +cur[2]; }
}

function runScript(game, kind, stagingDir) {
  return new Promise((resolve, reject) => {
    const script = kind === 'embed' ? 'build-card-embeddings.mjs' : 'build-card-orb.mjs';
    const child = spawn(process.execPath, [path.join(SCRIPTS_DIR, script), '--game', game], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, INDEX_OUT_DIR: stagingDir },
    });
    running[game] = child;
    Object.assign(progress[game], { phase: kind, done: 0, total: 0 });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const ln of lines) { parseLine(game, ln); console.log(`[global ${game}/${kind}] ${ln}`); }
    });
    child.stderr.on('data', (d) => { progress[game].lastErr = d.toString().slice(-800); });
    child.on('error', reject);
    child.on('close', (code) => {
      running[game] = null;
      if (code === 0) resolve();
      else reject(new Error(`${script} exited ${code}: ${progress[game].lastErr || ''}`));
    });
  });
}

// ponytail: reload() closes the live ORB file descriptors first — Windows can't
// rename over a file with an open handle. A scan starting in the tiny window
// before the rename may reopen the old file, so retry the rename briefly.
async function swapFile(from, to) {
  for (let i = 0; ; i++) {
    try { fs.renameSync(from, to); return; }
    catch (e) { if (i >= 15) throw e; await sleep(300); }
  }
}

async function build(game) {
  const staging = path.join(DATA_DIR, `.staging-${game}`);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  progress[game] = { phase: 'embed', done: 0, total: 0, status: 'running', startedAt: Date.now() };
  try {
    await runScript(game, 'embed', staging);   // CLIP embeddings
    await runScript(game, 'orb', staging);      // ORB descriptors
    embedMatch.reload(game);                    // drop caches + close fds before swap
    scanMatch.reload(game);
    for (const kind of ['embed', 'orb']) {
      for (const name of FILES[kind](game)) {
        const from = path.join(staging, name);
        if (fs.existsSync(from)) await swapFile(from, path.join(DATA_DIR, name));
      }
    }
    fs.rmSync(staging, { recursive: true, force: true });
    progress[game] = { ...progress[game], phase: 'done', status: 'done' };
    console.log(`globalIndex: ${game} rebuilt`);
  } catch (e) {
    running[game] = null;
    fs.rmSync(staging, { recursive: true, force: true });
    progress[game] = { ...progress[game], status: 'error', error: e.message };
    console.error(`globalIndex: ${game} build failed: ${e.message}`);
  }
}

// Start a background rebuild of both DBs for a game. No-op if one is running.
function startBuild(game) {
  if (!GAMES.includes(game)) throw new Error('invalid game');
  if (running[game]) return false;
  build(game);
  return true;
}

// Kill an in-flight build. Staged (partial) files are cleaned up by build()'s
// catch via the killed child's non-zero exit; the live DB is untouched.
function stopBuild(game) {
  const child = running[game];
  if (child) child.kill();
  return !!child;
}

module.exports = { listGlobals, getProgress, startBuild, stopBuild };
