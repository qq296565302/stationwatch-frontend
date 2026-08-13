<template>
  <header class="topbar">
    <div class="topbar-left">
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>

    <div class="topbar-right">
      <div class="search-box" :class="{ active: searchOpen }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="11" cy="11" r="7"/>
          <line x1="21" y1="21" x2="16.5" y2="16.5"/>
        </svg>
        <input
          v-model="searchText"
          @focus="searchOpen = true"
          @keydown.esc="closeSearch"
          @keydown.enter="goFirstResult"
          placeholder="搜索值班记录、工单、客户..."
          class="search-input"
        />
        <button
          v-if="searchText"
          class="search-clear"
          @click="searchText = ''"
          type="button"
          aria-label="清空"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- 搜索结果下拉 -->
        <transition name="search-dropdown">
          <div v-if="searchOpen && searchText.trim()" class="search-dropdown" @mousedown.prevent>
            <div v-if="searchResults.length === 0" class="search-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="7"/>
                <line x1="21" y1="21" x2="16.5" y2="16.5"/>
              </svg>
              <span>未找到匹配 "<strong>{{ searchText }}</strong>" 的结果</span>
            </div>
            <div v-else class="search-results">
              <div class="search-results-header">
                共找到 <strong>{{ searchResults.length }}</strong> 条结果
              </div>
              <button
                v-for="(r, i) in searchResults"
                :key="`${r.type}-${r.recordId}-${r.itemId || 0}-${i}`"
                class="search-result"
                :class="{ active: i === activeIdx }"
                @mouseenter="activeIdx = i"
                @click="goResult(r)"
                type="button"
              >
                <span class="result-type" :class="`tag-${r.type}`">
                  {{ r.type === 'record' ? '记录' : '工单' }}
                </span>
                <div class="result-body">
                  <div class="result-title" v-html="highlight(r.title)"></div>
                  <div class="result-snippet" v-if="r.snippet" v-html="highlight(r.snippet)"></div>
                </div>
                <span class="result-date font-mono">{{ r.recordDate }}</span>
              </button>
            </div>
            <div v-if="searchResults.length" class="search-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
              <span><kbd>Enter</kbd> 进入</span>
              <span><kbd>Esc</kbd> 关闭</span>
            </div>
          </div>
        </transition>
      </div>

      <!-- 站点切换器：市级超管/区县管理员可见 -->
      <div v-if="store.canSwitchStation && store.visibleStations.length" ref="stationSwitcher" class="station-switcher">
        <button class="station-trigger" type="button" :class="{ open: stationOpen }" @click="toggleStationOpen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="station-trigger-name">{{ currentStationName }}</span>
          <svg class="station-caret" :class="{ open: stationOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <teleport to="body">
          <div
            v-if="stationOpen"
            class="station-dropdown"
            :style="stationDropdownStyle"
            @mousedown.prevent
          >
            <div class="station-dropdown-title">切换供电所</div>
            <!-- 市级超管：按区县分组显示 -->
            <template v-if="store.isAdmin && groupedStations">
              <div v-for="g in groupedStations" :key="g.id" class="station-group">
                <div class="station-group-label">{{ g.name }}</div>
                <button
                  v-for="s in g.stations"
                  :key="s.id"
                  type="button"
                  class="station-option"
                  :class="{ active: s.id === store.currentStationId }"
                  @click="pickStation(s.id)"
                >
                  <span class="station-option-dot" :class="{ active: s.id === store.currentStationId }"></span>
                  <span class="station-option-name">{{ s.name }}</span>
                  <svg v-if="s.id === store.currentStationId" class="station-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            </template>
            <!-- 区县管理员：平铺本区县站点 -->
            <button
              v-else
              v-for="s in store.visibleStations"
              :key="s.id"
              type="button"
              class="station-option"
              :class="{ active: s.id === store.currentStationId }"
              @click="pickStation(s.id)"
            >
              <span class="station-option-dot" :class="{ active: s.id === store.currentStationId }"></span>
              <span class="station-option-name">{{ s.name }}</span>
              <svg v-if="s.id === store.currentStationId" class="station-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
        </teleport>
      </div>
      <div v-else-if="store.currentStationId" class="station-tag" title="当前供电所">
        {{ currentStationName }}
      </div>

      <!-- 字体大小切换 -->
      <div ref="fontSwitcher" class="font-switcher">
        <button
          class="font-trigger"
          type="button"
          :class="{ open: fontOpen }"
          @click="toggleFontOpen"
          title="调整字体大小"
          aria-label="调整字体大小"
        >
          <span class="font-trigger-icon font-mono">Aa</span>
          <span class="font-trigger-label">{{ fontScaleLabel }}</span>
          <svg class="font-caret" :class="{ open: fontOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <teleport to="body">
          <div
            v-if="fontOpen"
            class="font-dropdown"
            :style="fontDropdownStyle"
            @mousedown.prevent
          >
            <div class="font-dropdown-title">字体大小</div>
            <button
              v-for="opt in fontOptions"
              :key="opt.value"
              type="button"
              class="font-option"
              :class="{ active: store.fontScale === opt.value }"
              @click="pickFontScale(opt.value)"
            >
              <span class="font-option-text" :style="{ fontSize: opt.px }">{{ opt.label }}</span>
              <svg v-if="store.fontScale === opt.value" class="font-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
        </teleport>
      </div>

      <div class="time-display font-mono">{{ currentTime }}</div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/store'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const searchOpen = ref(false)
