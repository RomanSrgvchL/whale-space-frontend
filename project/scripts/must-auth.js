fetch('http://localhost:8080/api/auth/check', {
    method: 'GET',
    credentials: 'include'
})
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return {success: false};
        }
    })
    .then(data => {
        if (!data.success) {
            window.location.href = './home.html';
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        window.location.href = './home.html';
    });
