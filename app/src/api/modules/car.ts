import { get } from '../request'

// 复用 @/types 作为唯一的类型来源
export type {
  PriceDetail,
  CarPriceMap,
  CarInfo,
  DurationOption,
} from '@/types'

// ============ 模块专属类型 ============
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
