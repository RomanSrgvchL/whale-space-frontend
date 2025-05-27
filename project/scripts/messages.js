document.addEventListener("DOMContentLoaded", async () => {
    // Получение текущего пользователя
    const userResponse = await fetch(`${API_BASE_URL}/people/yourself`, {
        method: "GET",
        credentials: "include"
    });

    if (!userResponse.ok) {
        window.location.href = "./home";
        return;
    }

    const user = await userResponse.json();
    const currentUserId = user.id;

    // Получение чатов
    const response = await fetch(`${API_BASE_URL}/chats/createdAtDesc`, {
        method: "GET",
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
        const messageCount = chat.messages?.length || 0;
        const createdAt = new Date(chat.createdAt).toLocaleString();

        const chatItem = document.createElement("div");
        chatItem.classList.add("chat-item");

        chatItem.innerHTML = `
            <div class="chat-title">Собеседник: <strong>${otherUser.username}</strong></div>
            <div class="chat-meta">Сообщений: ${messageCount} • Создано: ${createdAt}</div>
        `;

        chatItem.addEventListener("click", () => {
            window.location.href = `./chat.html?id=${chat.id}`;
        });

        chatList.appendChild(chatItem);
    });
});
