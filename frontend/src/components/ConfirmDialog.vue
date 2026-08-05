<template>
  <transition name="dialog">
    <div v-if="state.visible" class="dialog-overlay" @click.self="onCancel">
      <div class="dialog" :class="`dialog-${state.type}`" role="alertdialog">
        <div class="dialog-icon" :class="`dialog-icon-${state.type}`">
          <svg v-if="state.type === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="dialog-content">
          <div class="dialog-title">{{ state.title }}</div>
          <div class="dialog-message">{{ state.message }}</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-ghost" @click="onCancel" type="button">
            {{ state.cancelText }}
          </button>
          <button
            class="btn"
            :class="state.type === 'danger' ? 'btn-danger' : 'btn-primary'"
            @click="onConfirm"
            type="button"
          >
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useConfirm } from '@/composables/useConfirm'
const { state, close } = useConfirm()

const onConfirm = () => close(true)
const onCancel = () => close(false)
</script>

<style lang="scss" scoped>
.dialog-overlay {
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

.dialog {
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

.dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;

  svg { width: 20px; height: 20px; }

  &-default {
    background: $accent-soft;
    color: $accent;
  }
  &-danger {
    background: $crit-soft;
    color: $crit;
  }
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
}

.dialog-message {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-danger {
  background: $crit;
  color: #fff;
  border: 1px solid $crit;

  &:hover { background: #d63838; }
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 200ms ease;
  .dialog {
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  .dialog { transform: scale(0.96) translateY(8px); }
}
</style>
