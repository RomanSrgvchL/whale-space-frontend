<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL} from '@/assets/scripts/config.js'

const router = useRouter()
const chats = ref([])
const currentUserId = ref(null)
const avatarUrls = ref({})

const loadChats = async () => {
  const userResponse = await fetch(`${API_BASE_URL}/people/me`, {
    credentials: 'include'
  })

  if (!userResponse.ok) {
    await router.push('/home')
    return
  }

  const user = await userResponse.json()
  currentUserId.value = user.id

  const response = await fetch(`${API_BASE_URL}/chats`, {
    credentials: 'include'
  })

  if (!response.ok) {
    console.error('Не удалось загрузить чаты')
    return
  }

  chats.value = await response.json()

  for (const chat of chats.value) {
    const otherUser = getOtherUser(chat)
    if (otherUser.avatarFileName) {
      try {
        const response = await fetch(`
        ${API_BASE_URL}/people/avatar/${encodeURIComponent(otherUser.avatarFileName)}
        `, {
          credentials: 'include'
        })
        const avatarData = await response.json()
        avatarUrls.value[chat.id] = avatarData.success ? avatarData.avatarUrl : '/avatars/default.jpg'
      } catch {
        avatarUrls.value[chat.id] = '/avatars/default.jpg'
      }
    } else {
      avatarUrls.value[chat.id] = '/avatars/default.jpg'
    }
  }
}

const getOtherUser = (chat) => {
  return chat.user1.id === currentUserId.value ? chat.user2 : chat.user1
}

const formatPreviewText = (chat) => {
  const isMine = chat.lastMessage.sender.id === currentUserId.value
  return `${isMine ? '<span style=" font-weight: 600; opacity: 0.5;">Вы:</span> ' : ''}${chat.lastMessage.content}`
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const getAvatarUrl = async (avatarFileName) => {
  if (!avatarFileName) return '/avatars/default.jpg'
  try {
    const response = await fetch(`${API_BASE_URL}/people/avatar/${encodeURIComponent(avatarFileName)}`, {
      credentials: 'include'
    })
    const avatarData = await response.json()
    return avatarData.success ? avatarData.avatarUrl : '/avatars/default.jpg'
  } catch {
    return '/avatars/default.jpg'
  }
}

onMounted(() => {
  loadChats()
})
</script>

<template>
  <div class="container">
    <div id="chat-list">
      <div
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item"
          @click="router.push({path: `/chat/${chat.id}`})"
      >
        <div class="chat-header">
          <div class="avatar-wrapper">
            <img
                class="avatar-img"
                :src="avatarUrls[chat.id]"
                alt=""
            />
          </div>
          <div class="chat-info">
            <div class="chat-title">
              <strong>{{ getOtherUser(chat).username }}</strong>
            </div>
            <div
                class="chat-preview"
                v-html="formatPreviewText(chat)"
            ></div>
          </div>
          <div class="chat-meta">{{ formatDate(chat.lastMessage.createdAt) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/messages.css';
</style>
