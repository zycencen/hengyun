import { post } from '../request'

// ============ 类型 ============
export interface CustomCharterParams {
  name: string
  phone: string
  city: string
  demand: string
}

// ============ API ============

/** 提交定制包车需求 */
export function submitCustomCharter(params: CustomCharterParams) {
  return post<{ success: boolean; message: string }>('/custom-charter/submit', params)
}
