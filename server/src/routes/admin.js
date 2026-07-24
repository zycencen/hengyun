const { Router } = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const XLSX = require('xlsx')
const { getDb } = require('../db')
const { adminAuth } = require('../middleware/auth')

const router = Router()

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'vehicles')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// 车队 LOGO 上传目录
const fleetLogosDir = path.join(__dirname, '..', '..', 'uploads', 'fleets')
if (!fs.existsSync(fleetLogosDir)) fs.mkdirSync(fleetLogosDir, { recursive: true })

// 图片上传配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `vehicle_${Date.now()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i
    cb(null, allowed.test(path.extname(file.originalname)))
  },
})

router.use(adminAuth)

// ========== 组织数据隔离工具函数 ==========
/** 构建组织范围过滤条件（上级可看下级，下级不能看上级）。alias 用于多表 JOIN 时消除 org_id 歧义 */
function buildOrgFilter(req, alias) {
  const scope = req.adminOrgScope
  if (!scope || scope.length === 0) return { where: '', params: [] }
  const col = alias ? `${alias}.org_id` : 'org_id'
  const placeholders = scope.map(() => '?').join(',')
  return {
    where: ` AND (${col} IS NULL OR ${col} = '' OR ${col} IN (${placeholders}))`,
    params: [...scope],
  }
}

/** 校验资源是否在管理员的组织范围内 */
function checkOrgAccess(req, table, idField, idValue) {
  if (!req.adminOrgScope || req.adminOrgScope.length === 0) return true
  const db = getDb()
  const row = db.prepare(`SELECT org_id FROM ${table} WHERE ${idField} = ?`).get(idValue)
  if (!row) return false
  if (!row.org_id) return true
  return req.adminOrgScope.includes(row.org_id)
}

// ========== 多维度状态常量 ==========
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

const legacyStatusMap = {
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

// 规范化时间字符串：将 "今天 14:00"、"明天 10:00" 等中文日期转为标准 YYYY-MM-DD HH:mm
function normalizeTime(timeStr) {
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

function rowToAdminOrder(row) {
  const status = legacyStatusMap[row.status] || row.status
  return {
    id: row.id, orderNo: row.order_no, route: row.route, departCity: row.depart_city,
    orderTime: row.order_time, departTime: row.depart_time, endTime: row.end_time,
    tripDuration: row.trip_duration, packageType: row.package_type, duration: row.duration,
    carName: row.car_name, carModel: row.car_model, seats: row.seats,
    amount: row.amount, serviceFee: row.service_fee, total: row.total,
    orderType: row.order_type || '普通用户订单',
    paymentStatus: row.payment_status || PAYMENT_STATUS.UNPAID,
    acceptStatus: row.accept_status || ACCEPT_STATUS.UNACCEPTED,
    dispatchStatus: row.dispatch_status || DISPATCH_STATUS.UNDISPATCHED,
    status, createdAt: row.created_at,
    customerName: row.customer_name, customerPhone: row.customer_phone,
    driverName: row.driver_name, driverPhone: row.driver_phone, contractId: row.contract_id,
    orgId: row.org_id || null, orgName: row.org_name || '-',
    businessType: row.business_type || 'charter',
    // 结算相关字段
    deposit: row.deposit || 0,
    paidAmount: row.paid_amount || 0,
    balanceAmount: row.balance_amount || 0,
    rideCount: row.ride_count || 1,
    settlement: row.settlement || 'none',
    createdBy: row.created_by || 'user',
    remark: row.remark || '',
  }
}

// ========== 仪表盘数据 ==========
router.get('/dashboard', (req, res) => {
  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)

  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where
  const orgP = orgFilter.params

  const todayOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE created_at = ?${orgW}`).get(today, ...orgP).cnt
  const todayRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as sum FROM orders WHERE created_at = ? AND payment_status != '未支付'${orgW}`).get(today, ...orgP).sum
  // 在线司机：非待审核且没有未完成订单的司机
  const onlineDriversOrgW = orgW ? orgW.replace(/org_id/g, 'd.org_id') : ''
  const onlineDrivers = db.prepare(`SELECT COUNT(*) as cnt FROM drivers d
    WHERE d.status != 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM orders o WHERE o.driver_name = d.name
      AND o.status NOT IN ('已完成', '已取消', '已关闭')
      AND o.driver_name IS NOT NULL AND o.driver_name != ''
    )${onlineDriversOrgW ? ' AND 1=1' + onlineDriversOrgW : ''}`
  ).get(...orgP).cnt
  const totalDrivers = db.prepare(`SELECT COUNT(*) as cnt FROM drivers${orgW ? ' WHERE 1=1' + orgW : ''}`).get(...orgP).cnt
  // 待处理：待付款 + 待接单（未支付/已支付但管理员尚未接单）
  const pendingOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE status IN ('待付款','待接单')${orgW}`).get(...orgP).cnt
  const completedOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE created_at = ? AND status = '已完成'${orgW}`).get(today, ...orgP).cnt
  const monthlyRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as sum FROM orders WHERE created_at LIKE ? AND payment_status != '未支付'${orgW}`).get(month + '%', ...orgP).sum
  const monthlyOrders = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE created_at LIKE ?${orgW}`).get(month + '%', ...orgP).cnt

  const recentOrdersOrgW = orgW ? orgW.replace(/org_id/g, 'o.org_id') : ''
  const recentOrders = db.prepare(`SELECT o.*, org.name AS org_name FROM orders o LEFT JOIN organizations org ON org.id = o.org_id${recentOrdersOrgW ? ' WHERE 1=1' + recentOrdersOrgW : ''} ORDER BY o.created_at DESC LIMIT 5`).all(...orgP).map(o => ({
    orderNo: o.order_no,
    customer: o.customer_name || '用户',
    route: o.route,
    amount: o.total,
    status: legacyStatusMap[o.status] || o.status,
    time: o.depart_time?.slice(11, 16) || '',
    orgName: o.org_name || '-',
  }))

  const revenueTrend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const row = db.prepare(`SELECT COALESCE(SUM(total),0) as sum FROM orders WHERE created_at = ? AND payment_status != '未支付'${orgW}`).get(dateStr, ...orgP)
    revenueTrend.push({ date: dateStr.slice(5), amount: row.sum })
  }

  const orderTrend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE created_at = ?${orgW}`).get(dateStr, ...orgP)
    orderTrend.push({ date: dateStr.slice(5), count: row.cnt })
  }

  res.json({
    code: 200, message: 'ok', data: {
      todayOrders, todayRevenue, onlineDrivers, totalDrivers, pendingOrders, completedOrders,
      monthlyRevenue, monthlyOrders, recentOrders, revenueTrend, orderTrend,
    },
  })
})

// ========== 订单管理 ==========
router.get('/orders', (req, res) => {
  const db = getDb()
  const { status, search, businessType, page = 1, pageSize = 50 } = req.query

  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'o.org_id') : ''

  let where = 'WHERE 1=1'
  const params = []
  if (status && status !== 'all') {
    where += ' AND o.status = ?'
    params.push(status)
  }
  if (businessType && businessType !== 'all') {
    where += ' AND o.business_type = ?'
    params.push(businessType)
  }
  if (search) {
    where += ' AND (o.order_no LIKE ? OR o.route LIKE ? OR o.driver_name LIKE ? OR o.customer_name LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  where += orgW
  params.push(...orgFilter.params)

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM orders o ${where}`).get(...params).cnt
  const offset = (Number(page) - 1) * Number(pageSize)
  const list = db.prepare(`SELECT o.*, org.name AS org_name FROM orders o LEFT JOIN organizations org ON org.id = o.org_id ${where} ORDER BY o.order_time DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), offset).map(rowToAdminOrder)

  res.json({ code: 200, message: 'ok', data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
})

// 确认接单（待接单 → 待派车，必须已支付；大客户订单允许未支付直接接单）
router.post('/orders/accept', (req, res) => {
  const { orderId } = req.body
  const db = getDb()

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (!checkOrgAccess(req, 'orders', 'id', orderId)) {
    return res.json({ code: 403, message: '无权限操作该订单', data: null })
  }

  const status = legacyStatusMap[order.status] || order.status
  const isKeyAccount = order.order_type === '大客户订单'

  // 大客户月结，允许未支付订单直接接单（状态为待付款）
  if (isKeyAccount && status === ORDER_STATUS.PENDING_PAYMENT) {
    // 大客户跳过支付检查，直接接单
  } else if (status !== ORDER_STATUS.PENDING_ACCEPT) {
    return res.json({ code: 400, message: '仅待接单（已支付）或大客户待付款订单可确认接单', data: null })
  }

  db.prepare('UPDATE orders SET accept_status = ?, status = ? WHERE id = ?')
    .run(ACCEPT_STATUS.ACCEPTED, ORDER_STATUS.PENDING_DISPATCH, orderId)

  const task = db.prepare('SELECT * FROM dispatch_tasks WHERE order_no = ?').get(order.order_no)
  if (task) {
    db.prepare('UPDATE dispatch_tasks SET status = ? WHERE id = ?').run('assigned', task.id)
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  res.json({ code: 200, message: '已确认接单', data: rowToAdminOrder(updated) })
})

// 订单派单（待派车 → 进行中）
router.post('/orders/dispatch', (req, res) => {
  const { orderId, driverId, contractId } = req.body
  const db = getDb()

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (!checkOrgAccess(req, 'orders', 'id', orderId)) {
    return res.json({ code: 403, message: '无权限操作该订单', data: null })
  }

  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId)
  if (!driver) return res.json({ code: 404, message: '司机不存在', data: null })

  // 校验司机与订单是否属于同一组织（车队）
  if (order.org_id && driver.org_id !== order.org_id) {
    return res.json({ code: 400, message: '该司机不属于订单对应车队的组织，无法派单', data: null })
  }

  // 检查司机时间冲突：查询该司机在订单时间段内是否已有其他进行中的订单
  const orderDepartTime = normalizeTime(order.depart_time)
  const orderEndTime = normalizeTime(order.end_time)
  if (orderDepartTime && orderEndTime) {
    const driverActiveOrders = db.prepare(`
      SELECT order_no, route, depart_time, end_time FROM orders
      WHERE driver_name = ?
      AND id != ?
      AND status NOT IN ('已完成', '已取消', '已关闭')
    `).all(driver.name, orderId)

    const conflicting = driverActiveOrders.find(o => {
      const oStart = normalizeTime(o.depart_time)
      const oEnd = normalizeTime(o.end_time)
      if (!oStart || !oEnd) return false
      return orderDepartTime < oEnd && orderEndTime > oStart
    })

    if (conflicting) {
      return res.json({
        code: 400,
        message: `司机 ${driver.name} 在 ${order.depart_time} ~ ${order.end_time} 时段已有订单 ${conflicting.order_no}（${conflicting.route}），时间段冲突，无法派单`,
        data: null,
      })
    }
  }

  if (contractId) {
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId)
    if (!contract) return res.json({ code: 404, message: '合同不存在', data: null })
    if (contract.order_no && contract.order_no !== order.order_no) {
      return res.json({ code: 400, message: `该合同已关联订单 ${contract.order_no}，每个合同只能关联一个订单`, data: null })
    }
    if (contract.order_no) {
      db.prepare('UPDATE orders SET contract_id = NULL WHERE contract_id = ? AND id != ?').run(contractId, orderId)
    }
    if (order.contract_id && order.contract_id !== contractId) {
      db.prepare("UPDATE contracts SET order_no = ? WHERE id = ?").run('', order.contract_id)
    }
    db.prepare('UPDATE contracts SET order_no = ? WHERE id = ?').run(order.order_no, contractId)
  }

  db.prepare('UPDATE orders SET dispatch_status = ?, status = ?, driver_name = ?, driver_phone = ?, contract_id = ? WHERE id = ?')
    .run(DISPATCH_STATUS.DISPATCHED, ORDER_STATUS.IN_PROGRESS, driver.name, driver.phone, contractId, orderId)

  db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run('busy', driverId)

  const task = db.prepare('SELECT * FROM dispatch_tasks WHERE order_no = ?').get(order.order_no)
  if (task) {
    db.prepare('UPDATE dispatch_tasks SET status = ?, driver_id = ?, driver_name = ?, vehicle_plate = ?, contract_id = ? WHERE id = ?')
      .run('confirmed', driverId, driver.name, driver.vehicle_plate, contractId, task.id)
  }

  res.json({ code: 200, message: '派单成功', data: { success: true } })
})

// 完成订单（进行中 → 已完成）
router.post('/orders/complete', (req, res) => {
  const { orderId } = req.body
  const db = getDb()

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (!checkOrgAccess(req, 'orders', 'id', orderId)) {
    return res.json({ code: 403, message: '无权限操作该订单', data: null })
  }

  const status = legacyStatusMap[order.status] || order.status
  if (status !== ORDER_STATUS.IN_PROGRESS) {
    return res.json({ code: 400, message: `订单状态「${status}」不支持完成操作，仅进行中的订单可完成`, data: null })
  }

  db.prepare('UPDATE orders SET dispatch_status = ?, status = ? WHERE id = ?')
    .run(DISPATCH_STATUS.COMPLETED, ORDER_STATUS.COMPLETED, orderId)

  // 释放司机
  if (order.driver_name) {
    const driver = db.prepare('SELECT * FROM drivers WHERE name = ?').get(order.driver_name)
    if (driver) db.prepare("UPDATE drivers SET status = 'online' WHERE id = ?").run(driver.id)
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  res.json({ code: 200, message: '订单已完成', data: rowToAdminOrder(updated) })
})

// 订单回滚
router.post('/orders/rollback', (req, res) => {
  const { orderId } = req.body
  const db = getDb()

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (!checkOrgAccess(req, 'orders', 'id', orderId)) {
    return res.json({ code: 403, message: '无权限操作该订单', data: null })
  }

  const status = legacyStatusMap[order.status] || order.status

  // 回滚映射：目标状态 + 各维度状态
  const rollbackConfig = {
    [ORDER_STATUS.IN_PROGRESS]: {
      status: ORDER_STATUS.PENDING_DISPATCH,
      acceptStatus: ACCEPT_STATUS.ACCEPTED,
      dispatchStatus: DISPATCH_STATUS.UNDISPATCHED,
      releaseDriver: false,
      clearContract: false,
    },
    [ORDER_STATUS.PENDING_DISPATCH]: {
      status: ORDER_STATUS.PENDING_ACCEPT,
      acceptStatus: ACCEPT_STATUS.UNACCEPTED,
      dispatchStatus: DISPATCH_STATUS.UNDISPATCHED,
      releaseDriver: false,
      clearContract: false,
    },
    // [ORDER_STATUS.PENDING_ACCEPT]: 待接单订单不允许回滚
    // [ORDER_STATUS.COMPLETED]: 已完成的订单不允许回滚
  }

  const config = rollbackConfig[status]
  if (!config) {
    return res.json({ code: 400, message: `订单状态「${status}」不支持回滚`, data: null })
  }

  // 大客户未支付订单回滚时，从待派车回到待付款（月结无需支付）
  if (status === ORDER_STATUS.PENDING_DISPATCH
    && order.order_type === '大客户订单'
    && order.payment_status === '未支付') {
    config.status = ORDER_STATUS.PENDING_PAYMENT
  }

  // 回滚到待派车/待接单/待付款且存在司机信息时，清理司机和合同
  const shouldClearDriver = [ORDER_STATUS.PENDING_DISPATCH, ORDER_STATUS.PENDING_ACCEPT, ORDER_STATUS.PENDING_PAYMENT].includes(config.status)

  if (shouldClearDriver && order.driver_name) {
    const driver = db.prepare('SELECT * FROM drivers WHERE name = ?').get(order.driver_name)
    if (driver) db.prepare("UPDATE drivers SET status = 'online' WHERE id = ?").run(driver.id)
  }
  if (shouldClearDriver && order.contract_id) {
    db.prepare("UPDATE contracts SET order_no = '' WHERE id = ?").run(order.contract_id)
  }

  if (shouldClearDriver) {
    if (config.paymentStatus) {
      db.prepare('UPDATE orders SET status = ?, payment_status = ?, accept_status = ?, dispatch_status = ?, driver_name = NULL, driver_phone = NULL, contract_id = NULL WHERE id = ?')
        .run(config.status, config.paymentStatus, config.acceptStatus, config.dispatchStatus, orderId)
    } else {
      db.prepare('UPDATE orders SET status = ?, accept_status = ?, dispatch_status = ?, driver_name = NULL, driver_phone = NULL, contract_id = NULL WHERE id = ?')
        .run(config.status, config.acceptStatus, config.dispatchStatus, orderId)
    }
  } else {
    if (config.paymentStatus) {
      db.prepare('UPDATE orders SET status = ?, payment_status = ?, accept_status = ?, dispatch_status = ? WHERE id = ?')
        .run(config.status, config.paymentStatus, config.acceptStatus, config.dispatchStatus, orderId)
    } else {
      db.prepare('UPDATE orders SET status = ?, accept_status = ?, dispatch_status = ? WHERE id = ?')
        .run(config.status, config.acceptStatus, config.dispatchStatus, orderId)
    }
  }

  const task = db.prepare('SELECT * FROM dispatch_tasks WHERE order_no = ?').get(order.order_no)
  if (task) {
    const taskStatusMap = {
      [ORDER_STATUS.PENDING_PAYMENT]: 'pending',
      [ORDER_STATUS.PENDING_ACCEPT]: 'pending',
      [ORDER_STATUS.PENDING_DISPATCH]: 'assigned',
      [ORDER_STATUS.IN_PROGRESS]: 'confirmed',
    }
    db.prepare('UPDATE dispatch_tasks SET status = ?, driver_id = NULL, driver_name = NULL, vehicle_plate = NULL, contract_id = NULL WHERE id = ?')
      .run(taskStatusMap[config.status] || 'pending', task.id)
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  res.json({ code: 200, message: `订单已回滚至「${config.status}」`, data: rowToAdminOrder(updated) })
})

// ========== 删除订单（待付款/已取消 或 手动录入的结算类订单） ==========
router.delete('/orders/:orderId', (req, res) => {
  const db = getDb()
  const { orderId } = req.params
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (!checkOrgAccess(req, 'orders', 'id', orderId)) {
    return res.json({ code: 403, message: '无权限操作该订单', data: null })
  }

  // 结算类订单（上下班/定制包车 — 手动录入）允许任意状态删除
  const isSettlement = order.business_type === 'commute' || order.business_type === 'custom'
  if (!isSettlement) {
    const status = legacyStatusMap[order.status] || order.status
    if (status !== ORDER_STATUS.PENDING_PAYMENT && status !== ORDER_STATUS.CANCELLED) {
      return res.json({ code: 400, message: `仅「待付款」或「已取消」订单可删除，当前状态为「${status}」`, data: null })
    }
  }

  db.prepare('DELETE FROM orders WHERE id = ?').run(orderId)
  const task = db.prepare('SELECT * FROM dispatch_tasks WHERE order_no = ?').get(order.order_no)
  if (task) db.prepare('DELETE FROM dispatch_tasks WHERE order_no = ?').run(order.order_no)

  res.json({ code: 200, message: '订单已删除', data: { success: true } })
})

// ========== 手动录入订单（上下班 / 定制包车） ==========
router.post('/orders/manual', (req, res) => {
  const db = getDb()
  const { bizType, customerName, customerPhone, carName, seats, rideCount, amount, deposit, contractId, remark } = req.body

  if (!bizType || !['commute', 'custom'].includes(bizType)) {
    return res.json({ code: 400, message: '业务类型不正确，仅支持上下班(commute)或定制包车(custom)', data: null })
  }
  if (!customerName) return res.json({ code: 400, message: '请输入客户姓名', data: null })
  if (!customerPhone) return res.json({ code: 400, message: '请输入客户电话', data: null })
  if (!carName) return res.json({ code: 400, message: '请输入车型', data: null })

  const rc = Number(rideCount) || 1
  const amt = Number(amount) || 0
  const dep = Number(deposit) || 0
  const balance = Math.max(0, amt - dep)

  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const count = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE created_at >= date('now','localtime')").get().cnt
  const orderNo = `HY${dateStr}${String(count + 1).padStart(3, '0')}`
  const id = orderNo

  const insertSQL = 'INSERT INTO orders (id, order_no, route, depart_city, order_time, depart_time, package_type, duration, car_name, car_model, seats, amount, service_fee, total, status, created_at, customer_name, customer_phone, contract_id, business_type, deposit, paid_amount, balance_amount, ride_count, settlement, created_by, remark, org_id, order_type, payment_status, accept_status, dispatch_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  db.prepare(insertSQL).run(id, orderNo, `${carName} 包车`, '广州',
      today.toISOString().slice(0, 16).replace('T', ' '), today.toISOString().slice(0, 16).replace('T', ' '),
      'hourly', `${rc}次`, carName, carName, seats || '5座',
      amt, 0, amt, '待付款', today.toISOString().slice(0, 10),
      customerName, customerPhone,
      contractId || null, bizType, dep, dep, balance, rc, dep > 0 ? 'none' : 'done', 'dispatcher', remark || '',
      req.body.orgId || 'ORG001', '大客户订单', dep > 0 ? '未支付' : '已支付', '未接单', '未派车')

  const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  res.json({ code: 200, message: '订单录入成功', data: rowToAdminOrder(created) })
})

// ========== 结账（标记结算完成） ==========
router.put('/orders/:orderId/settlement', (req, res) => {
  const db = getDb()
  const { orderId } = req.params
  const { paidAmount } = req.body

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (!checkOrgAccess(req, 'orders', 'id', orderId)) {
    return res.json({ code: 403, message: '无权限操作该订单', data: null })
  }
  if (!['commute', 'custom'].includes(order.business_type)) {
    return res.json({ code: 400, message: '仅上下班/定制包车订单支持结账', data: null })
  }

  const addPaid = Number(paidAmount) || 0
  const newPaid = (order.paid_amount || 0) + addPaid
  const newBalance = Math.max(0, (order.total || 0) - newPaid)
  const settlement = newBalance <= 0 ? 'done' : 'partial'

  db.prepare('UPDATE orders SET paid_amount = ?, balance_amount = ?, settlement = ? WHERE id = ?')
    .run(newPaid, newBalance, settlement, orderId)

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  res.json({ code: 200, message: `结账完成，待结 ¥${newBalance}`, data: rowToAdminOrder(updated) })
})

// ========== 调度管理 ==========
router.get('/dispatches', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'd.org_id') : ''
  const list = db.prepare(`SELECT d.*, org.name AS org_name FROM dispatch_tasks d LEFT JOIN organizations org ON org.id = d.org_id${orgW ? ' WHERE 1=1' + orgW : ''} ORDER BY d.created_at DESC`).all(...orgFilter.params).map(r => ({
    id: r.id, orderNo: r.order_no, route: r.route, departTime: r.depart_time, carType: r.car_type,
    driverId: r.driver_id, driverName: r.driver_name, vehiclePlate: r.vehicle_plate,
    contractId: r.contract_id, status: r.status, createdAt: r.created_at,
    orgId: r.org_id || null, orgName: r.org_name || '-',
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

function contractStatusFromDates(startDate, endDate) {
  if (!startDate || !endDate) return '履行中'
  const today = new Date().toISOString().slice(0, 10)
  if (today > endDate) return '已过期'
  if (today < startDate) return '即将到期'
  const daysUntilEnd = Math.ceil((new Date(endDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilEnd <= 30) return '即将到期'
  return '履行中'
}

function rowToContract(row) {
  return {
    id: row.id,
    contractNo: row.contract_no,
    partyA: row.party_a,
    partyB: row.party_b,
    origin: row.origin,
    destination: row.destination,
    plateNo: row.plate_no,
    driverName: row.driver_name,
    startDate: row.start_date,
    endDate: row.end_date,
    amount: row.amount,
    status: contractStatusFromDates(row.start_date, row.end_date),
    filingCreateTime: row.filing_create_time,
    orderNo: row.order_no,
    fleet: row.fleet,
    createdAt: row.created_at,
    orgId: row.org_id || null, orgName: row.org_name || '-',
  }
}

// ========== 合同管理 ==========
router.get('/contracts', (req, res) => {
  const db = getDb()
  const { search, status } = req.query
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'c.org_id') : ''
  let where = 'WHERE 1=1'
  const params = []
  if (search) {
    where += ' AND (c.contract_no LIKE ? OR c.party_a LIKE ? OR c.party_b LIKE ? OR c.driver_name LIKE ? OR c.plate_no LIKE ? OR c.origin LIKE ? OR c.destination LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  where += orgW
  params.push(...orgFilter.params)
  let list = db.prepare(`SELECT c.*, org.name AS org_name FROM contracts c LEFT JOIN organizations org ON org.id = c.org_id ${where} ORDER BY c.filing_create_time DESC, c.created_at DESC`).all(...params).map(rowToContract)
  if (status && status !== 'all') {
    list = list.filter(c => c.status === status)
  }
  res.json({ code: 200, message: 'ok', data: list })
})

router.get('/contract-templates', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const list = db.prepare(`SELECT * FROM contract_templates${orgFilter.where ? ' WHERE 1=1' + orgFilter.where : ''} ORDER BY updated_at DESC`).all(...orgFilter.params).map(r => ({
    id: r.id, name: r.name, type: r.type, content: r.content, updatedAt: r.updated_at,
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

/** 新增合同 */
router.post('/contracts', adminAuth, (req, res) => {
  const db = getDb()
  const { contractNo, partyA, partyB, origin, destination, plateNo, driverName, startDate, endDate, amount, filingCreateTime, orderNo, fleet } = req.body

  if (!contractNo || !contractNo.trim()) {
    return res.json({ code: 400, message: '合同编号不能为空', data: null })
  }
  if (!partyA || !partyA.trim()) {
    return res.json({ code: 400, message: '甲方不能为空', data: null })
  }
  if (!startDate || !endDate) {
    return res.json({ code: 400, message: '合同起止日期不能为空', data: null })
  }

  // 检查合同编号唯一性
  const existing = db.prepare('SELECT id FROM contracts WHERE contract_no = ?').get(contractNo.trim())
  if (existing) {
    return res.json({ code: 400, message: '合同编号已存在', data: null })
  }

  const id = 'C' + Date.now()
  const now = new Date().toISOString().slice(0, 10)
  const status = contractStatusFromDates(startDate, endDate)

  db.prepare(`
    INSERT INTO contracts (id, contract_no, party_a, party_b, origin, destination, plate_no,
      driver_name, start_date, end_date, amount, status, filing_create_time, order_no, fleet, created_at, org_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, contractNo.trim(), partyA.trim(), partyB || '恒运出行科技有限公司',
    origin || '', destination || '', plateNo || '', driverName || '',
    startDate, endDate, Number(amount) || 0, status,
    filingCreateTime || now, orderNo || '', fleet || '', now,
    req.adminOrgId || null
  )

  const contract = db.prepare(`
    SELECT c.*, org.name AS org_name FROM contracts c
    LEFT JOIN organizations org ON org.id = c.org_id
    WHERE c.id = ?
  `).get(id)

  res.json({ code: 200, message: '合同创建成功', data: rowToContract(contract) })
})

