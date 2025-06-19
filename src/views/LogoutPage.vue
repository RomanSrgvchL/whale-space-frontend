<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '@/stores/auth.js'

const router = useRouter()
const errorMessage = ref('')

onMounted(async () => {
  const success = await logout()

  if (success) {
    await router.push('/home')
  } else {
    errorMessage.value = 'Ошибка при выходе из аккаунта'
  }
})
</script>

<template>
  <div class="container">
    <p v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<style scoped></style>
