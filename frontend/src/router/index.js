import { createRouter, createWebHashHistory } from 'vue-router'
import { useAppStore } from '@/store'
import { getAuth } from '@/api/client'

const routes = [
  {
    path: '/',
    redirect: () => useAppStore().defaultPath
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'blank', title: '登录' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: '主控台', icon: 'grid' }
  },
  {
    path: '/records',
    name: 'RecordList',
    component: () => import('@/views/RecordListView.vue'),
    meta: { title: '值班记录', icon: 'list' }
  },
  {
    path: '/overview',
    name: 'Overview',
    component: () => import('@/views/OverviewView.vue'),
    meta: { title: '全站概览', icon: 'chart', roles: ['admin', 'district_admin'] }
  },
  {
    path: '/records/create',
    name: 'RecordCreate',
    component: () => import('@/views/CreateRecordView.vue'),
    meta: { title: '新建记录', hidden: true, roles: ['duty_officer', 'supervisor', 'admin'] }
  },
  {
    path: '/records/:id',
    name: 'RecordDetail',
    component: () => import('@/views/RecordDetailView.vue'),
    meta: { title: '记录详情', hidden: true }
  },
  {
    path: '/records/:id/edit',
    name: 'RecordEdit',
    component: () => import('@/views/CreateRecordView.vue'),
    meta: { title: '编辑记录', hidden: true }
  },
  {
    path: '/records/:recordId/items/create',
    name: 'ItemCreate',
    component: () => import('@/views/ItemCreateView.vue'),
    meta: { title: '添加值班事项', hidden: true }
  },
  {
    path: '/export',
    name: 'Export',
    component: () => import('@/views/ExportView.vue'),
    meta: { title: '导出管理', icon: 'download', roles: ['supervisor', 'district_admin', 'admin'] }
  },
  {
    path: '/system',
    name: 'System',
    component: () => import('@/views/SystemView.vue'),
    meta: { title: '系统配置', icon: 'settings', roles: ['admin', 'district_admin', 'supervisor'] }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: () => useAppStore().defaultPath
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const store = useAppStore()
  document.title = to.meta.title
    ? `${to.meta.title} · 供电所值守云平台`
    : '供电所值守云平台'

  // 登录页：已登录则直接进默认落地页（用 localStorage 实时判断，401 跳转后 store 可能未同步）
  if (to.name === 'Login') {
    if (store.isLoggedIn && getAuth().accessToken) next(store.defaultPath)
    else next()
    return
  }

  // 未登录：跳 login
  if (!store.isLoggedIn) {
    next({ name: 'Login' })
    return
  }

  // 已登录但 store.user 是占位（从 localStorage 恢复）：拉一次 me
  if (store.isLoggedIn && (!store.user || !store.user.id)) {
    try { await store.fetchCurrentUser() }
    catch { next({ name: 'Login' }); return }
  }

  // 预加载字典（表单/搜索依赖）
  if (!store.dictionariesLoaded) {
    store.fetchDictionaries()
  }

  // 角色访问控制：meta.roles 限定可访问的路由，不满足则回主控台
  const allowed = to.meta.roles
  if (allowed && !allowed.includes(store.user.role)) {
    return next({ name: 'Dashboard' })
  }

  next()
})

export default router
