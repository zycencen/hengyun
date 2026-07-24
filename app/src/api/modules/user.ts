import { get, post, put } from '../request'

// ============ 类型 ============
export interface UserProfile {
  id: number
  name: string
  phone: string
  company: string
  avatar?: string
  isVip: boolean
  isEnterpriseVerified: boolean
  userType?: string
  orgs?: { id: string; name: string }[] | null
}

export interface LoginParams {
  phone: string
  code: string
  fleetOrgId?: string  // 从车队专属入口进入时传入，用于自动关联组织
}

export interface LoginResult {
  token: string
  user: UserProfile
}

// ============ API ============

/** 发送验证码 */
export function sendSmsCode(phone: string) {
  return post<{ success: boolean }>('/user/sms-code', { phone })
}

/** 登录 */
export function login(params: LoginParams) {
  return post<LoginResult>('/user/login', params)
}

/** 获取用户信息 */
export function getUserProfile() {
  return get<UserProfile>('/user/profile')
}

/** 更新用户信息 */
export function updateUserProfile(data: Partial<UserProfile>) {
  return put<UserProfile>('/user/profile', data)
}
