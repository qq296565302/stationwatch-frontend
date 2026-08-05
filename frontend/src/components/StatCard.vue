<template>
  <div class="stat-card">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value-row">
      <span class="stat-value">{{ value }}</span>
      <span v-if="unit" class="stat-unit">{{ unit }}</span>
    </div>
    <div v-if="sub" class="stat-sub">{{ sub }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  sub: { type: String, default: '' }
})
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

.stat-label {
  font-size: $fs-base;
  color: $text-muted;
  margin-bottom: 8px;
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
