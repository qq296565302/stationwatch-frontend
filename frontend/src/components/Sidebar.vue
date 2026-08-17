<template>
  <aside class="sidebar" :class="{ collapsed: store.sidebarCollapsed }">
    <!-- 品牌 -->
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M13 2L4 14h6l-1 8 10-12h-7l1-8z" fill="currentColor"/>
        </svg>
      </div>
      <div v-if="!store.sidebarCollapsed" class="brand-text">
        <div class="brand-title">值守云平台</div>
        <div class="brand-sub">{{ store.systemConfig.stationName }}</div>
      </div>
    </div>

    <!-- 主菜单 -->
    <nav class="nav">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon" v-html="item.icon"></span>
        <span v-if="!store.sidebarCollapsed" class="nav-label">{{ item.title }}</span>
        <span v-if="store.sidebarCollapsed" class="nav-tooltip">{{ item.title }}</span>
      </router-link>
    </nav>

    <!-- 用户卡 -->
    <div v-if="!store.sidebarCollapsed" class="user-card-wrap" @click.stop>
      <div class="user-card" @click="userMenuOpen = !userMenuOpen">
        <div class="user-avatar" :style="{ background: avatarColor }">{{ avatarChar }}</div>
        <div class="user-info">
          <div class="user-name">{{ store.user.realName }}</div>
          <div class="user-role">{{ store.user.roleName }}</div>
        </div>
        <button class="collapse-btn" @click.stop="store.toggleSidebar()" title="收起侧栏">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>
      <transition name="user-menu">
        <div v-if="userMenuOpen" class="user-menu" @click.stop>
          <div class="user-menu-header">
            <div class="user-menu-name">{{ store.user.realName }}</div>
            <div class="user-menu-meta font-mono">{{ store.user.username }}</div>
          </div>
          <button class="user-menu-item" @click="openChangePassword">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            修改密码
          </button>
          <button class="user-menu-item danger" @click="handleLogout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            退出登录
          </button>
        </div>
      </transition>
    </div>
    <button v-else class="expand-btn" :style="{ background: avatarColor }" @click="store.toggleSidebar()" title="展开侧栏">
      <span class="expand-avatar-text">{{ avatarChar }}</span>
    </button>

    <!-- 修改密码弹窗（全局状态，供用户菜单与"改默认密码"提示横幅共用） -->
    <ChangePasswordDialog v-model:visible="store.changePasswordDialogVisible" />
  </aside>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

// 用户菜单开关
const userMenuOpen = ref(false)
const closeUserMenu = () => { userMenuOpen.value = false }

// 修改密码弹窗（使用 store 全局状态，便于提示横幅复用）
const openChangePassword = () => {
  userMenuOpen.value = false
  store.changePasswordDialogVisible = true
}

// 点击外部关闭菜单
const onDocClick = (e) => {
  if (!userMenuOpen.value) return
  // 如果点击发生在 user-card-wrap 内部，由 @click.stop 处理；这里兜底
  const wrap = document.querySelector('.user-card-wrap')
  if (wrap && !wrap.contains(e.target)) userMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

// 退出登录
const handleLogout = async () => {
  userMenuOpen.value = false
  const ok = await confirm.open({
    title: '退出登录',
    message: '确定要退出当前账号吗？',
    confirmText: '退出',
    type: 'danger'
  })
  if (!ok) return
  await store.logout()
  toast.info('已退出登录')
  router.push('/login')
}

// 头像字符：取真实姓名的最后一个字；英文则取首字母大写
const avatarChar = computed(() => {
  const name = (store.user.realName || '').trim()
  if (!name) return '?'
  // 找最后一个非空格字符
  const ch = name[name.length - 1]
  // 中文字符直接返回；英文字母转大写
  return /[\u4e00-\u9fa5]/.test(ch) ? ch : ch.toUpperCase()
})

// 头像背景：基于用户名哈希，分配 6 种淡色之一
const AVATAR_COLORS = [
  '#3b5bdb', // 蓝
  '#1c7d4d', // 绿
  '#c2410c', // 橙
  '#7c3aed', // 紫
  '#b91c1c', // 红
  '#0e7490'  // 青
]
const avatarColor = computed(() => {
  const seed = (store.user.username || store.user.realName || '?').trim()
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
})

const allMenuItems = [
  {
    path: '/dashboard',
    title: '主控台',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
  },
  {
    path: '/records',
    title: '值班记录',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>'
  },
  {
    path: '/export',
    title: '导出管理',
    roles: ['supervisor', 'district_admin', 'admin'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
  },
  {
    path: '/system',
    title: '系统配置',
    roles: ['admin', 'district_admin', 'supervisor'],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  }
]

// 按当前用户角色过滤菜单（无 roles 字段 = 所有登录用户可见）
const menuItems = computed(() =>
  allMenuItems.filter(i => !i.roles || i.roles.includes(store.user.role))
)

const isActive = (path) => {
  if (path === '/records' && route.path.startsWith('/records')) return true
  return route.path === path
}
</script>

<style lang="scss" scoped>
.sidebar {
  width: $sidebar-width;
  background: $bg-card;
  border-right: 1px solid $border-base;
  display: flex;
  flex-direction: column;
  transition: width 200ms cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: $z-sticky;
  flex-shrink: 0;

  &.collapsed {
    width: $sidebar-width-mini;
  }
}

// nav 区域：仅 nav 容器限制水平滚动条，tooltip/menu 都不在此处
.nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  height: $header-height;
  border-bottom: 1px solid $border-base;
  flex-shrink: 0;
}

.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: $primary;
  color: $text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { width: 16px; height: 16px; }
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  overflow: hidden;
}

