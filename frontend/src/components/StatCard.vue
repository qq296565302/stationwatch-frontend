<template>
  <div
    class="stat-card"
    :class="{ 'stat-card--critical': variant === 'critical', 'stat-card--clickable': !!to }"
    :role="to ? 'link' : undefined"
    :tabindex="to ? 0 : -1"
    :aria-label="to ? `${label}，点击查看` : undefined"
    @click="onClick"
    @keydown.enter="onClick"
  >
    <div class="stat-label">
      {{ label }}
      <span v-if="to" class="stat-arrow">查看 →</span>
    </div>
    <div class="stat-value-row">
      <span class="stat-value">{{ value }}</span>
      <span v-if="unit" class="stat-unit">{{ unit }}</span>
    </div>
    <div v-if="sub" class="stat-sub">{{ sub }}</div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  sub: { type: String, default: '' },
  // 卡片外观：'default' | 'critical'（红色预警主题）
  variant: { type: String, default: 'default' },
  // 跳转路径：非空时整卡可点击
  to: { type: String, default: '' }
})

const router = useRouter()

const onClick = () => {
  if (props.to) router.push(props.to)
}
</script>

<style lang="scss" scoped>
.stat-card {
  padding: 16px 20px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: $radius-lg;
  transition: border-color $duration-fast $ease-out;

  &:hover {
    border-color: $border-strong;
  }
}

.stat-card--clickable {
  cursor: pointer;
}

.stat-card--critical {
  background: $crit-soft;
  border-color: $crit-border;

  &:hover {
    border-color: $crit;
  }

  .stat-label {
    color: $crit;
  }

  .stat-value {
    color: $crit;
  }
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: $fs-base;
  color: $text-muted;
  margin-bottom: 8px;
}

.stat-arrow {
  font-size: $fs-sm;
  font-weight: $fw-medium;
  color: $crit;
  opacity: 0;
  transition: opacity $duration-fast $ease-out;

  .stat-card--clickable:hover &,
  .stat-card--clickable:focus-visible & {
    opacity: 1;
  }
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: $fs-2xl;
  font-weight: $fw-semibold;
  color: $text-primary;
  line-height: 1;
  letter-spacing: $ls-tight;
}

.stat-unit {
  font-size: $fs-base;
  color: $text-muted;
  font-weight: $fw-medium;
}

.stat-sub {
  margin-top: 6px;
  font-size: $fs-sm;
  color: $text-muted;
}
</style>
