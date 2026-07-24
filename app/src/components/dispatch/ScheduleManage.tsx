import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getFleets, getContracts, exportSchedules, downloadScheduleTemplate, importSchedules, notifySchedules } from '@/api/modules/admin'
import type { AdminScheduleItem, FleetItem, AdminContractItem } from '@/api/modules/admin'
import {
  Search, Plus, Pencil, Trash2, Eye, X, ChevronLeft, ChevronRight,
  Calendar, Car, User, MapPin, Phone, FileText, Building2,
  Download, Upload, FileSpreadsheet, Bell,
} from 'lucide-react'

interface FormData {
  date: string
  charterContract: string
  fleet: string
  charterType: string
  plateNumber: string
  departTime: string
  passengerCount: number
  unit: string
  driver: string
  route: string
  vehicleStatus: string
  dispatcher: string
  kilometers: number
  returnTime: string
  phone: string
  remark: string
}

const emptyForm: FormData = {
  date: '', charterContract: '', fleet: '', charterType: '', plateNumber: '',
  departTime: '', passengerCount: 0, unit: '', driver: '', route: '',
  vehicleStatus: '', dispatcher: '', kilometers: 0, returnTime: '', phone: '', remark: '',
}

const CHARTER_TYPES = ['按天包', '按小时包', '单程', '往返', '机场接送', '高铁接送', '定制包车']
const VEHICLE_STATUSES = ['待出车', '出车中', '已收车', '维修中', '保养中']