const searchText = ref('')
const activeIdx = ref(0)
const currentTime = ref('')

const pageTitle = computed(() => {
  const map = {
    Dashboard: '主控台',
    RecordList: '值班记录',
    RecordCreate: '新建记录',
    RecordDetail: '记录详情',
    RecordEdit: '编辑记录',
    Export: '导出管理',
    System: '系统配置'
  }
  return map[route.name] || route.meta.title || '主控台'
})

// 当前站点名（非切换角色展示用）
const currentStationName = computed(() => {
  const st = store.stations.find(s => s.id === store.currentStationId)
  return st ? st.name : (store.systemConfig.stationName || '')
})

// 市级超管站点按区县分组（下拉展示）；区县管理员等返回 null 走平铺
const groupedStations = computed(() => {
  if (store.user.role !== 'admin') return null
  const byDistrict = {}
  store.districts.forEach(d => { byDistrict[d.id] = { ...d, stations: [] } })
  store.visibleStations.forEach(s => {
    if (byDistrict[s.districtId]) byDistrict[s.districtId].stations.push(s)
  })
  return Object.values(byDistrict).filter(g => g.stations.length)
})

// ===== 站点切换下拉（自定义面板，Teleport 到 body 避免裁剪） =====
const stationOpen = ref(false)
const stationSwitcher = ref(null)
const stationDropdownStyle = ref({})

const toggleStationOpen = () => {
  if (stationOpen.value) { stationOpen.value = false; return }
  const el = stationSwitcher.value
  if (!el) return
  const r = el.getBoundingClientRect()
  stationDropdownStyle.value = {
    top: (r.bottom + 6) + 'px',
    right: (window.innerWidth - r.right) + 'px',
    minWidth: Math.max(r.width, 200) + 'px'
  }
  stationOpen.value = true
}

const pickStation = (id) => {
  stationOpen.value = false
  // 记录详情/编辑页属于旧供电所：切站后旧记录在新站不存在，跳到当前供电所的值班记录列表
  if (route.name === 'RecordDetail' || route.name === 'RecordEdit') {
    router.push('/records')
  }
  store.setCurrentStation(id)
}

const onStationDocClick = (e) => {
  if (!stationOpen.value) return
  const el = stationSwitcher.value
  const inDropdown = e.target.closest('.station-dropdown')
  if (el && !el.contains(e.target) && !inDropdown) stationOpen.value = false
}

// 搜索结果：异步调 store.globalSearch（已经接真接口）
const searchResults = ref([])
let searchTimer = null
watch(searchText, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!val.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    searchResults.value = await store.globalSearch(val)
  }, 250)
})

// 高亮关键词
const highlight = (text) => {
  if (!text) return ''
  const kw = searchText.value.trim()
  if (!kw) return text
  const safe = text.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
  const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return safe.replace(re, '<mark>$1</mark>')
}

// 关闭搜索
const closeSearch = () => {
  searchOpen.value = false
  searchText.value = ''
  activeIdx.value = 0
}

// 进入第一个 / 当前选中的结果
const goFirstResult = () => {
  if (searchResults.value.length) goResult(searchResults.value[activeIdx.value])
}

// 跳转到结果
const goResult = (r) => {
  closeSearch()
  document.querySelector('.search-input')?.blur()
  if (r.type === 'item') {
    router.push(`/records/${r.recordId}?item=${r.itemId}`)
  } else {
    router.push(`/records/${r.recordId}`)
  }
}

