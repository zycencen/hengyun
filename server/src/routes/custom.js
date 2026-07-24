const { Router } = require('express')
const { getDb } = require('../db')

const router = Router()

// ===== 提交定制包车需求 =====
router.post('/submit', (req, res) => {
  const { name, phone, city, demand } = req.body
  if (!name || !phone || !city || !demand) return res.json({ code: 400, message: '请填写完整信息', data: null })

  const db = getDb()
  db.prepare('INSERT INTO custom_charter_requests (name, phone, city, demand) VALUES (?,?,?,?)').run(name, phone, city, demand)
  res.json({ code: 200, message: '定制需求已提交，我们会尽快与您联系！', data: { success: true } })
})

module.exports = router