// ========== 车辆管理 ==========
router.get('/vehicles', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'c.org_id') : ''
  const cars = db.prepare(`SELECT c.*, org.name AS org_name FROM cars c LEFT JOIN organizations org ON org.id = c.org_id${orgW ? ' WHERE 1=1' + orgW : ''} ORDER BY c.id DESC`).all(...orgFilter.params).map(r => ({
    id: r.id, name: r.name, seats: r.seats, model: r.model, capacity: r.capacity,
    tags: JSON.parse(r.tags), hourlyPrice: r.hourly_price, dailyPrice: r.daily_price,
    color: r.color, imageUrl: r.image_url, status: r.status, plate: r.plate_number || '',
    carModelId: r.car_model_id || '', orgId: r.org_id || null, orgName: r.org_name || '-',
  }))
  res.json({ code: 200, message: 'ok', data: cars })
})

// 新增车辆
router.post('/vehicles', (req, res) => {
  const db = getDb()
  const { name, model, seats, capacity, tags, hourlyPrice, dailyPrice, color, plate, status, carModelId, imageUrl } = req.body
  if (!name || !model) {
    return res.json({ code: 400, message: '车辆名称和型号不能为空', data: null })
  }
  const result = db.prepare(`INSERT INTO cars (name, model, seats, capacity, tags, hourly_price, daily_price, color, image_url, plate_number, status, car_model_id, org_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(name, model, seats || '', capacity || '', JSON.stringify(tags || []),
      hourlyPrice || 0, dailyPrice || 0, color || '#3B82F6', imageUrl || '', plate || '', status || 'available', carModelId || '', req.adminOrgId || null)
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(result.lastInsertRowid)
  res.json({
    code: 200, message: '车辆添加成功', data: {
      id: car.id, name: car.name, seats: car.seats, model: car.model, capacity: car.capacity,
      tags: JSON.parse(car.tags), hourlyPrice: car.hourly_price, dailyPrice: car.daily_price,
      color: car.color, imageUrl: car.image_url, status: car.status, plate: car.plate_number || '',
      carModelId: car.car_model_id || '', orgId: car.org_id || null,
    }
  })
})

// 更新车辆
router.put('/vehicles/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM cars WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '车辆不存在', data: null })
  if (!checkOrgAccess(req, 'cars', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该车辆', data: null })
  }

  const { name, model, seats, capacity, tags, hourlyPrice, dailyPrice, color, plate, status, carModelId, imageUrl } = req.body
  db.prepare(`UPDATE cars SET name=?, model=?, seats=?, capacity=?, tags=?, hourly_price=?, daily_price=?, color=?, image_url=?, plate_number=?, status=?, car_model_id=? WHERE id=?`)
    .run(name || existing.name, model || existing.model, seats || existing.seats, capacity || existing.capacity,
      JSON.stringify(tags || JSON.parse(existing.tags)), hourlyPrice ?? existing.hourly_price,
      dailyPrice ?? existing.daily_price, color || existing.color, imageUrl ?? existing.image_url,
      plate ?? existing.plate_number, status || existing.status, carModelId || existing.car_model_id || '', id)
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(id)
  res.json({
    code: 200, message: '车辆更新成功', data: {
      id: car.id, name: car.name, seats: car.seats, model: car.model, capacity: car.capacity,
      tags: JSON.parse(car.tags), hourlyPrice: car.hourly_price, dailyPrice: car.daily_price,
      color: car.color, imageUrl: car.image_url, status: car.status, plate: car.plate_number || '',
      carModelId: car.car_model_id || '', orgId: car.org_id || null,
    }
  })
})

// 上传车辆图片
router.post('/vehicles/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.json({ code: 400, message: '请选择图片', data: null })
  const url = `/uploads/vehicles/${req.file.filename}`
  res.json({ code: 200, message: '上传成功', data: { url } })
})

// ── 车队 LOGO 上传 ──
const fleetLogoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, fleetLogosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `fleet_logo_${Date.now()}${ext}`)
  },
})
const fleetLogoUpload = multer({
  storage: fleetLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i
    cb(null, allowed.test(path.extname(file.originalname)))
  },
})

// 上传车队 LOGO
router.post('/fleets/upload-logo', fleetLogoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.json({ code: 400, message: '请选择 LOGO 图片', data: null })
  const url = `/uploads/fleets/${req.file.filename}`
  res.json({ code: 200, message: 'LOGO 上传成功', data: { url } })
})

router.get('/car-models', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const list = db.prepare(`SELECT * FROM car_models${orgFilter.where ? ' WHERE 1=1' + orgFilter.where : ''} ORDER BY status, category`).all(...orgFilter.params).map(r => ({
    id: r.id, name: r.name, brand: r.brand, model: r.model, seats: r.seats,
    category: r.category, tags: JSON.parse(r.tags), imageUrl: r.image_url, status: r.status,
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

router.get('/prices', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'p.org_id') : ''
  const list = db.prepare(`SELECT p.*, org.name AS org_name FROM prices p LEFT JOIN organizations org ON org.id = p.org_id${orgW ? ' WHERE 1=1' + orgW : ''} ORDER BY p.car_model_name, p.package_type`).all(...orgFilter.params).map(r => ({
    id: r.id, carModelId: r.car_model_id, carModelName: r.car_model_name,
    packageType: r.package_type, duration: r.duration, price: r.price,
    kmLimit: r.km_limit, overtimeRate: r.overtime_rate, overKmRate: r.over_km_rate,
    serviceFee: r.service_fee || 20, status: r.status,
    orgId: r.org_id || null, orgName: r.org_name || '-',
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

// 新增价格配置
router.post('/prices', (req, res) => {
  const db = getDb()
  const { carModelId, carModelName, packageType, duration, price, kmLimit, overtimeRate, overKmRate, serviceFee } = req.body
  if (!carModelId || !carModelName || !packageType || !duration) {
    return res.json({ code: 400, message: '车型、套餐类型和时长不能为空', data: null })
  }
  const id = `P${Date.now()}`
  db.prepare(`INSERT INTO prices (id, car_model_id, car_model_name, package_type, duration, price, km_limit, overtime_rate, over_km_rate, service_fee, status, org_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
    .run(id, carModelId, carModelName, packageType, duration, price || 0, kmLimit || 0, overtimeRate || 0, overKmRate || 0, serviceFee || 0, req.adminOrgId || null)
  const row = db.prepare('SELECT * FROM prices WHERE id = ?').get(id)
  res.json({
    code: 200, message: '价格配置添加成功', data: {
      id: row.id, carModelId: row.car_model_id, carModelName: row.car_model_name,
      packageType: row.package_type, duration: row.duration, price: row.price,
      kmLimit: row.km_limit, overtimeRate: row.overtime_rate, overKmRate: row.over_km_rate,
      serviceFee: row.service_fee || 20, status: row.status,
      orgId: row.org_id || null,
    }
  })
})

// 更新价格配置
router.put('/prices/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM prices WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '价格配置不存在', data: null })
  const { carModelId, carModelName, packageType, duration, price, kmLimit, overtimeRate, overKmRate, serviceFee, status } = req.body
  db.prepare(`UPDATE prices SET
    car_model_id = ?, car_model_name = ?, package_type = ?, duration = ?,
    price = ?, km_limit = ?, overtime_rate = ?, over_km_rate = ?, service_fee = ?, status = ?
    WHERE id = ?`)
    .run(
      carModelId || existing.car_model_id, carModelName || existing.car_model_name,
      packageType || existing.package_type, duration || existing.duration,
      price ?? existing.price, kmLimit ?? existing.km_limit,
      overtimeRate ?? existing.overtime_rate, overKmRate ?? existing.over_km_rate,
      serviceFee ?? existing.service_fee, status || existing.status,
      id
    )
  const row = db.prepare('SELECT * FROM prices WHERE id = ?').get(id)
  res.json({
    code: 200, message: '价格配置更新成功', data: {
      id: row.id, carModelId: row.car_model_id, carModelName: row.car_model_name,
      packageType: row.package_type, duration: row.duration, price: row.price,
      kmLimit: row.km_limit, overtimeRate: row.overtime_rate, overKmRate: row.over_km_rate,
      serviceFee: row.service_fee || 20, status: row.status,
      orgId: row.org_id || null,
    }
  })
})

// 删除/切换价格配置状态
router.put('/prices/:id/toggle', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM prices WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '价格配置不存在', data: null })
  const newStatus = existing.status === 'active' ? 'inactive' : 'active'
  db.prepare('UPDATE prices SET status = ? WHERE id = ?').run(newStatus, id)
  res.json({ code: 200, message: '状态已更新', data: { id, status: newStatus } })
})

