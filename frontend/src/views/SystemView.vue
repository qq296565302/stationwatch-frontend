<template>
  <div class="system-view">
    <PageHeader
      eyebrow="SYSTEM CONFIG · 系统配置"
      title="系统配置"
      subtitle="管理站点信息、用户权限、值班规则等系统参数"
    />

    <div class="system-container">
      <!-- 站点信息 -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">站点信息</h2>
            <p class="section-desc">{{ store.canManageStation ? '管理供电所基本信息（区县管理员仅本区县）' : '配置本供电所的基本信息' }}</p>
          </div>
          <div class="section-action">
            <button v-if="store.canManageStation" class="btn btn-secondary btn-sm" :disabled="creatingStation" @click="toggleCreateStation">
              {{ creatingStation ? '取消' : '新增站点' }}
            </button>
            <button class="btn btn-primary btn-sm" :disabled="!stationForm.id || savingStation" @click="saveStation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {{ savingStation ? '保存中…' : '保存站点信息' }}
            </button>
          </div>
        </div>
        <div class="section-body">
          <!-- 新增站点表单（市级超管/区县管理员） -->
          <div v-if="creatingStation" class="create-station-row">
            <input v-model="newStationForm.name" class="field-input" placeholder="站点名称（必填）" />
            <select v-if="store.isAdmin" v-model="newStationForm.districtId" class="field-input" style="max-width: 160px">
              <option :value="null">选择区县</option>
              <option v-for="d in store.districts" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
            <button class="btn btn-primary btn-sm" :disabled="!newStationForm.name.trim() || (store.isAdmin && !newStationForm.districtId)" @click="submitCreateStation">
              创建
            </button>
          </div>

          <!-- 站点切换（市级超管/区县管理员，联动顶栏当前站点） -->
          <div v-if="store.canSwitchStation && store.visibleStations.length" class="station-manage-row">
            <label class="field-label-inline">编辑站点</label>
            <select :value="store.currentStationId" @change="selectStation" class="field-input" style="max-width: 260px">
              <option v-for="s in store.visibleStations" :key="s.id" :value="s.id">
                {{ s.name }}{{ s.isActive ? '' : '（停用）' }}
              </option>
            </select>
          </div>

          <div class="form-grid">
            <div class="field">
              <label class="field-label">站点名称</label>
              <input v-model="stationForm.name" type="text" class="field-input" />
            </div>
            <div class="field">
              <label class="field-label">所属区县</label>
              <select v-model="stationForm.districtId" class="field-input" :disabled="!store.isAdmin">
                <option v-for="d in store.districts" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 值班员管理 -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">值班员管理</h2>
            <p class="section-desc">管理本所值班员账号和排班</p>
          </div>
          <div class="section-action">
            <button class="btn btn-secondary btn-sm" @click="openCreate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              添加值班员
            </button>
          </div>
        </div>
        <div class="section-body">
          <table class="data-table">
            <thead>
              <tr>
                <th>工号</th>
                <th>姓名</th>
                <th>角色</th>
                <th>所属部门</th>
                <th>最后登录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="officer in officers" :key="officer.id">
                <td class="font-mono text-secondary">{{ officer.username }}</td>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar-mini">{{ officer.avatar }}</div>
                    <span>{{ officer.realName }}</span>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="`tag-${store.roleMap[officer.role].color}`">
                    {{ store.roleMap[officer.role].label }}
                  </span>
                </td>
                <td class="text-secondary">{{ officer.department }}</td>
                <td class="font-mono text-sm text-secondary">{{ officer.lastLogin }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn" title="编辑" @click="openEdit(officer)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="action-btn" title="分配权限" @click="openPermission(officer)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </button>
                    <button class="action-btn" title="重置密码" @click="openReset(officer)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </button>
                    <button
                      v-if="officer.id !== store.user.id"
                      class="action-btn danger"
                      title="删除"
                      @click="handleDelete(officer)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 值班排班 -->
      <div class="config-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">值班排班</h2>
            <p class="section-desc">固定轮值 · 每组一天 · 周期循环</p>
          </div>
          <div class="section-action">
            <button v-if="store.user.role !== 'district_admin'" class="btn btn-secondary btn-sm" @click="showScheduleEdit = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              编辑排班
            </button>
          </div>
        </div>
        <div class="section-body">
          <template v-if="store.scheduleConfig.configured">
            <div class="schedule-summary">
              <div class="summary-item">
                <span class="summary-label">起始日期</span>
                <span class="summary-value font-mono">{{ store.scheduleConfig.startDate }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">轮换周期</span>
                <span class="summary-value font-mono">{{ store.scheduleConfig.cycleDays }} 天/轮</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">班组数量</span>
                <span class="summary-value font-mono">{{ store.scheduleConfig.groups.length }} 组</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">排班范围</span>
                <span class="summary-value">未来 {{ scheduleDays }} 天</span>
              </div>
            </div>
            <ScheduleTable
              :rows="store.scheduleTable"
              :highlight-date="todayISO"
              :highlight-user-ids="[]"
            />
          </template>
          <div v-else class="empty-mini">
            尚未配置值班排班，请点击右上角「编辑排班」
          </div>
        </div>
      </div>

      <!-- 值班规则：仅站点可管理角色（超级管理员/区县管理员）可见，所长无查看与修改权限 -->
      <div v-if="store.canManageStation" class="config-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">值班规则</h2>
            <p class="section-desc">配置值班记录的相关业务规则</p>
          </div>
          <div class="section-action">
            <!-- 值班规则含站点级配置（工单时限），由可管理站点的角色（admin/区县管理员）保存，所长无此权限 -->
            <button class="btn btn-primary btn-sm" :disabled="savingRules" @click="saveRules">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {{ savingRules ? '保存中…' : '保存值班规则' }}
            </button>
          </div>
        </div>
        <div class="section-body">
          <div class="rule-list">
            <div class="rule-row">
              <div class="rule-info">
                <div class="rule-label">工单时限</div>
                <div class="rule-desc">未完成工单超过此时限判定为超时，临近超时将自动提醒（默认 45 分钟）</div>
              </div>
              <div class="rule-control">
                <input v-model.number="rulesForm.orderTimeLimit" type="number" class="rule-input font-mono" min="5" max="1440" />
                <span class="rule-unit">分钟</span>
              </div>
            </div>
            <div v-if="store.isAdmin" class="rule-row">
              <div class="rule-info">
                <div class="rule-label">历史记录修改限制</div>
                <div class="rule-desc">是否允许修改历史日期的值班记录</div>
              </div>
              <div class="rule-control">
                <label class="switch">
                  <input type="checkbox" v-model="rulesForm.allowEditHistory" />
                  <span class="switch-slider"></span>
                </label>
                <span class="rule-value">{{ rulesForm.allowEditHistory ? '允许' : '禁止' }}</span>
              </div>
            </div>
            <div v-if="store.isAdmin" class="rule-row">
              <div class="rule-info">
                <div class="rule-label">自动记录开始时间</div>
                <div class="rule-desc">输入内容时自动记录事项开始时间</div>
              </div>
              <div class="rule-control">
                <label class="switch">
                  <input type="checkbox" v-model="rulesForm.autoStartTime" />
                  <span class="switch-slider"></span>
                </label>
                <span class="rule-value">{{ rulesForm.autoStartTime ? '已启用' : '已禁用' }}</span>
              </div>
            </div>
            <div v-if="store.isAdmin" class="rule-row">
              <div class="rule-info">
                <div class="rule-label">遗留问题提醒</div>
                <div class="rule-desc">下个班次开始时自动提示遗留问题</div>
              </div>
              <div class="rule-control">
                <label class="switch">
                  <input type="checkbox" v-model="rulesForm.pendingNotify" />
                  <span class="switch-slider"></span>
                </label>
                <span class="rule-value">{{ rulesForm.pendingNotify ? '已启用' : '已禁用' }}</span>
              </div>
            </div>
            <div v-if="store.isAdmin" class="rule-row">
              <div class="rule-info">
                <div class="rule-label">提醒间隔</div>
                <div class="rule-desc">存在遗留问题时，每隔多少分钟提醒一次（5-1440，默认 30）</div>
              </div>
              <div class="rule-control">
                <input v-model.number="rulesForm.pendingNotifyInterval" type="number" class="rule-input font-mono" min="5" max="1440" />
                <span class="rule-unit">分钟</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 值班员弹窗（新增 / 编辑 / 权限） -->
    <UserFormDialog
      v-model:visible="showDialog"
      :mode="dialogMode"
      :user="dialogUser"
      :stations="store.visibleStations"
    />

    <!-- 排班编辑弹窗 -->
    <ScheduleEditDialog v-model:visible="showScheduleEdit" />

    <!-- 重置密码弹窗 -->
    <ResetPasswordDialog v-model:visible="showReset" :user="resetTarget" />
  </div>
</template>

<script setup>
import { reactive, computed, ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/store'
import PageHeader from '@/components/PageHeader.vue'
import UserFormDialog from '@/components/UserFormDialog.vue'
import ScheduleTable from '@/components/ScheduleTable.vue'
import ScheduleEditDialog from '@/components/ScheduleEditDialog.vue'
import ResetPasswordDialog from '@/components/ResetPasswordDialog.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { getCurrentDateISO } from '@/data/mockData'

const store = useAppStore()
const toast = useToast()
const confirm = useConfirm()

// 值班员列表：从后端 /users 接口拉取（仅管理员可访问，非管理员时列表为空）
const officers = computed(() => store.users.map(u => ({
  id: u.id,
  username: u.username,
  realName: u.realName,
  role: u.role,
  stationId: u.stationId ?? null,
  department: u.stationName || '—',
  avatar: (u.realName || u.username || '?').charAt(0),
  lastLogin: formatLogin(u.lastLoginAt),
  isActive: u.isActive
})))

// ISO 时间 -> 'YYYY-MM-DD HH:mm'
const formatLogin = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---- 值班员弹窗 ----
const showDialog = ref(false)
const dialogMode = ref('create') // create | edit | permission
const dialogUser = ref(null)

const openCreate = () => {
  dialogMode.value = 'create'
  dialogUser.value = null
  showDialog.value = true
}
const openEdit = (officer) => {
  dialogMode.value = 'edit'
  dialogUser.value = officer
  showDialog.value = true
}
const openPermission = (officer) => {
  dialogMode.value = 'permission'
  dialogUser.value = officer
  showDialog.value = true
}

// ---- 重置密码弹窗 ----
const showReset = ref(false)
const resetTarget = ref(null)
const openReset = (officer) => {
  resetTarget.value = officer
  showReset.value = true
}

// ---- 删除值班员（市级超管/区县管理员/所长，后端校验范围；不可删自己） ----
const handleDelete = async (officer) => {
  const ok = await confirm.open({
    title: '删除值班员',
    message: `确认删除值班员「${officer.realName}」（${officer.username}）？删除后其账号将无法登录，历史值班记录仍会保留。`,
    confirmText: '删除',
    type: 'danger'
  })
  if (!ok) return
  try {
    await store.deleteUser(officer.id)
    toast.success('值班员已删除')
  } catch (e) {
    toast.error(e.message || '删除失败')
  }
}

// ---- 值班排班 ----
const showScheduleEdit = ref(false)
const todayISO = getCurrentDateISO()
const scheduleDays = 14

onMounted(async () => {
  await Promise.all([
    store.fetchUsers(),
    store.fetchStations(),
    store.fetchDistricts(),
    store.fetchSystemConfig(),
    store.fetchScheduleConfig(),
    store.fetchScheduleTable({ from: todayISO, days: scheduleDays })
  ])
  loadStationForm()
  loadRulesForm()
})

// ---- 站点信息 ----
const stationForm = reactive({
  id: null,
  name: '',
  districtId: null
})
const savingStation = ref(false)

const loadStationForm = () => {
  const st = store.stations.find(s => s.id === store.currentStationId)
  if (!st) return
  Object.assign(stationForm, {
    id: st.id,
    name: st.name,
    districtId: st.districtId ?? null
  })
}

const saveStation = async () => {
  if (!stationForm.id) {
    toast.error('未找到站点信息，请确认后端已启动')
    return
  }
  savingStation.value = true
  try {
    await store.updateStation(stationForm.id, {
      name: stationForm.name,
      districtId: store.isAdmin ? stationForm.districtId : undefined
    })
    toast.success('站点信息已保存')
  } catch (e) {
    toast.error(e.message || '保存失败')
  } finally {
    savingStation.value = false
  }
}

// 新增站点（市级超管/区县管理员）
const creatingStation = ref(false)
const newStationForm = reactive({ name: '', districtId: null })
const toggleCreateStation = () => {
  creatingStation.value = !creatingStation.value
  if (!creatingStation.value) { newStationForm.name = ''; newStationForm.districtId = null }
}
const submitCreateStation = async () => {
  try {
    const st = await store.createStation({
      name: newStationForm.name.trim(),
      districtId: store.isAdmin ? newStationForm.districtId : undefined
    })
    toast.success('站点已创建')
    newStationForm.name = ''
    creatingStation.value = false
    // 切到新站点
    await store.setCurrentStation(st.id)
    loadStationForm()
  } catch (e) {
    toast.error(e.message || '创建失败')
  }
}

// 站点切换（admin，与顶栏切换器联动）
const selectStation = (e) => {
  store.setCurrentStation(e.target.value)
}

// ---- 值班规则 ----
const rulesForm = reactive({
  orderTimeLimit: 45,
  allowEditHistory: false,
  autoStartTime: true,
  pendingNotify: true,
  pendingNotifyInterval: 30
})
const savingRules = ref(false)

const loadRulesForm = () => {
  const map = store.systemConfigMap
  const st = store.stations.find(s => s.id === store.currentStationId)
  rulesForm.orderTimeLimit = Number(st?.orderTimeLimit ?? 45)
  rulesForm.allowEditHistory = map['duty.allow_edit_history'] === true
  rulesForm.autoStartTime = map['duty.auto_start_time'] !== false
  rulesForm.pendingNotify = map['duty.pending_notify'] !== false
  rulesForm.pendingNotifyInterval = Math.max(5, Math.min(1440, Number(map['duty.pending_notify_interval']) || 30))
}

const saveRules = async () => {
  savingRules.value = true
  try {
    const limit = Math.max(5, Math.min(1440, Number(rulesForm.orderTimeLimit) || 45))
    const interval = Math.max(5, Math.min(1440, Number(rulesForm.pendingNotifyInterval) || 30))
    rulesForm.orderTimeLimit = limit
    rulesForm.pendingNotifyInterval = interval
    if (!store.isAdmin) {
      // 所长：仅保存本所站点级规则（工单时限），全局开关不开放
      if (!stationForm.id) throw new Error('未找到站点信息')
      await store.updateStation(stationForm.id, { orderTimeLimit: limit })
    } else {
      const jobs = [
        store.updateSystemConfig({
          'duty.allow_edit_history': !!rulesForm.allowEditHistory,
          'duty.auto_start_time': !!rulesForm.autoStartTime,
          'duty.pending_notify': !!rulesForm.pendingNotify,
          'duty.pending_notify_interval': interval
        })
      ]
      // 同步站点字段（后端工单时限实际读取站点配置）
      if (stationForm.id) {
        jobs.push(store.updateStation(stationForm.id, { orderTimeLimit: limit }))
      }
      await Promise.all(jobs)
      Object.assign(store.systemConfigMap, {
        'duty.allow_edit_history': !!rulesForm.allowEditHistory,
        'duty.auto_start_time': !!rulesForm.autoStartTime,
        'duty.pending_notify': !!rulesForm.pendingNotify,
        'duty.pending_notify_interval': interval
      })
    }
    toast.success('值班规则已保存')
  } catch (e) {
    toast.error(e.message || '保存失败')
  } finally {
    savingRules.value = false
  }
}

// 当前站点切换后：重载站点信息表单与值班规则
watch(() => store.currentStationId, () => {
  loadStationForm()
  loadRulesForm()
})
</script>

<style lang="scss" scoped>
.system-view {
  max-width: 1400px;
  margin: 0 auto;
}

.system-container {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.config-section {
  background: $bg-base;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4 $space-5;
  border-bottom: 1px solid $border-subtle;
  background: linear-gradient(180deg, rgba(0, 212, 255, 0.03), transparent);
}

.section-icon {
  width: 40px;
  height: 40px;
  background: $primary-soft;
  color: $primary;
  border: 1px solid $border-accent;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { width: 18px; height: 18px; }
}

.section-title {
  font-size: $fs-base;
  font-weight: $fw-semibold;
  color: $text-primary;
  margin-bottom: 2px;
}

.section-desc {
  font-size: $fs-xs;
  color: $text-secondary;
}

.section-action {
  margin-left: auto;
  flex-shrink: 0;
}

.section-body { padding: $space-5; }

// ===== 站点管理 =====
.station-manage-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.field-label-inline {
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  white-space: nowrap;
}

.create-station-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: $bg-page;
  border: 1px dashed $border-base;
  border-radius: $radius-base;
  flex-wrap: wrap;
}

// ===== 字段 =====
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-4;
}

.field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.field-label {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-family: $font-mono;
  font-size: 10px;
  font-weight: $fw-medium;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-secondary;

  &::before {
    content: '';
    width: 3px;
    height: 10px;
    background: $primary;
  }
}

.field-input {
  width: 100%;
  padding: 10px $space-3;
  font-family: $font-body;
  font-size: $fs-base;
  color: $text-primary;
  background: $bg-void;
  border: 1px solid $border-base;
  border-radius: $radius-base;
  outline: none;
  transition: all $duration-base $ease-out;

  &:focus {
    border-color: $primary;
    box-shadow: 0 0 0 3px $primary-soft;
  }
}

// ===== 用户表格 =====
.user-cell {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.user-avatar-mini {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary, $accent-violet);
  color: $text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-xs;
  font-weight: $fw-bold;
}

.text-sm { font-size: 11px; }
.text-sm.font-mono { font-family: $font-mono; }

.action-buttons {
  display: flex;
  gap: 2px;
}

.action-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $duration-base $ease-out;

  svg { width: 13px; height: 13px; }

  &:hover {
    color: $primary;
    background: $primary-soft;
    border-color: $border-accent;
  }

  &.danger:hover {
    color: $crit;
    background: rgba($crit, 0.08);
    border-color: rgba($crit, 0.3);
  }
}

// ===== 规则 =====
.rule-list {
  display: flex;
  flex-direction: column;
}

.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 0;
  border-bottom: 1px dashed $border-subtle;
  gap: $space-4;

  &:last-child { border-bottom: none; }
}

