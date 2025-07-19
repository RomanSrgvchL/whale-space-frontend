<script setup>
import {computed, nextTick, onMounted, onUnmounted, reactive, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import SockJS from 'sockjs-client'
import {Client} from '@stomp/stompjs'
import {
  API_BASE_URL,
  DEFAULT_AVATAR,
  HEARTBEAT_INCOMING,
  HEARTBEAT_OUTGOING,
  PRELOAD_AVATAR,
  RECONNECT_DELAY
} from '@/assets/scripts/config.js'

const router = useRouter()
const route = useRoute()
const chatId = route.params.id

const currentUser = ref(null)
const chat = ref(null)
const messages = ref([])
const errorMessage = ref('')
const messageInput = ref('')
const messagesBox = ref(null)
const isReconnecting = ref(false)

const avatarUrls = reactive({})
const selectedFiles = ref([])
const fileInput = ref(null)
const messageImageUrls = reactive({})

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
    isReconnecting.value = false

    stompClient.subscribe(`/chat/newMessage/${chatId}`, message => {
      const chatMsg = JSON.parse(message.body)
      fetchMessageImageUrls(chatMsg)
      addMessage(chatMsg)
      if (chatMsg.sender.id === currentUser.value.id) {
        messageInput.value = ''
      }
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
    avatarUrls[user.id] = avatarUrls[user.id] ?? PRELOAD_AVATAR;
  })
}

async function fetchAvatar(user) {
  if (avatarUrls[user.id] && avatarUrls[user.id] !== PRELOAD_AVATAR) {
    return;
  }

  if (user.avatarFileName) {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('fileName', user.avatarFileName)
      queryParams.append('bucket', 'USER_AVATARS_BUCKET')

      const avatarResponse = await fetch(`${API_BASE_URL}/files/presigned?${queryParams.toString()}`,
          {credentials: 'include'}
      )

      if (avatarResponse.ok) {
        avatarUrls[user.id] =  (await avatarResponse.json()).url
      } else {
        avatarUrls[user.id] = DEFAULT_AVATAR
      }
    } catch {
      avatarUrls[user.id] = DEFAULT_AVATAR
    }
  } else {
    avatarUrls[user.id] = DEFAULT_AVATAR
  }
}

