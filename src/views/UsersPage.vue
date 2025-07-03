<script setup>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL, DEFAULT_AVATAR, PRELOAD_AVATAR} from '@/assets/scripts/config.js'

const router = useRouter()
const users = ref([])
const page = reactive({size: 6, current: 0, total: 0})
const sort = reactive({field: 'createdAt', order: 'desc'})
const dialogUsername = ref('')
const message = reactive({text: '', color: ''})

const avatarUrls = reactive({})
const currentUser = ref(null)

const formattedDate = timestamp => new Date(timestamp).toLocaleString()
const flash = (text, color = 'red') => {
  message.text = text
  message.color = color
}

function redirectWithDelay(url, delay = 750) {
  setTimeout(() => router.push(url), delay)
}

async function fetchUsers(index = 0) {
  try {
    const res = await fetch(`${API_BASE_URL}/users?page=${index}&size=${page.size}&sort=${sort.field}&order=${sort.order}`, {
      credentials: 'include'
    })

    if (!res.ok) throw new Error()

    const data = await res.json()
    users.value = data.content
    page.total = data.totalPages
    page.current = index
    message.text = ''

    for (const user of users.value) {
      avatarUrls[user.id] = PRELOAD_AVATAR

      if (!user.avatarFileName) {
        avatarUrls[user.id] = DEFAULT_AVATAR
        continue
      }

      try {
        const resAvatar = await fetch(`${API_BASE_URL}/users/avatar/${encodeURIComponent(user.avatarFileName)}`, {
          credentials: 'include'
        })
        const dataAvatar = await resAvatar.json()
        avatarUrls[user.id] = dataAvatar.success ? dataAvatar.avatarUrl : DEFAULT_AVATAR
      } catch {
        avatarUrls[user.id] = DEFAULT_AVATAR
      }
    }
  } catch {
    flash('Ошибка загрузки пользователей')
  }
}

function setSortField(field) {
  if (sort.field !== field) {
    sort.field = field
    fetchUsers(0)
  }
}

function setSortOrder(order) {
  if (sort.order !== order) {
    sort.order = order
    fetchUsers(0)
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
    const userResponse = await fetch(`${API_BASE_URL}/users/username/${encodeURIComponent(username)}`, {
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

    const me = await fetch(`${API_BASE_URL}/users/me`, {credentials: 'include'}).then(res => res.json())

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

onMounted(async () => {
  await fetchUsers(0)

  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {credentials: 'include'})
    if (res.ok) {
      currentUser.value = await res.json()
    }
  } catch (error) {
    console.error('Ошибка при получении текущего пользователя:', error)
  }
})
</script>

<template>
  <div class="container">
    <div class="main-layout">
      <div class="users-list">
        <div
            v-for="user in users"
            :key="user.id"
            class="user-card"
        >
          <div class="user-info">
            <div class="avatar-wrapper">
              <img
                  class="avatar-img"
                  :src="avatarUrls[user.id] || PRELOAD_AVATAR"
                  alt=""
              />
            </div>
            <router-link
                class="username"
                :to="currentUser && user.id === currentUser.id ? '/profile/me' : `/profile/${user.id}`"
            >
              {{ user.username }}
            </router-link>
            <p class="registered-label">
              Дата регистрации:<br/>
              <span class="date">{{ formattedDate(user.createdAt) }}</span>
            </p>
            <p class="role">{{ user.role.replace(/^ROLE_/, '') }}</p>
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
              v-for="user in pagination"
              :key="user"
              :class="{ active: user === page.current }"
              :disabled="user === page.current"
              @click="fetchUsers(user)"
          >
            {{ user + 1 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/users.css';
</style>
