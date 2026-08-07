// ========================================
// 模拟数据 · Mock Data
// 供电所值守云平台临时数据
// ========================================

// ---- 当前用户 ----
export const currentUser = {
  id: 1,
  username: 'zhang.san',
  realName: '张三',
  role: 'duty_officer', // duty_officer | supervisor | admin
  roleName: '值班员',
  department: '张店供电中心马尚供电所',
  avatar: '张',
  lastLogin: '2026-07-30 08:15:32'
}

// ---- 系统配置 ----
export const systemConfig = {
  stationName: '张店供电中心马尚供电所',
  stationCode: 'SD-GD-MSD-SS-001',
  region: '山东省淄博市张店区',
  voltage: '10kV',
  feeders: 24,
  transformers: 86,
  maxDutyItemsPerRecord: 11,
  orderTimeLimit: 45
}

// ---- 天气选项 ----
export const weatherOptions = [
  { value: 'sunny',  label: '晴天', icon: '☀', color: '#ffb800' },
  { value: 'cloudy', label: '阴天', icon: '☁', color: '#94a3b8' },
  { value: 'rainy',  label: '雨天', icon: '☂', color: '#00d4ff' },
  { value: 'windy',  label: '大风', icon: '⌇', color: '#00ff88' },
  { value: 'snowy',  label: '雪天', icon: '❄', color: '#e8eef5' },
  { value: 'foggy',  label: '雾天', icon: '≋', color: '#5a6878' }
]

// ---- 角色选项 ----
export const roleMap = {
  duty_officer:   { label: '值班员',     color: 'info'  },
  supervisor:     { label: '所长',       color: 'warn'  },
  district_admin: { label: '区县管理员', color: 'violet' },
  admin:          { label: '管理员',     color: 'crit'  }
}

// ---- 状态选项 ----
export const recordStatusMap = {
  draft:    { label: '草稿',    color: 'muted',  led: 'info'    },
  active:   { label: '进行中',  color: 'info',   led: 'info'    },
  locked:   { label: '已锁定',  color: 'warn',   led: 'warn'    },
  archived: { label: '已归档',  color: 'muted',  led: 'ok'      }
}

