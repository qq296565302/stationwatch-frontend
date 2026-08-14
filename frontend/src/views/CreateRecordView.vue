<template>
  <div class="create-record-view">
    <!-- 合并顶栏：标题 + 状态 + 返回/保存按钮，固定在页面上方 -->
    <div class="record-toolbar">
      <div class="toolbar-main">
        <div class="toolbar-title">
          <h1 class="toolbar-title-text">{{ isEdit ? '编辑值班记录' : '新建值班记录' }}</h1>
          <p class="toolbar-subtitle">{{ isEdit ? '修改并保存当前的值班记录' : '按步骤填写值班信息' }}</p>
        </div>
        <div class="toolbar-status">
          <template v-if="!isEdit">
            <span class="toolbar-status-item">第 {{ currentStep + 1 }} / {{ steps.length }} 步</span>
            <span v-if="formDirty" class="toolbar-dirty">· 有未保存修改</span>
            <span v-if="currentStep === 1" class="toolbar-summary">· {{ completedCount }} / {{ validItemCount }} 工单已完成</span>
          </template>
          <template v-else>
            <span class="toolbar-status-item">编辑模式</span>
            <span v-if="formDirty" class="toolbar-dirty">· 有未保存修改</span>
            <span class="toolbar-summary">· {{ validItemCount }} 条工单 · 已完成 {{ completedCount }}</span>
          </template>
        </div>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost" @click="handleCancel">
          返回列表
        </button>
        <template v-if="!isEdit">
          <button v-if="currentStep > 0" class="btn btn-secondary" @click="prevStep">上一步</button>
          <button
            v-if="currentStep < steps.length - 1"
            class="btn btn-primary"
            :disabled="!canGoNext"
            @click="nextStep"
          >
            下一步
          </button>
          <button
            v-if="currentStep === steps.length - 1"
            class="btn btn-primary"
            @click="handleSubmit"
          >
            提交记录
          </button>
        </template>
        <button v-else class="btn btn-primary" :disabled="isLocked" @click="handleSubmit">
          {{ isLocked ? '已锁定' : '保存修改' }}
        </button>
      </div>
    </div>

    <!-- 新建模式：分步指示器 -->
    <StepIndicator v-if="!isEdit" :current-step="currentStep" :steps="steps" />

    <!-- ============ 新建模式：分步容器 ============ -->
    <div v-if="!isEdit" class="form-main">
      <transition name="step" mode="out-in">
        <!-- 步骤 1：基本信息 -->
        <div v-if="currentStep === 0" key="step0" class="card form-card">
          <div class="step-panel">
            <h2 class="step-title">基本信息</h2>

            <div class="form-grid">
              <div class="field">
                <label class="field-label">值班日期</label>
                <div class="date-picker">
                  <button
                    type="button"
                    class="date-option"
                    :class="{ active: formData.dateOption === 'today' }"
                    @click="setDateOption('today')"
                  >
                    <span class="date-option-label">今天</span>
                    <span class="date-option-value font-mono">{{ todayISO }}</span>
                  </button>
                  <button
                    type="button"
                    class="date-option"
                    :class="{ active: formData.dateOption === 'yesterday' }"
                    @click="setDateOption('yesterday')"
                  >
                    <span class="date-option-label">昨天</span>
                    <span class="date-option-value font-mono">{{ yesterdayISO }}</span>
                  </button>
                </div>
                <span class="field-hint">{{ formData.recordDate }} · 补录前一天记录时可选择昨天</span>
              </div>

              <div class="field">
                <label class="field-label field-label-required">天气情况</label>
                <div class="weather-picker">
                  <button
                    v-for="w in store.weatherOptions"
                    :key="w.value"
                    type="button"
                    class="weather-option"
                    :class="{ active: formData.weather === w.value }"
                    @click="formData.weather = w.value"
                  >
                    <span class="weather-icon">{{ w.icon }}</span>
                    <span class="weather-label">{{ w.label }}</span>
                  </button>
                </div>
              </div>

              <div class="field">
                <label class="field-label">值班人员</label>
                <div class="readonly-display">
                  <div
                    v-for="o in todayDutyOfficers"
                    :key="o.id"
                    class="readonly-member"
                  >
                    <div class="user-avatar">{{ avatarOf(o.realName) }}</div>
                    <div class="user-info">
                      <div class="user-name">{{ o.realName }}</div>
                      <div class="user-meta">{{ o.isMe ? '本人' : '值班员' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="field">
                <label class="field-label">所属站点</label>
                <input v-model="formData.station" type="text" class="field-input" readonly />
                <span class="field-hint">系统配置</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤 2：值班事项 -->
        <div v-else-if="currentStep === 1" key="step1" class="card form-card">
          <div class="step-panel">
            <div class="step-head">
              <div>
                <h2 class="step-title">值班事项</h2>
                <p class="step-desc">添加客户报修/业务工单，每条工单独立记录处理过程</p>
              </div>
              <div class="step-counter font-mono">
                {{ formData.dutyItems.length }} 条
              </div>
            </div>

            <DutyItemsEditor v-model="formData.dutyItems" :record-date="formData.recordDateISO" />
          </div>
        </div>

        <!-- 步骤 3：其他事项 -->
        <div v-else key="step2" class="card form-card">
          <div class="step-panel">
            <h2 class="step-title">其他事项与遗留问题</h2>
            <p class="step-desc">记录非例行事项及待跟进问题</p>

            <div class="form-stack">
              <div class="field">
                <label class="field-label">其他事项</label>
                <textarea
                  v-model="formData.otherMatters"
                  class="field-textarea"
                  rows="2"
                  placeholder="例如：参加安全会议、培训学习、设备异动..."
                ></textarea>
                <span class="field-hint">{{ formData.otherMatters.length }} 字</span>
              </div>

              <div class="field">
                <label class="field-label">遗留问题</label>
                <textarea
                  v-model="formData.pendingIssues"
                  class="field-textarea"
                  rows="2"
                  placeholder="待处理问题，后续跟进..."
                ></textarea>
                <span class="field-hint">{{ formData.pendingIssues.length }} 字 · 将在下个班次优先展示</span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ============ 编辑模式：单页三卡片 ============ -->
    <div v-else class="form-stack">
      <!-- 卡片 1：基本信息 -->
      <div class="card form-card-collapsible">
        <button
          class="card-toggle"
          :class="{ collapsed: cardsCollapsed.basic }"
          @click="cardsCollapsed.basic = !cardsCollapsed.basic"
          type="button"
        >
          <span class="card-toggle-left">
            <i class="led led-info"></i>
            <span class="card-toggle-title">基本信息</span>
            <span class="card-toggle-sub font-mono">
              {{ formData.recordDate }} · {{ getWeatherLabel(formData.weather) || '未选' }} · {{ formData.station || '未填' }}
            </span>
          </span>
          <svg class="card-toggle-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <transition name="card-collapse">
          <div v-show="!cardsCollapsed.basic" class="card-body">
            <div class="form-grid">
              <div class="field">
                <label class="field-label">值班日期</label>
                <input v-model="formData.recordDate" type="text" class="field-input" readonly />
                <span class="field-hint">系统自动填充</span>
              </div>

              <div class="field">
                <label class="field-label field-label-required">天气情况</label>
                <div class="weather-picker">
                  <button
                    v-for="w in store.weatherOptions"
                    :key="w.value"
                    type="button"
                    class="weather-option"
                    :class="{ active: formData.weather === w.value }"
                    @click="formData.weather = w.value"
                  >
                    <span class="weather-icon">{{ w.icon }}</span>
                    <span class="weather-label">{{ w.label }}</span>
                  </button>
                </div>
              </div>

              <div class="field">
                <label class="field-label">值班人员</label>
                <div class="readonly-display">
                  <div
                    v-for="o in todayDutyOfficers"
                    :key="o.id"
                    class="readonly-member"
                  >
                    <div class="user-avatar">{{ avatarOf(o.realName) }}</div>
                    <div class="user-info">
                      <div class="user-name">{{ o.realName }}</div>
                      <div class="user-meta">{{ o.isMe ? '本人' : '值班员' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="field">
                <label class="field-label">所属站点</label>
                <input v-model="formData.station" type="text" class="field-input" readonly />
                <span class="field-hint">系统配置</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- 卡片 2：值班事项 -->
      <div class="card form-card-collapsible">
        <button
          class="card-toggle"
          :class="{ collapsed: cardsCollapsed.items }"
          @click="cardsCollapsed.items = !cardsCollapsed.items"
          type="button"
        >
          <span class="card-toggle-left">
            <i class="led led-ok"></i>
            <span class="card-toggle-title">值班事项</span>
            <span class="card-toggle-sub font-mono">
              {{ validItemCount }} 条 · 已完成 {{ completedCount }}
            </span>
          </span>
          <svg class="card-toggle-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <transition name="card-collapse">
          <div v-show="!cardsCollapsed.items" class="card-body">
            <DutyItemsEditor v-model="formData.dutyItems" :record-date="formData.recordDateISO" />
          </div>
        </transition>
      </div>

      <!-- 卡片 3：其他事项 -->
      <div class="card form-card-collapsible">
        <button
          class="card-toggle"
          :class="{ collapsed: cardsCollapsed.others }"
          @click="cardsCollapsed.others = !cardsCollapsed.others"
          type="button"
        >
          <span class="card-toggle-left">
            <i class="led led-warn"></i>
            <span class="card-toggle-title">其他事项与遗留问题</span>
            <span class="card-toggle-sub font-mono">
              其他 {{ formData.otherMatters.length }} 字 · 遗留 {{ formData.pendingIssues.length }} 字
            </span>
          </span>
          <svg class="card-toggle-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <transition name="card-collapse">
          <div v-show="!cardsCollapsed.others" class="card-body">
            <div class="form-stack">
              <div class="field">
                <label class="field-label">其他事项</label>
                <textarea
                  v-model="formData.otherMatters"
                  class="field-textarea"
                  rows="2"
                  placeholder="例如：参加安全会议、培训学习、设备异动..."
                ></textarea>
                <span class="field-hint">{{ formData.otherMatters.length }} 字</span>
              </div>

              <div class="field">
                <label class="field-label">遗留问题</label>
                <textarea
                  v-model="formData.pendingIssues"
                  class="field-textarea"
                  rows="2"
                  placeholder="待处理问题，后续跟进..."
                ></textarea>
                <span class="field-hint">{{ formData.pendingIssues.length }} 字 · 将在下个班次优先展示</span>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import StepIndicator from '@/components/StepIndicator.vue'
import DutyItemsEditor from '@/components/DutyItemsEditor.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { getCurrentDateISO, getCurrentTime } from '@/data/mockData'
import { toMinutes, getTodayISO, getNowHM } from '@/utils/orderTimeout'

const toast = useToast()
const confirm = useConfirm()

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const isEdit = computed(() => !!route.params.id)
const currentStep = ref(0)
const formDirty = ref(false)

// 卡片折叠态：仅编辑模式生效（单页三卡片布局）
const cardsCollapsed = ref({ basic: false, items: false, others: false })

// 当前记录状态（编辑模式加载记录时记录），锁定记录仅超级管理员可编辑
const recordStatus = ref(null)
const isLocked = computed(() =>
  isEdit.value && recordStatus.value === 'locked' && store.user.role !== 'admin'
)

const steps = [
  { label: '基本信息' },
  { label: '值班事项' },
  { label: '其他事项' }
]

const createEmptyItem = () => ({
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
})

// ---- 值班日期：新建时可选今天或昨天（补录前一天记录） ----
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const displayOf = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}
const todayISO = getCurrentDateISO()
const _yesterday = new Date()
_yesterday.setDate(_yesterday.getDate() - 1)
const yesterdayISO = isoOf(_yesterday)

const formData = reactive({
  dateOption: 'today', // today | yesterday
  recordDate: displayOf(todayISO),
  recordDateISO: todayISO,
  weather: 'sunny',
  station: store.systemConfig.stationName,
  dutyItems: [createEmptyItem()],
  otherMatters: '',
  pendingIssues: ''
})

const setDateOption = (opt) => {
  if (isEdit.value) return // 编辑模式不改日期
  formData.dateOption = opt
  const iso = opt === 'yesterday' ? yesterdayISO : todayISO
  formData.recordDateISO = iso
  formData.recordDate = displayOf(iso)
}

// 值班人员 = 当天排班班组；未命中排班时回退为当前登录用户
const todayDutyOfficers = computed(() => {
  const row = store.scheduleTable.find(r => r.date === formData.recordDateISO)
  if (row && row.members && row.members.length) {
    return row.members.map(m => ({
      id: m.id,
      realName: m.realName,
      isMe: String(m.id) === String(store.user.id)
    }))
  }
  return [{
    id: store.user.id,
    realName: store.user.realName,
    isMe: true
  }]
})

// 中文名取最后一个字作头像，英文取首字母大写
const avatarOf = (name) => {
  const n = (name || '').trim()
  if (!n) return '?'
  const ch = n[n.length - 1]
  return /[一-龥]/.test(ch) ? ch : ch.toUpperCase()
}

onMounted(async () => {
  // 加载排班表（从昨天起覆盖 8 天），用于第一步显示当天值班班组
  store.fetchScheduleTable({ from: yesterdayISO, days: 8 })

  if (isEdit.value) {
    try {
      const record = await store.fetchRecordById(route.params.id)
      if (record) {
        recordStatus.value = record.status || null
        formData.recordDate = formatRecordDate(record.recordDate)
        formData.recordDateISO = record.recordDate
        formData.weather = record.weather || 'sunny'
        formData.station = record.station || store.systemConfig.stationName
        formData.dutyItems = (record.dutyItems || []).map(i => ({
          id: Number(i.id) || Date.now(),
          acceptTime: i.acceptTime || '',
          businessType: i.businessType || '',
          content: i.content || '',
          customerName: i.customerName || '',
          customerPhone: i.customerPhone || '',
          customerAddress: i.customerAddress || '',
          handler: i.handler || '',
          endTime: i.endTime || '',
          result: i.result || '',
          isCompleted: !!i.isCompleted,
          customerSatisfied: !!i.customerSatisfied
        }))
        if (formData.dutyItems.length === 0) formData.dutyItems = [createEmptyItem()]
        formData.otherMatters = record.otherMatters || ''
        // 只回填未解决的遗留问题；已解决条目由后端合并保留（编辑不会丢）
        formData.pendingIssues = record.pendingText || ''
        formDirty.value = false
      } else {
        toast.error('记录不存在')
        router.push('/records')
      }
    } catch (e) {
      toast.error(e.message || '记录加载失败')
      router.push('/records')
    }
  }
  // 新建模式：始终走三段式新建流程，提交时由后端按"同站同一天"智能合并
})

const validItemCount = computed(() => formData.dutyItems.filter(i => i.content).length)
const completedCount = computed(() => formData.dutyItems.filter(i => i.isCompleted).length)

const canGoNext = computed(() => {
  if (currentStep.value === 0) return !!formData.weather && !!formData.station
  if (currentStep.value === 1) return validItemCount.value > 0
  return true
})

watch(formData, () => { formDirty.value = true }, { deep: true })

// ---- 步骤导航（仅新建） ----
const nextStep = () => { if (currentStep.value < steps.length - 1) currentStep.value++ }
const prevStep = () => { if (currentStep.value > 0) currentStep.value-- }

const handleCancel = async () => {
  if (formDirty.value) {
    const ok = await confirm.open({
      title: '放弃编辑',
      message: '当前有未保存的修改，确定要放弃吗？',
      confirmText: '放弃',
      cancelText: '继续编辑',
      type: 'danger'
    })
    if (!ok) return
  }
  router.push('/records')
}

const handleSubmit = async () => {
  // 过滤：只保留有内容的工单
  const validItems = formData.dutyItems.filter(i => i.content)

  // 不完整的工单提示
  const isItemValid = (item) => !!(item.businessType && item.customerName &&
    /^1[3-9]\d{9}$/.test(item.customerPhone) && item.customerAddress && item.handler)
  const incomplete = validItems.filter(i => !isItemValid(i))
  if (incomplete.length > 0) {
    const ok = await confirm.open({
      title: '工单未完成',
      message: `${incomplete.length} 个工单存在未填必填项，是否继续提交？`,
      confirmText: '继续提交',
      cancelText: '返回修改'
    })
    if (!ok) return
  }

  // 受理时间不允许晚于当前时刻（仅当天记录校验；历史记录补录不受限）
  if (formData.recordDateISO === getTodayISO()) {
    const nowMin = toMinutes(getNowHM())
    const futureItem = validItems.find(i => i.acceptTime && toMinutes(i.acceptTime) > nowMin)
    if (futureItem) {
      toast.error(`工单「${futureItem.content}」的受理时间晚于当前时间，请修正后再保存`, '时间错误')
      return
    }
  }

  const recordData = {
    recordDate: formData.recordDateISO,
    weather: formData.weather,
    weatherLabel: getWeatherLabel(formData.weather),
    stationId: Number(store.currentStationId) || Number(store.user.stationId),
    dutyItems: validItems.map(i => ({
      id: Number(i.id) || 0,
      acceptTime: i.acceptTime || null,
      businessType: i.businessType,
      content: i.content,
      customerName: i.customerName,
      customerPhone: i.customerPhone,
      customerAddress: i.customerAddress,
      handler: i.handler,
      endTime: i.endTime || null,
      result: i.result || '',
      isCompleted: !!i.isCompleted,
      customerSatisfied: !!i.customerSatisfied
    })),
    otherMatters: formData.otherMatters,
    pendingIssues: formData.pendingIssues
  }

  try {
    if (isEdit.value) {
      await store.updateRecord(route.params.id, recordData)
      toast.success('记录已保存')
    } else {
      await store.createRecord(recordData)
      toast.success('记录已创建')
    }
    router.push('/records')
  } catch (e) {
    toast.error(e.message || '保存失败')
  }
}

const formatRecordDate = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

const getWeatherLabel = (key) => {
  const w = store.weatherOptions.find(x => x.value === key)
  return w ? w.label : ''
}
</script>

<style lang="scss" scoped>
.create-record-view {
  max-width: 920px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.card {
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 8px;
}

.form-card { padding: 24px; }

// 其他事项/遗留问题：默认 2 行（覆盖全局 min-height:80px），可手动拖拽增高
.create-record-view .field-textarea { min-height: 56px; }

.step-panel { display: flex; flex-direction: column; gap: 16px; }

.step-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.step-counter {
  font-size: 12px;
  color: $text-muted;
  padding: 4px 10px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: 999px;
  flex-shrink: 0;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: $text-primary;
}

.step-desc {
  font-size: 13px;
  color: $text-muted;
  margin-top: 2px;
}

// ===== 表单 =====
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}

.form-stack { display: flex; flex-direction: column; gap: 16px; }

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

.field-input,
.field-textarea {
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

  &[readonly] {
    background: $bg-page;
    color: $text-secondary;
  }

  &::placeholder { color: $text-muted; }

  &:hover:not(:disabled):not([readonly]) { border-color: $border-strong; }
  &:focus {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }
}

.field-textarea {
  resize: vertical;
  line-height: 1.55;
  min-height: 80px;
  font-family: $font-body;
}

.readonly-display {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: 6px;
}

.readonly-member {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 4px 4px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $primary;
  color: $text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-info { display: flex; flex-direction: column; }
.user-name { font-size: 13px; font-weight: 500; color: $text-primary; }
.user-meta { font-size: 11px; color: $text-muted; margin-top: 1px; }

// ===== 值班日期（今天 / 昨天） =====
.date-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.date-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 12px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background: $bg-page;
    border-color: $border-strong;
  }
  &.active {
    background: $accent-soft;
    border-color: $accent;
  }
}

.date-option-label {
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;

  .date-option.active & { color: $accent; }
}

.date-option-value {
  font-size: 11px;
  color: $text-muted;
}

// ===== 天气 =====
.weather-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.weather-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  cursor: pointer;
  transition: all 120ms ease;
  color: $text-secondary;

  &:hover {
    background: $bg-page;
    border-color: $border-strong;
  }
  &.active {
    background: $accent-soft;
    border-color: $accent;
    color: $accent;
  }
}

.weather-icon { font-size: 18px; line-height: 1; }
.weather-label { font-size: 11px; }

// ===== 编辑模式：单页卡片 =====
.form-card-collapsible {
  padding: 0;
  overflow: hidden;
}

.card-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 120ms ease;

  &:hover { background: $bg-page; }
}

