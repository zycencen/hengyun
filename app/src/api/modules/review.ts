import { get, post } from '../request'

// ============ 类型 ============
export interface ReviewItem {
  id: number
  stars: number
  content: string
  driver: string
  reply: string
  date: string
}

export interface DriverReviewStats {
  avgRating: number
  reviewCount: number
  reviews: ReviewItem[]
}

// ============ API ============

/** 获取评价列表 */
export function getReviewList(params?: { userId?: string; driver?: string; orgId?: string }) {
  const query = new URLSearchParams()
  if (params?.userId) query.set('userId', params.userId)
  if (params?.driver) query.set('driver', params.driver)
  if (params?.orgId) query.set('orgId', params.orgId)
  const qs = query.toString()
  return get<ReviewItem[]>(`/review/list${qs ? '?' + qs : ''}`)
}

/** 获取司机评价统计 */
export function getDriverReviewStats(driver: string) {
  return get<DriverReviewStats>(`/review/driver-stats?driver=${encodeURIComponent(driver)}`)
}

/** 提交评价 */
export function submitReview(orderId: string, stars: number, content: string) {
  return post<{ success: boolean }>('/review/submit', { orderId, stars, content })
}