// ---- 值班记录列表 ----
export const dutyRecords = [
  {
    id: 20260730,
    recordDate: '2026-07-30',
    weather: 'sunny',
    weatherLabel: '晴天',
    station: '张店供电中心马尚供电所',
    creator: '张三',
    creatorId: 1,
    status: 'active',
    itemCount: 5,
    completedCount: 2,
    hasPending: true,
    createdAt: '2026-07-30 08:30:15',
    lockedAt: null,
    dutyItems: [
      { id: 1, content: '接班检查 · 巡视主控室设备运行状态', startTime: '08:30', endTime: '08:55', isCompleted: true },
      { id: 2, content: '处理10kV马尚一线#03杆塔绝缘子污闪隐患', startTime: '09:15', endTime: '11:20', isCompleted: true },
      { id: 3, content: '配合调度中心完成负荷转供操作', startTime: '14:00', endTime: '15:30', isCompleted: false },
      { id: 4, content: '', startTime: null, endTime: null, isCompleted: false },
      { id: 5, content: '', startTime: null, endTime: null, isCompleted: false }
    ],
    otherMatters: '下午参加公司安监部组织的"迎峰度夏"安全视频会议，时长约45分钟。',
    pendingIssues: '1. 马尚一线#07杆塔接地电阻检测数值偏高，待下周停电检修时复测。\n2. 值班室空调制冷效果不佳，已报修，预计3日内处理。'
  },
  {
    id: 20260729,
    recordDate: '2026-07-29',
    weather: 'rainy',
    weatherLabel: '雨天',
    station: '张店供电中心马尚供电所',
    creator: '李四',
    creatorId: 2,
    status: 'locked',
    itemCount: 6,
    completedCount: 6,
    hasPending: true,
    createdAt: '2026-07-29 08:20:11',
    lockedAt: '2026-07-30 08:00:00',
    dutyItems: [
      { id: 1, content: '雨前特巡 · 检查配电室防水设施', startTime: '08:20', endTime: '08:50', isCompleted: true },
      { id: 2, content: '10kV马尚二线接地故障抢修', startTime: '10:15', endTime: '13:40', isCompleted: true },
      { id: 3, content: '回复用户95598工单3件', startTime: '14:30', endTime: '15:45', isCompleted: true },
      { id: 4, content: '巡视马尚三线电缆通道', startTime: '16:00', endTime: '17:30', isCompleted: true },
      { id: 5, content: '填写运行日志及设备缺陷记录', startTime: '18:00', endTime: '18:40', isCompleted: true },
      { id: 6, content: '交接班准备 · 整理当日台账', startTime: '18:45', endTime: '19:00', isCompleted: true }
    ],
    otherMatters: '下午雷阵雨，电网负荷较平日下降约15%。',
    pendingIssues: '马尚二线#12-#15杆塔区段电缆头存在发热隐患，建议纳入8月检修计划。'
  },
  {
    id: 20260728,
    recordDate: '2026-07-28',
    weather: 'cloudy',
    weatherLabel: '阴天',
    station: '张店供电中心马尚供电所',
    creator: '王五',
    creatorId: 3,
    status: 'locked',
    itemCount: 4,
    completedCount: 4,
    hasPending: false,
    createdAt: '2026-07-28 08:15:23',
    lockedAt: '2026-07-29 08:00:00',
    dutyItems: [
      { id: 1, content: '日常设备巡视', startTime: '08:15', endTime: '09:00', isCompleted: true },
      { id: 2, content: '处理用户报修：马尚小区#3楼道照明故障', startTime: '10:20', endTime: '11:30', isCompleted: true },
      { id: 3, content: '0.4kV台区负荷实测', startTime: '14:00', endTime: '16:30', isCompleted: true },
      { id: 4, content: '完成当日运行分析报表', startTime: '17:00', endTime: '17:45', isCompleted: true }
    ],
    otherMatters: '',
    pendingIssues: ''
  },
  {
    id: 20260727,
    recordDate: '2026-07-27',
    weather: 'sunny',
    weatherLabel: '晴天',
    station: '张店供电中心马尚供电所',
    creator: '张三',
    creatorId: 1,
    status: 'locked',
    itemCount: 5,
    completedCount: 5,
    hasPending: false,
    createdAt: '2026-07-27 08:25:00',
    lockedAt: '2026-07-28 08:00:00',
    dutyItems: [
      { id: 1, content: '晨检及交接班', startTime: '08:25', endTime: '08:50', isCompleted: true },
      { id: 2, content: '10kV线路红外测温特巡', startTime: '09:30', endTime: '12:00', isCompleted: true },
      { id: 3, content: '迎峰度夏日运行分析会', startTime: '14:00', endTime: '15:30', isCompleted: true },
      { id: 4, content: '设备台账更新', startTime: '16:00', endTime: '17:00', isCompleted: true },
      { id: 5, content: '交接班准备', startTime: '17:30', endTime: '18:00', isCompleted: true }
    ],
    otherMatters: '本周已完成3次红外测温，发现1处轻微发热，已纳入月度检修。',
    pendingIssues: ''
  },
  {
    id: 20260726,
    recordDate: '2026-07-26',
    weather: 'sunny',
    weatherLabel: '晴天',
    station: '张店供电中心马尚供电所',
    creator: '李四',
    creatorId: 2,
    status: 'locked',
    itemCount: 4,
    completedCount: 4,
    hasPending: true,
    createdAt: '2026-07-26 08:20:00',
    lockedAt: '2026-07-27 08:00:00',
    dutyItems: [
      { id: 1, content: '交接班及晨检', startTime: '08:20', endTime: '08:45', isCompleted: true },
      { id: 2, content: '台区低压线路巡视', startTime: '09:00', endTime: '11:30', isCompleted: true },
      { id: 3, content: '受理用户新装业务现场勘查', startTime: '14:30', endTime: '16:30', isCompleted: true },
      { id: 4, content: '完成日报及交接', startTime: '17:00', endTime: '17:30', isCompleted: true }
    ],
    otherMatters: '',
    pendingIssues: '马尚四线#08杆塔避雷器老化，建议尽快更换。'
  },
  {
    id: 20260725,
    recordDate: '2026-07-25',
    weather: 'cloudy',
    weatherLabel: '阴天',
    station: '张店供电中心马尚供电所',
    creator: '王五',
    creatorId: 3,
    status: 'archived',
    itemCount: 3,
    completedCount: 3,
    hasPending: false,
    createdAt: '2026-07-25 08:30:00',
    lockedAt: '2026-07-26 08:00:00',
    dutyItems: [
      { id: 1, content: '日常巡视', startTime: '08:30', endTime: '09:30', isCompleted: true },
      { id: 2, content: '处理95598工单', startTime: '10:00', endTime: '11:00', isCompleted: true },
      { id: 3, content: '整理上周运行分析', startTime: '14:00', endTime: '15:30', isCompleted: true }
    ],
    otherMatters: '',
    pendingIssues: ''
  }
]

// ---- 仪表板统计 ----
export const dashboardStats = {
  todayRecords: 1,
  monthRecords: 30,
  pendingIssues: 7,
  activeDutyOfficers: 3,
  todayCompleted: 2,
  todayTotal: 5,
  faultCount: 2,
  warningCount: 1
}

