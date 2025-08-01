<script setup>
import {onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL, PRELOAD_AVATAR, DEFAULT_AVATAR} from '@/assets/scripts/config.js'

const router = useRouter()
const chats = ref([])
const currentUserId = ref(null)

const avatarUrls = reactive({})
const isChatsLoaded = ref(false)

const loadChats = async () => {
  const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include'
  })

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
    avatarUrls[chat.id] = PRELOAD_AVATAR
    const otherUser = getOtherUser(chat)

    if (!otherUser.avatarFileName) {
      avatarUrls[chat.id] = DEFAULT_AVATAR
      continue
    }

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('fileName', otherUser.avatarFileName)
      queryParams.append('bucket', 'USER_AVATARS_BUCKET')

      const avatarResponse = await fetch(`${API_BASE_URL}/files/presigned?${queryParams.toString()}`,
          {credentials: 'include'}
      )

      if (avatarResponse.ok) {
        avatarUrls[chat.id] =  (await avatarResponse.json()).url
      } else {
        avatarUrls[chat.id] = DEFAULT_AVATAR
      }
    } catch {
      avatarUrls[chat.id] = DEFAULT_AVATAR
    }
  }

  isChatsLoaded.value = true
}

const getOtherUser = (chat) => {
  return chat.user1.id === currentUserId.value ? chat.user2 : chat.user1
}

const formatPreviewText = (chat) => {
  const isMine = chat.lastMessage.sender.id === currentUserId.value
  return `${isMine ? '<span style="font-weight: 600; opacity: 0.5;">Вы:</span> ' : ''}${chat.lastMessage.content}`
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

onMounted(() => {
  loadChats()
})
</script>

<template>
  <div class="container">
    <div id="chat-list">
      <div v-if="isChatsLoaded && chats.length === 0" class="no-chats-message">
        <p>
          У вас пока нет чатов<br>
          <router-link to="/users">Напишите</router-link>
          кому-нибудь первым!
        </p>
      </div>

      <div
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item"
          @click="router.push({ path: `/chat/${chat.id}` })"
      >
        <div class="chat-header">
          <div class="avatar-wrapper">
            <img
                class="avatar-img"
                :src="avatarUrls[chat.id] || PRELOAD_AVATAR"
                alt=""
            />
          </div>
          <div class="chat-info">
            <div>
              <router-link
                  @click.stop
                  class="chat-title"
                  :to="`/profile/${getOtherUser(chat).id}`"
              >
              <strong>{{ getOtherUser(chat).username }}</strong>
              </router-link>
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
@import '@/assets/styles/avatars.css';
@import '@/assets/styles/messages.css';
</style>
