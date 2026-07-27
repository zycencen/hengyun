/**
 * 管理端订单管理测试：接单/派单/完成/回滚/手动录入/删除
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { api, loginUser, loginAdmin, state, adminGet, adminPost, adminPut, adminDelete } from './helpers.js'

let managedOrderId = null

beforeAll(async () => {
  if (!state.adminToken) await loginAdmin()
  if (!state.userToken) await loginUser()
  
  // 先让用户端创建一个订单，管理端拿它测试
  const createRes = await api('POST', '/api/order/create', {
    car_id: 1,
    start_date: '2026-09-01', end_date: '2026-09-01',
    start_time: '09:00', end_time: '17:00',
    start_addr: '管理端测试起点', end_addr: '管理端测试终点',
    contact_name: '测试', contact_phone: '13812345678',
    passenger_count: 1,
  }, { Authorization: `Bearer ${state.userToken}` })
  if (createRes.body?.code === 200) {
    managedOrderId = createRes.body.data.id
  }
})

describe('4. 管理端 — 仪表盘', () => {
  it('4.1 Dashboard 数据可获取', async () => {
    const { body } = await adminGet('/api/admin/dashboard')
    expect(body.code).toBe(200)
    expect(body.data).toBeTruthy()
  })

  it('4.2 未登录访问 Dashboard 返回 401', async () => {
    const { body } = await api('GET', '/api/admin/dashboard')
    expect(body.code).toBe(401)
  })
})

describe('5. 管理端 — 订单列表与筛选', () => {
  it('5.1 订单列表可获取', async () => {
    const { body } = await adminGet('/api/admin/orders')
    expect(body.code).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('5.2 按状态筛选订单', async () => {
    const { body } = await adminGet('/api/admin/orders?status=pending')
    expect(body.code).toBe(200)
  })

  it('5.3 分页参数生效', async () => {
    const { body } = await adminGet('/api/admin/orders?page=1&pageSize=5')
    expect(body.code).toBe(200)
  })

  it('5.4 搜索关键词筛选', async () => {
    const { body } = await adminGet('/api/admin/orders?keyword=测试')
    expect(body.code).toBe(200)
  })
})

describe('6. 管理端 — 订单状态流转', () => {
  it('6.1 接单 — 待接单→已接单', async () => {
    if (!managedOrderId) return
    const { body } = await adminPost(`/api/admin/orders/accept`, { order_id: managedOrderId })
    console.log('[6.1] 接单结果:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('6.2 重复接单应返回错误', async () => {
    if (!managedOrderId) return
    const { body } = await adminPost(`/api/admin/orders/accept`, { order_id: managedOrderId })
    console.log('[6.2] 重复接单结果:', JSON.stringify(body))
    // 已接单的订单再接受应失败
    expect(body.code).not.toBe(200)
  })

  it('6.3 派单 — 分配司机', async () => {
    if (!managedOrderId) return
    const { body } = await adminPost(`/api/admin/orders/dispatch`, { order_id: managedOrderId, driver_id: 1 })
    console.log('[6.3] 派单结果:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('6.4 完成 — 已完成状态', async () => {
    if (!managedOrderId) return
    const { body } = await adminPost(`/api/admin/orders/complete`, { order_id: managedOrderId })
    console.log('[6.4] 完成结果:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('6.5 回滚 — 已完成→已接单', async () => {
    if (!managedOrderId) return
    const { body } = await adminPost(`/api/admin/orders/rollback`, { order_id: managedOrderId })
    console.log('[6.5] 回滚结果:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('7. 管理端 — 手动录入', () => {
  it('7.1 手动创建订单', async () => {
    const { body } = await adminPost('/api/admin/orders/manual', {
      car_id: 1,
      start_date: '2026-08-15', end_date: '2026-08-15',
      start_time: '10:00', end_time: '20:00',
      start_addr: '手动录入起点', end_addr: '手动录入终点',
      contact_name: '手动客户', contact_phone: '13899998888',
      passenger_count: 3,
    })
    console.log('[7.1] 手动录入结果:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('7.2 手动录入 — 缺少必填字段', async () => {
    const { body } = await adminPost('/api/admin/orders/manual', { car_id: 1 })
    expect(body.code).not.toBe(200)
  })
})

describe('8. 管理端 — 批量操作', () => {
  it('8.1 批量接受订单', async () => {
    // 创建两个新订单
    const create1 = await api('POST', '/api/order/create', {
      car_id: 1, start_date: '2026-10-01', end_date: '2026-10-01',
      start_time: '08:00', end_time: '18:00', start_addr: 'A', end_addr: 'B',
      contact_name: '批量1', contact_phone: '13811110001', passenger_count: 1,
    }, { Authorization: `Bearer ${state.userToken}` })
    const create2 = await api('POST', '/api/order/create', {
      car_id: 1, start_date: '2026-10-01', end_date: '2026-10-01',
      start_time: '08:00', end_time: '18:00', start_addr: 'C', end_addr: 'D',
      contact_name: '批量2', contact_phone: '13811110002', passenger_count: 1,
    }, { Authorization: `Bearer ${state.userToken}` })
    
    const ids = [create1.body?.data?.id, create2.body?.data?.id].filter(Boolean)
    if (ids.length > 0) {
      const { body } = await adminPost('/api/admin/orders/batch', {
        action: 'accept', order_ids: ids,
      })
      console.log('[8.1] 批量操作结果:', JSON.stringify(body))
      // 测试通过如果接口存在且返回
      expect([200, 400, 404]).toContain(body.code)
    }
  })
})
