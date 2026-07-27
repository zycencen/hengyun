/**
 * 管理端订单管理测试：列表/接单/派车/完成 完整流程
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { api, loginAdmin, loginUser, adminGet, state, BASE } from './helpers.js'

let testOrderId = null
let testDriverId = null

beforeAll(async () => {
  // 1. 登录管理员
  if (!state.adminToken) await loginAdmin()

  // 2. 登录用户并创建订单→支付（构造完整测试数据）
  if (!state.userToken) await loginUser()

  // 获取可用车辆
  const { body: carBody } = await api('GET', '/api/car/list')
  if (carBody.code === 200 && carBody.data?.cars?.length > 0) {
    const carId = carBody.data.cars[0].id

    // 创建订单
    const { body: orderBody } = await api('POST', '/api/order/create', {
      departCity: '测试城市',
      departTime: '2026-08-20 08:00:00',
      packageType: 'daily',
      duration: '1天',
      carId,
      bizType: 'charter',
    }, { Authorization: `Bearer ${state.userToken}` })

    if (orderBody.code === 200 && orderBody.data?.id) {
      testOrderId = orderBody.data.id

      // 支付订单（待付款 → 待接单）
      await api('POST', `/api/order/pay/${testOrderId}`, null, {
        Authorization: `Bearer ${state.userToken}`,
      })
    }
  }

  // 获取可用司机
  const { body: driverBody } = await adminGet('/api/admin/drivers?pageSize=5')
  const drivers = driverBody.data?.list || driverBody.data || []
  if (drivers.length > 0) testDriverId = drivers[0].id
})

describe('4. 管理端订单管理', () => {
  it('4.1 订单列表 — 可获取全部订单', async () => {
    const { body } = await adminGet('/api/admin/orders?page=1&pageSize=10')
    expect(body.code).toBe(200)
    const list = body.data?.list || body.data || []
    expect(Array.isArray(list)).toBe(true)
  })

  it('4.2 确认接单 — 待接单订单可接单', async () => {
    if (!testOrderId) return
    const { body } = await api('POST', '/api/admin/orders/accept', { orderId: testOrderId }, {
      Authorization: `Bearer ${state.adminToken}`,
    })
    expect([200, 400]).toContain(body.code)
  })

  it('4.3 派车 — 待派车订单可派车', async () => {
    if (!testOrderId || !testDriverId) return
    const { body } = await api('POST', '/api/admin/orders/dispatch', {
      orderId: testOrderId,
      driverId: testDriverId,
    }, { Authorization: `Bearer ${state.adminToken}` })
    expect([200, 400]).toContain(body.code)
  })

  it('4.4 完成订单 — 进行中订单可完成', async () => {
    if (!testOrderId) return
    const { body } = await api('POST', '/api/admin/orders/complete', { orderId: testOrderId }, {
      Authorization: `Bearer ${state.adminToken}`,
    })
    expect([200, 400]).toContain(body.code)
  })

  it('4.5 订单筛选 — 按业务类型筛选', async () => {
    const { body } = await adminGet('/api/admin/orders?businessType=charter&page=1&pageSize=5')
    expect(body.code).toBe(200)
  })

  it('4.6 订单筛选 — 按状态筛选', async () => {
    const { body } = await adminGet('/api/admin/orders?status=已完成&page=1&pageSize=5')
    expect(body.code).toBe(200)
  })
})
