import { get, post, put } from '../request'

// ============ 状态维度类型 ============
export type OrderType = '普通用户订单' | '大客户订单'
export type PaymentStatus = '未支付' | '已支付' | '已退款'
export type AcceptStatus = '未接单' | '已接单'
export type DispatchStatus = '未派车' | '已派车' | '已完成'

/** 订单状态：原 status 列改为计算态 */
export type OrderStatus =
  | '待付款'
  | '待接单'
  | '待派车'
  | '进行中'
  | '已完成'
  | '已取消'
  | '已关闭'

export type PackageType = 'hourly' | 'daily'

export interface OrderItem {
  id: string
  orderNo: string
  route: string
  departCity: string
  orderTime?: string       // 下单时间
  departTime: string
  packageType: PackageType
  duration: string
  carName: string
  carModel: string
  seats: string
  amount: number
  serviceFee: number
  total: number
  /** 订单类型 */
  orderType: OrderType
  /** 支付状态 */
  paymentStatus: PaymentStatus
  /** 接单状态 */
  acceptStatus: AcceptStatus
  /** 调度状态 */
  dispatchStatus: DispatchStatus
  /** 订单状态（计算态） */
  status: OrderStatus
  /** 业务类型 */
  businessType: 'charter' | 'commute' | 'custom'
  createdAt: string
  customerName?: string
  customerPhone?: string
  driverName?: string
  driverPhone?: string
}

export interface CreateOrderParams {
  bizType: 'charter' | 'commute' | 'custom'
  departCity: string
  departTime: string
  packageType: PackageType
  duration: string
  carId: number
  fleetOrgId?: string
}


export interface OrderListParams {
  status?: OrderStatus | 'all'
  page?: number
  pageSize?: number
}

export interface OrderListResult {
  list: OrderItem[]
  total: number
  page: number
  pageSize: number
}

export interface OrderStats {
  pending: number
  inProgress: number
  completed: number
}

// ============ API ============

/** 创建订单 */
export function createOrder(params: CreateOrderParams) {
  return post<OrderItem>('/order/create', params)
}

/** 获取订单列表 */
export function getOrderList(params: OrderListParams) {
  return get<OrderListResult>('/order/list', params as Record<string, unknown>)
}

/** 获取订单详情 */
export function getOrderDetail(orderId: string) {
  return get<OrderItem>(`/order/detail/${orderId}`)
}

/** 支付订单 */
export function payOrder(orderId: string) {
  return post<{ success: boolean }>(`/order/pay/${orderId}`)
}

/** 取消订单 */
export function cancelOrder(orderId: string) {
  return put<{ success: boolean }>(`/order/cancel/${orderId}`)
}

/** 获取订单统计 */
export function getOrderStats() {
  return get<OrderStats>('/order/stats')
}

/** 再次预订 */
export function rebookOrder(orderId: string) {
  return post<OrderItem>(`/order/rebook/${orderId}`)
}
