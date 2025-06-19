<script setup>
import {ref, reactive} from 'vue'
import {useRouter} from 'vue-router'
import {API_BASE_URL} from '@/assets/scripts/config.js'

const router = useRouter()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const message = reactive({text: '', color: ''})

const flash = (text, color = 'red') => {
  message.text = text
  message.color = color
}

async function onSubmit(e) {
  e.preventDefault()

  if (password.value !== confirmPassword.value) {
    flash('Подтвердите пароль')
    return
  }

  const registrationData = {username: username.value.trim(), password: password.value}

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(registrationData),
    })

    const result = await response.json()

    if (response.status === 201) {
      flash(result.message, 'green')
      setTimeout(() => {
        router.push('/login')
      }, 750)
    } else {
      flash(result.message)
    }
  } catch (error) {
    flash('Error: ' + error.message)
  }
}
</script>

<template>
  <div class="container">
    <form id="registration-form" @submit="onSubmit">
      <label for="username">Введите имя пользователя:</label>
      <input id="username" name="username" v-model="username"/>
      <br/>
      <label for="password">Введите пароль:</label>
      <input id="password" type="password" name="password" v-model="password"/>
      <br/>
      <label for="confirm-password">Подтвердите пароль:</label>
      <input id="confirm-password" type="password" name="confirm-password" v-model="confirmPassword"/>
      <br/>
      <button>Создать аккаунт</button>
    </form>
    <div id="message" :style="{ color: message.color }">{{ message.text }}</div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/auth-forms.css';
</style>
