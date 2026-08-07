<template>
  <div class="login-view">
    <div class="login-bg" aria-hidden="true">
      <div class="bg-blob bg-blob-1"></div>
      <div class="bg-blob bg-blob-2"></div>
      <div class="bg-grid"></div>
    </div>

    <div class="login-card">
      <div class="login-brand">
        <div class="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div class="brand-text">
          <h1 class="brand-title">供电所值守云平台</h1>
          <p class="brand-sub">DutyGuard · 让值班更高效</p>
        </div>
      </div>

      <div class="login-form">
        <div class="field">
          <label class="field-label">用户名</label>
          <input
            v-model="form.username"
            class="field-input"
            type="text"
            placeholder="请输入用户名"
            autocomplete="username"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="field">
          <label class="field-label">密码</label>
          <div class="field-input-wrap">
            <input
              v-model="form.password"
              class="field-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
            <button
              type="button"
              class="toggle-pw"
              :title="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="login-extra">
          <label class="check">
            <input type="checkbox" v-model="form.remember" />
            <span>记住我</span>
          </label>
          <a class="link" href="javascript:void(0)" @click="onForgot">忘记密码？</a>
        </div>

        <button class="btn btn-primary btn-block" :disabled="loading" @click="handleLogin">
          <span v-if="loading" class="btn-spinner"></span>
          <span v-else>登录</span>
        </button>

        <div class="login-role">
          <span class="role-tip">演示账号：</span>
          <button
            v-for="r in rolePresets"
            :key="r.name"
            type="button"
            class="role-chip"
            @click="quickFill(r)"
          >
            {{ r.label }}
          </button>
        </div>
      </div>

      <div class="login-footer">
        <span>© 2026 供电所值守云平台</span>
        <span class="footer-divider">·</span>
        <span>v1.0.0</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const store = useAppStore()
const toast = useToast()

const form = reactive({
  username: '',
  password: '',
  remember: true
})

const showPassword = ref(false)
const loading = ref(false)

const rolePresets = [
  { label: '值班员', name: '李栋', username: 'lidong', password: '@zbdl-95598' },
  { label: '区县管理员', name: '张店区管理员', username: 'zd_admin', password: 'zd123456' },
  { label: '管理员', name: '超级管理员', username: 'admin', password: 'admin123' }
]

const quickFill = (r) => {
  form.username = r.username
  form.password = r.password
}

const onForgot = () => {
  toast.info('请联系系统管理员重置密码', '忘记密码')
}

const handleLogin = async () => {
  if (!form.username || !form.password) {
    toast.warning('请输入用户名和密码', '登录提示')
    return
  }
  loading.value = true
  try {
    await store.login({
      username: form.username.trim(),
      password: form.password
    })
    // 登录后预拉字典（业务表单依赖）
    store.fetchDictionaries()
    toast.success(`欢迎回来，${store.user.realName}`, '登录成功')
    router.push('/dashboard')
  } catch (e) {
    toast.error(e.message || '登录失败，请检查用户名和密码', '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-view {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: $bg-page;
  overflow: hidden;
  padding: 20px;
}

// ---- 背景 ----
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-blob {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  filter: blur(96px);
  opacity: 0.4;

  &-1 {
    top: -120px;
    right: -80px;
    background: radial-gradient(circle, $accent-soft, transparent 70%);
  }
  &-2 {
    bottom: -160px;
    left: -120px;
    background: radial-gradient(circle, $ok-soft, transparent 70%);
  }
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.025) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black, transparent 70%);
}

// ---- 卡片 ----
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 380px;
  background: $bg-elevated;
  border: 1px solid $border-base;
  border-radius: 14px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
  padding: 32px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: login-in 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes login-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: $primary;
  color: $text-inverse;
  flex-shrink: 0;

  svg { width: 20px; height: 20px; }
}

.brand-text {
  flex: 1;
  min-width: 0;
}

.brand-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.3;
  margin-bottom: 2px;
}

.brand-sub {
  font-size: 12px;
  color: $text-muted;
  line-height: 1.3;
}

// ---- 表单 ----
.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-input-wrap {
  position: relative;
  display: flex;
  align-items: center;

  .field-input { padding-right: 36px; }
}

.toggle-pw {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: $text-muted;
  cursor: pointer;
  transition: all 120ms ease;

  svg { width: 14px; height: 14px; }

  &:hover { color: $text-primary; background: $bg-hover; }
}

.login-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  margin-top: -4px;
}

.check {
  display: flex;
  align-items: center;
  gap: 6px;
  color: $text-secondary;
  cursor: pointer;
  user-select: none;

  input {
    width: 14px;
    height: 14px;
    accent-color: $primary;
  }
}

.link {
  color: $text-link;
  font-size: 12px;

  &:hover { text-decoration: underline; }
}

.btn-block {
  width: 100%;
  padding: 10px 16px;
  font-size: 13px;
  margin-top: 2px;
  position: relative;
}

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ---- 角色快捷登录 ----
.login-role {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid $border-subtle;
  font-size: 12px;
}

.role-tip {
  color: $text-muted;
  margin-right: 2px;
}

.role-chip {
  padding: 3px 10px;
  background: $bg-subtle;
  border: 1px solid $border-base;
  border-radius: 12px;
  color: $text-secondary;
  font-size: 11px;
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background: $accent-soft;
    border-color: $accent-border;
    color: $accent;
  }
}

// ---- 底部 ----
.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: $text-muted;
  padding-top: 4px;
}

.footer-divider { color: $text-faint; }
</style>
