// ========================================
// 工单时限 / 超时判定 共享工具
// 统一口径，被 store 统计、工单列表徽标、全局临近超时提醒 三处复用
// ========================================

// HH:MM -> 总分钟数
export const toMinutes = (hhmm) => {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// 本地时区今天 YYYY-MM-DD
export const getTodayISO = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 本地时区当前时间 HH:MM
export const getNowHM = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * 计算单个工单的超时状态。
 *
 * @param {object}  item          DutyItem：{ content, acceptTime, endTime, isCompleted }
 * @param {string}  recordDate    所属值班记录日期 YYYY-MM-DD
 * @param {number}  limitMinutes  工单时限（分钟）
 * @returns {{ state: string, remainingMin: number, label: string } | null}
 *   - state 'ok'：未完成，剩余 >10 分钟，label「剩余 X 分钟」
 *   - state 'warning'：未完成，剩余 <=10 且 >0（临近超时），label「剩余 X 分钟」
 *   - state 'overdue'：未完成，已超时限，label「已超时」
 *   - state 'completed_overdue'：已完成但耗时超时限，label「超时 X 分钟」
 *   - null：无法判定（无内容 / 无受理时间 / 已完成且未超时）
 */
export function getItemTimeoutState(item, recordDate, limitMinutes) {
  if (!item || !item.content) return null
  const limit = Number(limitMinutes) || 45

  if (!item.isCompleted) {
    // 未完成：无受理时间无法判定（列表不标、提醒跳过、统计不计）
    if (!item.acceptTime) return null

    let elapsed
    if (recordDate === getTodayISO()) {
      // 当天：直接 HH:MM 差值，跨天（受理 23:50、现在 00:10）补 1440
      elapsed = toMinutes(getNowHM()) - toMinutes(item.acceptTime)
      if (elapsed < 0) elapsed += 1440
    } else {
      // 历史记录：必须用完整时间戳，否则历史未完成工单会被误判为"剩余 X 分钟"
      const start = new Date(`${recordDate}T${item.acceptTime}:00`).getTime()
      elapsed = (Date.now() - start) / 60000
    }

    const remainingMin = Math.round(limit - elapsed)
    if (remainingMin > 0) {
      return {
        state: remainingMin < 10 ? 'warning' : 'ok',
        remainingMin,
        label: `剩余 ${remainingMin} 分钟`
      }
    }
    return { state: 'overdue', remainingMin, label: '已超时' }
  }

  // 已完成：耗时超过时限 => 处理超时
  if (!item.acceptTime || !item.endTime) return null
  let dur = toMinutes(item.endTime) - toMinutes(item.acceptTime)
  if (dur < 0) dur += 1440 // 跨天完成
  if (dur > limit) {
    const overMin = Math.round(dur - limit)
    return { state: 'completed_overdue', remainingMin: -overMin, label: `超时 ${overMin} 分钟` }
  }
  return null
}
