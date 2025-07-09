<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { API_BASE_URL } from '@/assets/scripts/config.js'

const router = useRouter()

const posts = ref([])
const isPostsLoaded = ref(false)

const selectedPost = ref(null)
const newPostContent = ref('')
const user = ref(null)

const loadPosts = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/posts`, {
      credentials: 'include'
    })

    if (!res.ok) {
      console.log('Ошибка загрузки постов')
      return
    }

    posts.value = await res.json()
    isPostsLoaded.value = true
  } catch {
    console.log('Ошибка загрузки постов')
  }
}

const deletePost = async (postId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (res.ok) {
      // после удаления обновим список постов
      await loadPosts()
    } else {
      alert('Не удалось удалить пост')
    }
  } catch (e) {
    alert('Ошибка при удалении поста')
  }
}

const fetchPostWithComments = async (postId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      credentials: 'include'
    })
    if (res.ok) {
      selectedPost.value = await res.json()
    } else {
      alert('Не удалось загрузить пост')
    }
  } catch (e) {
    alert('Ошибка при загрузке поста')
  }
}

const togglePostLike = async (post) => {
  const hasLiked = post.likedUserIds.includes(user.value.id)
  const method = hasLiked ? 'DELETE' : 'POST'

  try {
    const res = await fetch(`${API_BASE_URL}/posts/${post.id}/likes`, {
      method,
      credentials: 'include'
    })
    if (res.ok) {
      if (hasLiked) {
        post.likedUserIds = post.likedUserIds.filter(id => id !== user.value.id)
      } else {
        post.likedUserIds.push(user.value.id)
      }
    }
  } catch (e) {
    alert('Ошибка при обработке лайка')
  }
}

const toggleCommentLike = async (comment) => {
  const hasLiked = comment.likedUserIds.includes(user.value.id)
  const method = hasLiked ? 'DELETE' : 'POST'

  try {
    const res = await fetch(`${API_BASE_URL}/comments/${comment.id}/likes`, {
      method,
      credentials: 'include'
    })
    if (res.ok) {
      if (hasLiked) {
        comment.likedUserIds = comment.likedUserIds.filter(id => id !== user.value.id)
      } else {
        comment.likedUserIds.push(user.value.id)
      }
    }
  } catch (e) {
    alert('Ошибка при обработке лайка комментария')
  }
}

onMounted(async () => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include'
  })

  if (response.ok) {
    user.value = await response.json()
  }

  await loadPosts()
})
</script>


<template>
  <div class="container">
    <div class="user-posts-section">
      <div v-if="posts.length === 0" class="no-posts">
        Пользователи пока не создали ни одного поста
      </div>

      <ul class="posts-list" v-else>
        <li v-for="post in posts" :key="post.id" class="post-item">
          <p class="post-content">{{ post.content }}</p>
          <p class="post-date">Опубликовано: {{ new Date(post.createdAt).toLocaleString() }}</p>
          <div class="post-actions">
            <button @click="togglePostLike(post)">
              ❤️ {{ post.likedUserIds.length }}
            </button>
            <button @click="fetchPostWithComments(post.id)">
              💬 {{ post.commentCount }}
            </button>
            <button @click="deletePost(post.id)">
              🗑️ Удалить
            </button>
          </div>
        </li>
      </ul>

      <div v-if="selectedPost" class="selected-post">
        <ul>
          <li v-for="comment in selectedPost.comments" :key="comment.id" class="comment-item">
            <p><strong>{{ comment.author.username }}:</strong> {{ comment.content }}</p>
            <p>
              <button @click="toggleCommentLike(comment)">
                ❤️ {{ comment.likedUserIds.length }}
              </button>
            </p>
          </li>
        </ul>

        <button @click="selectedPost = null">← Назад</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/posts.css';
</style>