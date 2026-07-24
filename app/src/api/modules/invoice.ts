import { get, post } from '../request'

// ============ 类型 ============

/** 可开票订单 */
export interface InvoiceOrder {
  id: number
  orderNo: string
  route: string
  amount: number
  date: string
  orderTime: string
  selected?: boolean
}

/** 已申请发票记录 */
export interface InvoiceRecord {
  id: number
  orderIds: string[]
  orderNos: string[]
  title: string
  amount: number
  invoiceType: string
  taxId: string
  email: string
  status: string       // '已申请' | '开票中' | '已开票'
  appliedAt: string
  date: string
}

/** 开票申请参数 */
export interface ApplyInvoiceParams {
  orderIds: number[]
  invoiceType: string   // '个人' | '企业'
  title: string
  taxId?: string
  email: string
}

// ============ API ============

/** 获取可开票的订单列表（已完成且未开票的） */
export function getInvoiceList() {
  return get<InvoiceOrder[]>('/invoice/list')
}

/** 获取已申请的发票记录 */
export function getInvoiceRecords() {
  return get<InvoiceRecord[]>('/invoice/records')
}

/** 申请开票（支持合并开票） */
export function applyInvoice(params: ApplyInvoiceParams) {
  return post<{ success: boolean; message: string; orderCount: number; totalAmount: number }>(
    '/invoice/apply',
    params as Record<string, unknown>
  )
}
