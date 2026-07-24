import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast, useNavigation, useAppContext } from '@/store'
import { useUser } from '@/hooks'
import { ChatWindow } from '@/components/shared/ChatWindow'
import { getOrderStats } from '@/api/modules/order'
import type { OrderStatus } from '@/types'
import {
  User, Settings, Ticket, Star, HeadphonesIcon, LogOut, ChevronRight,
} from 'lucide-react'

export default function ProfilePage() {
  const showToast = useToast()
  const { navigateTo } = useNavigation()
  const { dispatch, logout } = useAppContext()
  const { user } = useUser()
  const [showLogout, setShowLogout] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 })

  useEffect(() => {
    getOrderStats().then(setStats).catch(() => {})
  }, [])

  const handleStatClick = (filter: OrderStatus) => {
    dispatch({ type: 'SET_ORDER_FILTER', payload: filter })
    navigateTo('order-list')
  }

  const handleLogout = () => {
    logout()
    setShowLogout(false)
    showToast('已退出登录')
  }

  return (
    <ScrollArea className="h-full relative">
      {/* 头部 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-700 to-blue-800 pt-8 pb-10 px-5">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 flex-shrink-0 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{user?.name || '未登录'}</div>
            <div className="text-sm text-white/60 mt-0.5">{user?.phone || ''}</div>
            {/* 所属组织已隐藏 */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {user?.isEnterpriseVerified && (
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] text-white/80 font-medium">企业认证</span>
              )}
              {user?.isVip && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-[10px] text-amber-300 font-medium">VIP会员</span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigateTo('settings')}
            className="ml-auto w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors"
          >
            <Settings className="w-4.5 h-4.5 text-white" />
          </button>
        </div>
      </div>

      {/* 订单统计 */}
      <div className="mx-4 -mt-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-slate-50">
            {[
              { count: stats.pending, label: '待付款', color: 'text-amber-500', bg: 'bg-amber-50', filter: '待付款' as OrderStatus },
              { count: stats.inProgress, label: '进行中', color: 'text-blue-500', bg: 'bg-blue-50', filter: '进行中' as OrderStatus },
              { count: stats.completed, label: '已完成', color: 'text-emerald-500', bg: 'bg-emerald-50', filter: '已完成' as OrderStatus },
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleStatClick(item.filter)}
                className="py-4 text-center cursor-pointer hover:bg-slate-50 transition-colors duration-200 group"
              >
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${item.bg} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <span className={`text-sm font-extrabold ${item.color}`}>{item.count}</span>
                </div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="mx-4 mt-4 space-y-3">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          {[
            { icon: Ticket, label: '我的发票', desc: '查看和申请电子发票', onClick: () => navigateTo('invoice') },
            { icon: Star, label: '服务评价', desc: '查看我的服务评价', onClick: () => navigateTo('reviews') },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={item.onClick}
              className="flex items-center px-4 py-3.5 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center mr-3">
                <item.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          {[
            { icon: HeadphonesIcon, label: '联系客服', desc: '在线客服 7×24小时', onClick: () => setShowChat(true) },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={item.onClick}
              className="flex items-center px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/5 flex items-center justify-center mr-3">
                <item.icon className="w-4.5 h-4.5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full h-12 rounded-2xl text-slate-400 hover:text-red-400 hover:bg-red-50 font-medium"
          onClick={() => setShowLogout(true)}
        >
          <LogOut className="w-4 h-4 mr-2" />退出登录
        </Button>

        <div className="text-center text-[11px] text-slate-300 pb-8">恒运出行 v1.0.0</div>
      </div>

      {/* 退出确认弹窗 */}
      {showLogout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-2xl p-5 mx-8 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800">确认退出</h3>
              <p className="text-sm text-slate-400 mt-1">退出登录后需要重新验证身份</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={() => setShowLogout(false)}>取消</Button>
              <Button className="flex-1 rounded-xl h-10 bg-red-500 hover:bg-red-600 font-medium" onClick={handleLogout}>确认退出</Button>
            </div>
          </div>
        </div>
      )}

      {/* 客服聊天窗口 */}
      {showChat && (
        <div className="absolute inset-0 z-50 bg-white">
          <ChatWindow onClose={() => setShowChat(false)} />
        </div>
      )}
    </ScrollArea>
  )
}
