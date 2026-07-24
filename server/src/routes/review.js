const { Router } = require('express')
const { getDb } = require('../db')
const { userAuth } = require('../middleware/auth')

const router = Router()

// ===== 获取评价列表 =====
router.get('/list', (req, res) => {
  const db = getDb()
  const { userId, driver, orgId } = req.query

  let sql = 'SELECT * FROM reviews WHERE 1=1'
  const params = []

  if (userId) {
    sql += ' AND order_id IN (SELECT id FROM orders WHERE user_id = ?)'
    params.push(userId)
  }
  if (driver) {
    sql += ' AND driver_name = ?'
    params.push(driver)
  }
  if (orgId) {
    sql += ' AND org_id = ?'
    params.push(orgId)
  }

  sql += ' ORDER BY date DESC'

  const list = db.prepare(sql).all(...params).map(r => ({
    id: r.id,
    stars: r.stars,
    content: r.content,
    driver: r.driver_name,
    reply: r.reply,
    date: r.date,
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

// ===== 获取司机评价统计 =====
router.get('/driver-stats', (req, res) => {
  const db = getDb()
  const { driver: driverName } = req.query

  if (!driverName) {
    const stats = db.prepare(
      'SELECT driver_name as driver, COALESCE(AVG(stars),0) as avg_rating, COUNT(*) as review_count FROM reviews GROUP BY driver_name ORDER BY avg_rating DESC'
    ).all()
    return res.json({ code: 200, message: 'ok', data: stats })
  }

  const stat = db.prepare(
    'SELECT COALESCE(AVG(stars),0) as avg_rating, COUNT(*) as review_count FROM reviews WHERE driver_name = ?'
  ).get(driverName)

  const reviews = db.prepare(
    'SELECT * FROM reviews WHERE driver_name = ? ORDER BY date DESC'
  ).all(driverName).map(r => ({
    id: r.id,
    stars: r.stars,
    content: r.content,
    driver: r.driver_name,
    reply: r.reply,
    date: r.date,
  }))

  res.json({
    code: 200,
    message: 'ok',
    data: {
      avgRating: Math.round(stat.avg_rating * 10) / 10,
      reviewCount: stat.review_count,
      reviews,
    }
  })
})

// ===== 提交评价 =====
router.post('/submit', userAuth, (req, res) => {
  const { orderId, stars, content } = req.body
  if (!orderId || !stars) return res.json({ code: 400, message: '请填写评价信息', data: null })

  const db = getDb()

  // 检查是否已评价过该订单
  const existing = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(orderId)
  if (existing) return res.json({ code: 400, message: '该订单已评价过', data: null })

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.userId)
  if (!order) return res.json({ code: 404, message: '订单不存在', data: null })
  if (order.status !== '已完成') return res.json({ code: 400, message: '仅可评价已完成的订单', data: null })

  const driverName = order.driver_name || '未知'
  const orgId = order.org_id || ''

  // 插入评价
  const orgIdFinal = orgId || null
  db.prepare('INSERT INTO reviews (order_id, stars, content, driver_name, date, org_id) VALUES (?,?,?,?,?,?)')
    .run(orderId, stars, content || '', driverName, new Date().toISOString().slice(0, 10), orgIdFinal)

  // 自动更新司机平均评分
  if (driverName && driverName !== '未知') {
    const avgRow = db.prepare(
      'SELECT COALESCE(AVG(stars), 0) as avg_rating, COUNT(*) as review_count FROM reviews WHERE driver_name = ?'
    ).get(driverName)
    const newRating = Math.round(avgRow.avg_rating * 10) / 10
    db.prepare('UPDATE drivers SET rating = ?, order_count = (SELECT COUNT(*) FROM orders WHERE driver_name = ? AND status = ?) WHERE name = ?')
      .run(newRating, driverName, '已完成', driverName)
  }

  res.json({ code: 200, message: '评价成功', data: { success: true } })
})

module.exports = router
