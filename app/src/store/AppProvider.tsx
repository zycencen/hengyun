import { useReducer, useCallback } from 'react'
import type { ReactNode } from 'react'
import { AppContext, useAppContext } from './AppContext'
import type { AppState, AppAction } from './AppContext'
import type { FleetInfo } from '@/api/modules/fleet'

// ============ 初始状态 ============
const initialState: AppState = {
  user: null,
  isLoggedIn: !!localStorage.getItem('token'),

  bizType: 'charter',
  departCity: '广州',
  departTime: '',

  packageType: 'hourly',
  selectedDuration: 0,
  selectedCar: 1,

  currentOrderId: '',
  viewingOrderId: '',

  cars: [],
  hourlyDurations: [],
  dailyDurations: [],

  orderFilter: 'all',

  commuteName: '',
  commutePhone: '',
  commuteCompany: '',

  customName: '',
  customPhone: '',
  customDemand: '',

  currentPage: 'home',

  loading: false,

  toastMessage: '',

  fleetOrgId: null,
  fleetEntryConfig: {
    home: true,
    order: true,
    orderList: true,
    profile: true,
    invoice: true,
    reviews: true,
    settings: true,
    showCharter: true,
    showCommute: true,
    showCustom: true,
    bannerTitle: '',
    bannerSubtitle: '',
  },
  fleetInfo: { fleetId: null, orgId: null, name: '' } as FleetInfo,
}

// ============ Reducer ============
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isLoggedIn: !!action.payload }
    case 'SET_BIZ_TYPE':
      return { ...state, bizType: action.payload }
    case 'SET_DEPART_CITY':
      return { ...state, departCity: action.payload }
    case 'SET_DEPART_TIME':
      return { ...state, departTime: action.payload }
    case 'SET_PACKAGE_TYPE':
      return { ...state, packageType: action.payload, selectedDuration: 0 }
    case 'SET_SELECTED_DURATION':
      return { ...state, selectedDuration: action.payload }
    case 'SET_SELECTED_CAR':
      return { ...state, selectedCar: action.payload }
    case 'SET_CURRENT_ORDER_ID':
      return { ...state, currentOrderId: action.payload }
    case 'SET_VIEWING_ORDER_ID':
      return { ...state, viewingOrderId: action.payload }
    case 'SET_CARS':
      return { ...state, cars: action.payload }
    case 'SET_DURATIONS':
      return { ...state, hourlyDurations: action.payload.hourly, dailyDurations: action.payload.daily }
    case 'SET_ORDER_FILTER':
      return { ...state, orderFilter: action.payload }
    case 'SET_COMMUTE_NAME':
      return { ...state, commuteName: action.payload }
    case 'SET_COMMUTE_PHONE':
      return { ...state, commutePhone: action.payload }
    case 'SET_COMMUTE_COMPANY':
      return { ...state, commuteCompany: action.payload }
    case 'SET_CUSTOM_NAME':
      return { ...state, customName: action.payload }
    case 'SET_CUSTOM_PHONE':
      return { ...state, customPhone: action.payload }
    case 'SET_CUSTOM_DEMAND':
      return { ...state, customDemand: action.payload }
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_TOAST':
      return { ...state, toastMessage: action.payload }
    case 'SET_FLEET':
      return { ...state, fleetOrgId: action.payload.orgId, fleetEntryConfig: action.payload.entryConfig, fleetInfo: action.payload.fleetInfo }
    case 'RESET':
      return { ...initialState, isLoggedIn: false, user: null }
    default:
      return state
  }
}


// ============ Provider ============
export function AppProvider({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    dispatch({ type: 'RESET' })
    onLogout?.()
  }, [onLogout, dispatch])

  return (
    <AppContext.Provider value={{ state, dispatch, logout }}>
      {children}
    </AppContext.Provider>
  )
}

// ============ 便捷 hooks ============

/** Toast 消息快捷方法 */
export function useToast() {
  const { dispatch } = useAppContext()
  return useCallback(
    (msg: string) => {
      dispatch({ type: 'SET_TOAST', payload: msg })
      setTimeout(() => dispatch({ type: 'SET_TOAST', payload: '' }), 2000)
    },
    [dispatch],
  )
}

/** 导航快捷方法 */
export function useNavigation() {
  const { state, dispatch } = useAppContext()

  const navigateTo = useCallback(
    (page: string) => {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: page })
    },
    [dispatch],
  )

  const goBack = useCallback(() => {
    const page = state.currentPage
    if (page === 'order-detail' || page === 'car-select' || page === 'city-select') {
      navigateTo('home')
    } else if (['order-list', 'invoice', 'reviews', 'settings'].includes(page)) {
      navigateTo('profile')
    }
  }, [state.currentPage, navigateTo])

  return { currentPage: state.currentPage, navigateTo, goBack }
}
