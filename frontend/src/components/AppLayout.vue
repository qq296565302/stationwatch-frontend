<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': store.sidebarCollapsed }">
    <Sidebar class="layout-sidebar" />
    <div class="layout-main">
      <TopBar class="layout-header" />
      <main class="layout-content">
        <!-- 缩放包装层：字体放大时仅在内容区内滚动，不产生页面级滚动条 -->
        <div class="layout-content-inner" :style="{ zoom: store.fontScale }">
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
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
  min-width: 0;
  overflow-y: auto;
  overflow-x: auto; // 字体放大后内容可能超出内容区宽度，允许内容区内横向滚动，避免被裁切
}

// 缩放包装层：zoom 放大时内容在内容区内滚动，页面本身不产生滚动条
.layout-content-inner {
  // 统一内容区：上下窄、左右宽，让页面留出阅读空间
  padding: 24px 40px 40px;
  min-height: 100%;

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
