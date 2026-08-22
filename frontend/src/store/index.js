import { defineStore } from 'pinia'
import api, { setAuth, clearAuth } from '@/api/client'
import {
  weatherOptions,
  roleMap,
  getCurrentDate,
  getCurrentDateISO,
  getCurrentTime
} from '@/data/mockData'
import { toMinutes, getTodayISO, getShiftDateISO, getNowHM, getItemTimeoutState } from '@/utils/orderTimeout'

const STORAGE_KEY = 'dutyguard_auth'

const loadAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

// 后端用户格式 -> 前端期望格式
const normalizeUser = (u) => {
  if (!u) return null
  const role = u.role
  const roleName = (roleMap[role] && roleMap[role].label) || role
  const realName = u.realName || u.username
  return {
    id: u.id,
    username: u.username,
    realName,
    role,
    roleName,
    stationId: u.stationId ?? null,
    districtId: u.districtId ?? null,
    stationName: u.stationName || '',
    avatar: realName?.slice(-1) || u.username?.slice(-1) || '?'
  }
}

// 解析遗留问题为条目数组：兼容后端数组 / JSON 串 / 旧纯文本（按行拆成未解决条目，占位 id）
const parsePendingIssues = (v) => {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return []
    if (t.startsWith('[')) {
      try {
        const arr = JSON.parse(t)
        if (Array.isArray(arr)) return arr
      } catch { /* 非法 JSON 视为纯文本 */ }
    }
    return t.split('\n').map((s, i) => ({
      id: `legacy-${i}`,
      content: s.trim(),
      isResolved: false,
      resolvedAt: null,
      resolvedBy: null,
      resolvedByName: null
    })).filter(p => p.content)
  }
  return []
}

// 规范化一条 record：items -> dutyItems，遗留问题解析为数组 + 派生回填文本（仅未解决行）
const normalizeRecord = (r) => {
  if (!r) return null
  const pendingIssues = parsePendingIssues(r.pendingIssues)
  const pendingText = pendingIssues.filter(p => !p.isResolved).map(p => p.content).join('\n')
  return {
    ...r,
    pendingIssues,
    pendingText,
    dutyItems: r.items || r.dutyItems || [],
    itemCount: r.itemCount ?? (r.items || r.dutyItems || []).filter(i => i.content).length,
    completedCount: r.completedCount ?? (r.items || r.dutyItems || []).filter(i => i.isCompleted).length,
    hasPending: r.hasPending ?? pendingIssues.some(p => !p.isResolved),
    creator: r.creator?.realName || r.creatorName || r.creator || '未知',
    creatorId: r.creator?.id ?? r.creatorId,
    station: r.station?.name || r.stationName || r.station || '',
    stationId: r.station?.id ?? r.stationId,
    status: r.status || 'active',
    dutyOfficers: r.dutyOfficers || []
  }
}

const persisted = loadAuth()

