<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { pb } from '../lib/pocketbase'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll } from '@vueuse/core'
import { useInfiniteScrollFetch } from '../composables/useInfiniteScrollFetch'
import Header from '../components/Header.vue'
import PromptCard from '../components/PromptCard.vue'
import PromptDetailModal from '../components/PromptDetailModal.vue'
import CreatePromptModal from '../components/CreatePromptModal.vue'
import { useTagStore } from '../stores/tagStore'

const { t } = useI18n()
const tagStore = useTagStore()

// State
const selectedPrompt = ref<any>(null)
const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const isEditMode = ref(false)
const remixData = ref<any>(null)
const selectedTags = ref<Set<string>>(new Set())
const searchQuery = ref('')
const sortBy = ref('-updated')
let searchTimeout: ReturnType<typeof setTimeout>

// Infinite Scroll Setup
const { 
  items: prompts, 
  loading, 
  hasMore, 
  loadNext, 
  reset 
} = useInfiniteScrollFetch({
  fetchFn: async (page, perPage) => {
    const filters = []
    if (selectedTags.value.size > 0) {
      const tagFilters = Array.from(selectedTags.value).map(id => `tags ~ '${id}'`)
      filters.push(`(${tagFilters.join(' && ')})`)
    }
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim()
      filters.push(`(title ~ "${query}" || user.username ~ "${query}" || user.email ~ "${query}")`)
    }

    const result = await pb.collection('prompts').getList(page, perPage, {
      sort: sortBy.value,
      expand: 'user,tags,parent_id.user',
      filter: filters.join(' && ')
    })

    return {
      items: result.items,
      totalPages: result.totalPages,
      totalItems: result.totalItems
    }
  },
  perPage: 20
})

// Trigger infinite scroll on window scroll
// We attach to window but use distance threshold
useInfiniteScroll(
  window,
  () => { loadNext() },
  { distance: 200 }
)

// Watchers for filters

watch(selectedTags, () => {
  reset()
  loadNext()
}, { deep: true })

watch(sortBy, () => {
  reset()
  loadNext()
})

watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    reset()
    loadNext()
  }, 300)
})

const openPrompt = (prompt: any) => {
  selectedPrompt.value = prompt
  isModalOpen.value = true
}

const openCreateModal = () => {
  remixData.value = null
  isEditMode.value = false
  isCreateModalOpen.value = true
}

const handleRemix = (prompt: any) => {
  remixData.value = prompt
  isEditMode.value = false
  isModalOpen.value = false
  isCreateModalOpen.value = true
}

const handleEdit = (prompt: any) => {
  remixData.value = prompt
  isEditMode.value = true
  isModalOpen.value = false
  isCreateModalOpen.value = true
}

const handleDeleted = () => {
  isModalOpen.value = false
  reset()
  loadNext()
}

const handleOpenParent = async (parentId: string) => {
  isModalOpen.value = false
  // Ideally show a global loading state or skeletal modal
  try {
    const record = await pb.collection('prompts').getOne(parentId, {
      expand: 'user,tags,parent_id.user'
    })
    selectedPrompt.value = record
    isModalOpen.value = true
  } catch (e) {
    console.error('Failed to load parent prompt', e)
    alert('Original prompt not found (might have been deleted).')
  }
}

