/**
 * 管理端资源管理：车辆/司机/合同/调度/班次/排班
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { loginAdmin, state, adminGet, adminPost, adminPut, adminDelete } from './helpers.js'

beforeAll(async () => {
  if (!state.adminToken) await loginAdmin()
})

describe('9. 车辆管理', () => {
  let vehicleId = null

  it('9.1 车辆列表可获取', async () => {
    const { body } = await adminGet('/api/admin/vehicles')
    expect(body.code).toBe(200)
  })

  it('9.2 添加车辆', async () => {
    const { body } = await adminPost('/api/admin/vehicles', {
      plate_no: `粤B${String(Math.floor(Math.random() * 90000 + 10000))}`,
      car_model_id: 1,
      seats: 7,
      status: 'available',
    })
    console.log('[9.2] 添加车辆:', JSON.stringify(body))
    if (body.code === 200 && body.data) vehicleId = body.data.id
    expect(body.code).toBe(200)
  })

  it('9.3 编辑车辆', async () => {
    if (!vehicleId) return
    const { body } = await adminPut(`/api/admin/vehicles/${vehicleId}`, { seats: 9 })
    console.log('[9.3] 编辑车辆:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('9.4 删除车辆', async () => {
    if (!vehicleId) return
    const { body } = await adminDelete(`/api/admin/vehicles/${vehicleId}`)
    console.log('[9.4] 删除车辆:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('10. 司机管理', () => {
  let driverId = null

  it('10.1 司机列表可获取', async () => {
    const { body } = await adminGet('/api/admin/drivers')
    expect(body.code).toBe(200)
  })

  it('10.2 添加司机', async () => {
    const { body } = await adminPost('/api/admin/drivers', {
      name: `测试司机${Date.now()}`,
      phone: `138${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
      license_no: `420100${String(Date.now()).slice(-10)}`,
    })
    console.log('[10.2] 添加司机:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) driverId = body.data.id
    expect(body.code).toBe(200)
  })

  it('10.3 编辑司机', async () => {
    if (!driverId) return
    const { body } = await adminPut(`/api/admin/drivers/${driverId}`, { name: '修改后司机' })
    console.log('[10.3] 编辑司机:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('10.4 删除司机', async () => {
    if (!driverId) return
    const { body } = await adminDelete(`/api/admin/drivers/${driverId}`)
    console.log('[10.4] 删除司机:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('11. 合同管理', () => {
  let contractId = null

  it('11.1 合同列表可获取', async () => {
    const { body } = await adminGet('/api/admin/contracts')
    expect(body.code).toBe(200)
  })

  it('11.2 创建合同', async () => {
    if (!state.testOrderId) return
    const { body } = await adminPost('/api/admin/contracts', {
      order_id: state.testOrderId,
      content: '测试合同内容',
    })
    console.log('[11.2] 创建合同:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) contractId = body.data.id
    // 可能已存在合同，400 也可以接受
    expect([200, 400]).toContain(body.code)
  })

  it('11.3 合同详情可获取', async () => {
    if (!contractId) return
    const { body } = await adminGet(`/api/admin/contracts/${contractId}`)
    console.log('[11.3] 合同详情:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('12. 调度排班', () => {
  it('12.1 班次列表', async () => {
    const { body } = await adminGet('/api/admin/shifts')
    console.log('[12.1] 班次列表:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('12.2 排班列表', async () => {
    const { body } = await adminGet('/api/admin/schedules')
    console.log('[12.2] 排班列表:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('12.3 排班详情', async () => {
    const { body } = await adminGet('/api/admin/schedules/detail')
    console.log('[12.3] 排班详情:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('12.4 创建班次', async () => {
    const { body } = await adminPost('/api/admin/shifts', {
      name: `早班-${Date.now()}`,
      start_time: '06:00',
      end_time: '14:00',
    })
    console.log('[12.4] 创建班次:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})
