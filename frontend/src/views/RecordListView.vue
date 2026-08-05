<template>
  <div class="record-list-view">
    <PageHeader
      title="值班记录"
      subtitle="查看和管理所有值班记录"
    >
      <template #actions>
        <div class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
            title="表格"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'card' }"
            @click="viewMode = 'card'"
            title="卡片"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        </div>
        <button v-if="store.canExport" class="btn btn-secondary" @click="$router.push('/export')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出
        </button>
        <button class="btn btn-primary" @click="$router.push('/records/create')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建记录
        </button>
      </template>
    </PageHeader>

    <!-- 筛选条 -->
    <div class="filter-bar">
      <div class="search-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="11" cy="11" r="7"/>
          <line x1="21" y1="21" x2="16.5" y2="16.5"/>
        </svg>
        <input
          v-model="filters.search"
          type="text"
          placeholder="搜索值班员、事项内容..."
        />
      </div>
      <select
        v-if="store.isAdmin"
        :value="store.currentStationId"
        @change="onStationChange"
        class="filter-select"
        title="切换站点"
      >
        <option v-for="s in store.stations" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <select v-model="filters.status" class="filter-select">
        <option value="">全部状态</option>
        <option value="active">进行中</option>
        <option value="locked">已锁定</option>
      </select>
      <input
        v-model="filters.dateFrom"
        type="date"
        class="filter-select"
        :class="{ 'date-empty': !filters.dateFrom }"
        :max="todayISO"
      />
      <span class="filter-dash">至</span>
      <input
        v-model="filters.dateTo"
        type="date"
        class="filter-select"
        :class="{ 'date-empty': !filters.dateTo }"
        :max="todayISO"
      />
      <button v-if="hasActiveFilters" class="btn btn-link" @click="resetFilters">
        清除筛选
      </button>
    </div>

    <!-- 列表 -->
    <!-- 表格视图 -->
    <div v-if="viewMode === 'table'" class="card table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>天气</th>
            <th>值班员</th>
            <th>进度</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in filteredRecords"
            :key="record.id"
            @click="$router.push(`/records/${record.id}`)"
            class="record-row"
          >
            <td>
              <span class="font-mono">{{ record.recordDate }}</span>
            </td>
            <td>{{ record.weatherLabel }}</td>
            <td>{{ officerText(record) }}</td>
            <td>
              <div class="progress-cell">
                <span class="progress-num font-mono">
                  <span :class="record.completedCount === record.itemCount ? 'text-ok' : ''">
                    {{ record.completedCount }}
                  </span>
                  <span class="text-muted">/{{ record.itemCount }}</span>
                </span>
                <div class="progress-mini">
                  <div
                    class="progress-mini-fill"
                    :style="{ width: (record.completedCount / record.itemCount * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </td>
            <td>
              <StatusBadge
                :label="displayStatus(record).label"
                :variant="displayStatus(record).variant"
              />
            </td>
            <td @click.stop class="action-cell">
              <button class="btn btn-icon" title="查看" @click="$router.push(`/records/${record.id}`)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button
                v-if="store.canEditRecordFor(record)"
                class="btn btn-icon"
                title="编辑"
                @click="$router.push(`/records/${record.id}/edit`)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                v-if="record.status === 'active' && record.completedCount === record.itemCount && store.canLock"
                class="btn btn-icon"
                title="锁定"
                @click="handleLock(record)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!filteredRecords.length" class="empty">
        <p class="empty-text">没有找到匹配的记录</p>
        <button v-if="hasActiveFilters" class="btn btn-link" @click="resetFilters">清除筛选</button>
      </div>
    </div>

    <!-- 卡片视图 -->
    <div v-else class="card-grid">
      <div
        v-for="record in filteredRecords"
        :key="record.id"
        class="card record-card"
        @click="$router.push(`/records/${record.id}`)"
      >
        <div class="card-head">
          <span class="card-date font-mono">{{ record.recordDate }}</span>
          <StatusBadge
            :label="displayStatus(record).label"
            :variant="displayStatus(record).variant"
          />
        </div>
        <div class="card-meta">
          <span class="meta-text">{{ officerText(record) }}</span>
          <span class="meta-divider">·</span>
          <span class="meta-text">{{ record.weatherLabel }}</span>
        </div>
        <div class="card-progress">
          <div class="progress-num font-mono">
            <span :class="record.completedCount === record.itemCount ? 'text-ok' : ''">
              {{ record.completedCount }}
            </span>
            <span class="text-muted">/ {{ record.itemCount }} 项已完成</span>
          </div>
          <div class="progress-mini">
            <div
              class="progress-mini-fill"
              :style="{ width: (record.completedCount / record.itemCount * 100) + '%' }"
            ></div>
          </div>
        </div>
        <div v-if="record.hasPending" class="card-warning">有遗留问题待处理</div>
      </div>

      <div v-if="!filteredRecords.length" class="empty">
        <p class="empty-text">没有找到匹配的记录</p>
        <button v-if="hasActiveFilters" class="btn btn-link" @click="resetFilters">清除筛选</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/store'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { getCurrentDateISO } from '@/data/mockData'
const store = useAppStore()
const toast = useToast()
const confirm = useConfirm()

// 值班记录生命周期状态（当天=进行中，前一天=即将锁定）统一走 store getter
const displayStatus = (record) => store.recordDisplayStatus(record)

