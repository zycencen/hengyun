import { useState, useEffect } from 'react'
import { getFinance, getAdminInvoices, updateInvoiceStatus } from '@/api/modules/admin'
import type { AdminInvoiceItem } from '@/api/modules/admin'
import {
  DollarSign, TrendingUp, TrendingDown,
  Download, Search, ArrowUp, ArrowDown
} from 'lucide-react'

const INVOICE_STATUS_FLOW: Record<string, { next: string; label: string }> = {
  '申请中': { next: '已申请', label: '设为已申请' },
  '已申请': { next: '开票中', label: '设为开票中' },
  '开票中': { next: '已开票', label: '设为已开票' },
  '已开票': { next: '', label: '已完成' },
}

const STATUS_STYLE: Record<string, string> = {
  '申请中': 'bg-orange-50 text-orange-600',
  '已申请': 'bg-amber-50 text-amber-600',
  '开票中': 'bg-blue-50 text-blue-600',
  '已开票': 'bg-emerald-50 text-emerald-600',
}

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview')
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  // 发票管理状态
  const [invoices, setInvoices] = useState<AdminInvoiceItem[]>([])
  const [invSearch, setInvSearch] = useState('')
  const [invStatus, setInvStatus] = useState('all')
  const [invType, setInvType] = useState('all')
  const [invLoading, setInvLoading] = useState(false)

  const loadInvoices = async () => {
    setInvLoading(true)
    try {
      const data = await getAdminInvoices({
        search: invSearch || undefined,
        status: invStatus !== 'all' ? invStatus : undefined,
        invoiceType: invType !== 'all' ? invType : undefined,
      })
      setInvoices(data)
    } catch { /* 网络错误时保留现有数据 */ }
    finally { setInvLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices()
  }, [activeTab, invSearch, invStatus, invType])

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateInvoiceStatus(id, newStatus)
      showToast(`发票状态已更新为「${newStatus}」`)
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv))
    } catch {
      showToast('状态更新失败')
    }
  }

  const MOCK_FINANCE = {
    totalRevenue: 486000,
    totalOrders: 820,
    avgOrderValue: 592,
    refundAmount: 3200,
    refundCount: 8,
    revenueByCity: [
      { city: '广州', amount: 186000, percent: 38 },
      { city: '深圳', amount: 142000, percent: 29 },
      { city: '东莞', amount: 58000, percent: 12 },
      { city: '佛山', amount: 42000, percent: 9 },
      { city: '珠海', amount: 35000, percent: 7 },
      { city: '其他', amount: 23000, percent: 5 },
    ],
    monthlyTrend: [
      { month: '1月', revenue: 320000, orders: 580 },
      { month: '2月', revenue: 280000, orders: 490 },
      { month: '3月', revenue: 350000, orders: 620 },
      { month: '4月', revenue: 420000, orders: 710 },
      { month: '5月', revenue: 450000, orders: 780 },
      { month: '6月', revenue: 486000, orders: 820 },
    ],
  }

  const [monthlyData, setMonthlyData] = useState(MOCK_FINANCE)

  useEffect(() => {
    getFinance().then(data => {
      setMonthlyData(prev => ({ ...prev, totalRevenue: data.monthRevenue, totalOrders: data.monthOrders }))
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">财务管理</h1>
          <p className="text-sm text-slate-500 mt-1">营收统计、发票管理、财务报表</p>
        </div>
        <button onClick={() => showToast('报表已生成，请到下载目录查看')} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" />导出报表
        </button>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'overview' as const, label: '营收概览' },
          { key: 'invoices' as const, label: '发票管理' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: '本月营收', value: `¥${monthlyData.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', change: '+8.2%', up: true },
              { label: '订单总数', value: monthlyData.totalOrders, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', change: '+5.1%', up: true },
              { label: '客单价', value: `¥${monthlyData.avgOrderValue}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', change: '+2.3%', up: true },
              { label: '退款金额', value: `¥${monthlyData.refundAmount.toLocaleString()}`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', change: `${monthlyData.refundCount}笔`, up: false },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{item.value}</p>
                  </div>
                  <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                </div>
                <div className={`flex items-center gap-1 mt-3 text-xs ${item.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {item.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {item.change}
                  <span className="text-slate-400 ml-1">较上月</span>
                </div>
              </div>
            ))}
          </div>

          {/* 月度趋势 + 城市分布 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 月度营收趋势 */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">月度营收趋势</h3>
              <div className="h-48 flex items-end gap-4 px-2">
                {monthlyData.monthlyTrend.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-500">¥{(item.revenue / 10000).toFixed(1)}w</span>
                    <div
                      className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-t-md transition-all"
                      style={{ height: `${(item.revenue / 500000) * 100}%` }}
                    />
                    <span className="text-xs text-slate-400">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 城市营收分布 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">城市营收分布</h3>
              <div className="space-y-3">
                {monthlyData.revenueByCity.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.city}</span>
                      <span className="text-slate-500">¥{(item.amount / 10000).toFixed(1)}w · {item.percent}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 订单量趋势 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">月度订单量</h3>
            <div className="h-40 flex items-end gap-4 px-2">
              {monthlyData.monthlyTrend.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{item.orders}</span>
                  <div
                    className="w-full bg-gradient-to-t from-accent/20 to-accent rounded-t-md transition-all"
                    style={{ height: `${(item.orders / 900) * 100}%` }}
                  />
                  <span className="text-xs text-slate-400">{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 发票管理 */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">发票列表</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" placeholder="搜索抬头/订单号/税号..."
                  value={invSearch}
                  onChange={e => setInvSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-52"
                />
              </div>
              <select
                value={invType}
                onChange={e => setInvType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">全部类型</option>
                <option value="个人">个人发票</option>
                <option value="企业">企业发票</option>
              </select>
              <select
                value={invStatus}
                onChange={e => setInvStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">全部状态</option>
                <option value="申请中">申请中</option>
                <option value="已申请">已申请</option>
                <option value="开票中">开票中</option>
                <option value="已开票">已开票</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-5 font-medium">编号</th>
                  <th className="py-3 px-5 font-medium">关联订单</th>
                  <th className="py-3 px-5 font-medium">抬头</th>
                  <th className="py-3 px-5 font-medium">类型</th>
                  <th className="py-3 px-5 font-medium">税号</th>
                  <th className="py-3 px-5 font-medium">金额</th>
                  <th className="py-3 px-5 font-medium">申请人</th>
                  <th className="py-3 px-5 font-medium">邮箱</th>
                  <th className="py-3 px-5 font-medium">申请时间</th>
                  <th className="py-3 px-5 font-medium">状态</th>
                  <th className="py-3 px-5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {invLoading ? (
                  <tr><td colSpan={11} className="py-16 text-center text-sm text-slate-400">加载中...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={11} className="py-16 text-center text-sm text-slate-400">暂无发票记录</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="py-3 px-5 text-sm font-mono text-primary">INV-{String(inv.id).padStart(6, '0')}</td>
                      <td className="py-3 px-5 text-sm text-slate-600 max-w-[180px] truncate" title={inv.orderNos.join(', ')}>
                        {inv.orderNos.length > 1
                          ? <span>合并 {inv.orderNos.length} 笔<span className="text-xs text-slate-400 block truncate">{inv.orderNos.join(', ')}</span></span>
                          : inv.orderNos[0]
                        }
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-700 font-medium">{inv.title}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${inv.invoiceType === '企业' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                          {inv.invoiceType}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-500 font-mono">
                        {inv.invoiceType === '企业' ? (inv.taxId || <span className="text-amber-500 text-xs">未填写</span>) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-5 text-sm font-semibold text-slate-700">¥{inv.amount}</td>
                      <td className="py-3 px-5 text-sm text-slate-500">{inv.customerName || '-'}</td>
                      <td className="py-3 px-5 text-sm text-slate-400">{inv.email || '-'}</td>
                      <td className="py-3 px-5 text-sm text-slate-400">{inv.appliedAt || '-'}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[inv.status] || 'bg-slate-50 text-slate-500'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        {INVOICE_STATUS_FLOW[inv.status]?.next ? (
                          <button
                            onClick={() => handleStatusChange(inv.id, INVOICE_STATUS_FLOW[inv.status].next)}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            {INVOICE_STATUS_FLOW[inv.status].label}
                          </button>
                        ) : (
                          <button onClick={() => showToast(`发票 INV-${String(inv.id).padStart(6, '0')} 下载中...`)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary">
                            <Download className="w-3 h-3" />下载
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg">{toast}</div>}
    </div>
  )
}
 
export default FinancePage
