function redirectWithDelay(url, delay = 750) {
    setTimeout(() => {
        window.location.href = url;
    }, delay);
}

function initiateChatWithUser(inputUsername, currentUser) {
    const resultMessage = document.getElementById('message');

    // Получаем id второго пользователя по имени
    fetch(`${API_BASE_URL}/people/username/${encodeURIComponent(inputUsername)}`, {
        credentials: 'include',
    })
        .then(userRes => {
            if (userRes.status === 404) {
                resultMessage.textContent = `Пользователь "${inputUsername}" не найден`;
                resultMessage.style.color = 'red';
                return;
            }

            resultMessage.textContent = `Пользователь "${inputUsername}" найден!`;
            resultMessage.style.color = 'green';

            return userRes.json().then(targetUser => {
                const user1Id = currentUser.id;
                const user2Id = targetUser.id;

                // Проверяем, существует ли чат
                fetch(`${API_BASE_URL}/chats/between?user1Id=${user1Id}&user2Id=${user2Id}`, {
                    credentials: 'include'
                })
                    .then(chatRes => {
                        if (chatRes.status === 404) {
                            // Чат не найден — создаём
                            fetch(`${API_BASE_URL}/chats`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    user1Id: user1Id,
                                    user2Id: user2Id
                                })
                            })
                                .then(createRes => {
                                    if (createRes.status === 201) {
                                        return createRes.json();
                                    } else {
                                        throw new Error('Ошибка создания чата');
                                    }
                                })
                                .then(chatDto => {
                                    redirectWithDelay(`./chat.html?id=${chatDto.id}`);
                                })
                                .catch(error => {
                                    resultMessage.textContent = 'Ошибка при создании чата';
                                    resultMessage.style.color = 'red';
                                    console.error(error);
                                });
                        } else if (chatRes.ok) {
                            chatRes.json().then(chatDto => {
                                redirectWithDelay(`./chat.html?id=${chatDto.id}`);
                            });
                        } else {
                            throw new Error('Ошибка получения чата');
                        }
                    })
                    .catch(error => {
                        resultMessage.textContent = 'Ошибка при получении/создании чата';
                        resultMessage.style.color = 'red';
                        console.error(error);
                    });
            });
        });
}


/* ==== ПАГИНАЦИЯ ==== */
const PAGE_SIZE = 6;
let sortField = 'createdAt';
let sortOrder = 'desc';
let currentPage = 0;
let totalPages = 0;

document.addEventListener('DOMContentLoaded', () => {
    setupSortControls();
    loadPage(0);
    attachStartDialogHandler();
});

function setupSortControls() {
    const sortButtons = document.querySelectorAll('#sort-controls button');

    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.dataset.sort) {
                if (sortField !== button.dataset.sort) {
                    sortField = button.dataset.sort;
                    currentPage = 0;
                    updateSortButtons();
                    loadPage(currentPage);
                }
            } else if (button.dataset.order) {
                if (sortOrder !== button.dataset.order) {
                    sortOrder = button.dataset.order;
                    currentPage = 0;
                    updateSortButtons();
                    loadPage(currentPage);
                }
            }
        });
    });

    updateSortButtons();
}

function updateSortButtons() {
    const sortButtons = document.querySelectorAll('#sort-controls button');
    sortButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.sort === sortField) {
            button.classList.add('active');
        }
        if (button.dataset.order === sortOrder) {
            button.classList.add('active');
        }
    });
}

function loadPage(pageIndex) {
    const peopleContainer = document.getElementById('people');
    peopleContainer.innerHTML = '';

    const resultMessage = document.getElementById('message');
    resultMessage.textContent = '';

    fetch(`${API_BASE_URL}/people?page=${pageIndex}&size=${PAGE_SIZE}&sort=${sortField}&order=${sortOrder}`, {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при загрузке пользователей');
            }
            return response.json();
        })
        .then(data => {
            const people = data.content;
            totalPages = data.totalPages;
            currentPage = pageIndex;

            renderPeople(people);
            renderPagination();
        })
        .catch(error => {
            console.error('Ошибка загрузки пользователей:', error);
            resultMessage.textContent = 'Ошибка загрузки пользователей';
            resultMessage.style.color = 'red';
        });
}