.brand-title {
  font-size: $fs-md;
  font-weight: $fw-semibold;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-sub {
  font-size: $fs-xs;
  color: $text-muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden; // 折叠态防止水平滚动条
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: $radius-base;
  color: $text-secondary;
  font-size: $fs-base;
  font-weight: $fw-medium;
  text-decoration: none;
  transition: all $duration-fast $ease-out;
  position: relative;

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }

  &.active {
    background: $primary-soft;
    color: $primary;
  }
}

.nav-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { width: 16px; height: 16px; }
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-tooltip {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  padding: 5px 10px;
  background: $text-primary;
  color: $text-inverse;
  font-size: $fs-sm;
  border-radius: $radius-sm;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity $duration-fast $ease-out;
  z-index: $z-overlay;
  box-shadow: $shadow-md;
}

.nav-item:hover .nav-tooltip {
  opacity: 1;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin: 8px;
  border-top: 1px solid $border-base;
  padding-top: 14px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: $primary;
  color: $text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-base;
  font-weight: $fw-semibold;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.user-name {
  font-size: $fs-base;
  font-weight: $fw-medium;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: $fs-xs;
  color: $text-muted;
}

.collapse-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: $radius-sm;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $duration-fast $ease-out;

  svg { width: 12px; height: 12px; }

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }
}

// ===== 用户菜单 =====
.user-card-wrap {
  position: relative;
  border-top: 1px solid $border-base;
  margin: 0 8px;
}

.user-card {
  cursor: pointer;
  border-top: none;
  margin: 0;
  padding-top: 14px;

  &:hover { background: $bg-hover; }
}

.user-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 4px);
  background: $bg-elevated;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.10);
  z-index: 100;
  overflow: hidden;
}

.user-menu-header {
  padding: 10px 12px;
  border-bottom: 1px solid $border-subtle;
}

.user-menu-name {
  font-size: 13px;
  font-weight: $fw-medium;
  color: $text-primary;
}

.user-menu-meta {
  font-size: 11px;
  color: $text-muted;
  margin-top: 2px;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: $text-primary;
  cursor: pointer;
  text-align: left;
  transition: background $duration-fast $ease-out;

  svg { width: 14px; height: 14px; flex-shrink: 0; }

  &:hover { background: $bg-hover; }

  &.danger { color: #dc2626; }
  &.danger:hover { background: rgba(220, 38, 38, 0.08); }
}

.user-menu-enter-active,
.user-menu-leave-active { transition: all 160ms $ease-out; }
.user-menu-enter-from,
.user-menu-leave-to { opacity: 0; transform: translateY(4px); }

.expand-btn {
  margin: auto 8px 8px;
  width: 32px;
  height: 32px;
  background: $primary;
  color: $text-inverse;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $duration-fast $ease-out;
  align-self: center;

  .expand-avatar-text {
    font-size: 13px;
    font-weight: $fw-semibold;
    line-height: 1;
  }

  &:hover {
    filter: brightness(0.9);
  }
}
</style>
