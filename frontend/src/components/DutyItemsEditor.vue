<template>
  <div class="duty-items-editor">
    <div class="items-list">
      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="item-card"
        :class="{ completed: item.isCompleted, collapsed: !isItemExpanded(item) }"
      >
        <div class="item-head" @click="toggleItem(item)">
          <div class="item-head-left">
            <span class="item-index font-mono">#{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="item-head-info">
              <div class="item-head-title">
                {{ item.businessType || '未填写业务类型' }}
                <span v-if="item.content" class="item-head-sep">·</span>
                <span v-if="item.content" class="text-secondary">{{ item.content }}</span>
                <span v-if="!item.businessType && !item.content" class="text-muted">新工单</span>
              </div>
              <div v-if="item.customerName || item.handler" class="item-head-meta">
                <span v-if="item.customerName">{{ item.customerName }}</span>
                <span v-if="item.customerName && item.handler"> · </span>
                <span v-if="item.handler">{{ item.handler }} 处理</span>
              </div>
            </div>
          </div>
          <div class="item-head-right">
            <span v-if="item.acceptTime" class="time-pill font-mono">
              {{ item.acceptTime }}<span v-if="item.endTime"> → {{ item.endTime }}</span>
            </span>
            <button
              v-if="!isItemExpanded(item) && !item.isCompleted"
              class="btn btn-secondary btn-sm"
              @click.stop="expandItem(item)"
            >
              继续填写
            </button>
            <button
              v-else-if="!isItemExpanded(item) && item.isCompleted"
              class="btn btn-secondary btn-sm"
              @click.stop="expandItem(item)"
            >
              查看
            </button>
            <span class="expand-icon" :class="{ up: isItemExpanded(item) }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </div>
        </div>

        <transition name="expand">
          <div v-if="isItemExpanded(item)" class="item-body">
            <div class="form-grid">
              <div class="field">
                <label class="field-label">受理时间</label>
                <TimePicker v-model="item.acceptTime" :limit-to-now="acceptTimeLimitToNow" />
              </div>

              <div class="field">
                <label class="field-label">业务类型</label>
                <ComboboxInput
                  v-model="item.businessType"
                  :options="businessTypeOptions"
                  placeholder="选择或输入..."
                />
              </div>

              <div class="field field-full">
                <label class="field-label">受理内容</label>
                <ComboboxInput
                  v-model="item.content"
                  :options="acceptContentOptions"
                  placeholder="选择或输入..."
                  @input="onItemInput(item)"
                />
              </div>

              <div class="field">
                <label class="field-label">客户名称</label>
                <input
                  v-model="item.customerName"
                  type="text"
                  class="field-input"
                  placeholder="客户姓名"
                />
              </div>

              <div class="field">
                <label class="field-label">联系电话</label>
                <input
                  v-model="item.customerPhone"
                  type="tel"
                  class="field-input font-mono"
                  placeholder="11位手机号"
                  maxlength="11"
                  @input="item.customerPhone = item.customerPhone.replace(/\D/g, '')"
                />
                <span v-if="item.customerPhone && !isPhoneValid(item.customerPhone)" class="field-hint field-hint-warn">
                  请输入 11 位手机号
                </span>
              </div>

              <div class="field field-full">
                <label class="field-label">联系地址</label>
                <input
                  v-model="item.customerAddress"
                  type="text"
                  class="field-input"
                  placeholder="详细地址"
                />
              </div>

              <div class="field field-full">
                <label class="field-label">办理人员</label>
                <OfficerMultiSelect v-model="item.handler" :candidates="handlerOptions" />
              </div>
            </div>

            <div class="item-divider">
              <span class="divider-text">完成信息</span>
            </div>

            <div class="form-grid">
              <div class="field field-full">
                <label class="field-label">处理结果</label>
                <ComboboxInput
                  v-model="item.result"
                  :options="resultOptions"
                  placeholder="选择或输入处理结果..."
                />
              </div>
              <!-- 完成时间 + 客户满意标签（同一行） -->
              <div class="field field-full">
                <label class="field-label">完成信息</label>
                <div class="complete-row">
                  <div class="complete-time">
                    <TimePicker v-model="item.endTime" :limit-to-now="acceptTimeLimitToNow" />
                    <span class="field-hint">选择处理结果后自动填入当前时间，可点击修改</span>
                  </div>
                  <button
                    type="button"
                    class="satisfied-toggle"
                    :class="{
                      selected: item.customerSatisfied,
                      disabled: !item.isCompleted
                    }"
                    :disabled="!item.isCompleted"
                    @click="toggleSatisfied(item)"
                    :title="item.isCompleted ? (item.customerSatisfied ? '取消客户满意标签' : '标记为客户满意') : '请先标记工单完成后选择'"
                  >
                    <span class="satisfied-icon">
                      <svg v-if="item.customerSatisfied" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </span>
                    <span class="satisfied-text">
                      {{ item.isCompleted
                          ? (item.customerSatisfied ? '客户满意' : '标记为客户满意')
                          : '仅已完成工单可标记' }}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div class="item-actions">
              <div class="action-left">
                <button
                  v-if="!item.isCompleted && item.content"
                  class="btn btn-primary btn-sm"
                  @click="markComplete(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  标记完成
                </button>
                <button
                  v-else-if="item.isCompleted"
                  class="btn btn-secondary btn-sm"
                  @click="markUncomplete(item)"
                >
                  重新编辑
                </button>
              </div>
              <button
                class="btn btn-icon"
                title="删除工单"
                @click="removeItem(index)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <button
      v-if="items.length < MAX_ITEMS"
      class="add-btn"
      @click="addItem"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      添加工单
    </button>
  </div>
