```vue
<script setup>
import { ref, onMounted, watch } from 'vue'
import {API_BASE_URL} from '@/assets/scripts/config.js'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const logs = ref([])
const loading = ref(false)
const currentPage = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)

const fetchLogs = async (page = 0) => {
  loading.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/logs?page=${page}&size=10`, {
      credentials: 'include'
    })

    if (!response.ok) throw new Error('Ошибка загрузки')

    const data = await response.json()
    logs.value = data.content
    currentPage.value = data.page
    totalPages.value = data.totalPages
    totalElements.value = data.totalElements
  } catch (error) {
    console.error('Ошибка загрузки логов:', error)
    logs.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (newValue) => {
  if (newValue) {
    fetchLogs()
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
  fetchLogs()
  document.addEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">
          <span class="icon">📊</span>
          Активность пользователей
        </h2>
        <button class="close-btn" @click="handleClose" aria-label="Закрыть">
          <span class="close-icon">×</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="logs-info" v-if="!loading">
          <span class="total-count">Всего записей: {{ totalElements }}</span>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Загрузка логов...</p>
        </div>

        <div v-else class="logs-list">
          <div v-if="logs.length === 0" class="empty-state">
            <p>Нет данных для отображения</p>
          </div>

          <div v-else>
            <div
                v-for="log in logs"
                :key="log.id"
                class="log-item"
                :class="log.logType ? `log-type-${log.logType.toLowerCase()}` : ''"
            >
              <div class="log-header">
                <span class="user-info">
                  <strong class="username">{{ log.user?.username || 'Система' }}</strong>
                  <span class="user-id" v-if="log.user">#{{ log.user.id }}</span>
                </span>
                <span class="log-type-badge">{{ log.logType }}</span>
              </div>

              <div class="log-content">{{ log.logContent }}</div>

              <div class="log-footer">
                <span class="timestamp">
                  {{ new Date(log.createdAt).toLocaleString() }}
                </span>
                <span class="log-id">ID: {{ log.id }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pagination" v-if="totalPages > 1 && !loading">
          <button
              class="pagination-btn prev"
              :disabled="currentPage === 0"
              @click="fetchLogs(currentPage - 1)"
          >
            ← Назад
          </button>

          <span class="page-info">
            Страница {{ currentPage + 1 }} из {{ totalPages }}
          </span>

          <button
              class="pagination-btn next"
              :disabled="currentPage >= totalPages - 1"
              @click="fetchLogs(currentPage + 1)"
          >
            Вперед →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/admin-log.css';
</style>