.rule-info {
  flex: 1;
}

.rule-label {
  font-size: $fs-sm;
  font-weight: $fw-semibold;
  color: $text-primary;
  margin-bottom: 2px;
}

.rule-desc {
  font-size: $fs-xs;
  color: $text-secondary;
}

.rule-control {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-shrink: 0;
}

.rule-input {
  width: 80px;
  padding: 6px 10px;
  background: $bg-void;
  border: 1px solid $border-base;
  border-radius: $radius-sm;
  color: $text-primary;
  font-size: $fs-sm;
  text-align: center;
  outline: none;

  &:focus {
    border-color: $primary;
    box-shadow: 0 0 0 3px $primary-soft;
  }
}

.rule-unit {
  font-size: $fs-xs;
  color: $text-muted;
}

.rule-value {
  font-family: $font-mono;
  font-size: 10px;
  color: $text-muted;
  letter-spacing: $ls-wide;
  min-width: 60px;
}

// 开关
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;

  input { display: none; }
}

.switch-slider {
  position: absolute;
  inset: 0;
  background: $border-strong;
  border-radius: 22px;
  cursor: pointer;
  transition: background $duration-base $ease-out;

  &::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform $duration-base $ease-spring;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.switch input:checked + .switch-slider {
  background: $primary;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);

  &::before { transform: translateX(18px); }
}

// ===== 值班排班 =====
.schedule-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: $border-subtle;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  overflow: hidden;
  margin-bottom: $space-4;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: $space-3 $space-4;
  background: $bg-elevated;
}

.summary-label {
  font-family: $font-mono;
  font-size: 10px;
  letter-spacing: $ls-widest;
  text-transform: uppercase;
  color: $text-muted;
}

.summary-value {
  font-size: $fs-sm;
  color: $text-primary;
  font-weight: $fw-medium;
}

.empty-mini {
  padding: $space-5;
  text-align: center;
  color: $text-muted;
  font-size: $fs-sm;
  background: $bg-page;
  border: 1px dashed $border-base;
  border-radius: $radius-sm;
}
</style>
