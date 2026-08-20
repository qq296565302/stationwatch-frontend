<template>
  <div class="overview-view" :class="{ 'font-large': store.fontScale >= 1.5 }">
    <PageHeader
      title="全站概览"
      subtitle="全市/本区县供电所关键指标聚合总览"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="refreshData" :disabled="loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" :class="{ spinning: loading }">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
            <polyline points="21 3 21 8 16 8"/>
          </svg>
          {{ loading ? '刷新中...' : '刷新数据' }}
        </button>
      </template>
    </PageHeader>

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
        <span class="filter-count font-mono">{{ overview.stations.length }} 站</span>
      </div>
    </div>

    <!-- 全站汇总统计卡 -->
    <div class="totals-row">
      <StatCard label="全站接单" :value="overview.totals.total" unit="项" />
      <StatCard label="全站已完成" :value="overview.totals.done" unit="项" />
      <StatCard label="全站完成率" :value="overview.totals.completion" unit="%" />
      <StatCard label="全站超时" :value="overview.totals.overdue" unit="项" :sub="`${overview.totals.overdueRate}%`" variant="critical" />
    </div>

    <div v-if="loading" class="empty-block">加载中…</div>

    <!-- 各供电所对比表 -->
    <div v-else class="grid-main">
      <div class="card panel-table">
        <div class="card-header">
          <h2 class="card-title">各供电所关键指标</h2>
          <span class="card-meta">点击行可切换站点查看单站明细</span>
        </div>
        <div class="card-body card-body-pad0">
          <div v-if="overview.stations.length === 0" class="empty-mini">暂无站点数据</div>
          <div v-else class="region-groups">
            <!-- 每个区县一组，可折叠 -->
            <div v-for="group in regionGroups" :key="group.region" class="region-group" :class="{ expanded: isRegionOpen(group.region) }">
              <button class="region-header" type="button" @click="toggleRegion(group.region)">
                <span class="region-caret" :class="{ open: isRegionOpen(group.region) }">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
                <span class="region-name">{{ group.region || '未分区' }}</span>
                <span class="region-count font-mono">{{ group.stations.length }} 站</span>
                <span class="region-spacer"></span>
                <span class="region-total">接单 <b class="font-mono">{{ group.total }}</b></span>
                <span class="region-total">完成率 <b class="font-mono" :class="rateClass(group.completion)">{{ group.completion }}%</b></span>
                <span class="region-total">超时 <b class="font-mono" :class="{ warn: group.overdue > 0 }">{{ group.overdue }}</b></span>
              </button>
              <div v-show="isRegionOpen(group.region)" class="region-body">
                <table class="overview-table">
                  <thead>
                    <tr>
                      <th>供电所</th>
                      <th>接单</th>
                      <th>已完成</th>
                      <th>完成率</th>
                      <th>超时</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="s in group.stations"
                      :key="s.stationId"
                      class="ov-row"
                      :class="{ 'ov-row-active': String(s.stationId) === String(store.currentStationId) }"
                      @click="goStation(s.stationId)"
                    >
                      <td class="ov-station">
                        <span class="ov-dot" :class="{ on: String(s.stationId) === String(store.currentStationId) }"></span>
                        {{ s.stationName }}
                      </td>
                      <td class="ov-num font-mono">{{ s.total }}</td>
                      <td class="ov-num font-mono">{{ s.done }}</td>
                      <td>
                        <span class="ov-rate" :class="rateClass(s.completion)">{{ s.completion }}%</span>
                      </td>
                      <td>
                        <span class="ov-overdue" :class="{ warn: s.overdue > 0 }">{{ s.overdue }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 跨站趋势 + 业务类型分布 -->
      <div class="side-charts">
        <div class="card panel-trend">
          <div class="card-header">
            <h2 class="card-title">跨站接单趋势</h2>
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
            <div v-if="overviewTrend.length === 0" class="empty-mini">本区间暂无跨站接单</div>
            <TrendChart v-else :data="overviewTrend" :mode="trendMode" :height="200" />
            <div class="legend">
              <span class="legend-item"><i class="dot" style="background:#3b82f6"></i>接单数</span>
              <span class="legend-item"><i class="dot" style="background:#10b981"></i>已完成</span>
              <span class="legend-item"><i class="dot" style="background:#f59e0b"></i>未完成</span>
            </div>
          </div>
        </div>

        <div class="card panel-types">
          <div class="card-header">
            <h2 class="card-title">跨站业务分布</h2>
          </div>
          <div class="card-body">
            <div v-if="overviewBusinessTypes.length === 0" class="empty-mini">暂无数据</div>
            <div v-else class="donut-wrap">
              <DonutChart :data="overviewBusinessTypes" :size="150" center-label="总工单" />
              <div class="type-legend">
                <div v-for="(b, i) in overviewBusinessTypes.slice(0, 6)" :key="b.label" class="type-row">
                  <span class="type-color" :style="{ background: legendColor(i) }"></span>
                  <span class="type-label">{{ b.label }}</span>
                  <span class="type-value font-mono">{{ b.value }}</span>
                  <span class="type-pct">{{ overviewPct(b.value) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import TrendChart from '@/components/TrendChart.vue'
import DonutChart from '@/components/DonutChart.vue'

const store = useAppStore()
const router = useRouter()

const range = ref('month')
const trendMode = ref('line')
const loading = ref(false)

const tabs = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' }
]

const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const legendColor = (i) => palette[i % palette.length]

// ===== 时间范围（与主控台一致） =====
const today = new Date()
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

// ===== 数据 =====
const overview = ref({
  totals: { total: 0, done: 0, completion: 0, overdue: 0, overdueRate: 0, stationCount: 0 },
  stations: [],
  trend: [],
  businessTypes: []
})

const loadData = async () => {
  loading.value = true
  try {
    overview.value = await store.fetchStationOverview(rangeBounds.value.start, rangeBounds.value.end)
  } catch {
    overview.value = {
      totals: { total: 0, done: 0, completion: 0, overdue: 0, overdueRate: 0, stationCount: 0 },
      stations: [],
      trend: [],
      businessTypes: []
    }
  } finally {
    loading.value = false
  }
  // 数据刷新后默认展开全部区县（保留用户已手动折叠的？不，刷新后重置为全部展开更符合预期）
  openRegions.value = new Set(regionGroups.value.map(g => g.region))
}

const refreshData = () => { loadData() }

// ===== 按区县分组 =====
// 分组数据源：优先用 store.districts（后端 /districts，站点按 districtId 关联到区县 name），
// 与 TopBar 站点切换器的区县分组保持一致；districtId 缺失时回退到站点 region 字段名。
const regionGroups = computed(() => {
  // 区县 id -> 区县名（来自 store.districts，取全部区县保证顺序稳定）
  const districtName = new Map()
  ;(store.districts || []).forEach(d => districtName.set(String(d.id), d.name || ''))
  // 站点按归属区县归类，key 统一用区县名
  const map = new Map()
  const keyOf = (s) => {
    const byId = s.districtId != null ? districtName.get(String(s.districtId)) : null
    return byId || s.region || ''
  }
  overview.value.stations.forEach(s => {
    const key = keyOf(s)
    if (!map.has(key)) map.set(key, { region: key, stations: [], total: 0, done: 0, overdue: 0 })
    const g = map.get(key)
    g.stations.push(s)
    g.total += s.total
    g.done += s.done
    g.overdue += s.overdue
  })
  const groups = Array.from(map.values())
  groups.forEach(g => {
    g.stations.sort((a, b) => b.total - a.total)
    g.completion = g.total === 0 ? 0 : Math.round((g.done / g.total) * 100)
  })
  // 区县按 store.districts 顺序 + 名称排序，未分区放最后
  const orderById = new Map(store.districts.map((d, i) => [String(d.id), i]))
  return groups.sort((a, b) => {
    if (!a.region && !b.region) return 0
    if (!a.region) return 1
    if (!b.region) return -1
    const ia = districtName.get(a.region)
    const ib = districtName.get(b.region)
    if (ia != null && ib != null) {
      const oa = orderById.get(a.region), ob = orderById.get(b.region)
      if (oa != null && ob != null) return oa - ob
    }
    return a.region.localeCompare(b.region, 'zh')
  })
})

// 区县折叠态：默认展开；点击表头切换
const openRegions = ref(new Set())
const isRegionOpen = (region) => openRegions.value.has(region)
const toggleRegion = (region) => {
  const s = new Set(openRegions.value)
  if (s.has(region)) s.delete(region)
  else s.add(region)
  openRegions.value = s
}

const rateClass = (rate) => rate >= 80 ? 'ok' : (rate >= 50 ? 'warn' : 'crit')

// 跨站趋势：补齐区间缺日（0 单）
const overviewTrend = computed(() => {
  const start = new Date(rangeBounds.value.start)
  const end = new Date(rangeBounds.value.end)
  const map = new Map(overview.value.trend.map(d => [d.date, d]))
  const result = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    result.push(map.get(iso) || { date: iso, total: 0, done: 0, pending: 0 })
  }
  return result
})

const overviewBusinessTypes = computed(() =>
  overview.value.businessTypes.slice(0, 8).map((b, i) => ({ ...b, color: legendColor(i) }))
)
const overviewBusinessTotal = computed(() => overviewBusinessTypes.value.reduce((s, b) => s + b.value, 0))
const overviewPct = (v) => overviewBusinessTotal.value === 0 ? 0 : Math.round(v / overviewBusinessTotal.value * 100)

// 点击某供电所行 → 切换站点并跳转主控台查看单站明细
const goStation = (stationId) => {
  if (String(stationId) === String(store.currentStationId)) {
    router.push('/dashboard')
    return
  }
  store.setCurrentStation(stationId)
  router.push('/dashboard')
}

onMounted(async () => {
  // 确保区县列表已加载（分组依赖 store.districts；TopBar 通常已拉取，这里兜底）
  if (!store.districts.length) await store.fetchDistricts()
  loadData()
})
</script>

<style lang="scss" scoped>
.overview-view { padding-bottom: 40px; }

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
.filter-tabs { display: flex; gap: 2px; }
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
  &.active { background: $primary; color: $text-inverse; }
}
.filter-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: $text-muted;
  padding: 0 12px;
}
.filter-value { color: $text-secondary; font-weight: 500; }
.filter-count {
  color: $primary;
  font-weight: 600;
  background: $primary-soft;
  padding: 2px 8px;
  border-radius: 999px;
}

