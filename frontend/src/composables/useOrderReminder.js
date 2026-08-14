// ========================================
// 全局临近超时提醒
// 页面运行状态下：全部可见站（管理员聚合，普通值班员仅本所）今天有未完成工单距时限不足 10 分钟
// → 高显眼 toast + 警报声音，同一工单只提醒一次
// ========================================
import { watch, onUnmounted } from 'vue'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'
import { getItemTimeoutState } from '@/utils/orderTimeout'
import { playAlarm } from '@/utils/alarm'

const INTERVAL_MS = 30 * 1000
const ALERT_WINDOW_MIN = 10 // 距时限不足 10 分钟提醒（已超时同样触发）

// 已提醒集合：key = `${stationId}:${itemId}`，切站/登出时清空
const reminded = new Set()

let timer = null

export function useOrderReminder() {
  const store = useAppStore()
  const toast = useToast()

  const check = async () => {
    if (!store.isLoggedIn) return
    // 确保可见站列表就绪（聚合遍历用；失败走 fetchAllTodayRecords 内的兜底）
    if (!store.stations.length) await store.fetchStations().catch(() => {})

    let list = []
    try {
      list = await store.fetchAllTodayRecords()
    } catch { /* 聚合失败跳过本轮 */ }
    if (!list.length) return

    const hits = []
    for (const { stationId, stationName, orderTimeLimit, record } of list) {
      const limit = orderTimeLimit ?? 60
      for (const item of record.dutyItems || []) {
        if (item.isCompleted || !item.content || !item.acceptTime) continue
        const st = getItemTimeoutState(item, record.recordDate, limit)
        if (!st || st.state === 'ok') continue // 剩余 >10 分钟不提醒
        const key = `${stationId}:${item.id}`
        if (reminded.has(key)) continue
        reminded.add(key)
        hits.push({ item, st, stationName })
      }
    }

    if (hits.length) {
      // 已超时优先：标题与内容口径一致（避免"即将超时"却显示"已超时"的矛盾文案）
      const isOverdue = (s) => s.state === 'overdue'
      const overdueCount = hits.filter(h => isOverdue(h.st)).length
      const type = overdueCount > 0 ? 'alert' : 'warning'
      const stationCount = new Set(hits.map(h => h.stationName).filter(Boolean)).size
      let title
      let message
      if (hits.length === 1) {
        const h = hits[0]
        title = isOverdue(h.st) ? '工单已超时' : '工单即将超时'
        message = `「${h.item.content}」${h.stationName ? h.stationName + ' ' : ''}${h.st.label}，请及时处理`
      } else if (overdueCount > 0) {
        title = '工单超时提醒'
        message = `${overdueCount} 个工单已超时`
        if (hits.length > overdueCount) message += `，另有 ${hits.length - overdueCount} 个即将超时`
        message += '，请及时处理'
      } else {
        title = '工单即将超时'
        message = `${hits.length} 个工单即将超时，请及时处理`
      }
      if (stationCount > 1) message += `（涉及 ${stationCount} 个供电所）`
      toast.show({ type, title, message, duration: 8000 })
      playAlarm()
    }
  }

  const start = () => {
    stop()
    if (!store.stations.length) store.fetchStations() // 确保可见站列表就绪（聚合判定用）
    check()
    timer = setInterval(check, INTERVAL_MS)
  }

  const stop = () => {
    if (timer) { clearInterval(timer); timer = null }
  }

  watch(() => store.isLoggedIn, (v) => {
    if (v) start()
    else { stop(); reminded.clear() }
  })

  // admin 切换站点后清空去重并立即重查
  watch(() => store.currentStationId, () => {
    reminded.clear()
    if (store.isLoggedIn) check()
  })

  onUnmounted(() => {
    stop()
    reminded.clear()
  })

  // 刷新页面时若已登录则直接启动
  if (store.isLoggedIn) start()
}