</template>

<script setup>
// 隐藏上限：日常填报无限制，仅作为防止极端情况的隐式安全阀
const MAX_ITEMS = 1000

import { ref, watch, computed } from 'vue'
import ComboboxInput from '@/components/ComboboxInput.vue'
import TimePicker from '@/components/TimePicker.vue'
import OfficerMultiSelect from '@/components/OfficerMultiSelect.vue'
import { useAppStore } from '@/store'
import { getCurrentTime } from '@/data/mockData'
import { getTodayISO } from '@/utils/orderTimeout'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: Array, required: true },
  recordDate: { type: String, default: '' },
  // 所属供电所：办理人员候选按该站点过滤（避免列出全库人员）
  stationId: { type: Number, default: null }
})
const emit = defineEmits(['update:modelValue'])

const store = useAppStore()
const toast = useToast()

// 字典选项：统一走后端 /dictionaries 接口（后端返回 { id, label } 对象数组）
// 「新装业务」不再受理，从业务类型选项中移除（不影响历史工单数据展示）
const EXCLUDED_BUSINESS_TYPES = ['新装业务']
const businessTypeOptions = computed(() =>
  store.dictionaries.businessTypes.map(d => d.label).filter(label => !EXCLUDED_BUSINESS_TYPES.includes(label))
)
const acceptContentOptions = computed(() => store.dictionaries.acceptContents.map(d => d.label))
const resultOptions = computed(() => store.dictionaries.results.map(d => d.label))
// 办理人员候选：按所属站点拉取该所值班员（避免列出全库人员）
const handlerOptions = ref([])
const loadOfficers = async () => {
  const sid = props.stationId ?? store.currentStationId
  if (!sid) { handlerOptions.value = []; return }
  const officers = await store.fetchOfficersByStation(sid)
  handlerOptions.value = officers.map(o => o.label)
}
watch(() => props.stationId, loadOfficers, { immediate: true })

// 本地 items 引用
const items = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

// 受理时间限制：仅「今天」的记录不允许选晚于当前时刻的时间；选过去日期（如昨天）时全天可选
const acceptTimeLimitToNow = computed(() => props.recordDate === getTodayISO())

const expandedIds = ref(new Set())

// ---- 展开/折叠 ----
const isItemExpanded = (item) => expandedIds.value.has(item.id)
const toggleItem = (item) => {
  if (expandedIds.value.has(item.id)) expandedIds.value.delete(item.id)
  else expandedIds.value.add(item.id)
  expandedIds.value = new Set(expandedIds.value)
}
const expandItem = (item) => {
  expandedIds.value.add(item.id)
  expandedIds.value = new Set(expandedIds.value)
}

// 新增工单自动展开
watch(() => items.value.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    const last = items.value[items.value.length - 1]
    if (last) {
      expandedIds.value.add(last.id)
      expandedIds.value = new Set(expandedIds.value)
    }
  }
})

// ---- 增删 ----
const addItem = () => {
  if (items.value.length >= MAX_ITEMS) {
    toast.error(`已达单条记录工单数上限 ${MAX_ITEMS} 条`, '提示')
    return
  }
  const next = [...items.value, {
    id: Date.now(),
    acceptTime: getCurrentTime(),
    businessType: '',
    content: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    handler: store.user.role !== 'admin' ? store.user.realName : '',
    endTime: '',
    result: '',
    isCompleted: false,
    customerSatisfied: false
  }]
  emit('update:modelValue', next)
}

