const express = require('express')
const router = express.Router()
const { getDb } = require('../db')
const path = require('path')

// 页面入口 - 重定向到静态 HTML 文件
router.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'db-admin.html'))
})

// ==================== API: 获取所有表 ====================
router.get('/tables', (_req, res) => {
  try {
    const db = getDb()
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all()
    const result = tables.map(t => {
      const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get()
      return { name: t.name, count: count.c }
    })
    res.json(result)
  } catch (e) {
    res.json([])
  }
})

// ==================== API: 获取表数据 ====================
router.get('/table/:name', (req, res) => {
  try {
    const db = getDb()
    const { name } = req.params
    const filter = req.query.filter || ''

    // 获取列
    const cols = db.prepare(`PRAGMA table_info("${name}")`).all()
    const columnNames = cols.map(c => c.name)

    // 获取总数
    const total = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get().c

    // 查询数据（支持简单过滤）
    let rows
    if (filter) {
      const conditions = columnNames.map(c => `CAST("${c}" AS TEXT) LIKE ?`).join(' OR ')
      const likeVal = `%${filter}%`
      const params = columnNames.map(() => likeVal)
      rows = db.prepare(`SELECT * FROM "${name}" WHERE ${conditions} LIMIT 500`).all(...params)
    } else {
      rows = db.prepare(`SELECT * FROM "${name}" LIMIT 500`).all()
    }

    res.json({ columns: columnNames, rows, total, filtered: rows.length })
  } catch (e) {
    res.status(400).json({ error: e.message, columns: [], rows: [], total: 0 })
  }
})

// ==================== API: 删除行 ====================
router.delete('/table/:name/:id', (req, res) => {
  try {
    const db = getDb()
    const { name, id } = req.params
    const cols = db.prepare(`PRAGMA table_info("${name}")`).all()
    const pk = cols[0].name
    db.prepare(`DELETE FROM "${name}" WHERE "${pk}" = ?`).run(id)
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false, error: e.message })
  }
})

// ==================== API: 执行 SQL ====================
router.post('/execute', (req, res) => {
  try {
    const db = getDb()
    const { sql } = req.body
    if (!sql) return res.status(400).json({ error: 'SQL 不能为空' })

    const upperSQL = sql.trim().toUpperCase()

    // 禁止危险操作
    if (/\bDROP\b/.test(upperSQL) && !/\bDROP\s+TABLE\s+IF\s+EXISTS\b.*_temp/i.test(upperSQL)) {
      return res.status(403).json({ error: '不允许执行 DROP 语句' })
    }
    if (/\bALTER\b/.test(upperSQL)) {
      return res.status(403).json({ error: '不允许执行 ALTER 语句' })
    }

    if (upperSQL.startsWith('SELECT') || upperSQL.startsWith('PRAGMA') || upperSQL.startsWith('EXPLAIN')) {
      const stmt = db.prepare(sql)
      const rows = stmt.all()
      let columns = []
      if (rows.length > 0) columns = Object.keys(rows[0])
      res.json({ type: 'query', rows, columns, count: rows.length })
    } else {
      const result = db.prepare(sql).run()
      res.json({ type: 'exec', changes: result.changes, lastInsertRowid: result.lastInsertRowid })
    }
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

module.exports = router
