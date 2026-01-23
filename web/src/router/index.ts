import { createRouter, createWebHistory } from 'vue-router'
import { pb } from '../lib/pocketbase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/pending',
      name: 'pending',
      component: () => import('../views/PendingView.vue')
    },
    {
      path: '/user/:id',
      name: 'user-profile',
      component: () => import('../views/UserProfileView.vue')
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const isValid = pb.authStore.isValid
  const user = pb.authStore.model

  if (to.meta.requiresAuth && !isValid) {
    next({ name: 'login' })
    return
  }

  if (isValid && user) {
    if (user.status === 'pending' && to.name !== 'pending') {
      next({ name: 'pending' })
      return
    }
    
    if (to.meta.requiresAdmin && user.role !== 'admin') {
      next({ name: 'home' })
      return
    }
  }

  next()
})

export default router
