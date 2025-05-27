fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
})
    .then(() => {
        window.location.href = './home.html';
    })
    .catch(error => {
        document.getElementById('logout-container').innerText =
            `Ошибка запроса logout: ${error}`;
    });