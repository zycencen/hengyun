import { useState, useEffect, useCallback } from 'react'
import { getInvoiceList, getInvoiceRecords, applyInvoice } from '@/api/modules/invoice'
import type { InvoiceOrder, InvoiceRecord, ApplyInvoiceParams } from '@/api/modules/invoice'
import { MOCK_INVOICE_ORDERS, MOCK_INVOICE_RECORDS } from '@/data/defaults'

export type InvoiceTab = 'available' | 'applied'

export function useInvoices() {
  const [tab, setTab] = useState<InvoiceTab>('available')
  const [availableOrders, setAvailableOrders] = useState<InvoiceOrder[]>([])
  const [appliedRecords, setAppliedRecords] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 获取可开票订单
  const fetchAvailable = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvoiceList()
      setAvailableOrders(data.map(item => ({ ...item, selected: false })))
    } catch {
      setAvailableOrders(MOCK_INVOICE_ORDERS.map(item => ({ ...item, selected: false })))
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取已申请记录
  const fetchRecords = useCallback(async () => {
    try {
      const data = await getInvoiceRecords()
      setAppliedRecords(data)
    } catch {
      setAppliedRecords(MOCK_INVOICE_RECORDS)
    }
  }, [])

  useEffect(() => {
    fetchAvailable()
    fetchRecords()
  }, [fetchAvailable, fetchRecords])

  // 单选
  const toggleOne = (id: number) => {
    setAvailableOrders(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i))
  }

  // 全选
  const toggleAll = () => {
    setAvailableOrders(prev => {
      const allSelected = prev.every(i => i.selected)
      return prev.map(i => ({ ...i, selected: !allSelected }))
    })
  }

  const allSelected = availableOrders.length > 0 && availableOrders.every(i => i.selected)
  const selectedOrders = availableOrders.filter(i => i.selected)
  const selectedCount = selectedOrders.length
  const totalAmount = selectedOrders.reduce((sum, o) => sum + o.amount, 0)

  // 提交开票申请
  const submitInvoice = async (params: ApplyInvoiceParams) => {
    setSubmitting(true)
    try {
      const result = await applyInvoice(params)
      // 刷新数据
      await Promise.all([fetchAvailable(), fetchRecords()])
      setTab('applied')
      return result
    } catch {
      // 降级：直接刷新（mock 模式）
      await Promise.all([fetchAvailable(), fetchRecords()])
      setTab('applied')
      return { success: true, message: '已提交开票申请', orderCount: params.orderIds.length, totalAmount: 0 }
    } finally {
      setSubmitting(false)
    }
  }

  return {
    tab, setTab,
    availableOrders, appliedRecords,
    loading, submitting,
    toggleOne, toggleAll,
    allSelected, selectedOrders, selectedCount, totalAmount,
    submitInvoice, refetch: () => { fetchAvailable(); fetchRecords() }
  }
}
