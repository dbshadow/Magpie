<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pb } from '../lib/pocketbase'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll } from '@vueuse/core'
import { useInfiniteScrollFetch } from '../composables/useInfiniteScrollFetch'
import Header from '../components/Header.vue'
import PromptCard from '../components/PromptCard.vue'
import PromptDetailModal from '../components/PromptDetailModal.vue'
import CreatePromptModal from '../components/CreatePromptModal.vue'
import ChangePasswordModal from '../components/ChangePasswordModal.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// User Data
const userId = computed(() => route.params.id as string)
const currentUser = computed(() => pb.authStore.model)
const isOwner = computed(() => currentUser.value?.id === userId.value)
const profileUser = ref<any>(null)
const postsCount = ref(0)
const likesReceivedCount = ref(0) 

// Content Data
const activeTab = ref<'posts' | 'likes'>('posts')

// --- Infinite Scroll Setup ---

// Posts Fetcher
const { 
  items: posts, 
  loading: postsLoading, 
  hasMore: postsHasMore, 
  loadNext: loadNextPosts, 
  reset: resetPosts 
} = useInfiniteScrollFetch({
  fetchFn: async (page, perPage) => {
    const result = await pb.collection('prompts').getList(page, perPage, {
      filter: `user = "${userId.value}"`,
      sort: '-created',
      expand: 'user,tags,parent_id.user'
    })
    
    // Update total count
    postsCount.value = result.totalItems
    // Approximate likes received sum from loaded items
    likesReceivedCount.value = posts.value.reduce((sum, p) => sum + (p.likes_count || 0), 0) + 
                               result.items.reduce((sum, p) => sum + (p.likes_count || 0), 0)

    return {
      items: result.items,
      totalPages: result.totalPages,
      totalItems: result.totalItems
    }
  },
  perPage: 20
})

// Likes Fetcher
const {
  items: likes,
  loading: likesLoading,
  hasMore: likesHasMore,
  loadNext: loadNextLikes,
  reset: resetLikes
} = useInfiniteScrollFetch({
  fetchFn: async (page, perPage) => {
    const result = await pb.collection('likes').getList(page, perPage, {
      filter: `user = "${userId.value}"`,
      expand: 'prompt.user,prompt.tags,prompt.parent_id.user',
      skipTotal: true, 
    })
    
    // Transform likes to prompts
    const items = result.items
      .map(item => item.expand?.prompt)
      .filter(p => p)

    return {
      items: items,
      totalPages: result.totalPages,
      totalItems: result.totalItems
    }
  },
  perPage: 20
})

// Use a ref for the scroll target (window or specific element)
// Here we use window, but @vueuse/core works best if we attach to a dummy element at bottom
// or pass `window` as target. Using a sentinel element is robust.
const loadMoreSentinel = ref<HTMLElement | null>(null)

useInfiniteScroll(
  // Target: We use window for the scroll container, but checking distance relative to document
  // Actually useInfiniteScroll usually takes an element to scroll IN.
  // For window scrolling, we can pass `window` but it expects an element Ref usually.
  // A better pattern with VueUse is passing the `window` object.
  window,
  () => {
    if (activeTab.value === 'posts') {
      loadNextPosts()
    } else {
      loadNextLikes()
    }
  },
  { distance: 200 }
)


// Edit Mode
const isEditing = ref(false)
const editName = ref('')
const editAvatar = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const isSaving = ref(false)

// Modals
const isPasswordModalOpen = ref(false)
const selectedPrompt = ref<any>(null)
const isPromptModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const isEditMode = ref(false)
const remixData = ref<any>(null)

// --- Data Fetching ---

const fetchUserProfile = async () => {
  try {
    profileUser.value = await pb.collection('users').getOne(userId.value)
    editName.value = profileUser.value.name || profileUser.value.username || ''
  } catch (e) {
    console.error('Failed to fetch user', e)
  }
}

// --- Interaction ---

const handleAvatarChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    editAvatar.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const saveProfile = async () => {
  isSaving.value = true
  try {
    const formData = new FormData()
    formData.append('username', editName.value)
    
    if (editAvatar.value) {
      formData.append('avatar', editAvatar.value)
    }

    const updatedUser = await pb.collection('users').update(userId.value, formData)
    profileUser.value = updatedUser
    isEditing.value = false
    editAvatar.value = null
    avatarPreview.value = null
    
    if (pb.authStore.model?.id === updatedUser.id) {
        await pb.collection('users').authRefresh()
    }
  } catch (e) {
    console.error('Failed to update profile', e)
    alert('Failed to update profile. Username might be taken.')
  } finally {
    isSaving.value = false
  }
}

