import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppContext, useToast, useNavigation } from '@/store'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { getOrderDetail, payOrder, cancelOrder } from '@/api/modules/order'
import { submitReview } from '@/api/modules/review'
import type { OrderInfo, OrderStatus } from '@/types'

import {
  Clock, MapPin, Car, FileText, CreditCard, Phone, RotateCcw,
  Star, CheckCircle2, Navigation, ShieldCheck, XCircle, Loader2,
  CalendarClock, Package, Route, AlertCircle, User, Send,
} from 'lucide-react'

// ============ 状态横幅配置 ============
const BANNER_CONFIG: Record<OrderStatus, { bg: string; icon: React.ReactNode; title: string; subtitle: string }> = {
  '待付款': {
    bg: 'from-amber-500 to-orange-500',
    icon: <Clock className="w-5 h-5 animate-pulse" />,
    title: '待付款',
    subtitle: '订单已创建，请尽快完成支付',
  },
  '待接单': {
    bg: 'from-orange-500 to-amber-500',
    icon: <Clock className="w-5 h-5 animate-pulse" />,
    title: '待接单',
    subtitle: '支付成功，等待平台确认接单',
  },
  '待派车': {
    bg: 'from-blue-500 to-indigo-600',
    icon: <ShieldCheck className="w-5 h-5" />,
    title: '待派车',
    subtitle: '订单已确认，即将为您安排车辆',
  },
  '进行中': {
    bg: 'from-indigo-500 to-purple-600',
    icon: <Navigation className="w-5 h-5 animate-pulse" />,
    title: '行程进行中',
    subtitle: '正在为您服务，祝您旅途愉快',
  },
  '已完成': {
    bg: 'from-emerald-500 to-teal-600',
    icon: <CheckCircle2 className="w-5 h-5" />,
    title: '行程已完成',
    subtitle: '感谢您的使用，期待再次为您服务',
  },
  '已取消': {
    bg: 'from-slate-400 to-slate-500',
    icon: <XCircle className="w-5 h-5" />,
    title: '已取消',
    subtitle: '该订单已取消，退款将原路返回',
  },
  '已关闭': {
    bg: 'from-slate-300 to-slate-400',
    icon: <XCircle className="w-5 h-5" />,
    title: '已关闭',
    subtitle: '订单未支付，已自动关闭',
  },
}


// ============ 信息行组件 ============
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-3.5 text-sm">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-slate-700 font-medium text-right max-w-[55%] truncate">{value}</span>
    </div>
  )
}

