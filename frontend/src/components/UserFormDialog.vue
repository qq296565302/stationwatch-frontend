<template>
  <transition name="dialog">
    <div v-if="visible" class="dialog-overlay" @click.self="onCancel">
      <div class="dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ title }}</h3>
          <button class="dialog-close" type="button" @click="onCancel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <!-- 新增：完整信息 -->
          <template v-if="mode === 'create'">
            <div class="field">
              <label class="field-label">登录账号 <span class="req">*</span></label>
              <input
                v-model="form.username"
                class="field-input"
                placeholder="如 zhangsan"
                maxlength="50"
              />
            </div>

            <div class="field">
              <label class="field-label">真实姓名 <span class="req">*</span></label>
              <input
                v-model="form.realName"
                class="field-input"
                placeholder="如 张三"
                maxlength="50"
              />
            </div>

            <div class="field">
              <label class="field-label">初始密码 <span class="req">*</span></label>
              <input
                v-model="form.password"
                type="password"
                class="field-input"
                placeholder="至少 6 位"
                autocomplete="new-password"
              />
            </div>

            <div class="field">
              <label class="field-label">角色 <span class="req">*</span></label>
              <div class="role-group">
                <button
                  v-for="r in roleOptions"
                  :key="r.value"
                  type="button"
                  class="role-btn"
                  :class="{ active: form.role === r.value }"
                  @click="form.role = r.value"
                >
                  <span class="role-label">{{ r.label }}</span>
                  <span class="role-desc">{{ r.desc }}</span>
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field-label">所属站点</label>
              <select
                v-model="form.stationId"
                class="field-input"
                :disabled="isStationLocked"
              >
                <option v-if="!isStationLocked" :value="null">未分配</option>
                <option v-for="s in stations" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </template>

          <!-- 编辑：基本信息 -->
          <template v-else-if="mode === 'edit'">
            <div class="field">
              <label class="field-label">登录账号</label>
              <input :value="user?.username" class="field-input" disabled />
            </div>

            <div class="field">
              <label class="field-label">真实姓名 <span class="req">*</span></label>
              <input
                v-model="form.realName"
                class="field-input"
                maxlength="50"
              />
            </div>

            <div class="field">
              <label class="field-label">所属站点</label>
              <select
                v-model="form.stationId"
                class="field-input"
                :disabled="isStationLocked"
              >
                <option v-if="!isStationLocked" :value="null">未分配</option>
                <option v-for="s in stations" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div class="field">
              <label class="field-label">账号状态</label>
              <div class="switch-row">
                <label class="switch">
                  <input type="checkbox" v-model="form.isActive" />
                  <span class="switch-slider"></span>
                </label>
                <span class="field-hint">{{ form.isActive ? '启用（可登录）' : '停用（禁止登录）' }}</span>
              </div>
            </div>
          </template>

          <!-- 权限：角色分配 -->
          <template v-else>
            <p class="perm-tip">为「{{ user?.realName || user?.username }}」分配系统角色：</p>
            <div class="role-group">
              <button
                v-for="r in roleOptions"
                :key="r.value"
                type="button"
                class="role-btn"
                :class="{ active: form.role === r.value }"
                @click="form.role = r.value"
              >
                <span class="role-label">{{ r.label }}</span>
                <span class="role-desc">{{ r.desc }}</span>
              </button>
            </div>
          </template>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-ghost" type="button" @click="onCancel">取消</button>
          <button class="btn btn-primary" type="button" :disabled="!canSubmit" @click="onSubmit">
            {{ submitText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  visible:  { type: Boolean, default: false },
  mode:     { type: String,  default: 'create' }, // create | edit | permission
  user:     { type: Object,  default: null },
  stations: { type: Array,   default: () => [] }
})
const emit = defineEmits(['update:visible', 'saved'])

const store = useAppStore()
const toast = useToast()

const roleOptions = [
  { value: 'duty_officer', label: '值班员', desc: '填写本所值班记录' },
  { value: 'supervisor',   label: '所长',   desc: '查看本所记录及管理' }
]

// 所长仅能操作本所用户，站点下拉锁定
const isStationLocked = computed(() => store.user.role !== 'admin')

const form = reactive({
  username: '',
  password: '',
  realName: '',
  role: 'duty_officer',
  stationId: null,
  isActive: true
})

const title = computed(() => ({
  create: '添加值班员',
  edit: '编辑值班员',
  permission: '分配权限'
}[props.mode] || '值班员'))

const submitText = computed(() => ({
  create: '创建',
  edit: '保存修改',
  permission: '保存权限'
}[props.mode] || '保存'))

const canSubmit = computed(() => {
  if (props.mode === 'create') {
    return form.username.trim().length >= 2 && !!form.realName.trim() && form.password.length >= 6
  }
  if (props.mode === 'edit') return !!form.realName.trim()
  return true
})

// 打开时根据 mode/user 初始化表单
watch(() => props.visible, (v) => {
  if (!v) return
  const u = props.user || {}
  form.username = u.username || ''
  form.password = ''
  form.realName = u.realName || ''
  form.role = u.role || 'duty_officer'
  form.stationId = isStationLocked.value ? store.currentStationId : (u.stationId ?? null)
  form.isActive = u.isActive !== false
})

const onCancel = () => emit('update:visible', false)

const onSubmit = async () => {
  try {
    if (props.mode === 'create') {
      await store.createUser({
        username: form.username.trim(),
        password: form.password,
        realName: form.realName.trim(),
        role: form.role,
        stationId: isStationLocked.value ? store.currentStationId : form.stationId
      })
      toast.success('值班员已创建')
    } else if (props.mode === 'edit') {
      await store.updateUser(props.user.id, {
        realName: form.realName.trim(),
        role: form.role,
        stationId: isStationLocked.value ? store.currentStationId : form.stationId,
        isActive: form.isActive
      })
      toast.success('已保存修改')
    } else {
      await store.updateUser(props.user.id, { role: form.role })
      toast.success('权限已更新')
    }
    emit('saved')
    emit('update:visible', false)
  } catch (e) {
    toast.error(e.message || '操作失败')
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
  max-width: 440px;
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

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

.dialog-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: $text-muted;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;

  svg { width: 14px; height: 14px; }

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

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

  &:disabled {
    background: $bg-page;
    color: $text-muted;
    cursor: not-allowed;
  }

  &::placeholder { color: $text-muted; }

  &:focus {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }
}

select.field-input {
  cursor: pointer;
}

.field-hint {
  font-size: 11px;
  color: $text-muted;
}

// 角色单选卡片
.role-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 120ms ease;

  &:hover {
    border-color: $border-strong;
    background: $bg-hover;
  }

  &.active {
    border-color: $accent;
    background: $accent-soft;
    box-shadow: 0 0 0 3px $accent-soft;
  }
}

.role-label {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.role-btn.active .role-label { color: $accent; }

.role-desc {
  font-size: 11px;
  color: $text-muted;
  flex-shrink: 0;
}

// 开关
.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;

  input { display: none; }
}

.switch-slider {
  position: absolute;
  inset: 0;
  background: $border-strong;
  border-radius: 22px;
  cursor: pointer;
  transition: background 150ms ease;

  &::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.switch input:checked + .switch-slider {
  background: $ok;

  &::before { transform: translateX(18px); }
}

.perm-tip {
  font-size: 13px;
  color: $text-secondary;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
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
