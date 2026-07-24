import { useState, useRef, useEffect } from 'react'
import { MOCK_ORDERS } from '@/data/defaults'
import { MOCK_DRIVERS } from '@/data/adminDefaults'
import { getAdminOrders, getContracts, getDrivers, getOrganizations, dispatchOrder, rollbackOrder, acceptOrder, completeOrder, deleteOrder, createManualOrder, settleOrder } from '@/api/modules/admin'
import type { OrgItem } from '@/api/modules/admin'

import type { OrderInfo, OrderStatus, BizType, ContractInfo, DriverInfo } from '@/types'
import {
  Search, Eye, FileText,
  X, Truck, User, MapPin, Clock, Building2, ChevronDown,
  Download, Upload, Calendar, FileUp, Link2, RotateCcw, AlertTriangle, CheckCircle2, Trash2,
  PlusCircle, Wallet, Repeat, Hash
} from 'lucide-react'

export function OrderManagePage() {
  const [orders, setOrders] = useState<OrderInfo[]>(MOCK_ORDERS)
  const [contracts, setContracts] = useState<ContractInfo[]>([])
  const [drivers, setDrivers] = useState<DriverInfo[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BizType | 'all'>('all')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [organizations, setOrganizations] = useState<OrgItem[]>([])

  useEffect(() => {
    getAdminOrders({ pageSize: 100, businessType: businessTypeFilter !== 'all' ? businessTypeFilter : undefined }).then(r => setOrders(r.list as any)).catch(() => {})
    getContracts().then(r => setContracts(r as any)).catch(() => {})
    getDrivers().then(r => setDrivers((r || []) as DriverInfo[])).catch(() => {})
    getOrganizations().then(r => setOrganizations(r as any)).catch(() => {})
  }, [businessTypeFilter])
  const [orderTimeFrom, setOrderTimeFrom] = useState('')
  const [orderTimeTo, setOrderTimeTo] = useState('')
  const [departTimeFrom, setDepartTimeFrom] = useState('')
  const [departTimeTo, setDepartTimeTo] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderInfo | null>(null)
  const [showDispatch, setShowDispatch] = useState(false)
  const [dispatchDriver, setDispatchDriver] = useState('')
  const [dispatchContract, setDispatchContract] = useState('')
  const [toast, setToast] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 手动录入表单状态
  const [manualForm, setManualForm] = useState({ bizType: 'commute' as 'commute' | 'custom', customerName: '', customerPhone: '', carName: '', seats: '5座', rideCount: 1, amount: 0, deposit: 0, contractId: '', remark: '' })

  // 结账弹窗
  const [showSettlement, setShowSettlement] = useState(false)
  const [settlementOrder, setSettlementOrder] = useState<OrderInfo | null>(null)
  const [settlementAmount, setSettlementAmount] = useState(0)

  // 回滚
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<{ order: OrderInfo; targetStatus: string } | null>(null)

  // 回滚状态映射：当前订单状态 → 目标订单状态
  // 注意：待接单订单不允许回滚，因此不在此映射中
  const ROLLBACK_MAP: Record<string, string | null> = {
    '待派车': '待接单',
    '进行中': '待派车',
  }

  // 获取指定订单的回滚目标状态（大客户月结订单从待派车回滚到待付款）
  const getRollbackTarget = (order: OrderInfo): string | null => {
    const target = ROLLBACK_MAP[order.status]
    if (target === '待接单' && order.orderType === '大客户订单' && order.paymentStatus === '未支付') {
      return '待付款'
    }
    return target || null
  }


  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (businessTypeFilter !== 'all' && o.businessType !== businessTypeFilter) return false
    if (orgFilter !== 'all') {
      if (orgFilter === 'none') { if (o.orgId) return false }
      else if (o.orgId !== orgFilter) return false
    }
    if (search && !o.orderNo.includes(search) && !o.route.includes(search) && !(o.driverName && o.driverName.includes(search)) && !(o.customerName && o.customerName.includes(search)) && !(o.customerPhone && o.customerPhone.includes(search))) return false
    if (orderTimeFrom && o.orderTime < orderTimeFrom) return false
    if (orderTimeTo && o.orderTime > orderTimeTo + ' 23:59') return false
    if (departTimeFrom && o.departTime < departTimeFrom) return false
    if (departTimeTo && o.departTime > departTimeTo + ' 23:59') return false
    return true
  }).sort((a, b) => b.orderTime.localeCompare(a.orderTime))

  // 是否结算类订单（上下班 / 定制包车 — 展示定金+应收+已收列）
  const isSettlement = businessTypeFilter === 'commute' || businessTypeFilter === 'custom'

  const businessTypeTabs: { key: BizType | 'all'; label: string }[] = [
    { key: 'all', label: '全部订单' },
    { key: 'charter', label: '包车订单' },
    { key: 'commute', label: '上下班订单' },
    { key: 'custom', label: '定制包车订单' },
  ]

  const statusTabs: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: '待付款', label: '待付款' },
    { key: '待接单', label: '待接单' },
    { key: '待派车', label: '待派车' },
    { key: '进行中', label: '进行中' },
    { key: '已完成', label: '已完成' },
    { key: '已取消', label: '已取消' },
    { key: '已关闭', label: '已关闭' },
  ]


  const handleDispatch = async () => {
    if (!dispatchDriver || !dispatchContract) {
      setToast('请选择司机和合同')
      setTimeout(() => setToast(''), 2000)
      return
    }
    if (!selectedOrder) return
    try {
      const result = await dispatchOrder(selectedOrder.id, dispatchDriver, dispatchContract)
      if (!result.success) {
        setToast((result as any).message || '派单失败')
        setTimeout(() => setToast(''), 3000)
        return
      }
      const driverList = drivers.length > 0 ? drivers : MOCK_DRIVERS
      const driver = driverList.find(d => d.id === dispatchDriver)
      setOrders(prev => prev.map(o => {
        if (o.id === selectedOrder.id) {
          return {
            ...o,
            driverName: driver?.name,
            driverPhone: driver?.phone,
            status: '进行中' as OrderStatus,
            dispatchStatus: '已派车',
            contractId: dispatchContract,
          }
        }

        // 如果其他订单之前关联了同一个合同，解除关联
        if (o.contractId === dispatchContract) {
          return { ...o, contractId: undefined }
        }
        return o
      }))
      // 刷新合同列表以获取最新关联状态
      getContracts().then(r => setContracts(r as any)).catch(() => {})
      setShowDispatch(false)
      setSelectedOrder(null)
      setToast('派单成功！已关联合同并通知司机')
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('派单失败，请重试')
      setTimeout(() => setToast(''), 3000)
    }
  }

  // ========== 确认接单 ==========
  const handleAccept = async (order: OrderInfo) => {
    try {
      await acceptOrder(order.id)
      setOrders(prev => prev.map(o =>
        o.id === order.id ? {
          ...o,
          status: '待派车' as OrderStatus,
          acceptStatus: '已接单',
        } : o
      ))
      setToast(`订单 ${order.orderNo} 已确认接单`)
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('确认接单失败，请重试')
      setTimeout(() => setToast(''), 3000)
    }
  }

  // ========== 完成订单 ==========
  const handleComplete = async (order: OrderInfo) => {
    try {
      await completeOrder(order.id)
      setOrders(prev => prev.map(o =>
        o.id === order.id ? {
          ...o,
          status: '已完成' as OrderStatus,
          dispatchStatus: '已完成',
        } : o
      ))
      setToast(`订单 ${order.orderNo} 已完成`)
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('完成订单失败，请重试')
      setTimeout(() => setToast(''), 3000)
    }
  }

  // ========== 删除订单（待付款 / 已取消） ==========
  const handleDelete = async (order: OrderInfo) => {
    if (!window.confirm(`确定要删除订单「${order.orderNo}」吗？此操作不可撤销。`)) return
    try {
      await deleteOrder(order.id)
      setOrders(prev => prev.filter(o => o.id !== order.id))
      setToast(`订单 ${order.orderNo} 已删除`)
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('删除订单失败，请重试')
      setTimeout(() => setToast(''), 3000)
    }
  }

  // ========== 回滚功能 ==========
  const handleRollbackClick = (order: OrderInfo) => {
    const target = getRollbackTarget(order)
    if (!target) return
    setRollbackTarget({ order, targetStatus: target })
    setShowRollbackConfirm(true)
  }

  const handleRollbackConfirm = async () => {
    if (!rollbackTarget) return
    try {
      await rollbackOrder(rollbackTarget.order.id)
      const target = rollbackTarget.targetStatus

      const isKeyAccount = rollbackTarget.order.orderType === '大客户订单' && rollbackTarget.order.paymentStatus === '未支付'
      const dimensionUpdates: Record<string, Partial<OrderInfo>> = {
        '待付款': { paymentStatus: '未支付', acceptStatus: '未接单', dispatchStatus: '未派车' },
        '待接单': { paymentStatus: '已支付', acceptStatus: '未接单', dispatchStatus: '未派车' },
        '待派车': { paymentStatus: isKeyAccount ? '未支付' : '已支付', acceptStatus: '已接单', dispatchStatus: '未派车' },
        '进行中': { paymentStatus: '已支付', acceptStatus: '已接单', dispatchStatus: '已派车' },
      }
      const dims = dimensionUpdates[target] || {}
      const shouldClearDriver = target === '待付款' || target === '待接单'
      setOrders(prev => prev.map(o => {
        if (o.id === rollbackTarget.order.id) {
          return {
            ...o,
            status: target as OrderStatus,
            ...dims,
            driverName: shouldClearDriver ? undefined : o.driverName,
            driverPhone: shouldClearDriver ? undefined : o.driverPhone,
            contractId: shouldClearDriver ? undefined : o.contractId,
          }
        }
        return o
      }))
      if (shouldClearDriver) {
        getContracts().then(r => setContracts(r as any)).catch(() => {})
      }
      setToast(`订单 ${rollbackTarget.order.orderNo} 已回滚至「${target}」`)
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('回滚失败，请重试')
      setTimeout(() => setToast(''), 3000)
    }
    setShowRollbackConfirm(false)
    setRollbackTarget(null)
  }


  // ========== 导出功能 ==========
  const handleExport = () => {
    const headers = ['订单号', '路线', '下单人', '下单人手机', '下单时间', '出发时间', '结束时间', '用车时长', '车辆', '套餐', '金额', '司机', '合同', '订单类型', '业务类型', '支付状态', '接单状态', '调度状态', '订单状态']

    const bizTypeLabel = (bt: string) => bt === 'charter' ? '包车' : bt === 'commute' ? '上下班' : bt === 'custom' ? '定制包车' : bt

    const rows = filtered.map(o => [
      o.orderNo,
      o.route,
      o.customerName || '-',
      o.customerPhone || '-',
      o.orderTime,
      o.departTime,
      o.endTime || '-',
      o.tripDuration || '-',
      o.carName,
      `${o.packageType === 'hourly' ? '按小时' : '按天'}·${o.duration}`,
      `¥${o.total}`,
      o.driverName || '-',
      o.contractId || '-',
      o.orderType,
      bizTypeLabel(o.businessType),
      o.paymentStatus,
      o.acceptStatus,
      o.dispatchStatus,
      o.status,
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `订单导出_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setToast(`已导出 ${filtered.length} 条订单数据`)
    setTimeout(() => setToast(''), 2000)
  }

  // ========== 导入功能 ==========
  const handleImportClick = () => {
    setShowImportModal(true)
  }

  // ========== 下载导入模板 ==========
  const handleDownloadTemplate = () => {
    const headers = ['订单号', '路线', '出发城市', '下单人', '下单人手机', '下单时间', '出发时间', '结束时间', '用车时长', '车辆', '车型', '座位数', '套餐类型(按小时/按天)', '时长', '金额', '服务费', '合计', '司机', '订单类型', '业务类型', '支付状态', '接单状态', '调度状态', '订单状态', '关联合同']
    const exampleRow = ['HY20260709001', '广州 → 深圳北站', '广州', '张三', '13800000001', '2026-07-09 08:30', '2026-07-09 14:00', '2026-07-09 18:00', '4小时', '经济型 5座', '大众帕萨特', '5座', '按小时', '4小时', '280', '20', '300', '王师傅', '普通用户订单', '包车', '已支付', '已接单', '已完成', '已完成', '']
    const tipsRow = ['# 说明：订单号必填，其他选填；套餐类型填"按小时"或"按天"；业务类型填 包车/上下班/定制包车；订单状态填 待付款/待接单/待派车/进行中/已完成/已取消/已关闭']

    const csvContent = [tipsRow, headers, exampleRow]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '订单导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
    setToast('模板已下载')
    setTimeout(() => setToast(''), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string

      // 解析 CSV 行（支持引号包裹的字段）
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (const ch of line) {
          if (ch === '"') {
            inQuotes = !inQuotes
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
        result.push(current.trim())
        return result
      }

      // 过滤掉空行和注释行（以 # 开头）
      const allLines = text.split('\n')
      const lines = allLines.filter(line => {
        const trimmed = line.trim()
        if (!trimmed) return false
        // 跳过以 # 开头的注释/说明行（模板中的提示行）
        if (trimmed.startsWith('#') || trimmed.startsWith('"#')) return false
        return true
      })

      if (lines.length < 2) {
        setToast('文件格式不正确，至少需要包含表头和一条数据')
        setTimeout(() => setToast(''), 3000)
        return
      }

      // 找到表头行（第一个包含"订单号"的行）
      let headerLineIdx = -1
      for (let i = 0; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])
        if (row.some(cell => cell.includes('订单号') && !cell.startsWith('#'))) {
          headerLineIdx = i
          break
        }
      }
      if (headerLineIdx < 0) {
        setToast('文件缺少"订单号"列，请检查模板格式')
        setTimeout(() => setToast(''), 3000)
        return
      }

      const headers = parseCSVLine(lines[headerLineIdx])

      // 辅助：查找列索引（精确匹配列名）
      const colIdx = (name: string) => headers.findIndex(h => h === name)

      // 辅助：查找包含关键词的列索引（用于兼容不同的列名格式）
      const colIdxLike = (...keywords: string[]) => {
        return headers.findIndex(h => keywords.some(kw => h.includes(kw)))
      }

      // 映射各列索引
      const idxOrderNo       = colIdx('订单号')
      const idxRoute         = colIdxLike('路线')
      const idxDepartCity    = colIdxLike('出发城市')
      const idxCustomerName  = colIdx('下单人')
      const idxCustomerPhone = colIdx('下单人手机')
      const idxOrderTime     = colIdx('下单时间')
      // "出发时间"需要排除"下单时间"的干扰
      const idxDepartTime    = headers.findIndex(h => h === '出发时间')
      const idxEndTime       = colIdxLike('结束时间')
      const idxTripDuration  = colIdxLike('用车时长')
      const idxCarName       = colIdx('车辆')
      const idxCarModel      = colIdxLike('车型')
      const idxSeats         = colIdxLike('座位数')
      // 套餐：模板用"套餐类型(按小时/按天)"，导出用"套餐"
      const idxPackageType   = headers.findIndex(h => h.includes('套餐类型'))
      const idxPackage       = colIdx('套餐') // 导出格式的套餐列（如 "按小时·4小时"）
      const idxDuration      = colIdxLike('时长')  // 模板中单独的时长列
      const idxAmount        = colIdx('金额')
      const idxServiceFee    = colIdxLike('服务费')
      const idxTotal         = colIdx('合计') // 模板中的合计列
      const idxDriver        = colIdxLike('司机') // 会在 headers 中找包含"司机"的列
      const idxStatus        = colIdxLike('状态')
      const idxContract      = colIdxLike('合同', '关联合同')
      const idxOrderType     = colIdx('订单类型')
      const idxBusinessType  = colIdx('业务类型')
      const idxPaymentStatus = colIdx('支付状态')
      const idxAcceptStatus  = colIdx('接单状态')
      const idxDispatchStatus = colIdx('调度状态')


      if (idxOrderNo < 0) {
        setToast('文件缺少"订单号"列，请检查模板格式')
        setTimeout(() => setToast(''), 3000)
        return
      }

      // 状态名校验
      const VALID_STATUSES: OrderStatus[] = ['待付款', '待接单', '待派车', '进行中', '已完成', '已取消', '已关闭']


      let importCount = 0
      let updateCount = 0
      let addCount = 0

      for (let i = headerLineIdx + 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        const orderNo = cols[idxOrderNo]?.trim()
        if (!orderNo) continue
        // 跳过示例数据行
        if (orderNo === 'HY20260709001' && cols.length <= 2) continue

        const getVal = (idx: number) => idx >= 0 ? cols[idx]?.trim() || '' : ''

        // 解析套餐类型和时长
        let packageType: 'hourly' | 'daily' = 'hourly'
        let duration = '4小时'

        if (idxPackageType >= 0) {
          // 模板格式：独立的套餐类型和时长列
          const ptRaw = getVal(idxPackageType)
          packageType = ptRaw.includes('按天') ? 'daily' : 'hourly'
          if (idxDuration >= 0) duration = getVal(idxDuration) || '4小时'
        } else if (idxPackage >= 0) {
          // 导出格式：套餐列如 "按小时·4小时"
          const pkgStr = getVal(idxPackage)
          packageType = pkgStr.includes('按天') ? 'daily' : 'hourly'
          const durMatch = pkgStr.match(/(\d+小时|\d+天)/)
          if (durMatch) duration = durMatch[1]
        }

        // 解析金额：优先合计列，其次金额列
        const rawAmount = getVal(idxAmount).replace(/¥/g, '').replace(/,/g, '')
        const rawTotal  = idxTotal >= 0 ? getVal(idxTotal).replace(/¥/g, '').replace(/,/g, '') : rawAmount
        const rawServiceFee = getVal(idxServiceFee).replace(/¥/g, '').replace(/,/g, '')
        const amountNum     = parseFloat(rawAmount) || 0
        const totalNum      = parseFloat(rawTotal) || amountNum
        const serviceFeeNum = parseFloat(rawServiceFee) || (totalNum > amountNum ? totalNum - amountNum : 20)

        // 解析状态
        let status: OrderStatus = '待付款'
        const statusRaw = getVal(idxStatus)

        if (statusRaw && VALID_STATUSES.includes(statusRaw as OrderStatus)) {
          status = statusRaw as OrderStatus
        }

        const existing = orders.find(o => o.orderNo === orderNo)
        if (existing) {
          // 更新已有订单
          if (idxRoute >= 0 && getVal(idxRoute)) existing.route = getVal(idxRoute)
          if (idxDepartCity >= 0 && getVal(idxDepartCity)) existing.departCity = getVal(idxDepartCity)
          if (idxCustomerName >= 0 && getVal(idxCustomerName)) existing.customerName = getVal(idxCustomerName)
          if (idxCustomerPhone >= 0 && getVal(idxCustomerPhone)) existing.customerPhone = getVal(idxCustomerPhone)
          if (idxOrderTime >= 0 && getVal(idxOrderTime)) existing.orderTime = getVal(idxOrderTime)
          if (idxDepartTime >= 0 && getVal(idxDepartTime)) existing.departTime = getVal(idxDepartTime)
          if (idxEndTime >= 0) existing.endTime = getVal(idxEndTime) || undefined
          if (idxTripDuration >= 0) existing.tripDuration = getVal(idxTripDuration) || undefined
          if (idxCarName >= 0 && getVal(idxCarName)) existing.carName = getVal(idxCarName)
          if (idxCarModel >= 0 && getVal(idxCarModel)) existing.carModel = getVal(idxCarModel)
          if (idxSeats >= 0 && getVal(idxSeats)) existing.seats = getVal(idxSeats)
          existing.packageType = packageType
          if (duration) existing.duration = duration
          if (totalNum > 0) {
            existing.amount = amountNum || totalNum - serviceFeeNum
            existing.serviceFee = serviceFeeNum
            existing.total = totalNum
          }
          if (idxDriver >= 0) existing.driverName = getVal(idxDriver) || undefined
          if (idxStatus >= 0 && getVal(idxStatus)) existing.status = status
          if (idxContract >= 0) existing.contractId = getVal(idxContract) || undefined
          if (idxOrderType >= 0 && getVal(idxOrderType)) existing.orderType = getVal(idxOrderType) as OrderInfo['orderType']
          if (idxBusinessType >= 0 && getVal(idxBusinessType)) {
            const rawBizType = getVal(idxBusinessType)
            existing.businessType = (rawBizType === '上下班' ? 'commute' : rawBizType === '定制包车' ? 'custom' : 'charter') as BizType
          }
          if (idxPaymentStatus >= 0 && getVal(idxPaymentStatus)) existing.paymentStatus = getVal(idxPaymentStatus) as OrderInfo['paymentStatus']
          if (idxAcceptStatus >= 0 && getVal(idxAcceptStatus)) existing.acceptStatus = getVal(idxAcceptStatus) as OrderInfo['acceptStatus']
          if (idxDispatchStatus >= 0 && getVal(idxDispatchStatus)) existing.dispatchStatus = getVal(idxDispatchStatus) as OrderInfo['dispatchStatus']
          updateCount++
        } else {
          orders.push({
            id: orderNo,
            orderNo,
            route: getVal(idxRoute),
            departCity: getVal(idxDepartCity),
            customerName: getVal(idxCustomerName) || undefined,
            customerPhone: getVal(idxCustomerPhone) || undefined,
            orderTime: getVal(idxOrderTime) || new Date().toISOString().slice(0, 16).replace('T', ' '),
            departTime: getVal(idxDepartTime),
            endTime: getVal(idxEndTime) || undefined,
            tripDuration: getVal(idxTripDuration) || undefined,
            packageType,
            duration,
            carName: getVal(idxCarName),
            carModel: getVal(idxCarModel),
            seats: getVal(idxSeats) || '5座',
            amount: amountNum || totalNum - serviceFeeNum,
            serviceFee: serviceFeeNum,
            total: totalNum,
            status,
            orderType: (getVal(idxOrderType) || '普通用户订单') as OrderInfo['orderType'],
            businessType: (() => {
              const rawBizType = getVal(idxBusinessType)
              return (rawBizType === '上下班' ? 'commute' : rawBizType === '定制包车' ? 'custom' : 'charter') as BizType
            })(),
            paymentStatus: (getVal(idxPaymentStatus) || '未支付') as OrderInfo['paymentStatus'],
            acceptStatus: (getVal(idxAcceptStatus) || '未接单') as OrderInfo['acceptStatus'],
            dispatchStatus: (getVal(idxDispatchStatus) || '未派车') as OrderInfo['dispatchStatus'],
            createdAt: new Date().toISOString().slice(0, 10),
            driverName: getVal(idxDriver) || undefined,
            driverPhone: undefined,
            contractId: getVal(idxContract) || undefined,
          })
          addCount++
        }

        importCount++
      }

      const msgParts: string[] = []
      if (addCount > 0) msgParts.push(`新增 ${addCount} 条`)
      if (updateCount > 0) msgParts.push(`更新 ${updateCount} 条`)
      setToast(`成功导入 ${msgParts.join('，')}`)
      setTimeout(() => setToast(''), 3000)
      setShowImportModal(false)
    }
    reader.readAsText(file, 'UTF-8')

    // 重置 input 以便重复选择同一文件
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      // 模拟 input change 事件来复用解析逻辑
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  // ========== 手动录入 ==========
  const handleManualSubmit = async () => {
    const { bizType, customerName, customerPhone, carName, seats, rideCount, amount, deposit, contractId, remark } = manualForm
    if (!customerName || !customerPhone || !carName) {
      setToast('请填写客户姓名、电话和车型')
      setTimeout(() => setToast(''), 2000)
      return
    }
    try {
      await createManualOrder({ bizType, customerName, customerPhone, carName, seats, rideCount, amount, deposit, contractId: contractId || undefined, remark: remark || undefined })
      setShowManualModal(false)
      setManualForm({ bizType: 'commute', customerName: '', customerPhone: '', carName: '', seats: '5座', rideCount: 1, amount: 0, deposit: 0, contractId: '', remark: '' })
      setToast('订单录入成功')
      setTimeout(() => setToast(''), 2000)
      // 刷新订单列表
      getAdminOrders({ pageSize: 100, businessType: businessTypeFilter !== 'all' ? businessTypeFilter : undefined }).then(r => setOrders(r.list as any)).catch(() => {})
    } catch {
      setToast('录入失败，请稍后重试')
      setTimeout(() => setToast(''), 2000)
    }
  }

  // ========== 结账 ==========
  const handleSettlementSubmit = async () => {
    if (!settlementOrder || settlementAmount <= 0) {
      setToast('请输入有效的结账金额')
      setTimeout(() => setToast(''), 2000)
      return
    }
    try {
      await settleOrder(settlementOrder.id, settlementAmount)
      setShowSettlement(false)
      setSettlementOrder(null)
      setSettlementAmount(0)
      setToast('结账成功')
      setTimeout(() => setToast(''), 2000)
      // 刷新
      getAdminOrders({ pageSize: 100, businessType: businessTypeFilter !== 'all' ? businessTypeFilter : undefined }).then(r => setOrders(r.list as any)).catch(() => {})
    } catch {
      setToast('结账失败，请稍后重试')
      setTimeout(() => setToast(''), 2000)
    }
  }

  // 是否有筛选条件激活
  const hasFilters = orderTimeFrom || orderTimeTo || departTimeFrom || departTimeTo

  const clearDateFilters = () => {
    setOrderTimeFrom('')
    setOrderTimeTo('')
    setDepartTimeFrom('')
    setDepartTimeTo('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">订单管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理包车订单、上下班订单、定制包车订单，审核派单，跟踪订单状态</p>
        </div>
        <div className="flex items-center gap-2">
          {isSettlement && (
            <button
              onClick={() => {
                setManualForm(prev => ({ ...prev, bizType: businessTypeFilter as 'commute' | 'custom' }))
                setShowManualModal(true)
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              手动录入
            </button>
          )}
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-primary/30 transition-colors"
          >
            <Upload className="w-4 h-4" />
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* 业务类型筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {businessTypeTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setBusinessTypeFilter(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              businessTypeFilter === tab.key
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col gap-3">
        {/* 搜索 + 状态 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索订单号、路线、下单人、司机..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {/* 关联组织筛选 */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={orgFilter}
              onChange={e => setOrgFilter(e.target.value)}
              className="appearance-none w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              <option value="all">全部组织</option>
              <option value="none">未关联组织</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {statusTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 日期筛选 */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl">
          {/* 下单时间 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 shrink-0">下单时间</span>
            <input
              type="date"
              value={orderTimeFrom}
              onChange={e => setOrderTimeFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="text-xs text-slate-400">至</span>
            <input
              type="date"
              value={orderTimeTo}
              onChange={e => setOrderTimeTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* 分隔线 */}
          <div className="hidden sm:block w-px h-6 bg-slate-200" />

          {/* 出发时间 */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 shrink-0">出发时间</span>
            <input
              type="date"
              value={departTimeFrom}
              onChange={e => setDepartTimeFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="text-xs text-slate-400">至</span>
            <input
              type="date"
              value={departTimeTo}
              onChange={e => setDepartTimeTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearDateFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              清除日期筛选
            </button>
          )}
        </div>
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {isSettlement ? (
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-3 font-medium">订单号</th>
                  <th className="py-3 px-3 font-medium">下单人</th>
                  <th className="py-3 px-3 font-medium">路线</th>
                  <th className="py-3 px-3 font-medium">下单时间</th>
                  <th className="py-3 px-3 font-medium">开始用车时间</th>
                  <th className="py-3 px-3 font-medium">结束用车时间</th>
                  <th className="py-3 px-3 font-medium">车辆</th>
                  <th className="py-3 px-3 font-medium">合同编号</th>
                  <th className="py-3 px-3 font-medium">订单类型</th>
                  <th className="py-3 px-3 font-medium">关联组织</th>
                  <th className="py-3 px-3 font-medium">支付状态</th>
                  <th className="py-3 px-3 font-medium">接单状态</th>
                  <th className="py-3 px-3 font-medium">调度状态</th>
                  <th className="py-3 px-3 font-medium">订单状态</th>
                  <th className="py-3 px-3 font-medium">用车次数</th>
                  <th className="py-3 px-3 font-medium">订单定金</th>
                  <th className="py-3 px-3 font-medium">应收款</th>
                  <th className="py-3 px-3 font-medium">已收款</th>
                  <th className="py-3 px-3 font-medium">操作</th>
                </tr>
              ) : (
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-3 font-medium">订单号</th>
                  <th className="py-3 px-3 font-medium">下单人</th>
                  <th className="py-3 px-3 font-medium">路线</th>
                  <th className="py-3 px-3 font-medium">下单时间</th>
                  <th className="py-3 px-3 font-medium">出发时间</th>
                  <th className="py-3 px-3 font-medium">结束时间</th>
                  <th className="py-3 px-3 font-medium">用车时长</th>
                  <th className="py-3 px-3 font-medium">车辆</th>
                  <th className="py-3 px-3 font-medium">套餐</th>
                  <th className="py-3 px-3 font-medium">金额</th>
                  <th className="py-3 px-3 font-medium">司机</th>
                  <th className="py-3 px-3 font-medium">合同</th>
                  <th className="py-3 px-3 font-medium">订单类型</th>
                  <th className="py-3 px-3 font-medium">业务类型</th>
                  <th className="py-3 px-3 font-medium">关联组织</th>
                  <th className="py-3 px-3 font-medium">支付状态</th>
                  <th className="py-3 px-3 font-medium">接单状态</th>
                  <th className="py-3 px-3 font-medium">调度状态</th>
                  <th className="py-3 px-3 font-medium">订单状态</th>
                  <th className="py-3 px-3 font-medium">操作</th>
                </tr>
              )}

            </thead>
            <tbody>
              {filtered.map(order => {
                if (isSettlement) {
                  const depositAmount = order.deposit || 0
                  const receivable = order.total || 0
                  const receivedAmount = depositAmount + (order.paidAmount || 0)
                  return (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="py-3 px-3 text-sm font-mono text-slate-600 whitespace-nowrap">{order.orderNo}</td>
                      <td className="py-3 px-3 text-sm text-slate-600 whitespace-nowrap">
                        <div>
                          <span className="font-medium">{order.customerName || '-'}</span>
                          {order.customerPhone && <div className="text-xs text-slate-400 mt-0.5">{order.customerPhone}</div>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-700 max-w-[150px] truncate">{order.route}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.orderTime}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.departTime}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.endTime || '-'}</td>
                      <td className="py-3 px-3 text-sm text-slate-600 whitespace-nowrap">{order.carName}</td>
                      <td className="py-3 px-3 text-sm whitespace-nowrap">
                        {order.contractId ? (
                          <span className="inline-flex items-center gap-1 text-primary text-xs">
                            <FileText className="w-3 h-3" />{order.contractId}
                          </span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.orderType}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.orgName || '-'}</td>
                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          order.paymentStatus === '未支付' ? 'bg-amber-50 text-amber-600' :
                          order.paymentStatus === '已支付' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>{order.paymentStatus}</span>
                      </td>
                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          order.acceptStatus === '未接单' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                        }`}>{order.acceptStatus}</span>
                      </td>
                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          order.dispatchStatus === '未派车' ? 'bg-slate-100 text-slate-500' :
                          order.dispatchStatus === '已派车' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>{order.dispatchStatus}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === '待付款' || order.status === '待接单' ? 'bg-orange-50 text-orange-600' :
                          order.status === '待派车' ? 'bg-blue-50 text-blue-600' :
                          order.status === '进行中' ? 'bg-indigo-50 text-indigo-600' :
                          order.status === '已完成' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="w-3 h-3 text-slate-400" />
                          {order.rideCount || 1} 次
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm whitespace-nowrap">
                        <span className="font-medium text-amber-600">¥{depositAmount}</span>
                      </td>
                      <td className="py-3 px-3 text-sm whitespace-nowrap">
                        <span className="font-bold text-slate-700">¥{receivable}</span>
                      </td>
                      <td className="py-3 px-3 text-sm whitespace-nowrap">
                        <span className={`font-medium ${
                          receivedAmount >= receivable ? 'text-emerald-600' :
                          receivedAmount > depositAmount ? 'text-blue-600' : 'text-slate-500'
                        }`}>¥{receivedAmount}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 text-slate-500 hover:text-primary transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            查看
                          </button>
                          <button
                            onClick={() => handleDelete(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                            title="删除订单"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="py-3 px-3 text-sm font-mono text-slate-600 whitespace-nowrap">{order.orderNo}</td>
                    <td className="py-3 px-3 text-sm text-slate-600 whitespace-nowrap">
                      <div>
                        <span className="font-medium">{order.customerName || '-'}</span>
                        {order.customerPhone && <div className="text-xs text-slate-400 mt-0.5">{order.customerPhone}</div>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700 max-w-[150px] truncate">{order.route}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.orderTime}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.departTime}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.endTime || '-'}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.tripDuration || '-'}</td>
                    <td className="py-3 px-3 text-sm text-slate-600 whitespace-nowrap">{order.carName}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {order.packageType === 'hourly' ? '按小时' : '按天'}·{order.duration}
                    </td>
                    <td className="py-3 px-3 text-sm whitespace-nowrap">
                      {order.businessType !== 'charter' && (order.deposit || 0) > 0 ? (
                        <div>
                          <span className="text-xs text-slate-400">定金 </span>
                          <span className="font-medium text-amber-600">¥{order.deposit}</span>
                          <span className="text-xs text-slate-300"> / </span>
                          <span className="text-slate-500">¥{order.total}</span>
                        </div>
                      ) : (
                        <span className="font-medium text-slate-700">¥{order.total}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 whitespace-nowrap">{order.driverName || '-'}</td>
                    <td className="py-3 px-3 text-sm whitespace-nowrap">
                      {order.contractId ? (
                        <span className="inline-flex items-center gap-1 text-primary text-xs">
                          <FileText className="w-3 h-3" />{order.contractId}
                        </span>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.orderType}</td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        order.businessType === 'charter' ? 'bg-sky-50 text-sky-600' :
                        order.businessType === 'commute' ? 'bg-violet-50 text-violet-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {order.businessType === 'charter' ? '包车' :
                         order.businessType === 'commute' ? '上下班' :
                         order.businessType === 'custom' ? '定制包车' : order.businessType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{order.orgName || '-'}</td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        order.paymentStatus === '未支付' ? 'bg-amber-50 text-amber-600' :
                        order.paymentStatus === '已支付' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>{order.paymentStatus}</span>
                    </td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        order.acceptStatus === '未接单' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                      }`}>{order.acceptStatus}</span>
                    </td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        order.dispatchStatus === '未派车' ? 'bg-slate-100 text-slate-500' :
                        order.dispatchStatus === '已派车' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>{order.dispatchStatus}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === '待付款' || order.status === '待接单' ? 'bg-orange-50 text-orange-600' :
                        order.status === '待派车' ? 'bg-blue-50 text-blue-600' :
                        order.status === '进行中' ? 'bg-indigo-50 text-indigo-600' :
                        order.status === '已完成' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 text-slate-500 hover:text-primary transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          查看
                        </button>
                        {(order.businessType === 'commute' || order.businessType === 'custom') && order.settlement !== 'done' && (
                          <button
                            onClick={() => { setSettlementOrder(order); setSettlementAmount(order.balanceAmount || 0); setShowSettlement(true) }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors"
                            title="结账"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            结账
                          </button>
                        )}
                        {(order.status === '待接单' || (order.status === '待付款' && order.orderType === '大客户订单')) && (
                          <button
                            onClick={() => handleAccept(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors"
                            title={order.status === '待付款' ? '大客户月结，直接接单' : '确认接单'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            接单
                          </button>
                        )}

                        {order.status === '进行中' && (
                          <button
                            onClick={() => handleComplete(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors"
                            title="完成订单"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            完成
                          </button>
                        )}
                        {order.status === '待付款' && (
                          <button
                            onClick={() => handleDelete(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                            title="删除订单"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </button>
                        )}
                        {order.status === '已取消' && (
                          <button
                            onClick={() => handleDelete(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                            title="删除订单"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            删除
                          </button>
                        )}
                        {getRollbackTarget(order) && (
                          <button
                            onClick={() => handleRollbackClick(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors"
                            title={`回滚至「${getRollbackTarget(order)}」`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            回滚
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>

          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">暂无订单数据</div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            共 {filtered.length} 条订单
            {hasFilters && <span>（已筛选）</span>}
          </div>
        )}
      </div>

      {/* 订单详情弹窗 */}
      {selectedOrder && !showDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">订单详情 - {selectedOrder.orderNo}</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">订单类型</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.orderType}</p>
                </div>
                <div>
                  <span className="text-slate-400">业务类型</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedOrder.businessType === 'charter' ? '包车' :
                     selectedOrder.businessType === 'commute' ? '上下班' :
                     selectedOrder.businessType === 'custom' ? '定制包车' : selectedOrder.businessType}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">支付状态</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.paymentStatus}</p>
                </div>
                <div>
                  <span className="text-slate-400">接单状态</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.acceptStatus}</p>
                </div>
                <div>
                  <span className="text-slate-400">调度状态</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.dispatchStatus}</p>
                </div>
                <div>
                  <span className="text-slate-400">订单状态</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.status}</p>
                </div>
                <div>
                  <span className="text-slate-400">出发城市</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.departCity}</p>
                </div>

                <div>
                  <span className="text-slate-400">下单人</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.customerName || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400">下单人手机</span>
                  <p className="font-medium text-accent mt-0.5">{selectedOrder.customerPhone || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400">路线</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.route}</p>
                </div>
                <div>
                  <span className="text-slate-400">下单时间</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.orderTime}</p>
                </div>
                <div>
                  <span className="text-slate-400">出发时间</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.departTime}</p>
                </div>
                <div>
                  <span className="text-slate-400">结束时间</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.endTime || '进行中'}</p>
                </div>
                <div>
                  <span className="text-slate-400">用车时长</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.tripDuration || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400">车辆类型</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.carName} / {selectedOrder.carModel}</p>
                </div>
                <div>
                  <span className="text-slate-400">套餐</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.packageType === 'hourly' ? '按小时' : '按天'} · {selectedOrder.duration}</p>
                </div>
                <div>
                  <span className="text-slate-400">车辆费</span>
                  <p className="font-medium text-slate-800 mt-0.5">¥{selectedOrder.amount}</p>
                </div>
                <div>
                  <span className="text-slate-400">服务费</span>
                  <p className="font-medium text-slate-800 mt-0.5">¥{selectedOrder.serviceFee}</p>
                </div>
                <div>
                  <span className="text-slate-400">合计</span>
                  <p className="font-bold text-primary text-lg mt-0.5">¥{selectedOrder.total}</p>
                </div>
                <div>
                  <span className="text-slate-400">司机</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.driverName || '未分配'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">关联合同</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedOrder.contractId || '未关联'}
                  </p>
                </div>
              </div>

              {/* 结算信息卡片（上下班/定制包车订单） */}
              {(selectedOrder.businessType === 'commute' || selectedOrder.businessType === 'custom') && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-700">结算信息</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs">用车次数</span>
                      <p className="font-medium text-slate-800 mt-0.5">{selectedOrder.rideCount || 1} 次</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">订单总额</span>
                      <p className="font-bold text-primary mt-0.5">¥{selectedOrder.total}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">定金</span>
                      <p className="font-medium text-amber-600 mt-0.5">¥{selectedOrder.deposit || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">已付金额</span>
                      <p className="font-medium text-emerald-600 mt-0.5">¥{(selectedOrder.paidAmount || 0) + (selectedOrder.deposit || 0)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">待结余额</span>
                      <p className="font-medium text-red-500 mt-0.5">¥{selectedOrder.balanceAmount || (selectedOrder.total - (selectedOrder.deposit || 0))}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">结账状态</span>
                      <p className="mt-0.5">
                        {(selectedOrder.settlement === 'done') ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600">已结清</span>
                        ) : (selectedOrder.settlement === 'partial') ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">部分结账</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-500">待结账</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedOrder.remark && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-400 text-xs">备注</span>
                      <p className="text-sm text-slate-600 mt-0.5">{selectedOrder.remark}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              {/* 结账按钮（上下班/定制包车，未结清） */}
              {(selectedOrder.businessType === 'commute' || selectedOrder.businessType === 'custom') && selectedOrder.settlement !== 'done' && (
                <button
                  onClick={() => { 
                    setSettlementOrder(selectedOrder); 
                    setSettlementAmount(selectedOrder.balanceAmount || 0); 
                    setShowSettlement(true) 
                  }}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-medium text-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Wallet className="w-4 h-4" />
                  结账
                </button>
              )}
              {(selectedOrder.status === '待付款' || selectedOrder.status === '待接单') && (
                <button
                  onClick={() => handleAccept(selectedOrder)}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 transition-colors"
                >
                  确认接单
                </button>
              )}

              {selectedOrder.status === '进行中' && (
                <button
                  onClick={() => handleComplete(selectedOrder)}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 transition-colors"
                >
                  完成订单
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 派单弹窗 */}
      {showDispatch && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDispatch(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">派单 - {selectedOrder.orderNo}</h3>
              <button onClick={() => setShowDispatch(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* 订单摘要 */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span>{selectedOrder.route}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{selectedOrder.departTime}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Truck className="w-4 h-4 text-slate-500" />
                  <span>{selectedOrder.carName} · ¥{selectedOrder.total}</span>
                </div>
              </div>

              {/* 选择司机 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />选择司机
                </label>
                {(() => {
                  // 优先使用 API 获取的真实司机，Mock 作为降级
                  const driverList = drivers.length > 0 ? drivers : MOCK_DRIVERS
                  // 只显示与订单同一车队（组织）的在线司机
                  const onlineDrivers = driverList.filter(d => {
                    if (d.status !== 'online') return false
                    if (selectedOrder.orgId && d.orgId && d.orgId !== selectedOrder.orgId) return false
                    return true
                  })
                  const availableDrivers = onlineDrivers.filter(d => {
                    const driverOrders = orders.filter(o =>
                      o.driverName === d.name &&
                      !['已完成', '已取消', '已关闭'].includes(o.status) &&
                      o.id !== selectedOrder.id &&
                      o.departTime && o.endTime
                    )
                    if (driverOrders.length === 0) return true
                    const hasConflict = driverOrders.some(o => {
                      if (!selectedOrder.departTime || !selectedOrder.endTime) return false
                      return selectedOrder.departTime < o.endTime! && selectedOrder.endTime! > o.departTime
                    })
                    return !hasConflict
                  })
                  const conflictCount = onlineDrivers.length - availableDrivers.length
                  return (
                    <>
                      {conflictCount > 0 && (
                        <div className="flex items-center gap-1.5 mb-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{conflictCount} 名在线司机在该时段已有其他订单，自动过滤</span>
                        </div>
                      )}
                      <select
                        value={dispatchDriver}
                        onChange={e => setDispatchDriver(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">请选择司机</option>
                        {availableDrivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} - {d.vehiclePlate} ({d.vehicleType}) ★{d.rating}
                          </option>
                        ))}
                      </select>
                      {availableDrivers.length === 0 && onlineDrivers.length > 0 && (
                        <p className="text-xs text-red-500 mt-1.5">当前时段所有在线司机均有冲突订单，无法派单</p>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* 选择合同 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />关联包车合同
                </label>
                <p className="text-xs text-slate-400 mb-2">每个合同仅可关联一个订单，选择合同前请确认未被占用</p>
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {contracts.map(c => {
                    const isLinked = !!(c.orderNo && c.orderNo !== selectedOrder.orderNo)

                    return (
                      <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isLinked
                          ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
                          : dispatchContract === c.id
                            ? 'border-primary bg-primary/5 cursor-pointer'
                            : 'border-slate-200 hover:border-primary/30 cursor-pointer'
                      }`}>
                        <input
                          type="radio"
                          name="contract"
                          value={c.id}
                          checked={dispatchContract === c.id}
                          onChange={e => !isLinked && setDispatchContract(e.target.value)}
                          disabled={isLinked}
                          className="accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {c.contractNo} — {c.partyA} ⇄ {c.partyB}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{c.origin} → {c.destination} | {c.plateNo} | {c.driverName}</p>
                        </div>
                        {isLinked ? (
                          <span className="text-xs text-amber-500 flex items-center gap-1 shrink-0">
                            <Link2 className="w-3 h-3" />已关联{c.orderNo}
                          </span>
                        ) : c.orderNo ? (
                          <span className="text-xs text-primary flex items-center gap-1 shrink-0">
                            <Link2 className="w-3 h-3" />当前订单
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-500 shrink-0">可用</span>
                        )}
                      </label>
                    )
                  })}
                  {contracts.length === 0 && (
                    <div className="text-sm text-slate-400 text-center py-4">
                      暂无可用的合同，请先在合同管理中同步或创建合同
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={handleDispatch}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                确认派单
              </button>
              <button
                onClick={() => setShowDispatch(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">导入订单</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 下载模板 */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-blue-800">下载导入模板</p>
                  <p className="text-xs text-blue-500 mt-0.5">下载标准 CSV 模板，按格式填充数据</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
                >
                  <Download className="w-4 h-4" />
                  下载模板
                </button>
              </div>

              {/* 分隔 */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">上传文件</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* 上传区域 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
                }`}
              >
                <FileUp className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-primary' : 'text-slate-300'}`} />
                <p className="text-sm font-medium text-slate-600">
                  {dragOver ? '松开鼠标上传文件' : '点击上传或拖拽文件到此处'}
                </p>
                <p className="text-xs text-slate-400 mt-1">支持 .csv、.txt 格式文件</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手动录入弹窗 */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowManualModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">
                手动录入 - {manualForm.bizType === 'commute' ? '上下班订单' : '定制包车订单'}
              </h3>
              <button onClick={() => setShowManualModal(false)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 客户信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">客户姓名 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={manualForm.customerName}
                    onChange={e => setManualForm(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="请输入客户姓名"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">联系电话 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={manualForm.customerPhone}
                    onChange={e => setManualForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="请输入手机号"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* 车型信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">车辆型号 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={manualForm.carName}
                    onChange={e => setManualForm(prev => ({ ...prev, carName: e.target.value }))}
                    placeholder="如：舒适型 7座"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">座位数</label>
                  <select
                    value={manualForm.seats}
                    onChange={e => setManualForm(prev => ({ ...prev, seats: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="5座">5座</option>
                    <option value="7座">7座</option>
                    <option value="19座">19座</option>
                    <option value="33座">33座</option>
                    <option value="45座">45座</option>
                  </select>
                </div>
              </div>

              {/* 金额信息 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">用车次数 <span className="text-red-400">*</span></label>
                  <div className="flex items-center gap-1">
                    <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="number"
                      min={1}
                      value={manualForm.rideCount}
                      onChange={e => setManualForm(prev => ({ ...prev, rideCount: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">订单总价 <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={manualForm.amount || ''}
                    onChange={e => setManualForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="¥0.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">定金</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={manualForm.deposit || ''}
                    onChange={e => setManualForm(prev => ({ ...prev, deposit: parseFloat(e.target.value) || 0 }))}
                    placeholder="¥0.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* 合同和备注 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">关联合同</label>
                  <select
                    value={manualForm.contractId}
                    onChange={e => setManualForm(prev => ({ ...prev, contractId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">不关联</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.contractNo} - {c.partyA}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">备注</label>
                  <input
                    type="text"
                    value={manualForm.remark}
                    onChange={e => setManualForm(prev => ({ ...prev, remark: e.target.value }))}
                    placeholder="订单备注（选填）"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={handleManualSubmit}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                确认录入
              </button>
              <button
                onClick={() => setShowManualModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结账弹窗 */}
      {showSettlement && settlementOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowSettlement(false); setSettlementOrder(null); setSettlementAmount(0) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">订单结账</h3>
              <button onClick={() => { setShowSettlement(false); setSettlementOrder(null); setSettlementAmount(0) }} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 订单摘要 */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">订单编号</span>
                  <span className="font-mono text-slate-700">{settlementOrder.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">客户</span>
                  <span className="text-slate-700">{settlementOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">订单总额</span>
                  <span className="font-bold text-slate-700">¥{settlementOrder.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">已付定金</span>
                  <span className="text-amber-600">¥{settlementOrder.deposit || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">已结金额</span>
                  <span className="text-emerald-600">¥{settlementOrder.paidAmount || 0}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500 font-medium">待结余额</span>
                  <span className="font-bold text-red-500">¥{settlementOrder.balanceAmount || (settlementOrder.total - (settlementOrder.deposit || 0) - (settlementOrder.paidAmount || 0))}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">本次结账金额 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={settlementAmount || ''}
                    onChange={e => setSettlementAmount(parseFloat(e.target.value) || 0)}
                    placeholder="输入本次结账金额"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  待结余额 ¥{settlementOrder.balanceAmount || (settlementOrder.total - (settlementOrder.deposit || 0) - (settlementOrder.paidAmount || 0))}，输入金额将从已结金额中累加
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={handleSettlementSubmit}
                className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                确认结账
              </button>
              <button
                onClick={() => { setShowSettlement(false); setSettlementOrder(null); setSettlementAmount(0) }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回滚确认弹窗 */}
      {showRollbackConfirm && rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowRollbackConfirm(false); setRollbackTarget(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">确认回滚订单</h3>
              <p className="text-sm text-slate-500 mb-1">
                <span className="font-mono text-slate-700">{rollbackTarget.order.orderNo}</span>
              </p>
              <p className="text-sm text-slate-500 mb-4">
                将订单从 <span className="font-medium text-amber-600">「{rollbackTarget.order.status}」</span> 回滚至 <span className="font-medium text-primary">「{rollbackTarget.targetStatus}」</span>
              </p>
              {(rollbackTarget.targetStatus === '待付款' || rollbackTarget.targetStatus === '待接单') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    回滚到「{rollbackTarget.targetStatus}」将同时：<br />
                    · 释放已分配司机<br />
                    · 解除合同关联关系<br />
                    · 重置调度任务
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400">此操作可撤销，回滚后仍可重新派单</p>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => { setShowRollbackConfirm(false); setRollbackTarget(null) }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRollbackConfirm}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-medium text-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                确认回滚
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}
 
export default OrderManagePage
