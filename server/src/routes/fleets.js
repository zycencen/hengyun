const { Router } = require('express')
const { getDb } = require('../db')

const router = Router()

// ========== 公开接口：用户端入口配置 ==========

/** 获取车队入口配置 */
router.get('/entry-config', (req, res) => {
  const db = getDb()
  const { orgId } = req.query
  if (!orgId) return res.json({ code: 400, message: '缺少 orgId 参数', data: null })

  const fleet = db.prepare('SELECT * FROM fleets WHERE org_id = ?').get(orgId)
  if (!fleet) return res.json({ code: 404, message: '车队入口不存在', data: null })
  if (!fleet.service_enabled) return res.json({ code: 403, message: '车队服务未授权', data: null })
  if (!fleet.entry_enabled) return res.json({ code: 403, message: '车队入口已关闭', data: null })

  let entryConfig = {}
  try { entryConfig = JSON.parse(fleet.entry_config || '{}') } catch (_) { entryConfig = {} }

  res.json({
    code: 200,
    message: 'ok',
    data: {
      fleetId: fleet.id,
      orgId: fleet.org_id,
      name: fleet.name,
      leaderName: fleet.leader_name,
      leaderPhone: fleet.leader_phone,
      logo: fleet.logo || '',
      entryConfig: {
        home: true,
        order: true,
        orderList: true,
        profile: true,
        invoice: true,
        reviews: true,
        settings: true,
        showCharter: true,
        showCommute: true,
        showCustom: true,
        bannerTitle: '',
        bannerSubtitle: '',
        ...entryConfig,
      },
    },
  })
})

/** 获取已启用的车队入口列表（用户端选择） */
router.get('/list', (req, res) => {
  const db = getDb()
  const list = db.prepare(`
    SELECT f.*, o.name AS org_name
    FROM fleets f
    LEFT JOIN organizations o ON o.id = f.org_id
    WHERE f.service_enabled = 1 AND f.entry_enabled = 1
    ORDER BY f.created_at
  `).all().map(f => ({
    fleetId: f.id,
    orgId: f.org_id,
    name: f.name,
    leaderName: f.leader_name,
    leaderPhone: f.leader_phone,
    logo: f.logo || '',
  }))
  res.json({ code: 200, message: 'ok', data: list })
})

module.exports = router
