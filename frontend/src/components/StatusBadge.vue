<template>
  <span class="badge" :class="`badge-${variant}`">
    <span v-if="dot" class="badge-dot" :class="`badge-dot-${variant}`"></span>
    {{ label }}
  </span>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  variant: { type: String, default: 'muted' }, // ok | warn | crit | info | muted | primary
  dot: { type: Boolean, default: false }
})
</script>

<style lang="scss" scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  font-size: $fs-sm;
  font-weight: $fw-medium;
  border-radius: $radius-sm;
  border: 1px solid transparent;
  white-space: nowrap;
  line-height: 1.5;

  &-ok      { background: $ok-soft;    color: #047857;     border-color: $ok-border; }
  &-warn    { background: $warn-soft;  color: #b45309;     border-color: $warn-border; }
  &-crit    { background: $crit-soft;  color: #b91c1c;     border-color: $crit-border; }
  &-info    { background: $info-soft;  color: $accent;     border-color: $accent-border; }
  &-muted   { background: $bg-subtle;  color: $text-secondary; border-color: $border-base; }
  &-primary { background: $primary-soft; color: $primary;  border-color: $border-base; }
}

.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
</style>
