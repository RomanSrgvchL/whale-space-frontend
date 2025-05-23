document.getElementById('registration-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const messageElement = document.getElementById('message');

    if (password !== confirmPassword) {
        messageElement.style.color = 'red';
        messageElement.textContent = 'Подтвердите пароль';
        return;
    }

    const registrationData = {
        username: username,
        password: password
    };

    try {
        const response = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.status === 201) {
            messageElement.style.color = 'green';
            messageElement.textContent = result.message;
            window.location.href = './login.html';
        } else {
            messageElement.style.color = 'red';
            messageElement.textContent = result.message.replace(/;/g, '\n');
        }
    } catch (error) {
        messageElement.style.color = 'red';
        messageElement.textContent = 'Error: ' + error.message;
    }
});