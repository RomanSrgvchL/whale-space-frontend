<script setup>
import {onMounted} from 'vue'
import {isAuth, checkAuth} from '@/stores/auth.js'

onMounted(checkAuth)
</script>

<template>
  <header>
    <nav>
      <div class="left-side">
        <RouterLink to="/home">Главная</RouterLink>
        <RouterLink to="/discussions">Обсуждения</RouterLink>
        <RouterLink to="/users">Пользователи</RouterLink>
      </div>

      <div class="right-side">
        <template v-if="isAuth === undefined">
          <!-- ... -->
        </template>
        <template v-else-if="isAuth">
          <RouterLink to="/messages">Сообщения</RouterLink>
          <RouterLink to="/profile">Профиль</RouterLink>
          <RouterLink to="/logout">Выйти</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/login">Войти</RouterLink>
          <RouterLink to="/registration">Зарегистрироваться</RouterLink>
        </template>
      </div>

    </nav>
  </header>
</template>

<style scoped>
@import "@/assets/styles/navbar.css";
</style>
