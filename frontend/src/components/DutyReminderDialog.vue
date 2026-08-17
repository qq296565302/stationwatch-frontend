<template>
  <transition name="dialog" :duration="250">
    <!-- 遮罩无 @click.self：点击遮罩不可关闭，体现「强制提醒」语义 -->
    <div v-if="dialog.visible" class="duty-overlay">
      <div class="duty-dialog" role="alertdialog">
        <div class="duty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="duty-content">
          <div class="duty-title">{{ dialog.title }}</div>
          <div class="duty-message">{{ dialog.message }}</div>
        </div>
        <div class="duty-actions">
          <button class="btn btn-ghost" @click="dismiss" type="button">暂不</button>
          <button class="btn btn-duty-warn" @click="goCreate" type="button">去创建值班记录</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useDutyReminder } from '@/composables/useDutyReminder'

const { dialog, dismiss } = useDutyReminder()
const router = useRouter()

const goCreate = () => {
  dismiss()
  router.push('/records/create')
}
</script>

<style lang="scss" scoped>
.duty-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9500;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.duty-dialog {
  width: 100%;
  max-width: 380px;
  background: $bg-elevated;
  border-radius: 10px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16), 0 4px 8px rgba(15, 23, 42, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.duty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: $warn-soft;
  color: $warn;

  svg { width: 20px; height: 20px; }
}

.duty-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.duty-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
}

.duty-message {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
}

.duty-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-duty-warn {
  background: $warn;
  color: #fff;
  border: 1px solid $warn;

  &:hover { background: #d97706; }
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 200ms ease;
  .duty-dialog {
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  .duty-dialog { transform: scale(0.96) translateY(8px); }
}
</style>
