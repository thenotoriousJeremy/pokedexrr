// Deck decklist text <-> card list. Export builds standard formats that paste
// into Pokémon TCG Live (ptcgl), MTG Arena (mtga), or a plain generic list.
// parseDeckLine is the inverse used by import so the app round-trips its own
// export (and tolerates lists copied out of those tools).

// ponytail: set code is the raw stored set_id uppercased. PTCGL/MTGA use their
// own set abbreviations that don't always equal our set_id; import matches by
// name so this stays correct on re-import, but a foreign tool may want the
// user to fix the code. Good enough until someone needs exact PTCGL codes.
function cardLine(c, format) {
  const set = String(c.set_id || c.set_code || '').toUpperCase();
  const num = c.number || '';
  if (format === 'mtga') return `${c.quantity} ${c.name}${set ? ` (${set})` : ''}${num ? ` ${num}` : ''}`;
  if (format === 'ptcgl') return `${c.quantity} ${c.name}${set ? ` ${set}` : ''}${num ? ` ${num}` : ''}`;
  return `${c.quantity} ${c.name}`; // plain
}

export function buildDeckExport(cards, format = 'ptcgl') {
  if (!cards || !cards.length) return '';

  // Buylist: only the copies the deck needs beyond what's already owned,
  // as TCGplayer Mass Entry lines ("2 Card Name"). owned_qty comes from the
  // deck detail query.
  if (format === 'buylist') {
    return cards
      .map(c => ({ name: c.name, need: Math.max(0, (c.quantity || 0) - (c.owned_qty || 0)) }))
      .filter(c => c.need > 0)
      .map(c => `${c.need} ${c.name}`)
      .join('\n');
  }

  if (format === 'ptcgl') {
    const groups = { 'Pokémon': [], 'Trainer': [], 'Energy': [] };
    for (const c of cards) {
      const st = String(c.supertype || '').toLowerCase();
      if (st.includes('pok')) groups['Pokémon'].push(c);
      else if (st.includes('energy')) groups['Energy'].push(c);
      else groups['Trainer'].push(c);
    }
    const out = [];
    for (const key of ['Pokémon', 'Trainer', 'Energy']) {
      const g = groups[key];
      if (!g.length) continue;
      const count = g.reduce((s, c) => s + c.quantity, 0);
      out.push(`${key}: ${count}`);
      g.forEach(c => out.push(cardLine(c, 'ptcgl')));
      out.push('');
    }
    out.push(`Total Cards: ${cards.reduce((s, c) => s + c.quantity, 0)}`);
    return out.join('\n');
  }

  if (format === 'mtga') {
    return 'Deck\n' + cards.map(c => cardLine(c, 'mtga')).join('\n');
  }

  return cards.map(c => cardLine(c, 'plain')).join('\n');
}

// Pull {qty, name} out of one decklist line, stripping trailing set code +
// collector number so "4 Pikachu ex SVI 63", "4 Lightning Bolt (2X2) 117",
// "2 Pikachu (SVI) #63" and "4 Pikachu" all yield the bare card name.
export function parseDeckLine(line) {
  const m = String(line).trim().match(/^(\d+)x?\s+(.+)$/i);
  if (!m) return null;
  const qty = parseInt(m[1], 10);
  let name = m[2];

  // PTCGL "name SETCODE number" — anchored on BOTH so it never eats a name
  // that legitimately ends in an uppercase token ("Pikachu V", "Mewtwo GX").
  const ptcgl = name.match(/^(.+?)\s+[A-Z]{2,4}\s+\d+[a-zA-Z]?$/);
  if (ptcgl) name = ptcgl[1];

  name = name
    .replace(/\s*\([^)]*\)/g, '')          // "(SVI)" / "(2X2)"
    .replace(/\s*#\d+[a-zA-Z]?\s*$/, '')   // "#63"
    .replace(/\s+\d+[a-zA-Z]?$/, '')       // trailing bare collector number
    .trim();

  return name ? { qty, name } : null;
}
