import { useState, useEffect, useCallback, useMemo } from 'react'
import { getSchedules, getFleets, createSchedule, getShifts, getDrivers, updateSchedule, confirmSchedules, notifySchedulesStatus, checkVehicleConflict } from '@/api/modules/admin'
import type { AdminScheduleItem, FleetItem, AdminShiftItem, AdminDriverItem } from '@/api/modules/admin'
import { Button } from '@/components/ui/button'
import {
  Search, Eye, X, ChevronLeft, ChevronRight,
  Calendar, Car, User, MapPin, FileText, Building2,
  Filter, Sparkles, Loader2, Bus, ListChecks, Clock,
  Pencil, Phone, Save, CheckSquare, Send, Info, Plus,
} from 'lucide-react'

// ---- 本地班次类型与数据（避免 useSyncExternalStore 与 lazy 加载冲突） ----

interface GeneratedScheduleEntry {
  _generated: true; shiftId: number; shiftName: string; date: string
  route: string; orderNo: string; departTime: string; returnTime: string
  passengerCount: number; vehicleType: string; charterType: string
  vehicleStatus: string; fleet: string; plateNumber: string
  driver: string; phone: string; charterContract: string; unit: string
  dispatcher: string; kilometers: number; remark: string
}

function calcShiftDates(shift: AdminShiftItem, from: string, to: string): string[] {
  if (!shift.activeFrom || !shift.activeTo) return []
  const dates: string[] = []
  const start = new Date(Math.max(new Date(shift.activeFrom).getTime(), new Date(from).getTime()))
  const end = new Date(Math.min(new Date(shift.activeTo).getTime(), new Date(to).getTime()))
  const cursor = new Date(start)
  while (cursor <= end) {
    let match = false
    if (shift.scheduleMode === 'weekly') {
      const dayOfWeek = cursor.getDay()
      const mapped = dayOfWeek === 0 ? 7 : dayOfWeek
      match = shift.scheduleDays.includes(mapped)
    } else {
      match = shift.monthlyDays.includes(cursor.getDate())
    }
    if (match) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function ScheduleList() {
  // ---- 真实排班 API 数据 ----
  const [data, setData] = useState<AdminScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [fleetFilter, setFleetFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [fleets, setFleets] = useState<FleetItem[]>([])
  const pageSize = 10

  // ---- 详情弹窗 ----
  const [selectedItem, setSelectedItem] = useState<AdminScheduleItem | null>(null)
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // ---- 司机安排 ----
  const [drivers, setDrivers] = useState<AdminDriverItem[]>([])
  const [editingSchedule, setEditingSchedule] = useState<AdminScheduleItem | null>(null)
  const [editForm, setEditForm] = useState({ driver: '', driverId: '', plateNumber: '', phone: '', fleet: '' })
  const [savingDriver, setSavingDriver] = useState(false)

  // ---- 手动新增排班 ----
  const [creatingSchedule, setCreatingSchedule] = useState(false)
  const [newForm, setNewForm] = useState({
    date: '', route: '', departTime: '', returnTime: '', fleet: '',
    charterContract: '', charterType: '上下班车', plateNumber: '', driver: '',
    phone: '', passengerCount: 0, unit: '', vehicleStatus: '待出车',
    dispatcher: '', kilometers: 0, remark: '',
  })
  const [creating, setCreating] = useState(false)

  // 加载司机列表
  useEffect(() => {
    getDrivers().then(r => setDrivers(Array.isArray(r) ? r : [])).catch(() => setDrivers([]))
  }, [])

  // ---- 批量操作（确认排班 / 通知司机） ----
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [notifying, setNotifying] = useState(false)

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === pagedReal.length && pagedReal.length > 0) return new Set()
      return new Set(pagedReal.map(d => d.id))
    })
  }

  // 确认排班
  const handleBatchConfirm = async () => {
    if (selectedIds.size === 0) { showToast('请先勾选排班记录'); return }
    const ids = Array.from(selectedIds)
    // 检查是否有未安排司机的
    const noDriver = pagedReal.filter(d => ids.includes(d.id) && !d.driver)
    if (noDriver.length > 0) {
      showToast(`排班记录 ${noDriver.map(d => d.id).join(', ')} 未安排司机，无法确认`)
      return
    }
    setConfirming(true)
    try {
      await confirmSchedules(ids)
      showToast(`成功确认 ${ids.length} 条排班记录`)
      setSelectedIds(new Set())
      fetchData()
    } catch (e: any) {
      showToast('确认失败: ' + (e?.message || '未知错误'))
    } finally {
      setConfirming(false)
    }
  }

  // 通知司机
  const handleBatchNotify = async () => {
    if (selectedIds.size === 0) { showToast('请先勾选排班记录'); return }
    const ids = Array.from(selectedIds)
    // 检查是否有未确认的
    const notConfirmed = pagedReal.filter(d => ids.includes(d.id) && d.status !== '已确认')
    if (notConfirmed.length > 0) {
      showToast(`排班记录 ${notConfirmed.map(d => d.id).join(', ')} 尚未确认排班，无法通知`)
      return
    }
    setNotifying(true)
    try {
      await notifySchedulesStatus(ids)
      showToast(`成功通知 ${ids.length} 条排班记录的司机`)
      setSelectedIds(new Set())
      fetchData()
    } catch (e: any) {
      showToast('通知失败: ' + (e?.message || '未知错误'))
    } finally {
      setNotifying(false)
    }
  }

  // ---- 手动新增排班 ----
  const handleCreateSchedule = async () => {
    if (!newForm.date.trim()) { showToast('请选择日期'); return }
    if (!newForm.route.trim()) { showToast('请填写路线'); return }
    setCreating(true)
    try {
      await createSchedule({
        date: newForm.date,
        route: newForm.route,
        departTime: newForm.departTime,
        returnTime: newForm.returnTime,
        fleet: newForm.fleet,
        charterContract: newForm.charterContract,
        charterType: newForm.charterType,
        plateNumber: newForm.plateNumber,
        driver: newForm.driver,
        phone: newForm.phone,
        passengerCount: newForm.passengerCount,
        unit: newForm.unit,
        vehicleStatus: newForm.vehicleStatus,
        dispatcher: newForm.dispatcher,
        kilometers: newForm.kilometers,
        remark: newForm.remark,
      })
      showToast('排班新增成功')
      setCreatingSchedule(false)
      setNewForm({ date: '', route: '', departTime: '', returnTime: '', fleet: '', charterContract: '', charterType: '上下班车', plateNumber: '', driver: '', phone: '', passengerCount: 0, unit: '', vehicleStatus: '待出车', dispatcher: '', kilometers: 0, remark: '' })
      fetchData()
    } catch (e: any) {
      showToast('新增失败: ' + (e?.message || '未知错误'))
    } finally {
      setCreating(false)
    }
  }

  // ---- 班次数据（从后端 API 获取，避免 lazy 组件与 useSyncExternalStore 冲突） ----
  const [activeShifts, setActiveShifts] = useState<AdminShiftItem[]>([])

  // 加载班次数据
  useEffect(() => {
    getShifts().then(res => {
      setActiveShifts((res.list || []).filter(s => s.status === 'active'))
    }).catch(() => {})
  }, [])

  // ---- 一键生成状态 ----
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')

  // 计算自动生成范围
  const genDateFrom = dateFrom || todayStr()
  const genDateTo = dateTo || addDays(todayStr(), 30)

  // 根据班次配置计算待生成的排班条目
  const generatedEntries: GeneratedScheduleEntry[] = useMemo(() => {
    if (activeShifts.length === 0) return []
    const existingKeys = new Set(data.map(d => `${d.date}::${d.route}`))

    const entries: GeneratedScheduleEntry[] = []
    for (const shift of activeShifts) {
      const dates = calcShiftDates(shift, genDateFrom, genDateTo)
      for (const date of dates) {
        const key = `${date}::${shift.route}`
        if (existingKeys.has(key)) continue // 已有真实排班，跳过
        entries.push({
          _generated: true,
          shiftId: shift.id,
          shiftName: shift.name,
          date,
          route: shift.route,
          orderNo: shift.orderNo,
          departTime: shift.departureTime,
          returnTime: shift.arrivalTime,
          passengerCount: shift.seatCount,
          vehicleType: shift.vehicleType,
          charterType: '上下班车',
          vehicleStatus: '待确认',
          fleet: '',
          plateNumber: '',
          driver: '',
          phone: '',
          charterContract: shift.orderNo,
          unit: '',
          dispatcher: '',
          kilometers: 0,
          remark: `由班次「${shift.name}」自动生成`,
        })
      }
    }
    // 按日期排序
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.shiftName.localeCompare(b.shiftName))
    return entries
  }, [activeShifts, data, genDateFrom, genDateTo])

  // 真实数据的筛选匹配
  const realFiltered = useMemo(() => {
    let list = data
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        (d.plateNumber || '').toLowerCase().includes(q) ||
        (d.driver || '').toLowerCase().includes(q) ||
        (d.route || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [data, search])

  // 生成条目的筛选匹配
  const genFiltered = useMemo(() => {
    if (!search) return generatedEntries
    const q = search.toLowerCase()
    return generatedEntries.filter(g =>
      g.route.toLowerCase().includes(q) ||
      g.shiftName.toLowerCase().includes(q) ||
      g.orderNo.toLowerCase().includes(q)
    )
  }, [generatedEntries, search])

  // === 数据拉取 ===
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSchedules({ search: '', dateFrom, dateTo, fleet: fleetFilter, page: 1, pageSize: 9999 })
      setData(res.list)
      setTotal(res.total)
      setTotalPages(Math.max(1, Math.ceil(res.total / pageSize)))
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, fleetFilter])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    getFleets().then(setFleets).catch(() => {})
  }, [])

  // === 司机安排（编辑弹窗） ===
  const openEditModal = (item: AdminScheduleItem) => {
    setEditingSchedule(item)
    setEditForm({
      driver: item.driver || '',
      driverId: '',
      plateNumber: item.plateNumber || '',
      phone: item.phone || '',
      fleet: item.fleet || '',
    })
  }

  const handleDriverSelect = async (driverId: string) => {
    if (!driverId || !editingSchedule) return
    const driver = drivers.find(d => String(d.id) === driverId)
    if (driver) {
      const newPlate = driver.carPlate || driver.vehiclePlate || ''

      // 检查车辆时间冲突
      if (newPlate) {
        const scheduleDate = editingSchedule.date
        const scheduleDepart = editingSchedule.departTime
        const scheduleReturn = editingSchedule.returnTime
        if (scheduleDate && scheduleDepart) {
          try {
            const res = await checkVehicleConflict(newPlate, scheduleDate, scheduleDepart, scheduleReturn || undefined, editingSchedule.id)
            if (res.hasConflict) {
              const c = res.conflicts[0]
              showToast(`车辆 ${newPlate} 与已有排班冲突：${c.date} ${c.departTime}~${c.returnTime} ${c.route}（${c.driver}）`)
              return
            }
          } catch (_) { /* 网络错误忽略 */ }
        }
      }

      setEditForm(f => ({
        ...f,
        driverId,
        driver: driver.name,
        plateNumber: newPlate || f.plateNumber,
        phone: driver.phone || f.phone,
      }))
    }
  }

  const handleSaveDriver = async () => {
    if (!editingSchedule) return
    if (!editForm.driver.trim()) { showToast('请选择司机'); return }
    setSavingDriver(true)
    try {
      await updateSchedule(editingSchedule.id, {
        driver: editForm.driver,
        plateNumber: editForm.plateNumber,
        phone: editForm.phone,
        fleet: editForm.fleet,
      })
      showToast('司机安排成功')
      setEditingSchedule(null)
      fetchData()
    } catch (e: any) {
      showToast('保存失败: ' + (e?.message || '未知错误'))
    } finally {
      setSavingDriver(false)
    }
  }

  useEffect(() => { setPage(1) }, [search, dateFrom, dateTo, fleetFilter])

  // === 一键生成排班 ===
  const handleBatchGenerate = async () => {
    if (genFiltered.length === 0) return
    setGenerating(true)
    let success = 0
    let fail = 0
    const total = genFiltered.length

    for (let i = 0; i < genFiltered.length; i++) {
      const g = genFiltered[i]
      setGenProgress(`正在生成 ${i + 1}/${total} ...`)
      try {
        await createSchedule({
          date: g.date,
          route: g.route,
          plateNumber: '',
          driver: '',
          departTime: g.departTime,
          returnTime: g.returnTime,
          fleet: '',
          charterType: '上下班车',
          charterContract: g.orderNo,
          vehicleStatus: '待出车',
          passengerCount: g.passengerCount,
          unit: '',
          dispatcher: '',
          kilometers: 0,
          phone: '',
          remark: g.remark,
        })
        success++
      } catch {
        fail++
      }
    }

    setGenerating(false)
    setGenProgress('')

    if (fail === 0) {
      showToast(`成功生成 ${success} 条排班记录`)
    } else {
      showToast(`成功 ${success} 条，失败 ${fail} 条`)
    }

    // 重新拉取数据
    fetchData()
  }

  // === 状态颜色 ===
  const statusColor: Record<string, string> = {
    '待出车': 'bg-amber-50 text-amber-600',
    '出车中': 'bg-blue-50 text-blue-600',
    '已收车': 'bg-emerald-50 text-emerald-600',
    '维修中': 'bg-red-50 text-red-600',
    '保养中': 'bg-purple-50 text-purple-600',
    '待确认': 'bg-violet-50 text-violet-600',
  }

  // 分页后的真实数据
  const pagedReal = realFiltered.slice((page - 1) * pageSize, page * pageSize)
  const realTotalPages = Math.max(1, Math.ceil(realFiltered.length / pageSize))

  return (
    <div className="h-full flex flex-col">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索车牌、司机、路线..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <span className="text-slate-400 text-sm">至</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={fleetFilter} onChange={e => setFleetFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="all">全部车队</option>
          {fleets.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
        </select>
        <span className="text-sm text-slate-400">
          <Filter className="w-3.5 h-3.5 inline mr-1" />
          共 {total + generatedEntries.length} 条排班记录
        </span>
        <button
          onClick={() => setCreatingSchedule(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          手动新增
        </button>
      </div>

      {/* ===== 待生成排班区域 ===== */}
      {genFiltered.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-700">
                根据班次配置，{genDateFrom} ~ {genDateTo} 共 <span className="text-violet-900">{genFiltered.length}</span> 条待生成排班
              </span>
            </div>
            <button
              onClick={handleBatchGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-violet-200"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {genProgress || '生成中...'}
                </>
              ) : (
                <>
                  <ListChecks className="w-4 h-4" />
                  一键生成排班
                </>
              )}
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {genFiltered.map((g, idx) => (
              <div key={`gen-${g.shiftId}-${g.date}`}
                className="rounded-xl border p-4 bg-violet-50/30 border-violet-200 border-dashed hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                      <span className="text-sm font-semibold text-slate-800">{g.date}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-600">待确认</span>
                      <span className="text-xs text-slate-400">{g.charterType}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-violet-100 text-violet-600">
                        <Bus className="w-3 h-3" />{g.shiftName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-violet-500">{g.vehicleType || '待分配车型'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />待分配
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{g.route || '-'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />合同：{g.orderNo || '-'}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />车队：-</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />出发：{g.departTime || '-'} | 返回：{g.returnTime || '-'}</span>
                      <span>载客：{g.passengerCount}人</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-violet-500 px-1.5 py-0.5 rounded bg-violet-100 shrink-0">待生成</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 分隔线 ===== */}
      {genFiltered.length > 0 && realFiltered.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 shrink-0">已生成排班</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      )}

      {/* ===== 已生成排班列表（表格） ===== */}
      {/* 批量操作工具栏 */}
      {realFiltered.length > 0 && (
        <div className="flex items-center gap-3 mb-2 px-2 py-2 bg-slate-50/80 rounded-lg border border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={realFiltered.length > 0 && selectedIds.size === realFiltered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
            <span className="text-sm text-slate-600">全选 <span className="text-slate-400">({selectedIds.size}/{realFiltered.length})</span></span>
          </label>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchConfirm}
            disabled={selectedIds.size === 0 || confirming}
            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
          >
            {confirming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-1" />}
            确认排班
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchNotify}
            disabled={selectedIds.size === 0 || notifying}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            {notifying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            通知司机
          </Button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-2 py-3 font-medium text-slate-600 whitespace-nowrap w-8">
                <input type="checkbox" checked={realFiltered.length > 0 && selectedIds.size === realFiltered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
              </th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">发车日期</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">订单号</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">路线</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">合同</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">车队</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">车牌</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">司机</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">出发</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">返回</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">载客</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">车辆状态</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">确认状态</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">通知状态</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={15} className="px-4 py-12 text-center text-slate-400">加载中...</td>
              </tr>
            ) : realFiltered.length === 0 && genFiltered.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-12 text-center text-slate-400">
                  {activeShifts.length === 0 ? '暂无排班数据' : '当前日期范围内暂无排班数据'}
                </td>
              </tr>
            ) : realFiltered.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-12 text-center text-slate-400">暂无排班数据</td>
              </tr>
            ) : (
              pagedReal.map(item => (
                <tr key={`real-${item.id}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-2 py-3">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">{item.date}</td>
                  <td className="px-3 py-3">
                    <span className="text-slate-700 font-mono text-xs whitespace-nowrap">{item.orderNo || '-'}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[160px]">{item.route || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 whitespace-nowrap font-mono text-xs">{item.charterContract || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 whitespace-nowrap">{item.fleet || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 whitespace-nowrap">{item.plateNumber || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 whitespace-nowrap">{item.driver || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-slate-700 whitespace-nowrap">{item.departTime || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{item.returnTime || '-'}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{item.passengerCount || 0}人</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor[item.vehicleStatus] || 'bg-slate-50 text-slate-500'}`}>
                      {item.vehicleStatus || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${item.status === '已确认' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {item.status || '待确认'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${item.notifyStatus === '已通知' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Info className="w-3 h-3" />
                      {item.notifyStatus || '未通知'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-orange-500 transition-colors"
                        title="安排司机"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页（仅对真实数据） */}
      {realTotalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm text-slate-500">第 {page} 页，共 {realTotalPages} 页</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: realTotalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm ${p === page ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(realTotalPages, p + 1))}
              disabled={page >= realTotalPages}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">排班详情</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
              {[
                ['日期', selectedItem.date],
                ['合同', selectedItem.charterContract],
                ['车队', selectedItem.fleet],
                ['包车类型', selectedItem.charterType],
                ['车牌号', selectedItem.plateNumber],
                ['出发时间', selectedItem.departTime],
                ['返回时间', selectedItem.returnTime],
                ['载客人数', `${selectedItem.passengerCount}人`],
                ['单位', selectedItem.unit],
                ['司机', selectedItem.driver],
                ['路线', selectedItem.route],
                ['车辆状态', selectedItem.vehicleStatus],
                ['调度员', selectedItem.dispatcher],
                ['里程', `${selectedItem.kilometers}km`],
                ['电话', selectedItem.phone],
                ['备注', selectedItem.remark || '-'],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <span className="block text-xs text-slate-400 mb-0.5">{label}</span>
                  <span className="text-slate-700 font-medium">{value || '-'}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 text-right">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 司机安排弹窗 */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingSchedule(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                安排司机
              </h3>
              <button onClick={() => setEditingSchedule(null)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* 排班信息摘要 */}
            <div className="px-6 pt-4 pb-2 bg-slate-50 mx-4 mt-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>日期: <span className="text-slate-700 font-medium">{editingSchedule.date}</span></div>
                <div>路线: <span className="text-slate-700 font-medium">{editingSchedule.route || '-'}</span></div>
                <div>合同: <span className="text-slate-700 font-medium">{editingSchedule.charterContract || '-'}</span></div>
                <div>车型: <span className="text-slate-700 font-medium">{editingSchedule.charterType || '-'}</span></div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* 选择司机 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">选择司机</label>
                <select
                  value={editForm.driverId}
                  onChange={e => handleDriverSelect(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none bg-white"
                >
                  <option value="">— 选择已有司机 —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name} — {d.carPlate || d.vehiclePlate || '无车牌'} {d.vehicleType ? `(${d.vehicleType})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 司机姓名 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  <User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  司机姓名
                </label>
                <input
                  type="text"
                  value={editForm.driver}
                  onChange={e => setEditForm(f => ({ ...f, driver: e.target.value, driverId: '' }))}
                  placeholder="可手动填写或从上方选择"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>

              {/* 车牌号 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  <Car className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  车牌号
                </label>
                <input
                  type="text"
                  value={editForm.plateNumber}
                  onChange={e => setEditForm(f => ({ ...f, plateNumber: e.target.value }))}
                  placeholder="车牌号"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>

              {/* 电话 & 车队 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="手机号"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                    车队
                  </label>
                  <select
                    value={editForm.fleet}
                    onChange={e => setEditForm(f => ({ ...f, fleet: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-white"
                  >
                    <option value="">— 选择车队 —</option>
                    {fleets.map(f => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setEditingSchedule(null)}
                className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveDriver}
                disabled={savingDriver}
                className="px-5 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {savingDriver ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
                ) : (
                  <><Save className="w-4 h-4" /> 保存</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手动新增排班弹窗 */}
      {creatingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreatingSchedule(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                手动新增排班
              </h3>
              <button onClick={() => setCreatingSchedule(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-3 gap-4 text-sm">
              {/* 日期 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">日期 <span className="text-red-400">*</span></label>
                <input type="date" value={newForm.date} onChange={e => setNewForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 路线 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">路线 <span className="text-red-400">*</span></label>
                <input type="text" value={newForm.route} onChange={e => setNewForm(f => ({ ...f, route: e.target.value }))} placeholder="如：深圳北站→科技园"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 合同编号 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">合同编号</label>
                <input type="text" value={newForm.charterContract} onChange={e => setNewForm(f => ({ ...f, charterContract: e.target.value }))} placeholder="合同号"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 出发时间 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">出发时间</label>
                <input type="time" value={newForm.departTime} onChange={e => setNewForm(f => ({ ...f, departTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 返回时间 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">返回时间</label>
                <input type="time" value={newForm.returnTime} onChange={e => setNewForm(f => ({ ...f, returnTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 车队 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">车队</label>
                <select value={newForm.fleet} onChange={e => setNewForm(f => ({ ...f, fleet: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-white">
                  <option value="">— 请选择 —</option>
                  {fleets.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              {/* 包车类型 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">包车类型</label>
                <select value={newForm.charterType} onChange={e => setNewForm(f => ({ ...f, charterType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-white">
                  <option value="上下班车">上下班车</option>
                  <option value="通勤车">通勤车</option>
                  <option value="机场接送">机场接送</option>
                  <option value="旅游包车">旅游包车</option>
                  <option value="其它">其它</option>
                </select>
              </div>
              {/* 车辆状态 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">车辆状态</label>
                <select value={newForm.vehicleStatus} onChange={e => setNewForm(f => ({ ...f, vehicleStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-white">
                  <option value="待出车">待出车</option>
                  <option value="已出车">已出车</option>
                  <option value="已完成">已完成</option>
                </select>
              </div>
              {/* 车牌号 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">车牌号</label>
                <input type="text" value={newForm.plateNumber} onChange={e => setNewForm(f => ({ ...f, plateNumber: e.target.value }))} placeholder="如：粤B12345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 司机 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">司机</label>
                <input type="text" value={newForm.driver} onChange={e => setNewForm(f => ({ ...f, driver: e.target.value }))} placeholder="司机姓名"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 电话 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">电话</label>
                <input type="text" value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} placeholder="手机号"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 载客人数 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">载客人数</label>
                <input type="number" value={newForm.passengerCount || ''} onChange={e => setNewForm(f => ({ ...f, passengerCount: parseInt(e.target.value) || 0 }))} placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 单位 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">单位</label>
                <input type="text" value={newForm.unit} onChange={e => setNewForm(f => ({ ...f, unit: e.target.value }))} placeholder="用车单位"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 调度员 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">调度员</label>
                <input type="text" value={newForm.dispatcher} onChange={e => setNewForm(f => ({ ...f, dispatcher: e.target.value }))} placeholder="调度员姓名"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 里程 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">里程 (km)</label>
                <input type="number" value={newForm.kilometers || ''} onChange={e => setNewForm(f => ({ ...f, kilometers: parseInt(e.target.value) || 0 }))} placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              {/* 备注 */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">备注</label>
                <input type="text" value={newForm.remark} onChange={e => setNewForm(f => ({ ...f, remark: e.target.value }))} placeholder="备注信息"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button onClick={() => setCreatingSchedule(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                取消
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存排班
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

export default ScheduleList
