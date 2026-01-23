<script setup lang="ts">
import { ref } from 'vue'
import { pb } from '../lib/pocketbase'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])
const { t } = useI18n()

const oldPassword = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (password.value !== passwordConfirm.value) {
    error.value = t('auth.passwordsDoNotMatch')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const user = pb.authStore.model
    if (!user) throw new Error('Not authenticated')

    await pb.collection('users').update(user.id, {
      oldPassword: oldPassword.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value,
    })

    alert(t('profile.passwordUpdated'))
    emit('close')
    // Clear fields
    oldPassword.value = ''
    password.value = ''
    passwordConfirm.value = ''
  } catch (e: any) {
    console.error('Failed to change password', e)
    error.value = e.message || 'Failed to update password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div @click="emit('close')" class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"></div>
    
    <!-- Modal -->
    <div class="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface p-8 shadow-2xl transition-all">
      <div class="mb-6 flex items-center justify-between">
        <h3 class="text-xl font-black text-main">{{ t('profile.changePassword') }}</h3>
        <button @click="emit('close')" class="rounded-full p-2 text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">{{ t('profile.oldPassword') }}</label>
          <input 
            v-model="oldPassword"
            type="password" 
            required
            class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-4 py-3 text-main shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted/50"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">{{ t('profile.newPassword') }}</label>
          <input 
            v-model="password"
            type="password" 
            required
            minlength="8"
            class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-4 py-3 text-main shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted/50"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">{{ t('profile.confirmNewPassword') }}</label>
          <input 
            v-model="passwordConfirm"
            type="password" 
            required
            minlength="8"
            class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-4 py-3 text-main shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted/50"
          />
        </div>

        <div v-if="error" class="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-500">
          {{ error }}
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-sm font-bold text-gray-900 shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg v-if="loading" class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ loading ? t('common.saving') : t('profile.updatePassword') }}
        </button>
      </form>
    </div>
  </div>
</template>