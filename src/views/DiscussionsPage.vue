<script setup>
import {ref, reactive, computed, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL, ROLE_ADMIN, DEFAULT_AVATAR, PRELOAD_AVATAR} from '@/assets/scripts/config.js'

const router = useRouter()
const discussions = ref([])
const currentUser = ref(null)
const newTitle = ref('')
const message = reactive({text: '', color: ''})
const isAdmin = computed(() => currentUser.value?.role === ROLE_ADMIN)

const isDiscussionsLoaded = ref(false)

const avatarUrls = reactive({})

const formattedDate = timestamp => new Date(timestamp).toLocaleString()
const flash = (text, color = 'red') => {
  message.text = text;
  message.color = color
}

const loadUser = async () => {
  const res = await fetch(`${API_BASE_URL}/users/me`, {credentials: 'include'})
  currentUser.value = res.ok ? await res.json() : null
}

const loadDiscussions = async () => {
  const res = await fetch(`${API_BASE_URL}/discussions`, {credentials: 'include'})
  if (!res.ok) return
  discussions.value = await res.json()
  isDiscussionsLoaded.value = true

  for (const discussion of discussions.value) {
    const userId = discussion.creator.id
    avatarUrls[userId] = PRELOAD_AVATAR

    if (!discussion.creator.avatarFileName) {
      avatarUrls[userId] = DEFAULT_AVATAR
      continue
    }

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('fileName', discussion.creator.avatarFileName)
      queryParams.append('bucket', 'USER_AVATARS_BUCKET')

      const avatarResponse = await fetch(`${API_BASE_URL}/files/presigned?${queryParams.toString()}`,
          {credentials: 'include'}
      )

      if (avatarResponse.ok) {
        avatarUrls[userId] =  (await avatarResponse.json()).url
      } else {
        avatarUrls[userId] = DEFAULT_AVATAR
      }
    } catch {
      avatarUrls[userId] = DEFAULT_AVATAR
    }
  }
}

const createDiscussion = async () => {
  message.text = ''
  const title = newTitle.value.trim()
  if (!title) return flash('Тема не должна быть пустой')
  if (title.length < 5) return flash('Длина темы должна быть от 5 символов')

  const res = await fetch(`${API_BASE_URL}/discussions`, {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title})
  })
  const data = await res.json()
  if (!res.ok) return flash(data.message)
  flash('Обсуждение успешно создано!', 'green')
  newTitle.value = ''
  await loadDiscussions()
}

const removeDiscussion = async id => {
  const res = await fetch(`${API_BASE_URL}/discussions/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (res.status === 404) {
    alert('Это обсуждение уже удалено другим администратором');
    return
  }
  if (!res.ok) {
    alert('Ошибка при удалении');
    return
  }
  flash('', '')
  await loadDiscussions()
}

const openDiscussion = async (id) => {
  if (!currentUser.value) {
    await router.push("/login");
  }

  try {
    const res = await fetch(`${API_BASE_URL}/discussions/${id}`, {
      credentials: 'include'
    });
    if (res.status === 404) {
      alert('Это обсуждение не существует');
      return;
    }
    if (!res.ok) {
      return;
    }
    await router.push({path: `/discussion/${id}`})
  } catch (err) {
    console.error(err);
  }
};

onMounted(async () => {
  await loadUser()
  await loadDiscussions()
})
</script>

<template>
  <div class="container">
    <div id="discussions-container">
      <div
          id="discussion-form-container"
          v-if="isAdmin"
      >
        <h3>Создать обсуждение:</h3>
        <form id="create-discussion-form" @submit.prevent="createDiscussion">
          <input
              v-model.trim="newTitle"
              name="title"
              placeholder="Тема обсуждения"
              maxlength="100"
          />
          <div class="form-actions">
            <button type="submit">Создать</button>
            <div id="message" :style="{ color: message.color }">{{ message.text }}</div>
          </div>
        </form>
      </div>

      <div id="discussions-list" class="discussions-list">
        <div v-if="isDiscussionsLoaded && discussions.length === 0" class="no-discussions-message">
          <p>
            Администраторы пока не создали ни одного обсуждения
          </p>
        </div>

        <div
            v-for="discussion in discussions"
            :key="discussion.id"
            class="discussion-wrapper"
        >
          <div
              class="discussion-card"
              @click="openDiscussion(discussion.id)"
              style="cursor: pointer;"
          >
            <div class="discussion-info">
              <div class="discussion-meta">
                <div class="avatar-wrapper">
                  <img
                      class="avatar-img"
                      :src="avatarUrls[discussion.creator.id] || PRELOAD_AVATAR"
                      alt=""
                  />
                </div>
                <router-link
                    @click.stop
                    class="username"
                    :to="currentUser && discussion.creator.id === currentUser.id
                    ? '/profile/me'
                    : `/profile/${discussion.creator.id}`"
                >
                  <strong>{{ discussion.creator.username }}</strong>
                </router-link>
                <span>(Создатель)</span>
              </div>
              <div class="discussion-title">{{ discussion.title }}</div>
            </div>
            <div class="created-date">{{ formattedDate(discussion.createdAt) }}</div>
          </div>

          <span
              v-if="isAdmin"
              class="delete-icon"
              @click.stop="removeDiscussion(discussion.id)"
              title="Удалить обсуждение"
          >
            ❌
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/avatars.css';
@import '@/assets/styles/discussions.css';
</style>
