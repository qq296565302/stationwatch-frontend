<template>
  <transition name="toast">
    <div v-if="visible" class="toast" :class="`toast-${type}`" role="alert">
      <div class="toast-icon">
        <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="toast-content">
        <div v-if="title" class="toast-title">{{ title }}</div>
        <div class="toast-message">{{ message }}</div>
      </div>
      <button class="toast-close" @click="visible = false" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  type: { type: String, default: 'info' }, // success / error / info / warning
  title: { type: String, default: '' },
  message: { type: String, required: true },
  duration: { type: Number, default: 3000 }
})

const visible = ref(true)
let timer = null

const close = () => {
  visible.value = false
  if (timer) clearTimeout(timer)
}

watch(() => props.message, () => {
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(close, props.duration)
})

onMounted(() => {
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style lang="scss" scoped>
.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 280px;
  max-width: 380px;
  padding: 12px 14px;
  background: $bg-elevated;
  border: 1px solid $border-base;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04);
  pointer-events: auto;
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;

  svg { width: 14px; height: 14px; }
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 2px;
  line-height: 1.3;
}

.toast-message {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
}

.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: $text-muted;
  cursor: pointer;
  transition: all 120ms ease;
  margin-top: 1px;

  svg { width: 12px; height: 12px; }

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }
}

// ---- 类型 ----
.toast-success {
  .toast-icon { background: $ok-soft; color: $ok; }
  border-color: rgba(16, 185, 129, 0.2);
}
.toast-error {
  .toast-icon { background: $crit-soft; color: $crit; }
  border-color: rgba(239, 68, 68, 0.2);
}
.toast-info {
  .toast-icon { background: $accent-soft; color: $accent; }
}
.toast-warning {
  .toast-icon { background: $warn-soft; color: $warn; }
}

// ---- 动画 ----
.toast-enter-active,
.toast-leave-active {
  transition: opacity 200ms ease, transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.96);
}
</style>
