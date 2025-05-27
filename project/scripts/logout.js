fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
})
    .then(response => {
        if (response.status === 204) {
            window.location.href = './home.html';
        } else {
            document.getElementById('logout-container').innerText =
                `Ошибка при выходе. Статус: ${response.status}`;
        }
    })
    .catch(error => {
        document.getElementById('logout-container').innerText =
            `Ошибка запроса logout: ${error}`;
    });