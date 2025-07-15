<script setup>
import {onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL, DEFAULT_AVATAR, PRELOAD_AVATAR, ROLE_ADMIN} from '@/assets/scripts/config.js'

const props = defineProps({
  userId: Number,
  noPostsMessage: String
})

const router = useRouter()

const posts = ref([])
const isPostsLoaded = ref(false)

const selectedPost = ref(null)
const currentUser = ref(null)
const newCommentContent = ref('')

const avatarUrls = reactive({})
const postImageUrls = reactive({})

async function loadAvatarsForPosts(postsArray) {
  const userIds = new Set()
  const usersToLoad = []

  for (const post of postsArray) {
    if (post.author && post.author.id && !avatarUrls[post.author.id]) {
      userIds.add(post.author.id)
      usersToLoad.push(post.author)
    }
    if (post.comments && post.comments.length > 0) {
      for (const comment of post.comments) {
        if (comment.author && comment.author.id && !avatarUrls[comment.author.id]) {
          userIds.add(comment.author.id)
          usersToLoad.push(comment.author)
        }
      }
    }
  }

  for (const userItem of usersToLoad) {
    avatarUrls[userItem.id] = PRELOAD_AVATAR

    if (!userItem.avatarFileName) {
      avatarUrls[userItem.id] = DEFAULT_AVATAR
      continue
    }

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('fileName', userItem.avatarFileName)
      queryParams.append('bucket', 'USER_AVATARS_BUCKET')

      const avatarResponse = await fetch(`${API_BASE_URL}/files/presigned?${queryParams.toString()}`,
          {credentials: 'include'}
      )

      if (avatarResponse.ok) {
        avatarUrls[userItem.id] =  (await avatarResponse.json()).url
      } else {
        avatarUrls[userItem.id] = DEFAULT_AVATAR
      }
    } catch {
      avatarUrls[userItem.id] = DEFAULT_AVATAR
    }
  }
}

async function loadImagesForPosts(postsArray) {
  for (const post of postsArray) {
    if (post.imageFileNames && post.imageFileNames.length > 0) {
      try {
        const queryParams = new URLSearchParams()
        post.imageFileNames.forEach(fileName => queryParams.append('fileNames', fileName))
        queryParams.append('bucket', 'POST_FILES_BUCKET')

        const res = await fetch(`${API_BASE_URL}/files/presigned/batch?${queryParams.toString()}`, {
          credentials: 'include'
        })

        if (res.ok) {
          postImageUrls[post.id] = await res.json()
        } else {
          console.warn(`Не удалось получить ссылки для поста ${post.id}`)
        }
      } catch (e) {
        console.error(`Ошибка загрузки изображений для поста ${post.id}`, e)
      }
    }
  }
}

const canDeletePost = (post) => {
  const role = currentUser.value?.role
  return role === ROLE_ADMIN || post.author.id === currentUser.value?.id
}

const canDeleteComment = (comment) => {
  const role = currentUser.value?.role
  return role === ROLE_ADMIN || comment.author.id === currentUser.value?.id
}

const loadPosts = async () => {
  try {
    const url = props.userId
        ? `${API_BASE_URL}/posts/user/${props.userId}`
        : `${API_BASE_URL}/posts`

    const res = await fetch(url, {
      credentials: 'include'
    })

    if (!res.ok) {
      console.log('Ошибка загрузки постов')
      return
    }

    posts.value = await res.json()
    isPostsLoaded.value = true

    await loadAvatarsForPosts(posts.value)
    await loadImagesForPosts(posts.value)
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
      if (selectedPost.value && selectedPost.value.id === postId) {
        closePostView()
      }
      await loadPosts()
    } else if (res.status === 404) {
      alert('Этот пост уже удалён')
      if (selectedPost.value && selectedPost.value.id === postId) {
        closePostView()
      }
    } else {
      alert('Не удалось удалить пост')
    }
  } catch (e) {
    alert('Ошибка при удалении поста')
  }
}

