<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { pb } from '../lib/pocketbase'
import { useI18n } from 'vue-i18n'
import Header from '../components/Header.vue'
import PromptCard from '../components/PromptCard.vue'
import PromptDetailModal from '../components/PromptDetailModal.vue'
import CreatePromptModal from '../components/CreatePromptModal.vue'
import { useTagStore } from '../stores/tagStore'

const { t } = useI18n()
const tagStore = useTagStore()
const prompts = ref<any[]>([])
const loading = ref(true)
const selectedPrompt = ref<any>(null)
const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const isEditMode = ref(false)
const remixData = ref<any>(null)
const selectedTagId = ref<string | null>(null)
const searchQuery = ref('')

const filteredPrompts = computed(() => {
  let result = prompts.value

  // Tag Filter
  if (selectedTagId.value) {
    result = result.filter(p => Array.isArray(p.tags) && p.tags.includes(selectedTagId.value))
  }

  // Search Filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => {
      const titleMatch = p.title?.toLowerCase().includes(query)
      const user = p.expand?.user
      const authorMatch = (user?.name || user?.username || user?.email || '').toLowerCase().includes(query)
      return titleMatch || authorMatch
    })
  }

  return result
})

const fetchPrompts = async () => {
  loading.value = true
  try {
    const result = await pb.collection('prompts').getList(1, 50, {
      sort: '-created',
      expand: 'user,tags,parent_id.user'
    })
    prompts.value = result.items
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

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
  fetchPrompts()
}

const handleOpenParent = async (parentId: string) => {
  isModalOpen.value = false
  loading.value = true
  try {
    const record = await pb.collection('prompts').getOne(parentId, {
      expand: 'user,tags,parent_id.user'
    })
    selectedPrompt.value = record
    isModalOpen.value = true
  } catch (e) {
    console.error('Failed to load parent prompt', e)
    alert('Original prompt not found (might have been deleted).')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  tagStore.fetchTags()
  fetchPrompts()
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20">
    <Header />
    
    <main class="mx-auto max-w-7xl px-6 pt-10">
      <!-- Hero / Action Area -->
      <div class="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">{{ t('home.title') }}</h1>
          <p class="mt-3 text-lg text-gray-500 font-medium max-w-xl">
            {{ t('home.subtitle') }}
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
        <!-- Search Input -->
        <div class="relative max-w-lg">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
            </svg>
          </div>
          <input 
            v-model="searchQuery"
            type="text" 
            class="block w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all" 
            :placeholder="t('home.searchPlaceholder')" 
          />
        </div>

        <!-- Tag Filter -->
        <div class="flex flex-wrap gap-2">
          <button 
            @click="selectedTagId = null"
            :class="[
              'rounded-xl px-4 py-2 text-sm font-bold transition-all border',
              !selectedTagId 
                ? 'bg-primary border-primary text-gray-900 shadow-lg shadow-primary/20' 
                : 'bg-white border-gray-200 text-gray-500 hover:border-primary hover:text-primary'
            ]"
          >
            {{ t('home.allTags') }}
          </button>
          <button 
            v-for="tag in tagStore.tags" 
            :key="tag.id"
            @click="selectedTagId = tag.id"
            :class="[
              'rounded-xl px-4 py-2 text-sm font-bold transition-all border',
              selectedTagId === tag.id
                ? 'bg-primary border-primary text-gray-900 shadow-lg shadow-primary/20' 
                : 'bg-white border-gray-200 text-gray-500 hover:border-primary hover:text-primary'
            ]"
          >
            #{{ tag.name }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="h-80 animate-pulse rounded-3xl bg-gray-200"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="prompts.length === 0" class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-32 text-center">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-4xl">🕊️</div>
        <h3 class="text-xl font-bold text-gray-900">{{ t('home.noPrompts') }}</h3>
        <p class="mt-2 text-gray-500">{{ t('home.beTheFirst') }}</p>
        <button @click="openCreateModal" class="mt-6 font-bold text-primary hover:text-primary-hover hover:underline">
          {{ t('home.createOne') }} &rarr;
        </button>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <PromptCard 
          v-for="prompt in filteredPrompts" 
          :key="prompt.id" 
          :prompt="prompt"
          @click="openPrompt"
        />
      </div>
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
      @created="fetchPrompts"
      @updated="fetchPrompts"
    />
  </div>
</template>