<script setup>
import {ref, onMounted, onUnmounted, nextTick, watch, reactive} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import SockJS from 'sockjs-client'
import {Client} from '@stomp/stompjs'
import {
  API_BASE_URL, DEFAULT_AVATAR,
  HEARTBEAT_INCOMING,
  HEARTBEAT_OUTGOING,
  PRELOAD_AVATAR,
  RECONNECT_DELAY
} from '@/assets/scripts/config.js'

const router = useRouter()
const route = useRoute()
const discussionId = route.params.id

const discussionTitle = ref('')
const messages = ref([])
const currentUser = ref(null)
const errorMessage = ref('')
const messageInput = ref('')
const messagesContainer = ref(null)
const isReconnecting = ref(false)

const avatarUrls = reactive({})

const stompClient = new Client({
  webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
  heartbeatIncoming: HEARTBEAT_INCOMING,
  heartbeatOutgoing: HEARTBEAT_OUTGOING,
  reconnectDelay: RECONNECT_DELAY,
  debug: str => console.log(str)
})

function scrollToBottom() {
  nextTick(() => {
    const element = messagesContainer.value
    if (element) element.scrollTop = element.scrollHeight
  })
}

function addMessage(message, user) {
  if (!avatarUrls[message.sender.id]) {
    avatarUrls[message.sender.id] = PRELOAD_AVATAR
    fetchAvatar(message.sender)
  }

  messages.value.push({
    id: message.id,
    sender: message.sender,
    content: message.content,
    createdAt: message.createdAt
  })
  scrollToBottom()

  if (message.sender.id === user.id) {
    messageInput.value = ''
  }
}

function startStomp(user) {
  stompClient.onConnect = () => {
    isReconnecting.value = false

    stompClient.subscribe(`/discussion/newMessage/${discussionId}`, message => {
      const discussionMsg = JSON.parse(message.body)
      addMessage(discussionMsg, user)
    })
  }

  stompClient.onWebSocketClose = () => {
    isReconnecting.value = true
  }

  if (!stompClient.active) {
    stompClient.activate()
  }
}

function initAvatars(users) {
  users.forEach(user => {
    avatarUrls[user.id] = avatarUrls[user.id] ?? PRELOAD_AVATAR
  })
}

async function fetchAvatar(user) {
  if (avatarUrls[user.id] && avatarUrls[user.id] !== PRELOAD_AVATAR) {
    return;
  }

  if (user.avatarFileName) {
    try {
      const avatarResponse = await fetch(
          `${API_BASE_URL}/users/avatar/${encodeURIComponent(user.avatarFileName)}`,
          {credentials: 'include'}
      )
      const avatarData = await avatarResponse.json()

      avatarUrls[user.id] = avatarData.success ? avatarData.avatarUrl : DEFAULT_AVATAR
    } catch {
      avatarUrls[user.id] = DEFAULT_AVATAR
    }
  } else {
    avatarUrls[user.id] = DEFAULT_AVATAR
  }
}

async function fetchData() {
  try {
    const [userRes, discussionRes] = await Promise.all([
      fetch(`${API_BASE_URL}/users/me`, {credentials: 'include'}),
      fetch(`${API_BASE_URL}/discussions/${discussionId}`, {credentials: 'include'})
    ])

    const userData = await userRes.json()
    const discussionData = await discussionRes.json()

    if (!userRes.ok) {
      console.error('Не удалось получить текущего пользователя')
      await router.push('/home')
      return
    }
    if (!discussionRes.ok) {
      console.error(discussionData.message)
      await router.push('/home')
      return
    }

    currentUser.value = userData
    discussionTitle.value = discussionData.title
    messages.value = [...discussionData.messages]

    const users = messages.value.map(msg => msg.sender)
    initAvatars(users)

    await Promise.all(users.map(fetchAvatar))

    scrollToBottom()

    startStomp(userData)
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err)
    await router.push('/home')
  }
}

async function onSubmit(event) {
  event.preventDefault()
  errorMessage.value = ''

  const trimmedContent = messageInput.value.trim()

  if (!trimmedContent) {
    errorMessage.value = 'Сообщение не должно быть пустым'
    return
  }

  if (trimmedContent.length > 200) {
    errorMessage.value = 'Длина сообщения не должна превышать 200 символов'
    return
  }

  const message = {
    discussionId: Number(discussionId),
    content: trimmedContent
  }

  try {
    const response = await fetch(`${API_BASE_URL}/discussionMessages`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    const responseData = await response.json()

    if (!response.ok) {
      errorMessage.value = responseData.message
    }
  } catch (err) {
    console.error('Ошибка при отправке:', err)
    errorMessage.value = 'Не удалось отправить сообщение'
  }
}

watch(isReconnecting, async (newValue, oldValue) => {
  if (newValue === false && oldValue === true) {
    errorMessage.value = ''
    await fetchData()
  }
})

function firstMessageForUser(index) {
  const currentMessage = messages.value[index]
  const prevMessage = messages.value[index - 1]
  return !prevMessage || prevMessage.sender.id !== currentMessage.sender.id
}


onMounted(() => {
  fetchData()
})

onUnmounted(() => {
  if (stompClient.active) {
    stompClient.deactivate()
  }
})
</script>

<template>
  <div class="container">
    <h2 id="discussion-title">{{ discussionTitle }}</h2>
    <div id="messages" class="messages" ref="messagesContainer">
      <div
          v-for="(message, index) in messages"
          :key="message.id"
          :class="['message', message.sender.id === currentUser?.id ? 'self' : 'other']"
      >
        <div class="avatar-wrapper" :style="{ opacity: firstMessageForUser(index) ? 1 : 0 }">
          <img
              class="avatar-img"
              :src="avatarUrls[message.sender.id]"
              alt="avatar"
          />
        </div>
        <div class="message-content">
          <div v-if="firstMessageForUser(index)">
            <router-link
                :to="message.sender.id === currentUser?.id ? '/profile/me' : `/profile/${message.sender.id}`"
                class="username"
            >
              {{ message.sender.username }}
            </router-link>
          </div>
          <span>{{ message.content }}</span>
          <small>{{ new Date(message.createdAt).toLocaleString() }}</small>
        </div>
      </div>
    </div>
    <form id="users-actions" @submit="onSubmit">
      <div class="input-row">
        <input
            id="message-input"
            v-model="messageInput"
            placeholder="Введите сообщение"
            autocomplete="off"
            :disabled="isReconnecting"
        />
        <button type="submit" :disabled="isReconnecting">Отправить</button>
      </div>
      <div id="error-message" class="error-message">
        {{ isReconnecting ? 'Обновление соединения...' : errorMessage }}
      </div>
    </form>
  </div>
</template>

<style scoped>
@import '@/assets/styles/discussion.css';
</style>
