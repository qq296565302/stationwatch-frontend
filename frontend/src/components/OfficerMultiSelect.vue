<template>
  <div class="officer-multi-select">
    <!-- 候选办理人员：点击标签多选 -->
    <div v-if="candidates.length" class="candidate-list">
      <button
        v-for="c in candidates"
        :key="c"
        type="button"
        class="candidate-chip"
        :class="{ selected: selectedSet.has(c) }"
        @click="toggle(c)"
      >{{ c }}</button>
    </div>

    <!-- 已选人员 + 手动输入补充 -->
    <div class="selected-row">
      <span v-for="(name, i) in selected" :key="i" class="selected-chip">
        {{ name }}
        <button type="button" class="chip-remove" title="移除" @click="removeAt(i)">×</button>
      </span>
      <input
        v-model="draft"
        class="officer-input"
        placeholder="输入姓名后回车添加"
        @keydown.enter.prevent="addDraft"
        @blur="addDraft"
        @keydown.tab.prevent="addDraft"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  // 当前办理人员：逗号/顿号拼接的字符串，如 "张三、李四"
  modelValue: { type: String, default: '' },
  // 候选办理人员列表（字符串数组）
  candidates: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

// 把字符串拆为姓名数组（兼容 、 ， , 分隔）
const selected = computed(() =>
  (props.modelValue || '').split(/[、，,]/).map(s => s.trim()).filter(Boolean)
)
const selectedSet = computed(() => new Set(selected.value))

const toggle = (name) => {
  const set = new Set(selectedSet.value)
  if (set.has(name)) set.delete(name)
  else set.add(name)
  emit('update:modelValue', [...set].join('、'))
}

const removeAt = (i) => {
  emit('update:modelValue', selected.value.filter((_, idx) => idx !== i).join('、'))
}

const draft = ref('')
const addDraft = () => {
  const v = draft.value.trim()
  if (v && !selectedSet.value.has(v)) {
    emit('update:modelValue', [...selectedSet.value, v].join('、'))
  }
  draft.value = ''
}
</script>

<style lang="scss" scoped>
.officer-multi-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.candidate-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.candidate-chip {
  padding: 4px 12px;
  font-size: 13px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: 999px;
  color: $text-secondary;
  cursor: pointer;
  transition: all 120ms ease;
  &:hover { border-color: $primary; color: $primary; }
  &.selected {
    background: $primary-soft;
    border-color: $primary;
    color: $primary;
    font-weight: 600;
  }
}
.selected-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 10px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: 8px;
}
.selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 10px;
  font-size: 12px;
  background: $primary-soft;
  color: $primary;
  border-radius: 6px;
}
.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: $primary;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  &:hover { background: $primary; color: $text-inverse; }
}
.officer-input {
  flex: 1;
  min-width: 140px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: $text-primary;
  &::placeholder { color: $text-muted; }
}
</style>