const removeItem = (index) => {
  if (items.value.length === 1) return
  const item = items.value[index]
  expandedIds.value.delete(item.id)
  expandedIds.value = new Set(expandedIds.value)
  const next = items.value.filter((_, i) => i !== index)
  emit('update:modelValue', next)
}

// ---- 输入触发自动时间 ----
const onItemInput = (item) => {
  if (item.content && !item.acceptTime) {
    item.acceptTime = getCurrentTime()
  }
}

// ---- 验证 ----
const isPhoneValid = (phone) => /^1[3-9]\d{9}$/.test(phone)

// ---- 完成/取消完成 ----
// 需求：只要选择了处理结果，即表示该工单标记完成
watch(items, (list) => {
  list.forEach(item => {
    if (item.result && item.result.trim()) {
      item.isCompleted = true
      if (!item.endTime) item.endTime = getCurrentTime()
    }
  })
}, { deep: true })

// 标记完成：无必填项要求（已移除"必须先选择处理结果"的限制），自动补全时间
const markComplete = (item) => {
  if (!item.acceptTime) item.acceptTime = getCurrentTime()
  if (!item.endTime) item.endTime = getCurrentTime()
  item.isCompleted = true
}

const markUncomplete = (item) => {
  item.isCompleted = false
  item.endTime = ''
  item.result = ''
  item.customerSatisfied = false
}

// 切换「客户满意」标签：仅已完成工单可切换
const toggleSatisfied = (item) => {
  if (!item.isCompleted) return
  item.customerSatisfied = !item.customerSatisfied
}
</script>

<style lang="scss" scoped>
.duty-items-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-card {
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 120ms ease;

  &.completed { border-color: $ok-border; }
  &.collapsed { background: $bg-page; }
}

.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 120ms ease;

  &:hover { background: $bg-page; }
}

.item-card.completed .item-head:hover { background: $ok-soft; }

.item-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.item-index {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  padding: 2px 6px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 4px;
  flex-shrink: 0;
}

.item-card.completed .item-index {
  background: $ok-soft;
  color: #047857;
  border-color: $ok-border;
}

.item-head-info { min-width: 0; flex: 1; }

.item-head-title {
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card.completed .item-head-title { color: $text-secondary; }

.item-head-sep { margin: 0 6px; color: $text-faint; }

.item-head-meta {
  font-size: 11px;
  color: $text-muted;
  margin-top: 2px;
}

.item-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.time-pill {
  font-size: 11px;
  color: $text-secondary;
  padding: 2px 8px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 999px;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: $text-muted;
  transition: transform 120ms ease;

  svg { width: 14px; height: 14px; }
  &.up { transform: rotate(180deg); }
}

.item-body {
  padding: 16px 20px 20px;
  border-top: 1px solid $border-subtle;
  background: $bg-card;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field-full { grid-column: 1 / -1; }

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;

  &-required::after {
    content: '*';
    color: $crit;
    margin-left: 2px;
  }
}

.field-hint {
  font-size: 11px;
  color: $text-muted;

  &-warn { color: $warn; }
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

  &::placeholder { color: $text-muted; }

  &:hover:not(:disabled) { border-color: $border-strong; }
  &:focus {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }
}

// ===== 完成信息行（完成时间 + 客户满意标签）=====
.complete-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.complete-time {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// ===== 客户满意标签 =====
.satisfied-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 999px;
  color: $text-secondary;
  font-family: $font-body;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
  transition: all 120ms ease;

  &:hover:not(:disabled) {
    border-color: $ok-border;
    color: $text-primary;
  }

  &.selected {
    background: $ok-soft;
    border-color: $ok-border;
    color: #047857;

    &:hover:not(:disabled) {
      background: $ok-soft;
    }
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: $bg-subtle;
  }
}

.satisfied-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 14px;
    height: 14px;
  }
}

.item-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 12px;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $border-subtle;
  }
}

.divider-text {
  font-size: 11px;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid $border-subtle;
}

.action-left { display: flex; align-items: center; gap: 8px; }

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  background: $bg-card;
  border: 1px dashed $border-base;
  border-radius: 6px;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  transition: all 120ms ease;

  svg { width: 14px; height: 14px; }

  &:hover {
    color: $accent;
    border-color: $accent;
    background: $accent-soft;
    border-style: solid;
  }
}

// 展开动画
.expand-enter-active,
.expand-leave-active { transition: opacity 160ms ease, max-height 200ms ease; overflow: hidden; }
.expand-enter-from,
.expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to,
.expand-leave-from { opacity: 1; max-height: 1200px; }
</style>
