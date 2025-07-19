<script setup>
import { API_BASE_URL } from '@/assets/scripts/config.js'

const swaggerUrl = `${API_BASE_URL}/swagger-ui.html`;

const textContent = `Возможности неавторизованных пользователей:
• Просмотр списка постов, обсуждений и всех пользователей

Возможности авторизованных пользователей:
1. Всё, что доступно неавторизованным пользователям
2. Управление профилем:
   • Установка и удаление аватара
   • Изменение личных данных (био, дата рождения, пол)
3. Взаимодействие с постами и комментариями:
   • Просмотр комментариев
   • Оставление своих комментариев
   • Возможность ставить лайки на посты/комментарии и убирать их
   • Создание постов
   • Удаление своих постов и комментариев
4. Просмотр профилей других пользователей
5. Создание, участие и просмотр личных чатов
6. Участие в обсуждениях

Возможности администраторов:
1. Всё, что доступно авторизованным пользователям
2. Создание обсуждений
3. Удаление любых постов и комментариев
`
</script>

<template>
  <div class="container">
    <div class="content-box">
      {{ textContent }}

      <div class="links">
        <a href="https://github.com/RomanSrgvchL/whale-space-frontend" target="_blank">GitHub Frontend</a>
        <a href="https://github.com/RomanSrgvchL/WhaleSpaceApi" target="_blank">GitHub Backend</a>
        <a :href="swaggerUrl" target="_blank">Swagger Docs</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/home.css';
</style>
