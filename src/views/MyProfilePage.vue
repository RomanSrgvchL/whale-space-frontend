<script setup>
import UserPosts from '@/components/PostList.vue'
import {ref, onMounted, reactive} from 'vue'
import {API_BASE_URL, PRELOAD_AVATAR, DEFAULT_AVATAR} from '@/assets/scripts/config.js'

const currentUser = ref(null)
const userPosts = ref(null)
const createdAt = ref('')
const role = ref('')
const username = ref('')

const fileInput = ref(null)
const selectedFileCheckmarkVisible = ref(false)
const message = reactive({text: '', color: ''})
const postMessage = reactive({ text: '', color: '' })

const formRef = ref(null)

const avatarUrls = reactive({avatar: PRELOAD_AVATAR})
const isEditing = ref(false)
const today = new Date().toISOString().split('T')[0]

const newPostContent = ref('')
const selectedFiles = ref([])
const postFileInput = ref(null)

function onPostFilesChange(event) {
  postMessage.text = ''
  const files = Array.from(event.target.files)
  const allowedTypes = ['image/jpeg', 'image/png']
  const maxIndividualSize = 3 * 1024 * 1024
  const minWidth = 150
  const minHeight = 150

  let checkedFiles = []

  let remaining = files.length

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      postMessage.text = 'Файлы должны быть формата PNG или JPG/JPEG'
      selectedFiles.value = []
      if (postFileInput.value) postFileInput.value.value = ''
      return
    }

    if (file.size > maxIndividualSize) {
      postMessage.text = 'Размер каждого отдельного файла не должен превышать 3 Мб'
      selectedFiles.value = []
      if (postFileInput.value) postFileInput.value.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = function (e) {
      const img = new Image()
      img.onload = function () {
        if (img.width < minWidth || img.height < minHeight) {
          postMessage.text = `Минимальный размер изображения — ${minWidth}x${minHeight} пикселей`
          selectedFiles.value = []
          if (postFileInput.value) postFileInput.value.value = ''
          return
        }

        checkedFiles.push(file)
        remaining--

        if (remaining === 0) {
          selectedFiles.value = checkedFiles
        }
      }

      img.onerror = function () {
        postMessage.text = 'Не удалось прочитать изображение'
        selectedFiles.value = []
        if (postFileInput.value) postFileInput.value.value = ''
      }

      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  }
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

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

const editableUserData = reactive({
  bio: '',
  gender: null,
  birthDate: ''
})

const genderOptions = [
  {value: null, text: 'Не указан'},
  {value: 'MALE', text: 'Мужской'},
  {value: 'FEMALE', text: 'Женский'}
]

const loadEditableUserData = () => {
  if (!currentUser.value) return
  editableUserData.bio = currentUser.value.bio
  editableUserData.gender = currentUser.value.gender
  editableUserData.birthDate = currentUser.value.birthDate
}

const startEditing = () => {
  isEditing.value = true
  flash('', '')
}

const cancelEditing = () => {
  isEditing.value = false
  flash('', '')
  loadEditableUserData()
}

const saveChanges = async () => {
  if (editableUserData.bio !== null) {
    editableUserData.bio = editableUserData.bio.trim()
    if (editableUserData.bio === '') {
      editableUserData.bio = null
    }
  }

  if (
      editableUserData.bio === currentUser.value.bio &&
      editableUserData.gender === currentUser.value.gender &&
      editableUserData.birthDate === currentUser.value.birthDate
  ) {
    cancelEditing()
    return
  }

  flash('', '')
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        bio: editableUserData.bio,
        gender: editableUserData.gender,
        birthDate: editableUserData.birthDate
      })
    })

    const data = await response.json()

    if (response.ok) {
      currentUser.value.bio = data.bio
      currentUser.value.gender = data.gender
      currentUser.value.birthDate = data.birthDate
      isEditing.value = false
      flash('Данные успешно обновлены!', 'green')
    } else {
      flash(data.message)
    }
  } catch (e) {
    flash('Ошибка соединения')
  }
}


function getUTF8Size(str) {
  return new TextEncoder().encode(str).length
}

