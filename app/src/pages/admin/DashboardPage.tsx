import { useState, useEffect } from 'react'
import { MOCK_DASHBOARD } from '@/data/adminDefaults'
import { getDashboard, type DashboardData } from '@/api/modules/admin'
import {
  TrendingUp, DollarSign, Users, ClipboardList,
  ArrowUp, ArrowDown, Car
} from 'lucide-react'

interface DashboardPageProps {
  onNavigate?: (key: string) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [d, setD] = useState<DashboardData>(MOCK_DASHBOARD)

  useEffect(() => {
    getDashboard().then(setD).catch(() => {})
  }, [])
  const maxRevenue = Math.max(...d.revenueTrend.map(r => r.amount))
  const maxOrder = Math.max(...d.orderTrend.map(r => r.count))

  const statCards = [
    { label: '今日订单', value: d.todayOrders, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', change: '+12%', up: true },
    { label: '今日营收', value: `¥${d.todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', change: '+8.5%', up: true },
    { label: '在线司机', value: `${d.onlineDrivers}/${d.totalDrivers}`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', change: '83%在线率', up: true },
    { label: '待处理订单', value: d.pendingOrders, icon: Car, color: 'text-accent', bg: 'bg-orange-50', change: '需及时处理', up: false },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-sm text-slate-500 mt-1">欢迎回来，这是今天的运营数据概览</p>
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className={`flex items-center gap-1 mt-3 text-xs ${card.up ? 'text-emerald-600' : 'text-slate-500'}`}>
              {card.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* 图表 + 最近订单 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 营收趋势 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">营收趋势（近7天）</h3>
            <div className="flex items-center gap-1 text-sm text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              ¥{d.monthlyRevenue.toLocaleString()} (本月)
            </div>
          </div>
          <div className="h-48 flex items-end gap-3 px-2">
            {d.revenueTrend.map((item, i) => (
              <div key={i} className="flex-1 h-full flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500 shrink-0">¥{(item.amount / 1000).toFixed(1)}k</span>
                <div className="w-full flex-1 relative min-h-0">
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-primary-200 to-primary-600 rounded-t-md transition-all"
                    style={{ height: `${(item.amount / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 shrink-0">{item.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 订单趋势 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">订单趋势（近7天）</h3>
          <div className="h-48 flex items-end gap-2 px-2">
            {d.orderTrend.map((item, i) => (
              <div key={i} className="flex-1 h-full flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500 shrink-0">{item.count}</span>
                <div className="w-full flex-1 relative min-h-0">
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-accent-200 to-accent-500 rounded-t-md transition-all"
                    style={{ height: `${(item.count / maxOrder) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 shrink-0">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近订单列表 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">最近订单</h3>
          <span onClick={() => onNavigate?.('orders')} className="text-sm text-primary cursor-pointer hover:underline">查看全部</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="py-3 px-5 font-medium">订单号</th>
                <th className="py-3 px-5 font-medium">客户</th>
                <th className="py-3 px-5 font-medium">路线</th>
                <th className="py-3 px-5 font-medium">关联组织</th>
                <th className="py-3 px-5 font-medium">金额</th>
                <th className="py-3 px-5 font-medium">状态</th>
                <th className="py-3 px-5 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {d.recentOrders.map((order, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-5 text-sm font-medium text-slate-700">{order.orderNo}</td>
                  <td className="py-3 px-5 text-sm text-slate-600">{order.customer}</td>
                  <td className="py-3 px-5 text-sm text-slate-600">{order.route}</td>
                  <td className="py-3 px-5 text-sm text-slate-500">{order.orgName || '-'}</td>
                  <td className="py-3 px-5 text-sm font-medium text-slate-700">¥{order.amount}</td>
                  <td className="py-3 px-5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-5 text-sm text-slate-400">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    'pending': { label: '待付款', className: 'bg-orange-50 text-orange-600' },
    '待付款': { label: '待付款', className: 'bg-orange-50 text-orange-600' },
    '待接单': { label: '待接单', className: 'bg-orange-50 text-orange-600' },
    '待派车': { label: '待派车', className: 'bg-blue-50 text-blue-600' },
    'accepted': { label: '待派车', className: 'bg-blue-50 text-blue-600' },
    'dispatched': { label: '进行中', className: 'bg-indigo-50 text-indigo-600' },
    'in-progress': { label: '进行中', className: 'bg-indigo-50 text-indigo-600' },
    'completed': { label: '已完成', className: 'bg-emerald-50 text-emerald-600' },
    'cancelled': { label: '已取消', className: 'bg-slate-100 text-slate-500' },
    '已取消': { label: '已取消', className: 'bg-slate-100 text-slate-500' },
    '已关闭': { label: '已关闭', className: 'bg-slate-50 text-slate-400' },
  }
  const c = config[status] || { label: status, className: 'bg-slate-50 text-slate-500' }
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${c.className}`}>{c.label}</span>
}

 
export default DashboardPage