// 删除价格配置
router.delete('/prices/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM prices WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '价格配置不存在', data: null })
  db.prepare('DELETE FROM prices WHERE id = ?').run(id)
  res.json({ code: 200, message: '价格配置已删除', data: { id } })
})

// ========== 司机管理 ==========

// 获取司机列表（含关联车辆信息，状态根据未完成订单动态计算）
router.get('/drivers', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'd.org_id') : ''
  const list = db.prepare(`
    SELECT d.*, c.plate_number AS carPlate, c.model AS carModelName, c.seats AS carSeats, c.image_url AS carImageUrl, org.name AS org_name,
      CASE
        WHEN d.status = 'pending' THEN 'pending'
        WHEN busy.driver_name IS NOT NULL THEN 'busy'
        ELSE 'online'
      END AS computed_status
    FROM drivers d
    LEFT JOIN cars c ON c.id = d.car_id
    LEFT JOIN organizations org ON org.id = d.org_id
    LEFT JOIN (
      SELECT DISTINCT driver_name FROM orders
      WHERE status NOT IN ('已完成', '已取消', '已关闭')
        AND driver_name IS NOT NULL AND driver_name != ''
    ) busy ON busy.driver_name = d.name
    ${orgW ? 'WHERE 1=1' + orgW : ''}
    ORDER BY d.join_date DESC
  `).all(...orgFilter.params).map(r => ({
    id: r.id, name: r.name, phone: r.phone, avatar: r.avatar, licenseNo: r.license_no,
    vehiclePlate: r.vehicle_plate, vehicleType: r.vehicle_type, status: r.computed_status,
    rating: r.rating, orderCount: r.order_count, joinDate: r.join_date, city: r.city,
    carId: r.car_id || null, carPlate: r.carPlate || '', carModelName: r.carModelName || '',
    carSeats: r.carSeats || '', carImageUrl: r.carImageUrl || '', orgId: r.org_id || null, orgName: r.org_name || '-',
    corpUserId: r.corp_userid || '',
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

// 新增司机
router.post('/drivers', (req, res) => {
  const db = getDb()
  const { name, phone, licenseNo, city, carId, corpUserId } = req.body
  if (!name || !phone || !licenseNo) {
    return res.json({ code: 400, message: '姓名、手机号和驾驶证号不能为空', data: null })
  }

  // 检查车辆是否已被其他司机绑定（一辆车只能绑定一个司机）
  if (carId) {
    const existing = db.prepare('SELECT id, name FROM drivers WHERE car_id = ? AND id != ?').get(carId, '')
    if (existing) {
      return res.json({ code: 400, message: `该车辆已绑定司机「${existing.name}」，请选择其他车辆`, data: null })
    }
  }

  // 从 cars 表获取车辆信息
  let vehiclePlate = ''
  let vehicleType = ''
  if (carId) {
    const car = db.prepare('SELECT plate_number, model, seats FROM cars WHERE id = ?').get(carId)
    if (car) {
      vehiclePlate = car.plate_number || ''
      vehicleType = `${car.model || ''} ${car.seats || ''}座`.trim()
    }
  }

  // 生成司机ID
  const maxId = db.prepare("SELECT id FROM drivers WHERE id LIKE 'D%' ORDER BY id DESC LIMIT 1").get()
  const nextNum = maxId ? String(parseInt(maxId.id.slice(1)) + 1).padStart(3, '0') : '001'
  const driverId = `D${nextNum}`
  const today = new Date().toISOString().slice(0, 10)

  db.prepare(`INSERT INTO drivers (id, name, phone, license_no, vehicle_plate, vehicle_type, status, car_id, city, join_date, org_id, corp_userid)
    VALUES (?, ?, ?, ?, ?, ?, 'offline', ?, ?, ?, ?, ?)`)
    .run(driverId, name, phone, licenseNo, vehiclePlate, vehicleType, carId || null, city || '', today, req.adminOrgId || null, corpUserId || '')

  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId)
  res.json({
    code: 200, message: '司机添加成功', data: {
      id: driver.id, name: driver.name, phone: driver.phone, avatar: driver.avatar, licenseNo: driver.license_no,
      vehiclePlate: driver.vehicle_plate, vehicleType: driver.vehicle_type, status: driver.status,
      rating: driver.rating, orderCount: driver.order_count, joinDate: driver.join_date, city: driver.city,
      carId: driver.car_id || null, orgId: driver.org_id || null, corpUserId: driver.corp_userid || '',
    }
  })
})

// 更新司机
router.put('/drivers/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '司机不存在', data: null })
  if (!checkOrgAccess(req, 'drivers', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该司机', data: null })
  }

  const { name, phone, licenseNo, city, carId, corpUserId } = req.body

  // 检查车辆是否已被其他司机绑定
  if (carId) {
    const conflict = db.prepare('SELECT id, name FROM drivers WHERE car_id = ? AND id != ?').get(carId, id)
    if (conflict) {
      return res.json({ code: 400, message: `该车辆已绑定司机「${conflict.name}」，请选择其他车辆`, data: null })
    }
  }

  // 从 cars 表获取车辆信息
  let vehiclePlate = existing.vehicle_plate
  let vehicleType = existing.vehicle_type
  if (carId) {
    const car = db.prepare('SELECT plate_number, model, seats FROM cars WHERE id = ?').get(carId)
    if (car) {
      vehiclePlate = car.plate_number || ''
      vehicleType = `${car.model || ''} ${car.seats || ''}座`.trim()
    }
  } else if (carId === null || carId === '') {
    vehiclePlate = ''
    vehicleType = ''
  }

  db.prepare(`UPDATE drivers SET name=?, phone=?, license_no=?, city=?, car_id=?, vehicle_plate=?, vehicle_type=?, corp_userid=? WHERE id=?`)
    .run(name || existing.name, phone || existing.phone, licenseNo || existing.license_no,
      city ?? existing.city, carId !== undefined ? (carId || null) : existing.car_id,
      vehiclePlate, vehicleType, corpUserId !== undefined ? (corpUserId || '') : existing.corp_userid, id)

  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id)
  res.json({
    code: 200, message: '司机更新成功', data: {
      id: driver.id, name: driver.name, phone: driver.phone, avatar: driver.avatar, licenseNo: driver.license_no,
      vehiclePlate: driver.vehicle_plate, vehicleType: driver.vehicle_type, status: driver.status,
      rating: driver.rating, orderCount: driver.order_count, joinDate: driver.join_date, city: driver.city,
      carId: driver.car_id || null, orgId: driver.org_id || null, corpUserId: driver.corp_userid || '',
    }
  })
})

// 删除司机
router.delete('/drivers/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '司机不存在', data: null })
  if (!checkOrgAccess(req, 'drivers', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该司机', data: null })
  }
  db.prepare('DELETE FROM drivers WHERE id = ?').run(id)
  res.json({ code: 200, message: '司机已删除', data: null })
})

// 审核司机
router.put('/drivers/:id/audit', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const { approved } = req.body
  const existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '司机不存在', data: null })
  if (!checkOrgAccess(req, 'drivers', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该司机', data: null })
  }
  if (existing.status !== 'pending') return res.json({ code: 400, message: '只能审核待审核状态的司机', data: null })

  if (approved) {
    db.prepare("UPDATE drivers SET status = 'offline' WHERE id = ?").run(id)
    res.json({ code: 200, message: '已通过审核，司机可上线接单', data: { status: 'offline' } })
  } else {
    db.prepare('DELETE FROM drivers WHERE id = ?').run(id)
    res.json({ code: 200, message: '已拒绝该司机申请', data: null })
  }
})

// ========== 用户管理 ==========
router.get('/users', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'u.org_id') : ''
  const list = db.prepare(`SELECT u.* FROM users u${orgW ? ' WHERE 1=1' + orgW : ''} ORDER BY u.created_at DESC`).all(...orgFilter.params).map(u => {
    // 查询该用户关联的所有组织
    const orgs = db.prepare(`SELECT o.id, o.name FROM user_orgs uo JOIN organizations o ON o.id = uo.org_id WHERE uo.user_id = ?`).all(u.id)
    return {
      id: u.id, name: u.name, phone: u.phone, company: u.company,
      isVip: !!u.is_vip, isEnterpriseVerified: !!u.is_enterprise_verified,
      userType: u.user_type || '普通用户',
      status: 'active', orderCount: 0, totalAmount: 0, createdAt: u.created_at,
      orgs: orgs.map(o => ({ id: o.id, name: o.name })),
      orgName: orgs.map(o => o.name).join('、') || '-',
    }
  })
  for (const u of list) {
    const stats = db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as sum FROM orders WHERE user_id = ?').get(u.id)
    u.orderCount = stats.cnt
    u.totalAmount = stats.sum
  }
  res.json({ code: 200, message: 'ok', data: list })
})

// 更新用户（设置用户类型等）
router.put('/users/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '用户不存在', data: null })
  if (!checkOrgAccess(req, 'users', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该用户', data: null })
  }

  const { userType } = req.body
  if (userType !== undefined) {
    if (!['普通用户', '大客户用户'].includes(userType)) {
      return res.json({ code: 400, message: '用户类型无效，仅支持「普通用户」或「大客户用户」', data: null })
    }
    db.prepare('UPDATE users SET user_type = ? WHERE id = ?').run(userType, id)
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  res.json({
    code: 200, message: '用户更新成功', data: {
      id: user.id, name: user.name, phone: user.phone, company: user.company,
      isVip: !!user.is_vip, isEnterpriseVerified: !!user.is_enterprise_verified,
      userType: user.user_type || '普通用户',
      status: 'active', createdAt: user.created_at,
    }
  })
})

// 获取用户关联组织
router.get('/users/:id/orgs', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '用户不存在', data: null })
  const orgs = db.prepare('SELECT o.id, o.name FROM user_orgs uo JOIN organizations o ON o.id = uo.org_id WHERE uo.user_id = ?').all(id)
  res.json({ code: 200, message: 'ok', data: orgs })
})

// 设置用户关联组织（替换式更新）
router.put('/users/:id/orgs', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const { orgIds } = req.body
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '用户不存在', data: null })
  if (!checkOrgAccess(req, 'users', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该用户', data: null })
  }

  if (!Array.isArray(orgIds)) {
    return res.json({ code: 400, message: 'orgIds 必须为数组', data: null })
  }

  // 事务：先删后插
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_orgs WHERE user_id = ?').run(id)
    if (orgIds.length > 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO user_orgs (user_id, org_id) VALUES (?, ?)')
      for (const orgId of orgIds) {
        stmt.run(id, orgId)
      }
    }
  })
  tx()

  // 同步更新 users.org_id 为第一个组织（向后兼容）
  const firstOrgId = orgIds.length > 0 ? orgIds[0] : null
  if (firstOrgId) {
    db.prepare('UPDATE users SET org_id = ? WHERE id = ?').run(firstOrgId, id)
  }

  const orgs = db.prepare('SELECT o.id, o.name FROM user_orgs uo JOIN organizations o ON o.id = uo.org_id WHERE uo.user_id = ?').all(id)
  res.json({ code: 200, message: '组织关联更新成功', data: orgs })
})

// ========== 财务管理 ==========
router.get('/finance', (req, res) => {
  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where
  const orgP = orgFilter.params
  const todayStats = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as sum FROM orders WHERE created_at = ? AND payment_status != '未支付'${orgW}`).get(today, ...orgP)
  const monthStats = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as sum FROM orders WHERE created_at LIKE ? AND payment_status != '未支付'${orgW}`).get(today.slice(0, 7) + '%', ...orgP)

  res.json({
    code: 200, message: 'ok', data: {
      todayRevenue: todayStats.sum, todayOrders: todayStats.cnt,
      monthRevenue: monthStats.sum, monthOrders: monthStats.cnt,
    },
  })
})

// ========== 通勤/定制需求管理 ==========

