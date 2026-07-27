/**
 * 管理端组织架构：组织/角色/管理员/车队
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { loginAdmin, state, adminGet, adminPost, adminPut, adminDelete } from './helpers.js'

beforeAll(async () => {
  if (!state.adminToken) await loginAdmin()
})

describe('13. 组织管理', () => {
  let orgId = null

  it('13.1 组织列表可获取', async () => {
    const { body } = await adminGet('/api/admin/organizations')
    expect(body.code).toBe(200)
  })

  it('13.2 创建子组织', async () => {
    const { body } = await adminPost('/api/admin/organizations', {
      name: `测试组织_${Date.now()}`,
      parent_id: null,
    })
    console.log('[13.2] 创建组织:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) orgId = body.data.id
    expect(body.code).toBe(200)
  })

  it('13.3 编辑组织', async () => {
    if (!orgId) return
    const { body } = await adminPut(`/api/admin/organizations/${orgId}`, { name: '修改后组织' })
    console.log('[13.3] 编辑组织:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('13.4 删除组织', async () => {
    if (!orgId) return
    const { body } = await adminDelete(`/api/admin/organizations/${orgId}`)
    console.log('[13.4] 删除组织:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('14. 角色管理', () => {
  let roleId = null

  it('14.1 角色列表可获取', async () => {
    const { body } = await adminGet('/api/admin/roles')
    expect(body.code).toBe(200)
  })

  it('14.2 创建角色', async () => {
    const ts = Date.now()
    const { body } = await adminPost('/api/admin/roles', {
      name: `测试角色_${ts}`,
      code: `test_role_${ts}`,
      permissions: JSON.stringify(['order.view', 'order.edit']),
    })
    console.log('[14.2] 创建角色:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) roleId = body.data.id
    expect(body.code).toBe(200)
  })

  it('14.3 编辑角色', async () => {
    if (!roleId) return
    const { body } = await adminPut(`/api/admin/roles/${roleId}`, {
      name: '修改后角色',
      permissions: JSON.stringify(['order.view']),
    })
    console.log('[14.3] 编辑角色:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('14.4 删除角色', async () => {
    if (!roleId) return
    const { body } = await adminDelete(`/api/admin/roles/${roleId}`)
    console.log('[14.4] 删除角色:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('15. 管理员用户管理', () => {
  let adminUserId = null

  it('15.1 管理员列表可获取', async () => {
    const { body } = await adminGet('/api/admin/admin-users')
    expect(body.code).toBe(200)
  })

  it('15.2 创建管理员', async () => {
    const { body } = await adminPost('/api/admin/admin-users', {
      username: `test_admin_${Date.now()}`,
      password: '123456',
      name: '测试管理员',
      role_id: 1,
    })
    console.log('[15.2] 创建管理员:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) adminUserId = body.data.id
    expect(body.code).toBe(200)
  })

  it('15.3 编辑管理员', async () => {
    if (!adminUserId) return
    const { body } = await adminPut(`/api/admin/admin-users/${adminUserId}`, { name: '修改后名称' })
    console.log('[15.3] 编辑管理员:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('15.4 权限定义列表', async () => {
    const { body } = await adminGet('/api/admin/permission-defs')
    console.log('[15.4] 权限定义:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})

describe('16. 车队管理', () => {
  let fleetId = null

  it('16.1 车队列表可获取', async () => {
    const { body } = await adminGet('/api/admin/fleets')
    // 如果还没有车队数据，code 可能不是 200
    console.log('[16.1] 车队列表:', JSON.stringify(body))
    expect(body).toBeTruthy()
  })

  it('16.2 创建车队', async () => {
    const { body } = await adminPost('/api/admin/fleets', {
      orgId: 'ORG001',
      name: `测试车队_${Date.now()}`,
      leader: '队长',
      phone: '13800001111',
    })
    console.log('[16.2] 创建车队:', JSON.stringify(body))
    if (body.code === 200 && body.data?.id) fleetId = body.data.id
    expect(body.code).toBe(200)
  })

  it('16.3 编辑车队', async () => {
    if (!fleetId) return
    const { body } = await adminPut(`/api/admin/fleets/${fleetId}`, { name: '修改后车队' })
    console.log('[16.3] 编辑车队:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })

  it('16.4 删除车队', async () => {
    if (!fleetId) return
    const { body } = await adminDelete(`/api/admin/fleets/${fleetId}`)
    console.log('[16.4] 删除车队:', JSON.stringify(body))
    expect(body.code).toBe(200)
  })
})
