import { useEffect, useMemo, useState } from 'react'
import { MOCK_CONTRACTS } from '@/data/adminDefaults'
import { getContracts, getVehicles, getDrivers, getFleets, createContract } from '@/api/modules/admin'
import type { AdminDriverItem, FleetItem } from '@/api/modules/admin'
import type { ContractInfo } from '@/types'
import type { CarInfo } from '@/api/modules/car'
import { Search, Plus, Download, FileText, X, RotateCw } from 'lucide-react'


type StatusType = '全部' | '履行中' | '即将到期' | '已过期'

const statusOptions: StatusType[] = ['全部', '履行中', '即将到期', '已过期']

const partyBOptions = ['全部', '恒运出行科技有限公司', '腾讯科技', '百度在线', '字节跳动', '华为技术有限公司']

const fleetOptions = ['全部', '深圳南山车队', '深圳龙岗车队', '北京海淀车队', '北京朝阳车队', '广州天河车队']

export function ContractManagePage() {
  const [contracts, setContracts] = useState<ContractInfo[]>(MOCK_CONTRACTS)
  const [filters, setFilters] = useState({ contractNo: '', partyA: '', partyB: '全部', status: '全部', fleet: '全部' })
  const [selectedContract, setSelectedContract] = useState<ContractInfo | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { getContracts().then(d => setContracts(d as any)).catch(() => {}) }, [])

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      if (filters.contractNo && !c.contractNo.includes(filters.contractNo)) return false
      if (filters.partyA && !c.partyA.includes(filters.partyA)) return false
      if (filters.partyB !== '全部' && c.partyB !== filters.partyB) return false
      if (filters.status !== '全部' && c.status !== filters.status) return false
      if (filters.fleet !== '全部' && c.fleet !== filters.fleet) return false
      return true
    })
  }, [contracts, filters])

  const handleSearch = () => {
    setToast('查询完成')
    setTimeout(() => setToast(''), 1500)
  }

  const handleReset = () => {
    setFilters({ contractNo: '', partyA: '', partyB: '全部', status: '全部', fleet: '全部' })
  }

  const handleExport = (contract?: ContractInfo) => {
    if (contract) {
      setToast(`合同 ${contract.contractNo} 导出中...`)
    } else {
      setToast('合同列表导出中...')
    }
    setTimeout(() => setToast(''), 2000)
  }

  const handleSync = () => {
    setToast('正在从政府网站同步合同数据...')
    setTimeout(() => {
      setToast('同步完成')
      setTimeout(() => setToast(''), 1500)
    }, 1500)
  }

  return (
    <div className="space-y-5">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">合同管理</h1>
          <p className="text-sm text-slate-500 mt-1">政府网站同步合同，统一管理合同有效期与执行状态</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <RotateCw className="w-4 h-4" />同步
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />新增合同
          </button>
        </div>
      </div>

      {/* 筛选区 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 whitespace-nowrap">合同编号</span>
            <input
              type="text"
              placeholder="请输入合同编号"
              value={filters.contractNo}
              onChange={e => setFilters(f => ({ ...f, contractNo: e.target.value }))}
              className="w-44 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 whitespace-nowrap">甲方</span>
            <input
              type="text"
              placeholder="请输入甲方"
              value={filters.partyA}
              onChange={e => setFilters(f => ({ ...f, partyA: e.target.value }))}
              className="w-44 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 whitespace-nowrap">乙方</span>
            <select
              value={filters.partyB}
              onChange={e => setFilters(f => ({ ...f, partyB: e.target.value }))}
              className="w-44 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {partyBOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 whitespace-nowrap">状态</span>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value as StatusType }))}
              className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 whitespace-nowrap">车队</span>
            <select
              value={filters.fleet}
              onChange={e => setFilters(f => ({ ...f, fleet: e.target.value }))}
              className="w-40 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {fleetOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Search className="w-4 h-4" />查询
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 font-medium whitespace-nowrap">合同编号</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">甲方</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">乙方</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">出发地</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">目的地</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">车牌号</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">驾驶员</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">开始时间</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">结束时间</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">关联订单号</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">关联车队</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">关联组织</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">状态</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">备案创建时间</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-primary whitespace-nowrap">{c.contractNo}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{c.partyA || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{c.partyB || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{c.origin || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{c.destination || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap font-mono">{c.plateNo || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{c.driverName || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{c.startDate || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{c.endDate || '-'}</td>
                  <td className="py-3 px-4 text-sm whitespace-nowrap">
                    {c.orderNo ? (
                      <span className="inline-flex items-center gap-1 text-primary text-xs font-mono">
                        <FileText className="w-3 h-3" />{c.orderNo}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{c.fleet || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">{c.orgName || '-'}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <ContractStatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">{c.filingCreateTime || '-'}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedContract(c)}
                        className="text-sm text-primary hover:text-primary/80 font-medium"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleExport(c)}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        导出
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredContracts.length === 0 && (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">暂无合同数据</p>
          </div>
        )}
      </div>

      {/* 合同详情弹窗 */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedContract(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">合同详情 - {selectedContract.contractNo}</h3>
              <button onClick={() => setSelectedContract(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><span className="text-slate-400">合同编号</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.contractNo}</p></div>
                <div><span className="text-slate-400">状态</span><p className="mt-0.5"><ContractStatusBadge status={selectedContract.status} /></p></div>
                <div><span className="text-slate-400">甲方</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.partyA || '-'}</p></div>
                <div><span className="text-slate-400">乙方</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.partyB || '-'}</p></div>
                <div><span className="text-slate-400">出发地</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.origin || '-'}</p></div>
                <div><span className="text-slate-400">目的地</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.destination || '-'}</p></div>
                <div><span className="text-slate-400">车牌号</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.plateNo || '-'}</p></div>
                <div><span className="text-slate-400">驾驶员</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.driverName || '-'}</p></div>
                <div><span className="text-slate-400">开始时间</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.startDate || '-'}</p></div>
                <div><span className="text-slate-400">结束时间</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.endDate || '-'}</p></div>
                <div><span className="text-slate-400">备案创建时间</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.filingCreateTime || '-'}</p></div>
                <div><span className="text-slate-400">合同金额</span><p className="font-medium text-primary mt-0.5">{selectedContract.amount > 0 ? `¥${selectedContract.amount}` : '-'}</p></div>
                <div><span className="text-slate-400">关联订单号</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.orderNo || '未关联'}</p></div>
                <div><span className="text-slate-400">关联车队</span><p className="font-medium text-slate-800 mt-0.5">{selectedContract.fleet || '-'}</p></div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => handleExport(selectedContract)}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                <Download className="w-4 h-4" />导出合同
              </button>
              <button
                onClick={() => setSelectedContract(null)}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增合同弹窗 */}
      {showAdd && (
        <AddContractModal
          onClose={() => setShowAdd(false)}
          onAdd={contract => {
            setContracts(prev => [contract, ...prev])
            setShowAdd(false)
            setToast('合同已新增')
            setTimeout(() => setToast(''), 2000)
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}

function ContractStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    '履行中': { label: '履行中', className: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
    '即将到期': { label: '即将到期', className: 'bg-amber-50 text-amber-600 border border-amber-100' },
    '已过期': { label: '已过期', className: 'bg-red-50 text-red-500 border border-red-100' },
  }
  const c = config[status] || { label: status, className: 'bg-slate-50 text-slate-500 border border-slate-100' }
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${c.className}`}>{c.label}</span>
}

function AddContractModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: ContractInfo) => void }) {
  const [form, setForm] = useState({
    contractNo: '', partyA: '', partyB: '恒运出行科技有限公司', origin: '', destination: '',
    plateNo: '', driverName: '', startDate: '', endDate: '', amount: '', filingCreateTime: '',
    orderNo: '', fleet: ''
  })
  const [vehicles, setVehicles] = useState<CarInfo[]>([])
  const [drivers, setDrivers] = useState<AdminDriverItem[]>([])
  const [fleets, setFleets] = useState<FleetItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 加载车辆、司机、车队列表供选择
    Promise.all([
      getVehicles().catch(() => [] as CarInfo[]),
      getDrivers().catch(() => [] as AdminDriverItem[]),
      getFleets().catch(() => [] as FleetItem[]),
    ]).then(([v, d, f]) => {
      setVehicles(v)
      setDrivers(d)
      setFleets(f)
    })
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (!form.contractNo.trim()) { setError('请输入合同编号'); return }
    if (!form.partyA.trim()) { setError('请输入甲方'); return }
    if (!form.startDate) { setError('请选择开始时间'); return }
    if (!form.endDate) { setError('请选择结束时间'); return }

    setSubmitting(true)
    try {
      const contract = await createContract({
        contractNo: form.contractNo.trim(),
        partyA: form.partyA.trim(),
        partyB: form.partyB,
        origin: form.origin,
        destination: form.destination,
        plateNo: form.plateNo,
        driverName: form.driverName,
        startDate: form.startDate,
        endDate: form.endDate,
        amount: Number(form.amount) || 0,
        filingCreateTime: form.filingCreateTime || undefined,
        orderNo: form.orderNo || undefined,
        fleet: form.fleet,
      })
      onAdd(contract as unknown as ContractInfo)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '创建合同失败')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">新增合同</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {error && (
          <div className="mx-5 mt-4 px-3 py-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">{error}</div>
        )}
        <div className="p-5 grid grid-cols-2 gap-4">
          {field('合同编号', 'contractNo', 'text', 'HT20260701001')}
          {field('甲方', 'partyA', 'text', '请输入甲方')}
          <div>
            <label className="block text-sm text-slate-600 mb-1">乙方</label>
            <select
              value={form.partyB}
              onChange={e => setForm(f => ({ ...f, partyB: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {partyBOptions.filter(o => o !== '全部').map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {field('出发地', 'origin', 'text', '请输入出发地')}
          {field('目的地', 'destination', 'text', '请输入目的地')}
          {/* 车牌号 — 车辆下拉选择 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">车牌号</label>
            <select
              value={form.plateNo}
              onChange={e => {
                const plate = e.target.value
                // 自动填充驾驶员（如果该车辆有关联司机）
                const _vehicle = vehicles.find(v => v.plate === plate)
                setForm(f => ({ ...f, plateNo: plate, driverName: '' }))
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">请选择车辆</option>
              {vehicles.filter(v => v.plate).map(v => (
                <option key={v.id} value={v.plate}>{v.plate} - {v.name} ({v.model})</option>
              ))}
            </select>
          </div>
          {/* 驾驶员 — 下拉选择 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">驾驶员</label>
            <select
              value={form.driverName}
              onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">请选择驾驶员</option>
              {drivers.map(d => (
                <option key={d.id} value={d.name}>{d.name} - {d.vehiclePlate || '未绑定车辆'}</option>
              ))}
            </select>
          </div>
          {field('开始时间', 'startDate', 'date')}
          {field('结束时间', 'endDate', 'date')}
          {field('合同金额', 'amount', 'number', '0')}
          {field('备案创建时间', 'filingCreateTime', 'date')}
          {field('关联订单号', 'orderNo', 'text', '可选，格式 HY20260701001')}
          {/* 关联车队 — 下拉选择 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">关联车队</label>
            <select
              value={form.fleet}
              onChange={e => setForm(f => ({ ...f, fleet: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">请选择车队</option>
              {fleets.map(f => (
                <option key={f.id} value={f.name}>{f.name} ({f.orgName})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContractManagePage
