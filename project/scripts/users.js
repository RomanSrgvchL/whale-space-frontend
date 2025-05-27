function redirectWithDelay(url, delay = 750) {
    setTimeout(() => {
        window.location.href = url;
    }, delay);
}

function initiateChatWithUser(inputUsername, currentUser) {
    const resultMessage = document.getElementById('message');

    // Получаем id второго пользователя по имени
    fetch(`${API_BASE_URL}/people/byName`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({username: inputUsername})
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
                const userId1 = currentUser.id;
                const userId2 = targetUser.id;

                // Проверяем, существует ли чат
                fetch(`${API_BASE_URL}/chats/byUsers/${userId1}-${userId2}`, {
                    method: 'GET',
                    credentials: 'include'
                })
                    .then(chatRes => {
                        if (chatRes.status === 404) {
                            // Чат не найден — создаём
                            fetch(`${API_BASE_URL}/chats/create/${userId1}-${userId2}`, {
                                method: 'POST',
                                credentials: 'include'
                            })
                                .then(createRes => {
                                    if (createRes.status === 201) {
                                        return createRes.json();
                                    } else {
                                        throw new Error('Ошибка создания чата');
                                    }
                                })
                                .then(chatId => {
                                    redirectWithDelay(`./chat.html?id=${chatId}`);
                                })
                                .catch(error => {
                                    resultMessage.textContent = 'Ошибка при создании чата';
                                    resultMessage.style.color = 'red';
                                    console.error(error);
                                });
                        } else if (chatRes.ok) {
                            chatRes.json().then(chatId => {
                                redirectWithDelay(`./chat.html?id=${chatId}`);
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

fetch(`${API_BASE_URL}/people/createdAtDesc`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include'
})
    .then(response => response.json())
    .then(people => {
        const peopleContainer = document.getElementById('people');
        people.forEach(person => {
            const role = person.role.replace(/^ROLE_/, '');
            const createdAt = new Date(person.createdAt).toLocaleString();
            const personDiv = document.createElement('div');
            personDiv.classList.add('person-card');
            personDiv.innerHTML = `
            <div class="person-info">
                <p class="username">${person.username}</p>
                <p class="registered-label">
                    Дата регистрации:<br>
                    <span class="date">${createdAt}</span>
                </p>
                <p class="role">${role}</p>
            </div>
             `;
            peopleContainer.appendChild(personDiv);
        });

        document.getElementById('start-dialog-form').addEventListener('submit', (event) => {
            event.preventDefault();

            const input = document.getElementById('username-input').value.trim();
            const resultMessage = document.getElementById('message');

            // Сначала проверка авторизации
            fetch(`${API_BASE_URL}/auth/check`, {
                method: 'GET',
                credentials: 'include'
            })
                .then(authResponse => {
                    if (!authResponse.ok) {
                        resultMessage.textContent = 'Авторизуйтесь чтобы написать пользователю';
                        resultMessage.style.color = 'red';
                        return;
                    }

                    // Запрос на получение имени текущего пользователя
                    fetch(`${API_BASE_URL}/people/yourself`, {
                        method: 'GET',
                        credentials: 'include'
                    })
                        .then(response => response.json())
                        .then(data => {
                            const currentUsername = data.username;

                            if (!input) {
                                resultMessage.textContent = 'Введите имя пользователя';
                                resultMessage.style.color = 'red';
                                return;
                            }

                            if (input === currentUsername) {
                                resultMessage.textContent = 'Вы не можете написать самому себе';
                                resultMessage.style.color = 'red';
                                return;
                            }

                            const userExists = people.some(person => person.username === input);
                            if (userExists) {
                                initiateChatWithUser(input, data);
                            } else {
                                resultMessage.textContent = `Пользователь "${input}" не найден`;
                                resultMessage.style.color = 'red';
                            }
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
    })
    .catch(error => {
        console.error('Ошибка загрузки пользователей:', error);
    });
