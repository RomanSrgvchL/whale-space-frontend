function initiateChatWithUser(inputUsername, currentUser) {
    const resultMessage = document.getElementById('resultMessage');

    // Получаем id второго пользователя по имени
    fetch('http://localhost:8080/api/people/byName', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username: inputUsername })
    })
        .then(userRes => {
            if (userRes.status === 404) {
                resultMessage.textContent = `Пользователь "${inputUsername}" не существует`;
                resultMessage.style.color = 'red';
                return;
            }
            return userRes.json().then(targetUser => {
                const userId1 = currentUser.id;
                const userId2 = targetUser.id;

                // Проверяем, существует ли чат
                fetch(`http://localhost:8080/api/chats/byUsers/${userId1}-${userId2}`, {
                    method: 'GET',
                    credentials: 'include'
                })
                    .then(chatRes => {
                        if (chatRes.status === 404) {
                            // Чат не найден — создаём
                            fetch(`http://localhost:8080/api/chats/create/${userId1}-${userId2}`, {
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
                                    window.location.href = `./chat.html?chatId=${chatId}`;
                                })
                                .catch(error => {
                                    resultMessage.textContent = 'Ошибка при создании чата';
                                    resultMessage.style.color = 'red';
                                    console.error(error);
                                });
                        } else if (chatRes.ok) {
                            chatRes.json().then(chatId => {
                                window.location.href = `./chat.html?chatId=${chatId}`;
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

fetch('http://localhost:8080/api/people/createdAtDesc', {
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
            const personDiv = document.createElement('div');
            personDiv.style.width = '60%';
            personDiv.style.padding = '10px';
            personDiv.style.boxSizing = 'border-box';
            personDiv.innerHTML = `
                <p><strong>Имя:</strong> ${person.username}</p>
                <p><strong>Дата регистрации:</strong> ${new Date(person.createdAt).toLocaleString()}</p>
                <hr>
            `;
            peopleContainer.appendChild(personDiv);
        });

        document.getElementById('sendMessageBtn').addEventListener('click', () => {
            const input = document.getElementById('usernameInput').value.trim();
            const resultMessage = document.getElementById('resultMessage');

            // Сначала проверка авторизации
            fetch('http://localhost:8080/api/auth/check', {
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
                    fetch('http://localhost:8080/api/people/yourself', {
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
                                resultMessage.textContent = 'Себе написать нельзя';
                                resultMessage.style.color = 'red';
                                return;
                            }

                            const userExists = people.some(person => person.username === input);
                            if (userExists) {
                                resultMessage.textContent = `Пользователь "${input}" найден!`;
                                resultMessage.style.color = 'green';

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