.card-toggle-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.led {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.led-info { background: $accent; }
  &.led-ok { background: $ok; }
  &.led-warn { background: $warn; }
}

.card-toggle-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

.card-toggle-sub {
  font-size: 12px;
  color: $text-muted;
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-toggle-arrow {
  width: 16px;
  height: 16px;
  color: $text-muted;
  transition: transform 200ms ease;
  flex-shrink: 0;
}

.card-toggle.collapsed .card-toggle-arrow { transform: rotate(-90deg); }

.card-body {
  padding: 8px 20px 20px;
  border-top: 1px solid $border-subtle;
}

.card-collapse-enter-active,
.card-collapse-leave-active { transition: opacity 180ms ease, max-height 200ms ease; overflow: hidden; }
.card-collapse-enter-from,
.card-collapse-leave-to { opacity: 0; max-height: 0; }
.card-collapse-enter-to,
.card-collapse-leave-from { opacity: 1; max-height: 4000px; }

// ===== 合并顶栏（sticky 固定在页面上方，随时可返回/保存） =====
.record-toolbar {
  position: sticky;
  top: -24px; // 取负值抵消 .layout-content 的 padding-top，使工具栏贴住滚动视口顶，内容不会从工具栏上方漏出
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -24px -40px 20px; // 抵消 .layout-content 的 padding，使工具栏铺满页面顶部并 sticky
  padding: 12px 40px;
  background: $bg-page; // 实色背景，滚动内容被完全遮挡在工具栏之下
  border-bottom: 1px solid $border-base;

  @media (min-width: 1440px) { top: -28px; margin: -28px -56px 20px; padding: 12px 56px; }
  @media (max-width: 1280px) { top: -20px; margin: -20px -28px 20px; padding: 12px 28px; }
  @media (max-width: 960px) { top: -16px; margin: -16px -20px 20px; padding: 12px 20px; }
  @media (max-width: 640px) { top: -12px; margin: -12px -14px 20px; padding: 12px 14px; }
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.toolbar-title { flex-shrink: 0; }

.toolbar-title-text {
  font-size: $fs-lg;
  font-weight: $fw-semibold;
  color: $text-primary;
  letter-spacing: $ls-tight;
  line-height: $lh-tight;
}

.toolbar-subtitle {
  margin-top: 2px;
  font-size: $fs-sm;
  color: $text-muted;
}

.toolbar-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: $text-muted;
  white-space: nowrap;
}

.toolbar-status-item { color: $text-secondary; }
.toolbar-dirty { color: $warn; }
.toolbar-summary { color: $text-secondary; }

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

// ===== 切换动画 =====
.step-enter-active,
.step-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.step-enter-from { opacity: 0; transform: translateY(4px); }
.step-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