/** 获取通勤车申请列表 */
router.get('/demands/commute', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'ca.org_id') : ''
  const list = db.prepare(`
    SELECT ca.id, ca.name, ca.phone, ca.company, ca.city, ca.status, ca.admin_note, ca.created_at, ca.org_id, org.name AS org_name
    FROM commute_applications ca LEFT JOIN organizations org ON org.id = ca.org_id${orgW ? ' WHERE 1=1' + orgW : ''} ORDER BY ca.created_at DESC
  `).all(...orgFilter.params).map(r => ({
    id: r.id, name: r.name, phone: r.phone, company: r.company,
    city: r.city, status: r.status, adminNote: r.admin_note, createdAt: r.created_at,
    orgId: r.org_id || null, orgName: r.org_name || '-',
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

/** 获取定制包车需求列表 */
router.get('/demands/custom', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'ccr.org_id') : ''
  const list = db.prepare(`
    SELECT ccr.id, ccr.name, ccr.phone, ccr.city, ccr.demand, ccr.status, ccr.admin_note, ccr.created_at, ccr.org_id, org.name AS org_name
    FROM custom_charter_requests ccr LEFT JOIN organizations org ON org.id = ccr.org_id${orgW ? ' WHERE 1=1' + orgW : ''} ORDER BY ccr.created_at DESC
  `).all(...orgFilter.params).map(r => ({
    id: r.id, name: r.name, phone: r.phone, city: r.city,
    demand: r.demand, status: r.status, adminNote: r.admin_note, createdAt: r.created_at,
    orgId: r.org_id || null, orgName: r.org_name || '-',
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

/** 更新需求状态和备注 */
router.put('/demands/:type/:id', (req, res) => {
  const { type, id } = req.params
  const { status, adminNote } = req.body
  const db = getDb()

  const table = type === 'commute' ? 'commute_applications' : type === 'custom' ? 'custom_charter_requests' : null
  if (!table) return res.json({ code: 400, message: '无效的需求类型', data: null })

  // 组织权限校验
  if (!checkOrgAccess(req, table, 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该需求', data: null })
  }

  if (status) db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, id)
  if (adminNote !== undefined) db.prepare(`UPDATE ${table} SET admin_note = ? WHERE id = ?`).run(adminNote, id)

  const updated = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
  res.json({
    code: 200, message: '更新成功', data: {
      id: updated.id, name: updated.name, phone: updated.phone,
      city: updated.city, status: updated.status, adminNote: updated.admin_note,
      createdAt: updated.created_at, orgId: updated.org_id || null,
      ...(type === 'commute' ? { company: updated.company } : { demand: updated.demand }),
    },
  })
})

// ========== 组织架构管理 ==========

/** 获取组织架构树 */
router.get('/organizations', (_req, res) => {
  const db = getDb()
  const list = db.prepare('SELECT * FROM organizations ORDER BY sort_order, created_at').all().map(r => ({
    id: r.id, name: r.name, parentId: r.parent_id || null,
    path: r.path, level: r.level, sortOrder: r.sort_order, createdAt: r.created_at,
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

/** 新增组织 */
router.post('/organizations', (req, res) => {
  const db = getDb()
  const { name, parentId } = req.body
  if (!name) return res.json({ code: 400, message: '组织名称不能为空', data: null })

  let parentPath = ''
  let level = 0
  if (parentId) {
    const parent = db.prepare('SELECT * FROM organizations WHERE id = ?').get(parentId)
    if (!parent) return res.json({ code: 404, message: '父级组织不存在', data: null })
    parentPath = parent.path
    level = parent.level + 1
  }

  const id = 'ORG' + Date.now()
  const sortOrders = db.prepare('SELECT MAX(sort_order) as max_sort FROM organizations WHERE parent_id ' + (parentId ? '= ?' : 'IS NULL')).get(...(parentId ? [parentId] : []))
  const sortOrder = (sortOrders?.max_sort || 0) + 1

  db.prepare('INSERT INTO organizations (id, name, parent_id, path, level, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, parentId || null, parentPath ? `${parentPath}/${id}` : id, level, sortOrder)

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id)
  res.json({
    code: 200, message: '组织添加成功', data: {
      id: org.id, name: org.name, parentId: org.parent_id || null,
      path: org.path, level: org.level, sortOrder: org.sort_order, createdAt: org.created_at,
    }
  })
})

/** 更新组织 */
router.put('/organizations/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '组织不存在', data: null })

  const { name, parentId } = req.body
  if (!name) return res.json({ code: 400, message: '组织名称不能为空', data: null })

  // 不能将自己或子孙作为父级
  if (parentId) {
    if (parentId === id) return res.json({ code: 400, message: '不能将自己设为父级', data: null })
    const descendants = db.prepare("SELECT id FROM organizations WHERE path LIKE ?").all(`${existing.path}/%`)
    if (descendants.some(d => d.id === parentId)) {
      return res.json({ code: 400, message: '不能将子组织设为父级', data: null })
    }
  }

  db.prepare('UPDATE organizations SET name = ? WHERE id = ?').run(name, id)
  if (parentId !== undefined) {
    let parentPath = ''
    let level = 0
    if (parentId) {
      const parent = db.prepare('SELECT * FROM organizations WHERE id = ?').get(parentId)
      if (!parent) return res.json({ code: 404, message: '父级组织不存在', data: null })
      parentPath = parent.path
      level = parent.level + 1
    }
    const oldPath = existing.path
    const newPath = parentPath ? `${parentPath}/${id}` : id
    db.prepare('UPDATE organizations SET parent_id = ?, path = ?, level = ? WHERE id = ?')
      .run(parentId || null, newPath, level, id)
    // 更新所有子孙的 path
    const children = db.prepare("SELECT id, path FROM organizations WHERE path LIKE ?").all(`${oldPath}/%`)
    for (const child of children) {
      const updatedPath = child.path.replace(oldPath, newPath)
      const updatedLevel = updatedPath.split('/').length - 1
      db.prepare('UPDATE organizations SET path = ?, level = ? WHERE id = ?').run(updatedPath, updatedLevel, child.id)
    }
  }

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id)
  res.json({
    code: 200, message: '组织更新成功', data: {
      id: org.id, name: org.name, parentId: org.parent_id || null,
      path: org.path, level: org.level, sortOrder: org.sort_order, createdAt: org.created_at,
    }
  })
})

/** 删除组织 */
router.delete('/organizations/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '组织不存在', data: null })

  // 检查是否有子组织
  const childCount = db.prepare('SELECT COUNT(*) as cnt FROM organizations WHERE parent_id = ?').get(id).cnt
  if (childCount > 0) return res.json({ code: 400, message: '请先删除子组织', data: null })

  // 检查是否有管理员属于该组织
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM admin_users WHERE org_id = ?').get(id).cnt
  if (userCount > 0) return res.json({ code: 400, message: `该组织下有 ${userCount} 个管理员，请先转移`, data: null })

  db.prepare('DELETE FROM organizations WHERE id = ?').run(id)
  res.json({ code: 200, message: '组织已删除', data: null })
})

// ========== 角色权限管理 ==========

/** 获取所有角色 */
router.get('/roles', (_req, res) => {
  const db = getDb()
  const roles = db.prepare('SELECT * FROM roles ORDER BY created_at').all().map(r => {
    const perms = db.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ?').all(r.id).map(p => p.permission_key)
    return { id: r.id, name: r.name, code: r.code, description: r.description, isSystem: !!r.is_system, permissions: perms, createdAt: r.created_at }
  })
  res.json({ code: 200, message: 'ok', data: roles })
})

/** 新增角色 */
router.post('/roles', (req, res) => {
  const db = getDb()
  const { name, code, description, permissions } = req.body
  if (!name || !code) return res.json({ code: 400, message: '角色名称和编码不能为空', data: null })

  const existing = db.prepare('SELECT id FROM roles WHERE code = ?').get(code)
  if (existing) return res.json({ code: 400, message: '角色编码已存在', data: null })

  const id = 'ROLE' + Date.now()
  db.prepare('INSERT INTO roles (id, name, code, description, is_system) VALUES (?, ?, ?, ?, 0)')
    .run(id, name, code, description || '')

  if (permissions && Array.isArray(permissions)) {
    const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)')
    for (const perm of permissions) {
      try { stmt.run(id, perm) } catch (_) { /* ignore duplicate */ }
    }
  }

  const perms = db.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ?').all(id).map(p => p.permission_key)
  res.json({ code: 200, message: '角色创建成功', data: { id, name, code, description: description || '', isSystem: false, permissions: perms } })
})

/** 更新角色 */
router.put('/roles/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '角色不存在', data: null })

  const { name, code, description } = req.body
  if (name) db.prepare('UPDATE roles SET name = ? WHERE id = ?').run(name, id)
  if (code) {
    const dup = db.prepare('SELECT id FROM roles WHERE code = ? AND id != ?').get(code, id)
    if (dup) return res.json({ code: 400, message: '角色编码已存在', data: null })
    db.prepare('UPDATE roles SET code = ? WHERE id = ?').run(code, id)
  }
  if (description !== undefined) db.prepare('UPDATE roles SET description = ? WHERE id = ?').run(description, id)

  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
  const perms = db.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ?').all(id).map(p => p.permission_key)
  res.json({ code: 200, message: '角色更新成功', data: { id: role.id, name: role.name, code: role.code, description: role.description, isSystem: !!role.is_system, permissions: perms } })
})

/** 删除角色 */
router.delete('/roles/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
  if (!role) return res.json({ code: 404, message: '角色不存在', data: null })
  if (role.is_system) return res.json({ code: 400, message: '系统内置角色不可删除', data: null })

  // 检查是否有管理员使用此角色
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM admin_users WHERE role = ?').get(role.code).cnt
  if (userCount > 0) return res.json({ code: 400, message: `该角色被 ${userCount} 个管理员使用，请先切换角色`, data: null })

  db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
  db.prepare('DELETE FROM roles WHERE id = ?').run(id)
  res.json({ code: 200, message: '角色已删除', data: null })
})

/** 设置角色权限 */
router.put('/roles/:id/permissions', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
  if (!role) return res.json({ code: 404, message: '角色不存在', data: null })

  const { permissions } = req.body
  if (!Array.isArray(permissions)) return res.json({ code: 400, message: '权限列表格式错误', data: null })

  db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
  const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)')
  for (const perm of permissions) {
    try { stmt.run(id, perm) } catch (_) { /* ignore duplicate */ }
  }

  const perms = db.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ?').all(id).map(p => p.permission_key)
  res.json({ code: 200, message: '权限更新成功', data: { id: role.id, permissions: perms } })
})

// ========== 管理员用户管理增强 ==========

/** 获取管理员用户（含组织信息） */
router.get('/admin-users', (_req, res) => {
  const db = getDb()
  const list = db.prepare(`
    SELECT a.*, o.name AS org_name
    FROM admin_users a
    LEFT JOIN organizations o ON o.id = a.org_id
    ORDER BY a.created_at DESC
  `).all().map(r => ({
    id: r.id, username: r.username, name: r.name, role: r.role, phone: r.phone,
    status: r.status, createdAt: r.created_at,
    orgId: r.org_id || null, orgName: r.org_name || '-',
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

/** 更新管理员组织归属 */
router.put('/admin-users/:id/org', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '管理员不存在', data: null })

  const { orgId } = req.body
  db.prepare('UPDATE admin_users SET org_id = ? WHERE id = ?').run(orgId || null, id)

  const user = db.prepare(`
    SELECT a.*, o.name AS org_name FROM admin_users a
    LEFT JOIN organizations o ON o.id = a.org_id WHERE a.id = ?
  `).get(id)
  res.json({
    code: 200, message: '组织分配成功', data: {
      id: user.id, orgId: user.org_id || null, orgName: user.org_name || '-',
    }
  })
})

/** 新建管理员 */
router.post('/admin-users', (req, res) => {
  const db = getDb()
  const { username, name, role, phone, password, orgId } = req.body
  if (!username || !name || !password) return res.json({ code: 400, message: '用户名、姓名和密码不能为空', data: null })

  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username)
  if (existing) return res.json({ code: 400, message: '用户名已存在', data: null })

  const id = 'A' + Date.now()
  db.prepare(`INSERT INTO admin_users (id, username, password, name, role, phone, status, org_id)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`)
    .run(id, username, password, name, role || 'operator', phone || '', orgId || null)

  const user = db.prepare(`
    SELECT a.*, o.name AS org_name FROM admin_users a
    LEFT JOIN organizations o ON o.id = a.org_id WHERE a.id = ?
  `).get(id)
  res.json({
    code: 200, message: '管理员创建成功', data: {
      id: user.id, username: user.username, name: user.name, role: user.role,
      phone: user.phone, status: user.status, createdAt: user.created_at,
      orgId: user.org_id || null, orgName: user.org_name || '-',
    }
  })
})

/** 更新管理员 */
router.put('/admin-users/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '管理员不存在', data: null })

  const { username, name, role, phone, password, orgId, status } = req.body
  if (username && username !== existing.username) {
    const dup = db.prepare('SELECT id FROM admin_users WHERE username = ? AND id != ?').get(username, id)
    if (dup) return res.json({ code: 400, message: '用户名已存在', data: null })
  }

  db.prepare(`UPDATE admin_users SET
    username = ?, name = ?, role = ?, phone = ?,
    password = COALESCE(NULLIF(?,''), password),
    org_id = ?, status = ?
    WHERE id = ?`)
    .run(
      username || existing.username, name || existing.name, role || existing.role,
      phone || existing.phone, password || '', orgId !== undefined ? (orgId || null) : existing.org_id,
      status || existing.status, id
    )

  const user = db.prepare(`
    SELECT a.*, o.name AS org_name FROM admin_users a
    LEFT JOIN organizations o ON o.id = a.org_id WHERE a.id = ?
  `).get(id)
  res.json({
    code: 200, message: '管理员更新成功', data: {
      id: user.id, username: user.username, name: user.name, role: user.role,
      phone: user.phone, status: user.status, createdAt: user.created_at,
      orgId: user.org_id || null, orgName: user.org_name || '-',
    }
  })
})

/** 获取权限定义列表（前端用于权限矩阵展示） */
router.get('/permission-defs', (_req, res) => {
  const defs = [
    { key: 'dashboard:view', group: '仪表盘', label: '查看仪表盘' },
    { key: 'orders:view', group: '订单管理', label: '查看订单' },
    { key: 'orders:manage', group: '订单管理', label: '管理订单' },
    { key: 'dispatch:view', group: '调度管理', label: '查看调度' },
    { key: 'dispatch:manage', group: '调度管理', label: '管理调度' },
    { key: 'demands:view', group: '需求管理', label: '查看需求' },
    { key: 'demands:manage', group: '需求管理', label: '管理需求' },
    { key: 'contracts:view', group: '合同管理', label: '查看合同' },
    { key: 'contracts:manage', group: '合同管理', label: '管理合同' },
    { key: 'vehicles:view', group: '车辆管理', label: '查看车辆' },
    { key: 'vehicles:manage', group: '车辆管理', label: '管理车辆' },
    { key: 'drivers:view', group: '司机管理', label: '查看司机' },
    { key: 'drivers:manage', group: '司机管理', label: '管理司机' },
    { key: 'users:view', group: '用户管理', label: '查看用户' },
    { key: 'users:manage', group: '用户管理', label: '管理用户' },
    { key: 'finance:view', group: '财务管理', label: '查看财务' },
    { key: 'service:view', group: '客服中心', label: '查看客服' },
    { key: 'settings:view', group: '系统设置', label: '查看设置' },
    { key: 'settings:edit', group: '系统设置', label: '编辑设置' },
    { key: 'org:view', group: '组织架构', label: '查看组织' },
    { key: 'org:manage', group: '组织架构', label: '管理组织' },
    { key: 'fleets:view', group: '车队管理', label: '查看车队' },
    { key: 'fleets:manage', group: '车队管理', label: '管理车队' },
    { key: 'role:view', group: '角色权限', label: '查看角色' },
    { key: 'role:manage', group: '角色权限', label: '管理角色' },

  ]
  res.json({ code: 200, message: 'ok', data: defs })
})

// ========== 车队信息管理 ==========

function getFleetStats(db, orgId) {
  const driverCount = db.prepare('SELECT COUNT(*) as cnt FROM drivers WHERE org_id = ?').get(orgId).cnt
  const vehicleCount = db.prepare('SELECT COUNT(*) as cnt FROM cars WHERE org_id = ?').get(orgId).cnt
  const totalOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE org_id = ? AND status = '已完成'").get(orgId).cnt
  const allOrders = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE org_id = ?').get(orgId).cnt
  const cancelled = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE org_id = ? AND status IN ('已取消','已关闭')").get(orgId).cnt
  const rejectRate = allOrders > 0 ? Number(((cancelled / allOrders) * 100).toFixed(1)) : 0
  const ratingRow = db.prepare('SELECT COALESCE(AVG(stars),0) as avg FROM reviews WHERE org_id = ?').get(orgId)
  const rating = Number(ratingRow.avg.toFixed(1))
  return { driverCount, vehicleCount, totalOrders, rejectRate, rating }
}

/** 获取车队列表 */
router.get('/fleets', (req, res) => {
  const db = getDb()
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'f.org_id') : ''
  const list = db.prepare(`
    SELECT f.*, o.name AS org_name
    FROM fleets f
    LEFT JOIN organizations o ON o.id = f.org_id
    ${orgW ? 'WHERE 1=1' + orgW : ''}
    ORDER BY f.created_at DESC
  `).all(...orgFilter.params).map(f => {
    const stats = getFleetStats(db, f.org_id)
    let entryConfig = {}
    try { entryConfig = JSON.parse(f.entry_config || '{}') } catch (_) { entryConfig = {} }
    return {
      id: f.id, orgId: f.org_id, orgName: f.org_name || '-',
      name: f.name, leaderName: f.leader_name, leaderPhone: f.leader_phone,
      logo: f.logo || '',
      serviceEnabled: !!f.service_enabled, entryEnabled: !!f.entry_enabled,
      entryConfig: { home: true, order: true, orderList: true, profile: true, invoice: true, reviews: true, settings: true, showCharter: true, showCommute: true, showCustom: true, bannerTitle: '', bannerSubtitle: '', ...entryConfig },
      createdAt: f.created_at, ...stats,
    }
  })
  res.json({ code: 200, message: 'ok', data: list })
})

/** 创建车队 */
router.post('/fleets', (req, res) => {
  const db = getDb()
  const { orgId, name, leaderName, leaderPhone, serviceEnabled, entryEnabled, entryConfig, logo } = req.body
  if (!orgId || !name) return res.json({ code: 400, message: '所属组织和车队名称不能为空', data: null })

  const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get(orgId)
  if (!org) return res.json({ code: 404, message: '所属组织不存在', data: null })

  const existing = db.prepare('SELECT id FROM fleets WHERE org_id = ?').get(orgId)
  if (existing) return res.json({ code: 400, message: '该组织已关联车队', data: null })

  const id = 'F' + Date.now()
  db.prepare('INSERT INTO fleets (id, org_id, name, leader_name, leader_phone, logo, service_enabled, entry_enabled, entry_config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, orgId, name, leaderName || '', leaderPhone || '', logo || '', serviceEnabled ? 1 : 0, entryEnabled ? 1 : 0, JSON.stringify(entryConfig || {}))

  const f = db.prepare('SELECT f.*, o.name AS org_name FROM fleets f LEFT JOIN organizations o ON o.id = f.org_id WHERE f.id = ?').get(id)
  const stats = getFleetStats(db, f.org_id)
  let cfg = {}
  try { cfg = JSON.parse(f.entry_config || '{}') } catch (_) { cfg = {} }
  res.json({
    code: 200, message: '车队创建成功', data: {
      id: f.id, orgId: f.org_id, orgName: f.org_name || '-',
      name: f.name, leaderName: f.leader_name, leaderPhone: f.leader_phone,
      logo: f.logo || '',
      serviceEnabled: !!f.service_enabled, entryEnabled: !!f.entry_enabled,
      entryConfig: { home: true, order: true, orderList: true, profile: true, invoice: true, reviews: true, settings: true, showCharter: true, showCommute: true, showCustom: true, bannerTitle: '', bannerSubtitle: '', ...cfg },
      createdAt: f.created_at, ...stats,
    }
  })
})

/** 更新车队 */
router.put('/fleets/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM fleets WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '车队不存在', data: null })
  if (!checkOrgAccess(req, 'fleets', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该车队', data: null })
  }

  const { name, leaderName, leaderPhone, serviceEnabled, entryEnabled, entryConfig, logo } = req.body
  db.prepare('UPDATE fleets SET name = ?, leader_name = ?, leader_phone = ?, logo = ?, service_enabled = ?, entry_enabled = ?, entry_config = ? WHERE id = ?')
    .run(
      name || existing.name,
      leaderName !== undefined ? leaderName : existing.leader_name,
      leaderPhone !== undefined ? leaderPhone : existing.leader_phone,
      logo !== undefined ? logo : existing.logo,
      serviceEnabled !== undefined ? (serviceEnabled ? 1 : 0) : existing.service_enabled,
      entryEnabled !== undefined ? (entryEnabled ? 1 : 0) : existing.entry_enabled,
      entryConfig !== undefined ? JSON.stringify(entryConfig) : existing.entry_config,
      id
    )

  const f = db.prepare('SELECT f.*, o.name AS org_name FROM fleets f LEFT JOIN organizations o ON o.id = f.org_id WHERE f.id = ?').get(id)
  const stats = getFleetStats(db, f.org_id)
  let cfg = {}
  try { cfg = JSON.parse(f.entry_config || '{}') } catch (_) { cfg = {} }
  res.json({
    code: 200, message: '车队更新成功', data: {
      id: f.id, orgId: f.org_id, orgName: f.org_name || '-',
      name: f.name, leaderName: f.leader_name, leaderPhone: f.leader_phone,
      logo: f.logo || '',
      serviceEnabled: !!f.service_enabled, entryEnabled: !!f.entry_enabled,
      entryConfig: { home: true, order: true, orderList: true, profile: true, invoice: true, reviews: true, settings: true, showCharter: true, showCommute: true, showCustom: true, bannerTitle: '', bannerSubtitle: '', ...cfg },
      createdAt: f.created_at, ...stats,
    }
  })
})

/** 删除车队 */
router.delete('/fleets/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM fleets WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '车队不存在', data: null })
  if (!checkOrgAccess(req, 'fleets', 'id', id)) {
    return res.json({ code: 403, message: '无权限操作该车队', data: null })
  }
  db.prepare('DELETE FROM fleets WHERE id = ?').run(id)
  res.json({ code: 200, message: '车队已删除', data: null })
})

// ========== 城市管理（支持车队维度） ==========

/** 获取城市列表（可按车队筛选，含车队关联信息） */
router.get('/cities', (req, res) => {
  const db = getDb()
  const { fleetId } = req.query

  if (fleetId) {
    // 查询指定车队的城市
    const list = db.prepare(`
      SELECT c.*, fc.fleet_id
      FROM cities c
      INNER JOIN fleet_cities fc ON fc.city_id = c.id
      WHERE fc.fleet_id = ?
      ORDER BY c.sort_order, c.id
    `).all(fleetId)
    return res.json({
      code: 200, message: 'ok',
      data: list.map(c => ({ id: c.id, name: c.name, sortOrder: c.sort_order, createdAt: c.created_at, fleetId: c.fleet_id })),
    })
  }

  // 查询全部城市 + 关联的车队信息
  const cities = db.prepare('SELECT * FROM cities ORDER BY sort_order, id').all()
  const fleetCityMap = {}
  const allMappings = db.prepare(`
    SELECT fc.city_id, fc.fleet_id, f.name AS fleet_name
    FROM fleet_cities fc
    JOIN fleets f ON f.id = fc.fleet_id
  `).all()
  for (const m of allMappings) {
    if (!fleetCityMap[m.city_id]) fleetCityMap[m.city_id] = []
    fleetCityMap[m.city_id].push({ fleetId: m.fleet_id, fleetName: m.fleet_name })
  }

  res.json({
    code: 200, message: 'ok',
    data: cities.map(c => ({
      id: c.id, name: c.name, sortOrder: c.sort_order, createdAt: c.created_at,
      fleets: fleetCityMap[c.id] || [],
    })),
  })
})

/** 添加城市（全局添加 + 可选关联到指定车队） */
router.post('/cities', (req, res) => {
  const db = getDb()
  const { name, fleetId } = req.body
  if (!name || !name.trim()) return res.json({ code: 400, message: '城市名称不能为空', data: null })

  const existing = db.prepare('SELECT id FROM cities WHERE name = ?').get(name.trim())
  if (existing) {
    // 城市已存在，如果指定了车队则尝试关联
    if (fleetId) {
      const fleet = db.prepare('SELECT id, name FROM fleets WHERE id = ?').get(fleetId)
      if (!fleet) return res.json({ code: 404, message: '车队不存在', data: null })
      const linkResult = db.prepare('INSERT OR IGNORE INTO fleet_cities (fleet_id, city_id) VALUES (?, ?)').run(fleetId, existing.id)
      if (linkResult.changes > 0) {
        const city = db.prepare('SELECT * FROM cities WHERE id = ?').get(existing.id)
        return res.json({ code: 200, message: `城市已关联到车队「${fleet.name}」`, data: { id: city.id, name: city.name, sortOrder: city.sort_order, createdAt: city.created_at, fleetId } })
      }
      return res.json({ code: 200, message: '城市已存在且已关联', data: { id: existing.id, name: existing.name, fleetId } })
    }
    return res.json({ code: 400, message: '城市已存在', data: null })
  }

  // 获取最大排序值
  const maxOrder = db.prepare('SELECT MAX(sort_order) AS max FROM cities').get()
  const sortOrder = (maxOrder.max || 0) + 1

  const tx = db.transaction(() => {
    const result = db.prepare('INSERT INTO cities (name, sort_order) VALUES (?, ?)').run(name.trim(), sortOrder)
    const cityId = result.lastInsertRowid

    // 如果指定了车队，关联到该车队
    if (fleetId) {
      db.prepare('INSERT OR IGNORE INTO fleet_cities (fleet_id, city_id) VALUES (?, ?)').run(fleetId, cityId)
    } else {
      // 如果没指定车队，默认关联到所有已有车队
      const allFleets = db.prepare('SELECT id FROM fleets').all()
      const linkStmt = db.prepare('INSERT OR IGNORE INTO fleet_cities (fleet_id, city_id) VALUES (?, ?)')
      for (const f of allFleets) {
        linkStmt.run(f.id, cityId)
      }
    }
    return cityId
  })
  const cityId = tx()
  const city = db.prepare('SELECT * FROM cities WHERE id = ?').get(cityId)
  res.json({ code: 200, message: '城市添加成功', data: { id: city.id, name: city.name, sortOrder: city.sort_order, createdAt: city.created_at, fleetId: fleetId || null } })
})

/** 删除城市（从指定车队移除，或全局删除） */
router.delete('/cities/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params
  const { fleetId } = req.query

  const existing = db.prepare('SELECT * FROM cities WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '城市不存在', data: null })

  if (fleetId) {
    // 仅从指定车队移除城市关联
    const fleet = db.prepare('SELECT id, name FROM fleets WHERE id = ?').get(fleetId)
    if (!fleet) return res.json({ code: 404, message: '车队不存在', data: null })
    const result = db.prepare('DELETE FROM fleet_cities WHERE fleet_id = ? AND city_id = ?').run(fleetId, id)
    if (result.changes === 0) {
      return res.json({ code: 404, message: `车队「${fleet.name}」未关联该城市`, data: null })
    }
    return res.json({ code: 200, message: `已从车队「${fleet.name}」移除城市「${existing.name}」`, data: { success: true } })
  }

  // 全局删除城市及所有车队关联
  db.prepare('DELETE FROM fleet_cities WHERE city_id = ?').run(id)
  db.prepare('DELETE FROM cities WHERE id = ?').run(id)
  res.json({ code: 200, message: '城市已删除', data: { success: true } })
})

// ========== 发票管理（管理端） ==========

/** 获取所有发票列表 */
router.get('/invoices', adminAuth, (req, res) => {
  const db = getDb()
  const { search, status, invoiceType } = req.query

  let sql = `
    SELECT iv.*,
      u.name AS customerName,
      u.phone AS customerPhone
    FROM invoices iv
    LEFT JOIN orders o ON o.order_no = (
      CASE
        WHEN iv.order_ids IS NOT NULL AND iv.order_ids != '[]'
        THEN (SELECT value FROM json_each(iv.order_ids) LIMIT 1)
        ELSE iv.order_no
      END
    )
    LEFT JOIN users u ON u.id = o.user_id
  `
  const conditions = []
  const params = []

  if (search) {
    conditions.push('(iv.title LIKE ? OR iv.order_no LIKE ? OR iv.order_ids LIKE ? OR iv.tax_id LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status && status !== 'all') {
    conditions.push('iv.status = ?')
    params.push(status)
  }
  if (invoiceType && invoiceType !== 'all') {
    conditions.push('iv.invoice_type = ?')
    params.push(invoiceType)
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  // 去重：按 iv.id 分组
  sql += ' GROUP BY iv.id ORDER BY iv.applied_at DESC, iv.id DESC'

  const rows = db.prepare(sql).all(...params)

  const list = rows.map(inv => {
    let orderNos = []
    try { orderNos = JSON.parse(inv.order_ids || '[]') } catch { orderNos = [inv.order_no] }
    return {
      id: inv.id,
      orderNos,
      title: inv.title,
      amount: inv.amount,
      invoiceType: inv.invoice_type || '个人',
      taxId: inv.tax_id || '',
      email: inv.email || '',
      status: inv.status || '申请中',
      appliedAt: inv.applied_at || '',
      customerName: inv.customerName || '',
      customerPhone: inv.customerPhone || '',
      date: inv.applied_at || inv.date,
    }
  })

  res.json({ code: 200, message: 'ok', data: list })
})

/** 更新发票状态（已申请 → 开票中 → 已开票） */
router.put('/invoices/:id/status', adminAuth, (req, res) => {
  const db = getDb()
  const { id } = req.params
  const { status } = req.body

  const validStatuses = ['申请中', '已申请', '开票中', '已开票']
  if (!validStatuses.includes(status)) {
    return res.json({ code: 400, message: '无效的状态值', data: null })
  }

  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id)
  if (!existing) {
    return res.json({ code: 404, message: '发票不存在', data: null })
  }

  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id)

  res.json({
    code: 200,
    message: `发票状态已更新为「${status}」`,
    data: { id: Number(id), status },
  })
})

// ===== 调度排班管理 =====

// 校验车辆在指定时间段是否有冲突
router.get('/schedules/check-vehicle-conflict', adminAuth, (req, res) => {
  const db = getDb()
  const { plateNumber, date, departTime, returnTime, excludeId } = req.query

  if (!plateNumber || !date || !departTime) {
    return res.json({ code: 400, message: '缺少 plateNumber、date 或 departTime', data: { hasConflict: false, conflicts: [] } })
  }

  const effectiveReturn = returnTime || '23:59'

  const conflicts = db.prepare(`
    SELECT * FROM dispatch_schedules
    WHERE plate_number = ?
      AND date = ?
      AND depart_time IS NOT NULL AND depart_time != ''
      AND depart_time < ?
      AND (
        CASE WHEN return_time IS NOT NULL AND return_time != '' THEN return_time > ? ELSE '23:59' > ? END
      )
      ${excludeId ? 'AND id != ?' : ''}
    ORDER BY depart_time ASC
  `).all(
    plateNumber, date,
    effectiveReturn,
    departTime, departTime,
    ...(excludeId ? [excludeId] : [])
  )

  res.json({
    code: 200,
    data: {
      hasConflict: conflicts.length > 0,
      conflicts: conflicts.map(c => ({
        id: c.id,
        date: c.date,
        departTime: c.depart_time,
        returnTime: c.return_time || '',
        route: c.route || '',
        driver: c.driver || '',
        charterContract: c.charter_contract || '',
        status: c.status || '待确认',
      })),
    },
  })
})

// 获取排班列表
router.get('/schedules', adminAuth, (req, res) => {
  const db = getDb()
  const { search, dateFrom, dateTo, fleet, page = '1', pageSize = '20' } = req.query
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 's.org_id') : ''

  let where = 'WHERE 1=1'
  const params = []

  if (search) {
    where += ' AND (s.driver LIKE ? OR s.plate_number LIKE ? OR s.unit LIKE ? OR s.route LIKE ? OR s.charter_contract LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (dateFrom) {
    where += ' AND s.date >= ?'
    params.push(dateFrom)
  }
  if (dateTo) {
    where += ' AND s.date <= ?'
    params.push(dateTo)
  }
  if (fleet && fleet !== 'all') {
    where += ' AND s.fleet = ?'
    params.push(fleet)
  }
  where += orgW
  params.push(...orgFilter.params)

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM dispatch_schedules s ${where}`).get(...params)

  const offset = (Number(page) - 1) * Number(pageSize)
  const list = db.prepare(
    `SELECT s.* FROM dispatch_schedules s ${where} ORDER BY s.date DESC, s.id DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset).map(r => ({
    id: r.id,
    date: r.date,
    charterContract: r.charter_contract,
    fleet: r.fleet,
    charterType: r.charter_type,
    plateNumber: r.plate_number,
    departTime: r.depart_time,
    passengerCount: r.passenger_count,
    unit: r.unit,
    driver: r.driver,
    route: r.route,
    vehicleStatus: r.vehicle_status,
    dispatcher: r.dispatcher,
    kilometers: r.kilometers,
    returnTime: r.return_time,
    phone: r.phone,
    remark: r.remark,
    orgId: r.org_id || '',
    orderNo: r.order_no || '',
    status: r.status || '待确认',
    notifyStatus: r.notify_status || '未通知',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  res.json({
    code: 200, message: 'ok',
    data: { list, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / Number(pageSize)) }
  })
})

// 新增排班记录
router.post('/schedules', adminAuth, (req, res) => {
  const db = getDb()
  const {
    date, charterContract, fleet, charterType, plateNumber,
    departTime, passengerCount, unit, driver, route,
    vehicleStatus, dispatcher, kilometers, returnTime, phone, remark
  } = req.body

  if (!date) return res.json({ code: 400, message: '请选择日期', data: null })

  const orgId = req.body.orgId || req.adminOrgId || ''

  // 自动生成订单号：HY + YYYYMMDD + 当日序号
  const dateNoHyphen = date.replace(/-/g, '')
  const todayCount = db.prepare(
    `SELECT COUNT(*) as cnt FROM dispatch_schedules WHERE date = ?`
  ).get(date).cnt
  const orderNo = `HY${dateNoHyphen}${String(todayCount + 1).padStart(3, '0')}`

  const result = db.prepare(`
    INSERT INTO dispatch_schedules (date, charter_contract, fleet, charter_type, plate_number,
      depart_time, passenger_count, unit, driver, route, vehicle_status, dispatcher,
      kilometers, return_time, phone, remark, order_no, org_id, status, notify_status, schedule_type)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    date, charterContract || '', fleet || '', charterType || '', plateNumber || '',
    departTime || '', passengerCount || 0, unit || '', driver || '', route || '',
    vehicleStatus || '', dispatcher || '', kilometers || 0, returnTime || '', phone || '', remark || '',
    orderNo, orgId,
    '待确认', '未通知', 'commute'
  )

  const record = db.prepare('SELECT * FROM dispatch_schedules WHERE id = ?').get(result.lastInsertRowid)
  res.json({ code: 200, message: '排班记录添加成功', data: {
    id: record.id,
    date: record.date,
    charterContract: record.charter_contract,
    fleet: record.fleet,
    charterType: record.charter_type,
    plateNumber: record.plate_number,
    departTime: record.depart_time,
    passengerCount: record.passenger_count,
    unit: record.unit,
    driver: record.driver,
    route: record.route,
    vehicleStatus: record.vehicle_status,
    dispatcher: record.dispatcher,
    kilometers: record.kilometers,
    returnTime: record.return_time,
    phone: record.phone,
    remark: record.remark,
    orgId: record.org_id || '',
    orderNo: record.order_no || '',
    status: record.status || '待确认',
    notifyStatus: record.notify_status || '未通知',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }})
})

// 更新排班记录
router.put('/schedules/:id', adminAuth, (req, res) => {
  const { id } = req.params
  const db = getDb()
  const existing = db.prepare('SELECT * FROM dispatch_schedules WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '排班记录不存在', data: null })

  const {
    date, charterContract, fleet, charterType, plateNumber,
    departTime, passengerCount, unit, driver, route,
    vehicleStatus, dispatcher, kilometers, returnTime, phone, remark, orderNo,
    status, notifyStatus
  } = req.body

  // 车辆时间冲突校验：如果更新车牌号且非空，检查时间段是否与同车辆其他排班重叠
  const checkPlate = plateNumber !== undefined ? plateNumber : existing.plate_number
  const checkDate = date || existing.date
  const checkDepart = departTime !== undefined ? departTime : existing.depart_time
  const checkReturn = returnTime !== undefined ? returnTime : existing.return_time
  if (checkPlate && checkDepart) {
    const effectiveReturn = checkReturn || '23:59'
    const conflictCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM dispatch_schedules
      WHERE plate_number = ? AND date = ? AND id != ?
        AND depart_time IS NOT NULL AND depart_time != ''
        AND depart_time < ?
        AND (CASE WHEN return_time IS NOT NULL AND return_time != '' THEN return_time > ? ELSE '23:59' > ? END)
    `).get(checkPlate, checkDate, id, effectiveReturn, checkDepart, checkDepart).cnt
    if (conflictCount > 0) {
      return res.json({ code: 400, message: `车辆 ${checkPlate} 在 ${checkDate} ${checkDepart} 时间段已被占用，无法分配`, data: null })
    }
  }

  db.prepare(`
    UPDATE dispatch_schedules SET
      date = ?, charter_contract = ?, fleet = ?, charter_type = ?, plate_number = ?,
      depart_time = ?, passenger_count = ?, unit = ?, driver = ?, route = ?,
      vehicle_status = ?, dispatcher = ?, kilometers = ?, return_time = ?, phone = ?,
      remark = ?, order_no = ?, status = ?, notify_status = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    date || existing.date,
    charterContract !== undefined ? charterContract : existing.charter_contract,
    fleet !== undefined ? fleet : existing.fleet,
    charterType !== undefined ? charterType : existing.charter_type,
    plateNumber !== undefined ? plateNumber : existing.plate_number,
    departTime !== undefined ? departTime : existing.depart_time,
    passengerCount !== undefined ? passengerCount : existing.passenger_count,
    unit !== undefined ? unit : existing.unit,
    driver !== undefined ? driver : existing.driver,
    route !== undefined ? route : existing.route,
    vehicleStatus !== undefined ? vehicleStatus : existing.vehicle_status,
    dispatcher !== undefined ? dispatcher : existing.dispatcher,
    kilometers !== undefined ? kilometers : existing.kilometers,
    returnTime !== undefined ? returnTime : existing.return_time,
    phone !== undefined ? phone : existing.phone,
    remark !== undefined ? remark : existing.remark,
    orderNo !== undefined ? orderNo : (existing.order_no || ''),
    status !== undefined ? status : (existing.status || '待确认'),
    notifyStatus !== undefined ? notifyStatus : (existing.notify_status || '未通知'),
    id
  )

  const updated = db.prepare('SELECT * FROM dispatch_schedules WHERE id = ?').get(id)
  res.json({ code: 200, message: '排班记录已更新', data: {
    id: updated.id, date: updated.date, charterContract: updated.charter_contract,
    fleet: updated.fleet, charterType: updated.charter_type, plateNumber: updated.plate_number,
    departTime: updated.depart_time, passengerCount: updated.passenger_count,
    unit: updated.unit, driver: updated.driver, route: updated.route,
    vehicleStatus: updated.vehicle_status, dispatcher: updated.dispatcher,
    kilometers: updated.kilometers, returnTime: updated.return_time,
    phone: updated.phone, remark: updated.remark, orgId: updated.org_id || '',
    orderNo: updated.order_no || '',
    status: updated.status || '待确认', notifyStatus: updated.notify_status || '未通知',
    createdAt: updated.created_at, updatedAt: updated.updated_at,
  }})
})

// 批量确认排班
router.post('/schedules/confirm', adminAuth, (req, res) => {
  const db = getDb()
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.json({ code: 400, message: '请选择要确认的排班记录', data: null })
  }

  // 检查所选排班是否都已安排司机
  const placeholders = ids.map(() => '?').join(',')
  const schedules = db.prepare(`SELECT id, driver FROM dispatch_schedules WHERE id IN (${placeholders})`).all(...ids)
  const noDriver = schedules.filter(s => !s.driver)
  if (noDriver.length > 0) {
    return res.json({ code: 400, message: `排班记录 ${noDriver.map(s => s.id).join(', ')} 未安排司机，无法确认`, data: null })
  }

  // 批量更新状态为"已确认"
  db.prepare(`UPDATE dispatch_schedules SET status = '已确认', updated_at = datetime('now','localtime') WHERE id IN (${placeholders})`).run(...ids)
  res.json({ code: 200, message: `已确认 ${ids.length} 条排班记录`, data: { ids } })
})

// 批量通知司机（更新通知状态）
router.post('/schedules/notify-status', adminAuth, (req, res) => {
  const db = getDb()
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.json({ code: 400, message: '请选择要通知的排班记录', data: null })
  }

  // 检查所选排班是否已确认
  const placeholders = ids.map(() => '?').join(',')
  const schedules = db.prepare(`SELECT id, status FROM dispatch_schedules WHERE id IN (${placeholders})`).all(...ids)
  const notConfirmed = schedules.filter(s => s.status !== '已确认')
  if (notConfirmed.length > 0) {
    return res.json({ code: 400, message: `排班记录 ${notConfirmed.map(s => s.id).join(', ')} 尚未确认排班，无法通知`, data: null })
  }

  // 批量更新通知状态为"已通知"
  db.prepare(`UPDATE dispatch_schedules SET notify_status = '已通知', updated_at = datetime('now','localtime') WHERE id IN (${placeholders})`).run(...ids)
  res.json({ code: 200, message: `已通知 ${ids.length} 条排班记录的司机`, data: { ids } })
})

// 删除排班记录
router.delete('/schedules/:id', adminAuth, (req, res) => {
  const { id } = req.params
  const db = getDb()
  const existing = db.prepare('SELECT * FROM dispatch_schedules WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '排班记录不存在', data: null })

  db.prepare('DELETE FROM dispatch_schedules WHERE id = ?').run(id)
  res.json({ code: 200, message: '排班记录已删除', data: { id: Number(id) } })
})

// 排班字段映射（导出用，16列）
const SCHEDULE_FIELDS = [
  { key: 'date', label: '日期', width: 12 },
  { key: 'charterContract', label: '包车合同', width: 20 },
  { key: 'fleet', label: '车队', width: 16 },
  { key: 'charterType', label: '包车类型', width: 14 },
  { key: 'plateNumber', label: '车牌号码', width: 14 },
  { key: 'departTime', label: '出车时间', width: 18 },
  { key: 'passengerCount', label: '实裁人数', width: 10 },
  { key: 'unit', label: '用车单位', width: 22 },
  { key: 'driver', label: '驾驶员', width: 12 },
  { key: 'route', label: '行程', width: 28 },
  { key: 'vehicleStatus', label: '车辆状态', width: 12 },
  { key: 'dispatcher', label: '调度员', width: 12 },
  { key: 'kilometers', label: '公里数', width: 10 },
  { key: 'returnTime', label: '收车时间', width: 18 },
  { key: 'phone', label: '电话', width: 16 },
  { key: 'remark', label: '备注', width: 30 },
]

// 导入模板字段（不含车队和驾驶员，系统自动填充）
const IMPORT_FIELDS = [
  { key: 'date', label: '日期', width: 12 },
  { key: 'charterContract', label: '包车合同', width: 20 },
  { key: 'charterType', label: '包车类型', width: 14 },
  { key: 'plateNumber', label: '车牌号码', width: 14 },
  { key: 'departTime', label: '出车时间', width: 18 },
  { key: 'passengerCount', label: '实裁人数', width: 10 },
  { key: 'unit', label: '用车单位', width: 22 },
  { key: 'route', label: '行程', width: 28 },
  { key: 'vehicleStatus', label: '车辆状态', width: 12 },
  { key: 'dispatcher', label: '调度员', width: 12 },
  { key: 'kilometers', label: '公里数', width: 10 },
  { key: 'returnTime', label: '收车时间', width: 18 },
  { key: 'phone', label: '电话', width: 16 },
  { key: 'remark', label: '备注', width: 30 },
]

// 生成 Excel 工作表
function generateScheduleSheet(db, search, dateFrom, dateTo, fleet, orgScope) {
  let where = 'WHERE 1=1'
  const params = []

  if (search) {
    where += ' AND (driver LIKE ? OR plate_number LIKE ? OR unit LIKE ? OR route LIKE ? OR charter_contract LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (dateFrom) { where += ' AND date >= ?'; params.push(dateFrom) }
  if (dateTo) { where += ' AND date <= ?'; params.push(dateTo) }
  if (fleet && fleet !== 'all') { where += ' AND fleet = ?'; params.push(fleet) }

  // 组织范围过滤
  if (orgScope && orgScope.length > 0) {
    const ph = orgScope.map(() => '?').join(',')
    where += ` AND (org_id IS NULL OR org_id = '' OR org_id IN (${ph}))`
    params.push(...orgScope)
  }

  const rows = db.prepare(
    `SELECT * FROM dispatch_schedules ${where} ORDER BY date DESC, id DESC`
  ).all(...params)

  const headerRow = SCHEDULE_FIELDS.map(f => f.label)
  const dataRows = rows.map(r => [
    r.date || '',
    r.charter_contract || '',
    r.fleet || '',
    r.charter_type || '',
    r.plate_number || '',
    r.depart_time || '',
    r.passenger_count || 0,
    r.unit || '',
    r.driver || '',
    r.route || '',
    r.vehicle_status || '',
    r.dispatcher || '',
    r.kilometers || 0,
    r.return_time || '',
    r.phone || '',
    r.remark || '',
  ])

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
  ws['!cols'] = SCHEDULE_FIELDS.map(f => ({ wch: f.width }))
  return ws
}

// 导出排班数据为 Excel
router.get('/schedules/export', adminAuth, (req, res) => {
  const db = getDb()
  const { search, dateFrom, dateTo, fleet } = req.query

  try {
    const ws = generateScheduleSheet(db, search, dateFrom, dateTo, fleet, req.adminOrgScope)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '调度排班')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `调度排班_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.send(buf)
  } catch (e) {
    console.error('导出排班失败:', e)
    res.json({ code: 500, message: '导出失败', data: null })
  }
})

// 下载导入模板
router.get('/schedules/template', adminAuth, (_req, res) => {
  try {
    const headerRow = IMPORT_FIELDS.map(f => f.label)
    const sampleRow = [
      '2026-07-16', 'HT-2026-001', '按天包', '粤A·88888',
      '2026-07-16 08:00', '35', '某某公司', '深圳北站→广州南站',
      '出车中', '李四', '120', '2026-07-16 18:00', '13800138000', '示例备注'
    ]
    const tipsRow = ['提示: 导入时请删除本行及示例数据行, 车队和驾驶员由系统自动匹配, 日期 YYYY-MM-DD, 时间 YYYY-MM-DD HH:mm']

    const ws = XLSX.utils.aoa_to_sheet([headerRow, tipsRow, sampleRow])
    ws['!cols'] = IMPORT_FIELDS.map(f => ({ wch: f.width }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '调度排班导入模板')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('调度排班导入模板.xlsx')}`)
    res.send(buf)
  } catch (e) {
    console.error('生成模板失败:', e)
    res.json({ code: 500, message: '生成模板失败', data: null })
  }
})

// 批量导入排班数据
router.post('/schedules/import', adminAuth, (req, res) => {
  const db = getDb()
  const { rows } = req.body

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.json({ code: 400, message: '没有可导入的数据', data: null })
  }

  const orgId = req.body.orgId || req.adminOrgId || ''
  const orgScope = req.adminOrgScope || []

  // 获取管理员所属车队名称
  let fleetName = ''
  if (orgId) {
    const fleet = db.prepare('SELECT name FROM fleets WHERE org_id = ?').get(orgId)
    if (fleet) fleetName = fleet.name
  }

  // 车牌→驾驶员缓存（同一车牌只查一次）
  const plateDriverCache = new Map()
  const platePhoneCache = new Map()

  // 校验车牌是否在当前组织范围内存在
  const validatePlate = (plate) => {
    if (!plate || !plate.trim()) return null
    if (plateDriverCache.has(plate)) return plateDriverCache.get(plate)

    // 查询驾驶员：车牌匹配 + 组织范围
    let driver = null
    if (orgScope.length > 0) {
      const ph = orgScope.map(() => '?').join(',')
      driver = db.prepare(
        `SELECT name, phone FROM drivers WHERE vehicle_plate = ? AND (org_id IS NULL OR org_id = '' OR org_id IN (${ph})) LIMIT 1`
      ).get(plate, ...orgScope)
    } else {
      driver = db.prepare(
        'SELECT name, phone FROM drivers WHERE vehicle_plate = ? LIMIT 1'
      ).get(plate)
    }

    // 如果 drivers 表没有，再查 cars 表确认车牌存在
    if (!driver) {
      let car = null
      if (orgScope.length > 0) {
        const ph = orgScope.map(() => '?').join(',')
        car = db.prepare(
          `SELECT plate_number FROM cars WHERE plate_number = ? AND (org_id IS NULL OR org_id = '' OR org_id IN (${ph})) LIMIT 1`
        ).get(plate, ...orgScope)
      } else {
        car = db.prepare('SELECT plate_number FROM cars WHERE plate_number = ? LIMIT 1').get(plate)
      }
      if (car) {
        // 车牌存在但没有对应驾驶员
        plateDriverCache.set(plate, '')
        platePhoneCache.set(plate, '')
        return ''
      }
    }

    if (driver) {
      plateDriverCache.set(plate, driver.name || '')
      platePhoneCache.set(plate, driver.phone || '')
      return driver.name
    }

    // 车牌不在车队范围内
    plateDriverCache.set(plate, null)
    platePhoneCache.set(plate, null)
    return null
  }

  const fieldMap = {
    '日期': 'date', '包车合同': 'charterContract', '包车类型': 'charterType',
    '车牌号码': 'plateNumber', '出车时间': 'departTime', '实裁人数': 'passengerCount',
    '用车单位': 'unit', '行程': 'route', '车辆状态': 'vehicleStatus',
    '调度员': 'dispatcher', '公里数': 'kilometers', '收车时间': 'returnTime',
    '电话': 'phone', '备注': 'remark',
  }

  let success = 0
  let errors = []

  const insert = db.prepare(`
    INSERT INTO dispatch_schedules (date, charter_contract, fleet, charter_type, plate_number,
      depart_time, passenger_count, unit, driver, route, vehicle_status, dispatcher,
      kilometers, return_time, phone, remark, org_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `)

  const insertMany = db.transaction((rowList) => {
    for (let i = 0; i < rowList.length; i++) {
      const src = rowList[i]
      let values = {}

      if (Array.isArray(src)) {
        // Excel 行数据，按 IMPORT_FIELDS 顺序映射
        IMPORT_FIELDS.forEach((f, idx) => {
          values[f.key] = src[idx] !== undefined ? String(src[idx]) : ''
        })
      } else {
        // 对象格式
        for (const [cnLabel, dbKey] of Object.entries(fieldMap)) {
          if (src[dbKey] !== undefined) values[dbKey] = String(src[dbKey] ?? '')
          else if (src[cnLabel] !== undefined) values[cnLabel] = String(src[cnLabel] ?? '')
        }
        for (const f of IMPORT_FIELDS) {
          if (src[f.key] !== undefined) values[f.key] = String(src[f.key] ?? '')
        }
      }

      const date = (values.date || '').trim()
      if (!date) {
        errors.push(`第 ${i + 1} 行: 日期不能为空`)
        continue
      }

      const plate = (values.plateNumber || '').trim()
      if (!plate) {
        errors.push(`第 ${i + 1} 行: 车牌号码不能为空`)
        continue
      }

      // 校验车牌并获取驾驶员
      const driverName = validatePlate(plate)
      if (driverName === null) {
        errors.push(`第 ${i + 1} 行: 没有该车牌(${plate})`)
        continue
      }

      // 自动填充车队（来自管理员所属车队）
      const autoFleet = values.fleet || fleetName

      // 自动填充驾驶员（从车牌匹配）
      const autoDriver = values.driver || driverName

      // 自动填充电话（从驾驶员匹配）
      const autoPhone = values.phone || platePhoneCache.get(plate) || ''

      insert.run(
        date,
        values.charterContract || '',
        autoFleet,
        values.charterType || '',
        plate,
        values.departTime || '',
        Number(values.passengerCount) || 0,
        values.unit || '',
        autoDriver,
        values.route || '',
        values.vehicleStatus || '',
        values.dispatcher || '',
        Number(values.kilometers) || 0,
        values.returnTime || '',
        autoPhone,
        values.remark || '',
        orgId
      )
      success++
    }
  })

  try {
    insertMany(rows)
    const resultMessage = `导入完成: 成功 ${success} 条` + (errors.length > 0 ? `, 失败 ${errors.length} 条` : '')
    res.json({
      code: 200,
      message: resultMessage,
      data: { success, errors: errors.slice(0, 20), total: rows.length, message: resultMessage }
    })
  } catch (e) {
    console.error('批量导入排班失败:', e)
    res.json({ code: 500, message: '导入失败: ' + e.message, data: null })
  }
})

// 一键通知今日排班司机（通过企业微信推送到司机个人微信）
router.post('/schedules/notify', adminAuth, async (req, res) => {
  const db = getDb()
  const orgId = req.adminOrgId || ''
  const orgScope = req.adminOrgScope || []
  const { scheduleIds } = req.body || {}

  const today = new Date().toISOString().slice(0, 10)

  // 查询排班：指定ID时按ID筛选，否则查今日全部
  let scheduleSql
  const scheduleParams = []

  if (scheduleIds && Array.isArray(scheduleIds) && scheduleIds.length > 0) {
    const ph = scheduleIds.map(() => '?').join(',')
    scheduleSql = `SELECT * FROM dispatch_schedules WHERE id IN (${ph})`
    scheduleParams.push(...scheduleIds)

    // 叠加组织范围过滤
    if (orgScope.length > 0) {
      const orgPh = orgScope.map(() => '?').join(',')
      scheduleSql += ` AND (org_id IS NULL OR org_id = '' OR org_id IN (${orgPh}))`
      scheduleParams.push(...orgScope)
    }
  } else {
    scheduleSql = `SELECT * FROM dispatch_schedules WHERE date = ?`
    scheduleParams.push(today)

    if (orgScope.length > 0) {
      const ph = orgScope.map(() => '?').join(',')
      scheduleSql += ` AND (org_id IS NULL OR org_id = '' OR org_id IN (${ph}))`
      scheduleParams.push(...orgScope)
    }
  }

  const schedules = db.prepare(scheduleSql).all(...scheduleParams)

  if (schedules.length === 0) {
    return res.json({ code: 200, message: '今日没有排班任务', data: { notified: 0, totalSchedules: 0, details: [], failed: [] } })
  }

  // 按驾驶员分组，并查找企业微信 userid
  const driverMap = new Map()
  for (const s of schedules) {
    const driverName = s.driver || '未知驾驶员'
    if (!driverMap.has(driverName)) {
      // 从 drivers 表获取企业微信 userid
      const dbDriver = db.prepare('SELECT phone, corp_userid FROM drivers WHERE name = ? LIMIT 1').get(driverName)
      driverMap.set(driverName, {
        routes: [], departTimes: [],
        phone: s.phone || (dbDriver ? dbDriver.phone : ''),
        corpUserId: dbDriver ? (dbDriver.corp_userid || '') : '',
      })
    }
    const d = driverMap.get(driverName)
    d.routes.push(s.route || '-')
    d.departTimes.push(s.depart_time || '-')
  }

  // 构建待通知列表
  const notifyList = []
  for (const [driverName, info] of driverMap) {
    const routesStr = [...new Set(info.routes)].join('；')
    const timesStr = [...new Set(info.departTimes)].join('；')
    notifyList.push({
      driverName,
      phone: info.phone || '无',
      corpUserId: info.corpUserId,
      taskCount: info.routes.length,
      routes: routesStr,
      departTimes: timesStr,
    })
  }

  // 通过企业微信发送通知
  const { notifyScheduleToDrivers } = require('../wechat')
  const { success: sentList, failed: failedList } = await notifyScheduleToDrivers(notifyList)

  // 记录通知日志
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const insertNotify = db.prepare(`
    INSERT INTO dispatch_notifications (notify_date, schedule_date, driver_name, phone, task_count, routes, depart_times, result, created_by, org_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const logNotify = db.transaction(() => {
    for (const d of sentList) {
      insertNotify.run(now, today, d.driverName, d.phone, d.taskCount, d.routes, d.departTimes, 'sent', req.adminName || '', orgId)
    }
    for (const d of failedList) {
      insertNotify.run(now, today, d.driverName, d.phone, d.taskCount, d.routes, d.departTimes, 'failed: ' + (d.reason || '未知错误'), req.adminName || '', orgId)
    }
  })
  logNotify()

  const details = sentList.map(d => ({
    driverName: d.driverName,
    phone: d.phone,
    taskCount: d.taskCount,
    routes: d.routes,
    departTimes: d.departTimes,
  }))

  const failedDetails = failedList.map(d => ({
    driverName: d.driverName,
    phone: d.phone,
    reason: d.reason || '未知错误',
  }))

  const msg = failedDetails.length > 0
    ? `已通知 ${sentList.length} 位司机，${failedDetails.length} 位失败`
    : `已通知 ${sentList.length} 位司机今日排班任务`

  res.json({
    code: 200, message: msg,
    data: { notified: sentList.length, failedCount: failedList.length, totalSchedules: schedules.length, details, failedDetails }
  })
})

// ===== 车辆日历事件 =====

// 获取车辆日历事件（用于车辆管理日历视图）
router.get('/vehicle-calendar-events', adminAuth, (req, res) => {
  const db = getDb()
  const orgScope = req.adminOrgScope || []
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    return res.json({ code: 400, message: '缺少 startDate 或 endDate 参数', data: [] })
  }

  let sql = `SELECT s.*, c.id as car_id
    FROM dispatch_schedules s
    LEFT JOIN cars c ON s.plate_number = c.plate_number
    WHERE s.date >= ? AND s.date <= ? AND s.plate_number != ''`
  const params = [startDate, endDate]

  // 组织过滤
  if (orgScope.length > 0) {
    const ph = orgScope.map(() => '?').join(',')
    sql += ` AND (s.org_id IS NULL OR s.org_id = '' OR s.org_id IN (${ph}))`
    params.push(...orgScope)
  }

  sql += ' ORDER BY s.date ASC, s.depart_time ASC'

  const schedules = db.prepare(sql).all(...params)

  // 转换为日历事件格式
  const events = schedules.map(s => {
    // 状态映射：已通知→dispatched, 已确认→booked, 默认→booked
    let status = 'booked'
    if (s.notify_status === '已通知') {
      status = 'dispatched'
    }

    return {
      id: 'S' + s.id,
      vehicleId: s.car_id || 0,
      plateNumber: s.plate_number,
      startTime: `${s.date} ${s.depart_time}:00`,
      endTime: s.return_time ? `${s.date} ${s.return_time}:00` : '',
      status,
      orderNo: s.charter_contract || '',
      driverName: s.driver || '',
      route: s.route || '',
      fleet: s.fleet || '',
      passengerCount: s.passenger_count || 0,
      scheduleStatus: s.status || '待确认',
      notifyStatus: s.notify_status || '未通知',
    }
  })

  res.json({ code: 200, data: events })
})

// ===== 评价管理 =====

// 获取评价列表（管理端）
router.get('/reviews', adminAuth, (req, res) => {
  const db = getDb()
  const { search, stars, orgId, page = '1', pageSize = '20' } = req.query

  let sql = 'SELECT r.*, o.depart_city as city, o.route FROM reviews r LEFT JOIN orders o ON r.order_id = o.id WHERE 1=1'
  const params = []

  if (search) {
    sql += ' AND (r.driver_name LIKE ? OR r.content LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  if (stars) {
    sql += ' AND r.stars = ?'
    params.push(Number(stars))
  }
  if (orgId) {
    sql += ' AND r.org_id = ?'
    params.push(orgId)
  }

  // 统计总数
  const countSql = sql.replace('SELECT r.*, o.depart_city as city, o.route', 'SELECT COUNT(*) as total')
  const { total } = db.prepare(countSql).get(...params)

  // 分页
  const offset = (Number(page) - 1) * Number(pageSize)
  sql += ' ORDER BY r.date DESC, r.id DESC LIMIT ? OFFSET ?'
  params.push(Number(pageSize), offset)

  const list = db.prepare(sql).all(...params).map(r => ({
    id: r.id,
    orderId: r.order_id,
    stars: r.stars,
    content: r.content,
    driverName: r.driver_name,
    reply: r.reply,
    date: r.date,
    city: r.city || '',
    route: r.route || '',
    orgId: r.org_id || '',
  }))

  res.json({
    code: 200,
    message: 'ok',
    data: {
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    }
  })
})

// 回复评价
router.post('/reviews/:id/reply', adminAuth, (req, res) => {
  const { id } = req.params
  const { reply } = req.body

  if (!reply || !reply.trim()) {
    return res.json({ code: 400, message: '请填写回复内容', data: null })
  }

  const db = getDb()
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)
  if (!review) {
    return res.json({ code: 404, message: '评价不存在', data: null })
  }

  db.prepare('UPDATE reviews SET reply = ? WHERE id = ?').run(reply.trim(), id)

  res.json({ code: 200, message: '回复成功', data: { id: Number(id), reply: reply.trim() } })
})

// 删除评价
router.delete('/reviews/:id', adminAuth, (req, res) => {
  const { id } = req.params
  const db = getDb()

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)
  if (!review) {
    return res.json({ code: 404, message: '评价不存在', data: null })
  }

  db.prepare('DELETE FROM reviews WHERE id = ?').run(id)

  // 重新计算司机评分
  if (review.driver_name && review.driver_name !== '未知') {
    const avgRow = db.prepare(
      'SELECT COALESCE(AVG(stars), 0) as avg_rating FROM reviews WHERE driver_name = ?'
    ).get(review.driver_name)
    const newRating = Math.round(avgRow.avg_rating * 10) / 10 || 5.0
    db.prepare('UPDATE drivers SET rating = ? WHERE name = ?').run(newRating, review.driver_name)
  }

  res.json({ code: 200, message: '评价已删除', data: { id: Number(id) } })
})

// ===== 上下班班次管理（CRUD）=====

/** 将 DB 行转为前端格式 */
function formatShiftRow(r) {
  return {
    id: r.id,
    name: r.name,
    route: r.route,
    orderNo: r.order_no,
    departureTime: r.departure_time,
    arrivalTime: r.arrival_time,
    scheduleMode: r.schedule_mode,
    scheduleDays: JSON.parse(r.schedule_days || '[]'),
    monthlyDays: JSON.parse(r.monthly_days || '[]'),
    vehicleType: r.vehicle_type,
    seatCount: r.seat_count,
    status: r.status,
    activeFrom: r.active_from,
    activeTo: r.active_to,
    orgId: r.org_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    driverId: r.driver_id || undefined,
    driverName: r.driver_name || undefined,
    driverPhone: r.driver_phone || undefined,
    driverPlate: r.driver_plate || undefined,
  }
}

// 获取班次列表
router.get('/shifts', adminAuth, (req, res) => {
  const db = getDb()
  const { search, status } = req.query
  const orgFilter = buildOrgFilter(req)

  let where = 'WHERE 1=1'
  const params = []

  if (search) {
    where += ' AND (name LIKE ? OR route LIKE ? OR order_no LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status && status !== 'all') {
    where += ' AND status = ?'
    params.push(status)
  }

  where += ' AND ' + orgFilter.where.slice(5)  // remove leading " AND "
  params.push(...orgFilter.params)

  // 列表查询 JOIN 了 drivers/cars，需要 cs.org_id 消歧义
  const whereCS = where.replace(/(?<!\w)org_id(?!\w)/g, 'cs.org_id')

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM commute_shifts ${where}`).get(...params)
  const list = db.prepare(
    `SELECT cs.*, d.name AS driver_name, d.phone AS driver_phone, c.plate_number AS driver_plate
     FROM commute_shifts cs
     LEFT JOIN drivers d ON d.id = cs.driver_id
     LEFT JOIN cars c ON c.id = d.car_id
     ${whereCS} ORDER BY cs.id DESC`
  ).all(...params).map(formatShiftRow)

  res.json({ code: 200, data: { list, total } })
})

// 新增班次
router.post('/shifts', adminAuth, (req, res) => {
  const db = getDb()
  const {
    name, route, orderNo, departureTime, arrivalTime,
    scheduleMode, scheduleDays, monthlyDays,
    vehicleType, seatCount, status,
    activeFrom, activeTo, driverId,
  } = req.body
  const orgId = req.body.orgId || req.adminOrgId || ''

  if (!name || !route || !departureTime || !arrivalTime) {
    return res.json({ code: 400, message: '请填写完整的班次信息', data: null })
  }

  const result = db.prepare(
    'INSERT INTO commute_shifts (name, route, order_no, departure_time, arrival_time, schedule_mode, schedule_days, monthly_days, vehicle_type, seat_count, status, active_from, active_to, org_id, driver_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(
    name, route, orderNo || '', departureTime, arrivalTime,
    scheduleMode || 'weekly', JSON.stringify(scheduleDays || []), JSON.stringify(monthlyDays || []),
    vehicleType || '大巴', seatCount || 45, status || 'active',
    activeFrom || '', activeTo || '', orgId,
    driverId || null
  )

  const record = db.prepare(
    `SELECT cs.*, d.name AS driver_name, d.phone AS driver_phone, c.plate_number AS driver_plate
     FROM commute_shifts cs
     LEFT JOIN drivers d ON d.id = cs.driver_id
     LEFT JOIN cars c ON c.id = d.car_id
     WHERE cs.id = ?`
  ).get(result.lastInsertRowid)
  res.json({ code: 200, message: '班次创建成功', data: formatShiftRow(record) })
})

// 更新班次
router.put('/shifts/:id', adminAuth, (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM commute_shifts WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '班次不存在', data: null })

  const {
    name, route, orderNo, departureTime, arrivalTime,
    scheduleMode, scheduleDays, monthlyDays,
    vehicleType, seatCount, status,
    activeFrom, activeTo, driverId,
  } = req.body

  db.prepare(
    `UPDATE commute_shifts SET
      name = ?, route = ?, order_no = ?, departure_time = ?, arrival_time = ?,
      schedule_mode = ?, schedule_days = ?, monthly_days = ?,
      vehicle_type = ?, seat_count = ?, status = ?,
      active_from = ?, active_to = ?, driver_id = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?`
  ).run(
    name ?? existing.name,
    route ?? existing.route,
    orderNo ?? existing.order_no,
    departureTime ?? existing.departure_time,
    arrivalTime ?? existing.arrival_time,
    scheduleMode ?? existing.schedule_mode,
    JSON.stringify(scheduleDays ?? JSON.parse(existing.schedule_days || '[]')),
    JSON.stringify(monthlyDays ?? JSON.parse(existing.monthly_days || '[]')),
    vehicleType ?? existing.vehicle_type,
    seatCount ?? existing.seat_count,
    status ?? existing.status,
    activeFrom ?? existing.active_from,
    activeTo ?? existing.active_to,
    driverId !== undefined ? (driverId || null) : existing.driver_id,
    id
  )

  const updated = db.prepare(
    `SELECT cs.*, d.name AS driver_name, d.phone AS driver_phone, c.plate_number AS driver_plate
     FROM commute_shifts cs
     LEFT JOIN drivers d ON d.id = cs.driver_id
     LEFT JOIN cars c ON c.id = d.car_id
     WHERE cs.id = ?`
  ).get(id)
  res.json({ code: 200, message: '班次已更新', data: formatShiftRow(updated) })
})

// 删除班次
router.delete('/shifts/:id', adminAuth, (req, res) => {
  const db = getDb()
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM commute_shifts WHERE id = ?').get(id)
  if (!existing) return res.json({ code: 404, message: '班次不存在', data: null })

  db.prepare('DELETE FROM commute_shifts WHERE id = ?').run(id)
  res.json({ code: 200, message: '班次已删除', data: { id: Number(id) } })
})

// ====== 定制包车调度管理 ======

// 获取定制包车订单列表（用于调度管理）
router.get('/custom-charter-orders', adminAuth, (req, res) => {
  const db = getDb()
  const { search, status, page = '1', pageSize = '20' } = req.query
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'o.org_id') : ''

  let where = "WHERE o.business_type = 'custom'"
  const params = []

  if (search) {
    where += ' AND (o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.route LIKE ? OR o.depart_city LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status) {
    where += ' AND o.dispatch_status = ?'
    params.push(status)
  }
  where += orgW
  params.push(...orgFilter.params)

  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM orders o ${where}`
  ).get(...params)

  const offset = (Number(page) - 1) * Number(pageSize)
  const orders = db.prepare(
    `SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset).map(o => ({
    id: o.id,
    orderNo: o.order_no,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    route: o.route,
    departCity: o.depart_city,
    departTime: o.depart_time,
    endTime: o.end_time || '',
    tripDuration: o.trip_duration || '',
    packageType: o.package_type,
    duration: o.duration,
    carName: o.car_name,
    carModel: o.car_model,
    seats: o.seats,
    amount: o.amount,
    total: o.total,
    status: o.status,
    dispatchStatus: o.dispatch_status || '未派车',
    orderType: o.order_type,
    createdAt: o.created_at,
  }))

  // 为每个订单查询已派车辆
  const ordersWithVehicles = orders.map(order => {
    const vehicles = db.prepare(
      `SELECT ds.* FROM dispatch_schedules ds WHERE ds.order_no = ? AND ds.schedule_type = 'custom' ORDER BY ds.depart_time ASC`
    ).all(order.orderNo).map(r => ({
      id: r.id,
      date: r.date,
      plateNumber: r.plate_number,
      driver: r.driver,
      departTime: r.depart_time,
      returnTime: r.return_time,
      passengerCount: r.passenger_count,
      route: r.route,
      kilometers: r.kilometers,
      fleet: r.fleet,
      status: r.status || '待确认',
      remark: r.remark,
      phone: r.phone,
    }))
    return { ...order, vehicles }
  })

  res.json({
    code: 200, message: 'ok',
    data: { list: ordersWithVehicles, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / Number(pageSize)) }
  })
})

// 获取定制包车调度记录（可按订单号筛选）
router.get('/custom-charter-schedules', adminAuth, (req, res) => {
  const db = getDb()
  const { orderNo, search, fleet, dateFrom, dateTo, page = '1', pageSize = '50' } = req.query
  const orgFilter = buildOrgFilter(req)
  const orgW = orgFilter.where ? orgFilter.where.replace(/org_id/g, 'ds.org_id') : ''

  let where = "WHERE ds.schedule_type = 'custom'"
  const params = []

  if (orderNo) {
    where += ' AND ds.order_no = ?'
    params.push(orderNo)
  }
  if (search) {
    where += ' AND (ds.driver LIKE ? OR ds.plate_number LIKE ? OR ds.route LIKE ? OR ds.unit LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (fleet) {
    where += ' AND ds.fleet = ?'
    params.push(fleet)
  }
  if (dateFrom) {
    where += ' AND ds.date >= ?'
    params.push(dateFrom)
  }
  if (dateTo) {
    where += ' AND ds.date <= ?'
    params.push(dateTo)
  }
  where += orgW
  params.push(...orgFilter.params)

  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM dispatch_schedules ds ${where}`
  ).get(...params)

  const offset = (Number(page) - 1) * Number(pageSize)
  const list = db.prepare(
    `SELECT ds.* FROM dispatch_schedules ds ${where} ORDER BY ds.date DESC, ds.id DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset).map(r => ({
    id: r.id,
    date: r.date,
    orderNo: r.order_no || '',
    fleet: r.fleet,
    plateNumber: r.plate_number,
    departTime: r.depart_time,
    returnTime: r.return_time,
    passengerCount: r.passenger_count,
    unit: r.unit,
    driver: r.driver,
    route: r.route,
    kilometers: r.kilometers,
    phone: r.phone,
    remark: r.remark,
    status: r.status || '待确认',
    notifyStatus: r.notify_status || '未通知',
    charterContract: r.charter_contract,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  res.json({
    code: 200, message: 'ok',
    data: { list, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / Number(pageSize)) }
  })
})

// 新增定制包车调度记录
router.post('/custom-charter-schedules', adminAuth, (req, res) => {
  const db = getDb()
  const {
    date, orderNo, fleet, plateNumber, driver,
    departTime, returnTime, passengerCount, route, unit,
    phone, remark, kilometers
  } = req.body

  if (!date) return res.json({ code: 400, message: '请选择用车日期', data: null })
  if (!plateNumber) return res.json({ code: 400, message: '请选择车辆', data: null })

  // 车辆时间冲突校验
  const checkDepart = departTime || ''
  const effectiveReturn = returnTime || '23:59'
  if (checkDepart) {
    const conflict = db.prepare(`
      SELECT * FROM dispatch_schedules
      WHERE plate_number = ? AND date = ?
        AND depart_time IS NOT NULL AND depart_time != ''
        AND depart_time < ?
        AND (CASE WHEN return_time IS NOT NULL AND return_time != '' THEN return_time > ? ELSE '23:59' > ? END)
    `).get(plateNumber, date, effectiveReturn, checkDepart, checkDepart)
    if (conflict) {
      return res.json({
        code: 400,
        message: `车辆 ${plateNumber} 在 ${date} ${checkDepart} 已存在排班记录（${conflict.route || conflict.unit || ''}），不可重复派车`,
        data: null
      })
    }
  }

  // 生成订单号
  const dateNoHyphen = date.replace(/-/g, '')
  let generatedOrderNo = orderNo || ''
  if (!generatedOrderNo) {
    const todayCount = db.prepare(
      "SELECT COUNT(*) as cnt FROM dispatch_schedules WHERE schedule_type = 'custom' AND date = ?"
    ).get(date).cnt
    generatedOrderNo = `HY${dateNoHyphen}${String(todayCount + 1).padStart(3, '0')}`
  }

  const orgId = req.body.orgId || req.adminOrgId || ''

  const result = db.prepare(`
    INSERT INTO dispatch_schedules (date, order_no, fleet, plate_number, driver,
      depart_time, return_time, passenger_count, route, unit,
      phone, remark, kilometers, schedule_type, org_id, status, notify_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'custom', ?, '待确认', '未通知')
  `).run(
    date, generatedOrderNo, fleet || '', plateNumber, driver || '',
    checkDepart, returnTime || '', passengerCount || 0, route || '', unit || '',
    phone || '', remark || '', kilometers || 0, orgId
  )

  const record = db.prepare('SELECT * FROM dispatch_schedules WHERE id = ?').get(result.lastInsertRowid)
  res.json({ code: 200, message: '派车成功', data: {
    id: record.id, date: record.date, orderNo: record.order_no,
    fleet: record.fleet, plateNumber: record.plate_number, driver: record.driver,
    departTime: record.depart_time, returnTime: record.return_time,
    passengerCount: record.passenger_count, route: record.route,
    unit: record.unit, phone: record.phone, remark: record.remark,
    kilometers: record.kilometers, status: record.status,
    createdAt: record.created_at, updatedAt: record.updated_at,
  }})
})

// 更新定制包车调度记录
router.put('/custom-charter-schedules/:id', adminAuth, (req, res) => {
  const { id } = req.params
  const db = getDb()
  const existing = db.prepare("SELECT * FROM dispatch_schedules WHERE id = ? AND schedule_type = 'custom'").get(id)
  if (!existing) return res.json({ code: 404, message: '调度记录不存在', data: null })

  const {
    date, orderNo, fleet, plateNumber, driver,
    departTime, returnTime, passengerCount, route, unit,
    phone, remark, kilometers, status
  } = req.body

  // 车辆时间冲突校验
  const checkPlate = plateNumber !== undefined ? plateNumber : existing.plate_number
  const checkDate = date || existing.date
  const checkDepart = departTime !== undefined ? departTime : existing.depart_time
  const checkReturn = returnTime !== undefined ? returnTime : existing.return_time
  if (checkPlate && checkDepart) {
    const effectiveReturn = checkReturn || '23:59'
    const conflictCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM dispatch_schedules
      WHERE plate_number = ? AND date = ? AND id != ?
        AND depart_time IS NOT NULL AND depart_time != ''
        AND depart_time < ?
        AND (CASE WHEN return_time IS NOT NULL AND return_time != '' THEN return_time > ? ELSE '23:59' > ? END)
    `).get(checkPlate, checkDate, id, effectiveReturn, checkDepart, checkDepart).cnt
    if (conflictCount > 0) {
      return res.json({ code: 400, message: `车辆 ${checkPlate} 在 ${checkDate} ${checkDepart} 时间段已被占用`, data: null })
    }
  }

  db.prepare(`
    UPDATE dispatch_schedules SET
      date = ?, order_no = ?, fleet = ?, plate_number = ?, driver = ?,
      depart_time = ?, return_time = ?, passenger_count = ?, route = ?, unit = ?,
      phone = ?, remark = ?, kilometers = ?, status = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    date || existing.date,
    orderNo !== undefined ? orderNo : existing.order_no,
    fleet !== undefined ? fleet : existing.fleet,
    plateNumber !== undefined ? plateNumber : existing.plate_number,
    driver !== undefined ? driver : existing.driver,
    departTime !== undefined ? departTime : existing.depart_time,
    returnTime !== undefined ? returnTime : existing.return_time,
    passengerCount !== undefined ? passengerCount : existing.passenger_count,
    route !== undefined ? route : existing.route,
    unit !== undefined ? unit : existing.unit,
    phone !== undefined ? phone : existing.phone,
    remark !== undefined ? remark : existing.remark,
    kilometers !== undefined ? kilometers : existing.kilometers,
    status !== undefined ? status : (existing.status || '待确认'),
    id
  )

  const updated = db.prepare('SELECT * FROM dispatch_schedules WHERE id = ?').get(id)
  res.json({ code: 200, message: '调度记录已更新', data: {
    id: updated.id, date: updated.date, orderNo: updated.order_no,
    fleet: updated.fleet, plateNumber: updated.plate_number, driver: updated.driver,
    departTime: updated.depart_time, returnTime: updated.return_time,
    passengerCount: updated.passenger_count, route: updated.route,
    unit: updated.unit, phone: updated.phone, remark: updated.remark,
    kilometers: updated.kilometers, status: updated.status,
    createdAt: updated.created_at, updatedAt: updated.updated_at,
  }})
})

// 删除定制包车调度记录
router.delete('/custom-charter-schedules/:id', adminAuth, (req, res) => {
  const { id } = req.params
  const db = getDb()
  const existing = db.prepare("SELECT * FROM dispatch_schedules WHERE id = ? AND schedule_type = 'custom'").get(id)
  if (!existing) return res.json({ code: 404, message: '调度记录不存在', data: null })

  db.prepare('DELETE FROM dispatch_schedules WHERE id = ?').run(id)
  res.json({ code: 200, message: '调度记录已删除', data: { id: Number(id) } })
})

// ========== 部署管理：测试环境同步到正式环境 ==========
// POST /api/admin/sync-to-prod — 触发同步（仅超级管理员）
router.post('/sync-to-prod', adminAuth, (req, res) => {
  // 仅超级管理员（org_id IS NULL）可执行同步
  if (req.user.org_id !== null) {
    return res.json({ code: 403, message: '仅超级管理员可执行同步操作', data: null })
  }

  const syncScript = '/opt/hengyun/scripts/sync-to-prod.sh'
  if (!fs.existsSync(syncScript)) {
    return res.json({ code: 404, message: '同步脚本不存在，请先在服务器上配置部署脚本', data: null })
  }

  // 记录操作日志
  const db = getDb()
  db.prepare(`INSERT INTO operation_logs (admin_id, admin_name, action, detail, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    req.user.id, req.user.username, 'sync_to_prod', '手动触发同步：测试环境 → 正式环境', new Date().toISOString()
  )

  // 执行同步脚本
  exec(`bash ${syncScript}`, { timeout: 120000 }, (err, stdout, stderr) => {
    const output = stdout + (stderr || '')
    if (err) {
      return res.json({
        code: 500,
        message: '同步执行失败',
        data: { error: err.message, output: output.slice(-2000) },
      })
    }
    res.json({
      code: 200,
      message: '同步完成',
      data: { output: output.slice(-2000) },
    })
  })
})

