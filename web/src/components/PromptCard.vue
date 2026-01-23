<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { pb } from '../lib/pocketbase'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  prompt: any
}>()

const emit = defineEmits(['click', 'like-updated'])
const router = useRouter()
const { t } = useI18n()
const isLiked = ref(false)
const likeCount = ref(0)
const likeRecordId = ref<string | null>(null)

const checkIfLiked = async () => {
  const user = pb.authStore.model
  if (!user) return

  try {
    const record = await pb.collection('likes').getFirstListItem(`prompt="${props.prompt.id}" && user="${user.id}"`)
    isLiked.value = true
    likeRecordId.value = record.id
  } catch (e) {
    isLiked.value = false
    likeRecordId.value = null
  }
}

const fetchLikeCount = () => {
  likeCount.value = props.prompt.likes_count || 0
}

const toggleLike = async (e: Event) => {
  e.stopPropagation()
  const user = pb.authStore.model
  if (!user) return

  try {
    if (isLiked.value && likeRecordId.value) {
      await pb.collection('likes').delete(likeRecordId.value)
      likeCount.value--
      isLiked.value = false
      likeRecordId.value = null
    } else {
      const record = await pb.collection('likes').create({
        prompt: props.prompt.id,
        user: user.id
      })
      likeCount.value++
      isLiked.value = true
      likeRecordId.value = record.id
    }
    
    // Notify parent to update state (fixes sync between tabs)
    emit('like-updated', {
      id: props.prompt.id,
      likes_count: likeCount.value,
      isLiked: isLiked.value
    })
  } catch (e) {
    console.error('Failed to update likes:', e)
  }
}

const goToProfile = (e: Event) => {
  e.stopPropagation()
  if (props.prompt.expand?.user?.id) {
    router.push(`/user/${props.prompt.expand.user.id}`)
  }
}

onMounted(() => {
  checkIfLiked()
  fetchLikeCount()
})
</script>

<template>
  <div 
    @click="emit('click', prompt)"
    class="group cursor-pointer break-inside-avoid rounded-2xl bg-surface p-0 shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/50"
  >
    <!-- Card Header / Thumbnail -->
    <div class="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-800">
      <!-- Image Result -->
      <img 
        v-if="prompt.result_image" 
        :src="`${pb.baseUrl}/api/files/${prompt.collectionId}/${prompt.id}/${prompt.result_image}?thumb=400x300`" 
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        alt="Result"
        loading="lazy"
      />
      
      <!-- Text Result -->
      <div v-else-if="prompt.result_text" class="flex h-full w-full items-start justify-start p-4 bg-surface">
        <p class="line-clamp-6 text-[10px] font-mono text-muted leading-relaxed overflow-hidden">
          {{ prompt.result_text }}
        </p>
      </div>

      <!-- Fallback / No Result -->
      <div v-else class="flex h-full items-center justify-center text-gray-200 dark:text-gray-700 transition-transform duration-500 group-hover:scale-105 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <span class="text-4xl font-black opacity-10 tracking-tighter uppercase select-none">AI</span>
      </div>

      <!-- Icon Overlay (Type Indicator) -->
      <div class="absolute top-3 left-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span v-if="prompt.result_image" class="rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">IMG</span>
          <span v-else-if="prompt.result_text" class="rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">TXT</span>
      </div>
    </div>
    
    <!-- Content -->
    <div class="p-5">
      <h3 class="mb-2 line-clamp-1 text-lg font-bold text-main group-hover:text-primary transition-colors">{{ prompt.title }}</h3>
      <p class="mb-4 line-clamp-3 text-sm leading-relaxed text-muted">{{ prompt.content }}</p>
      
      <!-- Tags -->
      <div v-if="prompt.expand?.tags && prompt.expand.tags.length" class="mb-4 flex flex-wrap gap-1.5">
        <span v-for="tag in prompt.expand.tags.slice(0, 3)" :key="tag.id" class="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary dark:text-primary">
          {{ tag.name }}
        </span>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-3">
        <div 
          class="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg pr-2 -ml-1 py-1 transition-colors cursor-pointer"
          @click="goToProfile"
        >
          <!-- Avatar -->
          <img 
            v-if="prompt.expand?.user?.avatar"
            :src="`${pb.baseUrl}/api/files/_pb_users_auth_/${prompt.expand.user.id}/${prompt.expand.user.avatar}?thumb=100x100`"
            class="h-6 w-6 rounded-full object-cover border border-gray-100 dark:border-gray-700"
            alt="Avatar"
          />
          <img 
            v-else
            :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${prompt.expand?.user?.username || prompt.expand?.user?.id || 'magpie'}&backgroundColor=c0aede,b6e3f4,c1f4c5,ffdfbf,ffd5dc`"
            class="h-6 w-6 rounded-full object-cover border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            alt="Avatar"
          />
          
          <span class="text-xs font-medium text-muted">{{ prompt.expand?.user?.username || prompt.expand?.user?.email?.split('@')[0] || t('common.anonymous') }}</span>
        </div>
        
        <button 
          @click="toggleLike"
          class="group/like flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" height="16" 
            viewBox="0 0 24 24" 
            :fill="isLiked ? '#ef4444' : 'none'" 
            :stroke="isLiked ? '#ef4444' : 'currentColor'"
            class="text-gray-400 dark:text-gray-500 transition-colors group-hover/like:text-red-500"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
          <span class="text-xs font-semibold" :class="isLiked ? 'text-red-500' : 'text-gray-400 dark:text-gray-500 group-hover/like:text-red-500'">{{ likeCount }}</span>
        </button>
      </div>
    </div>
  </div>
</template>