const deleteComment = async (commentId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (res.ok) {
      await reloadSelectedPost()
    } else if (res.status === 404) {
      alert('Этот комментарий уже удалён')
    } else {
      alert('Не удалось удалить комментарий')
    }
  } catch (e) {
    alert('Ошибка при удалении комментария')
  }
}

const updatePostInList = (updatedPost) => {
  const index = posts.value.findIndex(p => p.id === updatedPost.id)
  if (index !== -1) {
    const commentCount = updatedPost.comments ? updatedPost.comments.length : 0

    posts.value[index] = {
      ...updatedPost,
      commentCount
    }
  }
}

const reloadSelectedPost = async () => {
  if (!selectedPost.value) return

  try {
    const res = await fetch(`${API_BASE_URL}/posts/${selectedPost.value.id}`, {
      credentials: 'include'
    })
    if (res.ok) {
      const updatedPost = await res.json()
      selectedPost.value = updatedPost
      updatePostInList(updatedPost)
    }
  } catch (e) {
    console.log('Ошибка при обновлении поста')
  }
}

const togglePostLike = async (post) => {
  if (!currentUser.value) {
    await router.push('/login')
    return
  }

  const hasLiked = post.likedUserIds.includes(currentUser.value.id)
  const method = hasLiked ? 'DELETE' : 'POST'

  try {
    const res = await fetch(`${API_BASE_URL}/posts/${post.id}/likes`, {
      method,
      credentials: 'include'
    })
    if (res.ok) {
      if (hasLiked) {
        post.likedUserIds = post.likedUserIds.filter(id => id !== currentUser.value.id)
      } else {
        post.likedUserIds.push(currentUser.value.id)
      }
    } else if (res.status === 404) {
      alert('Этот пост уже удалён')
      if (selectedPost.value && selectedPost.value.id === post.id) {
        closePostView()
      }
    } else {
      alert('Ошибка при обработке лайка поста')
    }
  } catch (e) {
    alert('Ошибка при обработке лайка поста')
  }
}

const toggleCommentLike = async (comment) => {
  if (!currentUser.value) {
    await router.push('/login')
    return
  }

  const hasLiked = comment.likedUserIds.includes(currentUser.value.id)
  const method = hasLiked ? 'DELETE' : 'POST'

  try {
    const res = await fetch(`${API_BASE_URL}/comments/${comment.id}/likes`, {
      method,
      credentials: 'include'
    })
    if (res.ok) {
      if (hasLiked) {
        comment.likedUserIds = comment.likedUserIds.filter(id => id !== currentUser.value.id)
      } else {
        comment.likedUserIds.push(currentUser.value.id)
      }
    } else if (res.status === 404) {
      alert('Этот комментарий уже удалён')
    } else {
      alert('Ошибка при обработке лайка комментария')
    }
  } catch (e) {
    alert('Ошибка при обработке лайка комментария')
  }
}

const fetchPostWithComments = async (postId) => {
  if (!currentUser.value) {
    await router.push('/login')
    return
  }

  if (selectedPost.value && selectedPost.value.id === postId) {
    closePostView()
    return
  }

  try {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      credentials: 'include'
    })
    if (res.ok) {
      const postWithComments = await res.json()
      selectedPost.value = postWithComments
      updatePostInList(postWithComments)

      await loadAvatarsForPosts([postWithComments])
    } else if (res.status === 404) {
      alert('Этот пост уже удалён')
      if (selectedPost.value && selectedPost.value.id === postId) {
        closePostView()
      }
    } else {
      alert('Не удалось загрузить пост')
    }
  } catch (e) {
    alert('Ошибка при загрузке поста')
  }
}


