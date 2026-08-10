<template>
  <div class="time-picker" :class="{ open: isOpen }">
    <button
      type="button"
      class="time-trigger"
      :class="{ filled: modelValue, error: error }"
      @click="toggleOpen"
    >
      <span v-if="modelValue" class="time-value font-mono">{{ modelValue }}</span>
      <span v-else class="time-placeholder font-mono">--:--</span>
      <span class="time-icon" :class="{ up: isOpen }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9"/>
          <polyline points="12 7 12 12 15 14"/>
        </svg>
      </span>
    </button>

    <transition name="dropdown">
      <div v-show="isOpen" class="time-panel" @mousedown.prevent>
        <div class="panel-header">
          <span class="panel-title">选择时间</span>
          <button v-if="modelValue" type="button" class="panel-clear" @click="clear">清除</button>
        </div>

        <div class="panel-body">
          <!-- 小时列 -->
          <div class="time-col">
            <div class="col-head">时</div>
            <div class="col-grid hours-grid">
              <button
                v-for="h in hours"
                :key="`h${h}`"
                type="button"
                class="cell"
                :class="{ active: hour === h, disabled: isHourDisabled(h) }"
                :disabled="isHourDisabled(h)"
                @click="pickHour(h)"
              >
                {{ pad(h) }}
              </button>
            </div>
          </div>

          <!-- 分钟列 -->
          <div class="time-col">
            <div class="col-head">分</div>
            <div class="col-grid minutes-grid">
              <button
                v-for="m in minutes"
                :key="`m${m}`"
                type="button"
                class="cell"
                :class="{ active: minute === m, disabled: isMinuteDisabled(m) }"
                :disabled="isMinuteDisabled(m)"
                @click="pickMinute(m)"
              >
                {{ pad(m) }}
              </button>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <button type="button" class="now-btn" @click="setNow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="9"/>
              <polyline points="12 7 12 12 15 14"/>
            </svg>
            当前时间
          </button>
          <span v-if="limitToNow" class="limit-hint">仅可选择当前及之前时间</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  error:      { type: Boolean, default: false },
  // 为 true 时：打开面板按「当前时间」为上限，晚于当前的时间格子禁用（用于受理时间，防误选未来）
  limitToNow: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const isOpen = ref(false)

// 打开面板时取一次当前时间作为选择上限（limitToNow 开启时生效）
const nowHour = ref(23)
const nowMinute = ref(59)

// 把外部 modelValue 解析为 hour / minute
const hour = computed(() => {
  if (!props.modelValue || !/^\d{1,2}:\d{2}$/.test(props.modelValue)) return null
  return Number(props.modelValue.split(':')[0])
})

const minute = computed(() => {
  if (!props.modelValue || !/^\d{1,2}:\d{2}$/.test(props.modelValue)) return null
  return Number(props.modelValue.split(':')[1])
})

const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

const pad = (n) => String(n).padStart(2, '0')

const refreshNow = () => {
  const d = new Date()
  nowHour.value = d.getHours()
  nowMinute.value = d.getMinutes()
}

// 小时格子禁用：晚于当前小时
const isHourDisabled = (h) => props.limitToNow && h > nowHour.value

// 分钟格子禁用：所选小时晚于当前小时，或所选小时等于当前小时但分钟更晚
const isMinuteDisabled = (m) =>
  props.limitToNow &&
  (hour.value === null || hour.value > nowHour.value ||
    (hour.value === nowHour.value && m > nowMinute.value))

const toggleOpen = () => {
  if (!isOpen.value && props.limitToNow) refreshNow()
  isOpen.value = !isOpen.value
}

const pickHour = (h) => {
  const m = minute.value !== null ? minute.value : 0
  emit('update:modelValue', `${pad(h)}:${pad(m)}`)
}

const pickMinute = (m) => {
  const h = hour.value !== null ? hour.value : 0
  emit('update:modelValue', `${pad(h)}:${pad(m)}`)
  isOpen.value = false
}

const setNow = () => {
  const d = new Date()
  const h = d.getHours()
  // 分钟向下对齐到 5 分钟一档
  const m = Math.floor(d.getMinutes() / 5) * 5
  emit('update:modelValue', `${pad(h)}:${pad(m)}`)
  isOpen.value = false
}

const clear = () => {
  emit('update:modelValue', '')
  isOpen.value = false
}

// 点击外部关闭
const onDocClick = (e) => {
  if (!e.target.closest('.time-picker')) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<style lang="scss" scoped>
.time-picker {
  position: relative;
  display: inline-block;
  width: 100%;
}

.time-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  color: $text-primary;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease;
  outline: none;
  text-align: left;

  &:hover { border-color: $border-strong; }
  &.error { border-color: $warn; }

  .time-placeholder { color: $text-muted; }
}

.open .time-trigger {
  border-color: $accent;
  box-shadow: 0 0 0 3px $accent-soft;
}

.time-icon {
  display: flex;
  align-items: center;
  color: $text-muted;
  transition: transform 120ms ease, color 120ms ease;
  flex-shrink: 0;

  svg { width: 13px; height: 13px; }

  &.up { transform: rotate(180deg); color: $accent; }
}

.open .time-icon { color: $accent; }

// ---- 弹层 ----
.time-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: $z-overlay;
  background: $bg-elevated;
  border: 1px solid $border-base;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
  width: 280px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid $border-subtle;
}

.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
}

.panel-clear {
  font-size: 11px;
  color: $text-muted;
  background: transparent;
  border: none;
  padding: 2px 4px;
  cursor: pointer;

  &:hover { color: $crit; }
}

.panel-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}

.time-col {
  background: $bg-elevated;
  display: flex;
  flex-direction: column;
}

.col-head {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 500;
  color: $text-muted;
  text-align: center;
  background: $bg-page;
  border-bottom: 1px solid $border-subtle;
}

.col-grid {
  display: grid;
  padding: 4px;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
}

.hours-grid { grid-template-columns: repeat(4, 1fr); }
.minutes-grid { grid-template-columns: repeat(3, 1fr); }

.cell {
  padding: 6px 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-family: $font-mono;
  font-size: 12px;
  color: $text-primary;
  cursor: pointer;
  transition: all 80ms ease;

  &:hover {
    background: $bg-hover;
  }

  &.disabled {
    color: $text-faint;
    cursor: not-allowed;

    &:hover { background: transparent; }
  }

  &.active {
    background: $primary;
    color: $text-inverse;
    font-weight: 600;

    &:hover { background: $primary-hover; }
  }
}

.panel-footer {
  padding: 8px;
  border-top: 1px solid $border-subtle;
}

.now-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid $border-base;
  border-radius: 4px;
  font-size: 12px;
  color: $text-secondary;
  cursor: pointer;
  transition: all 120ms ease;

  svg { width: 12px; height: 12px; }

  &:hover {
    border-color: $accent;
    color: $accent;
    background: $accent-soft;
  }
}

.limit-hint {
  display: block;
  margin-top: 6px;
  text-align: center;
  font-size: 11px;
  color: $text-muted;
}

// ---- 动画 ----
.dropdown-enter-active,
.dropdown-leave-active { transition: opacity 100ms ease, transform 100ms ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>