export function ScheduleManage() {
  const [data, setData] = useState<AdminScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fleetFilter, setFleetFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [toast, setToast] = useState('')

  // 弹窗
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // 导入导出
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [showImportErrors, setShowImportErrors] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 通知司机
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ notified: number; failedCount: number; totalSchedules: number; details: { driverName: string; phone: string; taskCount: number; routes: string }[]; failedDetails: { driverName: string; phone: string; reason: string }[] } | null>(null)
  const [showNotifyResult, setShowNotifyResult] = useState(false)

  // 多选
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // 详情
  const [selectedItem, setSelectedItem] = useState<AdminScheduleItem | null>(null)

  // 下拉数据
  const [fleets, setFleets] = useState<FleetItem[]>([])
  const [, setContracts] = useState<AdminContractItem[]>([])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const result = await getSchedules({
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        fleet: fleetFilter,
        page,
        pageSize: 15,
      })
      setData(result.list)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (_) { showToast('加载排班数据失败') }
    finally { setLoading(false) }
  }

  // 加载下拉选项
  useEffect(() => {
    Promise.all([getFleets(), getContracts()])
      .then(([fList, cList]) => {
        setFleets(fList as any)
        setContracts(cList as any)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { loadData() }, [page])

  // 搜索/筛选变化重置页码
  useEffect(() => {
    setPage(1)
    const timer = setTimeout(() => loadData(), 300)
    return () => clearTimeout(timer)
  }, [search, dateFrom, dateTo, fleetFilter])

  // 打开新增
  const openAdd = () => {
    setEditingId(null)
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
    setShowForm(true)
  }

  // 打开编辑
  const openEdit = (item: AdminScheduleItem) => {
    setEditingId(item.id)
    setForm({
      date: item.date, charterContract: item.charterContract, fleet: item.fleet,
      charterType: item.charterType, plateNumber: item.plateNumber,
      departTime: item.departTime, passengerCount: item.passengerCount,
      unit: item.unit, driver: item.driver, route: item.route,
      vehicleStatus: item.vehicleStatus, dispatcher: item.dispatcher,
      kilometers: item.kilometers, returnTime: item.returnTime,
      phone: item.phone, remark: item.remark,
    })
    setShowForm(true)
  }

  // 提交
  const handleSubmit = async () => {
    if (!form.date) { showToast('请选择日期'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        await updateSchedule(editingId, form)
        showToast('排班记录已更新')
      } else {
        await createSchedule(form)
        showToast('排班记录添加成功')
      }
      setShowForm(false)
      await loadData()
    } catch (_) { showToast('操作失败，请重试') }
    finally { setSubmitting(false) }
  }

  // 删除
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该排班记录吗？')) return
    try {
      await deleteSchedule(id)
      showToast('排班记录已删除')
      await loadData()
    } catch (_) { showToast('删除失败') }
  }

  // 导出
  const handleExport = async () => {
    setExporting(true)
    try {
      await exportSchedules({
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        fleet: fleetFilter,
      })
      showToast('导出成功')
    } catch (_) { showToast('导出失败') }
    finally { setExporting(false) }
  }

  // 一键通知司机
  const handleNotify = async () => {
    setNotifying(true)
    try {
      const scheduleIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined
      const result = await notifySchedules(scheduleIds)
      if (result.notified === 0 && result.failedCount > 0) {
        setNotifyResult(result)
        setShowNotifyResult(true)
      } else if (result.notified === 0) {
        showToast('没有可通知的排班任务')
      } else {
        setNotifyResult(result)
        setShowNotifyResult(true)
        showToast(`已通知 ${result.notified} 位司机`)
        setSelectedIds(new Set())
        await loadData()
      }
    } catch (_) { showToast('通知发送失败') }
    finally { setNotifying(false) }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === data.length && data.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map(d => d.id)))
    }
  }

  // 单行选中/取消
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // 下载模板
  const handleDownloadTemplate = async () => {
    try {
      await downloadScheduleTemplate()
      showToast('模板下载成功')
    } catch (_) { showToast('模板下载失败') }
  }

  // 处理文件选择并导入
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]

      if (rows.length < 2) {
        showToast('文件中没有数据行')
        setImporting(false)
        return
      }

      // 跳过表头(第1行), 跳过提示行(如果有"提示"关键字)
      const dataRows = rows.slice(1)
        .filter(row => {
          const firstCell = String(row[0] || '').trim()
          return firstCell && !firstCell.includes('提示')
        })
        .map(row => {
          const obj: Record<string, string> = {}
          // 14 个字段按导入模板顺序映射（车队和驾驶员由系统自动填充）
          const keys = ['date', 'charterContract', 'charterType', 'plateNumber',
            'departTime', 'passengerCount', 'unit', 'route',
            'vehicleStatus', 'dispatcher', 'kilometers', 'returnTime', 'phone', 'remark']
          keys.forEach((k, i) => { obj[k] = String(row[i] ?? '').trim() })
          return obj
        })

      if (dataRows.length === 0) {
        showToast('文件中没有有效数据行')
        setImporting(false)
        return
      }

      const result = await importSchedules(dataRows)
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors)
        setShowImportErrors(true)
      }
      showToast(result.message || `成功导入 ${result.success} 条记录`)
      await loadData()
    } catch (err: any) {
      showToast('导入失败: ' + (err?.message || '文件格式错误'))
    }
    finally {
      setImporting(false)
      // 重置 file input 以便重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 格式化日期时间
  const fmtDT = (v: string) => v ? v.replace('T', ' ').slice(0, 16) : '-'

  // 表格字段选择器（16个字段全部都在表单中，表格展示核心字段）
  const renderFormField = (
    label: string, field: keyof FormData, type: 'text' | 'date' | 'datetime-local' | 'number' | 'select' = 'text',
    options?: string[]
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {type === 'select' && options ? (
        <select
          value={String(form[field])}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">请选择{label}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'number' ? (
        <input
          type="number" value={form[field] as number}
          onChange={e => setForm({ ...form, [field]: Number(e.target.value) })}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      ) : (
        <input
          type={type} value={String(form[field])}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">调度排班</h2>
          <p className="text-sm text-slate-500 mt-0.5">管理每日调度排班信息，记录出车详情</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 下载导入模板 */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            title="下载导入模板"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">下载模板</span>
          </button>

          {/* 导入按钮 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="schedule-import-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="导入Excel文件"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{importing ? '导入中...' : '导入'}</span>
          </button>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="导出当前数据"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{exporting ? '导出中...' : '导出'}</span>
          </button>

          {/* 一键通知司机 */}
          <button
            onClick={handleNotify}
            disabled={notifying}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              selectedIds.size > 0
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
            title={selectedIds.size > 0 ? `通知选中的 ${selectedIds.size} 条排班` : '通知今日全部排班司机'}
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">
              {notifying ? '通知中...' : selectedIds.size > 0 ? `通知司机(${selectedIds.size})` : '通知司机'}
            </span>
          </button>

          {/* 新增 */}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />新增排班
          </button>
        </div>
      </div>

      {/* 搜索 & 筛选 */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="搜索驾驶员、车牌、单位、行程..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            title="开始日期"
          />
          <span className="text-slate-400 text-sm">至</span>
          <input
            type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            title="结束日期"
          />
        </div>
        <select
          value={fleetFilter}
          onChange={e => setFleetFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="all">全部车队</option>
          {fleets.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="py-2.5 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.size === data.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">日期</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">包车合同</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">车队</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">包车类型</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">车牌号码</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">出车时间</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">驾驶员</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">用车单位</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">行程</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">车辆状态</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">调度员</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50/30 transition-colors ${selectedIds.has(item.id) ? 'bg-amber-50/50' : ''}`}>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-700 whitespace-nowrap font-medium">{item.date}</td>
                  <td className="py-2.5 px-3 text-sm text-slate-600 whitespace-nowrap max-w-[120px] truncate" title={item.charterContract}>
                    {item.charterContract || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-600 whitespace-nowrap">{item.fleet || '-'}</td>
                  <td className="py-2.5 px-3">
                    {item.charterType ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 whitespace-nowrap">
                        {item.charterType}
                      </span>
                    ) : <span className="text-xs text-slate-400">-</span>}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-600 font-mono whitespace-nowrap">{item.plateNumber || '-'}</td>
                  <td className="py-2.5 px-3 text-sm text-slate-500 whitespace-nowrap">{fmtDT(item.departTime) || '-'}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {item.driver ? item.driver.charAt(0) : '司'}
                      </div>
                      <span className="text-sm text-slate-700 whitespace-nowrap">{item.driver || '-'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-600 whitespace-nowrap max-w-[100px] truncate" title={item.unit}>
                    {item.unit || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-500 whitespace-nowrap max-w-[150px] truncate" title={item.route}>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{item.route || '-'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {item.vehicleStatus ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        item.vehicleStatus === '出车中' ? 'bg-orange-50 text-orange-600' :
                        item.vehicleStatus === '已收车' ? 'bg-emerald-50 text-emerald-600' :
                        item.vehicleStatus === '待出车' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {item.vehicleStatus}
                      </span>
                    ) : <span className="text-xs text-slate-400">-</span>}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-slate-600 whitespace-nowrap">{item.dispatcher || '-'}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div className="py-12 text-center text-slate-400">暂无排班数据，点击右上角新增排班</div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-400">共 {total} 条记录</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 新增/编辑弹窗 ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-slate-800 text-lg">{editingId ? '编辑排班' : '新增排班'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderFormField('日期', 'date', 'date')}
              {renderFormField('出车时间', 'departTime', 'datetime-local')}
              {renderFormField('收车时间', 'returnTime', 'datetime-local')}
              {renderFormField('车牌号码', 'plateNumber')}
              {renderFormField('驾驶员', 'driver')}
              {renderFormField('电话', 'phone')}
              {renderFormField('包车合同', 'charterContract')}
              {renderFormField('车队', 'fleet')}
              {renderFormField('包车类型', 'charterType', 'select', CHARTER_TYPES)}
              {renderFormField('用车单位', 'unit')}
              {renderFormField('行程', 'route')}
              {renderFormField('车辆状态', 'vehicleStatus', 'select', VEHICLE_STATUSES)}
              {renderFormField('调度员', 'dispatcher')}
              {renderFormField('公里数', 'kilometers', 'number')}
              {renderFormField('实裁人数', 'passengerCount', 'number')}
              {/* 备注跨2列 */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">备注</label>
                <textarea
                  value={form.remark}
                  onChange={e => setForm({ ...form, remark: e.target.value })}
                  placeholder="备注信息（可选）"
                  className="w-full h-20 rounded-xl border border-slate-200 bg-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? '提交中...' : (editingId ? '保存修改' : '添加排班')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 详情弹窗 ===== */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">排班详情</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <DetailField icon={<Calendar className="w-4 h-4" />} label="日期" value={selectedItem.date} />
              <DetailField icon={<Calendar className="w-4 h-4" />} label="出车时间" value={fmtDT(selectedItem.departTime)} />
              <DetailField icon={<Calendar className="w-4 h-4" />} label="收车时间" value={fmtDT(selectedItem.returnTime)} />
              <DetailField icon={<Car className="w-4 h-4" />} label="车牌号码" value={selectedItem.plateNumber} />
              <DetailField icon={<User className="w-4 h-4" />} label="驾驶员" value={selectedItem.driver} />
              <DetailField icon={<Phone className="w-4 h-4" />} label="电话" value={selectedItem.phone} />
              <DetailField icon={<FileText className="w-4 h-4" />} label="包车合同" value={selectedItem.charterContract} />
              <DetailField icon={<Building2 className="w-4 h-4" />} label="车队" value={selectedItem.fleet} />
              <DetailField icon={<FileText className="w-4 h-4" />} label="包车类型" value={selectedItem.charterType} />
              <DetailField icon={<Building2 className="w-4 h-4" />} label="用车单位" value={selectedItem.unit} />
              <DetailField icon={<MapPin className="w-4 h-4" />} label="行程" value={selectedItem.route} />
              <DetailField icon={<Car className="w-4 h-4" />} label="车辆状态" value={selectedItem.vehicleStatus} />
              <DetailField icon={<User className="w-4 h-4" />} label="调度员" value={selectedItem.dispatcher} />
              <DetailField icon={<MapPin className="w-4 h-4" />} label="公里数" value={selectedItem.kilometers > 0 ? `${selectedItem.kilometers} km` : '-'} />
              <DetailField icon={<User className="w-4 h-4" />} label="实裁人数" value={selectedItem.passengerCount > 0 ? `${selectedItem.passengerCount} 人` : '-'} />
            </div>
            {selectedItem.remark && (
              <div className="px-5 pb-2">
                <div className="text-xs font-medium text-slate-500 mb-1">备注</div>
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">{selectedItem.remark}</div>
              </div>
            )}
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => { const item = selectedItem; setSelectedItem(null); openEdit(item) }}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                <Pencil className="w-4 h-4 inline mr-1" />编辑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入错误详情弹窗 */}
      {showImportErrors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImportErrors(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-red-500" />
                </span>
                <h3 className="text-lg font-semibold text-slate-800">导入失败详情</h3>
              </div>
              <button onClick={() => setShowImportErrors(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-3 bg-red-50 border-b border-red-100">
              <p className="text-sm text-red-600">
                共 <span className="font-semibold">{importErrors.length}</span> 条记录导入失败
              </p>
            </div>
            <div className="overflow-y-auto px-6 py-3 flex-1">
              <ul className="space-y-2">
                {importErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-red-500">!</span>
                    </span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowImportErrors(false)}
                className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通知结果弹窗 */}
      {showNotifyResult && notifyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNotifyResult(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-green-600" />
                </span>
                <h3 className="text-lg font-semibold text-slate-800">通知结果</h3>
              </div>
              <button onClick={() => setShowNotifyResult(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className={`px-6 py-3 border-b ${notifyResult.failedCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
              <p className={`text-sm ${notifyResult.failedCount > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                今日共 <span className="font-semibold">{notifyResult.totalSchedules}</span> 条排班，
                已通知 <span className="font-semibold">{notifyResult.notified}</span> 位司机
                {notifyResult.failedCount > 0 && <>, <span className="text-red-600 font-semibold">{notifyResult.failedCount}</span> 位发送失败</>}
              </p>
            </div>
            <div className="overflow-y-auto px-6 py-3 flex-1">
              {/* 成功列表 */}
              {notifyResult.details.length > 0 && (
                <>
                  <p className="text-xs font-medium text-green-600 mb-2">✓ 已通知</p>
                  <ul className="space-y-2 mb-4">
                    {notifyResult.details.map((d, i) => (
                      <li key={i} className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{d.driverName}</span>
                          <span className="text-xs text-slate-400">{d.phone}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="inline-block bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 mr-2">{d.taskCount} 个任务</span>
                          {d.routes}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {/* 失败列表 */}
              {notifyResult.failedDetails.length > 0 && (
                <>
                  <p className="text-xs font-medium text-red-500 mb-2">✗ 发送失败</p>
                  <ul className="space-y-2">
                    {notifyResult.failedDetails.map((d, i) => (
                      <li key={i} className="text-sm bg-red-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-red-700">{d.driverName}</span>
                          <span className="text-xs text-slate-400">{d.phone}</span>
                        </div>
                        <p className="text-xs text-red-500">{d.reason}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowNotifyResult(false)}
                className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm font-medium text-slate-700 break-all">{value || '-'}</div>
      </div>
    </div>
  )
}

export default ScheduleManage
