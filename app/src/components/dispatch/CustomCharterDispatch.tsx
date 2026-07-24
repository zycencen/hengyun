import { useState, useEffect } from 'react'
import { Search, Calendar, Filter, Car, User, MapPin, Clock, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Loader2, FileText, Phone, Building2, Gauge, CheckSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getCustomCharterSchedules,
  createCustomCharterSchedule,
  updateCustomCharterSchedule,
  deleteCustomCharterSchedule,
  confirmSchedules,
  notifySchedulesStatus,
  getFleets,
  getDrivers,
  type CustomCharterDispatchItem,
  type FleetItem,
  type AdminDriverItem,
} from '@/api/modules/admin'

export default function CustomCharterDispatch() {
  const [data, setData] = useState<CustomCharterDispatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fleetFilter, setFleetFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [fleets, setFleets] = useState<FleetItem[]>([])
  const [drivers, setDrivers] = useState<AdminDriverItem[]>([])
  const pageSize = 10

  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CustomCharterDispatchItem | null>(null)
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add')
  const [editForm, setEditForm] = useState({
    date: new Date().toISOString().slice(0, 10), route: '', fleet: '', plateNumber: '', driver: '',
    departTime: '', returnTime: '', passengerCount: 0, kilometers: 0, unit: '', phone: '', remark: '',
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [notifying, setNotifying] = useState(false)

  useEffect(() => {
    getFleets().then(r => setFleets(Array.isArray(r) ? r : [])).catch(() => setFleets([]))
    getDrivers().then(r => setDrivers(Array.isArray(r) ? r : [])).catch(() => setDrivers([]))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getCustomCharterSchedules({
        search: search || undefined, dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined, fleet: fleetFilter !== 'all' ? fleetFilter : undefined,
        page, pageSize,
      })
      setData(res.list || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (e: any) { showToast('加载失败: ' + (e?.message || '未知错误')); setData([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page, fleetFilter])
  useEffect(() => { const t = setTimeout(() => { setPage(1); fetchData() }, 400); return () => clearTimeout(t) }, [search, dateFrom, dateTo])

  const pagedData = data

  const toggleSelect = (id: number) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === pagedData.length && pagedData.length > 0 ? new Set() : new Set(pagedData.map(d => d.id)))

  // 批量确认排班
  const handleBatchConfirm = async () => {
    if (selectedIds.size === 0) { showToast('请先勾选排班记录'); return }
    const ids = Array.from(selectedIds)
    // 检查是否有未安排司机的
    const noDriver = pagedData.filter(d => ids.includes(d.id) && !d.driver)
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

  // 批量通知司机
  const handleBatchNotify = async () => {
    if (selectedIds.size === 0) { showToast('请先勾选排班记录'); return }
    const ids = Array.from(selectedIds)
    // 检查是否有未确认的
    const notConfirmed = pagedData.filter(d => ids.includes(d.id) && d.status !== '已确认')
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

  const openAddModal = () => {
    setEditMode('add'); setEditingItem(null); setShowModal(true)
    setEditForm({ date: new Date().toISOString().slice(0, 10), route: '', fleet: '', plateNumber: '', driver: '', departTime: '', returnTime: '', passengerCount: 0, kilometers: 0, unit: '', phone: '', remark: '' })
  }

  const openEditModal = (item: CustomCharterDispatchItem) => {
    setEditMode('edit'); setEditingItem(item); setShowModal(true)
    setEditForm({ date: item.date || '', route: item.route || '', fleet: item.fleet || '', plateNumber: item.plateNumber || '', driver: item.driver || '', departTime: item.departTime || '', returnTime: item.returnTime || '', passengerCount: item.passengerCount || 0, kilometers: item.kilometers || 0, unit: item.unit || '', phone: item.phone || '', remark: item.remark || '' })
  }

  const closeModal = () => { setShowModal(false); setEditingItem(null) }

  const handleSave = async () => {
    if (!editForm.route.trim()) { showToast('请输入路线'); return }
    if (!editForm.plateNumber.trim()) { showToast('请输入车牌号'); return }
    setSaving(true)
    try {
      const payload = { date: editForm.date, route: editForm.route, fleet: editForm.fleet, plateNumber: editForm.plateNumber, driver: editForm.driver, departTime: editForm.departTime, returnTime: editForm.returnTime, passengerCount: editForm.passengerCount, kilometers: editForm.kilometers, unit: editForm.unit, phone: editForm.phone, remark: editForm.remark }
      if (editMode === 'add') { await createCustomCharterSchedule(payload as any) }
      else if (editingItem) { await updateCustomCharterSchedule(editingItem.id, payload as any) }
      showToast(editMode === 'add' ? '添加成功' : '修改成功')
      setShowModal(false); setEditingItem(null); fetchData()
    } catch (e: any) { showToast('保存失败: ' + (e?.message || '未知错误')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (deletingId === null) return
    setDeleting(true)
    try { await deleteCustomCharterSchedule(deletingId); showToast('删除成功'); setDeletingId(null); fetchData() }
    catch (e: any) { showToast('删除失败: ' + (e?.message || '未知错误')) }
    finally { setDeleting(false) }
  }

  const handleDriverSelect = (driverId: string) => {
    if (!driverId) { setEditForm(f => ({ ...f, driver: '', plateNumber: '', phone: '', fleet: '' })); return }
    const d = drivers.find(dr => String(dr.id) === driverId)
    if (d) setEditForm(f => ({ ...f, driver: d.name || '', plateNumber: d.carPlate || d.vehiclePlate || f.plateNumber, phone: d.phone || '', fleet: d.fleetName || d.fleet || f.fleet }))
  }

  const statusColor: Record<string, string> = { '待确认': 'bg-violet-50 text-violet-600', '已确认': 'bg-blue-50 text-blue-600', '已派车': 'bg-amber-50 text-amber-600', '进行中': 'bg-emerald-50 text-emerald-600', '已完成': 'bg-slate-50 text-slate-600', '已取消': 'bg-red-50 text-red-600' }

  return (
    <div className="h-full flex flex-col">
      {toast && <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 bg-slate-800 text-white text-sm rounded-lg shadow-lg">{toast}</div>}

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索车牌、司机、路线..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <span className="text-slate-400 text-sm">至</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={fleetFilter} onChange={e => setFleetFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="all">全部车队</option>
          {fleets.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
        </select>
        <span className="text-sm text-slate-400"><Filter className="w-3.5 h-3.5 inline mr-1" />共 {total} 条记录</span>
        <div className="flex-1" />
        <Button size="sm" onClick={openAddModal} className="gap-1.5"><Plus className="w-4 h-4" />手动新增</Button>
      </div>

      {/* 批量操作 + 表格 */}
      {data.length > 0 && (
        <div className="flex items-center gap-3 mb-2 px-2 py-2 bg-slate-50/80 rounded-lg border border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={pagedData.length > 0 && selectedIds.size === pagedData.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
            <span className="text-sm text-slate-600">全选 <span className="text-slate-400">({selectedIds.size}/{data.length})</span></span>
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
              <th className="px-2 py-3 font-medium text-slate-600 w-8"><input type="checkbox" checked={pagedData.length > 0 && selectedIds.size === pagedData.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" /></th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">订单号</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">路线</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">车队</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">车牌</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">司机</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">出发时间</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">结束时间</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">载客</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">公里</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">状态</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">通知状态</th>
              <th className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="px-4 py-12 text-center text-slate-400">加载中...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-12 text-center text-slate-400">暂无调度数据</td></tr>
            ) : pagedData.map(item => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="px-2 py-3"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" /></td>
                <td className="px-3 py-3"><span className="text-slate-700 font-mono text-xs whitespace-nowrap">{item.orderNo || '-'}</span></td>
                <td className="px-3 py-3 text-slate-600"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate max-w-[160px]">{item.route || '-'}</span></div></td>
                <td className="px-3 py-3"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="text-slate-700 whitespace-nowrap">{item.fleet || '-'}</span></div></td>
                <td className="px-3 py-3"><div className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="text-slate-700 whitespace-nowrap">{item.plateNumber || '-'}</span></div></td>
                <td className="px-3 py-3"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="text-slate-700 whitespace-nowrap">{item.driver || '-'}</span></div></td>
                <td className="px-3 py-3"><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary shrink-0" /><span className="text-slate-700 whitespace-nowrap">{item.departTime || '-'}</span></div></td>
                <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{item.returnTime || '-'}</td>
                <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{item.passengerCount || 0}人</td>
                <td className="px-3 py-3"><div className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="text-slate-700 whitespace-nowrap">{item.kilometers || 0}km</span></div></td>
                <td className="px-3 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor[item.status] || 'bg-slate-50 text-slate-500'}`}>{item.status || '待确认'}</span></td>
                <td className="px-3 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${item.notifyStatus === '已通知' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{item.notifyStatus || '未通知'}</span></td>
                <td className="px-3 py-3"><div className="flex items-center gap-0.5">
                  <button onClick={() => openEditModal(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-orange-500 transition-colors" title="编辑"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeletingId(item.id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm text-slate-500">第 {page} 页，共 {totalPages} 页</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
              return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm ${p === page ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{p}</button>
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">{editMode === 'add' ? '添加调度车辆' : '编辑调度信息'}</h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-slate-100"><span className="text-slate-500 text-xl leading-none">&times;</span></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />用车日期</label><input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />出发时间</label><input type="time" value={editForm.departTime} onChange={e => setEditForm(f => ({ ...f, departTime: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />结束时间</label><input type="time" value={editForm.returnTime} onChange={e => setEditForm(f => ({ ...f, returnTime: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400" />路线 <span className="text-red-400">*</span></label><input type="text" value={editForm.route} onChange={e => setEditForm(f => ({ ...f, route: e.target.value }))} placeholder="例如：酒店→机场" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Car className="w-3.5 h-3.5 inline mr-1 text-slate-400" />车牌号 <span className="text-red-400">*</span></label><input type="text" value={editForm.plateNumber} onChange={e => setEditForm(f => ({ ...f, plateNumber: e.target.value }))} placeholder="例如：粤B12345" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />选择司机</label><select value={drivers.find(d => d.name === editForm.driver) ? String(drivers.find(d => d.name === editForm.driver)!.id) : ''} onChange={e => handleDriverSelect(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-white"><option value="">— 选择已有司机 —</option>{drivers.map(d => <option key={d.id} value={String(d.id)}>{d.name} — {d.carPlate || d.vehiclePlate || '无车牌'}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />司机姓名</label><input type="text" value={editForm.driver} onChange={e => setEditForm(f => ({ ...f, driver: e.target.value }))} placeholder="可手动填写或从上方选择" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400" />车队</label><select value={editForm.fleet} onChange={e => setEditForm(f => ({ ...f, fleet: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-white"><option value="">— 选择车队 —</option>{fleets.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />载客人数</label><input type="number" min="0" value={editForm.passengerCount} onChange={e => setEditForm(f => ({ ...f, passengerCount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Gauge className="w-3.5 h-3.5 inline mr-1 text-slate-400" />预计公里</label><input type="number" min="0" value={editForm.kilometers} onChange={e => setEditForm(f => ({ ...f, kilometers: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />联系电话</label><input type="text" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="司机手机号" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400" />预约单位</label><input type="text" value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="预约单位名称" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5"><FileText className="w-3.5 h-3.5 inline mr-1 text-slate-400" />备注</label><input type="text" value={editForm.remark} onChange={e => setEditForm(f => ({ ...f, remark: e.target.value }))} placeholder="备注信息" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" /></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={closeModal} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editMode === 'add' ? '添加' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeletingId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">确认删除</h3>
            <p className="text-sm text-slate-500 mb-6">确定要删除这条调度记录吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-1.5">{deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
