/**
 * 订单自动状态转换定时任务
 *
 * 规则：
 * 1. 进行中 → 已完成：当前时间 >= end_time（出发 + 套餐时长）
 * 2. 待付款 → 已取消：当前时间 >= depart_time（未支付超出发车时间）
 * 3. 待接单 → 已取消：当前时间 >= depart_time（未接单超出发车时间，退款）
 */

const { getDb } = require('./db')
const { parseTime, parseDurationHours, calcEndTime, formatTime, nowLocal, formatDurationStr } = require('./utils')

// ========== 常量（与 orders.js / admin.js 保持一致） ==========
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

// ========== 自动状态转换逻辑 ==========

/** 规则 1：进行中 → 已完成（使用预存的 end_time 判断） */
function checkInProgressToCompleted() {
  const db = getDb()
  const now = new Date()
  const orders = db.prepare("SELECT * FROM orders WHERE status = ?").all(ORDER_STATUS.IN_PROGRESS)

  let count = 0
  for (const order of orders) {
    // 优先使用预存的 end_time，兼容旧数据则重新计算
    let endTime = parseTime(order.end_time)
    if (!endTime) {
      endTime = calcEndTime(order.depart_time, order.duration)
    }
    if (!endTime || now < endTime) continue

    // 结束时间已到，但用车时长取套餐时长（预估 = 实际）
    const tripDuration = formatDurationStr(order.duration)

    db.prepare(
      'UPDATE orders SET status = ?, dispatch_status = ?, trip_duration = ? WHERE id = ?'
    ).run(ORDER_STATUS.COMPLETED, DISPATCH_STATUS.COMPLETED, tripDuration, order.id)

    console.log(`[定时任务] 订单 ${order.order_no}「进行中」→「已完成」(结束时间: ${formatTime(endTime)}, 用车时长: ${tripDuration})`)
    count++
  }
  if (count > 0) console.log(`[定时任务] ✅ 规则1: ${count} 个订单自动完成`)
}

/** 规则 2：待付款 → 已取消（未支付超出发车时间） */
function checkPendingPaymentToCancelled() {
  const db = getDb()
  const now = parseTime(nowLocal())
  if (!now) return

  const orders = db.prepare("SELECT * FROM orders WHERE status = ?").all(ORDER_STATUS.PENDING_PAYMENT)

  let count = 0
  for (const order of orders) {
    const departTime = parseTime(order.depart_time)
    if (!departTime || now < departTime) continue

    db.prepare(
      'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?'
    ).run(ORDER_STATUS.CANCELLED, PAYMENT_STATUS.UNPAID, order.id)

    console.log(`[定时任务] 订单 ${order.order_no}「待付款」→「已取消」(超出发车时间: ${order.depart_time})`)
    count++
  }
  if (count > 0) console.log(`[定时任务] ✅ 规则2: ${count} 个待付款订单自动取消`)
}

/** 规则 3：待接单 → 已取消（未接单超出发车时间，已支付的退款） */
function checkPendingAcceptToCancelled() {
  const db = getDb()
  const now = parseTime(nowLocal())
  if (!now) return

  const orders = db.prepare("SELECT * FROM orders WHERE status = ?").all(ORDER_STATUS.PENDING_ACCEPT)

  let count = 0
  for (const order of orders) {
    const departTime = parseTime(order.depart_time)
    if (!departTime || now < departTime) continue

    db.prepare(
      'UPDATE orders SET status = ?, payment_status = ?, accept_status = ? WHERE id = ?'
    ).run(ORDER_STATUS.CANCELLED, PAYMENT_STATUS.REFUNDED, ACCEPT_STATUS.UNACCEPTED, order.id)

    console.log(`[定时任务] 订单 ${order.order_no}「待接单」→「已取消/已退款」(超出发车时间: ${order.depart_time})`)
    count++
  }
  if (count > 0) console.log(`[定时任务] ✅ 规则3: ${count} 个待接单订单自动取消并退款`)
}

