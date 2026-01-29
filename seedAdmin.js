
async function seedAdmin() {
    try {
        const res = await fetch('http://localhost:5000/api/auth/seed-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'seller123@gmail.com',
                password: 'seller123@gmail.com'
            })
        });
        const data = await res.json();
        console.log(data);
    } catch (err) {
        console.error(err.message);
    }
}

seedAdmin();
