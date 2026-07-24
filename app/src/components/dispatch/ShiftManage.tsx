import { useState, useCallback, useSyncExternalStore, useEffect } from 'react'
import {
  Search, Plus, Pencil, Trash2, X, Clock, MapPin, Bus, Users,
  ChevronLeft, ChevronRight, FileText, Calendar, Loader2, RefreshCw,
  ListChecks, CheckCircle2, Car,
} from 'lucide-react'
import { getAdminOrders, createSchedule, getSchedules, getDrivers } from '@/api/modules/admin'
import type { AdminDriverItem } from '@/api/modules/admin'
import {
  type CommuteShift,
  getShifts, addShift as storeAddShift, updateShift as storeUpdateShift,
  deleteShift as storeDeleteShift, subscribe,
  formatWeeklyDays, formatMonthlyDays, WEEK_DAY_LABELS, calcShiftDates,
  loadShifts,
} from '@/stores/shiftStore'

interface FormData {
  name: string
  route: string
  orderNo: string
  departureTime: string
  arrivalTime: string
  scheduleMode: 'weekly' | 'monthly'
  scheduleDays: number[]
  monthlyDays: number[]
  vehicleType: string
  seatCount: number
  status: 'active' | 'inactive'
  activeFrom: string
  activeTo: string
  driverId: string
}

const emptyForm: FormData = {
  name: '', route: '', orderNo: '', departureTime: '', arrivalTime: '',
  scheduleMode: 'weekly', scheduleDays: [1, 2, 3, 4, 5], monthlyDays: [],
  vehicleType: '大巴', seatCount: 45,
  status: 'active', activeFrom: '', activeTo: '', driverId: '',
}

const VEHICLE_TYPES = ['大巴', '中巴', '小巴', '商务车']
const MODE_COLORS: Record<string, string> = {
  weekly: 'bg-blue-50 text-blue-600',
  monthly: 'bg-purple-50 text-purple-600',
}

