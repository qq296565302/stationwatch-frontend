<template>
  <div class="trend-chart" ref="boxRef">
    <svg :width="dims.w" :height="dims.h" :viewBox="`0 0 ${dims.w} ${dims.h}`" @mousemove="onMove" @mouseleave="hovered = -1; tip = null">
      <!-- 网格 -->
      <g class="grid">
        <line
          v-for="(y, i) in yTicks" :key="'gy'+i"
          :x1="padding.l" :x2="dims.w - padding.r"
          :y1="y" :y2="y"
          stroke="#f1f5f9" stroke-width="1"
        />
      </g>
      <!-- Y 轴标签 -->
      <g class="y-labels">
        <text
          v-for="(y, i) in yTicks" :key="'yl'+i"
          :x="padding.l - 6" :y="y + 3"
          text-anchor="end" font-size="10" fill="#94a3b8"
        >{{ yScale.invert(y).toFixed(0) }}</text>
      </g>
      <!-- X 轴标签 -->
      <g class="x-labels">
        <text
          v-for="(d, i) in xLabels" :key="'xl'+i"
          :x="xScale(d.x)" :y="dims.h - padding.b + 14"
          text-anchor="middle" font-size="10" fill="#94a3b8"
        >{{ d.label }}</text>
      </g>
      <!-- 数据 -->
      <g v-if="mode === 'line'">
        <path
          v-for="(series, si) in displaySeries" :key="'p'+si"
          :d="pathFor(series, si)"
          fill="none" :stroke="series.color" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
        />
        <circle
          v-for="(d, di) in flatData" :key="'c'+di"
          :cx="xScale(d.x)" :cy="yScale(d.y)"
          r="3" :fill="d.color"
          :opacity="hovered === -1 || hovered === di ? 1 : 0.4"
        >
          <title>{{ d.label }} · {{ d.seriesLabel }}: {{ d.y }}</title>
        </circle>
      </g>
      <g v-else>
        <rect
          v-for="(d, i) in flatData" :key="'b'+i"
          :x="xScale(d.x) - barWidth / 2"
          :y="yScale(d.y)"
          :width="barWidth" :height="dims.h - padding.b - yScale(d.y)"
          :fill="d.color" rx="2"
          :opacity="hovered === -1 || hovered === i ? 1 : 0.45"
        >
          <title>{{ d.label }} · {{ d.seriesLabel }}: {{ d.y }}</title>
        </rect>
      </g>
    </svg>
    <!-- 悬停数据提示：Teleport 到 body + fixed 定位，避免被父容器 overflow 裁剪 -->
    <Teleport to="body">
      <div
        v-if="tip"
        class="trend-tip"
        :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
      >
        <div class="trend-tip-title">{{ tip.date }}</div>
        <div
          v-for="(it, idx) in tip.items"
          :key="idx"
          class="trend-tip-row"
        >
          <i class="trend-tip-dot" :style="{ background: it.color }"></i>
          <span class="trend-tip-label">{{ it.label }}</span>
          <b class="trend-tip-value">{{ it.value }}</b>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },  // [{ date, total, done, pending }]
  mode: { type: String, default: 'line' }, // line | bar
  series: { type: Array, default: () => [
    { key: 'total', label: '接单数', color: '#3b82f6' },
    { key: 'done', label: '已完成', color: '#10b981' },
    { key: 'pending', label: '未完成', color: '#f59e0b' }
  ] },
  height: { type: Number, default: 200 },
  // 小时格式（如 08:00）原样显示；日期格式（YYYY-MM-DD）显示 MM-DD
  xFormatter: { type: Function, default: (d) => (d && d.includes(':') ? d : (d || '').slice(5)) }
})

const boxRef = ref(null)
const boxWidth = ref(600)
const hovered = ref(-1)
// 悬停数据提示：{ x, y, date, items: [{label, value, color}] }
const tip = ref(null)

let ro = null
onMounted(() => {
  const update = () => {
    if (boxRef.value) boxWidth.value = boxRef.value.clientWidth
  }
  update()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(update)
    if (boxRef.value) ro.observe(boxRef.value)
  } else {
    window.addEventListener('resize', update)
  }
})
onUnmounted(() => {
  if (ro) ro.disconnect()
  else window.removeEventListener('resize', update)
})

