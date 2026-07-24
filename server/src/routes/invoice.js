const { Router } = require('express')
const { getDb } = require('../db')
const { userAuth } = require('../middleware/auth')

const router = Router()

// ===== 获取可开票订单列表（已完成的订单，排除已开票的） =====
router.get('/list', userAuth, (req, res) => {
  const db = getDb()
  const userId = req.userId

  // 查所有已完成订单
  const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? AND status = '已完成' ORDER BY created_at DESC").all(userId)

  // 查所有已存在于 invoices 表中的 order_no
  const invoicedOrders = db.prepare('SELECT order_ids FROM invoices').all()
  const invoicedSet = new Set()
  for (const rec of invoicedOrders) {
    try {
      const ids = JSON.parse(rec.order_ids || '[]')
      ids.forEach(id => invoicedSet.add(id))
    } catch {
      // 兼容旧的单个 order_no
      if (rec.order_no) invoicedSet.add(rec.order_no)
    }
  }

  const list = orders
    .filter(o => !invoicedSet.has(o.order_no))
    .map(o => ({
      id: o.id,
      orderNo: o.order_no,
      route: o.route,
      amount: o.total,
      date: o.created_at,
      orderTime: o.order_time,
    }))

  res.json({ code: 200, message: 'ok', data: list })
})

// ===== 获取已申请发票记录 =====
router.get('/records', userAuth, (req, res) => {
  const db = getDb()
  const userId = req.userId

  // 查用户已完成订单的 order_no 列表
  const userOrders = db.prepare("SELECT order_no FROM orders WHERE user_id = ?").all(userId)
  const userOrderNos = new Set(userOrders.map(o => o.order_no))

  const invoices = db.prepare('SELECT * FROM invoices ORDER BY applied_at DESC, id DESC').all()

  const list = invoices.filter(inv => {
    try {
      const ids = JSON.parse(inv.order_ids || '[]')
      return ids.some(id => userOrderNos.has(id))
    } catch {
      return userOrderNos.has(inv.order_no)
    }
  }).map(inv => {
    let orderNos = []
    try { orderNos = JSON.parse(inv.order_ids || '[]') } catch { orderNos = [inv.order_no] }
    return {
      id: inv.id,
      orderIds: orderNos,
      orderNos,
      title: inv.title,
      amount: inv.amount,
      invoiceType: inv.invoice_type || '个人',
      taxId: inv.tax_id || '',
      email: inv.email || '',
      status: inv.status || '申请中',
      appliedAt: inv.applied_at || '',
      date: inv.applied_at || inv.date,
    }
  })

  res.json({ code: 200, message: 'ok', data: list })
})

// ===== 申请开票 =====
router.post('/apply', userAuth, (req, res) => {
  const { orderIds, invoiceType, title, taxId, email } = req.body

  if (!orderIds || !orderIds.length) {
    return res.json({ code: 400, message: '请选择需要开票的订单', data: null })
  }
  if (!title || !title.trim()) {
    return res.json({ code: 400, message: '请填写发票抬头', data: null })
  }
  if (!email || !email.trim()) {
    return res.json({ code: 400, message: '请填写接收发票的邮箱', data: null })
  }

  const db = getDb()

  // 校验订单：都是该用户的已完成订单
  const placeholders = orderIds.map(() => '?').join(',')
  const orders = db.prepare(
    `SELECT * FROM orders WHERE id IN (${placeholders}) AND user_id = ? AND status = '已完成'`
  ).all(...orderIds, req.userId)

  if (orders.length === 0) {
    return res.json({ code: 400, message: '所选订单不可开票', data: null })
  }

  // 校验是否已开过票
  const existingInvoices = db.prepare('SELECT order_ids FROM invoices').all()
  const invoicedSet = new Set()
  for (const rec of existingInvoices) {
    try {
      JSON.parse(rec.order_ids || '[]').forEach(id => invoicedSet.add(id))
    } catch {}
  }
  const validOrders = orders.filter(o => !invoicedSet.has(o.order_no))
  if (validOrders.length === 0) {
    return res.json({ code: 400, message: '所选订单已开过发票', data: null })
  }

  const totalAmount = validOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const orderNos = validOrders.map(o => o.order_no)
  const appliedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

  db.prepare(`
    INSERT INTO invoices (order_ids, title, amount, date, invoice_type, tax_id, email, status, applied_at, order_no)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    JSON.stringify(orderNos),
    title.trim(),
    totalAmount,
    appliedAt.substring(0, 10),
    invoiceType || '个人',
    taxId || '',
    email.trim(),
    '申请中',
    appliedAt,
    orderNos[0]  // 保留 order_no 用于兼容
  )

  res.json({
    code: 200,
    message: `已为 ${validOrders.length} 个订单申请开票，发票将发送至 ${email}`,
    data: { success: true, orderCount: validOrders.length, totalAmount }
  })
})

module.exports = router
