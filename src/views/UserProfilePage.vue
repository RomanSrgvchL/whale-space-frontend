<script setup>
import {ref, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {API_BASE_URL, DEFAULT_AVATAR} from '@/assets/scripts/config.js'

const route = useRoute()
const router = useRouter()

const user = ref(null)
const avatarUrl = ref(DEFAULT_AVATAR)
const isLoadingChat = ref(false)

async function initiateChatWithUser(userId) {
  if (isLoadingChat.value) return
  isLoadingChat.value = true
  try {
    const chatResponse = await fetch(`${API_BASE_URL}/chats/with/${userId}`, {credentials: 'include'})

    if (chatResponse.status === 404) {
      const createChatResponse = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({partnerId: userId}),
      })

      if (createChatResponse.status === 201) {
        const createdChat = await createChatResponse.json()
        await router.push((`/chat/${createdChat.id}`))
      } else {
        throw new Error('Ошибка при создании чата')
      }
    } else if (chatResponse.ok) {
      const chat = await chatResponse.json()
      await router.push((`/chat/${chat.id}`))
    } else {
      throw new Error('Ошибка при получении чата')
    }
  } catch (error) {
    alert('Ошибка при получении/создании чата')
    console.error(error)
  } finally {
    isLoadingChat.value = false
  }
}

onMounted(async () => {
  const userId = route.params.id

  try {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      credentials: 'include'
    })

    user.value = await res.json()

    if (user.value.avatarFileName) {
      try {
        const avatarRes = await fetch(
            `${API_BASE_URL}/users/avatar/${encodeURIComponent(user.value.avatarFileName)}`,
            {credentials: 'include'}
        )
        const data = await avatarRes.json()
        avatarUrl.value = data.success ? data.avatarUrl : DEFAULT_AVATAR
      } catch {
        avatarUrl.value = DEFAULT_AVATAR
      }
    }
  } catch (err) {
    console.error('Ошибка при загрузке чужого профиля:', err)
  }
})
</script>

<template>
  <div class="container">
    <div class="profile layout">
      <div class="user-wrapper">
        <div class="user-card">
          <div class="user-info">
            <div class="avatar-wrapper">
              <img
                  class="avatar-img"
                  :src="avatarUrl"
                  alt="avatar"
              />
            </div>
            <p class="username" id="username">{{ user?.username }}</p>
            <p class="registered-label">
              Дата регистрации:<br/>
              <span class="date" id="created-at">
                {{ new Date(user?.createdAt).toLocaleString() }}
              </span>
            </p>
            <p class="role" id="role">{{ user?.role.replace(/^ROLE_/, '') }}</p>
            <button
                v-if="user"
                class="write-message-btn"
                @click="initiateChatWithUser(user.id)"
                :disabled="isLoadingChat"
            >
              {{ 'Написать' }}
            </button>
          </div>
        </div>
        <div v-if="user" class="additional-info">
          <div class="bio">
            <span>
              <strong>Биография:</strong>
              <span class="value" :class="{ 'default-value': !user.bio }">
              {{ user.bio || 'Не указано' }}
              </span>
            </span>
          </div>
          <div class="gender">
            <span>
              <strong>Пол:</strong>
              <span class="value" :class="{ 'default-value': !(user.gender === 'MALE' || user.gender === 'FEMALE') }">
                {{ user.gender === 'MALE' ? 'Мужской' : user.gender === 'FEMALE' ? 'Женский' : 'Не указано' }}
              </span>
            </span>
          </div>
          <div class="birthdate">
            <span>
              <strong>Дата рождения:</strong>
              <span class="value" :class="{ 'default-value': !user.birthDate }">
                {{ user.birthDate || 'Не указано' }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/user-profile.css';
</style>
