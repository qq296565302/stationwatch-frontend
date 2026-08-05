<template>
  <div class="page-header">
    <div class="header-main">
      <h1 class="header-title">{{ title }}</h1>
      <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 0 16px;
}

.header-title {
  font-size: $fs-2xl;
  font-weight: $fw-semibold;
  color: $text-primary;
  letter-spacing: $ls-tight;
  line-height: $lh-tight;
}

.header-subtitle {
  margin-top: 4px;
  font-size: $fs-base;
  color: $text-muted;
  max-width: 600px;
  line-height: $lh-snug;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
