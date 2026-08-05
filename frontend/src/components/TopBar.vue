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
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocClick)
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
</style>
