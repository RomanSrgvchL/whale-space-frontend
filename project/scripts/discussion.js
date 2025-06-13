const params = new URLSearchParams(window.location.search);
const discussionId = params.get('id');

// Проверка id: должно быть положительным целым числом
if (!discussionId || !/^\d+$/.test(discussionId) || Number(discussionId) < 1) {
    window.location.href = './home.html';
    throw new Error('Некорректный id обсуждения');
}

const discussionTitleElem = document.getElementById('discussion-title');
const messagesContainer = document.getElementById('messages');
const form = document.getElementById('users-actions');
const input = document.getElementById('message-input');
const errorDiv = document.getElementById('error-msg');

let currentUser = null;

const socket = new SockJS(`${API_BASE_URL}/ws`);
const stompClient = Stomp.over(socket);

function addReply(reply, currentUser) {
    const msgDiv = document.createElement('div');
    const isSelf = reply.sender.id === currentUser.id;

    msgDiv.classList.add('message', isSelf ? 'self' : 'other');

    const createdAt = new Date(reply.createdAt).toLocaleString();

    msgDiv.innerHTML = `
        <strong>${reply.sender.username}</strong>
        ${reply.content}
        <small>${createdAt}</small>
    `;

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Отображение обсуждения
function renderDiscussion(discussion, currentUser) {
    discussionTitleElem.textContent = discussion.title;
    messagesContainer.innerHTML = '';

    discussion.replies.forEach(reply => {
        addReply(reply, currentUser);
    });

    errorDiv.textContent = '';
}

// Получение текущего пользователя и обсуждения
Promise.all([
    fetch(`${API_BASE_URL}/people/me`, { credentials: 'include' }).then(res => {
        if (!res.ok) throw new Error('Не удалось получить текущего пользователя');
        return res.json();
    }),
    fetch(`${API_BASE_URL}/discussions/${discussionId}`, { credentials: 'include' }).then(res => {
        if (!res.ok) throw new Error('Обсуждение не найдено');
        return res.json();
    })
])
    .then(([user, discussion]) => {
        currentUser = user;
        renderDiscussion(discussion, currentUser);

        stompClient.connect({}, frame => {
            // Подписка на новые сообщения обсуждения
            stompClient.subscribe(`/discussion/newReply/${discussionId}`, message => {
                const msgObj = JSON.parse(message.body);
                if (msgObj.success) {
                    addReply(msgObj.replyDto, currentUser);
                    if (msgObj.replyDto.sender.id === currentUser.id) {
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

    const replyToSend = {
        discussionId: Number(discussionId),
        senderId: currentUser.id,
        content
    };

    stompClient.send('/app/sendReply', {}, JSON.stringify(replyToSend));
});
