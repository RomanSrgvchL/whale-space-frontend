<script setup>
import UserPosts from '@/components/PostList.vue'
</script>

<template>
  <div class="container">
    <UserPosts no-posts-message="Пользователи пока не создали ни одного поста"/>
  </div>
</template>

<style scoped>
@import '@/assets/styles/posts.css';
</style>