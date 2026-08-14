// ========================================
// 值班遗留问题提醒
// 换班开始（每天 08:30 后首次进入页面）弹一次 + 未解决期间按可配置间隔定期提醒
// 高显眼结构化列表弹窗 + 警报声（与工单超时的强提醒一致）
// 数据源：复用 /dashboard/alerts 的 type='pending' 告警（聚合当前用户全部可见站点）
// 弹窗列表每条=日期+站名+未解决项数，点击列表项跳转对应记录详情处置
// 开关：系统设置 duty.pending_notify（缺省=开）；间隔：duty.pending_notify_interval（分钟，默认 30）
// ========================================
import { reactive, watch, onUnmounted } from 'vue'
import { useAppStore } from '@/store'
import { getTodayISO } from '@/utils/orderTimeout'
import { playAlarm } from '@/utils/alarm'

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

// 弹窗单例：标题 + 列表（每条 { recordId, recordDate, stationName, count }）
const dialog = reactive({ visible: false, title: '遗留问题提醒', list: [] })
const dismiss = () => { dialog.visible = false }

export function usePendingReminder() {
  const store = useAppStore()

  // 并行拉取每条记录的未解决遗留问题数（persist=false 不入库，避免污染主控台单站统计）
  const enrich = async (pending) => {
    const items = await Promise.all(pending.map(async (a) => {
      let count = 0
      try {
        const rec = await store.fetchRecordById(a.recordId, false)
        count = (rec?.pendingIssues || []).filter(p => !p.isResolved).length
      } catch { /* 拉取失败降级 count=0，条目仍可跳转处置 */ }
      return { recordId: a.recordId, recordDate: a.recordDate, stationName: a.stationName || '', count }
    }))
    return items.sort((a, b) => b.recordDate.localeCompare(a.recordDate)) // 最新在前
  }

  const showDialog = async (pending, title) => {
    dialog.list = await enrich(pending)
    dialog.title = title
    dialog.visible = true
    playAlarm()
  }

  const check = async () => {
    if (!store.isLoggedIn) return
    try {
      await store.fetchDashboardAlerts()
    } catch { /* 后端不可用静默降级 */ }

    const map = store.systemConfigMap
    if (map['duty.pending_notify'] === false) return // 开关关闭
    const intervalMin = clampInterval(map['duty.pending_notify_interval'])
    const pending = (store.alerts || []).filter(a => a.type === 'pending')
    if (!pending.length) return // 无遗留问题：不动任何去重键

    const now = Date.now()
    // 聚合后按用户去重（而非单站），管理员切站不重复弹换班提醒
    const uid = store.user?.id ?? 'anon'
    const shiftKey = `pendingNotify:lastShift:${uid}`
    const periodKey = `pendingNotify:lastPeriod:${uid}`

    // —— 换班提醒（仅进入页面的那一轮）——
    if (entryCheck) {
      entryCheck = false
      const today = getTodayISO()
      const shiftStart = new Date(`${today}T${SHIFT_START_HM}:00`).getTime()
      if (now >= shiftStart && localStorage.getItem(shiftKey) !== today) {
        await showDialog(pending, '换班提醒')
        localStorage.setItem(shiftKey, today)
        // 弹完即更新上次定期时间，避免同一轮再触发定期提醒（防双弹）
        localStorage.setItem(periodKey, String(now))
      }
    }

    // —— 定期提醒（每轮都查）——
    const lastPeriod = Number(localStorage.getItem(periodKey)) || 0
    if (now - lastPeriod >= intervalMin * 60 * 1000) {
      await showDialog(pending, '遗留问题提醒')
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

  // 切站后立即重新判定（换班/定期去重键均按用户隔离）
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

  return { dialog, dismiss }
}
