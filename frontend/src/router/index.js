import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import toast from '@/utils/toast'
import store from '@/store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/chart',
      name: 'chart',
      component: () => import('../views/ChartView.vue'),
      meta: { requiresHouse: true },
    },
    {
      path: '/detail/:id',
      name: 'detail',
      component: () => import('../views/DetailView.vue'),
      props: true,
      meta: { requiresHouse: true },
    },
    {
      path: '/setting',
      name: 'setting',
      component: () => import('../views/SettingView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresHouse)) {
    if (!store.state.house.selectedHouse) {
      toast.warning('하우스를 먼저 선택해주세요', '접근 제한', {
        timeout: 5000,
      })
      next({ path: '/' })
    } else {
      next()
    }
  } else {
    next()
  }
})

// 전역 네비게이션 가드 추가
router.beforeEach((to, from, next) => {
  // Detail 페이지에서 다른 페이지로 이동하는 경우 알림 초기화
  if (from.name === 'detail' && to.name !== 'detail') {
    store.dispatch('alert/clearAllAlerts') // router.app.$store 대신 직접 store 사용
  }
  next()
})

export default router
