<template>
  <transition name="dialog" :duration="250">
    <div v-if="visible" class="dialog-overlay" @click.self="onCancel">
      <div class="dialog dialog-wide">
        <div class="dialog-header">
          <h3 class="dialog-title">编辑值班排班</h3>
          <button class="dialog-close" type="button" @click="onCancel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <div class="schedule-meta">
            <div class="field">
              <label class="field-label">起始日期（第 1 组从这天开始）</label>
              <input v-model="form.startDate" type="date" class="field-input font-mono" />
            </div>
            <div class="meta-info">
              <span class="tag tag-info">当前 {{ form.groups.length }} 组 · {{ form.groups.length }} 天一轮</span>
              <span class="meta-hint">每组分值一天，按序循环</span>
            </div>
          </div>

          <div class="batch-import">
            <div class="batch-import-head">
              <span class="batch-import-title">批量导入分组</span>
              <span class="batch-import-hint">每行一组「组名：成员1、成员2」，组名可省略</span>
            </div>
            <textarea v-model="importText" class="batch-import-input" rows="4" placeholder="第1组：张三、李四、王五&#10;第2组：赵六、孙七、周八"></textarea>
            <div class="batch-import-actions">
              <button class="btn btn-secondary btn-sm" type="button" :disabled="!importText.trim()" @click="applyImport">解析并应用</button>
              <span v-if="importHint" class="batch-import-hint">{{ importHint }}</span>
            </div>
          </div>

          <div class="group-list">
            <div v-for="(g, gi) in form.groups" :key="gi" class="group-card">
              <div class="group-head">
                <input v-model="g.name" class="group-name-input" maxlength="50" placeholder="组名" />
                <span class="group-day font-mono">第 {{ gi + 1 }} 天</span>
                <button class="btn btn-ghost btn-sm" type="button" :disabled="form.groups.length <= 1" @click="removeGroup(gi)">
                  删除组
                </button>
              </div>
              <div class="group-members">
                <button
                  v-for="u in dutyOfficers"
                  :key="u.id"
                  type="button"
                  class="member-btn"
                  :class="{ active: isIn(g, u.id), taken: takenByOther(u.id, gi) }"
                  :disabled="takenByOther(u.id, gi)"
                  @click="toggleMember(g, u.id)"
                >
                  <span class="member-dot"></span>
                  {{ u.realName }}
                  <span v-if="takenByOther(u.id, gi)" class="taken-hint">已分至「{{ groupNameOf(u.id) }}」</span>
                </button>
              </div>
            </div>
          </div>

          <div class="group-actions">
            <button class="btn btn-secondary btn-sm" type="button" @click="addGroup">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              添加一组
            </button>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-ghost" type="button" @click="onCancel">取消</button>
          <button class="btn btn-primary" type="button" :disabled="!canSubmit" @click="onSubmit">
            保存排班
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, computed, watch, ref } from 'vue'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { getCurrentDateISO } from '@/data/mockData'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'saved'])

const store = useAppStore()
const toast = useToast()
const confirm = useConfirm()

const form = reactive({ startDate: '', groups: [] })

// 候选值班员（值班员 + 所长均可值班，仅限当前站点）
const dutyOfficers = computed(() => store.users.filter(u =>
  ['duty_officer', 'supervisor'].includes(u.role) && u.stationId === store.currentStationId
))

// 打开时按当前配置初始化
watch(() => props.visible, (v) => {
  if (!v) return
  const cfg = store.scheduleConfig
  const cycleDays = cfg.cycleDays || 5
  let groups
  if (cfg.configured && cfg.groups.length) {
    groups = cfg.groups.map(g => ({
      name: g.name,
      sortOrder: g.sortOrder,
      memberIds: (g.members || []).map(m => m.id)
    }))
  } else {
    groups = []
  }
  // 保证组数 = 周期天数
  while (groups.length < cycleDays) groups.push({ name: `第${groups.length + 1}组`, sortOrder: groups.length + 1, memberIds: [] })
  if (groups.length > cycleDays) groups = groups.slice(0, cycleDays)
  form.startDate = cfg.startDate || getCurrentDateISO()
  form.groups = groups
})

const isIn = (g, uId) => g.memberIds.includes(uId)
const takenByOther = (uId, gi) =>
  form.groups.some((g, idx) => idx !== gi && g.memberIds.includes(uId))
const groupNameOf = (uId) => {
  const idx = form.groups.findIndex(g => g.memberIds.includes(uId))
  return idx >= 0 ? form.groups[idx].name : ''
}
const toggleMember = (g, uId) => {
  const i = g.memberIds.indexOf(uId)
  if (i >= 0) g.memberIds.splice(i, 1)
  else g.memberIds.push(uId)
}
const addGroup = () => {
  form.groups.push({ name: `第${form.groups.length + 1}组`, sortOrder: form.groups.length + 1, memberIds: [] })
}
const removeGroup = (gi) => {
  if (form.groups.length <= 1) return
  form.groups.splice(gi, 1)
  form.groups.forEach((g, i) => { g.sortOrder = i + 1 })
}