// 获取同步状态（最近一次同步记录）
router.get('/sync-status', adminAuth, (req, res) => {
  const db = getDb()

  // 确保操作日志表存在
  db.exec(`CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    admin_name TEXT,
    action TEXT,
    detail TEXT,
    created_at TEXT
  )`)

  const lastSync = db.prepare(
    "SELECT * FROM operation_logs WHERE action = 'sync_to_prod' ORDER BY created_at DESC LIMIT 1"
  ).get()

  // 获取各环境状态
  const testStatus = { backend: 'unknown', frontend: 'unknown' }
  const prodStatus = { backend: 'unknown', frontend: 'unknown' }

  try {
    if (fs.existsSync('/opt/hengyun/test/data.db')) testStatus.backend = 'running'
    if (fs.existsSync('/opt/hengyun/test/app/dist/index.html')) testStatus.frontend = 'deployed'
    if (fs.existsSync('/opt/hengyun/prod/data.db')) prodStatus.backend = 'running'
    if (fs.existsSync('/opt/hengyun/prod/app/dist/index.html')) prodStatus.frontend = 'deployed'
  } catch (_) { /* 本地开发环境忽略文件检查错误 */ }

  res.json({
    code: 200,
    message: 'ok',
    data: { lastSync: lastSync || null, testStatus, prodStatus },
  })
})

module.exports = router

