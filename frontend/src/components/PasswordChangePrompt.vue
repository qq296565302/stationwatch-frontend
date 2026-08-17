<template>
  <transition name="prompt">
    <div v-if="visible" class="pwd-prompt" role="alert">
      <div class="pwd-prompt-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div class="pwd-prompt-body">
        <div class="pwd-prompt-title">建议修改默认密码</div>
        <div class="pwd-prompt-text">
          您仍在使用系统分配的默认密码，为保障账号安全，建议尽快修改为个人密码。
        </div>
      </div>
      <div class="pwd-prompt-actions">
        <button class="btn btn-ghost btn-sm" type="button" @click="dismiss">暂不修改</button>
        <button class="btn btn-primary btn-sm" type="button" @click="goChange">立即修改</button>
      </div>
      <button class="pwd-prompt-close" type="button" @click="dismiss" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/store'

const store = useAppStore()

// 显示条件：仅需温和提醒时显示（admin 不提示，登录后由 store 标志控制）
const visible = computed(() => store.shouldPromptPasswordChange)

// 关闭本次会话的提醒（后端已按一周频率记录，下次登录且超过一周才会再次提示）
const dismiss = () => store.dismissPasswordPrompt()

// 立即修改：打开全局改密弹窗，并关闭横幅
const goChange = () => {
  store.dismissPasswordPrompt()
  store.openChangePasswordDialog()
}
</script>

<style lang="scss" scoped>
.pwd-prompt {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9200;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 560px;
  width: calc(100% - 32px);
  background: $bg-elevated;
  border: 1px solid $accent-border;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08);
  padding: 12px 44px 12px 14px;
}

.pwd-prompt-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: $accent-soft;
  color: $accent;
  flex-shrink: 0;

  svg { width: 16px; height: 16px; }
}

.pwd-prompt-body {
  flex: 1;
  min-width: 0;
}

.pwd-prompt-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.pwd-prompt-text {
  font-size: 12px;
  color: $text-secondary;
  margin-top: 2px;
  line-height: 1.5;
}

.pwd-prompt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

.pwd-prompt-close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: $text-muted;
  cursor: pointer;

  svg { width: 13px; height: 13px; }

  &:hover { background: $bg-hover; color: $text-primary; }
}

.prompt-enter-active,
.prompt-leave-active {
  transition: all 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
</style>
