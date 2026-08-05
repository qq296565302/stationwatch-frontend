<template>
  <div class="line-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" class="chart-svg">
      <defs>
        <linearGradient :id="`grad-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.15"/>
          <stop offset="100%" :stop-color="color" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path :d="areaPath" :fill="`url(#grad-${uid})`" />
      <path
        :d="linePath"
        :stroke="color"
        stroke-width="1.5"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="chart-line"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },
  width: { type: Number, default: 600 },
  height: { type: Number, default: 160 },
  color: { type: String, default: '#0f172a' }
})

const uid = Math.random().toString(36).slice(2, 9)

const points = computed(() => {
  if (!props.data.length) return []
  const values = props.data.map(d => d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = props.width / (props.data.length - 1 || 1)

  return props.data.map((d, i) => ({
    x: i * stepX,
    y: props.height - ((d.value - min) / range) * (props.height - 16) - 8
  }))
})

const linePath = computed(() => {
  if (!points.value.length) return ''
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
})

const areaPath = computed(() => {
  if (!points.value.length) return ''
  const linePart = points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
  return `${linePart} L ${points.value[points.value.length - 1].x} ${props.height} L 0 ${props.height} Z`
})
</script>

<style lang="scss" scoped>
.line-chart {
  width: 100%;
  height: 100%;
}

.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-line {
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: line-draw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes line-draw {
  to { stroke-dashoffset: 0; }
}
</style>
