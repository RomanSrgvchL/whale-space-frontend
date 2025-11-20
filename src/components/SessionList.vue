<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { UAParser } from 'ua-parser-js'
import { API_BASE_URL } from '@/assets/scripts/config.js'

const router = useRouter()

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const sessions = ref([])
const loading = ref(false)
const error = ref('')

const fetchSessions = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      credentials: 'include'
    })

    if (!response.ok) throw new Error('Ошибка загрузки сессий')

    sessions.value = await response.json()
  } catch (err) {
    console.error('Ошибка загрузки сессий:', err)
    error.value = 'Не удалось загрузить список сессий'
    sessions.value = []
  } finally {
    loading.value = false
  }
}

const logoutFromDevice = async (sessionId, isCurrentSession = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/session/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      let errorMessage = 'Ошибка выхода'
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = `Ошибка ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    // Если выходим с текущего устройства - перенаправляем на логин
    if (isCurrentSession) {
      router.push('/login')
      return
    }

    await fetchSessions()
  } catch (err) {
    console.error('Ошибка выхода с устройства:', err)
    error.value = err.message || 'Не удалось выйти с устройства'
    setTimeout(() => {
      error.value = ''
    }, 3000)
  }
}

const logoutFromAllDevices = async (includeCurrent = false) => {
  try {
    const url = includeCurrent
        ? `${API_BASE_URL}/auth/session?includeCurrent=true`
        : `${API_BASE_URL}/auth/session`

    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      let errorMessage = 'Ошибка выхода'
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = `Ошибка ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    await fetchSessions()

    if (includeCurrent) {
      router.push('/login')
    }
  } catch (err) {
    console.error('Ошибка выхода со всех устройств:', err)
    error.value = err.message
  }
}

const getBrowserInfo = (userAgent) => {
  if (!userAgent) return { name: 'Неизвестно', version: '' }

  const parser = new UAParser(userAgent)
  const browser = parser.getBrowser()
  return {
    name: browser.name || 'Неизвестно',
    version: browser.version || ''
  }
}

const getDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Неизвестно'

  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  const deviceType = result.device.type || 'desktop'
  const deviceModel = result.device.model || ''
  const os = result.os.name || ''

  let deviceText = ''

  switch (deviceType) {
    case 'mobile':
      deviceText = '📱 Мобильное устройство'
      break
    case 'tablet':
      deviceText = '📟 Планшет'
      break
    case 'smarttv':
      deviceText = '📺 Smart TV'
      break
    case 'console':
      deviceText = '🎮 Игровая консоль'
      break
    default:
      deviceText = '💻 ПК'
  }

  if (deviceModel) {
    deviceText += ` • ${deviceModel}`
  }
  if (os) {
    deviceText += ` • ${os}`
  }

  return deviceText
}

const formatDateTime = (instant) => {
  return new Date(instant).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

watch(() => props.show, (newValue) => {
  if (newValue) {
    fetchSessions()
  }
})

const handleClose = () => {
  emit('close')
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content session-modal">
      <div class="modal-header">
        <h2 class="modal-title">
          <span class="icon">🔐</span>
          Активные сессии
        </h2>
        <button class="close-btn" @click="handleClose" aria-label="Закрыть">
          <span class="close-icon">×</span>
        </button>
      </div>

      <div class="modal-body">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Загрузка сессий...</p>
        </div>

        <div v-else class="sessions-content">
          <div class="sessions-info" v-if="sessions.length > 0">
            <span class="total-count">Всего активных сессий: {{ sessions.length }}</span>
          </div>

          <div class="sessions-list">
            <div v-if="sessions.length === 0" class="empty-state">
              <p>Нет активных сессий</p>
            </div>

            <div class="items" v-else>
              <div
                  v-for="session in sessions"
                  :key="session.sessionId"
                  class="session-item"
                  :class="{ 'current-session': session.currentSession }"
              >
                <div class="session-header">
                  <div class="device-browser-info">
                    <div class="device-info">{{ getDeviceInfo(session.userAgent) }}</div>
                    <div class="browser-info">
                      {{ getBrowserInfo(session.userAgent).name }}
                      <span v-if="getBrowserInfo(session.userAgent).version">
                        v{{ getBrowserInfo(session.userAgent).version }}
                      </span>
                    </div>
                  </div>
                  <span v-if="session.currentSession" class="current-badge">Текущее устройство</span>
                </div>

                <div class="session-details">
                  <div class="session-info">
                    <span class="ip-address">IP: {{ session.ipAddress }}</span>
                    <div class="time-info">
                      <span class="time-entry">
                        <strong>Вход:</strong> {{ formatDateTime(session.creationTime) }}
                      </span>
                      <span class="time-entry">
                        <strong>Активность:</strong> {{ formatDateTime(session.lastAccessTime) }}
                      </span>
                    </div>
                  </div>

                  <div class="session-actions">
                    <button
                        @click="logoutFromDevice(session.sessionId, session.currentSession)"
                        class="logout-btn"
                        :class="{ 'current-logout-btn': session.currentSession }"
                    >
                      Выйти
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bulk-actions" v-if="sessions.length > 0">
            <button
                v-if="sessions.filter(session => !session.currentSession).length > 0"
                @click="logoutFromAllDevices(false)"
                class="bulk-btn logout-others"
            >
              Выйти со всех устройств (кроме текущего)
            </button>
            <button
                @click="logoutFromAllDevices(true)"
                class="bulk-btn logout-all"
            >
              Выйти со всех устройств (включая текущее)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/session-list.css';
</style>