// ===== 全站汇总 =====
.totals-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

// ===== 主体 =====
.grid-main {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}
.side-charts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.empty-block {
  text-align: center;
  color: $text-muted;
  font-size: 13px;
  padding: 60px 0;
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
.card-body { padding: 16px 18px; }
.card-body-pad0 { padding: 0; }
.empty-mini {
  padding: 40px 0;
  text-align: center;
  color: $text-muted;
  font-size: 13px;
}

// ===== 对比表 =====
.overview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th {
    text-align: left;
    padding: 9px 14px;
    font-size: 11px;
    color: $text-muted;
    font-weight: 500;
    border-bottom: 1px solid $border-subtle;
    background: $bg-page;
  }
  td {
    padding: 9px 14px;
    border-bottom: 1px solid $border-subtle;
  }
  tr:last-child td { border-bottom: none; }
}
.ov-row {
  cursor: pointer;
  transition: background 120ms ease;
  &:hover { background: $bg-hover; }
  &-active { background: $primary-soft; }
}
.ov-station {
  font-weight: 600;
  color: $text-primary;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ov-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: $border-base;
  flex-shrink: 0;
  &.on { background: $primary; }
}
.ov-region { color: $text-muted; }
.ov-num { color: $text-secondary; }
.ov-rate {
  font-weight: 600;
  &.ok { color: $ok; }
  &.warn { color: $warn; }
  &.crit { color: $crit; }
}
.ov-overdue {
  font-weight: 600;
  color: $text-secondary;
  &.warn { color: $crit; }
}

