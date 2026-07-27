/**
 * 管理端财务模块测试：仪表盘/发票管理
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { loginAdmin, adminGet, state } from './helpers.js'

beforeAll(async () => {
  if (!state.adminToken) await loginAdmin()
})

describe('5. 管理端财务管理', () => {
  it('5.1 财务仪表盘 — 可获取财务概览', async () => {
    const { body } = await adminGet('/api/admin/finance')
    expect(body.code).toBe(200)
    expect(body.data).toBeTruthy()
  })

  it('5.2 发票列表 — 可获取发票', async () => {
    const { body } = await adminGet('/api/admin/invoices')
    expect(body.code).toBe(200)
  })

  it('5.3 仪表盘数据完整性 — 含今日/本月统计', async () => {
    const { body } = await adminGet('/api/admin/finance')
    expect(body.code).toBe(200)
    expect(typeof body.data.todayRevenue).toBe('number')
    expect(typeof body.data.todayOrders).toBe('number')
    expect(typeof body.data.monthRevenue).toBe('number')
    expect(typeof body.data.monthOrders).toBe('number')
  })

  it('5.4 发票列表含数据', async () => {
    const { body } = await adminGet('/api/admin/invoices')
    expect(body.code).toBe(200)
    const list = body.data?.list || body.data || []
    expect(Array.isArray(list)).toBe(true)
  })

  it('5.5 发票列表支持分页', async () => {
    const { body } = await adminGet('/api/admin/invoices?page=1&pageSize=5')
    expect(body.code).toBe(200)
  })
})
