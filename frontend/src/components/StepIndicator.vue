<template>
  <div class="step-indicator">
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="step"
      :class="{
        active: currentStep === index,
        done: currentStep > index
      }"
    >
      <div class="step-marker">
        <svg v-if="currentStep > index" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span v-else class="step-num">{{ index + 1 }}</span>
      </div>
      <div class="step-text">
        <div class="step-label">{{ step.label }}</div>
        <div v-if="step.sub" class="step-sub">{{ step.sub }}</div>
      </div>
      <div v-if="index < steps.length - 1" class="step-line"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentStep: { type: Number, default: 0 },
  steps: {
    type: Array,
    default: () => [
      { label: '基本信息', sub: 'Basic' },
      { label: '值班事项', sub: 'Items' },
      { label: '其他事项', sub: 'Other' }
    ]
  }
})
</script>

<style lang="scss" scoped>
.step-indicator {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: $radius-lg;
}

.step {
  display: flex;
  align-items: center;
  flex: 1;
  position: relative;
}

.step-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: $bg-card;
  border: 1.5px solid $border-base;
  color: $text-muted;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-base;
  font-weight: $fw-semibold;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: all $duration-base $ease-out;

  svg { width: 12px; height: 12px; }
}

.step-text {
  margin-left: 10px;
  line-height: 1.3;
}

.step-label {
  font-size: $fs-base;
  font-weight: $fw-medium;
  color: $text-secondary;
  transition: color $duration-base $ease-out;
}

.step-sub {
  font-size: $fs-xs;
  color: $text-muted;
  margin-top: 1px;
}

.step-line {
  flex: 1;
  height: 1.5px;
  background: $border-base;
  margin: 0 16px;
  border-radius: 1px;
  transition: background $duration-base $ease-out;
}

.step.active {
  .step-marker {
    background: $primary;
    border-color: $primary;
    color: $text-inverse;
  }
  .step-label { color: $text-primary; font-weight: $fw-semibold; }
}

.step.done {
  .step-marker {
    background: $ok-soft;
    border-color: $ok;
    color: $ok;
  }
  .step-label { color: $text-primary; }
  .step-line { background: $ok; }
}
</style>
