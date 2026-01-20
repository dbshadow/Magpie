<script setup lang="ts">
import { useRouter } from 'vue-router'
import { pb } from '../lib/pocketbase'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t, locale } = useI18n()
const user = ref<any>(null)

onMounted(() => {
  user.value = pb.authStore.model
  pb.authStore.onChange((_token, model) => {
    user.value = model
  })
})

const handleLogout = () => {
  pb.authStore.clear()
  router.push('/login')
}

const toggleLanguage = () => {
  locale.value = locale.value === 'zh-TW' ? 'en-US' : 'zh-TW'
}
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl transition-all">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
      <!-- Logo -->
      <div class="flex items-center gap-3 cursor-pointer" @click="router.push('/')">
        <img src="/logo.png" alt="Magpie Logo" class="h-10 w-10 object-contain drop-shadow-sm" />
        <span class="text-xl font-bold tracking-tight text-gray-900">Magpie</span>
      </div>

      <!-- Nav -->
      <nav class="flex items-center gap-6">
        <!-- Language Switcher -->
        <button @click="toggleLanguage" class="text-xs font-bold text-gray-500 hover:text-primary transition-colors uppercase tracking-wider">
          {{ locale === 'zh-TW' ? 'EN' : '繁中' }}
        </button>

        <template v-if="user">
          <router-link v-if="user.role === 'admin'" to="/admin" class="text-sm font-semibold text-gray-500 hover:text-primary transition-colors">{{ t('common.admin') }}</router-link>
          
          <div class="h-4 w-px bg-gray-200"></div>

          <div class="flex items-center gap-3">
             <div class="flex items-center gap-3 rounded-full py-1 pr-3 pl-1">
                <div class="h-9 w-9 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                    <img 
                      v-if="user.avatar"
                      :src="`${pb.baseUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}?thumb=100x100`"
                      class="h-full w-full object-cover"
                    />
                    <img 
                      v-else
                      :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${user.username || user.id}&backgroundColor=c0aede,b6e3f4,c1f4c5,ffdfbf,ffd5dc`"
                      class="h-full w-full object-cover"
                    />
                </div>
                <div class="hidden sm:block">
                  <p class="text-sm font-bold text-gray-900 leading-none">{{ user.username || user.email }}</p>
                </div>
            </div>

            <button @click="handleLogout" class="group flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-all hover:border-gray-300 hover:text-red-500" :title="t('common.logout')">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </template>
        
        <template v-else>
          <router-link to="/login" class="text-sm font-bold text-gray-500 hover:text-primary transition-colors">{{ t('common.login') }}</router-link>
          <router-link to="/register" class="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition-all hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5">
            {{ t('common.getStarted') }}
          </router-link>
        </template>
      </nav>
    </div>
  </header>
</template>