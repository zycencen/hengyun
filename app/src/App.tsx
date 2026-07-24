import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider, useAppContext, useNavigation } from '@/store'
import { useUser } from '@/hooks'
import { StatusBar } from '@/components/shared/StatusBar'
import { BottomTabBar } from '@/components/shared/BottomTabBar'
import { Toast } from '@/components/shared/Toast'
import { PageContainer } from '@/components/shared/PageContainer'
import { AdminLayout, type AdminMenuItem } from '@/components/admin/AdminLayout'
import { getFleetEntryConfig, type FleetEntryConfig } from '@/api/modules/fleet'
import {
  LayoutDashboard, ClipboardList, Truck, Users, UserCheck,
  FileText, Settings, DollarSign, CalendarCheck, Headphones, Inbox, Car, Star, Rocket
} from 'lucide-react'

// 懒加载用户端页面
const HomePage = lazy(() => import('@/pages/HomePage'))
const CarSelectPage = lazy(() => import('@/pages/CarSelectPage'))
const CitySelectPage = lazy(() => import('@/pages/CitySelectPage'))
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'))
const OrderListPage = lazy(() => import('@/pages/OrderListPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const InvoicePage = lazy(() => import('@/pages/InvoicePage'))
const ReviewPage = lazy(() => import('@/pages/ReviewPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage'))

// 懒加载管理端页面
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const OrderManagePage = lazy(() => import('@/pages/admin/OrderManagePage'))
const DispatchPage = lazy(() => import('@/pages/admin/DispatchPage'))
const VehicleCalendar = lazy(() => import('@/components/dispatch/VehicleCalendar').then(m => ({ default: m.VehicleCalendar })))
const DrivingLog = lazy(() => import('@/components/dispatch/DrivingLog').then(m => ({ default: m.DrivingLog })))
const ContractManagePage = lazy(() => import('@/pages/admin/ContractManagePage'))
const VehicleManagePage = lazy(() => import('@/pages/admin/VehicleManagePage'))
const DriverManagePage = lazy(() => import('@/pages/admin/DriverManagePage'))
const UserManagePage = lazy(() => import('@/pages/admin/UserManagePage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const FinancePage = lazy(() => import('@/pages/admin/FinancePage'))
const ServicePage = lazy(() => import('@/pages/admin/ServicePage'))
const DemandManagePage = lazy(() => import('@/pages/admin/DemandManagePage'))
const FleetManagePage = lazy(() => import('@/pages/admin/FleetManagePage'))
const ReviewManagePage = lazy(() => import('@/pages/admin/ReviewManagePage'))
const DeployPage = lazy(() => import('@/pages/admin/DeployPage'))

// 登录页面
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'))

// 页面加载骨架屏
function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-sm text-slate-400">加载中...</div>
    </div>
  )
}

// ============ 用户端主入口 ============
function UserAppInner() {
  const { state, dispatch } = useAppContext()
  const { currentPage, navigateTo } = useNavigation()
  const location = useLocation()
  const [fleetLoading, setFleetLoading] = useState(true)
  const [fleetError, setFleetError] = useState('')

  // 全局加载用户信息（含所属组织），确保所有页面都有完整的 user 数据
  useUser()

  // 读取 URL 中的车队入口 orgId
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const fleetOrgId = params.get('fleetOrgId') || localStorage.getItem('fleetOrgId') || null
    if (fleetOrgId) {
      localStorage.setItem('fleetOrgId', fleetOrgId)
      getFleetEntryConfig(fleetOrgId)
        .then((data) => {
          dispatch({
            type: 'SET_FLEET',
            payload: {
              orgId: fleetOrgId,
              entryConfig: data.entryConfig,
              fleetInfo: {
                fleetId: data.fleetId,
                orgId: data.orgId,
                name: data.name,
                logo: data.logo || '',
              },
            },
          })
          setFleetError('')
        })
        .catch(() => setFleetError('车队入口配置加载失败'))
        .finally(() => setFleetLoading(false))
    } else {
      dispatch({
        type: 'SET_FLEET',
        payload: {
          orgId: null,
          entryConfig: {
            home: true, order: true, orderList: true, profile: true, invoice: true, reviews: true, settings: true,
            showCharter: true, showCommute: true, showCustom: true,
            bannerTitle: '', bannerSubtitle: '',
          },
          fleetInfo: { fleetId: null, orgId: null, name: '', logo: '' },
        },
      })
      setFleetLoading(false)
    }
  }, [location.search, dispatch])

  const handleTabChange = (tab: string) => {
    if (tab === 'home') navigateTo('home')
    else if (tab === 'orders') navigateTo('order-list')
    else navigateTo('profile')
  }

  const showTabBar = !['car-select', 'city-select', 'order-detail', 'invoice', 'reviews', 'settings', 'order-success'].includes(currentPage)

  const tabIcons = {
    home: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    orders: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    profile: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  }

  const allTabs = [
    { key: 'home', label: '首页', icon: tabIcons.home, enabled: state.fleetEntryConfig.home !== false },
    { key: 'orders', label: '订单', icon: tabIcons.orders, enabled: state.fleetEntryConfig.orderList !== false },
    { key: 'profile', label: '我的', icon: tabIcons.profile, enabled: state.fleetEntryConfig.profile !== false },
  ]
  const tabs = allTabs.filter(t => t.enabled)

  if (fleetLoading) {
    return (
      <PageContainer>
        <StatusBar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">加载入口配置...</div>
      </PageContainer>
    )
  }

  if (fleetError) {
    return (
      <PageContainer>
        <StatusBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-lg font-semibold text-slate-700 mb-2">入口暂不可用</div>
          <div className="text-sm text-slate-500">{fleetError}</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <StatusBar />
      <div className="flex-1 overflow-hidden relative">
        <Suspense fallback={<PageFallback />}>
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'car-select' && <CarSelectPage />}
          {currentPage === 'city-select' && <CitySelectPage />}
          {currentPage === 'order-detail' && <OrderDetailPage />}
          {currentPage === 'order-list' && <OrderListPage />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'invoice' && <InvoicePage />}
          {currentPage === 'reviews' && <ReviewPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'order-success' && <OrderSuccessPage />}
        </Suspense>
      </div>

      {showTabBar && tabs.length > 0 && (
        <BottomTabBar
          activeTab={state.currentPage === 'order-list' ? 'orders' : state.currentPage === 'profile' ? 'profile' : 'home'}
          onTabChange={handleTabChange}
          tabs={tabs}
        />
      )}

      <Toast />
    </PageContainer>
  )
}