// ---- 最近活动 ----
export const recentActivities = [
  { id: 1, user: '张三', action: '完成', target: '10kV马尚一线#03杆塔绝缘子处理', time: '14 分钟前', type: 'ok' },
  { id: 2, user: '李四',  action: '提交', target: '2026-07-29 值班记录', time: '1 小时前', type: 'info' },
  { id: 3, user: '王五',  action: '上报', target: '马尚四线避雷器老化缺陷', time: '3 小时前', type: 'warn' },
  { id: 4, user: '系统',  action: '锁定', target: '2026-07-29 值班记录', time: '08:00', type: 'muted' },
  { id: 5, user: '张三',  action: '编辑', target: '2026-07-30 值班记录', time: '08:30', type: 'info' },
  { id: 6, user: '李四',  action: '完成', target: '10kV马尚二线接地故障抢修', time: '昨天 13:40', type: 'ok' },
  { id: 7, user: '系统',  action: '导出', target: '2026-06 月度值班报表', time: '2 天前', type: 'info' }
]

// ---- 通知告警 ----
export const alerts = [
  {
    id: 1,
    level: 'warn',
    title: '高温橙色预警',
    desc: '气象台发布高温橙色预警，预计今日最高气温38℃，请加强设备巡检。',
    time: '10 分钟前'
  },
  {
    id: 2,
    level: 'crit',
    title: '马尚一线负荷预警',
    desc: '10kV马尚一线实时负荷率达到87%，已超过橙色警戒线（85%）。',
    time: '25 分钟前'
  },
  {
    id: 3,
    level: 'info',
    title: '设备检修提醒',
    desc: '马尚二线#12-#15杆塔电缆头检修计划即将到期（剩余2天）。',
    time: '2 小时前'
  }
]

// ---- 月度数据（用于图表） ----
export const monthlyStats = [
  { day: '07-01', records: 3, items: 12, faults: 0 },
  { day: '07-02', records: 4, items: 15, faults: 1 },
  { day: '07-03', records: 3, items: 14, faults: 0 },
  { day: '07-04', records: 5, items: 18, faults: 2 },
  { day: '07-05', records: 4, items: 16, faults: 0 },
  { day: '07-06', records: 6, items: 22, faults: 1 },
  { day: '07-07', records: 5, items: 19, faults: 0 },
  { day: '07-08', records: 4, items: 17, faults: 0 },
  { day: '07-09', records: 3, items: 13, faults: 1 },
  { day: '07-10', records: 5, items: 20, faults: 0 },
  { day: '07-11', records: 4, items: 16, faults: 0 },
  { day: '07-12', records: 6, items: 24, faults: 1 },
  { day: '07-13', records: 5, items: 21, faults: 0 },
  { day: '07-14', records: 4, items: 18, faults: 0 },
  { day: '07-15', records: 3, items: 14, faults: 0 },
  { day: '07-16', records: 4, items: 16, faults: 1 },
  { day: '07-17', records: 5, items: 19, faults: 0 },
  { day: '07-18', records: 6, items: 23, faults: 2 },
  { day: '07-19', records: 5, items: 20, faults: 0 },
  { day: '07-20', records: 4, items: 17, faults: 0 },
  { day: '07-21', records: 3, items: 13, faults: 0 },
  { day: '07-22', records: 4, items: 15, faults: 1 },
  { day: '07-23', records: 5, items: 18, faults: 0 },
  { day: '07-24', records: 4, items: 16, faults: 0 },
  { day: '07-25', records: 3, items: 12, faults: 0 },
  { day: '07-26', records: 4, items: 15, faults: 1 },
  { day: '07-27', records: 5, items: 18, faults: 0 },
  { day: '07-28', records: 4, items: 16, faults: 0 },
  { day: '07-29', records: 6, items: 22, faults: 1 },
  { day: '07-30', records: 5, items: 19, faults: 0 }
]

// ---- 设备运行状态 ----
export const equipmentStatus = {
  totalFeeders: 24,
  activeFeeders: 23,
  faultFeeders: 1,
  totalTransformers: 86,
  overloadTransformers: 3,
  averageLoadRate: 67.4,
  peakLoadRate: 89.2,
  voltage: { ua: 10.42, ub: 10.38, uc: 10.45, unit: 'kV' },
  current:  { ia: 285, ib: 278, ic: 292, unit: 'A' }
}

// ---- 导出历史 ----
export const exportHistory = [
  { id: 1, fileName: '值班记录_2026-06.xlsx', size: '2.4 MB', date: '2026-07-01 09:00', operator: '系统自动', status: 'done' },
  { id: 2, fileName: '值班记录_2026-05.xlsx', size: '2.1 MB', date: '2026-06-01 09:00', operator: '系统自动', status: 'done' },
  { id: 3, fileName: '值班记录_2026-04.xlsx', size: '1.9 MB', date: '2026-05-01 09:00', operator: '系统自动', status: 'done' },
  { id: 4, fileName: '值班记录_2026-03.xlsx', size: '2.2 MB', date: '2026-04-01 09:00', operator: '系统自动', status: 'done' }
]

// ---- 帮助函数：获取当前日期 ----
export const getCurrentDate = () => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export const getCurrentDateISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const getCurrentTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