const padding = { l: 32, r: 12, t: 12, b: 28 }
const dims = computed(() => ({
  w: Math.max(280, boxWidth.value),
  h: props.height
}))

// 抽出所有 y 值计算 max
const yMax = computed(() => {
  const all = props.data.flatMap(d => props.series.map(s => d[s.key] || 0))
  const m = Math.max(0, ...all)
  if (m === 0) return 10
  // nice scale: 向上取整
  return Math.ceil(m * 1.15)
})

const yTicks = computed(() => {
  const count = 4
  const step = yMax.value / count
  return Array.from({ length: count + 1 }, (_, i) => step * i)
})

const yScale = computed(() => {
  const t = dims.value.h - padding.b
  const top = padding.t
  const scale = (val) => {
    const max = yMax.value
    return t - (val / max) * (t - top)
  }
  scale.invert = (y) => {
    const max = yMax.value
    return ((t - y) / (t - top)) * max
  }
  return scale
})

const xLabels = computed(() => {
  if (!props.data.length) return []
  // 小时时间轴（24h）：每 4 小时显示一个标签，避免 24 个标签相互重叠
  const isHourly = props.data[0].date && props.data[0].date.includes(':')
  const skip = isHourly ? 4 : Math.max(1, Math.floor(props.data.length / 8))
  return props.data
    .map((d, i) => ({ x: i, label: props.xFormatter(d.date) }))
    .filter((_, i) => i % skip === 0 || i === props.data.length - 1)
})

const xScale = computed(() => {
  const w = dims.value.w - padding.l - padding.r
  const n = Math.max(1, props.data.length - 1)
  return (i) => padding.l + (i / n) * w
})

const barWidth = computed(() => {
  const slot = (dims.value.w - padding.l - padding.r) / Math.max(1, props.data.length)
  return Math.max(2, slot * 0.5 / props.series.length)
})

const displaySeries = computed(() => {
  return props.series.map(s => ({
    ...s,
    points: props.data.map((d, i) => ({ x: i, y: d[s.key] || 0 }))
  }))
})

const pathFor = (series) => {
  if (series.points.length === 0) return ''
  return series.points
    .map((p, i) => (i === 0 ? 'M' : 'L') + xScale.value(p.x) + ',' + yScale.value(p.y))
    .join(' ')
}

const flatData = computed(() => {
  const result = []
  props.data.forEach((d, i) => {
    props.series.forEach(s => {
      result.push({
        x: i,
        y: d[s.key] || 0,
        label: d.date,
        seriesLabel: s.label,
        color: s.color
      })
    })
  })
  return result
})

const onMove = (e) => {
  if (!boxRef.value) return
  const rect = boxRef.value.querySelector('svg').getBoundingClientRect()
  const px = e.clientX - rect.left
  const slot = (dims.value.w - padding.l - padding.r) / Math.max(1, props.data.length)
  const i = Math.floor((px - padding.l) / slot)
  hovered.value = (i >= 0 && i < props.data.length) ? i : -1

  if (hovered.value < 0) { tip.value = null; return }
  const d = props.data[hovered.value]
  // 该 x 列的数据点
  const items = props.series
    .map(s => ({ label: s.label, value: d[s.key] || 0, color: s.color }))
    .filter(it => it.value > 0)
  // 有值才显示 tip；全 0 则无内容不弹
  if (!items.length) { tip.value = null; return }

  // Teleport 到 body 用 fixed 定位：基于鼠标视口坐标，显示在鼠标上方，并规避视口边界
  const tipW = 150
  let left = e.clientX + 12
  if (left + tipW > window.innerWidth - 8) left = e.clientX - tipW - 12
  let top = e.clientY - 12
  if (top < 8) top = e.clientY + 18

  tip.value = {
    x: left,
    y: top,
    date: props.xFormatter(d.date),
    items
  }
}
</script>

<style lang="scss" scoped>
.trend-chart {
  width: 100%;
  position: relative;
}
svg { display: block; }

.trend-tip {
  position: fixed;
  z-index: 9999;
  min-width: 128px;
  max-width: 180px;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.18);
  pointer-events: none;
}

.trend-tip-title {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}
.trend-tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1.5px 0;
  font-size: 12px;
  color: #e2e8f0;
}
.trend-tip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.trend-tip-label { flex: 1; }
.trend-tip-value {
  font-variant-numeric: tabular-nums;
  color: #fff;
  font-weight: 600;
}
</style>