const submitComment = async () => {
  if (!currentUser.value) {
    await router.push('/login')
    return
  }

  const trimmedContent = newCommentContent.value.trim()

  if (!trimmedContent) {
    alert('Комментарий не должен быть пустым')
    return
  }

  try {
    const res = await fetch(`${API_BASE_URL}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        postId: selectedPost.value.id,
        content: trimmedContent
      })
    })

    if (res.ok) {
      newCommentContent.value = ''
      await reloadSelectedPost()
      await loadAvatarsForPosts([selectedPost.value])
    } else if (res.status === 404) {
      alert('Этот пост уже удалён')
    } else {
      const error = await res.json()
      alert(error.message)
    }
  } catch (e) {
    alert('Ошибка при отправке комментария')
  }
}

const closePostView = () => {
  selectedPost.value = null
  newCommentContent.value = ''
}

onMounted(async () => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include'
  })

  if (response.ok) {
    currentUser.value = await response.json()
  }

  await loadPosts()
})

defineExpose({ loadPosts })
</script>

<template>
  <div class="user-posts-section">
    <div v-if="isPostsLoaded && posts.length === 0" class="no-posts">
      {{ noPostsMessage }}
    </div>

    <div v-else class="posts-list">
      <div v-for="post in posts" :key="post.id" class="post-card">
        <div class="author-info">
          <div class="avatar-wrapper">
            <img
                class="avatar-img"
                :src="avatarUrls[post.author.id] || PRELOAD_AVATAR"
                alt=""
            />
          </div>
          <router-link
              class="author"
              :to="currentUser && currentUser.id === post.author.id ? '/profile/me' : `/profile/${post.author.id}`"
          >
            <strong>{{ post.author.username }}</strong>
          </router-link>
        </div>
        <p class="content">{{ post.content }}</p>
        <div v-if="postImageUrls[post.id] && postImageUrls[post.id].length > 0" class="post-images">
          <img
              v-for="(url, index) in postImageUrls[post.id]"
              :key="index"
              :src="url"
              class="post-image"
              alt=""
          />
        </div>
        <div class="post-stats">
          <button
              class="like-button"
              :class="{ liked: post.likedUserIds.includes(currentUser?.id) }"
              @click="togglePostLike(post)"
          >
            ❤️ {{ post.likedUserIds.length }}
          </button>
          <button class="comment-button" @click="fetchPostWithComments(post.id)">
            💬 {{ post.commentCount }}
          </button>
          <button
              v-if="canDeletePost(post)"
              class="delete-button"
              @click="deletePost(post.id)"
              title="Удалить пост"
          >
            🗑️ Удалить
          </button>
          <div class="meta">{{ new Date(post.createdAt).toLocaleString() }}</div>
        </div>

        <div v-if="selectedPost && selectedPost.id === post.id" class="selected-post">
          <div class="comments-section">
            <div v-if="selectedPost.comments?.length === 0" class="no-comments">Комментариев пока нет</div>
            <div v-else class="comments-wrapper">
              <div
                  v-for="comment in selectedPost.comments"
                  :key="comment.id"
                  class="comment-card"
              >
                <div class="author-info">
                  <div class="avatar-wrapper">
                    <img
                        class="avatar-img"
                        :src="avatarUrls[comment.author.id] || PRELOAD_AVATAR"
                        alt=""
                    />
                  </div>
                  <router-link
                      class="author"
                      :to="currentUser && currentUser.id === comment.author.id
                        ? '/profile/me'
                        : `/profile/${comment.author.id}`"
                  >
                    <strong>{{ comment.author.username }}</strong>
                  </router-link>
                </div>
                <p class="content">{{ comment.content }}</p>
                <div class="comment-buttons-wrapper">
                  <button
                      class="like-button"
                      :class="{ liked: comment.likedUserIds.includes(currentUser?.id) }"
                      @click="toggleCommentLike(comment)"
                  >
                    ❤️ {{ comment.likedUserIds.length }}
                  </button>

                  <button
                      v-if="canDeleteComment(comment)"
                      class="delete-button"
                      @click="deleteComment(comment.id)"
                      title="Удалить комментарий"
                  >
                    🗑️ Удалить
                  </button>
                  <div class="meta">{{ new Date(comment.createdAt).toLocaleString() }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="comment-form">
              <textarea
                  v-model="newCommentContent"
                  placeholder="Напишите комментарий..."
                  maxlength="1000"
                  rows="3"
              ></textarea>
            <div class="comment-buttons-wrapper">
              <button @click="submitComment">Отправить</button>
              <button @click="closePostView">Назад</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/avatars.css';
@import '@/assets/styles/post-list.css';
</style>