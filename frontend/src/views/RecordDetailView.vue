<template>
  <div class="record-detail-root">
  <div v-if="loading" class="record-loading">
    <span class="record-loading-spinner"></span>
    <span>加载中...</span>
  </div>

  <div v-else-if="record" class="record-detail-view">
    <PageHeader
      :eyebrow="`RECORD · ${record.id}`"
      :title="formatDate(record.recordDate) + ' 值班记录'"
      :subtitle="record.station"
    >
      <template #actions>
        <button class="btn btn-ghost" @click="$router.push('/records')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          返回列表
        </button>
        <button v-if="store.canExport" class="btn btn-secondary" @click="handleExport">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出 Excel
        </button>
        <button
          v-if="store.canEditRecordFor(record)"
          class="btn btn-primary"
          @click="$router.push(`/records/${record.id}/edit`)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          编辑
        </button>
        <button
          v-if="record.status === 'active' && record.completedCount === record.itemCount && store.canLock"
          class="btn btn-amber"
          @click="handleLock"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          锁定记录
        </button>
      </template>
    </PageHeader>

    <div class="detail-container">
      <!-- 顶部信息卡 -->
      <div class="overview-card">
        <div class="overview-bg"></div>
        <div class="overview-content">
          <div class="overview-left">
            <div class="date-block">
              <div class="date-day font-display">{{ formatDay(record.recordDate) }}</div>
              <div class="date-ym font-mono">{{ formatYM(record.recordDate) }}</div>
              <div class="date-weekday">{{ getWeekday(record.recordDate) }}</div>
            </div>
            <div class="overview-info">
              <div class="info-row">
                <span class="info-label">天气</span>
                <span class="info-value">
                  <span class="weather-emoji" :style="{ color: getWeatherColor(record.weather) }">
                    {{ getWeatherIcon(record.weather) }}
                  </span>
                  <span>{{ record.weatherLabel }}</span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">值班员</span>
                <span class="info-value">
                  <div v-if="officerText(record)" class="user-avatar-mini">{{ officerText(record).charAt(0) }}</div>
                  <span>{{ officerText(record) }}</span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">状态</span>
                <span class="info-value">
                  <StatusBadge
                    :label="store.recordDisplayStatus(record).label"
                    :variant="store.recordDisplayStatus(record).variant"
                  />
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">创建时间</span>
                <span class="info-value font-mono">{{ formatDateTime(record.createdAt) }}</span>
              </div>
              <div v-if="record.lockedAt" class="info-row">
                <span class="info-label">锁定时间</span>
                <span class="info-value font-mono">{{ formatDateTime(record.lockedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="overview-right">
            <div class="stat-circle">
              <svg viewBox="0 0 120 120" class="circle-svg">
                <circle cx="60" cy="60" r="50" class="circle-bg"/>
                <circle
                  cx="60" cy="60" r="50"
                  class="circle-progress"
                  :stroke-dasharray="circleCircumference"
                  :stroke-dashoffset="circleDashOffset"
                />
              </svg>
              <div class="circle-content">
                <div class="circle-value font-display">{{ progressPercent }}<span>%</span></div>
                <div class="circle-label font-mono">完成度</div>
              </div>
            </div>
            <div class="stat-side">
              <div class="stat-mini">
                <div class="stat-mini-label">已完成</div>
                <div class="stat-mini-value text-ok font-display">{{ record.completedCount }}</div>
              </div>
              <div class="stat-mini">
                <div class="stat-mini-label">总事项</div>
                <div class="stat-mini-value font-display">{{ record.itemCount }}</div>
              </div>
              <div class="stat-mini">
                <div class="stat-mini-label">遗留问题</div>
                <div class="stat-mini-value text-warn font-display">{{ record.hasPending ? '有' : '无' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 时间线 -->
      <div class="section-panel">
        <div class="section-header">
          <div class="section-title">
            <i class="led led-info"></i>
            <span>值班事项</span>
            <span class="section-count font-mono">{{ record.dutyItems.filter(i => i.content).length }} 项</span>
          </div>
        </div>
        <div class="section-body">
          <div class="timeline">
            <div class="timeline-line"></div>
            <div
              v-for="(item, idx) in validItems"
              :key="item.id"
              class="timeline-item"
              :class="{ done: item.isCompleted, clickable: true }"
              @click="openItemDetail(item, idx)"
            >
              <div class="timeline-marker">
                <svg v-if="item.isCompleted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span v-else class="font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>
              </div>
              <div class="timeline-content">
                <div class="timeline-text">{{ item.content }}</div>
                <div class="timeline-meta" @click.stop>
                  <div class="time-block">
                    <span class="time-block-label font-mono">受理</span>
                    <span class="time-block-value font-mono">{{ item.acceptTime || '--:--' }}</span>
                  </div>
                  <div class="time-arrow">→</div>
                  <div class="time-block">
                    <span class="time-block-label font-mono">完成</span>
                    <span class="time-block-value font-mono">{{ item.endTime || '--:--' }}</span>
                  </div>
                  <div v-if="item.acceptTime && item.endTime" class="time-duration font-mono">
                    耗时 {{ calcDuration(item.acceptTime, item.endTime) }}
                    <span v-if="itemTimeout(item)?.state === 'completed_overdue'" class="timeout-badge crit">{{ itemTimeout(item).label }}</span>
                  </div>
                  <span v-if="!item.isCompleted && itemTimeout(item)?.state === 'warning'" class="timeout-badge warn">{{ itemTimeout(item).label }}</span>
                  <span v-else-if="!item.isCompleted && itemTimeout(item)?.state === 'overdue'" class="timeout-badge crit">已超时</span>
                  <button
                    v-if="!item.isCompleted && item.result && store.canEditRecordFor(record)"
                    class="btn btn-mini btn-mini-success"
                    @click.stop="handleCompleteItem(item)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    标记完成
                  </button>
                </div>
              </div>
              <span class="item-chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 6 15 12 9 18"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 其他事项 -->
      <div v-if="record.otherMatters" class="section-panel">
        <div class="section-header">
          <div class="section-title">
            <i class="led led-warn"></i>
            <span>其他事项</span>
          </div>
        </div>
        <div class="section-body">
          <div class="text-content">{{ record.otherMatters }}</div>
        </div>
      </div>

      <!-- 遗留问题（逐条确认解决） -->
      <div v-if="record.pendingIssues && record.pendingIssues.length" class="section-panel pending-section">
        <div class="section-header">
          <div class="section-title">
            <i class="led led-warn"></i>
            <span>遗留问题</span>
            <span v-if="hasUnresolved" class="tag tag-warn">需跟进</span>
            <span v-else class="tag tag-ok">已全部解决</span>
          </div>
        </div>
        <div class="section-body">
          <div class="pending-list">
            <div
              v-for="(p, idx) in record.pendingIssues"
              :key="p.id"
              class="pending-item"
              :class="{ resolved: p.isResolved }"
            >
              <span class="pending-mark" :class="{ done: p.isResolved }">
                <svg v-if="p.isResolved" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span v-else class="font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>
              </span>
              <div class="pending-content">
                <div class="pending-text">{{ p.content }}</div>
                <div v-if="p.isResolved" class="pending-resolved-meta">
                  已由 <strong>{{ p.resolvedByName || '—' }}</strong> 确认解决 · {{ formatDateTime(p.resolvedAt) }}
                </div>
              </div>
              <button
                v-if="!p.isResolved && store.canEditRecordFor(record)"
                class="btn btn-mini btn-mini-success"
                @click="handleResolvePending(p)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                确认解决
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作日志 -->
      <div class="section-panel">
        <div class="section-header">
          <div class="section-title">
            <i class="led led-info"></i>
            <span>操作日志</span>
          </div>
        </div>
        <div class="section-body">
          <div class="log-list">
            <div class="log-item">
              <i class="led led-info"></i>
              <div class="log-content">
                <span class="log-text">
                  <strong>{{ record.creator }}</strong> 创建了值班记录
                </span>
                <span class="log-time font-mono">{{ formatDateTime(record.createdAt) }}</span>
              </div>
            </div>
            <div v-if="record.lockedAt" class="log-item">
              <i class="led led-warn"></i>
              <div class="log-content">
                <span class="log-text">
                  <strong>{{ record.creator }}</strong> 锁定了值班记录
                </span>
                <span class="log-time font-mono">{{ formatDateTime(record.lockedAt) }}</span>
              </div>
            </div>
            <div v-for="item in record.dutyItems.filter(i => i.isCompleted)" :key="`log-${item.id}`" class="log-item">
              <i class="led led-ok"></i>
              <div class="log-content">
                <span class="log-text">
                  <strong>{{ record.creator }}</strong> 完成了「{{ item.content }}」
                </span>
                <span class="log-time font-mono">{{ item.endTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="not-found">
    <div class="not-found-icon">⚠</div>
    <div class="not-found-text">记录不存在或已被删除</div>
    <button class="btn btn-primary" @click="$router.push('/records')">返回列表</button>
  </div>

  <!-- 工单详情抽屉 -->
  <transition name="drawer-fade">
    <div v-if="detailItem" class="drawer-overlay" @click.self="closeItemDetail">
      <transition name="drawer" appear>
        <aside v-if="detailItem" class="drawer" role="dialog" aria-modal="true">
          <div class="drawer-header">
            <div class="drawer-title-wrap">
              <span class="drawer-eyebrow">值班事项 #{{ detailIndex + 1 }}</span>
              <h2 class="drawer-title">{{ detailItem.businessType || '工单详情' }}</h2>
            </div>
            <button class="drawer-close" @click="closeItemDetail" type="button" aria-label="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="drawer-body">
            <div class="status-banner" :class="detailItem.isCompleted ? 'is-done' : 'is-active'">
              <i class="status-dot" :class="detailItem.isCompleted ? 'status-dot-ok' : 'status-dot-info'"></i>
              <span class="status-text">
                {{ detailItem.isCompleted ? `已完成 · 耗时 ${calcDuration(detailItem.acceptTime, detailItem.endTime)}` : '进行中' }}
              </span>
              <span v-if="detailItem.acceptTime || detailItem.endTime" class="status-time font-mono">
                {{ detailItem.acceptTime || '--:--' }} → {{ detailItem.endTime || '--:--' }}
              </span>
              <span v-if="!detailItem.isCompleted && itemTimeout(detailItem)?.state === 'warning'" class="timeout-badge warn">{{ itemTimeout(detailItem).label }}</span>
              <span v-else-if="!detailItem.isCompleted && itemTimeout(detailItem)?.state === 'overdue'" class="timeout-badge crit">已超时</span>
              <span v-else-if="detailItem.isCompleted && itemTimeout(detailItem)?.state === 'completed_overdue'" class="timeout-badge crit">{{ itemTimeout(detailItem).label }}</span>
            </div>

            <div class="detail-fields">
              <div class="field-row">
                <span class="field-name">受理内容</span>
                <span class="field-value">{{ detailItem.content || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-name">业务类型</span>
                <span class="field-value">{{ detailItem.businessType || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-name">客户名称</span>
                <span class="field-value">{{ detailItem.customerName || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-name">联系电话</span>
                <span class="field-value font-mono">{{ detailItem.customerPhone || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-name">联系地址</span>
                <span class="field-value">{{ detailItem.customerAddress || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-name">办理人员</span>
                <span class="field-value">{{ detailItem.handler || '—' }}</span>
              </div>
              <div class="field-row field-row-full">
                <span class="field-name">处理结果</span>
                <ComboboxInput
                  v-if="!detailItem.isCompleted && store.canEditRecordFor(record)"
                  v-model="detailItem.result"
                  :options="resultOptions"
                  placeholder="选择或输入处理结果..."
                />
                <span v-else class="field-value">{{ detailItem.result || '—' }}</span>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            <button class="btn btn-ghost" @click="closeItemDetail">关闭</button>
            <button
              v-if="!detailItem.isCompleted && record && store.canEditRecordFor(record)"
              class="btn btn-primary"
              @click="handleCompleteItem(detailItem); closeItemDetail()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              标记完成
            </button>
            <button
              v-if="record && store.canEditRecordFor(record)"
              class="btn btn-secondary"
              @click="goEditFromDrawer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              编辑
            </button>
          </div>
        </aside>
      </transition>
    </div>
  </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ComboboxInput from '@/components/ComboboxInput.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { getCurrentTime } from '@/data/mockData'
import { getItemTimeoutState } from '@/utils/orderTimeout'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const toast = useToast()
const confirm = useConfirm()

const record = computed(() => store.getRecordById(route.params.id))

// 工单超时状态（统一口径见 utils/orderTimeout.js）
const itemTimeout = (item) => record.value
  ? getItemTimeoutState(item, record.value.recordDate, store.currentStationOrderTimeLimit)
  : null

// 加载状态：初始为 true，刷新/进入页面时先显示加载中，避免误报"记录不存在"
const loading = ref(true)

// 值班员：优先显示当天排班名单，未配置排班时回退创建人
const officerText = (r) => (r?.dutyOfficers && r.dutyOfficers.length)
  ? r.dutyOfficers.join(' / ')
  : (r?.creator || '—')

// 有效工单：有内容的（与下方"值班事项 4 项"对应）
const validItems = computed(() => {
  if (!record.value || !record.value.dutyItems) return []
  return record.value.dutyItems.filter(i => i.content)
})
const validItemCount = computed(() => validItems.value.length)
const validCompletedCount = computed(() => validItems.value.filter(i => i.isCompleted).length)

const completionRate = computed(() => {
  if (!validItemCount.value) return 0
  return Math.round((validCompletedCount.value / validItemCount.value) * 100)
})

const circleCircumference = 2 * Math.PI * 50
const progressPercent = computed(() => completionRate.value)
const circleDashOffset = computed(() => circleCircumference * (1 - progressPercent.value / 100))

const formatDay = (date) => date.split('-')[2]
const formatYM = (date) => {
  const [y, m] = date.split('-')
  return `${y}.${m}`
}
const formatDate = (date) => {
  const [y, m, d] = date.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}
const getWeekday = (date) => {
  const d = new Date(date)
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[d.getDay()]
}

// 头像字符：取真实姓名的最后一个字；英文取首字母大写
const avatarChar = computed(() => {
  const name = (record.value?.creator || '').trim()
  if (!name) return '?'
  // 中文姓名：取最后一个汉字
  const last = name.slice(-1)
  // 英文：取第一个字母并大写
  if (/^[A-Za-z]/.test(name)) return name.charAt(0).toUpperCase()
  return last
})

// 格式化时间戳为 yyyy-MM-dd HH:mm:ss
const formatDateTime = (v) => {
  if (!v) return '-'
  // 已经是 yyyy-MM-dd HH:mm:ss 格式
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) return v
  // ISO 字符串（带 T 和毫秒 / 时区）：转 local 时间
  if (typeof v === 'string' && v.includes('T')) {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return v
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  // 空格分隔的日期时间
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} /.test(v)) {
    return v.slice(0, 19)
  }
  return v
}

const getWeatherColor = (key) => {
  const w = store.weatherOptions.find(x => x.value === key)
  return w ? w.color : '#94a3b8'
}
const getWeatherIcon = (key) => {
  const w = store.weatherOptions.find(x => x.value === key)
  return w ? w.icon : '?'
}

const calcDuration = (start, end) => {
  if (!start || !end) return '0 分钟'
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (Number.isNaN(sh) || Number.isNaN(eh)) return '0 分钟'
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 60) return `${mins} 分钟`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} 小时` : `${h}小时 ${m}分`
}

const handleLock = async () => {
  const ok = await confirm.open({
    title: '锁定记录',
    message: `确认锁定 ${record.value.recordDate} 的值班记录？锁定后无法再修改。`,
    confirmText: '锁定',
    type: 'danger'
  })
  if (!ok) return
  try {
    await store.lockRecord(record.value.id)
    toast.success('记录已锁定')
  } catch (e) {
    toast.error(e.message || '锁定失败')
  }
}

// 是否存在未解决的遗留问题（区块 tag 切换：需跟进 / 已全部解决）
const hasUnresolved = computed(() => {
  const list = record.value?.pendingIssues || []
  return list.some(p => !p.isResolved)
})

const handleResolvePending = async (p) => {
  const ok = await confirm.open({
    title: '确认解决',
    message: `确认该遗留问题已解决？\n${p.content}`,
    confirmText: '确认解决',
    type: 'success'
  })
  if (!ok) return
  try {
    await store.resolvePendingIssue(record.value.id, p.id)
    toast.success('遗留问题已确认解决')
  } catch (e) {
    toast.error(e.message || '操作失败')
  }
}

const handleExport = async () => {
  const id = record.value.id
  toast.info('正在准备 Excel 文件...', '导出中')
  try {
    // 月度导出 - 找该月
    const ym = record.value.recordDate.split('-')
    const res = await store.createExport({
      year: Number(ym[0]),
      month: Number(ym[1]),
      stationId: store.currentStationId,
      includeTemplate: true,
      mergeSheets: false
    })
    toast.success('Excel 文件已生成', '导出成功')
    // 触发下载（axios 携带 token）
    if (res && res.id) {
      await store.downloadExport(res.id, res.fileName)
    }
  } catch (e) {
    toast.error(e.message || '导出失败')
  }
}

// 处理结果字典选项
const resultOptions = computed(() => store.dictionaries.results.map(d => d.label))

const handleCompleteItem = async (item) => {
  if (item.isCompleted) return
  const result = (item.result || '').trim()
  if (!result) {
    toast.error('请先选择处理结果')
    return
  }
  try {
    await store.updateItem(record.value.id, item.id, {
      result,
      isCompleted: true,
      endTime: getCurrentTime()
    })
    toast.success('工单已标记完成')
  } catch (e) {
    toast.error(e.message || '操作失败')
  }
}

// 工单详情抽屉
const detailItem = ref(null)
const detailIndex = ref(0)

const openItemDetail = (item, idx) => {
  detailItem.value = item
  detailIndex.value = idx
}

const closeItemDetail = () => {
  detailItem.value = null
}

const goEditFromDrawer = () => {
  if (!record.value) return
  const id = record.value.id
  closeItemDetail()
  router.push(`/records/${id}/edit`)
}

// 进入页面：拉最新详情
const loadDetail = async () => {
  loading.value = true
  try {
    await store.fetchRecordById(route.params.id)
  } catch (e) {
    toast.error(e.message || '记录加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetail()
})

// 路由变化（编辑后返回）刷新；导航离开时 id 变 undefined 则跳过
watch(() => route.params.id, (id) => { if (id) loadDetail() })
</script>

<style lang="scss" scoped>
.record-detail-root { display: contents; }
.record-detail-view {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.detail-container {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

// ===== 总览卡 =====
.overview-card {
  position: relative;
  background: $bg-base;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  overflow: hidden;
  margin-bottom: $space-4;
}

.overview-bg {
  position: absolute;
  top: -100px;
  right: -100px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.overview-content {
  position: relative;
  display: flex;
  gap: $space-6;
  padding: $space-5;
}

.overview-left {
  flex: 1;
  display: flex;
  gap: $space-6;
}

.date-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-3 $space-4;
  background: $bg-elevated;
  border: 1px solid $border-accent;
  border-radius: $radius-md;
  box-shadow: 0 0 16px rgba(0, 212, 255, 0.1);
  align-self: flex-start;
}

.date-day {
  font-size: 56px;
  font-weight: $fw-bold;
  color: $primary;
  line-height: 1;
  letter-spacing: $ls-tight;
  text-shadow: 0 0 24px $primary-glow;
}

.date-ym {
  font-size: 11px;
  color: $text-muted;
  letter-spacing: $ls-wide;
  margin-top: $space-1;
}

.date-weekday {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: $space-2;
  padding-top: $space-2;
  border-top: 1px solid $border-subtle;
  width: 100%;
  text-align: center;
}

.overview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  justify-content: center;
}

.info-row {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-2 0;
  border-bottom: 1px dashed $border-subtle;

  &:last-child { border-bottom: none; }
}

.info-label {
  font-family: $font-mono;
  font-size: 10px;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-muted;
  width: 80px;
  flex-shrink: 0;
}

.info-value {
  display: flex;
  align-items: center;
  gap: $space-2;
  color: $text-primary;
  font-weight: $fw-medium;
  font-size: $fs-sm;
}

.user-avatar-mini {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary, $accent-violet);
  color: $text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-xs;
  font-weight: $fw-bold;
}

.weather-emoji { font-size: $fs-lg; }

.overview-right {
  display: flex;
  align-items: center;
  gap: $space-5;
  flex-shrink: 0;
}

.stat-circle {
  position: relative;
  width: 140px;
  height: 140px;
}

.circle-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.circle-bg {
  fill: none;
  stroke: $border-subtle;
  stroke-width: 6;
}

.circle-progress {
  fill: none;
  stroke: $primary;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset $duration-slower $ease-out;
  filter: drop-shadow(0 0 8px $primary-glow);
}

.circle-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.circle-value {
  font-size: 36px;
  font-weight: $fw-bold;
  color: $text-primary;
  line-height: 1;
  letter-spacing: $ls-tight;

  span { font-size: $fs-md; color: $text-muted; margin-left: 2px; }
}

.circle-label {
  font-size: 10px;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-muted;
  margin-top: $space-1;
}

.stat-side {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  min-width: 120px;
}

.stat-mini {
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
}

.stat-mini-label {
  font-family: $font-mono;
  font-size: 9px;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-muted;
  margin-bottom: 2px;
}

.stat-mini-value {
  font-size: $fs-lg;
  font-weight: $fw-bold;
  color: $text-primary;
  line-height: 1;
}

// ===== 节区 =====
.section-panel {
  background: $bg-base;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-5;
  border-bottom: 1px solid $border-subtle;
  background: linear-gradient(180deg, rgba(0, 212, 255, 0.03), transparent);
}

.section-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-family: $font-display;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
  letter-spacing: $ls-wider;
  text-transform: uppercase;
  color: $text-primary;
}

.section-count {
  font-size: $fs-xs;
  color: $text-muted;
  letter-spacing: $ls-wide;
  margin-left: $space-2;
}

.section-body { padding: $space-5; }

// ===== 时间线 =====
.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline-line {
  position: absolute;
  // 容器 padding-left=32，marker 宽 24，marker 中心 = 32 - 12 = 20
  left: 20px;
  top: 24px;
  bottom: 24px;
  width: 1px;
  background: linear-gradient(180deg, $primary, transparent);
  transform: translateX(-0.5px);
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: $space-4;
  padding: $space-3;
  margin: 0 (-$space-3);
  border-radius: $radius-base;
  position: relative;
  cursor: pointer;
  transition: background $duration-fast $ease-out;

  &:hover {
    background: $bg-hover;
  }

  &.done .timeline-marker {
    background: $ok-soft;
    border-color: $ok;
    color: $ok;
  }
}

.item-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: $text-faint;
  flex-shrink: 0;
  margin-top: 4px;
  transition: color $duration-fast $ease-out, transform $duration-fast $ease-out;

  svg { width: 14px; height: 14px; }
}

.timeline-item:hover .item-chevron {
  color: $text-secondary;
  transform: translateX(2px);
}

.timeline-marker {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: $bg-elevated;
  border: 2px solid $border-base;
  color: $text-muted;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: $fw-bold;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: all $duration-base $ease-out;
  // 与 timeline-line 中心对齐：marker 中心 12px + 容器 padding-left 13px = 25px
  margin-left: -25px;
  // SVG/span 居中
  line-height: 0;

  svg {
    width: 12px;
    height: 12px;
    display: block;
  }
  span { line-height: 1; }
}

.timeline-content {
  flex: 1;
  padding-top: 2px;
}

.timeline-text {
  font-size: $fs-base;
  color: $text-primary;
  line-height: $lh-base;
  margin-bottom: $space-2;
}

.timeline-item.done .timeline-text {
  color: $text-secondary;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  width: fit-content;
}

.time-block {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-block-label {
  font-size: 10px;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-muted;
}

.time-block-value {
  font-size: $fs-sm;
  color: $text-primary;
  font-weight: $fw-medium;
}

.time-arrow { color: $text-muted; font-family: $font-mono; }

.time-duration {
  margin-left: auto;
  padding: 2px $space-2;
  background: $primary-soft;
  color: $primary;
  border-radius: $radius-sm;
  font-size: 10px;
  letter-spacing: $ls-wide;
}

// ===== 工单超时徽标 =====
.timeout-badge {
  display: inline-block;
  padding: 2px $space-2;
  border-radius: $radius-sm;
  font-size: 10px;
  letter-spacing: $ls-wide;
  white-space: nowrap;
  vertical-align: middle;
  margin-left: 4px;

  &.warn {
    background: $warn-soft;
    color: $warn;
  }

  &.crit {
    background: $crit-soft;
    color: $crit;
  }
}

// ===== 文本内容 =====
.text-content {
  font-size: $fs-base;
  line-height: $lh-loose;
  color: $text-primary;
  white-space: pre-wrap;
  word-break: break-word;
}

.pending-section {
  border-color: rgba(255, 184, 0, 0.3);
  background: linear-gradient(135deg, $bg-base 0%, rgba(255, 184, 0, 0.03) 100%);
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.pending-item {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-3;
  background: $bg-elevated;
  border: 1px solid $border-subtle;
  border-radius: $radius-base;

  &.resolved {
    opacity: 0.75;
    background: $bg-base;
  }
}

.pending-mark {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: $warn-soft;
  border: 2px solid $warn-border;
  color: $warn;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: $fw-bold;
  flex-shrink: 0;
  line-height: 0;

  svg { width: 12px; height: 12px; display: block; }
  span { line-height: 1; }

  &.done {
    background: $ok-soft;
    border-color: $ok;
    color: $ok;
  }
}

.pending-content {
  flex: 1;
  min-width: 0;
}

.pending-text {
  font-size: $fs-base;
  color: $text-primary;
  line-height: $lh-base;
  white-space: pre-wrap;
  word-break: break-word;
}

.pending-resolved-meta {
  margin-top: $space-1;
  font-size: $fs-xs;
  color: $text-muted;

  strong { color: $ok; font-weight: $fw-semibold; }
}

// ===== 日志 =====
.log-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.log-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  font-size: $fs-sm;
}

.log-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
}

.log-text {
  color: $text-secondary;

  strong { color: $text-primary; }
}

.log-time {
  font-size: 10px;
  color: $text-muted;
  flex-shrink: 0;
}

// ===== Not Found =====
.record-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 0;
  color: $text-muted;
  font-size: 13px;
}

.record-loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid $border-base;
  border-top-color: $accent;
  border-radius: 50%;
  animation: record-spin 800ms linear infinite;
}

@keyframes record-spin {
  to { transform: rotate(360deg); }
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-20;
  gap: $space-4;
}

.not-found-icon {
  font-size: 64px;
  color: $accent-amber;
  opacity: 0.6;
}

.not-found-text {
  font-size: $fs-lg;
  color: $text-secondary;
}

// ===== 抽屉 Drawer =====
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: 100%;
  max-width: 460px;
  height: 100%;
  background: $bg-elevated;
  display: flex;
  flex-direction: column;
  box-shadow: -16px 0 32px rgba(15, 23, 42, 0.08);
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid $border-subtle;
  flex-shrink: 0;
}

.drawer-title-wrap {
  flex: 1;
  min-width: 0;
}

.drawer-eyebrow {
  display: block;
  font-size: 11px;
  font-weight: $fw-medium;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: $ls-wider;
  margin-bottom: 4px;
}

.drawer-title {
  font-size: 16px;
  font-weight: $fw-semibold;
  color: $text-primary;
  line-height: 1.3;
  word-break: break-word;
}

.drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid $border-base;
  border-radius: 6px;
  color: $text-muted;
  cursor: pointer;
  transition: all 120ms ease;
  flex-shrink: 0;

  svg { width: 14px; height: 14px; }

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: $radius-base;
  margin-bottom: 20px;
  font-size: 12px;

  &.is-done {
    background: $ok-soft;
    color: $ok;
    border: 1px solid $ok-border;
  }
  &.is-active {
    background: $accent-soft;
    color: $accent;
    border: 1px solid $accent-border;
  }
}

.status-text {
  font-weight: $fw-medium;
  flex: 1;
}

.status-time {
  color: $text-secondary;
}

.detail-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.field-row-full {
  grid-column: 1 / -1;
}

.field-name {
  font-size: 11px;
  font-weight: $fw-medium;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: $ls-wider;
}

.field-value {
  font-size: 13px;
  color: $text-primary;
  line-height: 1.5;
  word-break: break-word;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid $border-subtle;
  background: $bg-page;
  flex-shrink: 0;
}

// ---- 抽屉动画 ----
.drawer-fade-enter-active,
.drawer-fade-leave-active { transition: opacity 240ms ease; }
.drawer-fade-enter-from,
.drawer-fade-leave-to { opacity: 0; }

.drawer-enter-active,
.drawer-leave-active { transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1); }
.drawer-enter-from,
.drawer-leave-to { transform: translateX(100%); }
</style>
