const { Router } = require('express')
const { getDb } = require('../db')
const { signUserToken, signAdminToken, userAuth, adminAuth } = require('../middleware/auth')

const router = Router()

// ===== 发送验证码 =====
router.post('/sms-code', (req, res) => {
  const { phone } = req.body
  if (!phone) return res.json({ code: 400, message: '请输入手机号', data: null })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const db = getDb()
  db.prepare('DELETE FROM sms_codes WHERE phone = ?').run(phone)
  db.prepare('INSERT INTO sms_codes (phone, code) VALUES (?, ?)').run(phone, code)

  console.log(`📱 验证码 [${phone}]: ${code}`)
  res.json({ code: 200, message: '验证码已发送', data: { success: true } })
})

// ===== 用户登录 =====
router.post('/login', (req, res) => {
  const { phone, code, fleetOrgId } = req.body
  if (!phone || !code) return res.json({ code: 400, message: '请输入手机号和验证码', data: null })

  const db = getDb()
  const smsRow = db.prepare('SELECT code FROM sms_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1').get(phone)

  // 开发环境：验证码 888888 为万能验证码
  if (code !== '888888' && (!smsRow || smsRow.code !== code)) {
    return res.json({ code: 400, message: '验证码错误', data: null })
  }

  // 查找或创建用户
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)
  if (!user) {
    const result = db.prepare('INSERT INTO users (phone, name) VALUES (?, ?)').run(phone, '新用户')
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  }

  // 如果从车队专属入口登录，自动关联用户到对应组织
  if (fleetOrgId) {
    const org = db.prepare('SELECT id, name, parent_id FROM organizations WHERE id = ?').get(fleetOrgId)
    if (org) {
      // 关联到对应组织
      db.prepare('INSERT OR IGNORE INTO user_orgs (user_id, org_id) VALUES (?, ?)').run(user.id, fleetOrgId)
      // 如果有父级根组织，同时关联
      if (org.parent_id) {
        db.prepare('INSERT OR IGNORE INTO user_orgs (user_id, org_id) VALUES (?, ?)').run(user.id, org.parent_id)
      }
      // 同步更新 users.org_id（向后兼容）
      if (!user.org_id) {
        db.prepare('UPDATE users SET org_id = ? WHERE id = ?').run(fleetOrgId, user.id)
      }
      const fleet = db.prepare('SELECT name FROM fleets WHERE org_id = ?').get(fleetOrgId)
      console.log(`🔗 用户 ${user.phone} 已自动关联到组织 ${org.name}(${fleetOrgId})` + (fleet ? `，车队 ${fleet.name}` : '') + (org.parent_id ? `，及根组织 ${org.parent_id}` : ''))
    }
  }

  const token = signUserToken(user)
  // 查询用户的组织信息
  const orgs = db.prepare('SELECT o.id, o.name FROM user_orgs uo JOIN organizations o ON o.id = uo.org_id WHERE uo.user_id = ?').all(user.id)
  const orgData = orgs.length > 0 ? orgs.map(o => ({ id: o.id, name: o.name })) : null
  res.json({
    code: 200, message: '登录成功', data: {
      token,
      user: {
        id: user.id, name: user.name, phone: user.phone, company: user.company,
        avatar: user.avatar, isVip: !!user.is_vip, isEnterpriseVerified: !!user.is_enterprise_verified,
        userType: user.user_type || '普通用户',
        orgs: orgData,
      }
    }
  })
})

// ===== 管理端登录 =====
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.json({ code: 400, message: '请输入账号和密码', data: null })

  const db = getDb()
  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ? AND password = ?').get(username, password)
  if (!admin) return res.json({ code: 400, message: '账号或密码错误', data: null })
  if (admin.status === 'disabled') return res.json({ code: 403, message: '账号已被禁用', data: null })

  const token = signAdminToken(admin)
  res.json({
    code: 200, message: '登录成功', data: {
      token,
      user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, phone: admin.phone }
    }
  })
})

// ===== 获取用户信息 =====
router.get('/profile', userAuth, (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  if (!user) return res.status(401).json({ code: 401, message: '登录已过期，请重新登录', data: null })

  // 查询用户的组织信息
  const orgs = db.prepare('SELECT o.id, o.name FROM user_orgs uo JOIN organizations o ON o.id = uo.org_id WHERE uo.user_id = ?').all(req.userId)
  const orgData = orgs.length > 0 ? orgs.map(o => ({ id: o.id, name: o.name })) : null

  res.json({
    code: 200, message: 'ok', data: {
      id: user.id, name: user.name, phone: user.phone, company: user.company,
      avatar: user.avatar, isVip: !!user.is_vip, isEnterpriseVerified: !!user.is_enterprise_verified,
      userType: user.user_type || '普通用户',
      orgs: orgData,
    }
  })
})

// ===== 更新用户信息 =====
router.put('/profile', userAuth, (req, res) => {
  const db = getDb()
  const { name, company, avatar } = req.body

  // 先检查用户是否存在，避免后续空指针 500
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  if (!user) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录', data: null })
  }

  // 使用 NULLIF 避免空字符串覆盖已有数据
  db.prepare('UPDATE users SET name = COALESCE(NULLIF(?, \'\'), name), company = COALESCE(NULLIF(?, \'\'), company), avatar = COALESCE(NULLIF(?, \'\'), avatar) WHERE id = ?')
    .run(name, company, avatar, req.userId)

  user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  res.json({
    code: 200, message: '更新成功', data: {
      id: user.id, name: user.name, phone: user.phone, company: user.company,
      avatar: user.avatar, isVip: !!user.is_vip, isEnterpriseVerified: !!user.is_enterprise_verified
    }
  })
})

module.exports = router
