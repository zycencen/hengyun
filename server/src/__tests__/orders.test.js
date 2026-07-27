/**
 * 用户端订单模块测试：创建订单/订单列表/订单详情/取消订单
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { api, loginUser, userGet, userPost, state, BASE } from './helpers.js'

let carId = null

beforeAll(async () => {
  if (!state.userToken) {
    await loginUser()
  }
  // 获取可用车辆列表，拿到 carId
  const { body } = await api('GET', '/api/car/list')
  if (body.code === 200 && body.data?.cars?.length > 0) {
    carId = body.data.cars[0].id
  }
})

describe('3. 用户端订单', () => {
  const futureTime = '2026-08-15 09:00:00'

  it('3.1 创建包车订单 — 必填字段齐全应成功', async () => {
    if (!carId) return
    const { body } = await userPost('/api/order/create', {
      departCity: '北京',
      departTime: futureTime,
      packageType: 'daily',
      duration: '1天',
      carId,
      bizType: 'charter',
    })
    expect(body.code).toBe(200)
    if (body.data?.id) {
      state.testOrderId = body.data.id
    }
  })

  it('3.2 创建通勤订单 — 支持通勤类型', async () => {
    if (!carId) return
    const { body } = await userPost('/api/order/create', {
      departCity: '北京',
      departTime: '2026-08-16 09:00:00',
      packageType: 'daily',
      duration: '1天',
      carId,
      bizType: 'commute',
    })
    expect(body.code).toBe(200)
  })

  it('3.3 创建定制订单 — 支持定制类型', async () => {
    if (!carId) return
    const { body } = await userPost('/api/order/create', {
      departCity: '上海',
      departTime: '2026-08-17 10:00:00',
      packageType: 'daily',
      duration: '1天',
      carId,
      bizType: 'custom',
    })
    expect(body.code).toBe(200)
  })

  it('3.4 订单列表 — 可获取用户订单', async () => {
    const { body } = await userGet('/api/order/list')
    expect(body.code).toBe(200)
    expect(body.data?.list).toBeTruthy()
    expect(Array.isArray(body.data.list)).toBe(true)
  })

  it('3.5 订单详情 — 存在订单可查看', async () => {
    if (!state.testOrderId) return
    const { body } = await api('GET', `/api/order/detail/${state.testOrderId}`, null, {
      Authorization: `Bearer ${state.userToken}`,
    })
    expect(body.code).toBe(200)
    expect(body.data).toBeTruthy()
  })

  it('3.6 取消订单 — 待付款订单可取消', async () => {
    if (!state.testOrderId) return
    const { body } = await api('PUT', `/api/order/cancel/${state.testOrderId}`, null, {
      Authorization: `Bearer ${state.userToken}`,
    })
    expect(body.code).toBe(200)
  })
})
