import { get } from '../request'

export interface FleetEntryConfig {
  home?: boolean
  order?: boolean
  orderList?: boolean
  profile?: boolean
  invoice?: boolean
  reviews?: boolean
  settings?: boolean
  showCharter?: boolean
  showCommute?: boolean
  showCustom?: boolean
  bannerTitle?: string
  bannerSubtitle?: string
}

export interface FleetEntryInfo {
  fleetId: string
  orgId: string
  name: string
  leaderName: string
  leaderPhone: string
  logo: string
  entryConfig: FleetEntryConfig
}

export interface FleetInfo {
  fleetId: string | null
  orgId: string | null
  name: string
  logo: string
}

/** 根据 orgId 获取车队入口配置 */
export function getFleetEntryConfig(orgId: string) {
  return get<FleetEntryInfo>('/fleet/entry-config', { orgId })
}

/** 获取已启用的车队入口列表 */
export function getFleetEntryList() {
  return get<{ fleetId: string; orgId: string; name: string; leaderName: string; leaderPhone: string }[]>('/fleet/list')
}