// ===== 区县分组（可折叠） =====
.region-groups {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.region-group {
  border-bottom: 1px solid $border-subtle;
  &:last-child { border-bottom: none; }
}
.region-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: $bg-page;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 120ms ease;
  &:hover { background: $bg-hover; }
}
.region-caret {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  transition: transform 200ms ease;
  svg { width: 14px; height: 14px; }
  &.open { transform: rotate(180deg); color: $primary; }
}
.region-name {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
}
.region-count {
  font-size: 11px;
  color: $text-muted;
  background: $bg-card;
  border: 1px solid $border-base;
  padding: 1px 8px;
  border-radius: 999px;
}
.region-spacer { flex: 1; }
.region-total {
  font-size: 12px;
  color: $text-muted;
  white-space: nowrap;
  b { color: $text-secondary; margin-left: 4px; }
  b.ok { color: $ok; }
  b.warn { color: $crit; }
}
.region-body {
  animation: regionExpand 200ms ease;
}
@keyframes regionExpand {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.region-body .overview-table {
  th, td { padding-left: 22px; }
}

// ===== 图表 =====
.chart-tools { display: flex; gap: 2px; }
.tool-btn {
  padding: 4px 12px;
  background: transparent;
  border: 1px solid $border-base;
  border-radius: 6px;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  transition: all 120ms ease;
  &:hover { background: $bg-page; }
  &.active {
    background: $primary;
    border-color: $primary;
    color: $text-inverse;
  }
}
.legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 12px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-secondary;
}
.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.donut-wrap {
  display: flex;
  gap: 18px;
  align-items: center;
}
.type-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: $text-secondary;
}
.type-color {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.type-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.type-value { color: $text-primary; }
.type-pct {
  color: $text-muted;
  width: 42px;
  text-align: right;
}

// ===== 响应式 =====
@media (max-width: 1100px) {
  .grid-main { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .totals-row { grid-template-columns: repeat(2, 1fr); }
}
.overview-view.font-large {
  .grid-main { grid-template-columns: 1fr; }
  .donut-wrap { justify-content: center; }
}
</style>
