<template>
  <div class="dashboard-view">
    <!-- 欢迎条 -->
    <div class="welcome">
      <div class="welcome-text">
        <h1 class="welcome-title">下午好，{{ store.user.realName }}</h1>
        <p class="welcome-sub">{{ store.systemConfig.stationName }} · {{ store.user.roleName }} · {{ greetingText }}</p>
      </div>
      <div class="welcome-action">
        <button class="btn btn-secondary" @click="refreshData" :disabled="refreshing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" :class="{ spinning: refreshing }">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
            <polyline points="21 3 21 8 16 8"/>
          </svg>
          {{ refreshing ? '刷新中...' : '刷新数据' }}
        </button>
        <button v-if="store.canCreateRecord" class="btn btn-primary" @click="$router.push('/records/create')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建值班记录
        </button>
      </div>
    </div>

    <!-- 时间范围筛选 -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button
          v-for="t in tabs"
          :key="t.value"
          class="filter-tab"
          :class="{ active: range === t.value }"
          @click="range = t.value"
        >{{ t.label }}</button>
      </div>
      <div class="filter-meta">
        <span class="filter-label">统计区间</span>
        <span class="filter-value font-mono">{{ rangeMeta }}</span>
      </div>
    </div>

    <!-- 关键统计 -->
    <div class="stats-row">
      <StatCard label="接单总数" :value="metrics.total" unit="项" />
      <StatCard label="已完成" :value="metrics.done" unit="项" />
      <StatCard label="完成率" :value="metrics.completion" unit="%" />
      <StatCard label="超时工单" :value="metrics.overdue" unit="项" :sub="`${metrics.overdueRate}%`" />
    </div>

    <!-- 主体两栏 -->
    <div class="main-grid">
      <!-- 今日值班 -->
      <div class="card panel-today">
        <div class="card-header">
          <h2 class="card-title">今日值班</h2>
          <button v-if="activeRecord" class="btn btn-link" @click="$router.push(`/records/${activeRecord.id}`)">
            查看详情 →
          </button>
        </div>
        <div class="card-body">
          <div v-if="activeRecord" class="today-record">
            <div class="today-meta">
              <div class="meta-item">
                <span class="meta-label">值班员</span>
                <span class="meta-value">{{ officerText(activeRecord) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">日期</span>
                <span class="meta-value font-mono">{{ activeRecord.recordDate }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">天气</span>
                <span class="meta-value">{{ activeRecord.weatherLabel }}</span>
              </div>
            </div>

            <div class="progress-block">
              <div class="progress-label">
                <span>完成进度</span>
                <span class="progress-num font-mono">
                  <span class="text-ok">{{ activeRecord.completedCount }}</span>
                  <span class="text-muted">/ {{ activeRecord.itemCount }}</span>
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: recordProgress + '%' }"></div>
              </div>
            </div>

            <div class="items-list">
              <div
                v-for="(item, idx) in activeRecord.dutyItems.filter(i => i.content).slice(0, 3)"
                :key="item.id"
                class="item-row"
                :class="{ done: item.isCompleted }"
              >
                <span class="item-num font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>
                <span class="item-content">{{ item.content }}</span>
                <span v-if="!item.isCompleted && itemTimeout(item)?.state === 'warning'" class="timeout-badge warn">{{ itemTimeout(item).label }}</span>
                <span v-else-if="!item.isCompleted && itemTimeout(item)?.state === 'overdue'" class="timeout-badge crit">已超时</span>
                <span v-if="item.acceptTime" class="item-time font-mono">
                  {{ item.acceptTime }}<span v-if="item.endTime">→{{ item.endTime }}</span>
                </span>
              </div>
            </div>
          </div>

          <div v-else class="empty-block">
            <p class="empty-text">今日还没有值班记录</p>
            <button v-if="store.canCreateRecord" class="btn btn-secondary" @click="$router.push('/records/create')">
              立即创建
            </button>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="card panel-activity">
        <div class="card-header">
          <h2 class="card-title">最近活动</h2>
          <span class="card-meta">{{ store.activities.length }} 条</span>
        </div>
        <div class="card-body">
          <div class="activity-list">
            <div
              v-for="activity in store.activities.slice(0, 6)"
              :key="activity.id"
              class="activity-item"
            >
              <span class="activity-dot" :class="`dot-${activity.type}`"></span>
              <div class="activity-content">
                <div class="activity-text">
                  <strong>{{ activity.user }}</strong>
                  <span class="text-muted">{{ activity.action }}</span>
                  <span>{{ activity.target }}</span>
                </div>
                <div class="activity-time font-mono">{{ activity.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 趋势图 + 业务类型分布 -->
    <div class="charts-row">
      <!-- 趋势图 -->
      <div class="card panel-trend">
        <div class="card-header">
          <h2 class="card-title">接单趋势</h2>
          <div class="chart-tools">
            <button
              v-for="m in ['line', 'bar']"
              :key="m"
              class="tool-btn"
              :class="{ active: trendMode === m }"
              @click="trendMode = m"
            >{{ m === 'line' ? '折线' : '柱状' }}</button>
          </div>
        </div>
        <div class="card-body">
          <TrendChart :data="trendData" :mode="trendMode" :height="220" />
          <div class="legend">
            <span class="legend-item"><i class="dot" style="background:#3b82f6"></i>接单数</span>
            <span class="legend-item"><i class="dot" style="background:#10b981"></i>已完成</span>
            <span class="legend-item"><i class="dot" style="background:#f59e0b"></i>未完成</span>
          </div>
        </div>
      </div>

      <!-- 业务类型分布 -->
      <div class="card panel-types">
        <div class="card-header">
          <h2 class="card-title">业务类型分布</h2>
        </div>
        <div class="card-body">
          <div v-if="businessTypes.length === 0" class="empty-mini">暂无数据</div>
          <div v-else class="donut-wrap">
            <DonutChart :data="businessTypes" :size="170" center-label="总工单" />
            <div class="type-legend">
              <div v-for="(b, i) in businessTypes.slice(0, 6)" :key="b.label" class="type-row">
                <span class="type-color" :style="{ background: legendColor(i) }"></span>
                <span class="type-label">{{ b.label }}</span>
                <span class="type-value font-mono">{{ b.value }}</span>
                <span class="type-pct">{{ pctOf(b.value) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 响应时长 + 接单热力图 -->
    <div class="charts-row">
      <!-- 响应时长 -->
      <div class="card panel-response">
        <div class="card-header">
          <h2 class="card-title">响应时长分析</h2>
        </div>
        <div class="card-body">
          <div class="response-grid">
            <div class="resp-cell">
              <div class="resp-label">平均耗时</div>
              <div class="resp-value font-mono">
                <span class="resp-num">{{ formatDuration(metrics.avgDuration) }}</span>
              </div>
              <div class="resp-sub">所有已完成工单</div>
            </div>
            <div class="resp-cell">
              <div class="resp-label">中位数</div>
              <div class="resp-value font-mono">
                <span class="resp-num text-ok">{{ formatDuration(metrics.median) }}</span>
              </div>
              <div class="resp-sub">半数工单快于此</div>
            </div>
            <div class="resp-cell">
              <div class="resp-label">P90</div>
              <div class="resp-value font-mono">
                <span class="resp-num text-warn">{{ formatDuration(metrics.p90) }}</span>
              </div>
              <div class="resp-sub">90% 工单快于此</div>
            </div>
            <div class="resp-cell">
              <div class="resp-label">超时率</div>
              <div class="resp-value font-mono">
                <span class="resp-num text-crit">{{ metrics.overdueRate }}%</span>
              </div>
              <div class="resp-sub">未完成超时或处理超时限</div>
            </div>
          </div>
          <div class="resp-bar">
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: metrics.completion + '%' }"></div>
            </div>
            <div class="bar-meta">
              <span>处理效率</span>
              <span class="font-mono"><strong>{{ metrics.done }}</strong> / {{ metrics.total }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 接单热力图 -->
      <div class="card panel-heatmap">
        <div class="card-header">
          <h2 class="card-title">接单时段热力图</h2>
          <span class="card-meta">星期 × 小时</span>
        </div>
        <div class="card-body">
          <div v-if="heatmap.max === 0" class="empty-mini">暂无接单数据</div>
          <div v-else class="heatmap">
            <div class="heatmap-grid">
              <div class="y-labels">
                <span v-for="d in dayLabels" :key="d">{{ d }}</span>
              </div>
              <div class="grid-body">
                <div
                  v-for="(row, ri) in heatmap.grid"
                  :key="'r'+ri"
                  class="grid-row"
                >
                  <div
                    v-for="(v, ci) in row"
                    :key="'c'+ci"
                    class="grid-cell"
                    :style="{ background: heatColor(v) }"
                    :title="`${dayLabels[ri]} ${ci}:00 · ${v} 单`"
                  ></div>
                </div>
                <div class="x-labels">
                  <span v-for="h in [0, 3, 6, 9, 12, 15, 18, 21]" :key="'h'+h" :style="{ left: (h / 23 * 100) + '%' }">{{ h }}</span>
                </div>
              </div>
            </div>
            <div class="heatmap-legend">
              <span>少</span>
              <div class="legend-bar"></div>
              <span>多</span>
              <span class="legend-max font-mono">峰值 {{ heatmap.max }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重复工单统计 -->
    <div class="card panel-duplicate">
      <div class="card-header">
        <h2 class="card-title">重复工单</h2>
        <span class="card-meta">客户重复 {{ dupStats.customerGroups.length }} 组 · 地址重复 {{ dupStats.addressGroups.length }} 组</span>
      </div>
      <div class="card-body">
        <div v-if="dupStats.total === 0" class="empty-mini">本区间暂无重复工单</div>
        <template v-else>
          <div class="dup-summary">
            <span class="dup-total-num font-mono">{{ dupStats.total }}</span>
            <span class="dup-total-unit">条</span>
            <span class="dup-summary-sub">同一客户或同一地址报修 ≥2 次 · 已去重</span>
          </div>

          <div v-if="dupStats.customerGroups.length" class="dup-groups">
            <h3 class="dup-group-title">客户名称重复</h3>
            <div v-for="g in dupStats.customerGroups" :key="'c' + g.key" class="dup-group">
              <div class="dup-group-head">
                <span class="dup-badge cust">{{ g.key }}</span>
                <span class="dup-count">{{ g.count }} 次</span>
              </div>
              <div class="dup-items">
                <div v-for="it in g.items" :key="it.id" class="dup-item">
                  <span class="dup-date font-mono">{{ it._recordDate }}</span>
                  <span class="dup-type">{{ it.businessType }}</span>
                  <span class="dup-content">{{ it.content }}</span>
                  <span v-if="it.acceptTime" class="dup-time font-mono">
                    {{ it.acceptTime }}<span v-if="it.endTime">→{{ it.endTime }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="dupStats.addressGroups.length" class="dup-groups">
            <h3 class="dup-group-title">联系地址重复</h3>
            <div v-for="g in dupStats.addressGroups" :key="'a' + g.key" class="dup-group">
              <div class="dup-group-head">
                <span class="dup-badge addr">{{ g.key }}</span>
                <span class="dup-count">{{ g.count }} 次</span>
              </div>
              <div class="dup-items">
                <div v-for="it in g.items" :key="it.id" class="dup-item">
                  <span class="dup-date font-mono">{{ it._recordDate }}</span>
                  <span class="dup-type">{{ it.businessType }}</span>
                  <span class="dup-content">{{ it.content }}</span>
                  <span v-if="it.acceptTime" class="dup-time font-mono">
                    {{ it.acceptTime }}<span v-if="it.endTime">→{{ it.endTime }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 值班排班 -->
    <div class="card panel-schedule">
      <div class="card-header">
        <h2 class="card-title">值班排班</h2>
        <span class="card-meta">未来 {{ dashboardDays }} 天 · 高亮为我的值班</span>
      </div>
      <div class="card-body">
        <ScheduleTable
          v-if="store.scheduleConfig.configured"
          :rows="store.scheduleTable"
          :highlight-date="scheduleToday"
          :highlight-user-ids="[store.user.id]"
        />
        <div v-else class="empty-mini">排班尚未配置，请联系管理员设置</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/store'
import StatCard from '@/components/StatCard.vue'
import TrendChart from '@/components/TrendChart.vue'
import DonutChart from '@/components/DonutChart.vue'
import ScheduleTable from '@/components/ScheduleTable.vue'
import { getCurrentDateISO } from '@/data/mockData'
import { getItemTimeoutState } from '@/utils/orderTimeout'

const store = useAppStore()
const range = ref('month')
const trendMode = ref('line')
const refreshing = ref(false)

const tabs = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' }
]

const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const legendColor = (i) => palette[i % palette.length]

// ===== 时间范围 =====
const today = new Date()
const todayISO = today.toISOString().slice(0, 10)
// 排班用本地日期（避免 UTC 跨天偏移），未来 7 天
const scheduleToday = getCurrentDateISO()
const dashboardDays = 7

const rangeBounds = computed(() => {
  const start = new Date(today)
  const end = new Date(today)
  if (range.value === 'today') {
    // 不变
  } else if (range.value === 'week') {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
  } else if (range.value === 'month') {
    start.setDate(1)
  } else {
    start.setMonth(0, 1)
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  }
})

const rangeMeta = computed(() => `${rangeBounds.value.start} → ${rangeBounds.value.end}`)

// ===== 现有 activeRecord 兼容 =====
const activeRecord = computed(() => store.activeRecord)

// 工单超时状态（统一口径见 utils/orderTimeout.js）
const itemTimeout = (item) => activeRecord.value
  ? getItemTimeoutState(item, activeRecord.value.recordDate, store.currentStationOrderTimeLimit)
  : null

// 值班员：优先显示当天排班名单，未配置排班时回退创建人
const officerText = (r) => (r?.dutyOfficers && r.dutyOfficers.length)
  ? r.dutyOfficers.join(' / ')
  : (r?.creator || '—')
const recordProgress = computed(() => {
  const r = activeRecord.value
  if (!r || r.itemCount === 0) return 0
  return Math.round((r.completedCount / r.itemCount) * 100)
})

// ===== 问候 =====
const greetingText = computed(() => {
  const h = today.getHours()
  if (h < 6) return '夜深了，注意休息'
  if (h < 12) return '新的一天开始了'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

// ===== 关键指标 =====
const metrics = computed(() => store.efficiencyMetrics(rangeBounds.value.start, rangeBounds.value.end))

// ===== 重复工单（同一客户或同一地址报修 ≥2 次） =====
const dupStats = computed(() => store.duplicateWorkOrders(rangeBounds.value.start, rangeBounds.value.end))

// ===== 趋势图数据 =====
const trendData = computed(() => {
  // 1. 把区间内的 daily 数据取出来
  const daily = store.dailyItemTrend(rangeBounds.value.start, rangeBounds.value.end)
  // 2. 补齐中间缺日（0 单）
  const start = new Date(rangeBounds.value.start)
  const end = new Date(rangeBounds.value.end)
  const result = []
  const map = new Map(daily.map(d => [d.date, d]))
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    result.push(map.get(iso) || { date: iso, total: 0, done: 0, pending: 0 })
  }
  return result
})

// ===== 业务类型 =====
const businessTypes = computed(() => {
  const list = store.businessTypeDistribution(rangeBounds.value.start, rangeBounds.value.end)
  return list.slice(0, 8).map((b, i) => ({ ...b, color: legendColor(i) }))
})

const totalItems = computed(() => businessTypes.value.reduce((s, b) => s + b.value, 0))
const pctOf = (v) => totalItems.value === 0 ? 0 : Math.round(v / totalItems.value * 100)

// ===== 响应时长 =====
const formatDuration = (mins) => {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}小时`
  return `${h}h${m}m`
}

// ===== 热力图 =====
const heatmap = computed(() => store.heatmapData(rangeBounds.value.start, rangeBounds.value.end))
const heatColor = (v) => {
  if (v === 0) return 'rgba(148, 163, 184, 0.08)'
  if (heatmap.value.max === 0) return 'rgba(59, 130, 246, 0.2)'
  const t = v / heatmap.value.max
  // 蓝 → 红：颜色深浅
  const alpha = 0.15 + t * 0.85
  if (t < 0.4) return `rgba(59, 130, 246, ${alpha})`
  if (t < 0.75) return `rgba(245, 158, 11, ${alpha})`
  return `rgba(239, 68, 68, ${alpha})`
}

// ===== 手动刷新 =====
const refreshData = async () => {
  refreshing.value = true
  try {
    const [today] = await Promise.all([
      store.fetchTodayRecord(),
      store.fetchRecords({ startDate: rangeBounds.value.start, endDate: rangeBounds.value.end, pageSize: 200 }),
      store.fetchDashboardActivities(20),
      store.fetchScheduleConfig(),
      store.fetchScheduleTable({ from: scheduleToday, days: dashboardDays })
    ])
    if (today) {
      // 让 records 数组已有当天数据
    }
  } catch {}
  refreshing.value = false
}

onMounted(() => {
  refreshData()
})
</script>

<style lang="scss" scoped>
.dashboard-view { padding-bottom: 40px; }

.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.welcome-title {
  font-size: 22px;
  font-weight: 600;
  color: $text-primary;
}
.welcome-sub {
  font-size: 13px;
  color: $text-muted;
  margin-top: 4px;
}
.welcome-action {
  display: flex;
  gap: 8px;
}
.spinning { animation: spin 800ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

// ===== 筛选 =====
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 8px;
  padding: 6px;
  margin-bottom: 16px;
}
.filter-tabs {
  display: flex;
  gap: 2px;
}
.filter-tab {
  padding: 6px 16px;
  background: transparent;
  border: none;
  color: $text-secondary;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 120ms ease;
  &:hover { background: $bg-page; }
  &.active {
    background: $primary;
    color: $text-inverse;
  }
}
.filter-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $text-muted;
  padding: 0 12px;
}
.filter-value { color: $text-secondary; font-weight: 500; }

// ===== StatCard =====
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

// ===== 主两栏 =====
.main-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

// ===== 图卡行 =====
.charts-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 1100px) {
  .main-grid, .charts-row { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

.card {
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 8px;
  overflow: hidden;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid $border-subtle;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
}
.card-meta {
  font-size: 11px;
  color: $text-muted;
}
.card-body {
  padding: 16px 18px;
}

.empty-mini {
  padding: 40px 0;
  text-align: center;
  color: $text-muted;
  font-size: 13px;
}

// ===== 今日值班 =====
.today-record { display: flex; flex-direction: column; gap: 12px; }

.today-meta {
  display: flex;
  gap: 16px;
  padding: 10px 12px;
  background: $bg-page;
  border-radius: 6px;
}
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.meta-label { font-size: 11px; color: $text-muted; }
.meta-value { font-size: 13px; color: $text-primary; font-weight: 500; }

.progress-block { display: flex; flex-direction: column; gap: 4px; }
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: $text-secondary;
}
.progress-num { font-weight: 500; }
.progress-bar {
  height: 6px;
  background: $bg-page;
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $ok, #34d399);
  transition: width 300ms ease;
}

.items-list { display: flex; flex-direction: column; gap: 6px; }
.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  background: $bg-page;

  &.done { color: $text-muted; .item-content { text-decoration: line-through; } }
}
.item-num {
  font-size: 11px;
  color: $text-muted;
  font-weight: 600;
  flex-shrink: 0;
}
.item-content { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-time { font-size: 11px; color: $text-secondary; flex-shrink: 0; }
.timeout-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  flex-shrink: 0;

  &.warn { background: $warn-soft; color: $warn; }
  &.crit { background: $crit-soft; color: $crit; }
}

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 0;
}
.empty-text { color: $text-muted; font-size: 13px; }

// ===== 活动 =====
.activity-list { display: flex; flex-direction: column; gap: 12px; }
.activity-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $accent;
  margin-top: 6px;
  flex-shrink: 0;

  &.dot-success { background: $ok; }
  &.dot-warning { background: $warn; }
  &.dot-error { background: $crit; }
  &.dot-record { background: $accent; }
  &.dot-locked { background: $warn; }
}
.activity-content { flex: 1; }
.activity-text {
  font-size: 13px;
  color: $text-primary;
  line-height: 1.5;
  .text-muted { color: $text-muted; margin: 0 4px; }
}
.activity-time { font-size: 11px; color: $text-muted; margin-top: 2px; }

// ===== 图表工具 =====
.chart-tools { display: flex; gap: 2px; }
.tool-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid $border-base;
  border-radius: 4px;
  font-size: 12px;
  color: $text-muted;
  cursor: pointer;
  margin-left: 4px;
  &.active {
    background: $primary-soft;
    color: $primary;
    border-color: $primary;
  }
}

.legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: $text-muted;
  margin-top: 8px;
  flex-wrap: wrap;
}
.legend-item { display: flex; align-items: center; gap: 4px; }
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

// ===== 业务类型 =====
.donut-wrap { display: flex; gap: 18px; align-items: center; }
.type-legend { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.type-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.type-color { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.type-label { flex: 1; color: $text-primary; }
.type-value { color: $text-secondary; font-weight: 500; }
.type-pct { color: $text-muted; min-width: 36px; text-align: right; }

// ===== 响应时长 =====
.response-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.resp-cell {
  padding: 10px 8px;
  background: $bg-page;
  border-radius: 6px;
  text-align: center;
}
.resp-label {
  font-size: 11px;
  color: $text-muted;
  margin-bottom: 4px;
}
.resp-num {
  font-size: 18px;
  font-weight: 600;
  color: $text-primary;
  display: block;
  &.text-ok { color: $ok; }
  &.text-warn { color: $warn; }
  &.text-crit { color: $crit; }
}
.resp-sub { font-size: 10px; color: $text-muted; margin-top: 2px; }

.resp-bar { margin-top: 8px; }
.bar-track {
  height: 6px;
  background: $bg-page;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, #06b6d4);
  transition: width 400ms ease;
}
.bar-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: $text-muted;
}

// ===== 热力图 =====
.heatmap { display: flex; flex-direction: column; gap: 12px; }
.heatmap-grid {
  display: flex;
  gap: 4px;
}
.y-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 10px;
  color: $text-muted;
  span { height: 18px; line-height: 18px; }
}
.grid-body { flex: 1; display: flex; flex-direction: column; }
.grid-row {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
  height: 18px;
}
.grid-cell {
  border-radius: 2px;
  transition: transform 100ms ease;
  cursor: pointer;
  &:hover { transform: scale(1.2); }
}
.x-labels {
  position: relative;
  height: 14px;
  font-size: 10px;
  color: $text-muted;
  margin-top: 2px;
  span { position: absolute; transform: translateX(-50%); }
}
.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: $text-muted;
}
.legend-bar {
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(59,130,246,0.15), rgba(245,158,11,0.5), rgba(239,68,68,1));
}
.legend-max { margin-left: auto; }

// ===== 重复工单 =====
.panel-duplicate { margin-bottom: 16px; }

.dup-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}
.dup-total-num {
  font-size: 28px;
  font-weight: 700;
  color: $crit;
  line-height: 1;
}
.dup-total-unit {
  font-size: 14px;
  color: $text-muted;
  font-weight: 500;
}
.dup-summary-sub { font-size: 12px; color: $text-muted; }

.dup-groups { display: flex; flex-direction: column; gap: 8px; }
.dup-group-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
  margin: 4px 0 0;
}
.dup-group {
  padding: 10px 12px;
  background: $bg-page;
  border-radius: $radius-md;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dup-group-head { display: flex; align-items: center; gap: 8px; }
.dup-badge {
  padding: 2px 8px;
  border-radius: $radius-full;
  font-size: 11px;
  font-weight: 600;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.cust { background: $warn-soft; color: $warn; }
  &.addr { background: $crit-soft; color: $crit; }
}
.dup-count { font-size: 11px; color: $text-muted; }

.dup-items { display: flex; flex-direction: column; gap: 4px; }
.dup-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  font-size: 12px;
}
.dup-date { color: $text-muted; flex-shrink: 0; }
.dup-type {
  color: $text-secondary;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dup-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-primary;
}
.dup-time { font-size: 11px; color: $text-secondary; flex-shrink: 0; }
</style>
