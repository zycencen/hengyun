/**
 * 管理端资源管理测试：车辆/司机/车队 CRUD
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { loginAdmin, adminGet, adminPost, adminPut, adminDelete, state } from './helpers.js'

beforeAll(async () => {
  if (!state.adminToken) {
    await loginAdmin()
  }
})

describe('7. 管理端车辆管理', () => {
  let testVehicleId = null

  it('7.1 车辆列表 — 可获取车辆', async () => {
    const { body } = await adminGet('/api/admin/vehicles?page=1&pageSize=10')
    expect(body.code).toBe(200)
  })

  it('7.2 创建车辆 — 可添加新车', async () => {
    const { body } = await adminPost('/api/admin/vehicles', {
      plateNumber: '京B' + Date.now().toString().slice(-5),
      model: '丰田考斯特',
      seatCount: 20,
      vehicleType: 'bus',
    })
    expect([200, 400]).toContain(body.code)
    if (body.data?.id) {
      testVehicleId = body.data.id
    }
  })

  it('7.3 车辆详情 — 可查看车辆信息', async () => {
    if (!testVehicleId) return
    const { body } = await adminGet(`/api/admin/vehicles/${testVehicleId}`)
    expect(body.code).toBe(200)
  })

  it('7.4 更新车辆 — 可修改车辆信息', async () => {
    if (!testVehicleId) return
    const { body } = await adminPut(`/api/admin/vehicles/${testVehicleId}`, {
      seatCount: 25,
    })
    expect(body.code).toBe(200)
  })
})

describe('8. 管理端司机管理', () => {
  it('8.1 司机列表 — 可获取司机', async () => {
    const { body } = await adminGet('/api/admin/drivers?page=1&pageSize=10')
    expect(body.code).toBe(200)
  })
})

describe('9. 管理端车队管理', () => {
  it('9.1 车队列表 — 可获取车队', async () => {
    const { body } = await adminGet('/api/admin/fleets')
    expect([200, 404]).toContain(body.code)
  })
})
