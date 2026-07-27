/**
 * 管理端组织架构测试：组织/角色/管理员 CRUD
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { loginAdmin, adminGet, adminPost, adminPut, adminDelete, state } from './helpers.js'

beforeAll(async () => {
  if (!state.adminToken) await loginAdmin()
})

describe('6. 管理端组织架构', () => {
  let testOrgId = null

  it('6.1 组织列表 — 可获取组织树', async () => {
    const { body } = await adminGet('/api/admin/organizations')
    expect(body.code).toBe(200)
    const list = body.data?.list || body.data || []
    expect(Array.isArray(list)).toBe(true)
  })

  it('6.2 创建组织 — 可添加新组织', async () => {
    const { body } = await adminPost('/api/admin/organizations', {
      name: '测试子公司_' + Date.now(),
      parentId: null,
    })
    expect(body.code).toBe(200)
    if (body.data?.id) testOrgId = body.data.id
  })

  it('6.3 更新组织 — 可修改组织信息', async () => {
    if (!testOrgId) return
    const { body } = await adminPut(`/api/admin/organizations/${testOrgId}`, {
      name: '测试子公司_已修改',
    })
    expect(body.code).toBe(200)
  })

  it('6.4 角色列表 — 可获取角色列表', async () => {
    const { body } = await adminGet('/api/admin/roles')
    expect(body.code).toBe(200)
  })

  it('6.5 管理员列表 — 可获取管理员列表', async () => {
    const { body } = await adminGet('/api/admin/admin-users')
    expect(body.code).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('6.6 删除组织 — 可删除测试组织', async () => {
    if (!testOrgId) return
    const { body } = await adminDelete(`/api/admin/organizations/${testOrgId}`)
    expect(body.code).toBe(200)
  })
})
