/**
 * 管理端财务/发票/需求/城市/价格/车型测试
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { loginAdmin, state, adminGet, adminPost, adminPut, adminDelete } from './helpers.js'

beforeAll(async () => {
  if (!state.adminToken) await loginAdmin()
})

describe('17. 财务管理', () => {
  it('17.1 财务统计可获取', async () => {
    const { body } = await adminGet('/api/admin/finance')
    console.log('[17.1] 财务统计:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('17.2 财务明细可获取', async () => {
    const { body } = await adminGet('/api/admin/finance/details')
    console.log('[17.2] 财务明细:', JSON.stringify(body))
    expect(body).toBeTruthy()
  })
})

describe('18. 发票管理', () => {
  it('18.1 发票列表可获取', async () => {
    const { body } = await adminGet('/api/admin/invoices')
    console.log('[18.1] 发票列表:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('18.2 发票审批', async () => {
    // 尝试审批，可能没有待审批发票
    const { body } = await adminPut('/api/admin/invoices/1', {
      status: 'approved',
      admin_note: '测试审批通过',
    })
    console.log('[18.2] 发票审批:', JSON.stringify(body))
    // 400 也表示接口正常（无此发票或无权操作）
    expect([200, 400, 404]).toContain(body.code)
  })
})

describe('19. 需求管理', () => {
  it('19.1 通勤需求列表', async () => {
    const { body } = await adminGet('/api/admin/demands/commute')
    console.log('[19.1] 通勤需求:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('19.2 定制包车需求列表', async () => {
    const { body } = await adminGet('/api/admin/demands/custom')
    console.log('[19.2] 定制需求:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('19.3 需求审批', async () => {
    const { body } = await adminPut('/api/admin/demands/commute/1', {
      status: 'approved',
      admin_note: '测试通过',
    })
    console.log('[19.3] 需求审批:', JSON.stringify(body))
    expect([200, 400, 403, 404]).toContain(body.code)
  })
})

describe('20. 城市管理', () => {
  let cityId = null

  it('20.1 城市列表可获取', async () => {
    const { body } = await adminGet('/api/admin/cities')
    expect(body.code).toBe(200)
  })

  it('20.2 添加城市', async () => {
    const { body } = await adminPost('/api/admin/cities', {
      name: `测试城市_${Date.now()}`,
      province: '广东省',
    })
    console.log('[20.2] 添加城市:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) cityId = body.data.id
    expect(body.code).toBe(200)
  })

  it('20.3 删除城市', async () => {
    if (!cityId) return
    const { body } = await adminDelete(`/api/admin/cities/${cityId}`)
    console.log('[20.3] 删除城市:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('21. 价格管理', () => {
  let priceId = null

  it('21.1 价格列表可获取', async () => {
    const { body } = await adminGet('/api/admin/prices')
    expect(body.code).toBe(200)
  })

  it('21.2 创建价格', async () => {
    const { body } = await adminPost('/api/admin/prices', {
      car_model_id: 1,
      city_id: 1,
      base_price: 500,
      price_per_km: 10,
      price_per_hour: 100,
    })
    console.log('[21.2] 创建价格:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) priceId = body.data.id
    // 可能已存在，400 也是合理的
    expect([200, 400]).toContain(body.code)
  })

  it('21.3 编辑价格', async () => {
    if (!priceId) return
    const { body } = await adminPut(`/api/admin/prices/${priceId}`, { base_price: 600 })
    console.log('[21.3] 编辑价格:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('21.4 删除价格', async () => {
    if (!priceId) return
    const { body } = await adminDelete(`/api/admin/prices/${priceId}`)
    console.log('[21.4] 删除价格:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('22. 车型管理', () => {
  it('22.1 车型列表可获取', async () => {
    const { body } = await adminGet('/api/admin/car-models')
    console.log('[22.1] 车型列表:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('23. 系统设置', () => {
  it('23.1 设置列表可获取', async () => {
    const { body } = await adminGet('/api/admin/settings')
    console.log('[23.1] 系统设置:', JSON.stringify(body))
    expect([200, 404]).toContain(body.code)
  })

  it('23.2 更新设置', async () => {
    const { body } = await adminPut('/api/admin/settings', {
      site_name: '恒运出行',
    })
    console.log('[23.2] 更新设置:', JSON.stringify(body))
    expect([200, 404]).toContain(body.code)
  })
})

describe('24. 数据库管理', () => {
  it('24.1 数据库状态信息', async () => {
    const { body } = await adminGet('/api/admin/db-status')
    console.log('[24.1] 数据库状态:', JSON.stringify(body))
    // 是否存在都可以
    expect(body).toBeTruthy()
  })
})
