const { Router } = require('express')
const { getDb } = require('../db')

const router = Router()

// ===== 提交通勤车申请 =====
router.post('/apply', (req, res) => {
  const { name, phone, company, city } = req.body
  if (!name || !phone || !company || !city) return res.json({ code: 400, message: '请填写完整信息', data: null })

  const db = getDb()
  db.prepare('INSERT INTO commute_applications (name, phone, company, city) VALUES (?,?,?,?)').run(name, phone, company, city)
  res.json({ code: 200, message: '通勤车申请已提交，我们会尽快与您联系！', data: { success: true } })
})

module.exports = router
