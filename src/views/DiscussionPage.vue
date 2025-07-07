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
      fetchMessageImageUrls(discussionMsg)
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

    for (const message of messages.value) {
      await fetchMessageImageUrls(message)
    }

    await Promise.all(users.map(fetchAvatar))

    scrollToBottom()

    startStomp(userData)
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err)
    await router.push('/home')
  }
}

function getUTF8Size(str) {
  return new TextEncoder().encode(str).length
}

async function onSubmit(event) {
  event.preventDefault()
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

  if (trimmedContent.length > 200) {
    errorMessage.value = 'Длина сообщения не должна превышать 200 символов'
    return
  }

  const formData = new FormData()
  formData.append('discussionId', discussionId)
  formData.append('content', trimmedContent)

  if (selectedFiles.value.length > 0) {
    selectedFiles.value.forEach(file => {
      formData.append('files', file)
    })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/discussionMessages`, {
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
    message.imageFileNames.forEach(name => params.append('filenames', name));
    params.append('bucket', 'DISCUSSION_MESSAGES_BUCKET');

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
    <h2 id="discussion-title">{{ discussionTitle }}</h2>
    <div id="messages" class="messages" ref="messagesContainer">
      <div
          v-for="(message, index) in messages"
          :key="message.id"
          :class="['message', message.sender.id === currentUser?.id ? 'self' : 'other']"
      >
        <div class="avatar-wrapper" :style="{ opacity: shouldShowAvatar(index) ? 1 : 0 }">
          <img
              class="avatar-img"
              :src="avatarUrls[message.sender.id]"
              alt="avatar"
          />
        </div>
        <div class="message-content">
          <div v-if="shouldShowAvatar(index)">
            <router-link
                :to="message.sender.id === currentUser?.id ? '/profile/me' : `/profile/${message.sender.id}`"
                class="username"
            >
              {{ message.sender.username }}
            </router-link>
          </div>
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
@import '@/assets/styles/discussion.css';
</style>
