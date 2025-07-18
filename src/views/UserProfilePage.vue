<script setup>
import UserPosts from '@/components/PostList.vue'
import {ref, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {API_BASE_URL, DEFAULT_AVATAR} from '@/assets/scripts/config.js'

const route = useRoute()
const router = useRouter()

const currentUser = ref(null)
const avatarUrl = ref(DEFAULT_AVATAR)
const isLoadingChat = ref(false)
const userId = Number(route.params.id)

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

    currentUser.value = await res.json()

    if (currentUser.value.avatarFileName) {
      try {
        const queryParams = new URLSearchParams()
        queryParams.append('fileName', currentUser.value.avatarFileName)
        queryParams.append('bucket', 'USER_AVATARS_BUCKET')

        const avatarResponse = await fetch(
            `${API_BASE_URL}/files/presigned?${queryParams.toString()}`,
            {credentials: 'include'}
        )

        if (avatarResponse.ok) {
          avatarUrl.value =  (await avatarResponse.json()).url
        } else {
          avatarUrl.value = DEFAULT_AVATAR
        }
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
            <p class="username" id="username">{{ currentUser?.username }}</p>
            <p class="registered-label">
              Дата регистрации:<br/>
              <span class="date" id="created-at">
                {{ new Date(currentUser?.createdAt).toLocaleString() }}
              </span>
            </p>
            <p class="role" id="role">{{ currentUser?.role.replace(/^ROLE_/, '') }}</p>
            <button
                v-if="currentUser"
                class="write-message-btn"
                @click="initiateChatWithUser(currentUser.id)"
                :disabled="isLoadingChat"
            >
              {{ 'Написать' }}
            </button>
          </div>
        </div>
        <div v-if="currentUser" class="additional-info">
          <div class="bio">
            <span>
              <strong>Биография:</strong>
              <span class="value" :class="{ 'default-value': !currentUser.bio }">
              {{ currentUser.bio || 'Не указано' }}
              </span>
            </span>
          </div>
          <div class="gender">
            <span>
              <strong>Пол:</strong>
              <span class="value" :class="{ 'default-value': !(currentUser.gender === 'MALE' || currentUser.gender === 'FEMALE') }">
                {{
                  currentUser.gender === 'MALE' ? 'Мужской' : currentUser.gender === 'FEMALE' ? 'Женский' : 'Не указано'
                }}
              </span>
            </span>
          </div>
          <div class="birthdate">
            <span>
              <strong>Дата рождения:</strong>
              <span class="value" :class="{ 'default-value': !currentUser.birthDate }">
                {{ currentUser.birthDate || 'Не указано' }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <UserPosts :userId="userId" noPostsMessage="Пользователь пока не создал ни одного поста"/>
  </div>
</template>

<style scoped>
@import '@/assets/styles/avatars.css';
@import '@/assets/styles/user-profile.css';
</style>
