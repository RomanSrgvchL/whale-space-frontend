fetch(`${API_BASE_URL}/auth/check`, {
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
        if (data.success) {
            window.location.href = '/home';
        }
    })
    .catch(error => {
    console.error('Ошибка:', error);
    window.location.href = '/home';
});
