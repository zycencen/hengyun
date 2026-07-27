/**
 * 认证模块测试：用户登录/管理员登录/Token验证/权限拦截
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { api, loginUser, loginAdmin, state, DEV_CODE } from './helpers.js'

describe('1. 用户端认证', () => {
  it('1.1 发送验证码 — 正确手机号应返回成功', async () => {
    const { status, body } = await api('POST', '/api/user/sms-code', { phone: '13800000001' })
    expect(status).toBe(200)
    expect(body.code).toBe(200)
  })

  it('1.2 发送验证码 — 空手机号应返回错误', async () => {
    const { body } = await api('POST', '/api/user/sms-code', { phone: '' })
    expect(body.code).not.toBe(200)
  })

  it('1.3 发送验证码 — 非空手机号可发送（服务端不做格式校验）', async () => {
    const { body } = await api('POST', '/api/user/sms-code', { phone: 'abc' })
    expect(body.code).toBe(200)
  })

  it('1.4 登录 — 万能验证码 888888 可登录', async () => {
    const { res: { body } } = await loginUser()
    expect(body.code).toBe(200)
    expect(body.data.token).toBeTruthy()
    expect(body.data.user).toBeTruthy()
  })

  it('1.5 登录 — 错误验证码返回错误', async () => {
    await api('POST', '/api/user/sms-code', { phone: '13800000002' })
    const { body } = await api('POST', '/api/user/login', { phone: '13800000002', code: '000000' })
    expect(body.code).not.toBe(200)
  })

  it('1.6 用户信息获取 — 已登录可获取', async () => {
    const { body } = await api('GET', '/api/user/profile', null, { Authorization: `Bearer ${state.userToken}` })
    expect(body.code).toBe(200)
  })

  it('1.7 Token 无效 — 返回 401', async () => {
    const { body } = await api('GET', '/api/user/profile', null, { Authorization: 'Bearer invalid_token_here' })
    expect(body.code).toBe(401)
  })

  it('1.8 无 Token — 返回 401', async () => {
    const { body } = await api('GET', '/api/user/profile')
    expect(body.code).toBe(401)
  })
})

describe('2. 管理端认证', () => {
  it('2.1 管理员登录 — admin/123456', async () => {
    const { body } = await loginAdmin()
    expect(body.code).toBe(200)
    expect(body.data.token).toBeTruthy()
    expect(body.data.user).toBeTruthy()
  })

  it('2.2 管理员登录 — 错误密码返回错误', async () => {
    const { body } = await api('POST', '/api/user/admin/login', { username: 'admin', password: 'wrong' })
    expect(body.code).not.toBe(200)
  })

  it('2.3 管理员登录 — 不存在用户返回错误', async () => {
    const { body } = await api('POST', '/api/user/admin/login', { username: 'nonexistent', password: '123456' })
    expect(body.code).not.toBe(200)
  })

  it('2.4 管理员 Token 可访问管理端接口', async () => {
    const { body } = await api('GET', '/api/admin/dashboard', null, { Authorization: `Bearer ${state.adminToken}` })
    expect(body.code).toBe(200)
  })

  it('2.5 用户 Token 不能访问管理端', async () => {
    const { body } = await api('GET', '/api/admin/dashboard', null, { Authorization: `Bearer ${state.userToken}` })
    expect(body.code).not.toBe(200)
  })
})
