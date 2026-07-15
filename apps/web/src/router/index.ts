import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      { path: '', redirect: { name: 'sources' } },
      { path: 'sources', name: 'sources', component: () => import('@/views/DataSourcesView.vue') },
      { path: 'pipelines', name: 'pipelines', component: () => import('@/views/PipelinesView.vue') },
      { path: 'explorations', name: 'explorations', component: () => import('@/views/ExplorationsView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/sources' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public === true)
    return auth.isAuthenticated ? { name: 'sources' } : true

  return auth.isAuthenticated ? true : { name: 'login' }
})

export { router }
