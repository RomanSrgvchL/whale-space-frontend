const params = new URLSearchParams(window.location.search);
const chatId = params.get('id');

// Проверка id: должно быть положительным целым числом
if (!chatId || !/^\d+$/.test(chatId) || Number(chatId) < 1) {
    window.location.href = './home.html';
    throw new Error('Некорректный id чата');
}

const chatTitleElem = document.getElementById('chat-title');
const messagesContainer = document.getElementById('messages');
const form = document.getElementById('message-form');
const input = document.getElementById('message-input');
const errorDiv = document.getElementById('error-msg');

let currentUser = null;

const socket = new SockJS(`${API_BASE_URL}/ws`);
const stompClient = Stomp.over(socket);

function addMessage(msg, currentUser) {
    const msgDiv = document.createElement('div');
    const isSelf = msg.sender.id === currentUser.id;

    msgDiv.classList.add('message', isSelf ? 'self' : 'other');

    msgDiv.innerHTML = `
        ${msg.content}<br>
        <small>${new Date(msg.createdAt).toLocaleString()}</small>
    `;

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderChat(chat, currentUser) {
    chatTitleElem.textContent = `${currentUser.username} ↔ ${
        currentUser.id === chat.user1.id ? chat.user2.username : chat.user1.username
    }`;
    messagesContainer.innerHTML = '';

    chat.messages.forEach(msg => {
        addMessage(msg, currentUser);
    });

    errorDiv.textContent = '';
}

// Получение текущего пользователя и чата через
Promise.all([
    fetch(`${API_BASE_URL}/people/yourself`, { credentials: 'include' }).then(res => {
        if (!res.ok) throw new Error('Не удалось получить текущего пользователя');
        return res.json();
    }),
        fetch(`${API_BASE_URL}/chats/${chatId}`, { credentials: 'include' }).then(res => {
        if (!res.ok) throw new Error('Чат не найден');
        return res.json();
    })
])
    .then(([user, chat]) => {
        // Проверка на то, что чат принадлежит текущему пользователю
        if (user.id !== chat.user1.id && user.id !== chat.user2.id) {
            window.location.href = './home.html';
            throw new Error('Доступ к чужому чату запрещён');
        }

        currentUser = user;
        renderChat(chat, currentUser);

        stompClient.connect({}, frame => {
            // Подписка на новые сообщения чата
            stompClient.subscribe(`/chat/newMessage/${chatId}`, message => {
                const msgObj = JSON.parse(message.body);
                if (msgObj.success) {
                    addMessage(msgObj.messageDto, currentUser);
                    if (msgObj.messageDto.sender.id === currentUser.id) {
                        input.value = '';
                    }
                }
            });

            // Подписка на личные ошибки
            stompClient.subscribe('/user/queue/errors', message => {
                const errorObj = JSON.parse(message.body);
                if (!errorObj.success) {
                    errorDiv.textContent = errorObj.message;
                }
            });
        });
    })
    .catch(err => {
        console.error(err);
        window.location.href = './home.html';
    });

// Обработка отправки формы
form.addEventListener('submit', e => {
    e.preventDefault();

    errorDiv.textContent = '';

    const content = input.value.trim();

    if (!content) {
        errorDiv.textContent = 'Сообщение не должно быть пустым';
        return;
    }

    if (content.length > 200) {
        errorDiv.textContent = 'Длина сообщения не должна превышать 200 символов';
        return;
    }

    // Формируем сообщение для отправки через WS
    const messageToSend = {
        chatId: Number(chatId),
        senderId: currentUser.id,
        content
    };

    stompClient.send('/app/sendMessage', {}, JSON.stringify(messageToSend));
});
