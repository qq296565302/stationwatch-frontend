<template>
  <div class="donut-chart">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <!-- 背景圆环 -->
      <circle
        :cx="size/2" :cy="size/2" :r="radius"
        fill="none" :stroke="trackColor" :stroke-width="strokeWidth"
      />
      <!-- 数据弧 -->
      <g v-for="(seg, i) in segments" :key="i">
        <circle
          :cx="size/2" :cy="size/2" :r="radius"
          fill="none" :stroke="seg.color" :stroke-width="strokeWidth"
          :stroke-dasharray="`${seg.length} ${circumference - seg.length}`"
          :stroke-dashoffset="seg.offset"
          stroke-linecap="butt"
          class="donut-seg"
          @mouseenter="hovered = i"
          @mouseleave="hovered = -1"
        >
          <title>{{ seg.label }}: {{ seg.value }} ({{ seg.percent }}%)</title>
        </circle>
      </g>
      <!-- 中心文本 -->
      <text
        :x="size/2" :y="size/2 - 4"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="size*0.18" font-weight="600" fill="currentColor"
      >{{ total }}</text>
      <text
        :x="size/2" :y="size/2 + size*0.12"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="size*0.075" fill="var(--text-muted, #94a3b8)"
      >{{ centerLabel }}</text>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },
  size: { type: Number, default: 180 },
  strokeWidth: { type: Number, default: 28 },
  trackColor: { type: String, default: '#f1f5f9' },
  centerLabel: { type: String, default: '总数' }
})

const hovered = ref(-1)

const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))

const segments = computed(() => {
  if (total.value === 0) return []
  let acc = 0
  return props.data.map((d, i) => {
    const percent = (d.value / total.value) * 100
    const length = (d.value / total.value) * circumference.value
    const seg = {
      label: d.label,
      value: d.value,
      percent: Math.round(percent),
      color: d.color || palette[i % palette.length],
      length,
      offset: -acc
    }
    acc += length
    return seg
  })
})
</script>

<style lang="scss" scoped>
.donut-chart {
  display: inline-block;
  svg { display: block; }
}
.donut-seg {
  transition: opacity 200ms ease, stroke-width 200ms ease;
  cursor: pointer;
  &:hover { opacity: 0.85; }
}
</style>
