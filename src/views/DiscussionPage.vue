<script setup>
import {ref, onMounted, onUnmounted, nextTick} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import SockJS from 'sockjs-client'
import {Client} from '@stomp/stompjs'
import {API_BASE_URL, HEARTBEAT_INCOMING, HEARTBEAT_OUTGOING, RECONNECT_DELAY} from '@/assets/scripts/config.js'

const router = useRouter()
const route = useRoute()
const discussionId = route.params.id

const discussionTitle = ref('')
const messages = ref([])
const currentUser = ref(null)
const errorMessage = ref('')
const messageInput = ref('')
const messagesContainer = ref(null)

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

function addReply(reply, user) {
  messages.value.push({
    id: reply.id,
    sender: reply.sender,
    content: reply.content,
    createdAt: reply.createdAt
  })
  scrollToBottom()

  if (reply.sender.id === user.id) {
    messageInput.value = ''
  }
}

async function fetchInitialData() {
  try {
    const [userRes, discussionRes] = await Promise.all([
      fetch(`${API_BASE_URL}/people/me`, {credentials: 'include'}),
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
    messages.value = [...discussionData.replies]

    scrollToBottom()

    startStomp(userData)
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err)
    await router.push('/home')
  }
}

function startStomp(user) {
  stompClient.onConnect = () => {
    stompClient.subscribe(`/discussion/newReply/${discussionId}`, message => {
      const messageObject = JSON.parse(message.body)
      if (messageObject.success) {
        addReply(messageObject.replyDto, user)
      }
    })

    stompClient.subscribe('/user/queue/errors', message => {
      const errorObject = JSON.parse(message.body)
      if (!errorObject.success) {
        errorMessage.value = errorObject.message
      }
    })
  }

  stompClient.activate()
}

function onSubmit(event) {
  event.preventDefault()
  errorMessage.value = ''

  const content = messageInput.value.trim()

  if (!content) {
    errorMessage.value = 'Сообщение не должно быть пустым'
    return
  }

  if (content.length > 200) {
    errorMessage.value = 'Длина сообщения не должна превышать 200 символов'
    return
  }

  const replyToSend = {
    discussionId: Number(discussionId),
    senderId: currentUser.value.id,
    content
  }

  stompClient.publish({destination: '/app/sendReply', body: JSON.stringify(replyToSend)})
}

onMounted(() => {
  fetchInitialData()
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
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.sender.id === currentUser?.id ? 'self' : 'other']"
      >
        <strong>{{ message.sender.username }}</strong>
        <span>{{ message.content }}</span>
        <small>{{ new Date(message.createdAt).toLocaleString() }}</small>
      </div>
    </div>
    <form id="users-actions" @submit="onSubmit">
      <div class="input-row">
        <input
            id="message-input"
            v-model="messageInput"
            placeholder="Введите сообщение"
            autocomplete="off"
        />
        <button type="submit">Отправить</button>
      </div>
      <div id="error-message" class="error-message">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<style scoped>
@import '@/assets/styles/discussion.css';
</style>
