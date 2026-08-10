<template>
  <div class="app-shell">
    <template v-if="useLayout">
      <AppLayout />
    </template>
    <template v-else>
      <router-view />
    </template>

    <!-- 全局 Toast 容器 -->
    <div class="toast-container">
      <Toast
        v-for="t in toasts"
        :key="t.id"
        :type="t.type"
        :title="t.title"
        :message="t.message"
        :duration="t.duration"
        @close="remove(t.id)"
      />
    </div>

    <!-- 全局确认弹窗 -->
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import Toast from '@/components/Toast.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'
import { useOrderReminder } from '@/composables/useOrderReminder'
import { usePendingReminder } from '@/composables/usePendingReminder'

const route = useRoute()
const useLayout = computed(() => route.meta.layout !== 'blank')

const { toasts, remove } = useToast()

// 全局临近超时提醒（弹窗 + 警报声）
useOrderReminder()
// 值班遗留问题提醒（换班一次 + 定期，纯 toast）
usePendingReminder()
</script>

<style lang="scss">
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
</style>
