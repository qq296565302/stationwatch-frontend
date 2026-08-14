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

    <!-- 当日值班记录强制提醒弹窗 -->
    <DutyReminderDialog />

    <!-- 遗留问题结构化列表提醒弹窗（换班一次 + 定期，点击条目跳转处置） -->
    <PendingIssuesDialog />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import Toast from '@/components/Toast.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DutyReminderDialog from '@/components/DutyReminderDialog.vue'
import PendingIssuesDialog from '@/components/PendingIssuesDialog.vue'
import { useToast } from '@/composables/useToast'
import { useOrderReminder } from '@/composables/useOrderReminder'
import { usePendingReminder } from '@/composables/usePendingReminder'
import { useDutyReminder } from '@/composables/useDutyReminder'

const route = useRoute()
const useLayout = computed(() => route.meta.layout !== 'blank')

const { toasts, remove } = useToast()

// 全局临近超时提醒（弹窗 + 警报声）
useOrderReminder()
// 值班遗留问题提醒（换班一次 + 定期，结构化列表弹窗）
usePendingReminder()
// 当日值班记录强制提醒（登录后若当日未创建记录则弹窗）
useDutyReminder()
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
