// ========================================
// 全局临近超时提醒
// 页面运行状态下：当前站点今天有未完成工单距工单时限不足 10 分钟
// → 弹窗（toast） + 警报声音，同一工单只提醒一次
// ========================================
import { watch, onUnmounted } from 'vue'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'
import { getItemTimeoutState, getTodayISO } from '@/utils/orderTimeout'

const INTERVAL_MS = 30 * 1000
const ALERT_WINDOW_MIN = 10 // 距时限不足 10 分钟提醒（已超时同样触发）

// 已提醒集合：key = `${stationId}:${itemId}`，切站/登出时清空
const reminded = new Set()

let audioCtx = null // AudioContext 懒创建（满足浏览器自动播放策略）
let timer = null

// 警报音：square 880Hz 连响两下，渐入渐出
function playAlarm() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      audioCtx = new AC()
      // 自动播放策略：须在用户交互后 resume
      const unlock = () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume() }
      window.addEventListener('pointerdown', unlock, { once: true })
      window.addEventListener('keydown', unlock, { once: true })
      window.addEventListener('click', unlock, { once: true })
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const beep = (at) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + at + 0.35)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(audioCtx.currentTime + at)
      osc.stop(audioCtx.currentTime + at + 0.4)
    }
    beep(0)
    beep(0.45)
  } catch { /* 音频不可用仅弹 toast，不阻塞 */ }
}

export function useOrderReminder() {
  const store = useAppStore()
  const toast = useToast()

  const check = async () => {
    if (!store.isLoggedIn || !store.currentStationId) return
    try {
      await store.fetchTodayRecord() // 刷新今日工单（按 currentStationId）
    } catch { /* 刷新失败跳过本轮 */ }

    const limit = store.currentStationOrderTimeLimit
    const today = getTodayISO()
    const record = store.records.find(r => r.recordDate === today)
    if (!record) return

    const hits = []
    for (const item of record.dutyItems || []) {
      if (item.isCompleted || !item.content || !item.acceptTime) continue
      const st = getItemTimeoutState(item, today, limit)
      if (!st || st.state === 'ok') continue // 剩余 >10 分钟不提醒
      const key = `${store.currentStationId}:${item.id}`
      if (reminded.has(key)) continue
      reminded.add(key)
      hits.push({ item, st })
    }

    if (hits.length) {
      // 已超时优先：标题与内容口径一致（避免"即将超时"却显示"已超时"的矛盾文案）
      const isOverdue = (s) => s.state === 'overdue'
      const overdueCount = hits.filter(h => isOverdue(h.st)).length
      const type = overdueCount > 0 ? 'alert' : 'warning'
      let title
      let message
      if (hits.length === 1) {
        const h = hits[0]
        title = isOverdue(h.st) ? '工单已超时' : '工单即将超时'
        message = `「${h.item.content}」${h.st.label}，请及时处理`
      } else if (overdueCount > 0) {
        title = '工单超时提醒'
        message = `${overdueCount} 个工单已超时`
        if (hits.length > overdueCount) message += `，另有 ${hits.length - overdueCount} 个即将超时`
        message += '，请及时处理'
      } else {
        title = '工单即将超时'
        message = `${hits.length} 个工单即将超时，请及时处理`
      }
      toast.show({ type, title, message, duration: 8000 })
      playAlarm()
    }
  }

  const start = () => {
    stop()
    if (!store.stations.length) store.fetchStations() // 确保时限取到站点配置
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
