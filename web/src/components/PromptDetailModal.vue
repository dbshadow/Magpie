<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { pb } from '../lib/pocketbase'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  prompt: any
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'remix', 'edit', 'deleted', 'open-parent'])
const { t } = useI18n()

const isLightboxOpen = ref(false)
const variables = ref<Record<string, string>>({})
const isAuthor = computed(() => {
  const user = pb.authStore.model
  return user && props.prompt.user === user.id
})

const parsedVariables = computed<string[]>(() => {
  if (!props.prompt?.content) return []
  const matches = (props.prompt.content as string).match(/\{\{([^}]+)\}\}/g) || []
  return [...new Set(matches.map((m: string) => m.replace(/\{\{|\}\}/g, '')))]
})

watch(parsedVariables, (newVars) => {
  const nextVars: Record<string, string> = {}
  newVars.forEach((v: string) => {
    nextVars[v] = variables.value[v] || ''
  })
  variables.value = nextVars
}, { immediate: true })

const filledContent = computed(() => {
  let content = props.prompt?.content || ''
  Object.entries(variables.value).forEach(([key, val]) => {
    const placeholder = `{{${key}}}`
    content = content.replaceAll(placeholder, val || `{{${key}}}`) 
  })
  return content
})

const copyButtonText = ref(t('common.copy'))

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(filledContent.value)
    copyButtonText.value = t('prompt.copySuccess')
    setTimeout(() => {
      copyButtonText.value = t('common.copy')
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

const handleDelete = async () => {
  if (!confirm(t('prompt.deleteConfirm'))) return
  try {
    await pb.collection('prompts').delete(props.prompt.id)
    emit('deleted')
    emit('close')
  } catch (e) {
    alert('Failed to delete prompt')
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
    <div @click="emit('close')" class="absolute inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity"></div>
    
    <div class="relative w-full max-w-6xl rounded-[2rem] bg-surface shadow-2xl flex flex-col md:flex-row md:max-h-[90vh] md:overflow-hidden overflow-y-auto max-h-[90vh]">
      
      <!-- Left Column: Input & Configuration -->
      <div class="flex w-full md:w-1/2 flex-col border-r border-gray-100 dark:border-gray-800 bg-surface shrink-0">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-6">
          <div class="flex items-center gap-3">
             <button @click="emit('close')" class="group rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-gray-400 group-hover:text-main"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 class="text-xl font-bold text-main line-clamp-1">{{ prompt.title }}</h2>
          </div>
          <div class="flex gap-2">
            <template v-if="isAuthor">
              <button @click="emit('edit', prompt)" class="rounded-lg px-3 py-1.5 text-xs font-bold text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{{ t('common.edit') }}</button>
              <button @click="handleDelete" class="rounded-lg px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{{ t('common.delete') }}</button>
            </template>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 p-8 md:overflow-y-auto">
           <!-- Remix Source Indicator -->
           <div v-if="prompt.expand?.parent_id" class="mb-6 flex items-center gap-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 p-3 text-xs text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <span>
                Remixed from 
                <button @click="emit('open-parent', prompt.expand.parent_id.id)" class="font-bold hover:underline cursor-pointer">
                  {{ prompt.expand.parent_id.title }}
                </button>
                by 
                <router-link 
                  v-if="prompt.expand.parent_id.expand?.user?.id" 
                  :to="`/user/${prompt.expand.parent_id.expand.user.id}`" 
                  class="font-bold hover:underline cursor-pointer"
                >
                  {{ prompt.expand.parent_id.expand?.user?.name || prompt.expand.parent_id.expand?.user?.username || 'Anonymous' }}
                </router-link>
                <span v-else>{{ prompt.expand.parent_id.expand?.user?.name || prompt.expand.parent_id.expand?.user?.username || 'Anonymous' }}</span>
              </span>
           </div>

           <div class="mb-8">
            <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{{ t('prompt.description') }}</h4>
            <p class="text-sm leading-relaxed text-muted">{{ prompt.description || 'No description provided.' }}</p>
          </div>

          <!-- Variable Filler -->
          <div v-if="parsedVariables.length > 0" class="mb-8 rounded-2xl bg-surface p-6">
            <h4 class="mb-4 text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-primary"></span>
              {{ t('prompt.fillVariables') }}
            </h4>
            <div class="space-y-4">
              <div v-for="variable in parsedVariables" :key="variable">
                <label class="mb-1.5 block text-xs font-bold text-muted">{{ variable }}</label>
                <input 
                  v-model="variables[variable]"
                  type="text" 
                  class="block w-full rounded-xl border-0 bg-surface px-4 py-3 text-sm text-main shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-primary transition-all"
                  :placeholder="`Enter value for ${variable}`"
                />
              </div>
            </div>
          </div>

           <!-- Raw Prompt View -->
           <div>
            <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{{ t('prompt.rawPrompt') }}</h4>
            <div class="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-4 font-mono text-xs text-muted whitespace-pre-wrap">
              {{ prompt.content }}
            </div>
           </div>
           
           <div class="mt-6 flex flex-wrap gap-2">
            <span v-for="tag in prompt.expand?.tags" :key="tag.id" class="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              #{{ tag.name }}
            </span>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="border-t border-gray-100 dark:border-gray-800 p-6 bg-gray-50/50 dark:bg-gray-800/20">
           <button @click="emit('remix', prompt)" class="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface py-4 font-bold text-main hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              {{ t('prompt.remix') }}
            </button>
        </div>
      </div>

      <!-- Right Column: Preview & Result -->
      <div class="flex w-full md:w-1/2 flex-col bg-gray-900 text-white shrink-0">
        <div class="flex-1 p-8 md:overflow-y-auto">
           <!-- Live Preview -->
           <div class="mb-10">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500">{{ t('prompt.compiledPrompt') }}</h4>
                <button @click="copyToClipboard" class="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-all">
                  <svg v-if="copyButtonText === t('common.copy')" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <svg v-else width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  {{ copyButtonText }}
                </button>
              </div>
              <div class="rounded-2xl bg-gray-800 p-6 font-mono text-sm leading-relaxed text-gray-200 shadow-inner whitespace-pre-wrap">
                {{ filledContent }}
              </div>
           </div>

           <!-- Result Preview -->
           <div v-if="prompt.result_text || prompt.result_image">
             <h4 class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">{{ t('prompt.exampleOutput') }}</h4>
             
             <div v-if="prompt.result_image" class="mb-6 overflow-hidden rounded-2xl border border-gray-700 shadow-lg group/image">
                <img 
                  :src="`${pb.baseUrl}/api/files/${prompt.collectionId}/${prompt.id}/${prompt.result_image}`" 
                  alt="Result" 
                  class="w-full object-cover cursor-zoom-in transition-transform duration-500 group-hover/image:scale-105"
                  @click="isLightboxOpen = true"
                />
             </div>

             <div v-if="prompt.result_text" class="rounded-2xl border border-gray-700 bg-gray-800/50 p-6 text-sm text-gray-300 italic whitespace-pre-wrap">
               "{{ prompt.result_text }}"
             </div>
           </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Image Lightbox -->
  <div v-if="isLightboxOpen" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm transition-all" @click="isLightboxOpen = false">
    <button class="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors" @click="isLightboxOpen = false">
      <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
    <img 
      v-if="prompt.result_image"
      :src="`${pb.baseUrl}/api/files/${prompt.collectionId}/${prompt.id}/${prompt.result_image}`" 
      class="max-h-full max-w-full object-contain rounded-lg shadow-2xl cursor-default"
      @click.stop 
    />
  </div>
</template>