onMounted(() => {
  tagStore.fetchTags()
  loadNext() // Initial load
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20">
    <Header />
    
    <main class="mx-auto max-w-7xl px-6 pt-10">
      <!-- Hero / Action Area -->
      <div class="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-black tracking-tight text-main sm:text-4xl">{{ t('home.title') }}</h1>
          <p class="mt-2 text-base text-muted font-medium max-w-xl">
            {{ t('home.subtitle') }}
            <br>
            {{ t('home.subtitle2') }}
          </p>
        </div>
        <button 
          @click="openCreateModal" 
          class="group flex items-center gap-2.5 rounded-2xl bg-primary px-7 py-4 font-bold text-gray-900 shadow-xl shadow-primary/20 transition-all hover:bg-primary-hover hover:shadow-2xl hover:-translate-y-1 active:scale-95"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
          {{ t('home.createPrompt') }}
        </button>
      </div>

      <!-- Search & Filter -->
      <div class="mb-10 space-y-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <!-- Search Input -->
          <div class="relative flex-1 max-w-lg">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
              </svg>
            </div>
            <input 
              v-model="searchQuery"
              type="text" 
              class="block w-full rounded-2xl border-0 bg-surface py-3.5 pl-11 pr-4 text-main shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all" 
              :placeholder="t('home.searchPlaceholder')" 
            />
          </div>

          <!-- Sort Select -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-muted whitespace-nowrap">{{ t('sort.label') }}:</span>
            <select 
              v-model="sortBy"
              class="rounded-xl border border-gray-200 dark:border-gray-800 bg-surface px-4 py-2 text-sm font-bold text-main shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="-updated">{{ t('sort.newest') }}</option>
              <option value="updated">{{ t('sort.oldest') }}</option>
              <option value="title">{{ t('sort.title') }}</option>
              <option value="user.username,user.email">{{ t('sort.author') }}</option>
              <option value="-likes_count">{{ t('sort.popular') }}</option>
            </select>
          </div>
        </div>

        <!-- Tag Filter -->
        <div class="flex flex-wrap gap-2">
          <button 
            @click="selectedTags.clear()"
            :class="[
              'rounded-xl px-4 py-2 text-sm font-bold transition-all border',
              selectedTags.size === 0 
                ? 'bg-primary border-primary text-gray-900 shadow-lg shadow-primary/20' 
                : 'bg-surface border-gray-200 dark:border-gray-800 text-muted hover:border-primary hover:text-primary'
            ]"
          >
            {{ t('home.allTags') }}
          </button>
          <button 
            v-for="tag in tagStore.tags" 
            :key="tag.id"
            @click="selectedTags.has(tag.id) ? selectedTags.delete(tag.id) : selectedTags.add(tag.id)"
            :class="[
              'rounded-xl px-4 py-2 text-sm font-bold transition-all border',
              selectedTags.has(tag.id)
                ? 'bg-primary border-primary text-gray-900 shadow-lg shadow-primary/20' 
                : 'bg-surface border-gray-200 dark:border-gray-800 text-muted hover:border-primary hover:text-primary'
            ]"
          >
            #{{ tag.name }}
          </button>
        </div>
      </div>

      <!-- Initial Loading Skeleton -->
      <div v-if="loading && prompts.length === 0" class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="h-80 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="prompts.length === 0 && !loading" class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-surface py-32 text-center">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-900/50 text-4xl">🕊️</div>
        <h3 class="text-xl font-bold text-main">{{ t('home.noPrompts') }}</h3>
        <p class="mt-2 text-muted">{{ t('home.beTheFirst') }}</p>
        <button @click="openCreateModal" class="mt-6 font-bold text-primary hover:text-primary-hover hover:underline">
          {{ t('home.createOne') }} &rarr;
        </button>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <PromptCard 
          v-for="prompt in prompts" 
          :key="prompt.id" 
          :prompt="prompt"
          @click="openPrompt"
        />
      </div>

      <!-- Load More Spinner -->
      <div v-if="loading && prompts.length > 0" class="flex justify-center py-8 w-full">
           <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary"></div>
      </div>
      
      <!-- Sentinel for Infinite Scroll Trigger -->
      <div class="h-4 w-full"></div>
    </main>

    <PromptDetailModal 
      v-if="selectedPrompt"
      :prompt="selectedPrompt"
      :is-open="isModalOpen"
      @close="isModalOpen = false"
      @remix="handleRemix"
      @edit="handleEdit"
      @deleted="handleDeleted"
      @open-parent="handleOpenParent"
    />

    <CreatePromptModal
      :is-open="isCreateModalOpen"
      :initial-data="remixData"
      :edit-mode="isEditMode"
      @close="isCreateModalOpen = false"
      @created="reset(); loadNext()"
      @updated="reset(); loadNext()"
    />
  </div>
</template>