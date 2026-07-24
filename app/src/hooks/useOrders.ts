import { useState, useEffect, useCallback } from 'react'
import { getOrderList } from '@/api/modules/order'
import type { OrderItem, OrderListParams } from '@/api/modules/order'
import { MOCK_ORDERS } from '@/data/defaults'
import type { OrderStatus } from '@/types'

export function useOrders(initialFilter: OrderStatus | 'all' = 'all') {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>(initialFilter)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  const sortByOrderTime = (list: OrderItem[]) => {
    return [...list].sort((a, b) => new Date(b.orderTime ?? '').getTime() - new Date(a.orderTime ?? '').getTime())
  }

  const fetchOrders = useCallback(async (params?: OrderListParams) => {
    setLoading(true)
    try {
      const data = await getOrderList(params || { status: filter === 'all' ? undefined : filter })
      setOrders(sortByOrderTime(data.list))
      setTotal(data.total)
    } catch {
      // 降级：使用 mock 数据
      const filtered = filter === 'all'
        ? MOCK_ORDERS
        : MOCK_ORDERS.filter(o => o.status === filter)
      setOrders(sortByOrderTime(filtered))
      setTotal(filtered.length)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchOrders()
  }, [filter, fetchOrders])

  const filteredOrders = orders

  return { orders: filteredOrders, filter, setFilter, loading, total, refetch: fetchOrders }
}
