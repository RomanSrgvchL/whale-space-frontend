fetch('./navbar.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('navbar').innerHTML = data;
        updateNavbar();
    })
    .catch(error => {
        console.error('Ошибка при загрузке navbar:', error);
    });

function updateNavbar() {
    checkAuth()
        .then(data => {
            setNavbarFromResponse(data);
        })
        .catch(() => {
            setNavbarFromResponse({success: false});
        });
}

function checkAuth() {
    return fetch(`${API_BASE_URL}/auth/check`, {
        method: 'GET',
        credentials: 'include'
    })
        .then(response => response.json());
}

function setNavbarFromResponse(data) {
    const rightSide = document.querySelector('.right-side');
    const leftSide = document.querySelector('.left-side');
    rightSide.innerHTML = '';
    leftSide.innerHTML = `
        <a href="../pages/home.html">Главная</a>
        <a href="../pages/discussions.html">Обсуждения</a>
<!--        <a href="../pages/blogs.html">Блоги</a>-->
        <a href="../pages/users.html">Пользователи</a>
    `;

    if (data.success) {
        rightSide.innerHTML = `
            <a href="../pages/messages.html">Сообщения</a>
            <a href="../pages/profile.html">Профиль</a>
            <a href="../pages/logout.html">Выйти</a>
        `;
    } else {
        rightSide.innerHTML = `
            <a href="../pages/login.html">Войти</a>
            <a href="../pages/registration.html">Зарегистрироваться</a>
        `;
    }
}