// ---- 批量粘贴导入（每行一组「组名：成员1、成员2」，按姓名匹配本所值班员） ----
const importText = ref('')
const importHint = ref('')

const applyImport = async () => {
  const nameToId = new Map()
  dutyOfficers.value.forEach(u => nameToId.set(u.realName.trim(), u.id))
  const parsed = []
  const unknown = []

  importText.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach((line) => {
      let name = ''
      let membersText = line
      const colonIdx = line.search(/[：:]/)
      if (colonIdx >= 0) {
        name = line.slice(0, colonIdx).trim()
        membersText = line.slice(colonIdx + 1)
      }
      const memberIds = []
      membersText
        .split(/[、,，;；\s]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach((mn) => {
          const id = nameToId.get(mn)
          if (id) { if (!memberIds.includes(id)) memberIds.push(id) }
          else if (!unknown.includes(mn)) unknown.push(mn)
        })
      parsed.push({ name: name || `第${parsed.length + 1}组`, sortOrder: parsed.length + 1, memberIds })
    })

  if (!parsed.length) { importHint.value = '未解析到任何分组，请检查格式'; return }
  // 同人跨组去重：保留首次出现
  const seen = new Set()
  parsed.forEach(g => {
    g.memberIds = g.memberIds.filter(id => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  })

  // 覆盖当前分组前二次确认，避免误操作丢配置
  if (form.groups.length) {
    const ok = await confirm.open({
      title: '覆盖当前分组',
      message: `将用 ${parsed.length} 组替换当前 ${form.groups.length} 组，确定？`,
      confirmText: '覆盖',
      cancelText: '取消',
      type: 'danger'
    })
    if (!ok) return
  }

  form.groups = parsed.map((g, i) => ({ name: g.name, sortOrder: i + 1, memberIds: g.memberIds }))
  let msg = `已导入 ${form.groups.length} 组`
  if (unknown.length) msg += `；未识别姓名：${unknown.join('、')}`
  importHint.value = msg
  toast.success('分组已更新，可继续逐人微调')
}

const canSubmit = computed(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) return false
  if (form.groups.length < 1) return false
  if (form.groups.some(g => !g.name.trim())) return false
  if (form.groups.some(g => g.memberIds.length === 0)) return false
  // 跨组重复检查
  const all = new Set()
  for (const g of form.groups) {
    for (const id of g.memberIds) {
      if (all.has(id)) return false
      all.add(id)
    }
  }
  return true
})

const onCancel = () => emit('update:visible', false)

const onSubmit = async () => {
  try {
    await store.updateScheduleConfig({
      startDate: form.startDate,
      cycleDays: form.groups.length,
      groups: form.groups.map((g, i) => ({
        name: g.name.trim(),
        sortOrder: i + 1,
        memberIds: g.memberIds
      }))
    })
    toast.success('排班已保存')
    emit('saved')
    emit('update:visible', false)
  } catch (e) {
    toast.error(e.message || '保存失败')
  }
}
</script>

<style lang="scss" scoped>
.dialog-overlay {
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

.dialog {
  width: 100%;
  max-width: 520px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: $bg-elevated;
  border-radius: 10px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16), 0 4px 8px rgba(15, 23, 42, 0.08);
  padding: 20px;
  gap: 16px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
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
  overflow-y: auto;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field-label { font-size: 12px; font-weight: 500; color: $text-primary; }

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

.schedule-meta {
  display: flex;
  align-items: flex-end;
  gap: 16px;

  .field { flex: 1; }
}

.meta-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 2px;
}

.meta-hint { font-size: 11px; color: $text-muted; }

.batch-import {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px dashed $border-strong;
  border-radius: 8px;
  background: $bg-page;
}

.batch-import-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.batch-import-title {
  font-size: 12px;
  font-weight: 600;
  color: $text-primary;
}

.batch-import-hint {
  font-size: 11px;
  color: $text-muted;
}

.batch-import-input {
  width: 100%;
  padding: 8px 10px;
  font-family: $font-body;
  font-size: 12px;
  line-height: 1.5;
  color: $text-primary;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  outline: none;
  resize: vertical;
  &:focus { border-color: $accent; box-shadow: 0 0 0 3px $accent-soft; }
}

.batch-import-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-card {
  border: 1px solid $border-base;
  border-radius: 8px;
  padding: 10px 12px;
  background: $bg-card;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.group-name-input {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: 6px;
  outline: none;
  &:focus { border-color: $accent; box-shadow: 0 0 0 3px $accent-soft; }
}

.group-day {
  font-size: 11px;
  color: $text-muted;
  white-space: nowrap;
}

.group-members {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  color: $text-secondary;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: 999px;
  cursor: pointer;
  transition: all 120ms ease;

  .member-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: $text-muted;
  }

  &:hover:not(:disabled) {
    border-color: $border-strong;
    color: $text-primary;
  }

  &.active {
    background: $accent-soft;
    border-color: $accent;
    color: $accent;
    .member-dot { background: $accent; }
  }

  &.taken {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.taken-hint {
  font-size: 10px;
  color: $text-muted;
}

.group-actions {
  display: flex;
  gap: 8px;
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
