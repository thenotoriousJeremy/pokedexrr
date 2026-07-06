
(async () => {
  try {
    const res = await fetch('http://localhost:3001/api/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 08178d29d039032f6ce3876b80d8d6404ce5adabb26807ba'
      },
      body: JSON.stringify({
        card_id: 'base1-1',
        quantity: 1,
        condition: 'Near Mint',
        printing: 'Normal',
        language: 'English',
        purchase_price: 0,
        location_id: null
      })
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response:', json);
  } catch (e) {
    console.error('Error:', e);
  }
})();

