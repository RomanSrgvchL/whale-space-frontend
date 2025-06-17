document.addEventListener('DOMContentLoaded', function () {
    const messageDiv = document.getElementById('message');
    const discussionListDiv = document.getElementById('discussions-list');
    let currentUser = null;

    fetch(`${API_BASE_URL}/people/me`, {
        credentials: 'include'
    })
        .then(response => response.ok ? response.json() : null)
        .then(user => {
            currentUser = user;
            if (user?.role === 'ROLE_ADMIN') {
                document.getElementById('discussion-form-container').style.display = 'block';
            }
            loadDiscussions();
        })
        .catch(() => {
            loadDiscussions();
        });

    const form = document.getElementById('create-discussion-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            messageDiv.textContent = '';
            messageDiv.style.color = '';

            const formData = new FormData(form);
            const title = formData.get('title').trim();

            if (!title) {
                messageDiv.textContent = 'Тема не должна быть пустой';
                messageDiv.style.color = 'red';
                return;
            }

            if (title.length < 5 || title.length > 100) {
                messageDiv.textContent = 'Длина темы должна быть от 5 до 100 символов';
                messageDiv.style.color = 'red';
                return;
            }

            fetch(`${API_BASE_URL}/discussions`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({title})
            })
                .then(async response => {
                    if (!response.ok) {
                        let errorMessage = 'Не удалось создать обсуждение';
                        try {
                            const errorData = await response.json();
                            if (errorData?.message) errorMessage = errorData.message;
                        } catch {
                        }
                        throw new Error(errorMessage);
                    }
                    return response.json();
                })
                .then(data => {
                    messageDiv.textContent = data.message;
                    messageDiv.style.color = 'green';
                    form.reset();
                    loadDiscussions();
                })
                .catch(error => {
                    messageDiv.textContent = error.message;
                    messageDiv.style.color = 'red';
                });
        });
    }

    function loadDiscussions() {
        discussionListDiv.innerHTML = '';

        fetch(`${API_BASE_URL}/discussions`, {
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) throw new Error('Ошибка загрузки обсуждений');
                return response.json();
            })
            .then(discussions => {
                discussions.forEach(discussion => {
                    const card = document.createElement('div');
                    card.className = 'discussion-card';

                    const info = document.createElement('div');
                    info.className = 'discussion-info';

                    const title = document.createElement('div');
                    title.className = 'discussion-title';
                    title.textContent = discussion.title;

                    const username = discussion.creator.username;
                    const createdAt = new Date(discussion.createdAt).toLocaleString();

                    const meta = document.createElement('div');
                    meta.className = 'discussion-meta';
                    meta.textContent = `Создал: ${username} • ${createdAt}`;


                    info.appendChild(title);
                    info.appendChild(meta);

                    const buttonGroup = document.createElement('div');
                    buttonGroup.className = 'button-group';

                    if (currentUser?.role === 'ROLE_ADMIN') {
                        const deleteButton = document.createElement('button');
                        deleteButton.className = 'discussion-button delete-button';
                        deleteButton.textContent = 'Удалить';

                        deleteButton.addEventListener('click', () => {
                            fetch(`${API_BASE_URL}/discussions/${discussion.id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                            })
                                .then(async response => {
                                    messageDiv.textContent = '';
                                    messageDiv.style.color = '';

                                    if (response.status === 404) {
                                        alert("Это обсуждение уже удалено другим администратором");
                                        return null;
                                    }

                                    if (!response.ok) {
                                        throw new Error('Ошибка при удалении');
                                    }

                                    return response.json();
                                })
                                .then(result => {
                                    if (result !== null) {
                                        loadDiscussions();
                                    }
                                })
                                .catch(err => {
                                    alert(err.message);
                                });
                        });

                        buttonGroup.appendChild(deleteButton);
                    }

                    const goButton = document.createElement('button');
                    goButton.className = 'discussion-button';
                    goButton.textContent = 'Перейти';

                    goButton.addEventListener('click', () => {
                        if (!currentUser) {
                            alert('Авторизуйтесь чтобы перейти в обсуждение');
                            return;
                        }

                        fetch(`${API_BASE_URL}/discussions/${discussion.id}`, {
                            credentials: 'include'
                        })
                            .then(async response => {
                                if (response.status === 404) {
                                    alert('Это обсуждение не существует');
                                    throw new Error('Обсуждение не найдено');
                                }
                                if (!response.ok) throw new Error('Ошибка запроса к серверу');
                                return response.json();
                            })
                            .then(discussionDto => {
                                window.location.href = `./discussion.html?id=${discussionDto.id}`;
                            })
                            .catch(err => {
                                console.error(err);
                            });
                    });

                    buttonGroup.appendChild(goButton);
                    card.appendChild(info);
                    card.appendChild(buttonGroup);
                    discussionListDiv.appendChild(card);
                });
            })
            .catch(() => {
                console.log('Не удалось загрузить обсуждения');
            });
    }
});
