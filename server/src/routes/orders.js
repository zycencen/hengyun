const { Router } = require('express')
const { getDb } = require('../db')
const { userAuth } = require('../middleware/auth')
const { pad, nowLocal, calcEndTime, formatTime, parseDurationHours, formatDurationStr } = require('../utils')

const router = Router()

// ========== 本地时间工具 ==========
const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const todayShort = () => {
  const d = new Date()
  return `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

// ========== 多维度状态常量 ==========
const ORDER_TYPE = { NORMAL: '普通用户订单', VIP: '大客户订单' }
const PAYMENT_STATUS = { UNPAID: '未支付', PAID: '已支付', REFUNDED: '已退款' }
const ACCEPT_STATUS = { UNACCEPTED: '未接单', ACCEPTED: '已接单' }
const DISPATCH_STATUS = { UNDISPATCHED: '未派车', DISPATCHED: '已派车', COMPLETED: '已完成' }
const ORDER_STATUS = {
  PENDING_PAYMENT: '待付款',
  PENDING_ACCEPT: '待接单',
  PENDING_DISPATCH: '待派车',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  CLOSED: '已关闭',
}

// 旧状态英文→新维度中文映射（兼容历史数据）
const LEGACY_STATUS_MAP = {
  unpaid: ORDER_STATUS.PENDING_PAYMENT,
  paid: ORDER_STATUS.PENDING_ACCEPT,
  accepted: ORDER_STATUS.PENDING_DISPATCH,
  dispatched: ORDER_STATUS.IN_PROGRESS,
  in_progress: ORDER_STATUS.IN_PROGRESS,
  completed: ORDER_STATUS.COMPLETED,
  cancelled: ORDER_STATUS.CANCELLED,
  refunding: ORDER_STATUS.CANCELLED,
  pending: ORDER_STATUS.PENDING_PAYMENT,
}

function rowToOrder(row) {
  return {
    id: row.id,
    orderNo: row.order_no,
    route: row.route,
    departCity: row.depart_city,
    orderTime: row.order_time,
    departTime: row.depart_time,
    endTime: row.end_time,
    tripDuration: row.trip_duration,
    packageType: row.package_type,
    duration: row.duration,
    carName: row.car_name,
    carModel: row.car_model,
    seats: row.seats,
    amount: row.amount,
    serviceFee: row.service_fee,
    total: row.total,
    orderType: row.order_type || ORDER_TYPE.NORMAL,
    paymentStatus: row.payment_status || PAYMENT_STATUS.UNPAID,
    acceptStatus: row.accept_status || ACCEPT_STATUS.UNACCEPTED,
    dispatchStatus: row.dispatch_status || DISPATCH_STATUS.UNDISPATCHED,
    status: LEGACY_STATUS_MAP[row.status] || row.status,
    businessType: row.business_type || 'charter',
    kmLimit: row.km_limit || 0,
    overtimeRate: row.overtime_rate || 0,
    overKmRate: row.over_km_rate || 0,
    createdAt: row.created_at,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    contractId: row.contract_id,
    orgId: row.org_id || null,
    orgName: row.org_name || '',
    fleetId: row.fleet_id || null,
  }
}

// ========== 创建订单 ==========
router.post('/create', userAuth, (req, res) => {
  const { departCity, departTime, packageType, duration, carId, fleetOrgId, bizType } = req.body
  const db = getDb()

  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(carId)
  if (!car) return res.json({ code: 404, message: '车辆不存在', data: null })

  // 若通过车队入口下单，校验车队是否存在且启用
  let fleetId = null
  let orderOrgId = car.org_id || null
  if (fleetOrgId) {
    const fleet = db.prepare('SELECT * FROM fleets WHERE org_id = ?').get(fleetOrgId)
    if (!fleet) return res.json({ code: 404, message: '车队入口不存在', data: null })
    if (!fleet.service_enabled || !fleet.entry_enabled) {
      return res.json({ code: 403, message: '该车队的用户端入口已关闭', data: null })
    }
    fleetId = fleet.id
    orderOrgId = fleet.org_id
  }

  const today = todayShort()
  const count = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE created_at >= date('now','localtime')").get().cnt
  const orderNo = `HY${today}${String(count + 1).padStart(3, '0')}`
  const id = orderNo

  // 从价格配置表查询匹配的价格（先按 car_model_id，失败后按名称兜底）
  let priceRow = null
  if (car.car_model_id) {
    priceRow = db.prepare(
      'SELECT * FROM prices WHERE car_model_id = ? AND package_type = ? AND duration = ? AND status = ?'
    ).get(car.car_model_id, packageType, duration, 'active')
  }
  if (!priceRow) {
    // 通过车型名称/车名兜底匹配
    const carModel = car.car_model_id ? db.prepare('SELECT name FROM car_models WHERE id = ?').get(car.car_model_id) : null
    const modelName = carModel ? carModel.name : car.name
    priceRow = db.prepare(
      'SELECT * FROM prices WHERE (car_model_name = ? OR car_model_name = ?) AND package_type = ? AND duration = ? AND status = ?'
    ).get(modelName, car.name, packageType, duration, 'active')
  }

  const price = priceRow ? priceRow.price : (packageType === 'hourly' ? car.hourly_price : car.daily_price)
  const kmLimit = priceRow ? priceRow.km_limit : 0
  const overtimeRate = priceRow ? priceRow.overtime_rate : 0
  const overKmRate = priceRow ? priceRow.over_km_rate : 0
  const serviceFee = priceRow ? (priceRow.service_fee || 20) : 20
  const orderTime = nowLocal()

  // 预计算结束时间和用车时长
  const endTimeDate = calcEndTime(departTime, duration)
  const endTimeStr = endTimeDate ? formatTime(endTimeDate) : null
  const tripDurationStr = formatDurationStr(duration)

  const user = db.prepare('SELECT name, phone, user_type FROM users WHERE id = ?').get(req.userId)
  const customerName = user ? user.name : ''
  const customerPhone = user ? user.phone : (req.userPhone || '')
  const orderType = (user && user.user_type === '大客户用户') ? ORDER_TYPE.VIP : ORDER_TYPE.NORMAL

  db.prepare(`INSERT INTO orders (
      id, order_no, route, depart_city, order_time, depart_time, end_time, trip_duration,
      package_type, duration,
      car_name, car_model, seats, amount, service_fee, total, status,
      order_type, payment_status, accept_status, dispatch_status,
      km_limit, overtime_rate, over_km_rate, business_type,
      created_at, customer_name, customer_phone, user_id, org_id, fleet_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      id, orderNo, `${departCity} → 目的地`, departCity, orderTime, departTime, endTimeStr, tripDurationStr,
      packageType, duration,
      car.name, car.model, car.seats, price, serviceFee, price + serviceFee, ORDER_STATUS.PENDING_PAYMENT,
      orderType, PAYMENT_STATUS.UNPAID, ACCEPT_STATUS.UNACCEPTED, DISPATCH_STATUS.UNDISPATCHED,
      kmLimit, overtimeRate, overKmRate, bizType || 'charter',
      todayLocal(), customerName, customerPhone, req.userId, orderOrgId, fleetId
    )

  const order = db.prepare('SELECT o.*, org.name AS org_name FROM orders o LEFT JOIN organizations org ON org.id = o.org_id WHERE o.id = ?').get(id)
  res.json({ code: 200, message: '下单成功', data: rowToOrder(order) })
})

