import { useState, useEffect } from 'react'
import { getCommuteDemands, getCustomDemands, updateDemand, type DemandItem, type DemandType } from '@/api/modules/admin'
import { Search, Phone, MapPin, Building2, FileText, MessageSquare, RefreshCw } from 'lucide-react'

const STATUS_OPTIONS = ['待处理', '已联系', '已成交', '已关闭']
const STATUS_COLORS: Record<string, string> = {
  '待处理': 'bg-amber-100 text-amber-700',
  '已联系': 'bg-blue-100 text-blue-700',
  '已成交': 'bg-emerald-100 text-emerald-700',
  '已关闭': 'bg-slate-100 text-slate-500',
}

export function DemandManagePage() {
  const [tab, setTab] = useState<DemandType>('commute')
  const [commuteList, setCommuteList] = useState<DemandItem[]>([])
  const [customList, setCustomList] = useState<DemandItem[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detailItem, setDetailItem] = useState<DemandItem | null>(null)
  const [editingNote, setEditingNote] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [commute, custom] = await Promise.all([
        getCommuteDemands().catch(() => [] as DemandItem[]),
        getCustomDemands().catch(() => [] as DemandItem[]),
      ])
      setCommuteList(commute as DemandItem[])
      setCustomList(custom as DemandItem[])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const list = tab === 'commute' ? commuteList : customList

  const filtered = list.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (search && !item.name.includes(search) && !item.phone.includes(search) && !item.city.includes(search) && !(item.company || '').includes(search) && !(item.demand || '').includes(search)) return false
    return true
  })

  const handleStatusChange = async (item: DemandItem, newStatus: string) => {
    // 乐观更新
    const updater = tab === 'commute' ? setCommuteList : setCustomList
    updater(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    try {
      await updateDemand(tab, item.id, { status: newStatus })
      showToast(`已更新为「${newStatus}」`)
    } catch {
      updater(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i))
      showToast('更新失败，请重试')
    }
  }

  const handleSaveNote = async () => {
    if (!detailItem) return
    const updater = tab === 'commute' ? setCommuteList : setCustomList
    const oldNote = detailItem.adminNote
    updater(prev => prev.map(i => i.id === detailItem.id ? { ...i, adminNote: editingNote } : i))
    setDetailItem(prev => prev ? { ...prev, adminNote: editingNote } : null)
    try {
      await updateDemand(tab, detailItem.id, { adminNote: editingNote })
      showToast('备注已保存')
    } catch {
      updater(prev => prev.map(i => i.id === detailItem.id ? { ...i, adminNote: oldNote } : i))
      setDetailItem(prev => prev ? { ...prev, adminNote: oldNote } : null)
      showToast('保存失败')
    }
  }

  const counts = {
    commute: { total: commuteList.length, pending: commuteList.filter(i => i.status === '待处理').length },
    custom: { total: customList.length, pending: customList.filter(i => i.status === '待处理').length },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">需求管理</h1>
          <p className="text-sm text-slate-500 mt-1">处理用户提交的上下班包车申请和定制包车需求</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTab('commute')}
          className={`rounded-2xl p-5 text-left transition-all duration-300 cursor-pointer border-2 ${tab === 'commute' ? 'border-primary bg-gradient-to-br from-indigo-50 to-white shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">上下班包车</div>
              <div className="text-xs text-slate-400 mt-0.5">企业通勤申请</div>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <span className="text-2xl font-bold text-slate-800">{counts.commute.total}</span>
            {counts.commute.pending > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {counts.commute.pending} 待处理
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setTab('custom')}
          className={`rounded-2xl p-5 text-left transition-all duration-300 cursor-pointer border-2 ${tab === 'custom' ? 'border-primary bg-gradient-to-br from-purple-50 to-white shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">定制包车</div>
              <div className="text-xs text-slate-400 mt-0.5">专属定制需求</div>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <span className="text-2xl font-bold text-slate-800">{counts.custom.total}</span>
            {counts.custom.pending > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {counts.custom.pending} 待处理
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 搜索 & 筛选 */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索姓名、手机号、城市..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="all">全部状态</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading && list.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />暂无需求数据
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(item => (
              <div
                key={item.id}
                onClick={() => { setDetailItem(item); setEditingNote(item.adminNote || '') }}
                className="px-5 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer flex items-center gap-4"
              >
                {/* 头像 */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-slate-500">{item.name.slice(0, 1)}</span>
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-500'}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.phone}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.city}</span>
                    {tab === 'commute' && item.company && (
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{item.company}</span>
                    )}
                  </div>
                  {tab === 'custom' && item.demand && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{item.demand}</p>
                  )}
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <select
                    value={item.status}
                    onChange={e => handleStatusChange(item, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-primary/50 cursor-pointer appearance-none pr-6"
                    style={{ backgroundImage: 'none' }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="text-xs text-slate-300">{item.createdAt?.slice(0, 10) || ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">需求详情</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detailItem.status] || ''}`}>
                {detailItem.status}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">姓名</span><span className="font-medium text-slate-700">{detailItem.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">手机</span><span className="font-medium text-slate-700">{detailItem.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">城市</span><span className="font-medium text-slate-700">{detailItem.city}</span></div>
              {tab === 'commute' && detailItem.company && (
                <div className="flex justify-between"><span className="text-slate-400">企业</span><span className="font-medium text-slate-700">{detailItem.company}</span></div>
              )}
              {tab === 'custom' && detailItem.demand && (
                <div>
                  <span className="text-slate-400">用车需求</span>
                  <p className="mt-1 text-slate-700 bg-slate-50 rounded-lg p-3">{detailItem.demand}</p>
                </div>
              )}
              <div className="flex justify-between"><span className="text-slate-400">提交时间</span><span className="text-slate-600">{detailItem.createdAt}</span></div>
            </div>

            {/* 状态操作 */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">更新状态</span>
              <div className="flex gap-2 mt-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(detailItem, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      detailItem.status === s
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 管理员备注 */}
            <div className="mt-4">
              <span className="text-xs text-slate-400">管理员备注</span>
              <textarea
                value={editingNote}
                onChange={e => setEditingNote(e.target.value)}
                placeholder="添加处理备注..."
                rows={3}
                className="w-full mt-1.5 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary/50 resize-none"
              />
              <button
                onClick={handleSaveNote}
                className="mt-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
              >
                保存备注
              </button>
            </div>

            <button
              onClick={() => setDetailItem(null)}
              className="w-full mt-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl shadow-lg animate-bounce">
          {toast}
        </div>
      )}
    </div>
  )
}

export default DemandManagePage