const handleLikeUpdate = (payload: { id: string, likes_count: number, isLiked: boolean }) => {
  const postIndex = posts.value.findIndex(p => p.id === payload.id)
  if (postIndex !== -1) {
    posts.value[postIndex].likes_count = payload.likes_count
  }

  const likeIndex = likes.value.findIndex(p => p.id === payload.id)
  if (likeIndex !== -1) {
    likes.value[likeIndex].likes_count = payload.likes_count
  }
}

const openPrompt = (prompt: any) => {
  selectedPrompt.value = prompt
  isPromptModalOpen.value = true
}

const handleRemix = (prompt: any) => {
  remixData.value = prompt
  isEditMode.value = false
  isPromptModalOpen.value = false
  isCreateModalOpen.value = true
}

const handleEditPrompt = (prompt: any) => {
  remixData.value = prompt
  isEditMode.value = true
  isPromptModalOpen.value = false
  isCreateModalOpen.value = true
}

const handleDeleted = () => {
  isPromptModalOpen.value = false
  resetPosts()
  loadNextPosts()
}

const handleOpenParent = async (parentId: string) => {
   isPromptModalOpen.value = false
   try {
    const record = await pb.collection('prompts').getOne(parentId, {
      expand: 'user,tags,parent_id.user'
    })
    selectedPrompt.value = record
    isPromptModalOpen.value = true
  } catch (e) {
    console.error(e)
  }
}

// Watchers
watch(userId, () => {
  fetchUserProfile()
  resetPosts()
  resetLikes()
  loadNextPosts() // Default load
})

watch(activeTab, (newTab) => {
  // Reset-on-Switch Strategy
  if (newTab === 'posts') {
    resetLikes() // Clear memory
    if (posts.value.length === 0) loadNextPosts()
  } else {
    resetPosts() // Clear memory
    if (likes.value.length === 0) loadNextLikes()
  }
})