async function fetchData() {
  try {
    const [userRes, chatRes] = await Promise.all([
      fetch(`${API_BASE_URL}/users/me`, {credentials: 'include'}),
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

    initAvatars([chatData.user1, chatData.user2])

    currentUser.value = userData
    chat.value = chatData
    messages.value = chatData.messages

    for (const message of messages.value) {
      await fetchMessageImageUrls(message)
    }

    await fetchAvatar(chatData.user1)
    await fetchAvatar(chatData.user2)

    scrollToBottom()

    startStomp()
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err)
    await router.push('/home')
  }
}

function getUTF8Size(str) {
  return new TextEncoder().encode(str).length
}

async function onSubmit(e) {
  e.preventDefault()
  errorMessage.value = ''

  if (selectedFiles.value.length > 3) {
    errorMessage.value = 'Можно прикрепить не более 3 файлов'
    return
  }

  const trimmedContent = messageInput.value.trim()

  const contentSize = getUTF8Size(trimmedContent)
  const filesSize = selectedFiles.value.reduce((sum, file) => sum + file.size, 0)

  const totalSize = contentSize + filesSize

  if (totalSize > 5 * 1024 * 1024) {
    errorMessage.value = 'Общий размер сообщения (текст + файлы) не должен превышать 5 Мб'
    return
  }

  if (!trimmedContent) {
    errorMessage.value = 'Сообщение не должно быть пустым'
    return
  }

  const formData = new FormData()

  formData.append('message', new Blob([JSON.stringify(trimmedContent)], { type: 'application/json' }))

  if (selectedFiles.value.length > 0) {
    selectedFiles.value.forEach(file => {
      formData.append('files', file)
    })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    const responseData = await response.json()

    if (!response.ok) {
      errorMessage.value = responseData.message
    } else {
      selectedFiles.value = []
      if (fileInput.value) fileInput.value.value = ''
    }
  } catch (err) {
    console.error('Ошибка при отправке:', err)
    errorMessage.value = 'Не удалось отправить сообщение'
  }
}

async function fetchMessageImageUrls(message) {
  if (!message.imageFileNames || message.imageFileNames.length === 0) {
    return;
  }

  try {
    const params = new URLSearchParams();
    message.imageFileNames.forEach(fileName => params.append('fileNames', fileName));
    params.append('bucket', 'CHAT_MESSAGES_BUCKET');

    const response = await fetch(`${API_BASE_URL}/files/presigned/batch?${params.toString()}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Ошибка сервера');
    }

    messageImageUrls[message.id] = await response.json();
  } catch (err) {
    console.error(`Ошибка загрузки изображений для сообщения ${message.id}:`, err);
    messageImageUrls[message.id] = [];
  }
}

watch(isReconnecting, async (newValue, oldValue) => {
  if (newValue === false && oldValue === true) {
    errorMessage.value = ''
    await fetchData()
  }
})

function shouldShowAvatar(index) {
  const currentMessage = messages.value[index]
  const prevMessage = messages.value[index - 1]
  return !prevMessage || prevMessage.sender.id !== currentMessage.sender.id
}

function onFileChange(event) {
  const files = Array.from(event.target.files)
  const allowedTypes = ['image/jpeg', 'image/png']
  const maxIndividualSize = 3 * 1024 * 1024
  const minWidth = 150
  const minHeight = 150

  let checkedFiles = []

  let remaining = files.length

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      errorMessage.value = 'Файлы должны быть формата PNG или JPG/JPEG'
      selectedFiles.value = []
      if (fileInput.value) fileInput.value.value = ''
      return
    }

    if (file.size > maxIndividualSize) {
      errorMessage.value = `Размер каждого отдельного файла не должен превышать 3 Мб`
      selectedFiles.value = []
      if (fileInput.value) fileInput.value.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = function (e) {
      const img = new Image()
      img.onload = function () {
        if (img.width < minWidth || img.height < minHeight) {
          errorMessage.value = `Минимальный размер изображения — ${minWidth}x${minHeight} пикселей`
          selectedFiles.value = []
          if (fileInput.value) fileInput.value.value = ''
          return
        }

        checkedFiles.push(file)
        remaining--

        if (remaining === 0) {
          selectedFiles.value = checkedFiles
          errorMessage.value = ''
        }
      }

      img.onerror = function () {
        errorMessage.value = 'Не удалось прочитать изображение'
        selectedFiles.value = []
        if (fileInput.value) fileInput.value.value = ''
      }

      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  }
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
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
          <router-link class="username" :to="'/profile/me'">
            {{ currentUser?.username || '' }}
          </router-link>
        </div>
        <div class="chat-user right">
          <router-link
              class="username"
              v-if="otherUser"
              :to="`/profile/${otherUser.id}`"
          >
            {{ otherUser.username }}
          </router-link>
          <span class="arrow">🡄</span>
        </div>
      </div>
    </div>
    <div id="messages" class="messages" ref="messagesBox">
      <div
          v-for="(message, index) in messages"
          :key="message.id"
          :class="['message',
          message.sender.id === currentUser?.id ? 'self' : 'other']"
      >
        <div class="avatar-wrapper" :style="{ opacity: shouldShowAvatar(index) ? 1 : 0 }">
          <img
              class="avatar-img"
              :src="avatarUrls[message.sender.id]"
              alt=""
          />
        </div>
        <div class="message-content">
          <span>{{ message.content }}</span>
          <div v-if="messageImageUrls[message.id] && messageImageUrls[message.id].length > 0" class="message-images">
            <img
                v-for="(url, index) in messageImageUrls[message.id]"
                :key="index"
                :src="url"
                class="message-image"
                alt=""
            />
          </div>
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
            maxlength="200"
        />
        <label for="file-upload" class="file-upload-label">
          <svg xmlns="http://www.w3.org/2000/svg" class="clip-icon" viewBox="0 0 24 24" fill="none"
               stroke="currentColor">
            <path
                d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.19 9.19a1.5 1.5 0 1 1-2.12-2.12l8.49-8.49"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <input
              type="file"
              id="file-upload"
              accept="image/jpeg, image/png"
              multiple
              ref="fileInput"
              @change="onFileChange"
              style="display: none"
          />
        </label>
        <button type="submit" :disabled="isReconnecting">Отправить</button>
      </div>
      <div v-if="selectedFiles.length > 0" class="selected-files-wrapper">
        <div class="selected-files-list">
          <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
            {{ file.name }}
            <span class="remove-file" @click="removeFile(index)">✖</span>
          </div>
        </div>
      </div>
      <div id="error-message" class="error-message">
        {{ isReconnecting ? 'Обновление соединения...' : errorMessage }}
      </div>
    </form>
  </div>
</template>

<style scoped>
@import '@/assets/styles/avatars.css';
@import '@/assets/styles/chat.css';
</style>
