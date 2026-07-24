/**
 * 企业微信 API 模块
 * 用于发送应用消息到司机企业微信（同步推送到个人微信）
 */

const https = require('https')

// 企业微信配置
const WECHAT_CONFIG = {
  corpid: process.env.WECHAT_CORP_ID || 'ww5c2d3e7eb01464fa',
  corpsecret: process.env.WECHAT_CORP_SECRET || 'ukZrnd0Dp97qtFJY_kisyZu4-nFPyub_df8Mr0ugAM8',
  agentid: parseInt(process.env.WECHAT_AGENT_ID || '1000059', 10),
}

// Token 缓存
let accessToken = ''
let tokenExpiresAt = 0

/** 请求封装 */
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('解析响应失败: ' + data))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('请求超时')) })
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

/** 获取 access_token */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 300000) {
    return accessToken
  }

  const options = {
    hostname: 'qyapi.weixin.qq.com',
    path: `/cgi-bin/gettoken?corpid=${WECHAT_CONFIG.corpid}&corpsecret=${WECHAT_CONFIG.corpsecret}`,
    method: 'GET',
  }

  const result = await httpsRequest(options)
  if (result.errcode === 0) {
    accessToken = result.access_token
    tokenExpiresAt = Date.now() + (result.expires_in * 1000)
    console.log('🔑 企业微信 token 已刷新')
    return accessToken
  }
  throw new Error(`获取企业微信token失败: ${result.errmsg} (${result.errcode})`)
}

/**
 * 发送文本卡片消息到指定用户
 * 消息将推送到企业微信，同时同步到用户的个人微信（需开启微信插件）
 *
 * @param {string} touser - 接收者的企业微信 userid，多个用 | 分隔
 * @param {string} title - 卡片标题
 * @param {string} description - 卡片描述
 * @param {string} url - 点击跳转链接（可选）
 */
async function sendTextcard(touser, title, description, url) {
  const token = await getAccessToken()

  const options = {
    hostname: 'qyapi.weixin.qq.com',
    path: `/cgi-bin/message/send?access_token=${token}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }

  const body = {
    touser,
    msgtype: 'textcard',
    agentid: WECHAT_CONFIG.agentid,
    textcard: {
      title,
      description,
      url: url || '',
      btntxt: '查看详情',
    },
  }

  const result = await httpsRequest(options, body)
  if (result.errcode !== 0) {
    // 如果是无效 userid，不抛错，只记录日志
    if (result.errcode === 60111 || result.errcode === 40003) {
      console.warn(`⚠ 企业微信发送失败(无效userid): ${touser} - ${result.errmsg}`)
      return { sent: false, errmsg: result.errmsg, errcode: result.errcode }
    }
    throw new Error(`企业微信消息发送失败: ${result.errmsg} (${result.errcode})`)
  }

  console.log(`📤 企业微信消息已发送: ${touser}`)
  return { sent: true, errmsg: result.errmsg }
}

/**
 * 批量通知司机今日排班
 *
 * @param {Array<{driverName: string, corpUserId: string, routes: string, departTimes: string, taskCount: number}>} drivers
 * @returns {Promise<{success: Array, failed: Array}>}
 */
async function notifyScheduleToDrivers(drivers) {
  const success = []
  const failed = []

  // 企业微信 textcard 消息格式限制：touser 最多 1000 个
  // 这里逐人发送，保证每个人都能收到个性化消息
  for (const d of drivers) {
    if (!d.corpUserId) {
      failed.push({ ...d, reason: '未绑定企业微信账号' })
      continue
    }

    const title = '📋 今日排班提醒'
    const description = `<div class="gray">${d.driverName}，您好！</div>
<div class="normal">您今天共有 <font color="warning">${d.taskCount}</font> 个排班任务</div>
<div class="highlight">行程：${d.routes}</div>
<div class="gray">出车时间：${d.departTimes}</div>
<div class="gray">请提前做好准备，注意行车安全。</div>`

    try {
      const result = await sendTextcard(d.corpUserId, title, description, '')
      if (result.sent) {
        success.push(d)
      } else {
        failed.push({ ...d, reason: result.errmsg })
      }
    } catch (e) {
      console.error(`通知 ${d.driverName}(${d.corpUserId}) 失败:`, e.message)
      failed.push({ ...d, reason: e.message })
    }
  }

  return { success, failed }
}

module.exports = { sendTextcard, notifyScheduleToDrivers, getAccessToken, WECHAT_CONFIG }
