
(async () => {
  try {
    const res = await fetch('http://localhost:3001/api/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer a48fa8938e32bd1fe2c875198296c624e3ca364fe8e63ac9bfa9922ec90e0dd5'
      },
      body: JSON.stringify({
        card_id: 'non-existent-id-1234',
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

