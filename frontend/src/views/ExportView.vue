<template>
  <div class="export-view">
    <PageHeader
      eyebrow="EXPORT MANAGER · 导出管理"
      title="值班记录导出"
      subtitle="按月/按区间批量导出值班记录为 Excel 文件，保持原始模板格式"
    />

    <div class="export-container">
      <!-- 配置区 -->
      <div class="export-config">
        <div class="config-panel">
          <div class="config-header">
            <div class="config-title">
              <i class="led led-info"></i>
              <span>导出配置 · EXPORT CONFIG</span>
            </div>
          </div>
          <div class="config-body">
            <div class="form-grid">
              <div class="field">
                <label class="field-label">导出类型</label>
                <div class="radio-group">
                  <button
                    class="radio-option"
                    :class="{ active: config.type === 'monthly' }"
                    @click="config.type = 'monthly'"
                  >
                    <div class="radio-mark"></div>
                    <div class="radio-content">
                      <div class="radio-title">月度导出</div>
                      <div class="radio-desc">导出指定月份的所有值班记录</div>
                    </div>
                  </button>
                  <button
                    class="radio-option"
                    :class="{ active: config.type === 'range' }"
                    @click="config.type = 'range'"
                  >
                    <div class="radio-mark"></div>
                    <div class="radio-content">
                      <div class="radio-title">区间导出</div>
                      <div class="radio-desc">导出指定日期范围的值班记录</div>
                    </div>
                  </button>
                </div>
              </div>

              <div v-if="config.type === 'monthly'" class="field">
                <label class="field-label">选择月份</label>
                <div class="month-picker">
                  <button
                    v-for="m in availableMonths"
                    :key="m.value"
                    class="month-option"
                    :class="{ active: config.month === m.value }"
                    @click="config.month = m.value"
                  >
                    <div class="month-year font-mono">{{ m.year }}</div>
                    <div class="month-num font-display">{{ String(m.month).padStart(2, '0') }}</div>
                    <div class="month-label">月</div>
                    <div v-if="m.count" class="month-count">{{ m.count }}条</div>
                  </button>
                </div>
              </div>

              <div v-else class="field">
                <label class="field-label">日期范围</label>
                <div class="date-range">
                  <input v-model="config.dateFrom" type="date" class="field-input" />
                  <span class="date-arrow">→</span>
                  <input v-model="config.dateTo" type="date" class="field-input" />
                </div>
              </div>

              <div class="field">
                <label class="field-label">导出选项</label>
                <div class="checkbox-list">
                  <label class="checkbox-row">
                    <input type="checkbox" v-model="config.includeOther" />
                    <span class="checkbox-mark"></span>
                    <span>包含「其他事项」</span>
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" v-model="config.includePending" />
                    <span class="checkbox-mark"></span>
                    <span>包含「遗留问题」</span>
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" v-model="config.includeTemplate" />
                    <span class="checkbox-mark"></span>
                    <span>使用原始 Excel 模板</span>
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" v-model="config.mergeSheets" />
                    <span class="checkbox-mark"></span>
                    <span>合并到单个工作表</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="export-summary">
              <div class="summary-row">
                <span class="summary-label">预计导出</span>
                <span class="summary-value font-display text-accent">{{ expectedCount }}</span>
                <span class="summary-unit">条记录</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">文件名</span>
                <span class="summary-value font-mono">{{ fileName }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">预计大小</span>
                <span class="summary-value font-mono">{{ expectedSize }}</span>
              </div>
            </div>

            <div class="export-actions">
              <button class="btn btn-ghost" @click="resetConfig">重置</button>
              <button
                class="btn btn-primary btn-lg"
                :disabled="expectedCount === 0 || exporting"
                @click="handleExport"
              >
                <svg v-if="!exporting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span v-if="!exporting">开始导出</span>
                <span v-else class="loading-content">
                  <span class="spinner"></span>
                  导出中...
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- 模板预览 -->
        <div class="template-panel">
          <div class="config-header">
            <div class="config-title">
              <i class="led led-warn"></i>
              <span>模板预览 · TEMPLATE</span>
            </div>
          </div>
          <div class="template-preview">
            <div class="preview-frame">
              <div class="preview-toolbar">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
                <span class="file-name font-mono">电子值班表模板.xlsx</span>
              </div>
              <div class="preview-content">
                <div class="preview-row preview-title-row">
                  <div class="preview-cell title-cell">张店供电中心马尚供电所2026年7月份值班记录</div>
                </div>
                <div class="preview-row">
                  <div class="preview-cell label-cell">日期</div>
                  <div class="preview-cell value-cell">2026-07-29</div>
                  <div class="preview-cell label-cell">天气</div>
                  <div class="preview-cell value-cell">雨天</div>
                </div>
                <div class="preview-row">
                  <div class="preview-cell label-cell">值班员</div>
                  <div class="preview-cell value-cell">李四</div>
                  <div class="preview-cell label-cell">班次</div>
                  <div class="preview-cell value-cell">白班 08:00-18:00</div>
                </div>
                <div class="preview-section-title">值班事项</div>
                <div class="preview-row preview-table-row">
                  <div class="preview-cell preview-th">序号</div>
                  <div class="preview-cell preview-th">开始</div>
                  <div class="preview-cell preview-th">内容</div>
                  <div class="preview-cell preview-th">结束</div>
                </div>
                <div class="preview-row preview-table-row">
                  <div class="preview-cell">1</div>
                  <div class="preview-cell">08:20</div>
                  <div class="preview-cell">雨前特巡 · 检查配电室防水设施</div>
                  <div class="preview-cell">08:50</div>
                </div>
                <div class="preview-row preview-table-row">
                  <div class="preview-cell">2</div>
                  <div class="preview-cell">10:15</div>
                  <div class="preview-cell">10kV马尚二线接地故障抢修</div>
                  <div class="preview-cell">13:40</div>
                </div>
                <div class="preview-section-title">其他事项</div>
                <div class="preview-row">
                  <div class="preview-cell">下午雷阵雨，电网负荷较平日下降约15%</div>
                </div>
                <div class="preview-section-title">遗留问题</div>
                <div class="preview-row">
                  <div class="preview-cell">马尚二线#12-#15杆塔区段电缆头存在发热隐患</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-panel">
        <div class="config-header">
          <div class="config-title">
            <i class="led led-ok"></i>
            <span>导出历史 · HISTORY</span>
            <span class="font-mono text-muted">{{ store.exports.length }} 条</span>
          </div>
        </div>
        <div class="history-body">
          <table class="data-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>大小</th>
                <th>导出时间</th>
                <th>操作员</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in store.exports" :key="item.id">
                <td>
                  <div class="file-cell">
                    <div class="file-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div class="file-info">
                      <div class="file-name-cell font-mono">{{ item.fileName }}</div>
                    </div>
                  </div>
                </td>
                <td class="font-mono text-secondary">{{ item.size }}</td>
                <td class="font-mono text-sm text-secondary">{{ item.date }}</td>
                <td>{{ item.operator }}</td>
                <td>
                  <span class="tag tag-ok">
                    <i class="led led-ok"></i>
                    已完成
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn" title="下载" @click="download(item)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button class="action-btn" title="预览">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useAppStore } from '@/store'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { getCurrentDateISO } from '@/data/mockData'

