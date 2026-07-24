import { useState, useEffect } from 'react'
import { getDrivers, createDriver, updateDriver, deleteDriver, auditDriver, getVehicles, getOrganizations } from '@/api/modules/admin'
import type { AdminDriverItem, OrgItem } from '@/api/modules/admin'
import { Search, User, Star, Check, X, Eye, Pencil, Trash2, Car, Building2, ChevronDown } from 'lucide-react'

interface FormData {
  name: string; phone: string; licenseNo: string; city: string; carId: number | null; corpUserId: string
}

const emptyForm: FormData = { name: '', phone: '', licenseNo: '', city: '', carId: null, corpUserId: '' }

export function DriverManagePage() {
  const [drivers, setDrivers] = useState<AdminDriverItem[]>([])
  const [vehicles, setVehicles] = useState<{ id: number; name: string; plate?: string; model: string; seats: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [organizations, setOrganizations] = useState<OrgItem[]>([])
  const [selectedDriver, setSelectedDriver] = useState<AdminDriverItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // 加载数据
  const loadData = async () => {
    try {
      const [dList, vList, orgList] = await Promise.all([getDrivers(), getVehicles(), getOrganizations()])
      setDrivers(dList as any)
      setVehicles((vList as any).map((v: any) => ({
        id: v.id, name: v.name, plate: v.plate, model: v.model, seats: v.seats, status: v.status,
      })))
      setOrganizations(orgList as any)
    } catch (_) { /* fallback */ } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  // 可选的车辆：排除已绑定其他司机的车辆（编辑时保留当前司机的车）
  const assignedCarIds = drivers
    .filter(d => d.carId && d.id !== editingId)
    .map(d => d.carId as number)
  const availableVehicles = vehicles.filter(v => !assignedCarIds.includes(v.id))

  // 打开新增弹窗
  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  // 打开编辑弹窗
  const openEdit = (d: AdminDriverItem) => {
    setEditingId(d.id)
    setForm({ name: d.name, phone: d.phone, licenseNo: d.licenseNo, city: d.city, carId: d.carId ?? null, corpUserId: d.corpUserId || '' })
    setShowForm(true)
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.licenseNo) {
      showToast('请填写姓名、手机号和驾驶证号')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await updateDriver(editingId, form)
        showToast('司机信息已更新')
      } else {
        await createDriver(form)
        showToast('司机添加成功')
      }
      setShowForm(false)
      await loadData()
    } catch (_) {
      showToast('操作失败，请重试')
    } finally { setSubmitting(false) }
  }

  // 审核司机
  const handleAudit = async (id: string, approved: boolean) => {
    try {
      await auditDriver(id, approved)
      showToast(approved ? '已通过审核' : '已拒绝申请')
      await loadData()
    } catch (_) { showToast('操作失败') }
  }

  // 删除司机
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该司机吗？')) return
    try {
      await deleteDriver(id)
      showToast('司机已删除')
      await loadData()
    } catch (_) { showToast('删除失败') }
  }

  const filtered = drivers.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (orgFilter !== 'all') {
      if (orgFilter === 'none') { if (d.orgId) return false }
      else if (d.orgId !== orgFilter) return false
    }
    if (search && !d.name.includes(search) && !d.phone.includes(search) && !d.vehiclePlate.includes(search)) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">司机管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理平台司机，添加司机并为其绑定车辆</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <User className="w-4 h-4" />添加司机
        </button>
      </div>

      {/* 搜索 & 筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="搜索司机姓名、电话、车牌..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {/* 关联组织筛选 */}
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
            className="appearance-none w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
          >
            <option value="all">全部组织</option>
            <option value="none">未关联组织</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'online', label: '在线' },
            { key: 'busy', label: '出车中' },
            { key: 'offline', label: '离线' },
            { key: 'pending', label: '待审核' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.key ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-5 font-medium">司机</th>
                <th className="py-3 px-5 font-medium">驾驶证</th>
                <th className="py-3 px-5 font-medium">绑定车辆</th>
                <th className="py-3 px-5 font-medium">城市</th>
                <th className="py-3 px-5 font-medium">关联组织</th>
                <th className="py-3 px-5 font-medium">评分</th>
                <th className="py-3 px-5 font-medium">完成订单</th>
                <th className="py-3 px-5 font-medium">加入时间</th>
                <th className="py-3 px-5 font-medium">状态</th>
                <th className="py-3 px-5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">{d.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{d.name}</p>
                        <p className="text-xs text-slate-400">{d.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-sm text-slate-500 font-mono">{d.licenseNo}</td>
                  <td className="py-3 px-5">
                    {d.carId || d.vehiclePlate ? (
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-primary/60" />
                        <div>
                          <p className="text-sm text-slate-600">{d.carPlate || d.vehiclePlate}</p>
                          <p className="text-xs text-slate-400">{d.carModelName || d.vehicleType}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">未绑定车辆</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-sm text-slate-500">{d.city}</td>
                  <td className="py-3 px-5 text-sm text-slate-500">{d.orgName || '-'}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-slate-700">{d.rating}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-sm text-slate-600">{d.orderCount.toLocaleString()}</td>
                  <td className="py-3 px-5 text-sm text-slate-400">{d.joinDate}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      d.status === 'online' ? 'bg-emerald-50 text-emerald-600' :
                      d.status === 'busy' ? 'bg-orange-50 text-orange-600' :
                      d.status === 'offline' ? 'bg-slate-100 text-slate-500' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {d.status === 'online' ? '在线' : d.status === 'busy' ? '出车中' : d.status === 'offline' ? '离线' : '待审核'}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1">
                      {d.status === 'pending' && (
                        <>
                          <button onClick={() => handleAudit(d.id, true)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600" title="通过">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleAudit(d.id, false)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="拒绝">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="编辑">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSelectedDriver(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">{loading ? '加载中...' : '暂无司机数据'}</div>
        )}
      </div>

      {/* 添加/编辑司机弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">{editingId ? '编辑司机' : '添加司机'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 姓名 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">姓名 <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="司机姓名" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">手机号 <span className="text-red-400">*</span></label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="手机号码" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              {/* 驾驶证号 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">驾驶证号 <span className="text-red-400">*</span></label>
                <input type="text" value={form.licenseNo} onChange={e => setForm({ ...form, licenseNo: e.target.value })}
                  placeholder="驾驶证号" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              {/* 企业微信账号 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">企业微信账号</label>
                <input type="text" value={form.corpUserId} onChange={e => setForm({ ...form, corpUserId: e.target.value })}
                  placeholder="司机企业微信 UserID（用于排班通知推送）" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <p className="text-xs text-slate-400 mt-1">在企微管理后台 → 通讯录 → 成员详情中可查看账号</p>
              </div>

              {/* 服务城市 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">服务城市</label>
                <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="如：广州" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              {/* 绑定车辆 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  绑定车辆
                  <span className="text-xs text-slate-400 ml-1">（一辆车仅限绑定一位司机）</span>
                </label>
                <select
                  value={form.carId ?? ''}
                  onChange={e => setForm({ ...form, carId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">暂不绑定车辆</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plate || v.name} · {v.model} {v.seats}座
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">暂无可分配的车辆，请先在"车辆管理"中添加车辆</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors">
                取消
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {submitting ? '提交中...' : (editingId ? '保存修改' : '添加司机')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 司机详情弹窗 */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedDriver(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">司机详情</h3>
              <button onClick={() => setSelectedDriver(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold text-2xl">{selectedDriver.name[0]}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedDriver.name}</h3>
                  <p className="text-sm text-slate-500">{selectedDriver.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">驾驶证号</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedDriver.licenseNo}</p>
                </div>
                <div>
                  <span className="text-slate-400">企业微信</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedDriver.corpUserId || <span className="text-slate-400">未绑定</span>}</p>
                </div>
                <div>
                  <span className="text-slate-400">绑定车辆</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedDriver.carId ? `${selectedDriver.carPlate || selectedDriver.vehiclePlate} (${selectedDriver.carModelName || selectedDriver.vehicleType})` : '未绑定'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">服务城市</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedDriver.city}</p>
                </div>
                <div>
                  <span className="text-slate-400">评分</span>
                  <p className="font-medium text-slate-800 mt-0.5">★ {selectedDriver.rating}</p>
                </div>
                <div>
                  <span className="text-slate-400">完成订单</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedDriver.orderCount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">加入时间</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedDriver.joinDate}</p>
                </div>
                <div>
                  <span className="text-slate-400">状态</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedDriver.status === 'online' ? '在线' : selectedDriver.status === 'busy' ? '出车中' : selectedDriver.status === 'offline' ? '离线' : '待审核'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100">
              <button onClick={() => setSelectedDriver(null)} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg animate-pulse">{toast}</div>}
    </div>
  )
}

export default DriverManagePage