export default function OrderDetailPage() {
  const { state, dispatch } = useAppContext()
  const showToast = useToast()
  const { goBack, navigateTo } = useNavigation()

  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showPayConfirm, setShowPayConfirm] = useState(false)

  // ========== 评价弹窗状态 ==========
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewStars, setReviewStars] = useState(0)
  const [reviewContent, setReviewContent] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const orderId = state.viewingOrderId || state.currentOrderId

  // ========== 加载订单 ==========
  useEffect(() => {
    if (!orderId) {
      setError('订单信息丢失')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    getOrderDetail(orderId)
      .then(data => setOrder(data as OrderInfo))
      .catch(() => setError('加载订单失败，请重试'))
      .finally(() => setLoading(false))
  }, [orderId])


  // ========== 支付 ==========
  const handlePay = async () => {
    if (!order) return
    setPaying(true)
    try {
      await payOrder(order.id)
      showToast('支付成功')
      setShowPayConfirm(false)
      dispatch({ type: 'SET_CURRENT_ORDER_ID', payload: '' })
      // 刷新订单状态
      const updated = await getOrderDetail(order.id)
      setOrder(updated as OrderInfo)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '支付失败')

      setShowPayConfirm(false)
    } finally {
      setPaying(false)
    }
  }

  // ========== 取消 ==========
  const handleCancel = async () => {
    if (!order) return
    setCancelling(true)
    try {
      await cancelOrder(order.id)
      showToast('订单已取消')
      dispatch({ type: 'SET_CURRENT_ORDER_ID', payload: '' })
      const updated = await getOrderDetail(order.id)
      setOrder(updated as OrderInfo)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '取消失败')

    } finally {
      setCancelling(false)
    }
  }

  // ========== 再次预订 ==========
  const handleRebook = () => {
    if (!order) return
    dispatch({ type: 'SET_DEPART_CITY', payload: order.departCity })
    dispatch({ type: 'SET_DEPART_TIME', payload: order.departTime })
    dispatch({ type: 'SET_PACKAGE_TYPE', payload: order.packageType })
    navigateTo('car-select')
  }

  // ========== 提交评价 ==========
  const handleSubmitReview = async () => {
    if (!order || reviewStars === 0) {
      showToast('请选择星级评分')
      return
    }
    setSubmittingReview(true)
    try {
      await submitReview(order.id, reviewStars, reviewContent)
      showToast('评价成功，感谢您的反馈！')
      setShowReviewModal(false)
      setReviewStars(0)
      setReviewContent('')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '评价提交失败，请重试')
    } finally {
      setSubmittingReview(false)
    }
  }

  // ========== 加载中 ==========
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <SubNavbar title="订单详情" onBack={goBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-slate-400">加载订单信息...</span>
          </div>
        </div>
      </div>
    )
  }

  // ========== 错误 ==========
  if (error || !order) {
    return (
      <div className="flex flex-col h-full">
        <SubNavbar title="订单详情" onBack={goBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-slate-300" />
            <span className="text-sm text-slate-400">{error || '订单不存在'}</span>
            <Button variant="outline" size="sm" className="rounded-full" onClick={goBack}>返回</Button>
          </div>
        </div>
      </div>
    )
  }

  const status = order.status
  const banner = BANNER_CONFIG[status]
  const isCompleted = status === '已完成'
  const isCancelled = status === '已取消'
  const isClosed = status === '已关闭'
  const isActive = status === '待派车' || status === '进行中'
  const isPending = status === '待付款' || status === '待接单' || status === '待派车'
  const hasDriver = !!order.driverName


  return (
    <div className="flex flex-col h-full">
      <SubNavbar title="订单详情" onBack={goBack} />

      <ScrollArea className="flex-1">
        {/* ===== 状态横幅 ===== */}
        <div className={`bg-gradient-to-r ${banner.bg} text-white py-4 px-5 text-center`}>
          <div className="flex items-center justify-center gap-2">
            {banner.icon}
            <span className="text-lg font-bold">{banner.title}</span>
          </div>
          <div className="text-xs text-white/75 mt-1.5">{banner.subtitle}</div>
        </div>

        {/* ===== 订单编号 ===== */}
        <Card className="mx-4 mt-3 border-0 shadow-sm">
          <CardContent className="pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <FileText className="w-3.5 h-3.5" />
                <span>订单编号</span>
              </div>
              <span className="text-xs font-mono text-slate-500">{order.orderNo}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>下单时间</span>
              </div>
              <span className="text-xs text-slate-500">{order.orderTime || order.createdAt}</span>
            </div>
            {order.customerName && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <User className="w-3.5 h-3.5" />
                  <span>下单人</span>
                </div>
                <span className="text-xs text-slate-700 font-medium">{order.customerName}</span>
              </div>
            )}
            {order.customerPhone && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Phone className="w-3.5 h-3.5" />
                  <span>联系电话</span>
                </div>
                <a href={`tel:${order.customerPhone}`} className="text-xs text-primary font-medium hover:underline">
                  {order.customerPhone}
                </a>
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Package className="w-3.5 h-3.5" />
                  <span>合同编号</span>
                </div>
                <span className="text-xs font-mono text-slate-500">{order.contractId || '—'}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== 行程路线 ===== */}
        <Card className="mx-4 mt-3 border-0 shadow-sm">
          <CardContent className="pt-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">行程路线</h4>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 pt-1.5">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ring-2 ${isCancelled || isClosed ? 'bg-slate-300 ring-slate-100' : 'bg-emerald-500 ring-emerald-100'}`} />
                <div className={`w-0.5 flex-1 min-h-8 rounded-full ${isCancelled || isClosed ? 'bg-slate-200' : 'bg-gradient-to-b from-emerald-200 to-red-200'}`} />
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ring-2 ${isCancelled || isClosed ? 'bg-slate-300 ring-slate-100' : 'bg-red-500 ring-red-100'}`} />
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="text-xs text-slate-400">出发地</div>
                  <div className="text-sm font-semibold text-slate-800">{order.departCity} · 出发点</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">路线</div>
                  <div className="text-sm font-semibold text-slate-800">{order.route}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== 车辆信息 ===== */}
        <Card className="mx-4 mt-3 border-0 shadow-sm">
          <CardContent className="pt-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">车辆信息</h4>
            <div className="rounded-xl bg-slate-50 divide-y divide-slate-100 overflow-hidden">
              <InfoRow icon={<Car className="w-3.5 h-3.5" />} label="车型" value={order.carName} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="城市" value={order.departCity} />
              <InfoRow icon={<Route className="w-3.5 h-3.5" />} label="路线" value={order.route} />
              <InfoRow
                icon={<Package className="w-3.5 h-3.5" />}
                label="套餐"
                value={order.packageType === 'hourly' ? `按小时包 · ${order.duration}` : `按天包 · ${order.duration}`}
              />
              <InfoRow icon={<CalendarClock className="w-3.5 h-3.5" />} label="出发时间" value={order.departTime} />
              {(isCompleted || status === '进行中') && order.endTime && (
                <InfoRow icon={<CalendarClock className="w-3.5 h-3.5" />} label="结束时间" value={order.endTime} />
              )}
              {isCompleted && order.tripDuration && (
                <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="用车时长" value={order.tripDuration} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===== 司机信息（已接单/派车/进行中/已完成） ===== */}
        {hasDriver && (isActive || isCompleted) && (
          <Card className="mx-4 mt-3 border-0 shadow-sm">
            <CardContent className="pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">司机信息</h4>
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-base">{order.driverName?.charAt(0) || '司'}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{order.driverName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{order.carModel}</div>
                  </div>
                </div>
                {order.driverPhone && (
                  <a
                    href={`tel:${order.driverPhone}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    联系司机 {order.driverPhone}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 费用明细 ===== */}
        <Card className="mx-4 mt-3 border-0 shadow-sm">
          <CardContent className="pt-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">费用明细</h4>
            <div className="rounded-xl bg-slate-50 divide-y divide-slate-100 overflow-hidden">
              <div className="flex justify-between items-center py-3 px-3.5 text-sm">
                <span className="text-slate-500">车辆费用</span>
                <span className="text-slate-700 font-medium">¥{order.amount}</span>
              </div>
              <div className="flex justify-between items-center py-3 px-3.5 text-sm">
                <span className="text-slate-500">服务费</span>
                <span className="text-slate-700 font-medium">¥{order.serviceFee}</span>
              </div>
              {order.kmLimit && order.kmLimit > 0 && (
                <div className="flex justify-between items-center py-3 px-3.5 text-sm">
                  <span className="text-slate-500">里程限制</span>
                  <span className="text-slate-700 font-medium">{order.kmLimit}km</span>
                </div>
              )}
              {order.overtimeRate && order.overtimeRate > 0 && (
                <div className="flex justify-between items-center py-3 px-3.5 text-sm">
                  <span className="text-slate-500">超时费</span>
                  <span className="text-slate-700 font-medium">¥{order.overtimeRate}/小时</span>
                </div>
              )}
              {order.overKmRate && order.overKmRate > 0 && (
                <div className="flex justify-between items-center py-3 px-3.5 text-sm">
                  <span className="text-slate-500">超公里费</span>
                  <span className="text-slate-700 font-medium">¥{order.overKmRate}/km</span>
                </div>
              )}
              <div className={`flex justify-between items-center py-3.5 px-3.5 ${isCancelled ? 'bg-gradient-to-r from-red-50 to-white' : isClosed ? 'bg-gradient-to-r from-slate-100 to-white' : 'bg-gradient-to-r from-indigo-50 to-white'}`}>
                <span className="text-sm font-semibold text-slate-700">合计</span>
                <div className="text-right">
                  <div className={`text-xl font-extrabold ${isCancelled ? 'text-red-500' : isClosed ? 'text-slate-400 line-through' : 'text-accent'}`}>
                    ¥{order.total}
                  </div>
                  {!isCancelled && !isClosed && (
                    <div className="text-[10px] text-slate-400">已含服务费</div>
                  )}
                  {isCancelled && (
                    <div className="text-[10px] text-red-400">退款已原路返回</div>
                  )}

                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="h-24" />
      </ScrollArea>

      {/* ===== 底部操作栏 ===== */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between flex-shrink-0 gap-3">
        {/* 金额 */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">{isCancelled ? '退款金额' : isClosed ? '已关闭' : '合计金额'}</div>
          <div className="flex items-baseline gap-0.5">
            <span className={`text-xs font-medium ${isCancelled ? 'text-red-500' : isClosed ? 'text-slate-400' : 'text-accent'}`}>¥</span>
            <span className={`text-2xl font-extrabold ${isCancelled ? 'text-red-500' : isClosed ? 'text-slate-400 line-through' : 'text-accent'}`}>
              {order.total}
            </span>
          </div>

        </div>

        {/* 按钮区域 */}
        <div className="flex gap-2">
          {/* 待付款/待接单/待派车：取消 */}
          {isPending && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-10 px-5 border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? '取消中...' : '取消订单'}
            </Button>
          )}

          {/* 待派车/进行中：联系司机 */}

          {isActive && order.driverPhone && (
            <a href={`tel:${order.driverPhone}`}>
              <Button size="sm" className="rounded-full h-10 px-5 bg-blue-500 hover:bg-blue-600 font-semibold">
                <Phone className="w-4 h-4 mr-1.5" />
                联系司机
              </Button>
            </a>
          )}

          {/* 已完成：再次预订 + 评价 */}
          {isCompleted && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-10 px-5 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={handleRebook}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                再次预订
              </Button>
              <Button
                size="sm"
                className="rounded-full h-10 px-5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 font-semibold"
                onClick={() => { setShowReviewModal(true); setReviewStars(0); setReviewContent('') }}
              >
                <Star className="w-4 h-4 mr-1.5" />
                去评价
              </Button>
            </>
          )}

          {/* 已取消 / 已关闭：删除 */}
          {(isCancelled || isClosed) && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-10 px-5 text-slate-400"
              onClick={() => {
                showToast('订单已删除')
                goBack()
              }}
            >
              删除订单
            </Button>
          )}

          {/* 待付款：支付按钮 */}
          {status === '待付款' && (

            <Button
              size="sm"
              className="rounded-full h-10 px-6 font-semibold bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 shadow-lg shadow-accent/25"
              onClick={() => setShowPayConfirm(true)}
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              去支付
            </Button>
          )}
        </div>
      </div>

      {/* ===== 支付确认弹窗 ===== */}
      {showPayConfirm && order && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowPayConfirm(false)}>
          <div className="w-full bg-white rounded-t-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">确认支付</h3>
            <div className="text-center mb-4">
              <span className="text-3xl font-extrabold text-accent">¥{order.total}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">车辆费用</span>
                <span className="text-slate-700">¥{order.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">服务费</span>
                <span className="text-slate-700">¥{order.serviceFee}</span>
              </div>
              {order.kmLimit && order.kmLimit > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">里程限制</span>
                  <span className="text-slate-700">{order.kmLimit}km</span>
                </div>
              )}
              {order.overtimeRate && order.overtimeRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">超时费</span>
                  <span className="text-slate-700">¥{order.overtimeRate}/小时</span>
                </div>
              )}
              {order.overKmRate && order.overKmRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">超公里费</span>
                  <span className="text-slate-700">¥{order.overKmRate}/km</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-700">合计</span>
                <span className="font-extrabold text-accent text-lg">¥{order.total}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setShowPayConfirm(false)}>
                取消
              </Button>
              <Button
                className="flex-1 rounded-xl h-11 bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 font-semibold"
                onClick={handlePay}
                disabled={paying}
              >
                {paying ? '支付中...' : '确认支付'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 评价弹窗 ===== */}
      {showReviewModal && order && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => { if (!submittingReview) setShowReviewModal(false) }}>
          <div className="w-full bg-white rounded-t-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">服务评价</h3>
            <p className="text-xs text-slate-400 text-center mb-4">感谢您的用车，请为本次服务评分</p>

            {/* 司机信息 */}
            {order.driverName && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 font-bold text-sm">{order.driverName.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">{order.driverName}</div>
                  <div className="text-xs text-slate-400">{order.carName} · {order.route}</div>
                </div>
              </div>
            )}

            {/* 星级评分 */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  onClick={() => setReviewStars(star)}
                  disabled={submittingReview}
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= reviewStars
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-sm font-medium text-slate-500 mb-4">
              {reviewStars === 0 && '轻触星星评分'}
              {reviewStars === 1 && '非常不满意'}
              {reviewStars === 2 && '不满意'}
              {reviewStars === 3 && '一般'}
              {reviewStars === 4 && '满意'}
              {reviewStars === 5 && '非常满意'}
            </div>

            {/* 评价内容 */}
            <textarea
              className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 mb-4"
              placeholder="分享您的出行体验，帮助更多乘客了解服务..."
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              disabled={submittingReview}
              maxLength={500}
            />
            <div className="text-right text-xs text-slate-400 -mt-3 mb-4">{reviewContent.length}/500</div>

            {/* 按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11"
                onClick={() => setShowReviewModal(false)}
                disabled={submittingReview}
              >
                稍后再说
              </Button>
              <Button
                className="flex-1 rounded-xl h-11 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 font-semibold"
                onClick={handleSubmitReview}
                disabled={submittingReview || reviewStars === 0}
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    提交评价
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