const store = useAppStore()
const toast = useToast()

// 默认基于当前月份
const now = new Date()
const curYear = now.getFullYear()
const curMonth = String(now.getMonth() + 1).padStart(2, '0')
const todayISO = getCurrentDateISO()

const config = reactive({
  type: 'monthly',
  month: `${curYear}-${curMonth}`,
  dateFrom: `${curYear}-${curMonth}-01`,
  dateTo: todayISO,
  includeOther: true,
  includePending: true,
  includeTemplate: true,
  mergeSheets: false
})

const exporting = ref(false)

// 切换类型时重置
watch(() => config.type, () => {
  if (config.type === 'monthly') {
    config.dateFrom = `${curYear}-${curMonth}-01`
    config.dateTo = todayISO
  } else {
    config.month = `${curYear}-${curMonth}`
  }
})

const availableMonths = computed(() => {
  const months = new Set()
  store.records.forEach(r => {
    const ym = r.recordDate.substring(0, 7)
    months.add(ym)
  })
  return Array.from(months).sort().reverse().map(ym => {
    const [year, month] = ym.split('-')
    return {
      value: ym,
      year,
      month: Number(month),
      count: store.records.filter(r => r.recordDate.startsWith(ym)).length
    }
  })
})

const expectedCount = computed(() => {
  if (config.type === 'monthly') {
    return store.records.filter(r => r.recordDate.startsWith(config.month)).length
  }
  return store.records.filter(r => r.recordDate >= config.dateFrom && r.recordDate <= config.dateTo).length
})

const fileName = computed(() => {
  if (config.type === 'monthly') {
    return `值班记录_${config.month}.xlsx`
  }
  return `值班记录_${config.dateFrom}_至_${config.dateTo}.xlsx`
})

