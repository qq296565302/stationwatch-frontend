<template>
  <div ref="rootEl" class="combobox" :class="{ open: isOpen, focused: isFocused }">
    <div class="combobox-input-wrap">
      <input
        ref="inputEl"
        v-model="inputValue"
        type="text"
        class="combobox-input"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.down.prevent="moveCursor(1)"
        @keydown.up.prevent="moveCursor(-1)"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="onEsc"
        @keydown.tab="onTab"
      />
      <span v-if="inputValue" class="clear-btn" @mousedown.prevent @click="clear">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
      <span v-else class="dropdown-arrow" :class="{ up: isOpen }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </div>

    <Teleport to="body">
    <transition name="dropdown">
      <div v-show="isOpen" class="combobox-dropdown" :style="dropdownStyle">
        <div v-if="filteredOptions.length" class="dropdown-list">
          <div
            v-for="(opt, idx) in filteredOptions"
            :key="idx"
            class="dropdown-item"
            :class="{ active: idx === activeIndex, exact: opt.isExact }"
            @mousedown.prevent="selectOption(opt)"
            @mouseenter="activeIndex = idx"
          >
            <span class="item-text" v-html="highlight(opt.label)"></span>
            <span v-if="opt.isExact" class="item-badge">精确</span>
          </div>
        </div>
        <div v-else class="dropdown-empty">
          <span>没有匹配项</span>
          <span v-if="allowCreate && inputValue.trim()" class="empty-hint">
            按 <kbd>Enter</kbd> 添加「{{ inputValue }}」
          </span>
        </div>
      </div>
    </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options:     { type: Array, required: true },
  placeholder: { type: String, default: '请输入或选择...' },
  allowCreate: { type: Boolean, default: true },
  disabled:    { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select'])

const inputEl = ref(null)
const inputValue = ref(props.modelValue || '')
const isOpen = ref(false)
const isFocused = ref(false)
const activeIndex = ref(0)
const rootEl = ref(null)
const dropdownStyle = ref({})

// Teleport 定位：下拉 fixed 渲染在 input 下方，避免被父容器 overflow 裁剪
const positionDropdown = () => {
  if (!rootEl.value) return
  const rect = rootEl.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: 9999
  }
}
const openDropdown = () => {
  isOpen.value = true
  nextTick(positionDropdown)
  window.addEventListener('scroll', positionDropdown, true)
  window.addEventListener('resize', positionDropdown)
}
const closeDropdown = () => {
  isOpen.value = false
  window.removeEventListener('scroll', positionDropdown, true)
  window.removeEventListener('resize', positionDropdown)
}

watch(() => props.modelValue, (v) => {
  if (v !== inputValue.value) inputValue.value = v || ''
})

// 过滤 + 排序：开头匹配 > 包含匹配；标记精确匹配项
const filteredOptions = computed(() => {
  const q = inputValue.value.trim().toLowerCase()
  if (!q) {
    return props.options.map(o => ({ label: o, value: o, isExact: false }))
  }
  const starts = []
  const contains = []
  const exact = []
  for (const o of props.options) {
    const lower = o.toLowerCase()
    if (lower === q) {
      exact.push({ label: o, value: o, isExact: true })
    } else if (lower.startsWith(q)) {
      starts.push({ label: o, value: o, isExact: false })
    } else if (lower.includes(q)) {
      contains.push({ label: o, value: o, isExact: false })
    }
  }
  return [...exact, ...starts, ...contains]
})

const onInput = () => {
  activeIndex.value = 0
  openDropdown()
  emit('update:modelValue', inputValue.value)
}

const onFocus = () => {
  isFocused.value = true
  activeIndex.value = 0
  openDropdown()
}

const onBlur = () => {
  isFocused.value = false
  // 延迟关闭，允许点击下拉
  setTimeout(() => { closeDropdown() }, 150)
}

const moveCursor = (delta) => {
  if (!isOpen.value) openDropdown()
  const max = filteredOptions.value.length
  if (max === 0) return
  let next = activeIndex.value + delta
  if (next < 0) next = max - 1
  if (next >= max) next = 0
  activeIndex.value = next
  scrollToActive()
}