/** 规则 4：待派车 → 已取消（已接单已付款但未派车超出发车时间，退款） */
function checkPendingDispatchToCancelled() {
  const db = getDb()
  const now = parseTime(nowLocal())
  if (!now) return

  const orders = db.prepare("SELECT * FROM orders WHERE status = ?").all(ORDER_STATUS.PENDING_DISPATCH)

  let count = 0
  for (const order of orders) {
    const departTime = parseTime(order.depart_time)
    if (!departTime || now < departTime) continue

    db.prepare(
      'UPDATE orders SET status = ?, payment_status = ?, accept_status = ?, dispatch_status = ? WHERE id = ?'
    ).run(ORDER_STATUS.CANCELLED, PAYMENT_STATUS.REFUNDED, ACCEPT_STATUS.ACCEPTED, DISPATCH_STATUS.UNDISPATCHED, order.id)

    console.log(`[定时任务] 订单 ${order.order_no}「待派车」→「已取消/已退款」(超出发车时间: ${order.depart_time})`)
    count++
  }
  if (count > 0) console.log(`[定时任务] ✅ 规则4: ${count} 个待派车订单自动取消并退款`)
}

// ========== 凌晨自动生成排班 ==========

/**
 * 规则 5：根据班次配置自动生成当天排班
 * - 查询所有启用的班次（status = 'active'）
 * - 对每个班次判断今天是否匹配排班周期
 * - 如果匹配且当天没有对应排班记录，则自动生成
 * - 通过 DB 查询已有自动生成记录来防重启重复
 */