const submitCreatePost = async () => {
  postMessage.text = ''

  if (selectedFiles.value.length > 3) {
    postMessage.text = 'Можно прикрепить не более 3 файлов'
    return
  }

  const trimmedContent = newPostContent.value.trim()

  const contentSize = getUTF8Size(trimmedContent)
  const filesSize = selectedFiles.value.reduce((sum, file) => sum + file.size, 0)
  const totalSize = contentSize + filesSize

  if (totalSize > 5 * 1024 * 1024) {
    postMessage.text = 'Общий размер поста (текст + файлы) не должен превышать 5 Мб'
    return
  }

  if (!trimmedContent) {
    postMessage.text = 'Пост не должен быть пустым'
    return
  }

  const formData = new FormData()
  formData.append('content', trimmedContent)

  selectedFiles.value.forEach((file) => {
    formData.append(`files`, file)
  })

  try {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    const data = await response.json()

    if (!response.ok) {
      postMessage.text = data.message
    }
    else {
      newPostContent.value = ''
      selectedFiles.value = []
      if (postFileInput) postFileInput.value.value = ''
      await (await userPosts.value?.loadPosts())?.()
    }
  } catch (e) {
    console.error('Ошибка при создании поста:', e)
    postMessage.text = 'Ошибка соединения'
  }
}

onMounted(async () => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include'
  })

  currentUser.value = await response.json()
  username.value = currentUser.value.username
  createdAt.value = new Date(currentUser.value.createdAt).toLocaleString()
  role.value = currentUser.value.role.replace(/^ROLE_/, '')

  loadEditableUserData()
  await refreshAvatar()
})
</script>

<template>
  <div class="container">
    <div class="profile layout">
      <div class="avatar-actions">
        <form
            ref="formRef"
            id="avatar-upload-form"
            enctype="multipart/form-data"
            @submit="submitForm"
        >
          <span
              id="selected-file-checkmark"
              :class="{ visible: selectedFileCheckmarkVisible }"
          >✔️</span>
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

        <div class="avatar-button-group">
          <button type="submit" form="avatar-upload-form" class="upload-button upload">
            Загрузить аватар
          </button>
          <button id="delete-avatar-btn" class="upload-button delete" @click.prevent="deleteAvatar">
            Удалить аватар
          </button>
        </div>
      </div>

      <div class="user-wrapper">
        <div class="user-card">
          <div class="user-info">
            <div class="avatar-wrapper">
              <img
                  class="avatar-img"
                  :src="avatarUrls.avatar"
                  alt="avatar"
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
        <div id="message" class="message-bottom" :style="{ color: message.color }">{{ message.text }}</div>
      </div>

      <div class="profile-edit">
        <label for="bio">Биография:</label>
        <textarea
            id="bio"
            v-model="editableUserData.bio"
            :readonly="!isEditing"
            maxlength="120"
            rows="4"
            placeholder="Расскажи немного о себе..."
        ></textarea>

        <label for="gender">Пол:</label>
        <select id="gender" v-model="editableUserData.gender" :disabled="!isEditing">
          <option v-for="option in genderOptions" :key="option.value" :value="option.value">
            {{ option.text }}
          </option>
        </select>

        <label for="birthDate">Дата рождения:</label>
        <input
            id="birthDate"
            type="date"
            v-model="editableUserData.birthDate"
            :readonly="!isEditing"
            min="1900-01-01"
            :max="today"
        />

        <div class="info-button-group">
          <button v-if="!isEditing" @click="startEditing" type="button">Изменить</button>
          <div v-else>
            <button @click="saveChanges" type="button">Сохранить</button>
            <button @click="cancelEditing" type="button">Отменить</button>
          </div>
        </div>
      </div>
    </div>

    <div class="posts-creation">
      <form @submit.prevent="submitCreatePost" class="create-post-form">
        <textarea
            v-model="newPostContent"
            placeholder="Что у вас нового?"
            rows="4"
            maxlength="2000"
            required
        ></textarea>
        <div class="creation-buttons">
          <div class="left-controls">
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
                  ref="postFileInput"
                  @change="onPostFilesChange"
                  style="display: none"
              />
            </label>
            <button type="submit" class="create-post-button">Создать пост</button>
          </div>

          <div id="post-message" class="message-bottom-post">{{ postMessage.text }}</div>
        </div>
        <div v-if="selectedFiles.length > 0" class="selected-files-wrapper">
          <div class="selected-files-list">
            <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
              {{ file.name }}
              <span class="remove-file" @click="removeFile(index)">✖</span>
            </div>
          </div>
        </div>
      </form>
    </div>

    <UserPosts
        v-if="currentUser"
        ref="userPosts"
        :userId="currentUser?.id"
        noPostsMessage="Вы пока не создали ни одного поста"
    />
  </div>
</template>

<style scoped>
@import '@/assets/styles/avatars.css';
@import '@/assets/styles/my-profile.css';
</style>
