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

    <!-- 全站汇总统计卡（副标题为与上一同期区间的环比） -->
    <div class="totals-row">
      <StatCard label="全站接单" :value="overview.totals.total" unit="项" :sub="pctText(deltas.total)" />
      <StatCard label="全站已完成" :value="overview.totals.done" unit="项" :sub="pctText(deltas.done)" />
      <StatCard label="全站完成率" :value="overview.totals.completion" unit="%" :sub="ppText(deltas.completion)" />
      <StatCard label="全站超时" :value="overview.totals.overdue" unit="项" :sub="`超时率 ${overview.totals.overdueRate}% · ${pctText(deltas.overdue)}`" variant="critical" />
    </div>

    <div v-if="loading" class="empty-block">加载中…</div>

    <!-- 各供电所对比表 -->
    <template v-else>
    <div class="grid-main">
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

        <!-- 跨站接单热力图（统计范围：当前账号权限内全部供电所） -->
        <div class="card panel-heatmap">
          <div class="card-header">
            <h2 class="card-title">跨站接单热力图</h2>
            <span class="card-meta">星期 × 小时 · {{ overview.stations.length }} 站</span>
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

        <!-- 跨站响应时长（统计范围：当前账号权限内全部供电所） -->
        <div class="card panel-response">
          <div class="card-header">
            <h2 class="card-title">跨站响应时长</h2>
            <span class="card-meta">全部可见站点 · 已完成工单</span>
          </div>
          <div class="card-body">
            <div v-if="overview.response.avgDuration === 0" class="empty-mini">本区间暂无已完成工单的耗时数据</div>
            <template v-else>
              <div class="response-grid">
                <div class="resp-cell">
                  <div class="resp-label">平均耗时</div>
                  <div class="resp-value font-mono">
                    <span class="resp-num">{{ formatDuration(overview.response.avgDuration) }}</span>
                  </div>
                  <div class="resp-sub">所有已完成工单</div>
                </div>
                <div class="resp-cell">
                  <div class="resp-label">中位数</div>
                  <div class="resp-value font-mono">
                    <span class="resp-num text-ok">{{ formatDuration(overview.response.median) }}</span>
                  </div>
                  <div class="resp-sub">半数工单快于此</div>
                </div>
                <div class="resp-cell">
                  <div class="resp-label">P90</div>
                  <div class="resp-value font-mono">
                    <span class="resp-num text-warn">{{ formatDuration(overview.response.p90) }}</span>
                  </div>
                  <div class="resp-sub">90% 工单快于此</div>
                </div>
              </div>
              <div v-if="durationRank.length" class="rank-block">
                <div class="rank-title">各站平均耗时（慢的在前）</div>
                <div v-for="s in durationRank" :key="s.stationId" class="rank-row">
                  <span class="rank-name" :title="s.stationName">{{ s.stationName }}</span>
                  <div class="rank-track">
                    <div class="rank-fill resp" :style="{ width: durationPct(s) + '%' }"></div>
                  </div>
                  <span class="rank-val font-mono">{{ formatDuration(s.avgDuration) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 客户满意度 -->
        <div class="card panel-satisfaction">
          <div class="card-header">
            <h2 class="card-title">客户满意度</h2>
            <span class="card-meta">{{ overview.satisfaction.rated }} 条评价</span>
          </div>
          <div class="card-body">
            <div v-if="overview.satisfaction.rated === 0" class="empty-mini">本区间暂无客户评价数据</div>
            <template v-else>
              <div class="sat-hero">
                <span class="sat-num font-mono" :class="satClass(overview.satisfaction.rate)">{{ overview.satisfaction.rate }}%</span>
                <span class="sat-sub">全站满意率 · {{ overview.satisfaction.satisfied }}/{{ overview.satisfaction.rated }} 条满意</span>
              </div>
              <div v-if="satTop3.length" class="rank-block">
                <div class="rank-title">满意率最高（TOP 3）</div>
                <div v-for="s in satTop3" :key="s.stationId" class="rank-row">
                  <span class="rank-name" :title="s.stationName">{{ s.stationName }}</span>
                  <div class="rank-track">
                    <div class="rank-fill" :class="`sat-${satClass(s.satisfactionRate)}`" :style="{ width: s.satisfactionRate + '%' }"></div>
                  </div>
                  <span class="rank-val font-mono" :class="satClass(s.satisfactionRate)">{{ s.satisfactionRate }}%</span>
                </div>
              </div>
              <div v-if="satBottom3.length" class="rank-block">
                <div class="rank-title">满意率最低（后 3）</div>
                <div v-for="s in satBottom3" :key="s.stationId" class="rank-row">
                  <span class="rank-name" :title="s.stationName">{{ s.stationName }}</span>
                  <div class="rank-track">
                    <div class="rank-fill" :class="`sat-${satClass(s.satisfactionRate)}`" :style="{ width: s.satisfactionRate + '%' }"></div>
                  </div>
                  <span class="rank-val font-mono" :class="satClass(s.satisfactionRate)">{{ s.satisfactionRate }}%</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 跨站重复报修 -->
    <div class="card panel-duplicate">
      <div class="card-header">
        <h2 class="card-title">跨站重复报修</h2>
        <span class="card-meta">
          客户重复 {{ overview.duplicates.customerGroups.length }} 组 · 地址重复 {{ overview.duplicates.addressGroups.length }} 组 · 跨供电所合并判定
        </span>
      </div>
      <div class="card-body">
        <div v-if="overview.duplicates.total === 0" class="empty-mini">本区间暂无重复报修</div>
        <template v-else>
          <div class="dup-summary">
            <span class="dup-total-num font-mono">{{ overview.duplicates.total }}</span>
            <span class="dup-total-unit">条</span>
            <span class="dup-summary-sub">同一客户或同一地址报修 ≥2 次 · 已去重 · 点击工单可查看记录详情</span>
          </div>

          <div v-if="dupCustomerGroups.length" class="dup-groups">
            <h3 class="dup-group-title">客户名称重复</h3>
            <div v-for="g in dupCustomerGroups" :key="'c' + g.key" class="dup-group">
              <div class="dup-group-head">
                <span class="dup-badge cust" :title="g.key">{{ g.key }}</span>
                <span class="dup-count">{{ g.count }} 次</span>
                <span v-if="g.stationCount > 1" class="dup-cross">跨 {{ g.stationCount }} 站</span>
              </div>
              <div class="dup-items">
                <div v-for="it in g.items" :key="it.id" class="dup-item" role="link" tabindex="0" aria-label="查看工单详情" @click="goRecord(it)" @keydown.enter="goRecord(it)">
                  <div class="dup-item-main">
                    <span class="dup-content">{{ it.content }}</span>
                    <span v-if="it.customerSatisfied" class="dup-satisfied">客户满意</span>
                  </div>
                  <div class="dup-item-meta">
                    <span class="dup-meta-item dup-station">{{ it._stationName }}</span>
                    <span v-if="it.businessType" class="dup-meta-item">{{ it.businessType }}</span>
                    <span v-if="it.customerPhone" class="dup-meta-item">{{ it.customerPhone }}</span>
                  </div>
                  <div class="dup-item-foot">
                    <span v-if="it.result" class="dup-result">处理结果：{{ it.result }}</span>
                    <span class="dup-time font-mono">{{ it._recordDate }} {{ it.acceptTime }}<template v-if="it.endTime">→{{ it.endTime }}</template></span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="overview.duplicates.customerGroups.length > MAX_DUP_GROUPS" class="dup-more">仅展示前 {{ MAX_DUP_GROUPS }} 组，共 {{ overview.duplicates.customerGroups.length }} 组</div>
          </div>

          <div v-if="dupAddressGroups.length" class="dup-groups">
            <h3 class="dup-group-title">联系地址重复</h3>
            <div v-for="g in dupAddressGroups" :key="'a' + g.key" class="dup-group">
              <div class="dup-group-head">
                <span class="dup-badge addr" :title="g.key">{{ g.key }}</span>
                <span class="dup-count">{{ g.count }} 次</span>
                <span v-if="g.stationCount > 1" class="dup-cross">跨 {{ g.stationCount }} 站</span>
              </div>
              <div class="dup-items">
                <div v-for="it in g.items" :key="it.id" class="dup-item" role="link" tabindex="0" aria-label="查看工单详情" @click="goRecord(it)" @keydown.enter="goRecord(it)">
                  <div class="dup-item-main">
                    <span class="dup-content">{{ it.content }}</span>
                    <span v-if="it.customerSatisfied" class="dup-satisfied">客户满意</span>
                  </div>
                  <div class="dup-item-meta">
                    <span class="dup-meta-item dup-station">{{ it._stationName }}</span>
                    <span v-if="it.businessType" class="dup-meta-item">{{ it.businessType }}</span>
                    <span v-if="it.customerPhone" class="dup-meta-item">{{ it.customerPhone }}</span>
                  </div>
                  <div class="dup-item-foot">
                    <span v-if="it.result" class="dup-result">处理结果：{{ it.result }}</span>
                    <span class="dup-time font-mono">{{ it._recordDate }} {{ it.acceptTime }}<template v-if="it.endTime">→{{ it.endTime }}</template></span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="overview.duplicates.addressGroups.length > MAX_DUP_GROUPS" class="dup-more">仅展示前 {{ MAX_DUP_GROUPS }} 组，共 {{ overview.duplicates.addressGroups.length }} 组</div>
          </div>
        </template>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import { getShiftDateISO } from '@/utils/orderTimeout'
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
// 当前班次归属日期：班次为当日08:30~次日08:30，凌晨(<08:30)归前一天。
// 记录按班次日期归档，故统计范围统一用班次口径；并用本地时间拼 YYYY-MM-DD，
// 避免 toISOString() 的 UTC 偏移（北京时间 00:00~08:00 会晚一天）。
const todayISO = getShiftDateISO()
const rangeBounds = computed(() => {
  const [y, m, d] = todayISO.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d)
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
  const p = (n) => String(n).padStart(2, '0')
  const iso = (dt) => `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
  return {
    start: iso(start),
    end: iso(end)
  }
})
const rangeMeta = computed(() => `${rangeBounds.value.start} → ${rangeBounds.value.end}`)

// ===== 环比区间（上一同期，用于汇总卡环比） =====
// today→昨天；week→上周同期（起止各 -7 天）；month→上月同期（上月1号~上月同号，钳制到月末）；year→去年同期
const prevRangeBounds = computed(() => {
  const [y, m, d] = todayISO.split('-').map(Number)
  const p = (n) => String(n).padStart(2, '0')
  const iso = (dt) => `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
  let start, end
  if (range.value === 'today') {
    start = end = new Date(y, m - 1, d - 1)
  } else if (range.value === 'week') {
    const [sy, sm, sd] = rangeBounds.value.start.split('-').map(Number)
    const [ey, em, ed] = rangeBounds.value.end.split('-').map(Number)
    start = new Date(sy, sm - 1, sd - 7)
    end = new Date(ey, em - 1, ed - 7)
  } else if (range.value === 'month') {
    const lastDayOfPrev = new Date(y, m - 1, 0).getDate()
    start = new Date(y, m - 2, 1)
    end = new Date(y, m - 2, Math.min(d, lastDayOfPrev))
  } else {
    start = new Date(y - 1, 0, 1)
    end = new Date(y - 1, m - 1, d)
  }
  return { start: iso(start), end: iso(end) }
})

// ===== 数据 =====
const emptyOverview = () => ({
  totals: { total: 0, done: 0, completion: 0, overdue: 0, overdueRate: 0, stationCount: 0 },
  stations: [],
  trend: [],
  businessTypes: [],
  heatmap: null,
  response: { avgDuration: 0, median: 0, p90: 0 },
  satisfaction: { rated: 0, satisfied: 0, rate: 0 },
  duplicates: { total: 0, customerGroups: [], addressGroups: [] }
})
const overview = ref(emptyOverview())
// 上期汇总（环比基准），拉取失败时为 null（界面显示"环比 —"）
const prevTotals = ref(null)

const loadData = async () => {
  loading.value = true
  try {
    // 并行拉取本期与上期（同期）聚合数据；上期仅用于汇总卡环比，失败不阻塞主数据
    const [curRes, prevRes] = await Promise.allSettled([
      store.fetchStationOverview(rangeBounds.value.start, rangeBounds.value.end),
      store.fetchStationOverview(prevRangeBounds.value.start, prevRangeBounds.value.end)
    ])
    overview.value = curRes.status === 'fulfilled' ? curRes.value : emptyOverview()
    prevTotals.value = prevRes.status === 'fulfilled' ? prevRes.value.totals : null
  } catch {
    overview.value = emptyOverview()
    prevTotals.value = null
  } finally {
    loading.value = false
  }
  // 数据刷新后默认展开全部区县（保留用户已手动折叠的？不，刷新后重置为全部展开更符合预期）
  openRegions.value = new Set(regionGroups.value.map(g => g.region))
}

const refreshData = () => { loadData() }

// 切换时间范围（今日/本周/本月/本年）时，重新拉取对应区间的全站汇总数据
watch(range, () => { loadData() })

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

// 跨站趋势：补齐区间缺失的数据点（0 单）
const overviewTrend = computed(() => {
  // 今日：后端/聚合已返回 24 小时时间轴，直接使用
  if (overview.value.trend.length && /^\d{2}:\d{2}$/.test(overview.value.trend[0].date || '')) {
    return overview.value.trend
  }
  // 非今日：按天补齐区间缺日
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

// ===== 跨站接单热力图（与主控台同款，聚合权限范围内全部供电所） =====
const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const heatmap = computed(() => overview.value.heatmap || { grid: Array.from({ length: 7 }, () => Array(24).fill(0)), max: 0 })
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

// ===== 环比（汇总卡副标题）：与上一同期区间对比 =====
// 上期为 0 且本期 >0 时无基准（null → 显示"环比 —"）
const pctDelta = (cur, prev) => {
  if (prev === 0) return cur === 0 ? 0 : null
  return Math.round(((cur - prev) / prev) * 100)
}
const deltas = computed(() => {
  const c = overview.value.totals
  const p = prevTotals.value
  if (!p) return { total: null, done: null, completion: null, overdue: null }
  return {
    total: pctDelta(c.total, p.total),
    done: pctDelta(c.done, p.done),
    completion: c.completion - p.completion,
    overdue: pctDelta(c.overdue, p.overdue)
  }
})
const pctText = (v) => {
  if (v == null) return '环比 —'
  if (v === 0) return '环比持平'
  return `环比 ${v > 0 ? '↑' : '↓'}${Math.abs(v)}%`
}
// 完成率是百分比，环比用百分点差（pp）
const ppText = (v) => {
  if (v == null) return '环比 —'
  if (v === 0) return '环比持平'
  return `环比 ${v > 0 ? '+' : ''}${v}pp`
}

// ===== 跨站响应时长 =====
const formatDuration = (mins) => {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}小时`
  return `${h}h${m}m`
}
// 各站平均耗时排名（慢的在前，突出问题站）
const durationRank = computed(() =>
  overview.value.stations.filter(s => s.avgDuration > 0).sort((a, b) => b.avgDuration - a.avgDuration)
)
const maxAvgDuration = computed(() => Math.max(1, ...durationRank.value.map(s => s.avgDuration)))
const durationPct = (s) => Math.round((s.avgDuration / maxAvgDuration.value) * 100)

// ===== 客户满意度 =====
// 仅统计有评价（rated > 0）的站；展示两极：满意率最高 TOP 3 与最低后 3
// （bottom3 剔除已进 top3 的站，站点过少时自然收敛甚至隐藏）
const ratedStations = computed(() => overview.value.stations.filter(s => s.rated > 0))
const satTop3 = computed(() =>
  [...ratedStations.value]
    .sort((a, b) => b.satisfactionRate - a.satisfactionRate || b.rated - a.rated)
    .slice(0, 3)
)
const satBottom3 = computed(() => {
  const topIds = new Set(satTop3.value.map(s => s.stationId))
  return [...ratedStations.value]
    .sort((a, b) => a.satisfactionRate - b.satisfactionRate || b.rated - a.rated)
    .filter(s => !topIds.has(s.stationId))
    .slice(0, 3)
})
const satClass = (rate) => rate >= 80 ? 'ok' : (rate >= 60 ? 'warn' : 'crit')

// ===== 跨站重复报修 =====
// 组数过多时截断展示，头部 meta 显示全量
const MAX_DUP_GROUPS = 10
const dupCustomerGroups = computed(() => overview.value.duplicates.customerGroups.slice(0, MAX_DUP_GROUPS))
const dupAddressGroups = computed(() => overview.value.duplicates.addressGroups.slice(0, MAX_DUP_GROUPS))
// 点击重复报修工单 → 跳转对应记录详情
const goRecord = (it) => {
  const rid = it?._recordId ?? it?.recordId
  if (!rid) return
  router.push(`/records/${rid}`)
}

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

// ===== 跨站热力图 =====
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

// ===== 响应时长 + 满意度（side-charts 列内卡片） =====
.response-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
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
}
.resp-sub { font-size: 10px; color: $text-muted; margin-top: 2px; }

.sat-hero {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
}
.sat-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  &.ok { color: $ok; }
  &.warn { color: $warn; }
  &.crit { color: $crit; }
}
.sat-sub { font-size: 12px; color: $text-muted; }

// 各站指标条形排名（响应耗时 / 满意率共用）
.rank-block { display: flex; flex-direction: column; gap: 6px; }
.rank-block + .rank-block { margin-top: 12px; }
.rank-title {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: 2px;
}
.rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.rank-name {
  width: 96px;
  flex-shrink: 0;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-track {
  flex: 1;
  height: 8px;
  background: $bg-page;
  border-radius: 4px;
  overflow: hidden;
}
.rank-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 400ms ease;
  &.resp { background: linear-gradient(90deg, #3b82f6, #06b6d4); }
  &.sat-ok { background: linear-gradient(90deg, $ok, #34d399); }
  &.sat-warn { background: linear-gradient(90deg, $warn, #fbbf24); }
  &.sat-crit { background: linear-gradient(90deg, $crit, #f87171); }
}
.rank-val {
  width: 56px;
  text-align: right;
  flex-shrink: 0;
  color: $text-secondary;
  font-weight: 500;
  &.ok { color: $ok; }
  &.warn { color: $warn; }
  &.crit { color: $crit; }
}

// ===== 跨站重复报修 =====
.panel-duplicate { margin-top: 16px; }
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
.dup-cross {
  padding: 1px 8px;
  border-radius: $radius-full;
  font-size: 11px;
  font-weight: 600;
  background: $primary-soft;
  color: $primary;
}
.dup-more { font-size: 11px; color: $text-muted; padding-left: 4px; }

.dup-items { display: flex; flex-direction: column; gap: 4px; }
.dup-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  font-size: 12px;
  cursor: pointer;
  transition: border-color $duration-fast $ease-out;

  &:hover,
  &:focus-visible {
    border-color: $accent;
    outline: none;
  }
}
.dup-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.dup-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: $text-primary;
}
.dup-satisfied {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-size: 11px;
  font-weight: 600;
  background: $ok-soft;
  border: 1px solid $ok-border;
  color: $ok;
}
.dup-item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  font-size: 11px;
  color: $text-secondary;
  min-width: 0;
}
.dup-meta-item {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dup-station {
  color: $primary;
  font-weight: 500;
  background: $primary-soft;
  padding: 1px 8px;
  border-radius: 999px;
}
.dup-item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
}
.dup-result {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-secondary;
}
.dup-time { font-size: 11px; color: $text-muted; flex-shrink: 0; }

// ===== 响应式 =====
@media (max-width: 1100px) {
  .grid-main { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .totals-row { grid-template-columns: repeat(2, 1fr); }
  .response-grid { grid-template-columns: repeat(3, 1fr); }
}
.overview-view.font-large {
  .grid-main { grid-template-columns: 1fr; }
  .donut-wrap { justify-content: center; }
}
</style>
