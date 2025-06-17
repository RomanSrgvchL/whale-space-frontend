document.addEventListener("DOMContentLoaded", async () => {
    // Получение текущего пользователя
    const userResponse = await fetch(`${API_BASE_URL}/people/me`, {
        credentials: "include"
    });

    if (!userResponse.ok) {
        window.location.href = "./home.html";
        return;
    }

    const user = await userResponse.json();
    const currentUserId = user.id;

    // Получение чатов
    const response = await fetch(`${API_BASE_URL}/chats?sortBy=createdAtDesc`, {
        credentials: "include"
    });

    if (!response.ok) {
        console.error("Не удалось загрузить чаты");
        return;
    }

    const chats = await response.json();
    const chatList = document.getElementById("chat-list");
    chatList.innerHTML = "";

    chats.forEach(chat => {
        const otherUser = chat.user1.id === currentUserId ? chat.user2 : chat.user1;

        let previewText = "";
        let lastMessageDate = "";

        const isMine = chat.lastMessage.sender.id === currentUserId;
        previewText = `${isMine ? '<span class="from-me">Вы:</span> ' : ''}${chat.lastMessage.content}`;
        lastMessageDate = new Date(chat.lastMessage.createdAt).toLocaleString()

        const chatItem = document.createElement("div");
        chatItem.classList.add("chat-item");

        chatItem.innerHTML = `
            <div class="chat-header">
                <div class="avatar-wrapper">
                    <img class="avatar-img" src="../images/default.jpg" alt="Avatar">
                </div>
                <div class="chat-info">
                    <div class="chat-title"><strong>${otherUser.username}</strong></div>
                    <div class="chat-preview">${previewText}</div>
                </div>
                <div class="chat-meta">${lastMessageDate}</div>
            </div>
        `;

        const avatarImg = chatItem.querySelector(".avatar-img");

        if (otherUser.avatarFileName) {
            fetch(`${API_BASE_URL}/people/avatar/${encodeURIComponent(otherUser.avatarFileName)}`, {
                credentials: "include"
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

        chatItem.addEventListener("click", () => {
            window.location.href = `./chat.html?id=${chat.id}`;
        });

        chatList.appendChild(chatItem);
    });
});
