import { useState, useEffect, useMemo } from 'react'
import { MapPin, Navigation, Star, Truck, UserCheck, Phone, FileText, Link2, X, Clock, AlertTriangle } from 'lucide-react'
import type { OrderInfo, DriverInfo, ContractInfo, BizType } from '@/types'
import { getAdminOrders, getDrivers, getContracts, dispatchOrder, checkVehicleConflict } from '@/api/modules/admin'
import { MOCK_MAP_VEHICLES, MOCK_DRIVERS } from '@/data/adminDefaults'

interface RecommendedDriver extends DriverInfo {
  score: number
  distance: number
  eta: number
}

const PLACES = [
  { name: '中关村', x: 18, y: 22 },
  { name: 'T3航站楼', x: 75, y: 30 },
  { name: '西二旗', x: 35, y: 55 },
  { name: '望京SOHO', x: 62, y: 68 },
  { name: '国贸', x: 48, y: 42 },
]

function matchScore(order: OrderInfo, driver: DriverInfo) {
  let score = 50
  const orderType = order.carName || ''
  const driverType = driver.vehicleType || ''
  if (orderType.includes(driverType.split(' ')[0]) || driverType.includes(orderType.split(' ')[0])) {
    score += 30
  }
  if (driver.status === 'online') score += 10
  score += Math.min(driver.rating * 6, 30)
  return Math.min(Math.round(score), 99)
}

// 规范化时间字符串：将 "今天 14:00"、"明天 10:00" 等转为标准 YYYY-MM-DD HH:mm
function normalizeTime(timeStr: string | undefined): string | null {
  if (!timeStr) return null
  const today = new Date()
  const dateStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0')

  let result = timeStr
  result = result.replace(/今天\s*/g, dateStr + ' ')
  result = result.replace(/明天\s*/g, (() => {
    const t = new Date(today)
    t.setDate(t.getDate() + 1)
    return t.getFullYear() + '-' +
      String(t.getMonth() + 1).padStart(2, '0') + '-' +
      String(t.getDate()).padStart(2, '0') + ' '
  })())
  result = result.replace(/后天\s*/g, (() => {
    const t = new Date(today)
    t.setDate(t.getDate() + 2)
    return t.getFullYear() + '-' +
      String(t.getMonth() + 1).padStart(2, '0') + '-' +
      String(t.getDate()).padStart(2, '0') + ' '
  })())
  return result
}

// 检查司机的订单时间是否与目标订单冲突
function hasTimeConflict(order: OrderInfo, driverOrders: OrderInfo[]): boolean {
  const orderStart = normalizeTime(order.departTime)
  const orderEnd = normalizeTime(order.endTime)
  if (!orderStart || !orderEnd) return false

  return driverOrders.some(o => {
    const oStart = normalizeTime(o.departTime)
    const oEnd = normalizeTime(o.endTime)
    if (!oStart || !oEnd) return false
    return orderStart < oEnd && orderEnd > oStart
  })
}

