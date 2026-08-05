<template>
  <div class="trend-chart" ref="boxRef">
    <svg :width="dims.w" :height="dims.h" :viewBox="`0 0 ${dims.w} ${dims.h}`" @mousemove="onMove" @mouseleave="hovered = -1">
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
  xFormatter: { type: Function, default: (d) => d.slice(5) }
})

const boxRef = ref(null)
const boxWidth = ref(600)
const hovered = ref(-1)

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
  const skip = Math.max(1, Math.floor(props.data.length / 8))
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
  // 简单 hover
  if (!boxRef.value) return
  const rect = boxRef.value.querySelector('svg').getBoundingClientRect()
  const px = e.clientX - rect.left
  const slot = (dims.value.w - padding.l - padding.r) / Math.max(1, props.data.length)
  const i = Math.floor((px - padding.l) / slot)
  hovered.value = (i >= 0 && i < props.data.length) ? i : -1
}
</script>

<style lang="scss" scoped>
.trend-chart { width: 100%; }
svg { display: block; }
</style>
