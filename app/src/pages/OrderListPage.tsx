import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useOrders } from '@/hooks'
import { useAppContext, useNavigation } from '@/store'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { ORDER_STATUS_MAP } from '@/types'
import type { OrderStatus } from '@/types'
import { Clock, CheckCircle2, Car, Navigation, FileCheck, Ban } from 'lucide-react'


export default function OrderListPage() {
  const { state, dispatch } = useAppContext()
  const { navigateTo, goBack } = useNavigation()
  const { orders, filter, setFilter, loading } = useOrders(state.orderFilter)

  const statusIconMap: Record<string, React.ReactNode> = {
    '待付款': <Clock className="w-4 h-4" />,
    '待接单': <Clock className="w-4 h-4" />,
    '待派车': <Car className="w-4 h-4" />,
    '进行中': <Navigation className="w-4 h-4" />,
    '已完成': <CheckCircle2 className="w-4 h-4" />,
    '已取消': <Ban className="w-4 h-4" />,
    '已关闭': <Ban className="w-4 h-4" />,
  }

  const statusBgMap: Record<string, string> = {
    '待付款': 'bg-amber-50 text-amber-600',
    '待接单': 'bg-orange-50 text-orange-600',
    '待派车': 'bg-blue-50 text-blue-600',
    '进行中': 'bg-indigo-50 text-indigo-600',
    '已完成': 'bg-emerald-50 text-emerald-600',
    '已取消': 'bg-slate-100 text-slate-500',
    '已关闭': 'bg-slate-50 text-slate-400',
  }

  const statusBorderMap: Record<string, string> = {
    '待付款': 'border-l-amber-500',
    '待接单': 'border-l-orange-500',
    '待派车': 'border-l-blue-500',
    '进行中': 'border-l-indigo-500',
    '已完成': 'border-l-emerald-500',
    '已取消': 'border-l-slate-300',
    '已关闭': 'border-l-slate-200',
  }


  const handleFilterChange = (key: string) => {
    const f = key as OrderStatus | 'all'
    dispatch({ type: 'SET_ORDER_FILTER', payload: f })
    setFilter(f)
  }

  return (
    <div className="flex flex-col h-full">
      <SubNavbar title="我的订单" onBack={goBack} />

      {/* 筛选标签 */}
      <div className="flex bg-white overflow-x-auto border-b border-slate-100 flex-shrink-0 no-scrollbar px-1">
        {[
          { key: 'all', label: '全部' },
          { key: '待付款', label: '待付款' },
          { key: '进行中', label: '进行中' },
          { key: '已完成', label: '已完成' },
          { key: '已取消', label: '已取消' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap relative transition-colors duration-200 cursor-pointer ${
              filter === tab.key ? 'text-primary font-semibold' : 'text-slate-500'
            }`}
          >
            {tab.label}
            {filter === tab.key && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-sm text-slate-400">加载中...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <FileCheck className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-sm font-medium text-slate-400 mb-1">暂无订单</div>
            <div className="text-xs text-slate-300">您还没有{filter === 'all' ? '相关' : ''}订单记录</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {orders.map(order => {
                const statusInfo = ORDER_STATUS_MAP[order.status]
                const borderColor = statusBorderMap[order.status] || 'border-l-slate-300'
                const statusBg = statusBgMap[order.status] || 'bg-slate-50 text-slate-500'
                const iconEl = statusIconMap[order.status]

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      dispatch({ type: 'SET_VIEWING_ORDER_ID', payload: order.id })
                      navigateTo('order-detail')
                    }}
                    className={`bg-white rounded-2xl overflow-hidden border-l-[3px] ${borderColor} cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBg}`}>
                          {iconEl}
                          <span>{order.status}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{order.orderNo}</span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 truncate">{order.route}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                        <Clock className="w-3 h-3" />
                        <span>{order.departTime}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs text-slate-400">¥</span>
                          <span className="text-lg font-extrabold text-slate-800">{order.total}</span>
                        </div>
                        <div className="flex gap-2">
                          {(order.status === '待付款' || order.status === '待接单' || order.status === '待派车') && (
                            <Button size="sm" variant="outline" className="rounded-full h-8 text-xs border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-300" onClick={e => e.stopPropagation()}>
                              取消订单
                            </Button>
                          )}
                          {order.status === '已完成' && (
                            <Button size="sm" variant="outline" className="rounded-full h-8 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={e => e.stopPropagation()}>
                              再次预订
                            </Button>
                          )}
                          {(order.status === '进行中' || order.status === '待派车') && (
                            <span className="text-xs text-primary font-medium flex items-center gap-1">
                              <Navigation className="w-3 h-3" />行程中
                            </span>
                          )}
                        </div>
                      </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
