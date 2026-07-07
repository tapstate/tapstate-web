import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/pipelines' },
  { path: '/sources', name: 'sources', component: () => import('@/views/DataSourcesView.vue') },
  { path: '/pipelines', name: 'pipelines', component: () => import('@/views/PipelinesView.vue') },
  { path: '/explorations', name: 'explorations', component: () => import('@/views/ExplorationsView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/pipelines' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
