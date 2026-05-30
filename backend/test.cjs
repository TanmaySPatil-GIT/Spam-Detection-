fetch('http://localhost:5000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        phoneNumber: '18005550199',
        simulateText: 'free free free win lottery now urgent otp bank account! Give me your bank!'
    })
}).then(r => r.json()).then(data => {
    console.log(JSON.stringify(data, null, 2));
});
