// Demo mode: no backend. Seed a fake logged-in admin and answer every /api
// request from captured JSON fixtures so the static GitHub Pages build is a
// read-only tour of the real UI. Only bundled when VITE_DEMO is set (see
// main.jsx guard) so production/mobile builds carry none of this.

// Route = '/api/' + fixture basename with '_' -> '/'. Capture filenames were
// chosen so this mapping is exact: stats_history -> /api/stats/history,
// locations_43_compartments -> /api/locations/43/compartments, etc.
const files = import.meta.glob('./fixtures/*.json', { eager: true, import: 'default' });
const routes = {};
for (const [path, data] of Object.entries(files)) {
  const base = path.replace(/^.*\/fixtures\//, '').replace(/\.json$/, '');
  routes['/api/' + base.replace(/_/g, '/')] = data;
}

// Pretend an admin is logged in so App skips the login screen and every tab
// (including Admin) is reachable. No real token/secret involved.
localStorage.setItem('bindarr_token', 'demo');
localStorage.setItem('bindarr_user', JSON.stringify({ username: 'demo', role: 'admin' }));

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const orig = window.fetch.bind(window);

window.fetch = (input, opts = {}) => {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  // Non-API traffic (fonts, Scryfall card images) still hits the network.
  if (!url.includes('/api/')) return orig(input, opts);

  const method = (opts.method || 'GET').toUpperCase();
  const path = (url.replace(/^https?:\/\/[^/]+/, '').split('?')[0].replace(/\/+$/, '')) || '/';

  if (method === 'GET' && routes[path]) return Promise.resolve(json(routes[path]));

  // Writes and un-captured GETs: never persist. Return a benign empty shape so
  // views render instead of crashing. List-ish paths get [], everything else {}.
  if (method === 'GET') {
    const listish = /\/(collection|locations|decks|sets|search|users|compartments)/.test(path);
    return Promise.resolve(json(listish ? [] : {}));
  }
  return Promise.resolve(json({ message: 'Demo mode: changes are not saved.' }));
};