onMounted(() => {
  fetchUserProfile()
  loadNextPosts() // Initial load
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20">
    <Header />

    <main v-if="profileUser" class="mx-auto max-w-7xl px-6 pt-10">
      
      <!-- Profile Header -->
      <div class="mb-12 rounded-3xl bg-surface p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center md:items-start gap-8">
        <!-- Avatar -->
        <div class="relative group">
          <div class="h-32 w-32 overflow-hidden rounded-full border-4 border-white dark:border-gray-800 shadow-lg bg-gray-100 dark:bg-gray-700">
            <img 
              :src="avatarPreview || (profileUser.avatar ? `${pb.baseUrl}/api/files/_pb_users_auth_/${profileUser.id}/${profileUser.avatar}` : `https://api.dicebear.com/7.x/identicon/svg?seed=${profileUser.username}&backgroundColor=c0aede,b6e3f4,c1f4c5,ffdfbf,ffd5dc`)"
              class="h-full w-full object-cover"
              alt="Avatar"
            />
          </div>
          <label v-if="isEditing" class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <span class="text-xs font-bold">{{ t('profile.uploadAvatar') }}</span>
            <input type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
          </label>
        </div>

        <!-- Info -->
        <div class="flex-1 text-center md:text-left">
          <div class="mb-2 flex flex-col md:flex-row items-center md:items-center gap-4">
             <div v-if="isEditing" class="flex items-center gap-2">
                <input 
                  v-model="editName"
                  type="text" 
                  class="rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 text-xl font-black text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
             </div>
             <h1 v-else class="text-3xl font-black text-main tracking-tight">{{ profileUser.username }}</h1>
             
             <!-- Actions (Owner Only) -->
             <div v-if="isOwner" class="flex gap-2">
               <button 
                v-if="!isEditing"
                @click="isEditing = true"
                class="rounded-full bg-gray-100 dark:bg-gray-800 p-2 text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                :title="t('common.edit')"
               >
                 <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>
               <div v-else class="flex gap-2">
                 <button 
                  @click="saveProfile"
                  :disabled="isSaving"
                  class="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-gray-900 shadow-sm hover:bg-primary-hover disabled:opacity-50"
                 >
                   {{ isSaving ? t('common.saving') : t('common.save') }}
                 </button>
                 <button 
                  @click="isEditing = false; editName = profileUser.username; editAvatar = null; avatarPreview = null"
                  class="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-1.5 text-xs font-bold text-muted hover:bg-gray-200 dark:hover:bg-gray-700"
                 >
                   {{ t('common.cancel') }}
                 </button>
                 
                 <div class="w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                 <button 
                  @click="isPasswordModalOpen = true"
                  class="rounded-lg border border-red-200 dark:border-red-900/30 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                 >
                   {{ t('profile.changePassword') }}
                 </button>
               </div>
             </div>
          </div>
          
          <div class="flex items-center justify-center md:justify-start gap-6 text-sm font-medium text-muted">
             <div class="flex items-center gap-1.5">
               <span class="font-bold text-main text-lg">{{ postsCount }}</span>
               <span>{{ t('profile.postsCount') }}</span>
             </div>
             <!-- Optional: Likes Received -->
             <div class="flex items-center gap-1.5">
               <span class="font-bold text-main text-lg">{{ likesReceivedCount }}</span>
               <span>{{ t('profile.likesReceived') }}</span>
             </div>
          </div>
        </div>
      </div>

      <!-- Content Tabs -->
      <div class="mb-8 flex gap-8 border-b border-gray-100 dark:border-gray-800">
        <button 
          @click="activeTab = 'posts'"
          class="pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2"
          :class="activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-main'"
        >
          {{ t('profile.posts') }}
        </button>
        <button 
          @click="activeTab = 'likes'"
          class="pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2"
          :class="activeTab === 'likes' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-main'"
        >
          {{ t('profile.likes') }}
        </button>
      </div>

      <!-- Content Grid -->
      
      <!-- Posts Tab -->
      <div v-if="activeTab === 'posts'">
        <!-- Initial Loading Skeleton -->
        <div v-if="postsLoading && posts.length === 0" class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="i in 4" :key="i" class="h-80 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800"></div>
        </div>
        <!-- Empty State -->
        <div v-else-if="posts.length === 0 && !postsLoading" class="py-20 text-center text-muted">
          {{ t('profile.noPosts') }}
        </div>
        <!-- List -->
        <div v-else class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <PromptCard 
            v-for="prompt in posts" 
            :key="prompt.id" 
            :prompt="prompt"
            @click="openPrompt"
            @like-updated="handleLikeUpdate"
          />
        </div>
        <!-- Bottom Spinner for Load More -->
        <div v-if="postsLoading && posts.length > 0" class="flex justify-center py-8 w-full col-span-full">
           <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary"></div>
        </div>
      </div>

      <!-- Likes Tab -->
      <div v-if="activeTab === 'likes'">
        <!-- Initial Loading Skeleton -->
        <div v-if="likesLoading && likes.length === 0" class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="i in 4" :key="i" class="h-80 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800"></div>
        </div>
        <!-- Empty State -->
        <div v-else-if="likes.length === 0 && !likesLoading" class="py-20 text-center text-muted">
            {{ t('profile.noLikes') }}
        </div>
        <!-- List -->
        <div v-else class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <PromptCard 
            v-for="prompt in likes" 
            :key="prompt.id" 
            :prompt="prompt"
            @click="openPrompt"
            @like-updated="handleLikeUpdate"
          />
        </div>
         <!-- Bottom Spinner for Load More -->
         <div v-if="likesLoading && likes.length > 0" class="flex justify-center py-8 w-full col-span-full">
           <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary"></div>
        </div>
      </div>

      <!-- Sentinel element for infinite scroll triggering -->
      <div ref="loadMoreSentinel" class="h-4 w-full"></div>

    </main>

    <!-- Modals -->
    <ChangePasswordModal 
      :is-open="isPasswordModalOpen"
      @close="isPasswordModalOpen = false"
    />

    <PromptDetailModal 
      v-if="selectedPrompt"
      :prompt="selectedPrompt"
      :is-open="isPromptModalOpen"
      @close="isPromptModalOpen = false"
      @remix="handleRemix"
      @edit="handleEditPrompt"
      @deleted="handleDeleted"
      @open-parent="handleOpenParent"
    />

    <CreatePromptModal
      :is-open="isCreateModalOpen"
      :initial-data="remixData"
      :edit-mode="isEditMode"
      @close="isCreateModalOpen = false"
      @created="resetPosts(); loadNextPosts()"
      @updated="resetPosts(); loadNextPosts()"
    />

  </div>
</template>