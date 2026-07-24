import { post } from '../request'

// ============ 类型 ============
export interface CommuteApplyParams {
  name: string
  phone: string
  company: string
  city: string
}

// ============ API ============

/** 提交通勤车申请 */
export function submitCommuteApply(params: CommuteApplyParams) {
  return post<{ success: boolean; message: string }>('/commute/apply', params)
}
