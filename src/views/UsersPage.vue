<script setup>
import {ref, reactive, computed, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL} from '@/assets/scripts/config.js'

const router = useRouter()
const people = ref([])
const page = reactive({size: 6, current: 0, total: 0})
const sort = reactive({field: 'createdAt', order: 'desc'})
const dialogUsername = ref('')
const message = reactive({text: '', color: ''})

const PRELOAD_AVATAR = '/avatars/preload.jpg'
const DEFAULT_AVATAR = '/avatars/default.jpg'

const avatarUrls = reactive({})

const formattedDate = timestamp => new Date(timestamp).toLocaleString()
const flash = (text, color = 'red') => {
  message.text = text
  message.color = color
}

function redirectWithDelay(url, delay = 750) {
  setTimeout(() => router.push(url), delay)
}

async function fetchPeople(index = 0) {
  try {
    const res = await fetch(`${API_BASE_URL}/people?page=${index}&size=${page.size}&sort=${sort.field}&order=${sort.order}`, {
      credentials: 'include'
    })

    if (!res.ok) throw new Error()

    const data = await res.json()
    people.value = data.content
    page.total = data.totalPages
    page.current = index
    message.text = ''

    for (const person of people.value) {
      avatarUrls[person.id] = PRELOAD_AVATAR

      if (!person.avatarFileName) {
        avatarUrls[person.id] = DEFAULT_AVATAR
        continue
      }

      try {
        const resAvatar = await fetch(`${API_BASE_URL}/people/avatar/${encodeURIComponent(person.avatarFileName)}`, {
          credentials: 'include'
        })
        const dataAvatar = await resAvatar.json()
        avatarUrls[person.id] = dataAvatar.success ? dataAvatar.avatarUrl : DEFAULT_AVATAR
      } catch {
        avatarUrls[person.id] = DEFAULT_AVATAR
      }
    }
  } catch {
    flash('Ошибка загрузки пользователей')
  }
}

function setSortField(field) {
  if (sort.field !== field) {
    sort.field = field
    fetchPeople(0)
  }
}

function setSortOrder(order) {
  if (sort.order !== order) {
    sort.order = order
    fetchPeople(0)
  }
}

const pagination = computed(() => {
  const arr = []
  if (page.total <= 5) {
    for (let i = 0; i < page.total; i++) arr.push(i)
  } else {
    const set = new Set([0, page.total - 1, page.current])
    if (page.current > 0) set.add(page.current - 1)
    if (page.current < page.total - 1) set.add(page.current + 1)
    arr.push(...Array.from(set).sort((a, b) => a - b))
  }
  return arr
})

async function initiateChatWithUser(username) {
  try {
    const userResponse = await fetch(`${API_BASE_URL}/people/username/${encodeURIComponent(username)}`, {
      credentials: 'include'
    })

    if (userResponse.status === 404) {
      message.text = `Пользователь "${username}" не найден`
      message.color = 'red'
      return
    }

    if (!userResponse.ok) {
      throw new Error('Ошибка при поиске пользователя')
    }

    message.text = `Пользователь "${username}" найден!`
    message.color = 'green'

    const partner = await userResponse.json()
    const partnerId = partner.id

    const chatResponse = await fetch(`${API_BASE_URL}/chats/with/${partnerId}`, {credentials: 'include'})

    if (chatResponse.status === 404) {
      const createChatResponse = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({partnerId: partnerId}),
      })

      if (createChatResponse.status === 201) {
        const createdChat = await createChatResponse.json()
        redirectWithDelay(`/chat/${createdChat.id}`)
      } else {
        throw new Error('Ошибка при создании чата')
      }
    } else if (chatResponse.ok) {
      redirectWithDelay(`/chat/${(await chatResponse.json()).id}`)
    } else {
      throw new Error('Ошибка при получении чата')
    }
  } catch (error) {
    flash('Ошибка при получении/создании чата')
    console.error(error)
  }
}

function validateUsername(name, currentUsername) {
  if (!name) return 'Введите имя пользователя'
  if (name.length > 20) return 'Имя пользователя не может содержать более 20 символов'
  if (name === currentUsername) return 'Вы не можете написать самому себе'
  if (!/^(?!.*[;\\\/?&#]).*$/.test(name)) return 'Имя пользователя не может содержать символы ; \\ / ? & #'
  return null
}

async function submitDialog(e) {
  e.preventDefault()
  const name = dialogUsername.value.trim()

  try {
    const authCheckResponse = await fetch(`${API_BASE_URL}/auth/check`, {credentials: 'include'})
    if (!authCheckResponse.ok) {
      flash('Авторизуйтесь чтобы написать пользователю')
      return
    }

    const me = await fetch(`${API_BASE_URL}/people/me`, {credentials: 'include'}).then(res => res.json())

    const validationError = validateUsername(name, me.username)
    if (validationError) {
      flash(validationError)
      return
    }

    await initiateChatWithUser(name)

  } catch (error) {
    flash('Ошибка авторизации')
    console.error(error)
  }
}

onMounted(() => {
  fetchPeople(0)
})
</script>

<template>
  <div class="container">
    <div class="main-layout">
      <div class="people-list">
        <div
            v-for="person in people"
            :key="person.id"
            class="person-card"
        >
          <div class="person-info">
            <div class="avatar-wrapper">
              <img
                  class="avatar-img"
                  :src="avatarUrls[person.id] || PRELOAD_AVATAR"
                  alt=""
              />
            </div>
            <p class="username">{{ person.username }}</p>
            <p class="registered-label">
              Дата регистрации:<br/>
              <span class="date">{{ formattedDate(person.createdAt) }}</span>
            </p>
            <p class="role">{{ person.role.replace(/^ROLE_/, '') }}</p>
          </div>
        </div>
      </div>

      <div class="users-actions">
        <h3>Написать пользователю:</h3>
        <form @submit="submitDialog" class="start-dialog-form">
          <input v-model="dialogUsername" name="username" placeholder="Имя пользователя"/>
          <button type="submit">Написать</button>
        </form>
        <div id="message" :style="{ color: message.color }">{{ message.text }}</div>

        <div class="sort-controls">
          <div class="sort-field">
            <span>Сортировать по:</span>
            <button
                :class="{ active: sort.field === 'username' }"
                :disabled="sort.field === 'username'"
                @click="setSortField('username')"
            >
              Имя пользователя
            </button>
            <button
                :class="{ active: sort.field === 'createdAt' }"
                :disabled="sort.field === 'createdAt'"
                @click="setSortField('createdAt')"
            >
              Дата регистрации
            </button>
          </div>
          <div class="sort-order">
            <span>Порядок:</span>
            <button
                :class="{ active: sort.order === 'asc' }"
                :disabled="sort.order === 'asc'"
                @click="setSortOrder('asc')"
            >
              По возрастанию
            </button>
            <button
                :class="{ active: sort.order === 'desc' }"
                :disabled="sort.order === 'desc'"
                @click="setSortOrder('desc')"
            >
              По убыванию
            </button>
          </div>
        </div>

        <div id="pagination">
          <button
              v-for="person in pagination"
              :key="person"
              :class="{ active: person === page.current }"
              :disabled="person === page.current"
              @click="fetchPeople(person)"
          >
            {{ person + 1 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/users.css';
</style>
