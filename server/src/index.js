const express = require('express')
const cors = require('cors')
const path = require('path')

const usersRouter = require('./routes/users')
const ordersRouter = require('./routes/orders')
const carsRouter = require('./routes/cars')
const commuteRouter = require('./routes/commute')
const customRouter = require('./routes/custom')
const invoiceRouter = require('./routes/invoice')
const reviewRouter = require('./routes/review')
const adminRouter = require('./routes/admin')
const fleetRouter = require('./routes/fleets')
const dbAdminRouter = require('./routes/db-admin')

const app = express()
const PORT = process.env.PORT || 8080

// 自动填充种子数据（如果数据库为空）
try {
  const { getDb } = require('./db')
  const db = getDb()
  const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt
  if (userCount === 0) {
    console.log('📦 检测到空数据库，自动填充种子数据...')
    require('./seed')
  }
} catch (e) {
  console.log('⚠ 种子数据检测跳过:', e.message)
}

// 中间件
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, _res, next) => {
  console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.url}`)
  next()
})

// API 路由
app.use('/api/user', usersRouter)
app.use('/api/order', ordersRouter)
app.use('/api/car', carsRouter)
app.use('/api/commute', commuteRouter)
app.use('/api/custom-charter', customRouter)
app.use('/api/invoice', invoiceRouter)
app.use('/api/review', reviewRouter)
app.use('/api/admin', adminRouter)
app.use('/api/fleet', fleetRouter)
app.use('/api/db-admin', dbAdminRouter)

// 静态文件 - 上传图片
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ code: 200, message: '恒运出行后端服务运行中', data: { version: '1.0.0', time: new Date().toISOString() } })
})

// 404
app.use('/api/*', (_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null })
})

app.listen(PORT, () => {
  console.log('')
  console.log('🚀 恒运出行后端服务已启动')
  console.log(`   http://localhost:${PORT}/api`)
  console.log('')
  console.log('📋 API 端点:')
  console.log('   用户端: /api/user/*')
  console.log('   订单:   /api/order/*')
  console.log('   车辆:   /api/car/*')
  console.log('   通勤:   /api/commute/*')
  console.log('   定制:   /api/custom-charter/*')
  console.log('   发票:   /api/invoice/*')
  console.log('   评价:   /api/review/*')
  console.log('   管理端: /api/admin/*')
  console.log('   数据库: /api/db-admin')
  console.log('')

  // 启动订单自动状态转换定时任务（每 30 秒检查一次）
  try {
    const { start: startScheduler } = require('./scheduler')
    startScheduler(30000)
  } catch (e) {
    console.error('⚠ 定时任务启动失败:', e.message)
  }
})

module.exports = app