const onEnter = () => {
  if (!isOpen.value) return
  const list = filteredOptions.value
  if (list.length > 0 && list[activeIndex.value]) {
    selectOption(list[activeIndex.value])
  } else if (props.allowCreate && inputValue.value.trim()) {
    commitValue(inputValue.value.trim())
    isOpen.value = false
  }
}

const onEsc = () => {
  closeDropdown()
  inputEl.value?.blur()
}

const onTab = () => {
  if (isOpen.value) closeDropdown()
}

const selectOption = (opt) => {
  inputValue.value = opt.value
  commitValue(opt.value)
  closeDropdown()
  emit('select', opt.value)
}

const commitValue = (v) => {
  emit('update:modelValue', v)
}

const clear = () => {
  inputValue.value = ''
  emit('update:modelValue', '')
  closeDropdown()
  nextTick(() => inputEl.value?.focus())
}

const scrollToActive = () => {
  nextTick(() => {
    // 下拉已 Teleport 到 body，改为从 document 查询
    const el = document.querySelector('.combobox-dropdown .dropdown-item.active')
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', positionDropdown, true)
  window.removeEventListener('resize', positionDropdown)
})

// 高亮匹配字符（安全方式，不用 v-html 风险）
const highlight = (text) => {
  const q = inputValue.value.trim()
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return `${escapeHtml(before)}<mark>${escapeHtml(match)}</mark>${escapeHtml(after)}`
}

const escapeHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
</script>

<style lang="scss" scoped>
.combobox {
  position: relative;
  width: 100%;
}

.combobox-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.combobox-input {
  width: 100%;
  padding: 8px 28px 8px 12px;
  font-family: $font-body;
  font-size: 13px;
  color: $text-primary;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;

  &::placeholder { color: $text-muted; }

  &:hover:not(:disabled) { border-color: $border-strong; }

  &:focus {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }

  &:disabled {
    background: $bg-page;
    color: $text-muted;
    cursor: not-allowed;
  }
}

.open .combobox-input { border-color: $accent; }
.focused .combobox-input { border-color: $accent; box-shadow: 0 0 0 3px $accent-soft; }

.clear-btn,
.dropdown-arrow {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: $text-muted;
  cursor: pointer;
  user-select: none;

  svg { width: 12px; height: 12px; }

  &:hover { color: $text-primary; }
}

.dropdown-arrow {
  pointer-events: none;
  transition: transform 120ms ease;
  &.up { transform: rotate(180deg); }
}

// ---- 下拉面板（Teleport 到 body，fixed 定位由 JS 计算） ----
.combobox-dropdown {
  background: $bg-elevated;
  border: 1px solid $border-base;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.dropdown-list { display: flex; flex-direction: column; gap: 1px; }

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: $text-primary;
  transition: background 80ms ease;

  &:hover { background: $bg-hover; }

  &.active {
    background: $accent-soft;
    color: $accent;
  }

  &.exact {
    background: $bg-page;

    &.active { background: $accent-soft; }
  }

  :deep(mark) {
    background: transparent;
    color: $warn;
    font-weight: 600;
    padding: 0;
  }
}

.item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-badge {
  font-size: 10px;
  font-weight: 500;
  color: $text-muted;
  padding: 1px 6px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 3px;
  flex-shrink: 0;
}

.dropdown-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  color: $text-muted;
  font-size: 13px;
}

.empty-hint {
  font-size: 12px;
  color: $text-secondary;

  kbd {
    display: inline-block;
    padding: 1px 5px;
    background: $bg-card;
    border: 1px solid $border-base;
    border-bottom-width: 2px;
    border-radius: 3px;
    font-family: $font-mono;
    font-size: 10px;
    color: $text-secondary;
    margin: 0 2px;
  }
}

// ---- 动画 ----
.dropdown-enter-active,
.dropdown-leave-active { transition: opacity 100ms ease, transform 100ms ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
