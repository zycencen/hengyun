/**
 * 测试辅助工具 — 统一管理测试环境状态
 */

const BASE = 'http://localhost:8081'
const DEV_CODE = '888888'

// 环境状态（跨文件共享）
const state = {
  userToken: null,        // 用户端 JWT
  adminToken: null,       // 管理端 JWT (admin)
  superAdminToken: null,  // 超级管理员 JWT
  testOrderId: null,      // 测试创建的订单 ID
  testPhone: null,        // 测试手机号
}

async function api(method, path, body = null, headers = {}) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  if (body !== null) {
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { _raw: text, _status: res.status }
  }
  return { status: res.status, body: data, headers: res.headers }
}

// ---------- 认证 ----------

async function loginUser(phone = null) {
  const p = phone || `138${String(Math.floor(Math.random() * 90000000 + 10000000))}`
  state.testPhone = p
  await api('POST', '/api/user/sms-code', { phone: p })
  const res = await api('POST', '/api/user/login', { phone: p, code: DEV_CODE })
  if (res.body?.code === 200) {
    state.userToken = res.body.data.token
  }
  return { phone: p, res }
}

async function loginAdmin(username = 'admin', password = '123456') {
  const res = await api('POST', '/api/user/admin/login', { username, password })
  if (res.body?.code === 200) {
    state.adminToken = res.body.data.token
  }
  return res
}

// ---------- 带 Token 的请求 ----------

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function userGet(path) {
  return api('GET', path, null, authHeaders(state.userToken))
}

async function userPost(path, body) {
  return api('POST', path, body, authHeaders(state.userToken))
}

async function userPut(path, body) {
  return api('PUT', path, body, authHeaders(state.userToken))
}

async function adminGet(path) {
  return api('GET', path, null, authHeaders(state.adminToken))
}

async function adminPost(path, body) {
  return api('POST', path, body, authHeaders(state.adminToken))
}

async function adminPut(path, body) {
  return api('PUT', path, body, authHeaders(state.adminToken))
}

async function adminDelete(path) {
  return api('DELETE', path, null, authHeaders(state.adminToken))
}

module.exports = {
  BASE,
  DEV_CODE,
  state,
  api,
  loginUser,
  loginAdmin,
  userGet,
  userPost,
  userPut,
  adminGet,
  adminPost,
  adminPut,
  adminDelete,
}