const expectedSize = computed(() => {
  const count = expectedCount.value
  if (count === 0) return '0 KB'
  const sizeKB = 80 + count * 35
  if (sizeKB > 1024) return `${(sizeKB / 1024).toFixed(1)} MB`
  return `${sizeKB} KB`
})

const resetConfig = () => {
  config.type = 'monthly'
  config.month = `${curYear}-${curMonth}`
  config.dateFrom = `${curYear}-${curMonth}-01`
  config.dateTo = todayISO
  config.includeOther = true
  config.includePending = true
  config.includeTemplate = true
  config.mergeSheets = false
}

const handleExport = async () => {
  exporting.value = true
  try {
    let res
    if (config.type === 'monthly') {
      const [y, m] = config.month.split('-').map(Number)
      res = await store.createExport({
        year: y,
        month: m,
        stationId: store.currentStationId,
        includeTemplate: config.includeTemplate,
        mergeSheets: config.mergeSheets
      })
    } else {
      // 区间导出：真正按起始/结束日期调用后端
      res = await store.createRangeExport({
        dateFrom: config.dateFrom,
        dateTo: config.dateTo,
        stationId: store.currentStationId,
        includeTemplate: config.includeTemplate,
        mergeSheets: config.mergeSheets
      })
    }
    toast.success(`文件：${res.fileName}\n记录数：${expectedCount.value} 条`, '导出成功')
    if (res && res.id) {
      await store.downloadExport(res.id, res.fileName)
    }
    // 刷新历史
    store.fetchExportHistory(1, 20)
  } catch (e) {
    toast.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

// 下载历史导出文件
const download = async (item) => {
  try {
    await store.downloadExport(item.id, item.fileName)
  } catch (e) {
    toast.error(e.message || '下载失败')
  }
}

onMounted(() => {
  store.fetchExportHistory(1, 20)
  // 确保记录已加载，月份/预计条数才准确
  if (store.records.length === 0) {
    store.fetchRecords({ startDate: `${curYear}-01-01`, endDate: todayISO, pageSize: 200 })
  }
})
</script>

<style lang="scss" scoped>
.export-view {
  max-width: 1400px;
  margin: 0 auto;
}

.export-container {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.config-panel, .template-panel, .history-panel {
  background: $bg-base;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  overflow: hidden;
}

.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-5;
  border-bottom: 1px solid $border-subtle;
  background: linear-gradient(180deg, rgba(0, 212, 255, 0.03), transparent);
}

.config-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-family: $font-display;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
  letter-spacing: $ls-wider;
  text-transform: uppercase;
  color: $text-primary;
}

.config-body { padding: $space-5; }

// ===== 导出配置 =====
.export-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
  margin-bottom: $space-5;
}

.field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.field-label {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-family: $font-mono;
  font-size: 10px;
  font-weight: $fw-medium;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-secondary;

  &::before {
    content: '';
    width: 3px;
    height: 10px;
    background: $primary;
  }
}

.field-input {
  width: 100%;
  padding: 10px $space-3;
  font-family: $font-body;
  font-size: $fs-base;
  color: $text-primary;
  background: $bg-void;
  border: 1px solid $border-base;
  border-radius: $radius-base;
  outline: none;

  &:focus {
    border-color: $primary;
    box-shadow: 0 0 0 3px $primary-soft;
  }
}

// 单选组
.radio-group {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-3;
  background: $bg-void;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $duration-base $ease-out;
  text-align: left;

  &:hover { border-color: $border-strong; }

  &.active {
    background: $primary-soft;
    border-color: $primary;

    .radio-mark {
      background: $primary;
      border-color: $primary;

      &::after { transform: scale(1); }
    }
  }
}

.radio-mark {
  width: 16px;
  height: 16px;
  border: 1px solid $border-strong;
  border-radius: 50%;
  background: $bg-void;
  position: relative;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all $duration-base $ease-out;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $text-inverse;
    transition: transform $duration-base $ease-spring;
  }
}

.radio-title {
  font-size: $fs-sm;
  font-weight: $fw-semibold;
  color: $text-primary;
  margin-bottom: 2px;
}

.radio-desc {
  font-size: $fs-xs;
  color: $text-secondary;
}

// 月份选择器
.month-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-2;
}

.month-option {
  position: relative;
  padding: $space-3;
  background: $bg-void;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $duration-base $ease-out;
  text-align: left;

  &:hover {
    background: $bg-elevated;
    border-color: $border-strong;
  }

  &.active {
    background: $primary-soft;
    border-color: $primary;
    box-shadow: 0 0 0 1px $primary;
  }
}

.month-year {
  font-size: 9px;
  color: $text-muted;
  letter-spacing: $ls-wide;
  margin-bottom: 2px;
}

