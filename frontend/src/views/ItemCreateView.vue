<template>
  <div class="item-create-view">
    <div v-if="loading" class="page-loading">
      <span class="page-loading-spinner"></span>
      <span>加载中...</span>
    </div>

    <div v-else-if="record" class="item-create-body">
      <PageHeader
        :eyebrow="`RECORD · ${record.id}`"
        title="添加值班事项"
        :subtitle="`${formatDate(record.recordDate)} · ${record.station}`"
      >
        <template #actions>
          <button class="btn btn-ghost" @click="handleCancel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            返回详情
          </button>
          <button
            v-if="!isLocked"
            class="btn btn-primary"
            :disabled="saving"
            @click="handleSubmit"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ saving ? '保存中...' : '保存事项' }}
          </button>
        </template>
      </PageHeader>

      <div v-if="!canEdit" class="notice-block">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="12" cy="12" r="9"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        当前记录为锁定状态或您无编辑权限，无法添加值班事项。
      </div>

      <div v-else class="card form-card">
        <div class="form-head">
          <h2 class="form-title">值班事项</h2>
          <p class="form-sub">填写本次值班的一条处理工单</p>
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="field-label">受理时间</label>
            <TimePicker v-model="form.acceptTime" :limit-to-now="acceptTimeLimitToNow" />
          </div>

          <div class="field">
            <label class="field-label">业务类型</label>
            <ComboboxInput
              v-model="form.businessType"
              :options="businessTypeOptions"
              placeholder="选择或输入..."
            />
          </div>

          <div class="field field-full">
            <label class="field-label">受理内容</label>
            <ComboboxInput
              v-model="form.content"
              :options="acceptContentOptions"
              placeholder="选择或输入..."
              @input="onContentInput"
            />
          </div>

          <div class="field">
            <label class="field-label">客户名称</label>
            <input
              v-model="form.customerName"
              type="text"
              class="field-input"
              placeholder="客户姓名"
            />
          </div>

          <div class="field">
            <label class="field-label">联系电话</label>
            <input
              v-model="form.customerPhone"
              type="tel"
              class="field-input font-mono"
              placeholder="11位手机号"
              maxlength="11"
              @input="form.customerPhone = form.customerPhone.replace(/\D/g, '')"
            />
            <span v-if="form.customerPhone && !isPhoneValid(form.customerPhone)" class="field-hint field-hint-warn">
              请输入 11 位手机号
            </span>
          </div>

          <div class="field field-full">
            <label class="field-label">联系地址</label>
            <input
              v-model="form.customerAddress"
              type="text"
              class="field-input"
              placeholder="详细地址"
            />
          </div>

          <div class="field field-full">
            <label class="field-label">办理人员</label>
            <OfficerMultiSelect v-model="form.handler" :candidates="handlerOptions" />
          </div>
        </div>

        <div class="item-divider">
          <span class="divider-text">完成信息</span>
        </div>

        <div class="form-grid">
          <div class="field field-full">
            <label class="field-label">处理结果</label>
            <ComboboxInput
              v-model="form.result"
              :options="resultOptions"
              placeholder="选择或输入处理结果..."
            />
            <span class="field-hint">选择处理结果后自动填入完成时间，即视为该事项已完成</span>
          </div>

          <div class="field field-full">
            <label class="field-label">完成时间</label>
            <TimePicker v-model="form.endTime" :limit-to-now="acceptTimeLimitToNow" />
          </div>

          <div class="field field-full">
            <label class="field-label">客户满意</label>
            <button
              type="button"
              class="satisfied-toggle"
              :class="{ selected: form.customerSatisfied, disabled: !form.isCompleted }"
              :disabled="!form.isCompleted"
              @click="toggleSatisfied"
              :title="form.isCompleted ? (form.customerSatisfied ? '取消客户满意标签' : '标记为客户满意') : '请先选择处理结果（标记完成）'"
            >
              <span class="satisfied-icon">
                <svg v-if="form.customerSatisfied" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </span>
              <span class="satisfied-text">
                {{ form.isCompleted
                    ? (form.customerSatisfied ? '客户满意' : '标记为客户满意')
                    : '选择处理结果后自动标记完成' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="page-loading">
      <span class="text-muted">{{ loadError || '记录不存在或已删除' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import PageHeader from '@/components/PageHeader.vue'
import ComboboxInput from '@/components/ComboboxInput.vue'
import TimePicker from '@/components/TimePicker.vue'
import OfficerMultiSelect from '@/components/OfficerMultiSelect.vue'
import { getCurrentTime, getCurrentDateISO } from '@/data/mockData'
import { toMinutes, getNowHM } from '@/utils/orderTimeout'
import { useToast } from '@/composables/useToast'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const recordId = computed(() => Number(route.params.recordId))
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const record = ref(null)

// 新增值班事项：所有值班员/所长/管理员均可（不限记录创建人）；锁定记录仅超管；区县管理员无权
const canEdit = computed(() => !!record.value && store.canAddItemToRecord(record.value))
// 锁定记录仅超级管理员可编辑
const isLocked = computed(() =>
  !!record.value && record.value.status === 'locked' && store.user.role !== 'admin'
)

// 字典选项（与 DutyItemsEditor 同源；兼容对象数组 {label} 与字符串数组两种后端返回）
const EXCLUDED_BUSINESS_TYPES = ['新装业务']
const dictLabels = (arr) => (arr || []).map(d => typeof d === 'string' ? d : (d?.label ?? '')).filter(Boolean)
const businessTypeOptions = computed(() =>
  dictLabels(store.dictionaries.businessTypes).filter(l => !EXCLUDED_BUSINESS_TYPES.includes(l))
)
const acceptContentOptions = computed(() => dictLabels(store.dictionaries.acceptContents))
const resultOptions = computed(() => dictLabels(store.dictionaries.results))
// 办理人员候选：按记录所属供电所拉取该所值班员（避免列出全库人员）
const handlerOptions = ref([])

const acceptTimeLimitToNow = computed(() => record.value?.recordDate === getCurrentDateISO())

const form = reactive({
  acceptTime: '',
  businessType: '',
  content: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  handler: '',
  endTime: '',
  result: '',
  isCompleted: false,
  customerSatisfied: false
})

const isPhoneValid = (phone) => /^1[3-9]\d{9}$/.test(phone)

// 受理内容输入时自动补受理时间
const onContentInput = () => {
  if (form.content && !form.acceptTime) form.acceptTime = getCurrentTime()
}

// 选择处理结果即视为完成：自动填完成时间、标记完成
watch(() => form.result, (val) => {
  if (val && val.trim()) {
    form.isCompleted = true
    if (!form.endTime) form.endTime = getCurrentTime()
  }
})

const toggleSatisfied = () => {
  if (!form.isCompleted) return
  form.customerSatisfied = !form.customerSatisfied
}

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

onMounted(async () => {
  // 确保字典可用：若从未加载或已加载但业务类型为空（如之前加载失败），强制刷新并等待，
  // 保证下拉选项在表单渲染前已就绪
  if (!store.dictionariesLoaded || !store.dictionaries.businessTypes.length) {
    await store.fetchDictionaries(true).catch(() => {})
  }
  try {
    const r = await store.fetchRecordById(recordId.value)
    record.value = r
    if (!r) {
      loadError.value = '记录不存在或已被删除'
    } else {
      // 办理人员候选：按记录所属供电所拉取该所值班员（避免列出全库人员）
      const stationId = r.stationId ?? store.currentStationId
      if (stationId) {
        const officers = await store.fetchOfficersByStation(stationId)
        handlerOptions.value = officers.map(o => o.label)
      }
      // 默认受理时间 = 当前时刻；办理人员默认当前登录用户（admin 除外，留空选填）
      form.acceptTime = getCurrentTime()
      form.handler = store.user.role !== 'admin' ? store.user.realName : ''
    }
  } catch (e) {
    loadError.value = `记录加载失败：${e.message || '请检查记录编号'}`.slice(0, 60)
    toast.error(e.message || '记录加载失败')
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  if (!canEdit.value) {
    toast.error('当前记录不可编辑')
    return
  }
  // 受理时间不允许晚于当前时刻（当天记录）
  if (record.value.recordDate === getCurrentDateISO()) {
    const nowMin = toMinutes(getNowHM())
    if (form.acceptTime && toMinutes(form.acceptTime) > nowMin) {
      toast.error('受理时间晚于当前时间，请修正后再保存', '时间错误')
      return
    }
  }

  const payload = {
    acceptTime: form.acceptTime || null,
    businessType: form.businessType,
    content: form.content,
    customerName: form.customerName || null,
    customerPhone: form.customerPhone || null,
    customerAddress: form.customerAddress || null,
    handler: form.handler || null,
    endTime: form.endTime || null,
    result: form.result || '',
    isCompleted: form.isCompleted,
    customerSatisfied: form.customerSatisfied
  }

  saving.value = true
  try {
    await store.addDutyItem(recordId.value, payload)
    toast.success('值班事项已添加')
    router.push(`/records/${recordId.value}`)
  } catch (e) {
    toast.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleCancel = async () => {
  router.push(`/records/${recordId.value}`)
}
</script>

<style lang="scss" scoped>
.item-create-view { padding-bottom: 40px; }
.item-create-body { max-width: 860px; margin: 0 auto; }

.page-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 80px 0;
  color: $text-muted;
}
.page-loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid $border-base;
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.notice-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: $warn-soft;
  border: 1px solid $warn-border;
  border-radius: 8px;
  color: $warn;
  font-size: 13px;
  svg { width: 18px; height: 18px; flex-shrink: 0; }
}

.card {
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 8px;
}
.form-card { padding: 24px; }
.form-head { margin-bottom: 20px; }
.form-title { font-size: 15px; font-weight: 600; color: $text-primary; }
.form-sub { font-size: 12px; color: $text-muted; margin-top: 3px; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.field-full { grid-column: 1 / -1; }

.item-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 18px;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $border-subtle;
  }
}
.divider-text {
  font-size: 12px;
  font-weight: 600;
  color: $text-muted;
}

.satisfied-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: 8px;
  cursor: pointer;
  transition: all 120ms ease;
  color: $text-secondary;
  &.selected {
    background: $ok-soft;
    border-color: $ok-border;
    color: $ok;
  }
  &.disabled { opacity: 0.6; cursor: not-allowed; }
  .satisfied-icon { display: flex; svg { width: 18px; height: 18px; } }
  .satisfied-text { font-size: 13px; }
}

@media (max-width: 720px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
