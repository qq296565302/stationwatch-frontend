// ========================================
// 当日值班记录强制提醒
// 当日值班人员登录后，若今日尚未创建值班记录，弹出强制提醒弹窗
// 数据源：/records/today（今日记录）+ /schedule/table（今日排班）
// 触发范围：今日排班命中本人 → 弹；无今日排班行且 role=duty_officer → 回退弹
// 去重：本次登录内只弹一次（登出重置）；刷新页面已登录会重新评估
// 区别于 useOrderReminder / usePendingReminder：不做轮询，仅在登录/刷新/站点就位时评估一次
// ========================================
import { reactive, watch, onUnmounted } from 'vue'
import { useAppStore } from '@/store'
import { getShiftDateISO } from '@/utils/orderTimeout'

// 模块级单例：弹窗显隐状态（与 ConfirmDialog 同款驱动方式，由 App.vue 挂载的组件消费）
const dialog = reactive({
  visible: false,
  title: '值班台账提醒',
  message: ''
})

// 本次登录内是否已弹过（展示即置位，登出经 stop() 重置 → 下次登录再弹）
let sessionShown = false
// 本次登录是否已完成一次「今日判定」（避免站点异步就位时重复评估）
let evaluated = false
// 防并发 in-flight 锁
let evaluating = false

export function useDutyReminder() {
  const store = useAppStore()

  const evaluate = async () => {
    // 前置守卫
    if (sessionShown) return          // 本次登录已弹过
    if (!store.isLoggedIn) return
    if (!store.currentStationId) return // 站点未就位，交给 currentStationId watcher 补
    if (evaluating) return
    evaluating = true

    // 值班班次为当日08:30~次日08:30，凌晨归属前一天班次：用班次日期取记录与排班
    const today = getShiftDateISO()
    // 并行容错拉取：绝不因本功能抛错影响页面
    const [recRes] = await Promise.allSettled([
      store.fetchRecordByDate(today),
      store.fetchScheduleTable({ from: today, days: 1 })
    ])
    evaluating = false

    // 今日记录接口失败（后端不可用）→ 静默降级不弹
    if (recRes.status === 'rejected') return
    evaluated = true // 无论是否弹窗，本次判定完成

    // 今日已有记录（active/locked/archived 均算已创建）→ 不弹
    if (recRes.value != null) return

    // 排班判定：今日排班命中本人 → 弹；无今日排班行 + 值班员 → 回退弹
    // 支持同一天多个班次：取当天所有到岗组的人员合并判断
    const row = store.scheduleTable.find(r => r.date === today)
    const groups = row && Array.isArray(row.groups) && row.groups.length
      ? row.groups
      : (row && row.members && row.members.length ? [{ members: row.members }] : [])
    const allMembers = groups.flatMap(g => g.members || [])
    const inRow = allMembers.some(m => String(m.id) === String(store.user.id))
    const shouldPop = inRow || (!row && store.user.role === 'duty_officer')
    if (!shouldPop) return

    dialog.message = `${today} 尚未创建值班记录，请及时填写台账，避免遗漏。`
    dialog.visible = true
    sessionShown = true
  }

  const start = () => {
    stop()
    evaluated = false
    if (store.currentStationId) evaluate()
  }

  const stop = () => {
    sessionShown = false
    evaluated = false
    evaluating = false
    dialog.visible = false
  }

  const dismiss = () => { dialog.visible = false }

  watch(() => store.isLoggedIn, (v) => {
    if (v) start()
    else stop()
  })

  // admin/district_admin 无 stationId，登录后由 login action 内 fetchStations 兜底首个站，
  // 站点异步就位时补一次评估（evaluated 保证只补一次）
  watch(() => store.currentStationId, () => {
    if (store.isLoggedIn && !evaluated) evaluate()
  })

  onUnmounted(() => {
    stop()
  })

  // 刷新页面且已登录（persisted.user 恢复）→ 直接启动
  if (store.isLoggedIn) start()

  return { dialog, dismiss }
}
