// Deep search links to the marketplaces a card's price comes from. We don't
// store the exact product URL (would need a schema column + backfill + every
// card query to carry it); a name+set+number search lands on the right product
// for effectively every card and works for already-cached rows today.
// ponytail: search link, not the exact listing. Add a stored tcgplayer_url
// column + backfill if pixel-exact "same listing the price came from" matters.
function cardGame(card) {
  return card?.game || (card?.supertype === 'MTG' ? 'mtg' : 'pokemon');
}

function query(card) {
  return [card?.name, card?.set_name, card?.number].filter(Boolean).join(' ').trim();
}

export function tcgplayerUrl(card) {
  const line = cardGame(card) === 'mtg' ? 'magic' : 'pokemon';
  return `https://www.tcgplayer.com/search/${line}/product?q=${encodeURIComponent(query(card))}`;
}

export function cardmarketUrl(card) {
  const game = cardGame(card) === 'mtg' ? 'Magic' : 'Pokemon';
  return `https://www.cardmarket.com/en/${game}/Products/Search?searchString=${encodeURIComponent(card?.name || '')}`;
}
