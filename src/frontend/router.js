import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'chat',
    component: { render: () => null }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router