function renderPeople(people) {
    const peopleContainer = document.getElementById('people');
    people.forEach(person => {
        const role = person.role.replace(/^ROLE_/, '');
        const createdAt = new Date(person.createdAt).toLocaleString();

        const personDiv = document.createElement('div');
        personDiv.classList.add('person-card');

        personDiv.innerHTML = `
            <div class="person-info">
                <div class="avatar-wrapper">
                    <img class="avatar-img" src="../images/white.jpg" alt="">
                </div>
                <p class="username">${person.username}</p>
                <p class="registered-label">
                    Дата регистрации:<br>
                    <span class="date">${createdAt}</span>
                </p>
                <p class="role">${role}</p>
            </div>
        `;

        const avatarImg = personDiv.querySelector('.avatar-img');
        if (person.avatarFileName) {
            fetch(`${API_BASE_URL}/people/avatar/${encodeURIComponent(person.avatarFileName)}`, {
                credentials: 'include',
            })
                .then(res => res.json())
                .then(avatarData => {
                    if (avatarData.success) {
                        avatarImg.src = avatarData.avatarUrl;
                    } else {
                        avatarImg.src = "../images/default.jpg";
                    }
                })
                .catch(() => {
                    avatarImg.src = "../images/default.jpg";
                });
        } else {
            avatarImg.src = "../images/default.jpg";
        }

        peopleContainer.appendChild(personDiv);
    });
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    for (let i = 0; i < totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = (i + 1).toString();
        btn.disabled = (i === currentPage);

        btn.addEventListener('click', () => {
            if (i !== currentPage) {
                loadPage(i);
            }
        });

        paginationContainer.appendChild(btn);
    }
}

function attachStartDialogHandler() {
    const form = document.getElementById('start-dialog-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const input = document.getElementById('username-input').value.trim();
        const resultMessage = document.getElementById('message');

        if (!input) {
            resultMessage.textContent = 'Введите имя пользователя';
            resultMessage.style.color = 'red';
            return;
        }

        // Проверка авторизации
        fetch(`${API_BASE_URL}/auth/check`, {
            credentials: 'include'
        })
            .then(authResponse => {
                if (!authResponse.ok) {
                    resultMessage.textContent = 'Авторизуйтесь чтобы написать пользователю';
                    resultMessage.style.color = 'red';
                    return;
                }

                // Получаем текущего пользователя
                fetch(`${API_BASE_URL}/people/me`, {
                    credentials: 'include'
                })
                    .then(response => response.json())
                    .then(data => {
                        const currentUsername = data.username;

                        if (input.length > 20) {
                            resultMessage.textContent = 'Имя пользователя не может содержать более 20 символов';
                            resultMessage.style.color = 'red';
                            return;
                        }

                        if (input === currentUsername) {
                            resultMessage.textContent = 'Вы не можете написать самому себе';
                            resultMessage.style.color = 'red';
                            return;
                        }

                        const forbiddenCharsPattern = /^(?!.*[;\\\/?&#]).*$/;
                        if (!forbiddenCharsPattern.test(input)) {
                            resultMessage.textContent = 'Имя пользователя содержит запрещённые символы: [;\\/?&#]';
                            resultMessage.style.color = 'red';
                            return;
                        }

                        initiateChatWithUser(input, data);
                    })
                    .catch(error => {
                        console.error('Ошибка при получении данных о текущем пользователе:', error);
                        resultMessage.textContent = 'Ошибка при получении информации о текущем пользователе.';
                        resultMessage.style.color = 'red';
                    });
            })
            .catch(error => {
                console.error('Ошибка при проверке авторизации:', error);
                resultMessage.textContent = 'Ошибка авторизации.';
                resultMessage.style.color = 'red';
            });
    });
}