export const useAppStore = defineStore('app', {
  state: () => ({
    // 用户 & 权限
    user: normalizeUser(persisted?.user) || {
      id: 0,
      username: '',
      realName: '',
      role: 'duty_officer',
      roleName: '值班员',
      stationId: null,
      districtId: null,
      stationName: '',
      avatar: '?'
    },
    isLoggedIn: !!persisted?.user,

    // 当前站点上下文：admin 可切换，supervisor/duty_officer 固定为本所
    currentStationId: persisted?.user?.stationId ?? null,

    // 用户列表（系统配置-值班员管理）
    users: [],
    // 按站点缓存的值班员名单（办理人员候选）：{ [stationId]: [{label, username}] }
    stationOfficers: {},
    // 站点列表（新增/编辑值班员时选择所属站点；已按角色可见范围过滤）
    stations: [],
    // 区县列表（组织层级：市级→区县→供电所）
    districts: [],

    // 系统配置
    systemConfig: {
      stationName: persisted?.user?.stationName || '东郊供电所',
      voltage: '10kV',
      feeders: 8,
      transformers: 24
    },
    // 后端 system_configs 解析后的 key-value map（从 /system/config 拉取）
    systemConfigMap: {},

    // 业务数据
    records: [],
    weatherOptions: [...weatherOptions],
    recordStatusMap: {
      active: { label: '进行中', color: 'info' },
      locked: { label: '已锁定', color: 'warn' },
      archived: { label: '已归档', color: 'muted' }
    },
    roleMap,

    // 仪表板
    stats: {},
    activities: [],
    alerts: [],
    monthlyStats: [],
    equipment: {},
    exports: [],

    // 值班排班
    scheduleConfig: { configured: false, startDate: null, cycleDays: 5, groups: [] },
    scheduleTable: [],

    // 字典
    dictionaries: {
      businessTypes: [],
      acceptContents: [],
      results: [],
      officers: []
    },

    // 加载状态
    recordsLoaded: false,
    dictionariesLoaded: false,
    loadingRecords: false,

    // UI 状态
    sidebarCollapsed: false,
    // 全局字体缩放：1 默认 / 1.5 大 / 2 巨大（持久化，刷新保持）
    fontScale: Number(localStorage.getItem('dutyguard_font_scale')) || 1,
    currentTime: getCurrentTime(),

    // 是否该温和提示"修改默认密码"（登录时由后端判定，一周内不重复、admin 不提示）
    shouldPromptPasswordChange: false,
    // 全局修改密码弹窗开关（Sidebar 与提示横幅共用）
    changePasswordDialogVisible: false
  }),

  getters: {
    // ===== 角色权限辅助（供路由/按钮显隐复用） =====
    isAdmin(state) { return state.user.role === 'admin' },
    isDistrictAdmin(state) { return state.user.role === 'district_admin' },
    // 登录后默认落地页：超级管理员 / 区县管理员 → 全站概览（本区县数据），其他角色 → 主控台
    defaultPath(state) {
      return ['admin', 'district_admin'].includes(state.user.role) ? '/overview' : '/dashboard'
    },
    // 可在站点间切换：市级超管（全市）与区县管理员（本区县）
    canSwitchStation(state) { return ['admin', 'district_admin'].includes(state.user.role) },
    // 可管理站点/账号：市级超管与区县管理员
    canManageStation(state) { return ['admin', 'district_admin'].includes(state.user.role) },
    // 可创建/编辑值班记录：区县管理员无此权限
    canCreateRecord(state) { return state.user.role !== 'district_admin' },
    canExport(state) { return ['supervisor', 'district_admin', 'admin'].includes(state.user.role) },
    // 当前用户可见站点列表：admin 全部、district_admin 本区县、其余仅当前站
    visibleStations(state) {
      if (state.user.role === 'admin') return state.stations
      if (state.user.role === 'district_admin') {
        return state.stations.filter(s => s.districtId === state.user.districtId)
      }
      return state.stations.filter(s => s.id === state.currentStationId)
    },
    canEditRecord: (state) => (record) => {
      // 区县管理员无值班记录编辑权限
      if (state.user.role === 'district_admin') return false
      return state.user.role !== 'duty_officer' ||
        (record && record.creatorId === state.user.id)
    },
    // 编辑权限（含锁定记录）：锁定记录仅超级管理员可编辑，其余走 canEditRecord 逻辑
    canEditRecordFor: (state) => (record) => {
      // 区县管理员无值班记录编辑权限
      if (state.user.role === 'district_admin') return false
      if (record && record.status === 'locked') {
        return state.user.role === 'admin'
      }
      return state.user.role !== 'duty_officer' ||
        (record && record.creatorId === state.user.id)
    },
    // 新增值班事项权限：所有值班员/所长/管理员均可在记录中添加工单（不限创建人）；
    // 区县管理员无权；锁定记录仅超级管理员可操作
    canAddItemToRecord: (state) => (record) => {
      if (state.user.role === 'district_admin') return false
      if (record && record.status === 'locked') {
        return state.user.role === 'admin'
      }
      return true
    },

    // 今日值班：命中「当前班次」的 active 记录。
    // 班次为当日08:30~次日08:30，凌晨(<08:30)归属前一天班次，故用班次日期而非自然日，
    // 否则凌晨新建的记录(recordDate=昨天)会找不到，导致今日值班卡片空白。
    activeRecord(state) {
      return state.records.find(r => r.recordDate === getShiftDateISO() && r.status === 'active')
    },
    // 值班记录生命周期状态：当天=进行中，前一天=即将锁定（红色 crit），锁定/归档走原始状态
    recordDisplayStatus(state) {
      const today = getShiftDateISO()
      const d = new Date(today + 'T00:00:00')
      d.setDate(d.getDate() - 1)
      const p = (n) => String(n).padStart(2, '0')
      const yesterday = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
      return (record) => {
        if (record.status === 'active') {
          if (record.recordDate === today) return { label: '进行中', variant: 'info' }
          if (record.recordDate === yesterday) return { label: '即将锁定', variant: 'crit' }
          return { label: '进行中', variant: 'info' }
        }
        if (record.status === 'locked') return { label: '已锁定', variant: 'warn' }
        if (record.status === 'archived') return { label: '已归档', variant: 'muted' }
        return { label: record.status || '-', variant: 'muted' }
      }
    },
    findRecordByDate: (state) => (isoDate) => {
      return state.records.find(r => r.recordDate === isoDate)
    },
    myRecords(state) {
      return state.records.filter(r => r.creatorId === state.user.id)
    },
    pendingIssuesCount(state) {
      return state.records.filter(r => r.hasPending && r.status !== 'archived').length
    },
    monthCompletionRate(state) {
      const total = state.records.reduce((sum, r) => sum + r.itemCount, 0)
      const done = state.records.reduce((sum, r) => sum + r.completedCount, 0)
      return total === 0 ? 0 : Math.round((done / total) * 100)
    },

    // 当前站点工单时限（分钟），站点级配置，缺省 60
    currentStationOrderTimeLimit(state) {
      return state.stations.find(s => s.id === state.currentStationId)?.orderTimeLimit ?? 60
    },

    // ===== 聚合统计 =====
    itemsInRange: (state) => (startISO, endISO) => {
      const result = []
      state.records.forEach(r => {
        if (r.recordDate < startISO || r.recordDate > endISO) return
        r.dutyItems.forEach(item => result.push({ ...item, _recordDate: r.recordDate }))
      })
      return result
    },
    dailyItemTrend: (state) => (startISO, endISO) => {
      const map = new Map()
      state.records.forEach(r => {
        if (r.recordDate < startISO || r.recordDate > endISO) return
        if (!map.has(r.recordDate)) map.set(r.recordDate, { date: r.recordDate, total: 0, done: 0, pending: 0 })
        const bucket = map.get(r.recordDate)
        bucket.total += r.dutyItems.filter(i => i.content).length
        bucket.done += r.dutyItems.filter(i => i.isCompleted).length
        bucket.pending += r.dutyItems.filter(i => i.content && !i.isCompleted).length
      })
      return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
    },
    businessTypeDistribution: (state) => (startISO, endISO) => {
      const map = new Map()
      state.records.forEach(r => {
        if (r.recordDate < startISO || r.recordDate > endISO) return
        r.dutyItems.forEach(item => {
          if (!item.content) return
          const k = item.businessType || '未分类'
          if (!map.has(k)) map.set(k, { label: k, value: 0, done: 0 })
          const b = map.get(k)
          b.value += 1
          if (item.isCompleted) b.done += 1
        })
      })
      return Array.from(map.values()).sort((a, b) => b.value - a.value)
    },
    // 重复工单统计：同一客户名称 或 同一联系地址 任一重复（≥2 次）即计入；同时命中两条的工单去重后只计 1 条
    duplicateWorkOrders: (state) => (startISO, endISO) => {
      const items = []
      state.records.forEach(r => {
        if (r.recordDate < startISO || r.recordDate > endISO) return
        r.dutyItems.forEach(it => { if (it.content) items.push({ ...it, _recordDate: r.recordDate }) })
      })
      // 空值不参与分组（空值之间不算"同一"）
      const key = (v) => { const s = String(v ?? '').trim(); return s || null }
      const group = (arr, keyFn) => {
        const map = new Map()
        arr.forEach(it => {
          const k = keyFn(it)
          if (!k) return
          if (!map.has(k)) map.set(k, [])
          map.get(k).push(it)
        })
        return Array.from(map.entries())
          .filter(([, list]) => list.length >= 2) // 出现 ≥2 次
          .map(([k, list]) => ({
            key: k,
            count: list.length,
            items: [...list].sort((a, b) => a._recordDate.localeCompare(b._recordDate))
          }))
          .sort((a, b) => b.count - a.count)
      }
      const customerGroups = group(items, it => key(it.customerName))
      const addressGroups = group(items, it => key(it.customerAddress))
      // item.id 全局唯一（后端 nextIdOf('item')），去重安全
      const dupIds = new Set()
      ;[...customerGroups, ...addressGroups].forEach(g => g.items.forEach(it => dupIds.add(it.id)))
      return { total: dupIds.size, customerGroups, addressGroups }
    },
    efficiencyMetrics: (state) => (startISO, endISO) => {
      const allItems = []
      state.records.forEach(r => {
        if (r.recordDate < startISO || r.recordDate > endISO) return
        r.dutyItems.forEach(item => { if (item.content) allItems.push({ ...item, _recordDate: r.recordDate }) })
      })
      const total = allItems.length
      const done = allItems.filter(i => i.isCompleted).length
      const completion = total === 0 ? 0 : Math.round((done / total) * 100)
      const durations = allItems
        .filter(i => i.isCompleted && i.acceptTime && i.endTime)
        .map(i => {
          // 当天记录且受理时间晚于当前时刻（误填未来）：真实耗时无法确定，返回 0 由下方 d>0 过滤
          if (i._recordDate === getTodayISO() && toMinutes(i.acceptTime) > toMinutes(getNowHM())) return 0
          let d = toMinutes(i.endTime) - toMinutes(i.acceptTime)
          if (d < 0) d += 1440 // 跨天完成补 1440
          return d
        })
        .filter(d => d > 0 && d < 24 * 60)
      const avgDuration = durations.length ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length) : 0
      const sorted = [...durations].sort((a, b) => a - b)
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
      const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : 0
      // 超时工单（按工单时限判定，统一口径见 utils/orderTimeout.js）：
      //   未完成且从受理起超过时限，或已完成但处理耗时超过时限
      const limit = state.stations.find(s => s.id === state.currentStationId)?.orderTimeLimit ?? 60
      let overdue = 0
      allItems.forEach(item => {
        const st = getItemTimeoutState(item, item._recordDate, limit)
        if (st && st.state !== 'ok' && st.state !== 'warning') overdue++
      })
      return { total, done, completion, avgDuration, median, p90, overdue, overdueRate: total === 0 ? 0 : Math.round((overdue / total) * 100) }
    },
    heatmapData: (state) => (startISO, endISO) => {
      const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
      let max = 0
      state.records.forEach(r => {
        if (r.recordDate < startISO || r.recordDate > endISO) return
        r.dutyItems.forEach(item => {
          if (!item.acceptTime || !item.content) return
          const [h] = item.acceptTime.split(':').map(Number)
          const day = new Date(r.recordDate).getDay()
          const dayIdx = day === 0 ? 6 : day - 1
          grid[dayIdx][h] += 1
          if (grid[dayIdx][h] > max) max = grid[dayIdx][h]
        })
      })
      return { grid, max }
    }
  },

  actions: {
    // ============ 认证 ============
    async login(credentials) {
      const username = (credentials.username || '').trim()
      const password = credentials.password || ''
      const resp = await api.post('/auth/login', { username, password })
      // resp 是 { code, data, message }
      const data = resp.data || resp
      const user = normalizeUser(data.user)
      this.user = user
      this.isLoggedIn = true
      this.currentStationId = user.stationId
      this.systemConfig.stationName = user.stationName || this.systemConfig.stationName
      // 后端判断"是否该提示修改默认密码"（一周内不重复、admin 不提示）
      this.shouldPromptPasswordChange = !!data.shouldPromptPasswordChange
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      })
      // 区县管理员等无 stationId 的用户：拉取可见站点并兜底首个，维持单站视角
      if (!user.stationId) await this.fetchStations()
      return true
    },

    async logout() {
      try { await api.post('/auth/logout') } catch {}
      this.isLoggedIn = false
      this.user = {
        id: 0, username: '', realName: '', role: 'duty_officer',
        roleName: '值班员', stationId: null, districtId: null, stationName: '', avatar: '?'
      }
      this.records = []
      this.recordsLoaded = false
      this.alerts = []
      this.currentStationId = null
      // 清空站点上下文，避免上一次登录的站点名/列表残留
      this.stations = []
      this.districts = []
      this.systemConfig = {
        stationName: '',
        voltage: '10kV',
        feeders: 8,
        transformers: 24
      }
      this.systemConfigMap = {}
      clearAuth()
    },

    async fetchCurrentUser() {
      try {
        const resp = await api.get('/auth/me')
        const data = resp.data || resp
        const user = normalizeUser(data)
        this.user = user
        this.isLoggedIn = true
        this.currentStationId = user.stationId
        this.systemConfig.stationName = user.stationName || this.systemConfig.stationName
        // 区县管理员等无 stationId 的用户：拉取可见站点并兜底首个
        if (!user.stationId) await this.fetchStations()
      } catch (e) {
        this.isLoggedIn = false
        throw e
      }
    },

    async changePassword(oldPassword, newPassword) {
      await api.put('/auth/password', { oldPassword, newPassword })
      // 已主动修改密码：清除"需改默认密码"提醒
      this.shouldPromptPasswordChange = false
    },

    // 温和提示横幅：关闭本次会话的提醒（下次登录由后端按一周频率再次判定）
    dismissPasswordPrompt() {
      this.shouldPromptPasswordChange = false
    },

    // 打开修改密码弹窗（供提示横幅跳转复用）
    openChangePasswordDialog() {
      this.changePasswordDialogVisible = true
    },

    // 用户列表（管理员/所长接口，按当前站点）
    async fetchUsers() {
      try {
        const params = { page: 1, pageSize: 100 }
        if (this.currentStationId) params.stationId = this.currentStationId
        const resp = await api.get('/users', { params })
        const data = resp.data || resp
        this.users = data.list || []
      } catch (e) {
        this.users = []
      }
    },

    // 站点列表（值班员所属站点下拉）
    async fetchStations() {
      try {
        const resp = await api.get('/stations')
        const data = resp.data || resp
        this.stations = Array.isArray(data) ? data : (data.list || [])
        // admin 未指定当前站点时兜底到第一个启用站点，并同步站点名展示，保证显示与数据一致
        if (!this.currentStationId && Array.isArray(this.stations) && this.stations.length) {
          const active = this.stations.find(s => s.isActive) || this.stations[0]
          this.currentStationId = active.id
          this.user.stationName = active.name
          this.systemConfig.stationName = active.name
        }
      } catch (e) {
        this.stations = []
      }
    },

    // 切换当前站点（市级超管/区县管理员）：同步站点名并刷新各页数据
    async setCurrentStation(id) {
      this.currentStationId = Number(id)
      const st = this.stations.find(s => s.id === Number(id))
      if (st) {
        this.user.stationName = st.name
        this.systemConfig.stationName = st.name
      }
      if (this.isLoggedIn) {
        await Promise.allSettled([
          this.fetchRecords(),
          this.fetchScheduleConfig(),
          this.fetchScheduleTable(),
          this.fetchUsers(),
          this.fetchDashboardActivities(),
          this.fetchExportHistory(1, 20)
        ])
      }
    },

    // 区县列表（TopBar 切换器按区县分组、SystemView 站点表单区县下拉用）
    async fetchDistricts() {
      try {
        const resp = await api.get('/districts')
        const data = resp.data || resp
        this.districts = Array.isArray(data) ? data : []
      } catch (e) {
        this.districts = []
      }
    },

    // 删除站点（市级超管/区县管理员，后端会校验引用）
    async deleteStation(id) {
      const resp = await api.delete(`/stations/${id}`)
      this.stations = this.stations.filter(s => s.id !== Number(id))
      return resp.data || resp
    },

    // 新增站点（仅管理员）
    async createStation(data) {
      const resp = await api.post('/stations', data)
      const s = resp.data || resp
      this.stations.push(s)
      return s
    },

    // 更新站点（管理员任意站点，所长仅本所，系统配置-站点信息）
    async updateStation(id, data) {
      const resp = await api.put(`/stations/${id}`, data)
      const s = resp.data || resp
      const idx = this.stations.findIndex(x => x.id === Number(id))
      if (idx >= 0) this.stations[idx] = s
      else this.stations.push(s)
      // 当前站点名同步到展示
      if (s.name && this.currentStationId === Number(id)) {
        this.user.stationName = s.name
        this.systemConfig.stationName = s.name
      }
      return s
    },

    // 新增/更新用户（后端返回脱敏后的用户对象）
    async createUser(data) {
      const resp = await api.post('/users', data)
      const u = resp.data || resp
      this.users.push(u)
      return u
    },

    async updateUser(id, data) {
      const resp = await api.put(`/users/${id}`, data)
      const u = resp.data || resp
      const idx = this.users.findIndex(x => x.id === Number(id))
      if (idx >= 0) this.users[idx] = u
      else this.users.push(u)
      return u
    },

    // 管理员重置指定用户密码（后端会吊销该用户 refresh token）
    async resetPassword(id, newPassword) {
      const resp = await api.post(`/users/${id}/reset-password`, { newPassword })
      return resp.data || resp
    },

    // 删除值班员/用户（市级超管/区县管理员/所长，后端会校验范围并吊销其登录态）
    async deleteUser(id) {
      const resp = await api.delete(`/users/${id}`)
      this.users = this.users.filter(u => u.id !== Number(id))
      return resp.data || resp
    },

    // ============ 值班排班（按当前站点） ============
    async fetchScheduleConfig() {
      try {
        const params = this.currentStationId ? { stationId: this.currentStationId } : {}
        const resp = await api.get('/schedule/config', { params })
        this.scheduleConfig = resp.data || resp || { configured: false, startDate: null, cycleDays: 5, groups: [] }
      } catch {
        this.scheduleConfig = { configured: false, startDate: null, cycleDays: 5, groups: [] }
      }
      return this.scheduleConfig
    },

    async updateScheduleConfig(payload) {
      const body = { ...payload, stationId: payload.stationId ?? this.currentStationId }
      const resp = await api.put('/schedule/config', body)
      this.scheduleConfig = resp.data || resp || this.scheduleConfig
      await this.fetchScheduleTable() // 保存后刷新表格
      return this.scheduleConfig
    },

    async fetchScheduleTable(params = {}) {
      try {
        const st = params.stationId ?? this.currentStationId
        const q = st ? { ...params, stationId: st } : params
        const resp = await api.get('/schedule/table', { params: q })
        this.scheduleTable = resp.data || resp || []
      } catch {
        this.scheduleTable = []
      }
      return this.scheduleTable
    },

    // ============ 值班员名单（办理人员候选，按站点） ============
    // 按指定站点拉取该所值班员（对登录用户开放，不受 /users 权限限制），并缓存
    async fetchOfficersByStation(stationId) {
      if (!stationId) return []
      if (this.stationOfficers[stationId]) return this.stationOfficers[stationId]
      try {
        const resp = await api.get('/dictionaries/officers', { params: { stationId } })
        const data = resp.data || resp
        const list = (Array.isArray(data) ? data : []).map(o => ({
          label: typeof o === 'string' ? o : (o?.label ?? o?.realName ?? ''),
          username: typeof o === 'string' ? o : (o?.username ?? '')
        })).filter(o => o.label)
        this.stationOfficers[stationId] = list
        return list
      } catch {
        return []
      }
    },

    // ============ 字典 ============
    async fetchDictionaries(force = false) {
      if (this.dictionariesLoaded && !force) return
      // 用 allSettled：单个字典接口（如 officers 对普通值班员 403）失败不影响其它字典加载，
      // 避免一个接口 403 导致 dictionariesLoaded 永不置位、每次导航重复请求
      const results = await Promise.allSettled([
        api.get('/dictionaries/business-types'),
        api.get('/dictionaries/accept-contents'),
        api.get('/dictionaries/results'),
        api.get(`/dictionaries/officers${this.currentStationId ? '?stationId=' + this.currentStationId : ''}`),
        api.get('/dictionaries/weather-options')
      ])
      const pick = (i, fallback) => results[i].status === 'fulfilled'
        ? (results[i].value?.data ?? results[i].value ?? fallback)
        : fallback
      this.dictionaries.businessTypes  = pick(0, [])
      this.dictionaries.acceptContents = pick(1, [])
      this.dictionaries.results        = pick(2, [])
      this.dictionaries.officers       = pick(3, [])
      const wopt = pick(4, this.weatherOptions)
      if (Array.isArray(wopt) && wopt.length) this.weatherOptions = wopt
      this.dictionariesLoaded = true
    },

    // ============ 记录 ============
    async fetchRecords(params = {}) {
      this.loadingRecords = true
      try {
        const st = params.stationId ?? this.currentStationId
        const q = st ? { ...params, stationId: st } : params
        const resp = await api.get('/records', { params: q })
        const data = resp.data || resp
        this.records = (data.list || []).map(normalizeRecord)
        this.recordsLoaded = true
        return data
      } finally {
        this.loadingRecords = false
      }
    },

    async fetchRecordById(id, persist = true) {
      const resp = await api.get(`/records/${id}`)
      // 只取业务 data；错误/无效响应（如 /records/undefined 或 404）时 data 为 null，
      // 不污染 records，避免切站/路由跳转瞬间插入"未知记录"
      const data = resp?.data ?? null
      if (!data || typeof data !== 'object' || data.id == null) return null
      const record = normalizeRecord(data)
      // persist=false：仅取明细不入库（遗留问题弹窗拉跨站历史记录时用，避免污染单站统计）
      if (persist) {
        const idx = this.records.findIndex(r => r.id === record.id)
        if (idx >= 0) this.records[idx] = record
        else this.records.unshift(record)
      }
      return record
    },

    async fetchRecordByDate(date) {
      try {
        const params = { date }
        if (this.currentStationId) params.stationId = this.currentStationId
        const resp = await api.get('/records/find-by-date', { params })
        // 只取业务 data；无记录时 data 为 null，不可回退到响应体
        const data = resp?.data ?? null
        if (!data) return null
        const record = normalizeRecord(data)
        const idx = this.records.findIndex(r => r.id === record.id)
        if (idx >= 0) this.records[idx] = record
        else this.records.unshift(record)
        return record
      } catch (e) {
        if (e.code === 20001) return null
        throw e
      }
    },

    async fetchTodayRecord() {
      try {
        const params = this.currentStationId ? { stationId: this.currentStationId } : {}
        const resp = await api.get('/records/today', { params })
        // 只取业务 data；后端无记录时 data 为 null，绝不可回退到整个响应体（否则会插入幽灵记录）
        const data = resp?.data ?? null
        if (!data) return null
        const record = normalizeRecord(data)
        const idx = this.records.findIndex(r => r.id === record.id)
        if (idx >= 0) this.records[idx] = record
        else this.records.unshift(record)
        return record
      } catch (e) {
        if (e.code === 20001) return null
        throw e
      }
    },

    // 主控台提醒专用：聚合拉取全部可见站今日记录（不写 state.records，避免污染单站统计口径）
    async fetchAllTodayRecords() {
      const stations = this.stations.length
        ? this.stations
        : (this.currentStationId ? [{ id: this.currentStationId }] : [])
      const results = await Promise.allSettled(stations.map(s =>
        api.get('/records/today', { params: { stationId: s.id } })
      ))
      const out = []
      results.forEach((res, i) => {
        if (res.status !== 'fulfilled') return
        const data = res.value?.data ?? res.value ?? null
        if (!data) return
        const record = normalizeRecord(data)
        out.push({
          stationId: stations[i].id,
          stationName: stations[i].name || '',
          orderTimeLimit: stations[i].orderTimeLimit,
          record
        })
      })
      return out
    },

    // ============ 跨站聚合看板（各供电所总览） ============
    // 优先调用后端聚合接口 /records/overview；后端未实现时回退为前端逐站拉取再本地汇总。
    // 返回 shape（与后端接口约定一致）：
    // {
    //   totals: { total, done, completion, overdue, overdueRate, stationCount },
    //   stations: [{ stationId, stationName, region, total, done, completion, overdue,
    //                avgDuration, satisfied, rated, satisfactionRate }],
    //   trend:    [{ date, total, done, pending }],
    //   businessTypes: [{ label, value, done }],
    //   heatmap:  { grid: 7×24 数字矩阵（星期×小时）, max },
    //   response: { avgDuration, median, p90 },        // 跨站响应时长（分钟）
    //   satisfaction: { rated, satisfied, rate },      // 跨站客户满意度
    //   duplicates: { total, customerGroups, addressGroups } // 跨站重复报修
    // }
    async fetchStationOverview(startDate, endDate) {
      // ---- 主路径：后端聚合接口 ----
      try {
        const resp = await api.get('/records/overview', { params: { startDate, endDate } })
        const data = resp?.data ?? resp
        if (data && (Array.isArray(data.stations) || Array.isArray(data.trend))) {
          return this._normalizeOverview(data)
        }
        throw new Error('overview fallback')
      } catch {
        // ---- 兜底：前端逐站拉取聚合 ----
        return this._aggregateOverviewLocally(startDate, endDate)
      }
    },

    // 后端返回的聚合数据规范化（补齐缺失字段，保证视图消费结构稳定）
    _normalizeOverview(data) {
      const stations = (data.stations || []).map(s => {
        const total = Number(s.total) || 0
        const done = Number(s.done) || 0
        const rated = Number(s.rated) || 0
        const satisfied = Number(s.satisfied) || 0
        return {
          stationId: s.stationId ?? s.id,
          stationName: s.stationName ?? s.name ?? '',
          // 区县归属：优先用 districtId 关联 store.districts，缺失时回退 region（区县名）
          districtId: s.districtId ?? s.district_id ?? null,
          region: s.region ?? s.districtName ?? '',
          total,
          done,
          completion: s.completion != null ? Number(s.completion) : this._completionOf(done, total),
          overdue: Number(s.overdue) || 0,
          avgDuration: Number(s.avgDuration) || 0,
          satisfied,
          rated,
          satisfactionRate: s.satisfactionRate != null ? Number(s.satisfactionRate) : this._completionOf(satisfied, rated)
        }
      })
      const trend = (data.trend || []).map(t => ({
        date: t.date,
        total: Number(t.total) || 0,
        done: Number(t.done) || 0,
        pending: Number(t.pending) || 0
      })).sort((a, b) => a.date.localeCompare(b.date))
      const businessTypes = (data.businessTypes || []).map(b => ({
        label: b.label ?? b.businessType ?? '未分类',
        value: Number(b.value) || 0,
        done: Number(b.done) || 0
      })).sort((a, b) => b.value - a.value)
      const totals = data.totals || this._totalsOf(stations, trend, businessTypes)
      const tDone = Number(totals.done) || 0
      const tTotal = Number(totals.total) || 0
      // 响应时长 / 满意度：后端未返回时由各站数据兜底推导
      const resp = data.response || {}
      const sat = data.satisfaction || {}
      const satRated = sat.rated != null ? Number(sat.rated) : stations.reduce((s, x) => s + x.rated, 0)
      const satSatisfied = sat.satisfied != null ? Number(sat.satisfied) : stations.reduce((s, x) => s + x.satisfied, 0)
      const dup = data.duplicates || {}
      return {
        totals: {
          total: tTotal,
          done: tDone,
          completion: totals.completion != null ? Number(totals.completion) : this._completionOf(tDone, tTotal),
          overdue: Number(totals.overdue) || 0,
          overdueRate: Number(totals.overdueRate) || 0,
          stationCount: Number(totals.stationCount) || stations.length
        },
        stations,
        trend,
        businessTypes,
        heatmap: this._normalizeHeatmap(data.heatmap),
        response: {
          avgDuration: Number(resp.avgDuration) || 0,
          median: Number(resp.median) || 0,
          p90: Number(resp.p90) || 0
        },
        satisfaction: {
          rated: satRated,
          satisfied: satSatisfied,
          rate: sat.rate != null ? Number(sat.rate) : this._completionOf(satSatisfied, satRated)
        },
        duplicates: {
          total: Number(dup.total) || 0,
          customerGroups: dup.customerGroups || [],
          addressGroups: dup.addressGroups || []
        }
      }
    },

    // 热力图规范化：补齐 7×24 网格并推导峰值，后端未返回时给全 0 空网格
    _normalizeHeatmap(h) {
      const grid = Array.from({ length: 7 }, (_, d) =>
        Array.from({ length: 24 }, (_, hh) => Number(h?.grid?.[d]?.[hh]) || 0)
      )
      const max = grid.reduce((m, row) => row.reduce((m2, v) => Math.max(m2, v), m), 0)
      return { grid, max }
    },

    // 前端本地逐站聚合：遍历可见站点拉区间记录，汇总各站指标 + 趋势 + 业务分布
    async _aggregateOverviewLocally(startDate, endDate) {
      // 用 visibleStations（按角色过滤：admin 全部 / district_admin 本区县 / 其余当前站），
      // 确保区县管理员只聚合本区县供电所的数据
      const stations = this.visibleStations.length
        ? this.visibleStations.filter(s => s.isActive !== false)
        : (this.currentStationId ? [{ id: this.currentStationId, name: this.systemConfig.stationName }] : [])
      // 今日区间：趋势按小时（24h 时间轴）；非今日：按天
      const byHour = startDate === endDate

      const results = await Promise.allSettled(stations.map(s =>
        api.get('/records', { params: { stationId: s.id, startDate, endDate, pageSize: 500 } })
      ))

      const stationRows = []
      const trendMap = new Map()
      const typeMap = new Map()
      // 跨站接单热力图：星期 × 小时（口径与主控台 heatmapData 一致，聚合范围为全部可见站点）
      const heatGrid = Array.from({ length: 7 }, () => Array(24).fill(0))
      const regionName = (s) => s.region || s.districtName || ''
      // 跨站全量工单（带站点/记录上下文）：用于响应时长、满意度、跨站重复报修分析
      const allItems = []
      // 各站已完成工单耗时（分钟），同时用于推导跨站整体指标
      const stationDurations = []

      results.forEach((res, i) => {
        if (res.status !== 'fulfilled') return
        const data = res.value?.data ?? res.value ?? null
        const list = (data?.list || []).map(normalizeRecord)
        const st = stations[i]
        const limit = st.orderTimeLimit ?? 60

        let total = 0, done = 0, overdue = 0, satisfied = 0, rated = 0
        const stDurations = []
        list.forEach(r => {
          const items = (r.dutyItems || []).filter(it => it.content)
          items.forEach(it => {
            const ctx = {
              ...it,
              _stationId: st.id,
              _stationName: st.name || '',
              _recordDate: r.recordDate,
              _recordId: r.id ?? it.recordId
            }
            allItems.push(ctx)
            // 热力图：按受理小时 × 记录日期星期累加
            if (it.acceptTime) {
              const [h] = String(it.acceptTime).split(':').map(Number)
              if (Number.isInteger(h) && h >= 0 && h < 24) {
                const day = new Date(r.recordDate).getDay()
                heatGrid[day === 0 ? 6 : day - 1][h] += 1
              }
            }
            // 响应时长（口径与单站 efficiencyMetrics 一致）：
            // 当天记录且受理时间晚于当前时刻（误填未来）不计；跨天完成补 1440；过滤非法耗时
            if (ctx.isCompleted && ctx.acceptTime && ctx.endTime) {
              if (!(ctx._recordDate === getTodayISO() && toMinutes(ctx.acceptTime) > toMinutes(getNowHM()))) {
                let d = toMinutes(ctx.endTime) - toMinutes(ctx.acceptTime)
                if (d < 0) d += 1440
                if (d > 0 && d < 24 * 60) stDurations.push(d)
              }
            }
            // 满意度：仅统计有明确评价（true/false）的工单
            if (ctx.customerSatisfied === true || ctx.customerSatisfied === false) {
              rated++
              if (ctx.customerSatisfied) satisfied++
            }
            const key = byHour
              ? (it.acceptTime ? `${it.acceptTime.slice(0, 2)}:00` : '00:00')
              : r.recordDate
            if (!trendMap.has(key)) trendMap.set(key, { date: key, total: 0, done: 0, pending: 0 })
            const bucket = trendMap.get(key)
            total++
            bucket.total++
            if (it.isCompleted) { done++; bucket.done++ }
            else bucket.pending++
            // 业务类型分布
            const k = it.businessType || '未分类'
            if (!typeMap.has(k)) typeMap.set(k, { label: k, value: 0, done: 0 })
            typeMap.get(k).value++
            if (it.isCompleted) typeMap.get(k).done++
            // 超时判定（与单站效率统计同口径）
            const toState = getItemTimeoutState(it, r.recordDate, limit)
            if (toState && toState.state !== 'ok' && toState.state !== 'warning') overdue++
          })
        })
        stationDurations.push(...stDurations)
        stationRows.push({
          stationId: st.id,
          stationName: st.name || '',
          // 区县归属：优先 districtId，缺失时回退 region（区县名）
          districtId: st.districtId ?? st.district_id ?? null,
          region: regionName(st),
          total,
          done,
          completion: this._completionOf(done, total),
          overdue,
          avgDuration: stDurations.length ? Math.round(stDurations.reduce((s, x) => s + x, 0) / stDurations.length) : 0,
          satisfied,
          rated,
          satisfactionRate: rated === 0 ? 0 : Math.round((satisfied / rated) * 100)
        })
      })

      let trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      // 今日区间：补全 00:00-23:00 共 24 个点，形成完整的小时时间轴
      if (byHour) {
        const hourMap = new Map(trend.map(t => [t.date, t]))
        const padded = []
        for (let h = 0; h < 24; h++) {
          const key = `${String(h).padStart(2, '0')}:00`
          padded.push(hourMap.get(key) || { date: key, total: 0, done: 0, pending: 0 })
        }
        trend = padded
      }
      const businessTypes = Array.from(typeMap.values()).sort((a, b) => b.value - a.value)
      const totals = this._totalsOf(stationRows, trend, businessTypes)

      // ===== 跨站响应时长（口径与单站 efficiencyMetrics 一致） =====
      const durations = [...stationDurations].sort((a, b) => a - b)
      const avgDuration = durations.length ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length) : 0
      const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0
      const p90 = durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.9))] : 0
      const response = { avgDuration, median, p90 }

      // ===== 跨站客户满意度（汇总各站已评价工单） =====
      const ratedTotal = stationRows.reduce((s, x) => s + x.rated, 0)
      const satisfiedTotal = stationRows.reduce((s, x) => s + x.satisfied, 0)
      const satisfaction = { rated: ratedTotal, satisfied: satisfiedTotal }

      // ===== 跨站重复报修（同一客户/地址报修 ≥2 次，跨供电所合并判定） =====
      // 与单站 duplicateWorkOrders 同口径；跨站价值在于发现"同一对象在多个供电所重复报修"
      const dupKey = (v) => { const s = String(v ?? '').trim(); return s || null }
      const dupGroup = (keyFn) => {
        const map = new Map()
        allItems.forEach(it => {
          const k = keyFn(it)
          if (!k) return
          if (!map.has(k)) map.set(k, [])
          map.get(k).push(it)
        })
        return Array.from(map.entries())
          .filter(([, list]) => list.length >= 2)
          .map(([k, list]) => {
            const stationNames = Array.from(new Set(list.map(it => it._stationName).filter(Boolean)))
            return {
              key: k,
              count: list.length,
              stationCount: stationNames.length,
              stationNames,
              items: [...list].sort((a, b) => a._recordDate.localeCompare(b._recordDate))
            }
          })
          // 跨站组优先展示（跨站报修管理价值最高），其次按次数
          .sort((a, b) => (b.stationCount - a.stationCount) || (b.count - a.count))
      }
      const customerGroups = dupGroup(it => dupKey(it.customerName))
      const addressGroups = dupGroup(it => dupKey(it.customerAddress))
      const dupIds = new Set()
      ;[...customerGroups, ...addressGroups].forEach(g => g.items.forEach(it => dupIds.add(it.id)))
      const duplicates = { total: dupIds.size, customerGroups, addressGroups }

      return this._normalizeOverview({
        totals,
        stations: stationRows,
        trend,
        businessTypes,
        heatmap: { grid: heatGrid },
        response,
        satisfaction,
        duplicates
      })
    },

    _completionOf(done, total) {
      return total === 0 ? 0 : Math.round((done / total) * 100)
    },

    _totalsOf(stations, trend, businessTypes) {
      const total = stations.reduce((s, x) => s + x.total, 0)
      const done = stations.reduce((s, x) => s + x.done, 0)
      const overdue = stations.reduce((s, x) => s + x.overdue, 0)
      return {
        total,
        done,
        completion: this._completionOf(done, total),
        overdue,
        overdueRate: total === 0 ? 0 : Math.round((overdue / total) * 100),
        stationCount: stations.length
      }
    },

    getRecordById(id) {
      return this.records.find(r => r.id === Number(id))
    },

    // 创建/更新（智能 upsert）
    async createRecord(recordData) {
      const resp = await api.post('/records', recordData)
      const data = resp.data || resp
      const record = normalizeRecord(data)
      const idx = this.records.findIndex(r => r.id === record.id)
      if (idx >= 0) this.records[idx] = record
      else this.records.unshift(record)
      return record
    },

    async updateRecord(id, recordData) {
      // 同一接口：upsert
      const payload = { ...recordData, recordDate: recordData.recordDate }
      const resp = await api.post('/records', payload)
      const data = resp.data || resp
      const record = normalizeRecord(data)
      const idx = this.records.findIndex(r => r.id === record.id)
      if (idx >= 0) this.records[idx] = record
      return record
    },

    async deleteRecord(id) {
      await api.delete(`/records/${id}`)
      const idx = this.records.findIndex(r => r.id === Number(id))
      if (idx !== -1) this.records.splice(idx, 1)
    },

    async resolvePendingIssue(recordId, issueId) {
      const resp = await api.post(`/records/${recordId}/pending/${issueId}/resolve`)
      const data = resp.data || resp
      const record = normalizeRecord(data)
      const idx = this.records.findIndex(r => r.id === record.id)
      if (idx >= 0) this.records[idx] = record
      else this.records.unshift(record)
      return record
    },

    // ============ 工单 ============
    async addDutyItem(recordId, itemData) {
      const resp = await api.post(`/records/${recordId}/items`, itemData)
      return await this.fetchRecordById(recordId)
    },

    async updateDutyItem(recordId, itemId, itemData) {
      const resp = await api.put(`/records/${recordId}/items/${itemId}`, itemData)
      return await this.fetchRecordById(recordId)
    },

    async removeDutyItem(recordId, itemId) {
      await api.delete(`/records/${recordId}/items/${itemId}`)
      return await this.fetchRecordById(recordId)
    },

    async updateItem(recordId, itemId, payload) {
      await api.put(`/records/${recordId}/items/${itemId}`, payload)
      return await this.fetchRecordById(recordId)
    },

    async completeItem(recordId, itemId) {
      await api.post(`/records/${recordId}/items/${itemId}/complete`)
      return await this.fetchRecordById(recordId)
    },

    async uncompleteItem(recordId, itemId) {
      await api.post(`/records/${recordId}/items/${itemId}/uncomplete`)
      return await this.fetchRecordById(recordId)
    },

    // ============ 全局搜索 ============
    async globalSearch(keyword) {
      const kw = (keyword || '').trim()
      if (!kw) return []
      try {
        const resp = await api.get('/search', { params: { q: kw, limit: 20 } })
        return resp.data || resp || []
      } catch (e) {
        return []
      }
    },

    // ============ 仪表板（按当前站点） ============
    async fetchDashboardStats(date) {
      try {
        const params = date ? { date } : {}
        if (this.currentStationId) params.stationId = this.currentStationId
        const resp = await api.get('/dashboard/stats', { params })
        this.stats = resp.data || resp || {}
      } catch {}
    },

    async fetchDashboardActivities(limit = 20) {
      try {
        const params = { limit }
        if (this.currentStationId) params.stationId = this.currentStationId
        const resp = await api.get('/dashboard/activities', { params })
        this.activities = resp.data || resp || []
      } catch {}
    },

    async fetchDashboardAlerts() {
      try {
        // 不传 stationId：后端按当前用户可见范围聚合全部站点（主控台跨站提醒）
        const resp = await api.get('/dashboard/alerts')
        this.alerts = resp.data || resp || []
      } catch {}
    },

    async fetchMonthlyStats(year, month) {
      try {
        const params = { year, month }
        if (this.currentStationId) params.stationId = this.currentStationId
        const resp = await api.get('/dashboard/monthly-stats', { params })
        this.monthlyStats = resp.data || resp || []
      } catch {}
    },

    async fetchEquipmentStatus() {
      try {
        const params = this.currentStationId ? { stationId: this.currentStationId } : {}
        const resp = await api.get('/dashboard/equipment-status', { params })
        this.equipment = resp.data || resp || {}
      } catch {}
    },

    // ============ 导出 ============
    async createExport(payload) {
      const resp = await api.post('/exports/monthly', payload)
      return resp.data || resp
    },

    async createRangeExport(payload) {
      const resp = await api.post('/exports/range', payload)
      return resp.data || resp
    },

    async fetchExportStatus(id) {
      const resp = await api.get(`/exports/${id}/status`)
      return resp.data || resp
    },

    async fetchExportHistory(page = 1, pageSize = 20) {
      const params = { page, pageSize }
      if (this.currentStationId) params.stationId = this.currentStationId
      const resp = await api.get('/exports', { params })
      const data = resp.data || resp
      // 后端字段（fileSize/createdAt/operatorName）→ 前端展示字段（size/date/operator）
      this.exports = (data.list || []).map(h => ({
        ...h,
        size: h.fileSize > 0
          ? (h.fileSize >= 1024 * 1024
              ? `${(h.fileSize / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.round(h.fileSize / 1024)} KB`)
          : '—',
        date: h.createdAt
          ? (() => {
              const d = new Date(h.createdAt)
              const p = (n) => String(n).padStart(2, '0')
              return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
            })()
          : '—',
        operator: h.operatorName || `用户#${h.operatorId}`
      }))
      return data
    },

    getExportDownloadUrl(id) {
      const base = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1'
      return `${base}/exports/${id}/download`
    },

    // 通过 axios 携带 token 下载（原生 <a href> 不带 Authorization 头）
    async downloadExport(id, fileName) {
      const resp = await api.get(`/exports/${id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(resp)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'export.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },

    // ============ 系统配置 ============
    async fetchSystemConfig() {
      try {
        const resp = await api.get('/system/config')
        const list = resp.data || resp || []
        const map = {}
        list.forEach(c => {
          try { map[c.configKey] = JSON.parse(c.configValue) }
          catch { map[c.configKey] = c.configValue }
        })
        this.systemConfigMap = map
        return map
      } catch {
        return {}
      }
    },

    async updateSystemConfig(configs) {
      const resp = await api.put('/system/config', { configs })
      return resp.data || resp
    },

    // ============ 操作日志 ============
    async fetchLogs(params = {}) {
      const resp = await api.get('/logs', { params })
      return resp.data || resp
    },

    // ============ UI ============
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    // 设置全局字体缩放（1 / 1.5 / 2），并持久化到 localStorage。
    // 通过修改 <html> 的 --font-scale（font-size 缩放）实现，不影响 position:fixed 弹窗定位
    // （区别于 zoom/transform，它们会创建 CSS 包含块、破坏弹窗 fixed 定位）。
    applyFontScale(scale) {
      this.fontScale = scale
      document.documentElement.style.setProperty('--font-scale', String(scale))
    },

    setFontScale(scale) {
      this.applyFontScale(scale)
      localStorage.setItem('dutyguard_font_scale', String(scale))
    },

    updateTime() {
      this.currentTime = getCurrentTime()
    }
  }
})