function checkAndAutoGenerateSchedules() {
  const db = getDb()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // 防重启重复：数据库中已有今天的自动生成记录则跳过
  const alreadyGen = db.prepare(
    `SELECT COUNT(*) as cnt FROM dispatch_schedules
     WHERE date = ? AND (remark LIKE '%[自动生成]%' OR remark LIKE '%自动生成%')`
  ).get(todayStr)
  if (alreadyGen && alreadyGen.cnt > 0) {
    // 已经生成过，但静默跳过（不用每次30s都打log）
    return
  }

  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const shiftDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek // 1=Mon, 7=Sun
  const dayOfMonth = today.getDate()

  // 查询所有启用的班次（含预设司机信息），且在有效期内的
  const shifts = db.prepare(
    `SELECT cs.*, d.name AS driver_name, d.phone AS driver_phone, c.plate_number AS driver_plate
     FROM commute_shifts cs
     LEFT JOIN drivers d ON d.id = cs.driver_id
     LEFT JOIN cars c ON c.id = d.car_id
     WHERE cs.status = 'active' AND cs.active_from <= ? AND cs.active_to >= ?`
  ).all(todayStr, todayStr)

  if (shifts.length === 0) {
    console.log(`[定时任务] 今日无有效班次配置，跳过排班生成 (${todayStr})`)
    return
  }

  let generated = 0

  for (const shift of shifts) {
    // 判断今天是否匹配排班日期
    const scheduleDays = JSON.parse(shift.schedule_days || '[]')
    const monthlyDays = JSON.parse(shift.monthly_days || '[]')

    let match = false
    if (shift.schedule_mode === 'weekly') {
      match = scheduleDays.includes(shiftDayOfWeek)
    } else {
      match = monthlyDays.includes(dayOfMonth)
    }

    if (!match) continue

    // 去重：检查同日同路线是否已有排班（不限 remark 格式，更健壮）
    const existing = db.prepare(
      `SELECT COUNT(*) as cnt FROM dispatch_schedules
       WHERE date = ? AND route = ? AND charter_type = '上下班车'`
    ).get(todayStr, shift.route)

    if (existing && existing.cnt > 0) {
      console.log(`[定时任务] ⏭ 跳过「${shift.name}」- 今日已有排班记录`)
      continue
    }

    // 插入排班记录
    db.prepare(`
      INSERT INTO dispatch_schedules (date, charter_contract, fleet, charter_type, plate_number,
        depart_time, passenger_count, unit, driver, route, vehicle_status, dispatcher,
        kilometers, return_time, phone, remark, org_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      todayStr,                      // date
      shift.order_no || '',          // charter_contract
      '',                             // fleet
      '上下班车',                     // charter_type
      shift.driver_plate || '',       // plate_number（使用班次预设车牌）
      shift.departure_time,          // depart_time
      shift.seat_count,              // passenger_count
      '',                             // unit
      shift.driver_name || '',        // driver（使用班次预设司机）
      shift.route,                    // route
      '待出车',                       // vehicle_status
      '',                             // dispatcher
      0,                              // kilometers
      shift.arrival_time,            // return_time
      shift.driver_phone || '',       // phone（使用班次预设司机电话）
      `班次: ${shift.name} [自动生成]`, // remark
      shift.org_id || '',            // org_id
    )

    console.log(`[定时任务] ✅ 自动生成排班「${shift.name}」(${todayStr} ${shift.departure_time})`)
    generated++
  }

  if (generated > 0) {
    console.log(`[定时任务] 🚌 规则5: 自动生成 ${generated} 条今日排班记录`)
  } else {
    console.log(`[定时任务] 今日无匹配的班次需要生成排班 (${todayStr})`)
  }
}

// ========== 主入口 ==========

/** 执行全部定时检查 */
function runAll() {
  try {
    checkInProgressToCompleted()
  } catch (e) {
    console.error('[定时任务] 规则1 执行异常:', e.message)
  }
  try {
    checkPendingPaymentToCancelled()
  } catch (e) {
    console.error('[定时任务] 规则2 执行异常:', e.message)
  }
  try {
    checkPendingAcceptToCancelled()
  } catch (e) {
    console.error('[定时任务] 规则3 执行异常:', e.message)
  }
  try {
    checkPendingDispatchToCancelled()
  } catch (e) {
    console.error('[定时任务] 规则4 执行异常:', e.message)
  }
}

// ========== 主入口 ==========

/** 执行订单状态定时检查（规则 1-4），每 30 秒 */
function runAll() {
  try { checkInProgressToCompleted() } catch (e) { console.error('[定时任务] 规则1 执行异常:', e.message) }
  try { checkPendingPaymentToCancelled() } catch (e) { console.error('[定时任务] 规则2 执行异常:', e.message) }
  try { checkPendingAcceptToCancelled() } catch (e) { console.error('[定时任务] 规则3 执行异常:', e.message) }
  try { checkPendingDispatchToCancelled() } catch (e) { console.error('[定时任务] 规则4 执行异常:', e.message) }
}

/**
 * 排班自动生成定时器（规则 5）
 * - 每天凌晨 0:00 执行一次
 * - 启动时补偿执行一次（防止凌晨时服务器不在线）
 */
function scheduleAutoGen() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0) // 次日 0:00
  const delayMs = next.getTime() - now.getTime()

  console.log(`[定时任务] 排班自动生成已调度，距下次执行还有 ${Math.round(delayMs / 1000 / 60)} 分钟 (${next.toLocaleString()})`)

  return setTimeout(() => {
    try {
      checkAndAutoGenerateSchedules()
    } catch (e) {
      console.error('[定时任务] 规则5 执行异常:', e.message)
    }
    // 递归调度次日
    scheduleAutoGen()
  }, delayMs)
}

/**
 * 启动定时任务
 * @param {number} intervalMs 订单状态检查间隔（毫秒），默认 30 秒
 */
function start(intervalMs = 30000) {
  console.log('[定时任务] 订单自动状态转换 已启动，检查间隔:', `${intervalMs / 1000}s`)
  runAll() // 启动时立即执行一次订单状态检查

  // 启动时补偿执行一次排班生成（防止凌晨服务器不在线而导致当天漏生成）
  try {
    checkAndAutoGenerateSchedules()
  } catch (e) {
    console.error('[定时任务] 启动补偿生成 执行异常:', e.message)
  }

  // 订单状态检查：每 N 秒轮询
  const orderInterval = setInterval(runAll, intervalMs)
  // 排班自动生成：每天一次
  const autoGenTimeout = scheduleAutoGen()

  return { orderInterval, autoGenTimeout }
}

module.exports = { start, runAll }
