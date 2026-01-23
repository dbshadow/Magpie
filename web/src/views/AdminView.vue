<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { pb } from '../lib/pocketbase'
import Header from '../components/Header.vue'

const pendingUsers = ref<any[]>([])
const loading = ref(true)

const fetchPendingUsers = async () => {
  loading.value = true
  try {
    const records = await pb.collection('users').getList(1, 50, {
      filter: 'status = "pending"'
    })
    pendingUsers.value = records.items
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const approveUser = async (userId: string) => {
  try {
    await pb.collection('users').update(userId, { status: 'active' })
    pendingUsers.value = pendingUsers.value.filter(u => u.id !== userId)
  } catch (e) {
    console.error(e)
  }
}

onMounted(fetchPendingUsers)
</script>

<template>
  <div class="min-h-screen bg-background pb-20">
    <Header />
    <main class="mx-auto max-w-4xl p-6 pt-10">
      <h1 class="mb-8 text-3xl font-black tracking-tight text-main">Admin Dashboard</h1>
      
      <div class="rounded-3xl bg-surface p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 class="mb-6 text-xl font-bold text-main">Pending User Approvals</h2>
        
        <div v-if="loading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
        </div>
        
        <div v-else-if="pendingUsers.length === 0" class="py-12 text-center text-muted">
          No pending users at the moment.
        </div>
        
        <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <li v-for="user in pendingUsers" :key="user.id" class="flex items-center justify-between py-4">
            <div>
              <p class="font-bold text-main">{{ user.username || 'Anonymous' }}</p>
              <p class="text-xs font-medium text-muted font-mono mt-1">{{ user.id }}</p>
            </div>
            <button @click="approveUser(user.id)" class="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-gray-900 shadow-sm hover:bg-primary-hover transition-colors">
              Approve
            </button>
          </li>
        </ul>
      </div>
    </main>
  </div>
</template>
