<script setup>
import {ref, computed, onMounted, onUnmounted, nextTick} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import SockJS from 'sockjs-client'
import {Client} from '@stomp/stompjs'
import {API_BASE_URL, HEARTBEAT_INCOMING, HEARTBEAT_OUTGOING, RECONNECT_DELAY} from '@/assets/scripts/config.js'

const router = useRouter()
const route = useRoute()
const chatId = route.params.id

const currentUser = ref(null)
const chat = ref(null)
const messages = ref([])
const errorMessage = ref('')
const messageInput = ref('')
const messagesBox = ref(null)

const stompClient = new Client({
  webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
  heartbeatIncoming: HEARTBEAT_INCOMING,
  heartbeatOutgoing: HEARTBEAT_OUTGOING,
  reconnectDelay: RECONNECT_DELAY,
  debug: str => console.log(str)
})

const otherUser = computed(() => {
  if (!currentUser.value || !chat.value) return null
  return currentUser.value.id === chat.value.user1.id ? chat.value.user2 : chat.value.user1
})

function scrollToBottom() {
  nextTick(() => {
    const elem = messagesBox.value
    if (elem) elem.scrollTop = elem.scrollHeight
  })
}

function addMessage(message) {
  messages.value.push(message)
  scrollToBottom()
}

function startStomp() {
  stompClient.onConnect = () => {
    stompClient.subscribe(`/chat/newMessage/${chatId}`, message => {
      const messageObject = JSON.parse(message.body)
      if (messageObject.success) {
        addMessage(messageObject.messageDto)
        if (messageObject.messageDto.sender.id === currentUser.value.id) {
          messageInput.value = ''
        }
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

async function fetchData() {
  try {
    const [userRes, chatRes] = await Promise.all([
      fetch(`${API_BASE_URL}/people/me`, {credentials: 'include'}),
      fetch(`${API_BASE_URL}/chats/${chatId}`, {credentials: 'include'}),
    ])

    const userData = await userRes.json()
    const chatData = await chatRes.json()

    if (!userRes.ok) {
      console.error('Не удалось получить текущего пользователя')
      await router.push('/home')
      return
    }

    if (!chatRes.ok) {
      console.error(chatData.message)
      await router.push('/home')
      return
    }

    currentUser.value = userData
    chat.value = chatData
    messages.value = chatData.messages

    scrollToBottom()

    startStomp()
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err)
    await router.push('/home')
  }
}

function onSubmit(e) {
  e.preventDefault()
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

  const messageToSend = {
    chatId: Number(chatId),
    senderId: currentUser.value.id,
    content: trimmedContent,
  }

  stompClient.publish({destination: '/app/sendMessage', body: JSON.stringify(messageToSend)})
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
    <div id="chat-title">
      <div class="chat-title-row">
        <div class="chat-user left">
          <span class="arrow">🡆</span>
          <span class="username">{{ currentUser?.username || '' }}</span>
        </div>
        <div class="chat-user right">
          <span class="username">{{ otherUser?.username || '' }}</span>
          <span class="arrow">🡄</span>
        </div>
      </div>
    </div>
    <div id="messages" class="messages" ref="messagesBox">
      <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.sender.id === currentUser?.id ? 'self' : 'other']"
      >
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
@import '@/assets/styles/chat.css';
</style>
