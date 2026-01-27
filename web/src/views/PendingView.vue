<script setup lang="ts">
import { useRouter } from 'vue-router'
import { pb } from '../lib/pocketbase'
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'

const router = useRouter()
const { t } = useI18n()
const isChecking = ref(false)

const checkStatus = async () => {
  if (isChecking.value) return
  isChecking.value = true
  try {
    await pb.collection('users').authRefresh()
    if (pb.authStore.model && pb.authStore.model.status !== 'pending') {
      router.push({ name: 'home' })
    }
  } catch (error) {
    console.error('Auth refresh failed:', error)
  } finally {
    isChecking.value = false
  }
}

const handleLogout = () => {
  pb.authStore.clear()
  router.push('/login')
}

onMounted(() => {
  checkStatus()
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-surface p-4 text-center">
    <img src="/logo.png" alt="Magpie Logo" class="mb-6 h-24 w-24 object-contain animate-bounce drop-shadow-md" />
    <h1 class="mb-4 text-4xl font-extrabold tracking-tight text-gray-900">{{ t('auth.waitingApproval') }}</h1>
    <p class="mb-8 max-w-md text-lg text-gray-600">
      {{ t('auth.approvalMessage') }}
    </p>
    <div class="flex flex-col gap-3 sm:flex-row">
      <button 
        @click="checkStatus" 
        :disabled="isChecking"
        class="rounded-full bg-main px-8 py-3 font-semibold text-white shadow-sm hover:bg-main-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isChecking ? t('common.checking') : t('common.checkStatus') }}
      </button>
      <button 
        @click="handleLogout" 
        class="rounded-full bg-white px-8 py-3 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all border border-gray-200"
      >
        {{ t('common.logout') }}
      </button>
    </div>
  </div>
</template>
