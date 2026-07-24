import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  Menu, Bell, LogOut, X, CheckCheck, Circle
} from 'lucide-react'

export interface AdminMenuItem {
  key: string
  label: string
  icon: React.ReactNode
  children?: { key: string; label: string }[]
}

interface AdminLayoutProps {
  menuItems: AdminMenuItem[]
  activeMenu: string
  onMenuChange: (key: string) => void
  onLogout?: () => void
  children: React.ReactNode
}

export function AdminLayout({ menuItems, activeMenu, onMenuChange, onLogout, children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Mock 通知数据
  interface Notification {
    id: number
    type: 'order' | 'driver' | 'vehicle' | 'system' | 'finance'
    title: string
    content: string
    time: string
    read: boolean
  }

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: 'order', title: '新订单提醒', content: '企业客户"腾讯科技"下单了2辆7座商务车', time: '10分钟前', read: false },
    { id: 2, type: 'driver', title: '司机入驻申请', content: '司机"李师傅"提交了入驻申请，等待审核', time: '30分钟前', read: false },
    { id: 3, type: 'vehicle', title: '车辆维保到期', content: '沪A·B1234 即将到达保养里程，请及时安排维保', time: '1小时前', read: false },
    { id: 4, type: 'finance', title: '大额账单产生', content: '本月营收突破 50 万元，同比增长 32%', time: '2小时前', read: true },
    { id: 5, type: 'system', title: '系统更新通知', content: '恒运出行 v2.1.0 将于本周五凌晨 2:00-4:00 进行升级维护', time: '昨天', read: true },
    { id: 6, type: 'order', title: '订单投诉', content: '用户"张先生"投诉订单 HY20260701038 司机迟到', time: '昨天', read: true },
    { id: 7, type: 'driver', title: '司机证照到期', content: '司机"王师傅"的驾驶证将在 15 天后到期', time: '前天', read: true },
    { id: 8, type: 'system', title: '日运营报告', content: '昨日完成订单 187 单，日营收 ¥38,240，车辆利用率 82%', time: '前天', read: true },
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const typeConfig: Record<string, { color: string; bg: string; label: string }> = {
    order: { color: 'text-blue-500', bg: 'bg-blue-50', label: '订单' },
    driver: { color: 'text-emerald-500', bg: 'bg-emerald-50', label: '司机' },
    vehicle: { color: 'text-amber-500', bg: 'bg-amber-50', label: '车辆' },
    finance: { color: 'text-purple-500', bg: 'bg-purple-50', label: '财务' },
    system: { color: 'text-slate-500', bg: 'bg-slate-100', label: '系统' },
  }

  const expandedMenus: Record<string, boolean> = {}
  menuItems.filter(m => m.children).forEach(m => {
    expandedMenus[m.key] = m.children?.some(c => c.key === activeMenu) || false
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>(expandedMenus)

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-56'

  const sidebar = (
    <div className={`${sidebarWidth} bg-slate-900 text-white flex flex-col h-full transition-all duration-300 overflow-hidden`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-700/50 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">HY</span>
            </div>
            <span className="font-bold text-base whitespace-nowrap">恒运管理</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-400 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-extrabold text-sm">HY</span>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {menuItems.map(item => {
          const isActive = activeMenu === item.key
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expanded[item.key]

          if (hasChildren) {
            return (
              <div key={item.key}>
                <button
                  onClick={() => collapsed ? onMenuChange(item.key) : toggleExpand(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive || item.children?.some(c => c.key === activeMenu)
                      ? 'bg-primary/30 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="w-5 h-5 shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </>
                  )}
                </button>
                {!collapsed && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-700/50 pl-3">
                    {item.children!.map(child => (
                      <button
                        key={child.key}
                        onClick={() => onMenuChange(child.key)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 whitespace-nowrap ${
                          activeMenu === child.key
                            ? 'text-white bg-primary/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={item.key}
              onClick={() => onMenuChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-primary/30 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 shrink-0">{item.icon}</span>
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-700/50 p-3 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200 text-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>收起菜单</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex bg-slate-100 font-sans">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 bottom-0 z-50" onClick={e => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        {sidebar}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {(() => {
                // 先找顶层菜单
                const top = menuItems.find(m => m.key === activeMenu)
                if (top) return top.label
                // 再从子菜单中找
                for (const m of menuItems) {
                  const child = m.children?.find(c => c.key === activeMenu)
                  if (child) return child.label
                }
                return '管理后台'
              })()}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* 通知下拉面板 */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">消息通知</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-full">{unreadCount}条未读</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <CheckCheck className="w-3 h-3" />全部已读
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(n => {
                      const config = typeConfig[n.type]
                      return (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left px-4 py-3 flex gap-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="relative mt-0.5 shrink-0">
                            {!n.read && <Circle className="w-2 h-2 fill-primary text-primary absolute -left-1 top-1.5" />}
                            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${n.read ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>
                              {n.title}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                    <button className="w-full text-center text-xs text-slate-500 hover:text-primary transition-colors">
                      查看全部通知
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                管
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-slate-700">管理员</div>
                <div className="text-xs text-slate-400">超级管理员</div>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">退出</span>
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
