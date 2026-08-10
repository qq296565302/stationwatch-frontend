// ========================================
// 值班遗留问题提醒
// 换班开始（每天 08:30 后首次进入页面）弹一次 + 未解决期间按可配置间隔定期提醒
// 纯 toast 不带声音（区别于工单超时的强提醒）
// 数据源：复用 /dashboard/alerts 的 type='pending' 告警（按当前站点权限范围）
// 开关：系统设置 duty.pending_notify（缺省=开）；间隔：duty.pending_notify_interval（分钟，默认 30）
// ========================================
import { watch, onUnmounted } from 'vue'
import { useAppStore } from '@/store'
import { useToast } from '@/composables/useToast'
import { getTodayISO } from '@/utils/orderTimeout'

const INTERVAL_MS = 30 * 1000
// 换班时间：每班当日 08:30 → 次日 08:30（与 ScheduleTable.vue 班次规则一致）
const SHIFT_START_HM = '08:30'
const MIN_INTERVAL = 5
const MAX_INTERVAL = 1440
const DEFAULT_INTERVAL = 30

let timer = null
// 仅「进入」（登录/刷新/切站）的那一轮才评估换班提醒；纯轮询跨过 08:30 不弹
let entryCheck = false

const clampInterval = (v) =>
  Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, Number(v) || DEFAULT_INTERVAL))

function buildMsg(pending) {
  const dates = pending.map(a => a.recordDate).sort()
  if (pending.length === 1) return `${pending[0].recordDate} 存在遗留问题，请及时处理`
  return `${pending.length} 个值班记录存在遗留问题（${dates.join('、')}），请及时处理`
}

export function usePendingReminder() {
  const store = useAppStore()
  const toast = useToast()

  const check = async () => {
    if (!store.isLoggedIn || !store.currentStationId) return
    try {
      await store.fetchDashboardAlerts()
    } catch { /* 后端不可用静默降级 */ }

    const map = store.systemConfigMap
    if (map['duty.pending_notify'] === false) return // 开关关闭
    const intervalMin = clampInterval(map['duty.pending_notify_interval'])
    const pending = (store.alerts || []).filter(a => a.type === 'pending')
    if (!pending.length) return // 无遗留问题：不动任何去重键

    const now = Date.now()
    const sid = store.currentStationId
    const shiftKey = `pendingNotify:lastShift:${sid}`
    const periodKey = `pendingNotify:lastPeriod:${sid}`

    // —— 换班提醒（仅进入页面的那一轮）——
    if (entryCheck) {
      entryCheck = false
      const today = getTodayISO()
      const shiftStart = new Date(`${today}T${SHIFT_START_HM}:00`).getTime()
      if (now >= shiftStart && localStorage.getItem(shiftKey) !== today) {
        toast.show({ type: 'warning', title: '换班提醒', message: buildMsg(pending), duration: 6000 })
        localStorage.setItem(shiftKey, today)
        // 弹完即更新上次定期时间，避免同一轮再触发定期提醒（防双弹）
        localStorage.setItem(periodKey, String(now))
      }
    }

    // —— 定期提醒（每轮都查）——
    const lastPeriod = Number(localStorage.getItem(periodKey)) || 0
    if (now - lastPeriod >= intervalMin * 60 * 1000) {
      toast.show({ type: 'warning', title: '遗留问题提醒', message: buildMsg(pending), duration: 6000 })
      localStorage.setItem(periodKey, String(now))
    }
  }

  const start = () => {
    stop()
    entryCheck = true
    // 配置需主动加载，否则「开关关闭 / 改间隔」在进过系统页前不生效
    if (!Object.keys(store.systemConfigMap).length) store.fetchSystemConfig()
    check()
    timer = setInterval(check, INTERVAL_MS)
  }

  const stop = () => {
    if (timer) { clearInterval(timer); timer = null }
  }

  watch(() => store.isLoggedIn, (v) => {
    if (v) start()
    else { stop(); store.alerts = [] }
  })

  // 切站后立即按新站判定（换班/定期去重键均按站点隔离）
  watch(() => store.currentStationId, () => {
    entryCheck = true
    if (store.isLoggedIn) check()
  })

  onUnmounted(() => {
    stop()
    entryCheck = false
  })

  // 刷新页面时若已登录则直接启动
  if (store.isLoggedIn) start()
}
