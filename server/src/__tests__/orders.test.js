/**
 * 用户端订单模块测试：创建/列表/详情/支付/取消/改派
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { api, loginUser, loginAdmin, state, userGet, userPost, adminGet, adminPost } from './helpers.js'

beforeAll(async () => {
  if (!state.userToken) await loginUser()
  if (!state.adminToken) await loginAdmin()
})

async function createTestOrder(overrides = {}) {
  const orderData = {
    car_id: 1,
    start_date: '2026-08-01', end_date: '2026-08-01',
    start_time: '08:00', end_time: '18:00',
    start_addr: '深圳宝安机场', end_addr: '广州白云机场',
    contact_name: '测试客户', contact_phone: '13800000003',
    passenger_count: 2,
    ...overrides,
  }
  const { body } = await userPost('/api/order/create', orderData)
  return body
}

describe('3. 用户端订单', () => {
  it('3.1 创建订单 — 基本参数应成功', async () => {
    const body = await createTestOrder()
    expect(body.code).toBe(200)
    expect(body.data).toBeTruthy()
    expect(body.data.id).toBeTruthy()
    state.testOrderId = body.data.id
  })

  it('3.2 创建订单 — 缺少必填字段返回错误', async () => {
    const { body } = await userPost('/api/order/create', { car_id: 1 })
    expect(body.code).not.toBe(200)
  })

  it('3.3 创建订单 — 未登录返回 401', async () => {
    const { body } = await api('POST', '/api/order/create', { car_id: 1, start_date: '2026-08-01', end_date: '2026-08-01', start_time: '08:00', end_time: '18:00', start_addr: 'A', end_addr: 'B', contact_name: 'X', contact_phone: '13800000004', passenger_count: 1 })
    expect(body.code).toBe(401)
  })

  it('3.4 订单列表 — 已登录可获取', async () => {
    const { body } = await userGet('/api/order/list')
    expect(body.code).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('3.5 订单详情 — 有效ID可获取', async () => {
    const { body } = await userGet(`/api/order/detail/${state.testOrderId}`)
    expect(body.code).toBe(200)
    expect(body.data.id).toBe(state.testOrderId)
  })

  it('3.6 订单详情 — 无效ID返回错误', async () => {
    const { body } = await userGet('/api/order/detail/999999')
    expect(body.code).not.toBe(200)
  })

  it('3.7 取消订单 — 待接单状态可取消', async () => {
    const createBody = await createTestOrder()
    const orderId = createBody.data.id
    const { body } = await api('PUT', `/api/order/cancel/${orderId}`, null, { Authorization: `Bearer ${state.userToken}` })
    expect(body.code).toBe(200)
  })

  it('3.8 订单统计 — 已登录可获取', async () => {
    const { body } = await userGet('/api/order/stats')
    expect(body.code).toBe(200)
    expect(body.data).toBeTruthy()
  })
})
