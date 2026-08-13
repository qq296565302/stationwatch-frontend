import { defineStore } from 'pinia'
import api, { setAuth, clearAuth } from '@/api/client'
import {
  weatherOptions,
  roleMap,
  getCurrentDate,
  getCurrentDateISO,
  getCurrentTime
} from '@/data/mockData'
import { toMinutes, getTodayISO, getNowHM, getItemTimeoutState } from '@/utils/orderTimeout'

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
    currentTime: getCurrentTime()
  }),

  getters: {
    // ===== 角色权限辅助（供路由/按钮显隐复用） =====
    isAdmin(state) { return state.user.role === 'admin' },
    isDistrictAdmin(state) { return state.user.role === 'district_admin' },
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

    // 今日值班：仅命中今天（本地日期）的 active 记录，避免昨天记录顶替显示
    activeRecord(state) {
      return state.records.find(r => r.recordDate === getCurrentDateISO() && r.status === 'active')
    },
    // 值班记录生命周期状态：当天=进行中，前一天=即将锁定（红色 crit），锁定/归档走原始状态
    recordDisplayStatus(state) {
      const today = getCurrentDateISO()
      const d = new Date()
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

    // 当前站点工单时限（分钟），站点级配置，缺省 45
    currentStationOrderTimeLimit(state) {
      return state.stations.find(s => s.id === state.currentStationId)?.orderTimeLimit ?? 45
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
      const limit = state.stations.find(s => s.id === state.currentStationId)?.orderTimeLimit ?? 45
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

    // ============ 字典 ============
    async fetchDictionaries(force = false) {
      if (this.dictionariesLoaded && !force) return
      const [bt, ac, rs, of, wo] = await Promise.all([
        api.get('/dictionaries/business-types'),
        api.get('/dictionaries/accept-contents'),
        api.get('/dictionaries/results'),
        api.get(`/dictionaries/officers${this.currentStationId ? '?stationId=' + this.currentStationId : ''}`),
        api.get('/dictionaries/weather-options')
      ])
      this.dictionaries.businessTypes  = bt.data || bt || []
      this.dictionaries.acceptContents = ac.data || ac || []
      this.dictionaries.results        = rs.data || rs || []
      this.dictionaries.officers       = of.data || of || []
      const wopt = wo.data || wo
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

    async fetchRecordById(id) {
      const resp = await api.get(`/records/${id}`)
      // 只取业务 data；错误/无效响应（如 /records/undefined 或 404）时 data 为 null，
      // 不污染 records，避免切站/路由跳转瞬间插入"未知记录"
      const data = resp?.data ?? null
      if (!data || typeof data !== 'object' || data.id == null) return null
      const record = normalizeRecord(data)
      const idx = this.records.findIndex(r => r.id === record.id)
      if (idx >= 0) this.records[idx] = record
      else this.records.unshift(record)
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
        const params = this.currentStationId ? { stationId: this.currentStationId } : {}
        const resp = await api.get('/dashboard/alerts', { params })
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

    updateTime() {
      this.currentTime = getCurrentTime()
    }
  }
})
