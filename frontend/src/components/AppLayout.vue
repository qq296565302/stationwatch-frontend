<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': store.sidebarCollapsed }">
    <Sidebar class="layout-sidebar" />
    <div class="layout-main">
      <TopBar class="layout-header" />
      <main class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '@/store'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'

const store = useAppStore()
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  background: $bg-page;
}

.layout-sidebar {
  flex-shrink: 0;
}

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.layout-header {
  flex-shrink: 0;
}

.layout-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  // 统一内容区：上下窄、左右宽，让页面留出阅读空间
  padding: 24px 40px 40px;

  // 大屏加宽左右留白
  @media (min-width: 1440px) {
    padding: 28px 56px 56px;
  }

  // 中等屏幕
  @media (max-width: 1280px) {
    padding: 20px 28px 32px;
  }

  // 平板
  @media (max-width: 960px) {
    padding: 16px 20px 24px;
  }

  // 手机
  @media (max-width: 640px) {
    padding: 12px 14px 20px;
  }
}

// 页面切换动画
.page-enter-active,
.page-leave-active {
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