// ========== 获取订单列表 ==========
router.get('/list', userAuth, (req, res) => {
  const db = getDb()
  const { status, page = 1, pageSize = 20 } = req.query

  let where = 'WHERE user_id = ?'
  const params = [req.userId]

  if (status && status !== 'all') {
    if (status === ORDER_STATUS.IN_PROGRESS) {
      where += " AND status IN ('待派车','进行中')"
    } else if (status === ORDER_STATUS.CANCELLED) {
      where += " AND status IN ('已取消','已关闭')"
    } else {
      where += ' AND status = ?'
      params.push(status)
    }
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM orders ${where}`).get(...params).cnt
  const offset = (Number(page) - 1) * Number(pageSize)
  const list = db.prepare(`SELECT o.*, org.name AS org_name FROM orders o LEFT JOIN organizations org ON org.id = o.org_id ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset)
    .map(rowToOrder)

  res.json({ code: 200, message: 'ok', data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
})

// ========== 获取订单详情 ==========
router.get('/detail/:orderId', userAuth, (req, res) => {
  const db = getDb()
  const order = db.prepare('SELECT o.*, org.name AS org_name FROM orders o LEFT JOIN organizations org ON org.id = o.org_id WHERE o.id = ? AND o.user_id = ?').get(req.params.orderId, req.userId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  res.json({ code: 200, message: 'ok', data: rowToOrder(order) })
})

// ========== 支付订单 ==========
router.post('/pay/:orderId', userAuth, (req, res) => {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.orderId, req.userId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
    return res.json({ code: 400, message: '当前订单状态不可支付，仅待付款订单可支付', data: null })
  }

  db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE id = ?')
    .run(PAYMENT_STATUS.PAID, ORDER_STATUS.PENDING_ACCEPT, req.params.orderId)
  res.json({ code: 200, message: '支付成功', data: { success: true } })
})

// ========== 取消订单 ==========
router.put('/cancel/:orderId', userAuth, (req, res) => {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.orderId, req.userId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.CLOSED) {
    return res.json({ code: 400, message: '订单无法取消', data: null })
  }

  // 未支付 → 已关闭；已支付 → 已退款/已取消
  const isUnpaid = order.payment_status === PAYMENT_STATUS.UNPAID || order.status === ORDER_STATUS.PENDING_PAYMENT
  const newPaymentStatus = isUnpaid ? PAYMENT_STATUS.UNPAID : PAYMENT_STATUS.REFUNDED
  const newStatus = isUnpaid ? ORDER_STATUS.CLOSED : ORDER_STATUS.CANCELLED

  db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE id = ?')
    .run(newPaymentStatus, newStatus, req.params.orderId)
  res.json({ code: 200, message: isUnpaid ? '订单已关闭' : '订单已取消，退款处理中', data: { success: true } })
})

// ========== 订单统计 ==========
router.get('/stats', userAuth, (req, res) => {
  const db = getDb()
  const userId = req.userId

  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE user_id = ? AND status = '待付款'").get(userId).cnt
  const inProgress = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE user_id = ? AND status IN ('待派车','进行中')").get(userId).cnt
  const completed = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE user_id = ? AND status = '已完成'").get(userId).cnt

  res.json({ code: 200, message: 'ok', data: { pending, inProgress, completed } })
})

// ========== 再次预订 ==========
router.post('/rebook/:orderId', userAuth, (req, res) => {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.orderId, req.userId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })

  const today = todayShort()
  const count = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE created_at >= date('now','localtime')").get().cnt
  const newOrderNo = `HY${today}${String(count + 1).padStart(3, '0')}`

  const user = db.prepare('SELECT name, phone, user_type FROM users WHERE id = ?').get(req.userId)
  const customerName = user ? user.name : ''
  const customerPhone = user ? user.phone : (req.userPhone || '')

  const endTimeDate = calcEndTime(order.depart_time, order.duration)
  const endTimeStr = endTimeDate ? formatTime(endTimeDate) : null
  const tripDurationStr = formatDurationStr(order.duration)
  const rebookOrderType = (user && user.user_type === '大客户用户') ? ORDER_TYPE.VIP : ORDER_TYPE.NORMAL

  // 从价格配置表查询匹配的价格，同时获取车辆所属组织
  const car = db.prepare('SELECT car_model_id, org_id, name FROM cars WHERE name = ? AND model = ?').get(order.car_name, order.car_model)
  const rebookCarOrgId = car ? car.org_id : null
  let priceRow = null
  if (car && car.car_model_id) {
    priceRow = db.prepare(
      'SELECT * FROM prices WHERE car_model_id = ? AND package_type = ? AND duration = ? AND status = ?'
    ).get(car.car_model_id, order.package_type, order.duration, 'active')
  }
  if (!priceRow && car) {
    // 通过车型名称/车名兜底匹配
    const carModel = db.prepare('SELECT name FROM car_models WHERE id = ?').get(car.car_model_id)
    const modelName = carModel ? carModel.name : car.name
    priceRow = db.prepare(
      'SELECT * FROM prices WHERE (car_model_name = ? OR car_model_name = ?) AND package_type = ? AND duration = ? AND status = ?'
    ).get(modelName, car.name, order.package_type, order.duration, 'active')
  }
  const rebookAmount = priceRow ? priceRow.price : order.amount
  const rebookServiceFee = priceRow ? (priceRow.service_fee || 20) : 20
  const rebookTotal = rebookAmount + rebookServiceFee
  const rebookKmLimit = priceRow ? priceRow.km_limit : 0
  const rebookOvertimeRate = priceRow ? priceRow.overtime_rate : 0
  const rebookOverKmRate = priceRow ? priceRow.over_km_rate : 0

  db.prepare(`INSERT INTO orders (
      id, order_no, route, depart_city, order_time, depart_time, end_time, trip_duration,
      package_type, duration,
      car_name, car_model, seats, amount, service_fee, total, status,
      order_type, payment_status, accept_status, dispatch_status,
      km_limit, overtime_rate, over_km_rate,
      created_at, customer_name, customer_phone, user_id, org_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      newOrderNo, newOrderNo, order.route, order.depart_city, nowLocal(),
      order.depart_time, endTimeStr, tripDurationStr,
      order.package_type, order.duration, order.car_name, order.car_model, order.seats,
      rebookAmount, rebookServiceFee, rebookTotal, ORDER_STATUS.PENDING_PAYMENT,
      rebookOrderType, PAYMENT_STATUS.UNPAID, ACCEPT_STATUS.UNACCEPTED, DISPATCH_STATUS.UNDISPATCHED,
      rebookKmLimit, rebookOvertimeRate, rebookOverKmRate,
      todayLocal(), customerName, customerPhone, req.userId, rebookCarOrgId
    )

  const newOrder = db.prepare('SELECT o.*, org.name AS org_name FROM orders o LEFT JOIN organizations org ON org.id = o.org_id WHERE o.id = ?').get(newOrderNo)
  res.json({ code: 200, message: '再次预订成功', data: rowToOrder(newOrder) })
})

module.exports = router
