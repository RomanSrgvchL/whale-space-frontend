document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch(`${API_BASE_URL}/people/me`, {
        credentials: "include"
    });

    if (!response.ok) {
        window.location.href = "./home.html";
        return;
    }

    const person = await response.json();
    const createdAt = new Date(person.createdAt).toLocaleString();
    const role = person.role.replace(/^ROLE_/, '');

    const usernameElem = document.getElementById("username");
    const createdAtElem = document.getElementById("created-at");
    const roleElem = document.getElementById("role");

    usernameElem.textContent = person.username;
    createdAtElem.textContent = createdAt;
    roleElem.textContent = role;

    const form = document.getElementById("avatar-upload-form");
    const fileInput = document.getElementById("avatar-file");
    const deleteBtn = document.getElementById("delete-avatar-btn");
    const statusMessageElem = document.getElementById("message");
    const avatarImg = document.getElementById("avatar-img");

    // Функция для отображения сообщения
    function setStatus(message, color) {
        statusMessageElem.style.color = color;
        statusMessageElem.textContent = message;
    }

    async function refreshAvatar() {
        let updatedPerson;
        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/people/me`, {
                credentials: "include"
            });
            updatedPerson = await refreshResponse.json();
        } catch (err) {
            console.error("Ошибка при получении данных пользователя:", err);
            avatarImg.src = "../images/default.jpg";
            return;
        }

        if (updatedPerson.avatarFileName) {
            try {
                const avatarResponse = await fetch(
                    `${API_BASE_URL}/people/avatar/${encodeURIComponent(updatedPerson.avatarFileName)}
                    `,
                    { credentials: "include" }
                );
                const avatarData = await avatarResponse.json();

                if (avatarData.success) {
                    avatarImg.src = avatarData.avatarUrl;
                } else {
                    avatarImg.src = "../images/default.jpg";
                }
            } catch (err) {
                console.error("Ошибка при получении аватара:", err);
                avatarImg.src = "../images/default.jpg";
            }
        } else {
            avatarImg.src = "../images/default.jpg";
        }
    }

    // Обработчик загрузки
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        setStatus("", "");

        if (fileInput.files.length === 0) {
            setStatus("Пожалуйста, выберите файл для загрузки", "red");
            return;
        }

        const file = document.getElementById("avatar-file").files[0];
        if (!["image/jpeg", "image/png"].includes(file.type)) {
            setStatus("Файл должен быть формата PNG или JPG/JPEG", "red");
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        try {
            const response = await fetch(`${API_BASE_URL}/people/avatar`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setStatus(data.message, "green");
                fileInput.value = "";
                await refreshAvatar();
            } else {
                setStatus(data.message, "red");
            }
        } catch (err) {
            console.error("Ошибка при загрузке аватара:", err);
        }
    });

    // Обработчик удаления
    deleteBtn.addEventListener("click", async () => {
        setStatus("", "");

        try {
            const response = await fetch(`${API_BASE_URL}/people/avatar`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await response.json();

            if (response.ok) {
                setStatus(data.message, "green");
                await refreshAvatar();
            } else {
                setStatus(data.message, "red");
            }
        } catch (err) {
            console.error("Ошибка при удалении аватара:", err);
        }
    });

    await refreshAvatar();
});
