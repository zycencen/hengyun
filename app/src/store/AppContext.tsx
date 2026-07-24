import { createContext, useContext } from 'react'
import type { FleetEntryConfig, FleetInfo } from '@/api/modules/fleet'
import type { CarInfo, DurationOption, PackageType, OrderStatus, UserProfile } from '@/types'

// ============ 应用全局状态类型 ============
export interface AppState {
  // 用户
  user: UserProfile | null
  isLoggedIn: boolean

  // 业务
  bizType: 'charter' | 'commute' | 'custom'
  departCity: string
  departTime: string

  // 选车
  packageType: PackageType
  selectedDuration: number
  selectedCar: number

  // 当前订单（已创建但未支付的订单ID）
  currentOrderId: string
  // 正在查看的订单ID（订单详情页用）
  viewingOrderId: string

  // 数据
  cars: CarInfo[]
  hourlyDurations: DurationOption[]
  dailyDurations: DurationOption[]

  // 订单
  orderFilter: OrderStatus | 'all'

  // 通勤车
  commuteName: string
  commutePhone: string
  commuteCompany: string

  // 定制包车
  customName: string
  customPhone: string
  customDemand: string

  // 页面路由
  currentPage: string

  // 加载状态
  loading: boolean

  // Toast
  toastMessage: string

  // 车队入口
  fleetOrgId: string | null
  fleetEntryConfig: FleetEntryConfig
  fleetInfo: FleetInfo
}


// ============ Actions ============
export type AppAction =
  | { type: 'SET_USER'; payload: UserProfile | null }
  | { type: 'SET_BIZ_TYPE'; payload: 'charter' | 'commute' | 'custom' }
  | { type: 'SET_DEPART_CITY'; payload: string }
  | { type: 'SET_DEPART_TIME'; payload: string }
  | { type: 'SET_PACKAGE_TYPE'; payload: PackageType }
  | { type: 'SET_SELECTED_DURATION'; payload: number }
  | { type: 'SET_SELECTED_CAR'; payload: number }
  | { type: 'SET_CARS'; payload: CarInfo[] }
  | { type: 'SET_DURATIONS'; payload: { hourly: DurationOption[]; daily: DurationOption[] } }
  | { type: 'SET_CURRENT_ORDER_ID'; payload: string }
  | { type: 'SET_VIEWING_ORDER_ID'; payload: string }
  | { type: 'SET_ORDER_FILTER'; payload: OrderStatus | 'all' }
  | { type: 'SET_COMMUTE_NAME'; payload: string }
  | { type: 'SET_COMMUTE_PHONE'; payload: string }
  | { type: 'SET_COMMUTE_COMPANY'; payload: string }
  | { type: 'SET_CUSTOM_NAME'; payload: string }
  | { type: 'SET_CUSTOM_PHONE'; payload: string }
  | { type: 'SET_CUSTOM_DEMAND'; payload: string }
  | { type: 'SET_CURRENT_PAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TOAST'; payload: string }
  | { type: 'SET_FLEET'; payload: { orgId: string | null; entryConfig: FleetEntryConfig; fleetInfo: FleetInfo } }
  | { type: 'RESET' }

// ============ Context ============
export interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  /** 退出登录（清除 token 并返回登录页） */
  logout: () => void
}

export const AppContext = createContext<AppContextType | null>(null)

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