export function ShiftManage() {
  // 订阅共享 store，任意组件修改班次后此处自动更新
  const shifts = useSyncExternalStore(subscribe, getShifts, getShifts)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [toast, setToast] = useState('')
  const [fetchingOrder, setFetchingOrder] = useState(false)

  // 生成排班
  const [genShift, setGenShift] = useState<CommuteShift | null>(null)
  const [genDates, setGenDates] = useState<string[]>([])
  const [genSelected, setGenSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // 从后端加载班次数据
  useEffect(() => { loadShifts() }, [])

  // 司机列表（用于预设司机下拉）
  const [drivers, setDrivers] = useState<AdminDriverItem[]>([])
  useEffect(() => {
    getDrivers().then(r => setDrivers(Array.isArray(r) ? r : [])).catch(() => setDrivers([]))
  }, [])

  // ---- 表格勾选 ----
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [genTodayGenerating, setGenTodayGenerating] = useState(false)

  const toggleSelectAll = () => {
    const activeOnPage = paged.filter(s => s.status === 'active')
    if (activeOnPage.length === 0) return
    const allSelected = activeOnPage.every(s => selectedIds.has(s.id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        activeOnPage.forEach(s => next.delete(s.id))
      } else {
        activeOnPage.forEach(s => next.add(s.id))
      }
      return next
    })
  }

  // ---- 生成当天实时排班（从勾选的班次） ----
  const handleGenerateToday = async () => {
    const today = new Date().toISOString().slice(0, 10)
    if (selectedIds.size === 0) {
      showToast('请先勾选要生成的班次')
      return
    }

    // 检查当天是否已有排班
    try {
      const existing = await getSchedules({ dateFrom: today, dateTo: today, pageSize: 1 })
      if (existing.total > 0) {
        showToast('当天已有排班，不再重复生成')
        return
      }
    } catch {
      // API 失败也继续
    }

    // 从勾选中筛出今天匹配的班次
    const selected = shifts.filter(s => selectedIds.has(s.id) && s.status === 'active')
    const todayShifts = selected.filter(s => calcShiftDates(s, today, today).length > 0)

    if (todayShifts.length === 0) {
      showToast('已勾选的班次中没有今天需要排班的')
      return
    }

    setGenTodayGenerating(true)
    let success = 0
    let fail = 0
    for (const shift of todayShifts) {
      try {
        await createSchedule({
          date: today,
          route: shift.route,
          plateNumber: shift.driverPlate || '',
          driver: shift.driverName || '',
          departTime: shift.departureTime,
          returnTime: shift.arrivalTime,
          fleet: '',
          charterType: '上下班车',
          charterContract: shift.orderNo,
          vehicleStatus: '待出车',
          passengerCount: shift.seatCount,
          unit: '',
          dispatcher: '',
          kilometers: 0,
          phone: shift.driverPhone || '',
          remark: `班次: ${shift.name} [自动生成]`,
        })
        success++
      } catch { fail++ }
    }

    setGenTodayGenerating(false)
    setSelectedIds(new Set())
    if (fail === 0) {
      showToast(`成功生成今日 ${success} 条排班记录`)
    } else {
      showToast(`成功 ${success} 条，失败 ${fail} 条`)
    }
  }

  const filtered = shifts.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (search && !s.name.includes(search) && !s.route.includes(search) && !s.orderNo.includes(search)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  // 根据订单号自动获取订单线路信息
  const fetchOrderRoute = useCallback(async (orderNo: string) => {
    if (!orderNo.trim()) return
    setFetchingOrder(true)
    try {
      const res = await getAdminOrders({ search: orderNo.trim(), pageSize: 10 })
      const order = res.list.find(
        o => o.orderNo === orderNo.trim()
      )
      if (order) {
        setForm(f => ({
          ...f,
          route: order.route || f.route,
        }))
        showToast('已自动填充订单线路信息')
      } else {
        showToast('未找到该订单，请确认订单号')
      }
    } catch {
      showToast('查询订单失败')
    } finally {
      setFetchingOrder(false)
    }
  }, [])

  const handleSave = async () => {
    if (!form.name || !form.route || !form.departureTime || !form.arrivalTime) {
      showToast('请填写完整的班次信息')
      return
    }
    if (form.scheduleMode === 'weekly' && form.scheduleDays.length === 0) {
      showToast('请至少选择一天排班日期')
      return
    }
    if (form.scheduleMode === 'monthly' && form.monthlyDays.length === 0) {
      showToast('请至少选择一天排班日期')
      return
    }
    if (editingId !== null) {
      await storeUpdateShift(editingId, form)
      showToast('班次更新成功')
    } else {
      await storeAddShift({
        name: form.name,
        route: form.route,
        orderNo: form.orderNo,
        departureTime: form.departureTime,
        arrivalTime: form.arrivalTime,
        scheduleMode: form.scheduleMode,
        scheduleDays: form.scheduleDays,
        monthlyDays: form.monthlyDays,
        vehicleType: form.vehicleType,
        seatCount: form.seatCount,
        status: form.status,
        activeFrom: form.activeFrom,
        activeTo: form.activeTo,
        driverId: form.driverId,
        createdAt: new Date().toISOString().slice(0, 10),
      })
      showToast('班次创建成功')
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleEdit = (shift: CommuteShift) => {
    try {
      setEditingId(shift.id)
      setForm({
        name: shift.name ?? '', route: shift.route ?? '', orderNo: shift.orderNo ?? '',
        departureTime: shift.departureTime ?? '', arrivalTime: shift.arrivalTime ?? '',
        scheduleMode: shift.scheduleMode ?? 'weekly',
        scheduleDays: Array.isArray(shift.scheduleDays) ? [...shift.scheduleDays] : [],
        monthlyDays: Array.isArray(shift.monthlyDays) ? [...shift.monthlyDays] : [],
        vehicleType: shift.vehicleType ?? '', seatCount: shift.seatCount ?? 0,
        status: shift.status ?? 'active',
        activeFrom: shift.activeFrom ?? '', activeTo: shift.activeTo ?? '',
        driverId: shift.driverId || '',
      })
      setShowForm(true)
    } catch (e: any) {
      console.error('[ShiftManage] handleEdit error:', e)
      showToast('编辑打开失败: ' + (e?.message || '未知错误'))
    }
  }

  const handleDelete = async (id: number) => {
    await storeDeleteShift(id)
    showToast('班次已删除')
  }

  const handleToggleStatus = async (id: number) => {
    const s = shifts.find(x => x.id === id)
    if (s) {
      await storeUpdateShift(id, { status: s.status === 'active' ? 'inactive' : 'active' })
      showToast('状态已更新')
    }
  }

  const toggleWeekDay = (day: number) => {
    setForm(f => {
      const days = f.scheduleDays.includes(day)
        ? f.scheduleDays.filter(d => d !== day)
        : [...f.scheduleDays, day]
      return { ...f, scheduleDays: days }
    })
  }

  const toggleMonthDay = (day: number) => {
    setForm(f => {
      const days = f.monthlyDays.includes(day)
        ? f.monthlyDays.filter(d => d !== day)
        : [...f.monthlyDays, day]
      return { ...f, monthlyDays: days }
    })
  }

  // 根据班次生成排班日期列表
  const openGenerateModal = (shift: CommuteShift) => {
    if (!shift.activeFrom || !shift.activeTo) {
      showToast('请先设置启用时间和停用时间')
      return
    }
    const dates = calcShiftDates(shift, shift.activeFrom, shift.activeTo)

    if (dates.length === 0) {
      showToast('该班次在有效期内没有匹配的排班日期')
      return
    }
    setGenShift(shift)
    setGenDates(dates)
    setGenSelected(new Set(dates))
  }

  // 批量创建排班
  const handleCreateSchedules = async () => {
    if (!genShift || genSelected.size === 0) return
    setGenerating(true)
    let success = 0
    let fail = 0
    const selectedDates = Array.from(genSelected).sort()

    for (const date of selectedDates) {
      try {
        await createSchedule({
          date,
          route: genShift.route,
          plateNumber: genShift.driverPlate || '',
          driver: genShift.driverName || '',
          departTime: genShift.departureTime,
          returnTime: genShift.arrivalTime,
          fleet: '',
          charterType: '上下班车',
          charterContract: genShift.orderNo,
          vehicleStatus: '待出车',
          passengerCount: genShift.seatCount,
          unit: '',
          dispatcher: '',
          kilometers: 0,
          phone: genShift.driverPhone || '',
          remark: `班次: ${genShift.name} [自动生成]`,
        })
        success++
      } catch {
        fail++
      }
    }

    if (fail === 0) {
      showToast(`成功生成 ${success} 条排班记录`)
    } else {
      showToast(`成功 ${success} 条，失败 ${fail} 条`)
    }
    setGenerating(false)
    setGenShift(null)
    setGenDates([])
    setGenSelected(new Set())
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="搜索班次名称、路线或订单号..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1) }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">全部状态</option>
          <option value="active">启用</option>
          <option value="inactive">停用</option>
        </select>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />新增班次
        </button>
        <button
          onClick={handleGenerateToday}
          disabled={genTodayGenerating}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {genTodayGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          {genTodayGenerating ? '生成中...' : '生成实时班次'}
        </button>
      </div>

      {/* 表格 */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={paged.filter(s => s.status === 'active').length > 0 && paged.filter(s => s.status === 'active').every(s => selectedIds.has(s.id))}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">班次名称</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">路线</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">关联订单</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">发车</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">到达</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">排班日期</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">车型</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">座位</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">司机/车牌</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">启用时间</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">停用时间</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">状态</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(s => {
              const isActive = s.status === 'active'
              const isChecked = selectedIds.has(s.id)
              return (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isActive}
                    onChange={() => {
                      setSelectedIds(prev => {
                        const next = new Set(prev)
                        if (next.has(s.id)) next.delete(s.id)
                        else next.add(s.id)
                        return next
                      })
                    }}
                    className={`w-4 h-4 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer ${isActive ? 'text-emerald-600' : 'opacity-30 cursor-not-allowed'}`}
                  />
                </td>
                <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">{s.name}</td>
                <td className="px-3 py-3 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{s.route}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 whitespace-nowrap font-mono text-xs">{s.orderNo}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-slate-700 whitespace-nowrap">{s.departureTime}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{s.arrivalTime}</td>
                <td className="px-3 py-3">
                  {s.scheduleMode === 'weekly' ? (
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium w-fit ${MODE_COLORS.weekly}`}>
                        <RefreshCw className="w-3 h-3" />按周
                      </span>
                      <div className="flex flex-wrap gap-0.5">
                        {WEEK_DAY_LABELS.map((label, i) => {
                          const day = i + 1
                          const active = s.scheduleDays.includes(day)
                          return (
                            <span key={day} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${active ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-300'}`}>{label}</span>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium w-fit ${MODE_COLORS.monthly}`}>
                        <RefreshCw className="w-3 h-3" />按月
                      </span>
                      <div className="flex flex-wrap gap-0.5">
                        {s.monthlyDays.map(d => (
                          <span key={d} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-600">{d}号</span>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 whitespace-nowrap">{s.vehicleType}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 whitespace-nowrap">{s.seatCount}座</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {s.driverName ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-700 text-xs font-medium">{s.driverName}</span>
                      {s.driverPlate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600 font-mono w-fit">
                          <Car className="w-3 h-3" />{s.driverPlate}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs">未指定</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-700 whitespace-nowrap">{s.activeFrom}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 whitespace-nowrap">{s.activeTo}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => handleToggleStatus(s.id)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {s.status === 'active' ? '启用' : '停用'}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openGenerateModal(s)}
                      className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="生成排班"
                    >
                      <ListChecks className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
            {paged.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                  暂无班次数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm text-slate-500">共 {filtered.length} 条</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-slate-600">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 弹窗表单 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingId !== null ? '编辑班次' : '新增班次'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">班次名称</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="如：早班-A线" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">关联订单号</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={form.orderNo}
                      onChange={e => setForm(f => ({ ...f, orderNo: e.target.value }))}
                      onBlur={e => { if (e.target.value.trim()) fetchOrderRoute(e.target.value.trim()) }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                      placeholder="输入订单号，自动获取线路"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {fetchingOrder && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchOrderRoute(form.orderNo)}
                    disabled={!form.orderNo.trim() || fetchingOrder}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {fetchingOrder ? '查询中...' : '获取线路'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">输入订单号后点击获取线路，自动填充路线信息</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">路线</label>
                <input value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))}
                  placeholder="如：科技园 → 福田口岸（可自动填充或手动修改）" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">发车时间</label>
                  <input type="time" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">到达时间</label>
                  <input type="time" value={form.arrivalTime} onChange={e => setForm(f => ({ ...f, arrivalTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              {/* 排班模式选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">排班模式</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, scheduleMode: 'weekly' }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${form.scheduleMode === 'weekly' ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    <RefreshCw className="w-4 h-4 inline mr-1.5" />按周排班
                  </button>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, scheduleMode: 'monthly' }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${form.scheduleMode === 'monthly' ? 'bg-purple-50 text-purple-600 border-purple-300' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    <RefreshCw className="w-4 h-4 inline mr-1.5" />按月排班
                  </button>
                </div>
              </div>

              {/* 按周排班 */}
              {form.scheduleMode === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">排班日期（可多选）</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAY_LABELS.map((label, i) => {
                      const day = i + 1
                      const active = form.scheduleDays.includes(day)
                      return (
                        <button key={day} type="button" onClick={() => toggleWeekDay(day)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${active ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary'}`}>{label}</button>
                      )
                    })}
                  </div>
                  {form.scheduleDays.length === 0 && <p className="text-xs text-red-400 mt-1.5">请至少选择一天</p>}
                  {form.scheduleDays.length > 0 && <p className="text-xs text-slate-400 mt-1.5">已选：{formatWeeklyDays(form.scheduleDays)}</p>}
                </div>
              )}

              {/* 按月排班 */}
              {form.scheduleMode === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">排班日期（选择每月几号，可多选）</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      const active = form.monthlyDays.includes(day)
                      return (
                        <button key={day} type="button" onClick={() => toggleMonthDay(day)}
                          className={`w-9 h-9 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-500'}`}>{day}</button>
                      )
                    })}
                  </div>
                  {form.monthlyDays.length === 0 && <p className="text-xs text-red-400 mt-1.5">请至少选择一天</p>}
                  {form.monthlyDays.length > 0 && <p className="text-xs text-slate-400 mt-1.5">已选：{formatMonthlyDays(form.monthlyDays)}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">启用时间</label>
                  <input type="date" value={form.activeFrom} onChange={e => setForm(f => ({ ...f, activeFrom: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">停用时间</label>
                  <input type="date" value={form.activeTo} onChange={e => setForm(f => ({ ...f, activeTo: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">车型</label>
                  <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">座位数</label>
                  <input type="number" value={form.seatCount} onChange={e => setForm(f => ({ ...f, seatCount: +e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">预设司机</label>
                <select
                  value={form.driverId}
                  onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">不指定</option>
                  {(drivers || []).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.carPlate || '无车牌'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">取消</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                {editingId !== null ? '保存更改' : '创建班次'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 生成排班预览弹窗 */}
      {genShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setGenShift(null); setGenDates([]); setGenSelected(new Set()) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">生成排班列表</h3>
                <p className="text-xs text-slate-400 mt-0.5">{genShift.name} · {genShift.route}</p>
              </div>
              <button
                onClick={() => { setGenShift(null); setGenDates([]); setGenSelected(new Set()) }}
                className="p-1 rounded hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  共 <span className="font-semibold text-slate-700">{genDates.length}</span> 天，
                  已选 <span className="font-semibold text-emerald-600">{genSelected.size}</span> 天
                </span>
                <button
                  onClick={() => {
                    if (genSelected.size === genDates.length) {
                      setGenSelected(new Set())
                    } else {
                      setGenSelected(new Set(genDates))
                    }
                  }}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {genSelected.size === genDates.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                排班模式：{genShift.scheduleMode === 'weekly' ? '按周（' + formatWeeklyDays(genShift.scheduleDays) + '）' : '按月（' + formatMonthlyDays(genShift.monthlyDays) + '）'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
              {genDates.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">暂无匹配的排班日期</p>
              ) : (
                <div className="space-y-1">
                  {genDates.map(date => {
                    const d = new Date(date)
                    const weekDay = WEEK_DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]
                    const checked = genSelected.has(date)
                    return (
                      <label
                        key={date}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                          checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setGenSelected(prev => {
                              const next = new Set(prev)
                              if (next.has(date)) {
                                next.delete(date)
                              } else {
                                next.add(date)
                              }
                              return next
                            })
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-800">{date}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{weekDay}</span>
                        </div>
                        {checked && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
              <button
                onClick={() => { setGenShift(null); setGenDates([]); setGenSelected(new Set()) }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateSchedules}
                disabled={genSelected.size === 0 || generating}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <ListChecks className="w-4 h-4" />
                    确认生成 {genSelected.size > 0 && `(${genSelected.size})`}
                  </>
                )}
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

export default ShiftManage
