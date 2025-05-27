document.addEventListener("DOMContentLoaded", async () => {
    const profileCardContainer = document.getElementById("profile-card");

    const wrapper = document.createElement("div");
    wrapper.classList.add("profile-wrapper");

    const response = await fetch(`${API_BASE_URL}/people/yourself`, {
        method: "GET",
        credentials: "include"
    });

    if (!response.ok) {
        window.location.href = "./home";
        return;
    }

    const person = await response.json();
    const createdAt = new Date(person.createdAt).toLocaleString();
    const role = person.role.replace(/^ROLE_/, '');

    const card = document.createElement("div");
    card.classList.add("person-card");

    card.innerHTML = `
        <div class="person-info">
            <p class="username">${person.username}</p>
            <p class="registered-label">
                Дата регистрации:<br>
                <span class="date">${createdAt}</span>
            </p>
            <p class="role">${role}</p>
        </div>
    `;

    wrapper.appendChild(card);
    profileCardContainer.appendChild(wrapper);
});
