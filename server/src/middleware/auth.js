const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'hengyun-chuxing-secret-key-2026'

// 用户端认证
function userAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录', data: null })
  }
  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    req.userPhone = decoded.phone
    next()
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期', data: null })
  }
}

// 管理端认证
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录', data: null })
  }
  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    if (!decoded.isAdmin) {
      return res.status(403).json({ code: 403, message: '无权限', data: null })
    }
    req.adminId = decoded.adminId
    req.adminRole = decoded.role
    // 查询当前管理员的组织信息
    try {
      const { getDb } = require('../db')
      const db = getDb()
      const admin = db.prepare('SELECT org_id FROM admin_users WHERE id = ?').get(decoded.adminId)
      if (admin) {
        req.adminOrgId = admin.org_id || null
        if (req.adminOrgId) {
          // 获取组织及所有子组织ID列表（数据范围=本组织及下级）
          const org = db.prepare("SELECT id, path FROM organizations WHERE id = ?").get(req.adminOrgId)
          if (org) {
            const subOrgs = db.prepare("SELECT id FROM organizations WHERE path = ? OR path LIKE ?").all(org.path, org.path + '/%')
            req.adminOrgScope = [org.id, ...subOrgs.map(o => o.id)]
          } else {
            // 组织被删除，清除org关联
            db.prepare('UPDATE admin_users SET org_id = NULL WHERE id = ?').run(decoded.adminId)
            req.adminOrgId = null
            req.adminOrgScope = null
          }
        } else {
          req.adminOrgScope = null // 未分配组织=超级管理员，可看全部数据
        }
      }
    } catch (_) { /* org info unavailable */ }
    next()
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期', data: null })
  }
}

// 生成 token
function signUserToken(user) {
  return jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' })
}

function signAdminToken(admin) {
  return jwt.sign({ adminId: admin.id, username: admin.username, role: admin.role, isAdmin: true }, JWT_SECRET, { expiresIn: '24h' })
}

module.exports = { JWT_SECRET, userAuth, adminAuth, signUserToken, signAdminToken }
