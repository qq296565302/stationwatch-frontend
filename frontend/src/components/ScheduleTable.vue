<template>
  <table class="data-table schedule-table">
    <thead>
      <tr>
        <th>日期</th>
        <th>星期</th>
        <th>班次</th>
        <th>班次时间</th>
        <th>值班员</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.date" :class="{ 'row-today': row.date === highlightDate }">
        <td class="font-mono text-secondary">{{ row.date }}</td>
        <td>
          <span :class="isWeekend(row.weekday) ? 'text-warn' : 'text-secondary'">{{ row.weekday }}</span>
        </td>
        <td>
          <span class="tag" :class="row.date === highlightDate ? 'tag-ok' : 'tag-info'">{{ row.groupName }}</span>
          <span v-if="row.date === highlightDate" class="tag-today">今日</span>
        </td>
        <td class="font-mono text-secondary">
          {{ shiftStart }} → 次日 {{ shiftEnd }}
        </td>
        <td>
          <div class="member-list">
            <template v-if="row.members && row.members.length">
              <span
                v-for="m in row.members"
                :key="m.id"
                class="member-chip"
                :class="{ 'chip-me': isHighlighted(m.id) }"
                :title="isHighlighted(m.id) ? '我的值班' : m.realName"
              >
                <span class="chip-avatar">{{ avatarOf(m.realName) }}</span>
                <span class="chip-name">{{ m.realName }}</span>
                <span v-if="isHighlighted(m.id)" class="chip-me-label">本人</span>
              </span>
            </template>
            <span v-else class="text-muted">—</span>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  rows:            { type: Array,  default: () => [] },
  highlightDate:   { type: String, default: null },
  highlightUserIds:{ type: Array,  default: () => [] }
})

// 班次时间：每个班次从当日 08:30 到次日 08:30（固定规则）
const shiftStart = '08:30'
const shiftEnd = '08:30'

const highlightSet = computed(() => new Set(props.highlightUserIds.map(Number)))
const isHighlighted = (id) => highlightSet.value.has(Number(id))

// 中文名取最后一个字作头像，英文取首字母大写
const avatarOf = (name) => {
  const n = (name || '').trim()
  if (!n) return '?'
  const ch = n[n.length - 1]
  return /[一-龥]/.test(ch) ? ch : ch.toUpperCase()
}

const isWeekend = (w) => w === '周六' || w === '周日'
</script>

<style lang="scss" scoped>
.schedule-table {
  tbody tr.row-today td {
    background: $accent-soft;
  }

  .tag-today {
    margin-left: 6px;
    font-size: $fs-xs;
    color: $accent;
    font-weight: $fw-semibold;
  }
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 3px;
  background: $bg-subtle;
  border: 1px solid $border-base;
  border-radius: 999px;
  cursor: default;

  &.chip-me {
    background: $accent-soft;
    border-color: $accent;
  }
}

.chip-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary, $accent-violet);
  color: $text-inverse;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chip-name {
  font-size: $fs-sm;
  color: $text-primary;
  white-space: nowrap;
}

.chip-me-label {
  font-size: 10px;
  color: $accent;
  font-weight: $fw-semibold;
  white-space: nowrap;
}
</style>