// 键盘上下选择
const onKeydown = (e) => {
  if (!searchOpen.value || !searchResults.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = (activeIdx.value + 1) % searchResults.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = (activeIdx.value - 1 + searchResults.value.length) % searchResults.value.length
  }
}

// 点击外部关闭
const onDocClick = (e) => {
  if (!searchOpen.value) return
  const box = document.querySelector('.search-box')
  if (box && !box.contains(e.target)) closeSearch()
}

// ===== 字体大小切换 =====
const fontOpen = ref(false)
const fontSwitcher = ref(null)
const fontDropdownStyle = ref({})
const fontOptions = [
  { value: 1, label: '正常', px: 13 },
  { value: 1.5, label: '大', px: 19 }
]
const fontScaleLabel = computed(() => {
  const opt = fontOptions.find(o => o.value === store.fontScale)
  return opt ? opt.label : '正常'
})

const toggleFontOpen = () => {
  if (fontOpen.value) { fontOpen.value = false; return }
  const el = fontSwitcher.value
  if (!el) return
  const r = el.getBoundingClientRect()
  fontDropdownStyle.value = {
    top: (r.bottom + 6) + 'px',
    right: (window.innerWidth - r.right) + 'px',
    minWidth: Math.max(r.width, 150) + 'px'
  }
  fontOpen.value = true
}

const pickFontScale = (scale) => {
  store.setFontScale(scale)
  fontOpen.value = false
}

const onFontDocClick = (e) => {
  if (!fontOpen.value) return
  const el = fontSwitcher.value
  const inDropdown = e.target.closest('.font-dropdown')
  if (el && !el.contains(e.target) && !inDropdown) fontOpen.value = false
}

