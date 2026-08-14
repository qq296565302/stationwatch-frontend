<template>
  <transition name="dialog">
    <!-- 列表弹窗为信息展示：可点遮罩关闭（区别于强制提醒 DutyReminderDialog） -->
    <div v-if="dialog.visible" class="pending-overlay" @click.self="dismiss">
      <div class="pending-dialog" role="dialog" aria-modal="true">
        <div class="pending-head">
          <div class="pending-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <path d="M9 12h6M9 16h6"/>
            </svg>
          </div>
          <div class="pending-title">{{ dialog.title }}</div>
        </div>
        <div class="pending-summary">共 {{ dialog.list.length }} 个值班记录存在遗留问题，点击条目跳转处置</div>
        <ul class="pending-list">
          <li
            v-for="item in dialog.list"
            :key="item.recordId"
            role="link"
            tabindex="0"
            class="pending-item"
            @click="go(item)"
            @keydown.enter="go(item)"
          >
            <span class="pending-item-main">
              <span class="pending-date">{{ item.recordDate }}</span>
              <span v-if="item.stationName" class="pending-station">{{ item.stationName }}</span>
            </span>
            <span class="pending-item-side">
              <span class="pending-count">{{ item.count }} 项</span>
              <svg class="pending-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </li>
        </ul>
        <div class="pending-actions">
          <button class="btn btn-ghost" @click="dismiss" type="button">知道了</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { usePendingReminder } from '@/composables/usePendingReminder'

const { dialog, dismiss } = usePendingReminder()
const router = useRouter()

const go = (item) => {
  dismiss()
  router.push({ name: 'RecordDetail', params: { id: item.recordId } })
}
</script>

<style lang="scss" scoped>
.pending-overlay {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.pending-dialog {
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  background: $bg-elevated;
  border-radius: 10px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16), 0 4px 8px rgba(15, 23, 42, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pending-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pending-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: $warn-soft;
  color: $warn;

  svg { width: 18px; height: 18px; }
}

.pending-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
}

.pending-summary {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
}

.pending-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
}

.pending-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid $border-base;
  border-radius: 8px;
  background: $bg-base;
  cursor: pointer;
  transition: border-color $duration-fast $ease-out;

  &:hover,
  &:focus-visible {
    outline: none;
    border-color: $accent;
  }
}

.pending-item-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.pending-date {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
}

.pending-station {
  font-size: 12px;
  color: $text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pending-item-side {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.pending-count {
  font-size: 12px;
  font-weight: 600;
  color: $warn;
  background: $warn-soft;
  border-radius: $radius-full;
  padding: 2px 8px;
}

.pending-arrow {
  width: 14px;
  height: 14px;
  color: $text-secondary;
}

.pending-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2px;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 200ms ease;
  .pending-dialog {
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  .pending-dialog { transform: scale(0.96) translateY(8px); }
}
</style>
