<script setup>
import { ref, onMounted } from 'vue'
import { API_BASE_URL } from '@/assets/scripts/config.js'

const posts = ref([])
const isPostsLoaded = ref(false)
const message = ref('')

const formattedDate = timestamp => new Date(timestamp).toLocaleString()

const loadPosts = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/posts`, { credentials: 'include' })
    if (!res.ok) {
      message.value = 'Ошибка загрузки постов'
      return
    }
    posts.value = await res.json()
    isPostsLoaded.value = true
  } catch {
    message.value = 'Ошибка загрузки постов'
  }
}

onMounted(() => {
  loadPosts()
})
</script>

<template>
  <div class="container">
    <div v-if="message" class="error-message">{{ message }}</div>

    <ul v-if="isPostsLoaded && posts.length" class="posts-list">
      <li v-for="post in posts" :key="post.id" class="post-card">
        <div class="post-content">{{ post.content }}</div>
        <div class="post-meta">
          <span>Автор: {{ post.author.username }}</span> •
          <span>{{ formattedDate(post.createdAt) }}</span>
        </div>
        <div class="post-stats">
          <span>Комментарии: {{ post.commentCount }}</span> •
          <span>Лайки: {{ post.likedIds?.length || 0 }}</span>
        </div>
      </li>
    </ul>

    <div v-if="isPostsLoaded && posts.length === 0" class="no-posts">Пользователи пока не создали ни одного поста</div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/posts.css';
</style>