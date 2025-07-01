<script setup>
import {ref, onMounted, reactive} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL} from '@/assets/scripts/config.js'

const router = useRouter()

const user = ref(null)
const createdAt = ref('')
const role = ref('')
const username = ref('')

const fileInput = ref(null)
const selectedFileCheckmarkVisible = ref(false)
const message = reactive({text: '', color: ''})

const formRef = ref(null)

const PRELOAD_AVATAR = '/avatars/preload.jpg'
const DEFAULT_AVATAR = '/avatars/default.jpg'

const avatarUrls = reactive({avatar: PRELOAD_AVATAR})

const refreshAvatar = async () => {
  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/users/me`, {
      credentials: 'include'
    })
    const updatedUser = await refreshResponse.json()

    if (updatedUser.avatarFileName) {
      try {
        const avatarResponse = await fetch(
            `${API_BASE_URL}/users/avatar/${encodeURIComponent(updatedUser.avatarFileName)}`,
            {credentials: 'include'}
        )
        const avatarData = await avatarResponse.json()

        avatarUrls.avatar = avatarData.success ? avatarData.avatarUrl : DEFAULT_AVATAR
      } catch {
        avatarUrls.avatar = DEFAULT_AVATAR
      }
    } else {
      avatarUrls.avatar = DEFAULT_AVATAR
    }
  } catch (err) {
    console.error('Ошибка при получении данных пользователя:', err)
    avatarUrls.avatar = DEFAULT_AVATAR
  }
}

const flash = (text, color = "red") => {
  message.text = text
  message.color = color
}

const onFileChange = () => {
  selectedFileCheckmarkVisible.value = fileInput.value?.files.length > 0
}

const checkImageSize = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 400 || img.height < 400) {
          reject('Минимальный размер изображения должен быть 400x400 пикселей');
        } else {
          resolve();
        }
      };
      img.onerror = () => {
        reject('Не удалось загрузить изображение для проверки размера');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject('Ошибка чтения файла');
    };
    reader.readAsDataURL(file);
  });
}

const submitForm = async (e) => {
  e.preventDefault()
  flash('', '')

  if (!fileInput.value?.files.length) {
    flash('Пожалуйста, выберите файл для загрузки')
    return
  }

  const file = fileInput.value.files[0]

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    flash('Файл должен быть формата PNG или JPG/JPEG')
    return
  }

  if (file.size > 3 * 1024 * 1024) {
    flash('Размер файла не должен превышать 3 МБ')
    return
  }

  try {
    await checkImageSize(file)
  } catch (errorMessage) {
    flash(errorMessage)
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(`${API_BASE_URL}/users/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
    const data = await response.json()

    if (response.ok) {
      flash(data.message, 'green')
      fileInput.value.value = ''
      selectedFileCheckmarkVisible.value = false
      await refreshAvatar()
    } else {
      flash(data.message)
    }
  } catch (err) {
    console.error('Ошибка при загрузке аватара:', err)
  }
}

const deleteAvatar = async () => {
  flash('', '')

  try {
    const response = await fetch(`${API_BASE_URL}/users/avatar`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (response.ok) {
      flash("Аватар успешно удалён!", 'green')
      await refreshAvatar()
    } else {
      const data = await response.json()
      flash(data.message)
    }
  } catch (err) {
    console.error('Ошибка при удалении аватара:', err)
  }
}

onMounted(async () => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include'
  })

  if (!response.ok) {
    await router.push('/home')
    return
  }

  user.value = await response.json()
  username.value = user.value.username
  createdAt.value = new Date(user.value.createdAt).toLocaleString()
  role.value = user.value.role.replace(/^ROLE_/, '')

  await refreshAvatar()
})
</script>

<template>
  <div class="container">
    <div class="profile">
      <div class="user-card">
        <div class="user-info">
          <div class="avatar-wrapper">
            <img
                class="avatar-img"
                :src="avatarUrls.avatar"
                alt=""
            />
          </div>
          <p class="username" id="username">{{ username }}</p>
          <p class="registered-label">
            Дата регистрации:<br/>
            <span class="date" id="created-at">{{ createdAt }}</span>
          </p>
          <p class="role" id="role">{{ role }}</p>
        </div>
      </div>

      <div class="profile-actions">
        <form
            ref="formRef"
            id="avatar-upload-form"
            enctype="multipart/form-data"
            @submit="submitForm"
        >
          <span
              id="selected-file-checkmark"
              :class="{ visible: selectedFileCheckmarkVisible }"
          >✔️</span
          >
          <label for="avatar-file" class="file-label">
            <span class="file-icon">📁</span>
            <span class="file-text">Выбрать изображение</span>
            <input
                type="file"
                id="avatar-file"
                accept="image/jpeg, image/png"
                hidden
                ref="fileInput"
                @change="onFileChange"
            />
          </label>
        </form>

        <div class="button-group">
          <button type="submit" form="avatar-upload-form" class="discussion-button upload">
            Загрузить аватар
          </button>
          <button
              id="delete-avatar-btn"
              class="discussion-button delete"
              @click.prevent="deleteAvatar"
          >
            Удалить аватар
          </button>
        </div>

        <div id="message" :style="{ color: message.color }">{{ message.text }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/profile.css';
</style>
