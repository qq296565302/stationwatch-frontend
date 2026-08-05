<template>
  <transition name="dialog">
    <div v-if="visible" class="dialog-overlay" @click.self="onCancel">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">修改密码</h3>
          <button class="dialog-close" type="button" @click="onCancel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <div class="field">
            <label class="field-label">原密码 <span class="req">*</span></label>
            <input
              v-model="form.oldPassword"
              type="password"
              class="field-input"
              placeholder="当前使用的密码"
              autocomplete="current-password"
              @keydown.enter="onSubmit"
            />
          </div>
          <div class="field">
            <label class="field-label">新密码 <span class="req">*</span></label>
            <input
              v-model="form.newPassword"
              type="password"
              class="field-input"
              placeholder="至少 6 位"
              autocomplete="new-password"
              @keydown.enter="onSubmit"
            />
          </div>
          <div class="field">
            <label class="field-label">确认新密码 <span class="req">*</span></label>
            <input
              v-model="form.confirm"
              type="password"
              class="field-input"
              placeholder="再次输入新密码"
              autocomplete="new-password"
              @keydown.enter="onSubmit"
            />
          </div>
          <p class="change-tip">修改成功后需使用新密码重新登录。</p>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-ghost" type="button" @click="onCancel">取消</button>
          <button class="btn btn-primary" type="button" :disabled="!canSubmit" @click="onSubmit">
            确认修改
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'done'])

const router = useRouter()
const store = useAppStore()
const toast = useToast()

const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })

watch(() => props.visible, (v) => {
  if (v) {
    form.oldPassword = ''
    form.newPassword = ''
    form.confirm = ''
  }
})

const canSubmit = computed(() =>
  form.oldPassword.length >= 4 &&
  form.newPassword.length >= 6 &&
  form.newPassword === form.confirm
)

const onCancel = () => emit('update:visible', false)

const onSubmit = async () => {
  if (!canSubmit.value) return
  try {
    await store.changePassword(form.oldPassword, form.newPassword)
    emit('update:visible', false)
    toast.success('密码已修改，请重新登录')
    // 后端改密会吊销 refresh token，主动退出避免下次刷新 401
    await store.logout()
    router.push('/login')
  } catch (e) {
    toast.error(e.message || '修改失败')
  }
}
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
  max-width: 420px;
  background: $bg-elevated;
  border-radius: 10px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16), 0 4px 8px rgba(15, 23, 42, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-title { font-size: 15px; font-weight: 600; color: $text-primary; }

.dialog-close {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 6px;
  color: $text-muted; cursor: pointer;
  svg { width: 14px; height: 14px; }
  &:hover { background: $bg-hover; color: $text-primary; }
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.change-tip {
  font-size: 12px;
  color: $text-muted;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: $text-primary;
  .req { color: $crit; margin-left: 2px; }
}

.field-input {
  width: 100%;
  padding: 8px 12px;
  font-family: $font-body;
  font-size: 13px;
  color: $text-primary;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
  &:focus { border-color: $accent; box-shadow: 0 0 0 3px $accent-soft; }
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 200ms ease;
  .dialog { transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1); }
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  .dialog { transform: scale(0.96) translateY(8px); }
}
</style>
