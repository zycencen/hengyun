import { get } from '../request'

// ============ 类型 ============
export interface PriceDetail {
  price: number
  kmLimit: number
  overtimeRate: number
  overKmRate: number
  serviceFee?: number
}

export type CarPriceMap = Record<string, PriceDetail>

export interface CarInfo {
  id: number
  name: string
  seats: string
  model: string
  capacity: string
  tags: string[]
  hourlyPrice: number
  dailyPrice: number
  color: string
  imageUrl?: string
  status: 'available' | 'busy' | 'offline'
  plate?: string
  carModelId?: string
  prices?: CarPriceMap
}

export interface DurationOption {
  label: string
  sublabel: string
  kmLimit?: number
}

export interface CarListResult {
  cars: CarInfo[]
  hourlyDurations: DurationOption[]
  dailyDurations: DurationOption[]
}

// ============ API ============

/** 获取可用车辆列表（支持按车队过滤） */
export function getCarList(fleetOrgId?: string | null) {
  return get<CarListResult>('/car/list', fleetOrgId ? { fleetOrgId } : undefined)
}

/** 获取服务城市列表 */
export interface CityInfo {
  id: number
  name: string
}

export function getCityList(fleetOrgId?: string | null) {
  return get<CityInfo[]>('/car/cities', fleetOrgId ? { fleetOrgId } : undefined)
}