// 包装 AppProvider
function UserApp() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'))

  if (!loggedIn) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">加载中...</div>}>
        <LoginPage onLogin={() => setLoggedIn(true)} />
      </Suspense>
    )
  }

  return (
    <AppProvider onLogout={() => setLoggedIn(false)}>
      <UserAppInner />
    </AppProvider>
  )
}

// ============ 管理端主入口 ============
function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token'))
  const [activeMenu, setActiveMenu] = useState('dashboard')

  if (!loggedIn) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">加载中...</div>}>
        <AdminLoginPage onLogin={() => setLoggedIn(true)} />
      </Suspense>
    )
  }

  const menuItems: AdminMenuItem[] = [
    { key: 'dashboard', label: '仪表盘', icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: 'orders', label: '订单管理', icon: <ClipboardList className="w-5 h-5" /> },
    { key: 'dispatch', label: '调度管理', icon: <CalendarCheck className="w-5 h-5" />, children: [
      { key: 'dispatch-charter', label: '包车调度管理' },
      { key: 'dispatch-commute', label: '上下班车调度管理' },
      { key: 'dispatch-custom', label: '定制包车调度管理' },
      { key: 'dispatch-calendar', label: '车辆日历' },
      { key: 'dispatch-log', label: '行车日志' },
    ] },
    { key: 'demands', label: '需求管理', icon: <Inbox className="w-5 h-5" /> },
    { key: 'contracts', label: '合同管理', icon: <FileText className="w-5 h-5" /> },
    { key: 'vehicles', label: '车辆管理', icon: <Truck className="w-5 h-5" /> },
    { key: 'drivers', label: '司机管理', icon: <Users className="w-5 h-5" /> },
    { key: 'fleets', label: '车队管理', icon: <Car className="w-5 h-5" /> },
    { key: 'reviews', label: '评价管理', icon: <Star className="w-5 h-5" /> },
    { key: 'users', label: '用户管理', icon: <UserCheck className="w-5 h-5" /> },
    { key: 'finance', label: '财务管理', icon: <DollarSign className="w-5 h-5" /> },
    { key: 'service', label: '客服中心', icon: <Headphones className="w-5 h-5" /> },
    { key: 'settings', label: '系统设置', icon: <Settings className="w-5 h-5" /> },
    { key: 'deploy', label: '环境部署', icon: <Rocket className="w-5 h-5" /> },
  ]

  return (
    <AdminLayout menuItems={menuItems} activeMenu={activeMenu} onMenuChange={setActiveMenu} onLogout={() => {
      localStorage.removeItem('admin_token')
      setLoggedIn(false)
      setActiveMenu('dashboard')
    }}>
      <Suspense fallback={<div className="text-sm text-slate-400 py-12 text-center">加载中...</div>}>
        {activeMenu === 'dashboard' && <DashboardPage onNavigate={setActiveMenu} />}
        {activeMenu === 'orders' && <OrderManagePage />}
        {activeMenu === 'dispatch' && <DispatchPage />}
        {activeMenu === 'dispatch-charter' && <DispatchPage bizType="charter" />}
        {activeMenu === 'dispatch-commute' && <DispatchPage bizType="commute" />}
        {activeMenu === 'dispatch-custom' && <DispatchPage bizType="custom" />}
        {activeMenu === 'dispatch-calendar' && <VehicleCalendar />}
        {activeMenu === 'dispatch-log' && <DrivingLog />}
        {activeMenu === 'demands' && <DemandManagePage />}
        {activeMenu === 'contracts' && <ContractManagePage />}
        {activeMenu === 'vehicles' && <VehicleManagePage />}
        {activeMenu === 'drivers' && <DriverManagePage />}
        {activeMenu === 'fleets' && <FleetManagePage />}
        {activeMenu === 'reviews' && <ReviewManagePage />}
        {activeMenu === 'users' && <UserManagePage />}
        {activeMenu === 'finance' && <FinancePage />}
        {activeMenu === 'service' && <ServicePage />}
        {activeMenu === 'settings' && <AdminSettingsPage />}
        {activeMenu === 'deploy' && <DeployPage />}
      </Suspense>
    </AdminLayout>
  )
}

// ============ App 路由入口 ============
function App() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">加载中...</div>}>
      <Routes>
        <Route path="/*" element={<UserApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </Suspense>
  )
}

export default App