.month-num {
  font-size: $fs-2xl;
  font-weight: $fw-bold;
  color: $text-primary;
  line-height: 1;
}

.month-label {
  display: inline-block;
  font-size: $fs-xs;
  color: $text-secondary;
  margin-left: 2px;
}

.month-count {
  position: absolute;
  top: 6px;
  right: 6px;
  font-family: $font-mono;
  font-size: 9px;
  padding: 1px 5px;
  background: $primary;
  color: $text-inverse;
  border-radius: $radius-sm;
}

// 日期范围
.date-range {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.date-arrow {
  color: $text-muted;
  font-family: $font-mono;
}

// 复选框
.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: 8px 10px;
  background: $bg-void;
  border: 1px solid $border-base;
  border-radius: $radius-sm;
  cursor: pointer;
  font-size: $fs-sm;
  color: $text-secondary;

  input { display: none; }

  &:hover { background: $bg-elevated; }

  input:checked + .checkbox-mark {
    background: $primary;
    border-color: $primary;

    &::after { transform: scale(1); }
  }

  input:checked ~ span { color: $text-primary; }
}

.checkbox-mark {
  width: 16px;
  height: 16px;
  border: 1px solid $border-strong;
  border-radius: $radius-sm;
  position: relative;
  flex-shrink: 0;
  transition: all $duration-fast $ease-out;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 5px;
    width: 4px;
    height: 8px;
    border: 2px solid $text-inverse;
    border-top: none;
    border-left: none;
    transform: rotate(45deg) scale(0);
    transform-origin: center;
    transition: transform $duration-base $ease-spring;
  }
}

// 摘要
.export-summary {
  padding: $space-3 $space-4;
  background: $bg-elevated;
  border: 1px solid $border-subtle;
  border-left: 3px solid $primary;
  border-radius: $radius-sm;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-bottom: $space-4;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $fs-sm;
}

.summary-label {
  font-family: $font-mono;
  font-size: 10px;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-muted;
  width: 80px;
}

.summary-value {
  font-weight: $fw-semibold;
  color: $text-primary;
}

.summary-unit {
  font-size: 10px;
  color: $text-muted;
}

.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: $space-2;
  padding-top: $space-3;
  border-top: 1px dashed $border-subtle;

  .btn-lg {
    min-width: 200px;
  }
}

.loading-content {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

// ===== 模板预览 =====
.template-preview {
  padding: $space-5;
}

.preview-frame {
  background: $bg-void;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border-bottom: 1px solid $border-base;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;

  &.dot-red    { background: #ff5f57; }
  &.dot-yellow { background: #febc2e; }
  &.dot-green  { background: #28c840; }
}

.file-name {
  margin-left: auto;
  font-size: 10px;
  color: $text-muted;
  letter-spacing: $ls-wide;
}

.preview-content {
  background: white;
  color: #1a1a1a;
  font-size: 10px;
  padding: $space-3;
}

.preview-row {
  display: grid;
  grid-template-columns: 60px 1fr 60px 1fr;
  border: 1px solid #e0e0e0;

  &.preview-title-row { grid-template-columns: 1fr; }
  &.preview-table-row { grid-template-columns: 40px 60px 1fr 60px; }
}

.preview-cell {
  padding: 4px 8px;
  border-right: 1px solid #e0e0e0;
  color: #333;

  &:last-child { border-right: none; }
}

.title-cell {
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  padding: 8px;
}

.label-cell {
  background: #f5f5f5;
  font-weight: 500;
  text-align: center;
}

.value-cell {
  font-size: 10px;
}

.preview-section-title {
  margin: 8px 0 4px;
  font-size: 10px;
  font-weight: bold;
  color: #333;
  padding: 2px 0;
  border-bottom: 1px solid #e0e0e0;
}

.preview-th {
  background: #e8e8e8;
  font-weight: 600;
  text-align: center;
}

// ===== 历史 =====
.history-body { padding: $space-3 $space-4; }

.file-cell {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.file-icon {
  width: 32px;
  height: 32px;
  background: $primary-soft;
  color: $primary;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { width: 16px; height: 16px; }
}

.file-name-cell {
  font-size: $fs-sm;
  color: $text-primary;
  font-weight: $fw-medium;
}

.text-sm { font-size: 11px; }
.text-sm.font-mono { font-family: $font-mono; }

.action-buttons {
  display: flex;
  gap: 2px;
}

.action-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $duration-base $ease-out;

  svg { width: 13px; height: 13px; }

  &:hover {
    color: $primary;
    background: $primary-soft;
    border-color: $border-accent;
  }
}
</style>
