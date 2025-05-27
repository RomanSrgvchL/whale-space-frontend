document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');
    
    const loginData = {
        username: username,
        password: password
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            messageElement.style.color = 'green';
            messageElement.textContent = result.message;
            setTimeout(() => {
                window.location.href = './home.html';
            }, 750);
        } else {
            messageElement.style.color = 'red';
            messageElement.textContent = result.message;
        }
    } catch (error) {
        messageElement.style.color = 'red';
        messageElement.textContent = 'Error: ' + error.message;
    }
});