// 值班员：优先显示当天排班名单，未配置排班时回退创建人
const officerText = (r) => (r.dutyOfficers && r.dutyOfficers.length)
  ? r.dutyOfficers.join(' / ')
  : (r.creator || '—')

const viewMode = ref('table')

const filters = reactive({
  search: '',
  status: '',
  dateFrom: '',
  dateTo: ''
})

// 站点切换（admin）：与顶栏切换器一致，联动 store.currentStationId
const onStationChange = (e) => {
  store.setCurrentStation(e.target.value)
}

// 筛选日期上限：不允许选择今天以后的日期（本地日期）
const todayISO = getCurrentDateISO()

const hasActiveFilters = computed(() => Object.values(filters).some(v => v))

const filteredRecords = computed(() => {
  return store.records.filter(r => {
    if (filters.search) {
      const s = filters.search.toLowerCase()
      const officers = (r.dutyOfficers || []).join(' ').toLowerCase()
      const match = r.creator.toLowerCase().includes(s) ||
                    officers.includes(s) ||
                    r.dutyItems.some(i => i.content && i.content.toLowerCase().includes(s))
      if (!match) return false
    }
    if (filters.status && r.status !== filters.status) return false
    if (filters.dateFrom && r.recordDate < filters.dateFrom) return false
    if (filters.dateTo && r.recordDate > filters.dateTo) return false
    return true
  })
})

const resetFilters = () => {
  Object.keys(filters).forEach(k => filters[k] = '')
}

const handleLock = async (record) => {
  const ok = await confirm.open({
    title: '锁定记录',
    message: `确认锁定 ${record.recordDate} 的值班记录？锁定后无法再修改。`,
    confirmText: '锁定',
    type: 'danger'
  })
  if (!ok) return
  try {
    await store.lockRecord(record.id)
    toast.success('记录已锁定')
  } catch (e) {
    toast.error(e.message || '锁定失败')
  }
}

// 数据加载：进入页面时拉取最近 30 天记录
const loadRecords = async () => {
  try {
    const now = new Date()
    const end = now.toISOString().slice(0, 10)
    const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    await store.fetchRecords({ startDate: start, endDate: end, page: 1, pageSize: 50, sortOrder: 'desc' })
  } catch (e) {
    toast.error(e.message || '记录加载失败')
  }
}

onMounted(() => {
  if (!store.recordsLoaded) loadRecords()
})

// 路由切回时刷新
watch(() => store.recordsLoaded, (v) => { if (v) {/* noop */} })
</script>

<style lang="scss" scoped>
.record-list-view {
  max-width: 1400px;
  margin: 0 auto;
}

// ===== 筛选条 =====
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  width: 280px;
  transition: border-color 120ms ease, box-shadow 120ms ease;

  svg {
    width: 14px;
    height: 14px;
    color: $text-muted;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: $text-primary;
    font-size: 13px;
    padding: 0;
    min-width: 0;

    &::placeholder { color: $text-muted; }
  }

  &:focus-within {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }
}

.filter-select {
  padding: 7px 10px;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 6px;
  color: $text-primary;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  min-width: 110px;

  &:hover, &:focus {
    border-color: $accent;
  }

  // 未选择日期时隐藏浏览器自带的 "yyyy-mm-dd" 占位文字
  &.date-empty {
    color: transparent;
  }
}

.filter-dash {
  color: $text-muted;
  font-size: 12px;
}

// ===== 视图切换 =====
.view-toggle {
  display: flex;
  padding: 2px;
  background: $bg-subtle;
  border-radius: 6px;
  gap: 1px;
}

.toggle-btn {
  width: 30px;
  height: 26px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 120ms ease;

  svg { width: 14px; height: 14px; }

  &:hover { color: $text-primary; }
  &.active {
    background: $bg-card;
    color: $text-primary;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }
}

// ===== 表格 =====
.card {
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: 8px;
  overflow: hidden;
}

.table-card { padding: 0; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  thead th {
    padding: 10px 16px;
    font-size: 12px;
    font-weight: 500;
    text-align: left;
    color: $text-muted;
    background: $bg-page;
    border-bottom: 1px solid $border-base;
  }

  tbody tr {
    border-bottom: 1px solid $border-subtle;
    transition: background 120ms ease;
    cursor: pointer;

    &:last-child { border-bottom: none; }
    &:hover { background: $bg-page; }

    td {
      padding: 12px 16px;
      color: $text-primary;
      vertical-align: middle;
    }
  }
}

.action-cell {
  display: flex;
  gap: 4px;
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100px;
}

.progress-num {
  font-size: 12px;
  font-weight: 500;
}

.progress-mini {
  height: 4px;
  background: $bg-subtle;
  border-radius: 999px;
  overflow: hidden;
}

.progress-mini-fill {
  height: 100%;
  background: $primary;
  border-radius: 999px;
  transition: width 280ms ease;
}

// ===== 卡片视图 =====
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.record-card {
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 120ms ease, transform 120ms ease;

  &:hover {
    border-color: $border-strong;
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-date {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $text-secondary;
}

.meta-text { color: $text-secondary; }
.meta-divider { color: $text-faint; }

.card-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-warning {
  padding: 4px 8px;
  background: $warn-soft;
  color: #b45309;
  font-size: 11px;
  border-radius: 4px;
  align-self: flex-start;
}

// ===== 空状态 =====
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 8px;
  grid-column: 1 / -1;
}

.empty-text {
  color: $text-muted;
  font-size: 13px;
}
</style>