export function IntelligentDispatch({ businessType }: { businessType: BizType }) {
  const [orders, setOrders] = useState<OrderInfo[]>([])
  const [drivers, setDrivers] = useState<DriverInfo[]>([])
  const [contracts, setContracts] = useState<ContractInfo[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderInfo | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<DriverInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [showDispatch, setShowDispatch] = useState(false)
  const [dispatchContract, setDispatchContract] = useState('')

  // 加载所有订单（不只是待派车），用于检查司机时间冲突
  const [allOrders, setAllOrders] = useState<OrderInfo[]>([])

  // 车辆排班冲突集合（车牌号）
  const [vehicleConflictPlates, setVehicleConflictPlates] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAdminOrders({ status: '待派车', businessType, pageSize: 50 }),
      getAdminOrders({ businessType, pageSize: 200 }),
      getDrivers(),
      getContracts(),
    ])
      .then(([ordersRes, allOrdersRes, driversRes, contractsRes]) => {
        setOrders((ordersRes.list || []) as OrderInfo[])
        setAllOrders((allOrdersRes.list || []) as OrderInfo[])
        setDrivers((driversRes || []) as DriverInfo[])
        setContracts((contractsRes || []) as ContractInfo[])
        if ((ordersRes.list || []).length > 0) {
          setSelectedOrder((ordersRes.list as OrderInfo[])[0])
        }
      })
      .catch(() => {
        setToast('数据加载失败')
        setTimeout(() => setToast(''), 3000)
      })
      .finally(() => setLoading(false))
  }, [businessType])

  // 检查所有司机车辆的排班时间冲突
  useEffect(() => {
    if (!selectedOrder || drivers.length === 0) return
    const conflictPlates = new Set<string>()

    // 标准化订单时间并提取日期和起止时间
    const depNorm = normalizeTime(selectedOrder.departTime)
    const endNorm = normalizeTime(selectedOrder.endTime)
    if (!depNorm) return

    const [orderDate, orderDepart] = depNorm.split(' ') as [string, string]
    const orderReturn = endNorm ? (endNorm.split(' ')[1] || '') : ''
    if (!orderDate || !orderDepart) return

    // 批量检查每个司机的车辆
    const checkPromises = drivers.map(async (d) => {
      const plate = d.carPlate || d.vehiclePlate
      if (!plate) return
      try {
        const res = await checkVehicleConflict(plate, orderDate, orderDepart, orderReturn || undefined)
        if (res.hasConflict) conflictPlates.add(plate)
      } catch (_) {}
    })

    Promise.all(checkPromises).then(() => {
      setVehicleConflictPlates(conflictPlates)
    })
  }, [selectedOrder, drivers])

  const recommended = useMemo<RecommendedDriver[]>(() => {
    if (!selectedOrder) return []
    return drivers
      .filter(d => {
        if (d.status === 'offline') return false
        // 只显示与订单同一车队（组织）的司机
        if (selectedOrder.orgId && d.orgId !== selectedOrder.orgId) return false
        // 检查车辆排班冲突
        const driverPlate = d.carPlate || d.vehiclePlate
        if (driverPlate && vehicleConflictPlates.has(driverPlate)) return false
        // 检查时间冲突：该司机在订单时间段是否已有其他进行中的订单
        const driverOrders = allOrders.filter(o =>
          o.driverName === d.name &&
          !['已完成', '已取消', '已关闭'].includes(o.status) &&
          o.id !== selectedOrder.id
        )
        if (driverOrders.length === 0) return true
        return !hasTimeConflict(selectedOrder, driverOrders)
      })
      .map(d => {
        const distance = +(1 + Math.random() * 9).toFixed(1)
        const score = matchScore(selectedOrder, d)
        const eta = Math.round(distance * 3 + Math.random() * 5)
        return { ...d, score, distance, eta }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [selectedOrder, drivers, allOrders, vehicleConflictPlates])

  const openDispatchModal = (driver: RecommendedDriver) => {
    if (!selectedOrder) return
    setSelectedDriver(driver)
    setDispatchContract('')
    setShowDispatch(true)
  }

  const handleConfirmDispatch = async () => {
    if (!selectedOrder || !selectedDriver) return
    if (!dispatchContract) {
      setToast('请选择包车合同')
      setTimeout(() => setToast(''), 2000)
      return
    }
    try {
      const res = await dispatchOrder(selectedOrder.id, selectedDriver.id, dispatchContract)
      if ((res as any).success === false) {
        setToast((res as any).message || '派单失败')
        setTimeout(() => setToast(''), 3000)
        return
      }
      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id))
      getContracts().then(r => setContracts(r as any)).catch(() => {})
      setShowDispatch(false)
      setToast(`已指派 ${selectedDriver.name} (${selectedDriver.vehiclePlate}) 接单，已关联合同`)
      setTimeout(() => setToast(''), 3000)
      setSelectedOrder(() => {
        const next = orders.find(o => o.id !== selectedOrder.id) || null
        return next
      })
    } catch {
      setToast('派单失败，请重试')
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-[calc(100vh-200px)] min-h-[560px]">
      {/* 左侧：待处理订单 */}
      <div className="w-full xl:w-[280px] bg-white rounded-xl border border-slate-200 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">待处理订单</h3>
          <p className="text-xs text-slate-400 mt-0.5">共 {orders.length} 条待派车订单</p>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {loading && orders.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-8">加载中...</div>
          )}
          {orders.map(order => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                selectedOrder?.id === order.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-500">{order.orderNo}</span>
                <span className="text-xs text-slate-400">{order.seats}</span>
              </div>
              <div className="text-sm font-medium text-slate-700 mb-2 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span className="line-clamp-2">{order.route}</span>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex justify-between"><span>用车时间</span><span>{order.departTime?.slice(0, -3)}</span></div>
                <div className="flex justify-between"><span>上下车时间</span><span>{order.endTime?.slice(0, -3) || '—'}</span></div>
                <div className="flex justify-between"><span>用车车型</span><span>{order.carName}</span></div>
              </div>
            </button>
          ))}
          {orders.length === 0 && !loading && (
            <div className="text-center text-slate-400 text-sm py-8">暂无待派车订单</div>
          )}
        </div>
      </div>

      {/* 中间：车辆分布地图 */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col min-h-[320px]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            车辆分布
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />在线</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />出车</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />离线</span>
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden rounded-b-xl bg-slate-50">
          {/* 网格背景 */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'linear-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(90deg, #CBD5E1 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* 地名 */}
          {PLACES.map(p => (
            <div
              key={p.name}
              className="absolute text-xs text-slate-400 font-medium -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {p.name}
            </div>
          ))}

          {/* 选中订单起止点 */}
          {selectedOrder && (
            <>
              <div
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-full"
                style={{ left: '28%', top: '38%' }}
              >
                <MapPin className="w-6 h-6 text-red-500 fill-red-500/20" />
                <span className="text-[10px] text-red-600 font-medium bg-white/80 px-1 rounded">上车点</span>
              </div>
              <div
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-full"
                style={{ left: '68%', top: '48%' }}
              >
                <MapPin className="w-6 h-6 text-amber-500 fill-amber-500/20" />
                <span className="text-[10px] text-amber-600 font-medium bg-white/80 px-1 rounded">下车点</span>
              </div>
            </>
          )}

          {/* 车辆标记 */}
          {MOCK_MAP_VEHICLES.map(v => (
            <div
              key={v.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${v.x}%`, top: `${v.y}%` }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 cursor-pointer transition-transform hover:scale-110 ${
                  v.status === 'online'
                    ? 'bg-primary border-white text-white'
                    : v.status === 'busy'
                      ? 'bg-amber-500 border-white text-white'
                      : 'bg-slate-300 border-white text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-slate-800/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {v.plateNo} · {v.driverName}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：匹配推荐车辆 */}
      <div className="w-full xl:w-[320px] bg-white rounded-xl border border-slate-200 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">匹配推荐车辆</h3>
          <p className="text-xs text-slate-400 mt-0.5">基于车型、距离、评分智能推荐</p>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {!selectedOrder && (
            <div className="text-center text-slate-400 text-sm py-8">请选择左侧订单查看推荐车辆</div>
          )}
          {selectedOrder && recommended.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-8">暂无可用车辆</div>
          )}
          {selectedOrder && (() => {
            const totalNonOffline = drivers.filter(d => {
              if (d.status === 'offline') return false
              if (selectedOrder.orgId && d.orgId !== selectedOrder.orgId) return false
              return true
            }).length
            const timeConflictCount = totalNonOffline - recommended.length
            if (timeConflictCount > 0 && recommended.length > 0) {
              return (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{timeConflictCount} 名司机在该时段有冲突，已过滤</span>
                </div>
              )
            }
            if (timeConflictCount > 0 && recommended.length === 0) {
              return (
                <div className="text-center py-3">
                  <p className="text-sm text-amber-600">
                    {timeConflictCount} 名在线司机均在该时段有其他订单
                  </p>
                </div>
              )
            }
            return null
          })()}
          {recommended.map(driver => (
            <div key={driver.id} className="rounded-xl border border-slate-200 p-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">{driver.vehiclePlate}</div>
                  <div className="text-xs text-slate-500">{driver.vehicleType} · {driver.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">{driver.score}%</div>
                  <div className="text-[10px] text-slate-400">匹配度</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-slate-400" />
                  距{driver.distance}km
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  预计{driver.eta}分钟
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {driver.rating}分
                </div>
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  接单率{(85 + Math.random() * 14).toFixed(0)}%
                </div>
              </div>

              <button
                onClick={() => openDispatchModal(driver)}
                className="w-full py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                指派
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 派单弹窗 */}
      {showDispatch && selectedOrder && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDispatch(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">指派车辆 - {selectedOrder.orderNo}</h3>
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

              {/* 已选司机信息 */}
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <div className="text-sm font-medium text-primary mb-1">推荐指派司机</div>
                <div className="text-sm text-slate-700">
                  {selectedDriver.name} · {selectedDriver.vehiclePlate} ({selectedDriver.vehicleType})
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  星级 ★{selectedDriver.rating} · 匹配度 {recommended.find(d => d.id === selectedDriver.id)?.score || '—'}%
                </div>
              </div>

              {/* 选择合同 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />关联包车合同
                </label>
                <p className="text-xs text-slate-400 mb-2">每个合同仅可关联一个订单，请选择合同后指派</p>
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {contracts
                    .filter(c => {
                      // 只显示与该订单路线匹配或未被占用的合同
                      const routeMatch = selectedOrder.route.includes(c.origin) || selectedOrder.route.includes(c.destination)
                      const isAvailable = !c.orderNo || c.orderNo === selectedOrder.orderNo
                      return routeMatch || isAvailable
                    })
                    .map(c => {
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
                onClick={handleConfirmDispatch}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                确认指派
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}