// 时钟
const updateClock = () => {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${h}:${m}:${s}`
}

let timer = null
onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocClick)
  document.addEventListener('click', onStationDocClick)
  document.addEventListener('click', onFontDocClick)
  // 站点切换器依赖站点列表：登录后未加载则拉取（默认只有进系统配置页才拉）
  if (!store.stations.length) store.fetchStations()
  // 区县列表：市级超管按区县分组展示
  if (!store.districts.length) store.fetchDistricts()
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('click', onStationDocClick)
  document.removeEventListener('click', onFontDocClick)
})
</script>

<style lang="scss" scoped>
.topbar {
  height: $header-height;
  background: $bg-card;
  border-bottom: 1px solid $border-base;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.page-title {
  font-size: $fs-lg;
  font-weight: $fw-semibold;
  color: $text-primary;
  letter-spacing: $ls-tight;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: $radius-base;
  width: 320px;
  transition: all $duration-fast $ease-out;

  &.active {
    background: $bg-card;
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }

  > svg {
    width: 14px;
    height: 14px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: $fs-base;
  color: $text-primary;

  &::placeholder { color: $text-muted; }
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  border-radius: 50%;
  flex-shrink: 0;

  svg { width: 12px; height: 12px; }
  &:hover { color: $text-primary; background: $bg-hover; }
}

// ===== 下拉 =====
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
  z-index: 200;
  max-height: 460px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px;
  color: $text-muted;
  font-size: 13px;
  text-align: center;
  justify-content: center;

  svg { width: 18px; height: 18px; opacity: 0.6; }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.search-results-header {
  padding: 8px 14px 4px;
  font-size: 11px;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: $ls-wider;
}

.search-result {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background $duration-fast $ease-out;
  border-radius: 0;

  &.active, &:hover { background: $primary-soft; }
  &.active { background: $primary-soft; }
}

.result-type {
  font-size: 10px;
  font-weight: $fw-medium;
  padding: 2px 6px;
  border-radius: $radius-sm;
  flex-shrink: 0;
  margin-top: 1px;
  letter-spacing: $ls-wide;

  &.tag-record {
    background: $ok-soft;
    color: $ok;
  }
  &.tag-item {
    background: $primary-soft;
    color: $primary;
  }
}

.result-body {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 13px;
  color: $text-primary;
  font-weight: $fw-medium;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.result-snippet {
  font-size: 11px;
  color: $text-muted;
  margin-top: 2px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-date {
  font-size: 11px;
  color: $text-muted;
  flex-shrink: 0;
  margin-top: 1px;
}

.search-footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 14px;
  border-top: 1px solid $border-subtle;
  font-size: 11px;
  color: $text-muted;
  background: $bg-page;

  kbd {
    display: inline-block;
    padding: 1px 5px;
    background: $bg-card;
    border: 1px solid $border-base;
    border-radius: 3px;
    font-size: 10px;
    margin-right: 3px;
    font-family: $font-mono;
  }
}

:deep(mark) {
  background: #fef08a;
  color: #713f12;
  padding: 0 2px;
  border-radius: 2px;
}

// 动画
.search-dropdown-enter-active,
.search-dropdown-leave-active { transition: all 160ms $ease-out; }
.search-dropdown-enter-from,
.search-dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

.time-display {
  font-size: $fs-base;
  font-weight: $fw-medium;
  color: $text-secondary;
  padding: 6px 10px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: $radius-base;
  letter-spacing: $ls-wide;
}

// ===== 站点切换器（自定义下拉） =====
.station-switcher {
  position: relative;
}

.station-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  font-family: $font-body;
  font-size: 13px;
  font-weight: 500;
  transition: all $duration-fast $ease-out;

  > svg:first-child {
    width: 15px;
    height: 15px;
    color: $accent;
    flex-shrink: 0;
  }

  &:hover {
    background: $bg-card;
    border-color: $border-strong;
  }

  &.open {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }
}

.station-trigger-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.station-caret {
  width: 13px;
  height: 13px;
  color: $text-muted;
  flex-shrink: 0;
  transition: transform $duration-fast $ease-out;

  &.open { transform: rotate(180deg); }
}

.station-dropdown {
  position: fixed;
  z-index: 200;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08);
  padding: 6px;
  max-height: 360px;
  overflow-y: auto;
}

.station-dropdown-title {
  padding: 6px 10px 8px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: $ls-wider;
  text-transform: uppercase;
  color: $text-muted;
}

.station-group {
  padding: 2px 0;

  + .station-group {
    margin-top: 4px;
    border-top: 1px solid $border-subtle;
    padding-top: 4px;
  }
}

.station-group-label {
  padding: 5px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  letter-spacing: $ls-wide;
  text-transform: uppercase;
}

.station-option {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: $radius-base;
  font-family: $font-body;
  font-size: 13px;
  color: $text-primary;
  cursor: pointer;
  text-align: left;
  transition: background $duration-fast $ease-out;

  &:hover { background: $bg-hover; }

  &.active {
    background: $primary-soft;
    color: $primary;
    font-weight: 600;
  }
}

.station-option-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: $border-strong;
  flex-shrink: 0;

  &.active { background: $primary; }
}

.station-option-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.station-option-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: $primary;
}

.station-tag {
  font-size: $fs-base;
  font-weight: $fw-medium;
  color: $text-secondary;
  padding: 6px 12px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: $radius-base;
  white-space: nowrap;
}

// ===== 字体大小切换 =====
.font-switcher {
  position: relative;
}

.font-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  background: $bg-page;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  font-family: $font-body;
  font-size: 13px;
  font-weight: 500;
  transition: all $duration-fast $ease-out;

  &:hover {
    background: $bg-card;
    border-color: $border-strong;
  }

  &.open {
    border-color: $accent;
    box-shadow: 0 0 0 3px $accent-soft;
  }
}

.font-trigger-icon {
  font-size: 13px;
  font-weight: 700;
  color: $accent;
  letter-spacing: 1px;
}

.font-trigger-label {
  color: $text-secondary;
}

.font-caret {
  width: 13px;
  height: 13px;
  color: $text-muted;
  flex-shrink: 0;
  transition: transform $duration-fast $ease-out;

  &.open { transform: rotate(180deg); }
}

.font-dropdown {
  position: fixed;
  z-index: 200;
  background: $bg-card;
  border: 1px solid $border-base;
  border-radius: $radius-md;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08);
  padding: 6px;
}

.font-dropdown-title {
  padding: 6px 10px 8px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: $ls-wider;
  text-transform: uppercase;
  color: $text-muted;
}

.font-option {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: $radius-base;
  font-family: $font-body;
  color: $text-primary;
  cursor: pointer;
  text-align: left;
  transition: background $duration-fast $ease-out;

  &:hover { background: $bg-hover; }

  &.active {
    background: $primary-soft;
    color: $primary;
    font-weight: 600;
  }
}

.font-option-text {
  flex: 1;
  line-height: 1.4;
}

.font-option-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: $primary;
}
</style>
