/**
 * 订单相关的公共工具函数
 */

const pad = (n) => String(n).padStart(2, '0')

/** 当前本地时间字符串 "YYYY-MM-DD HH:MM" */
function nowLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 解析中文套餐时长，返回小时数。如 "4小时"→4, "1天"→24, "2天"→48 */
function parseDurationHours(durationStr) {
  if (!durationStr) return 0
  const dayMatch = durationStr.match(/(\d+)\s*天/)
  const hourMatch = durationStr.match(/(\d+)\s*小时/)
  let hours = 0
  if (dayMatch) hours += parseInt(dayMatch[1], 10) * 24
  if (hourMatch) hours += parseInt(hourMatch[1], 10)
  return hours
}

/** 将 "YYYY-MM-DD HH:MM" 字符串转换为 Date；支持 "今天 HH:MM" 这种相对写法 */
function parseTime(str) {
  if (!str) return null
  let s = str.replace(' ', 'T')
  if (s.includes('今天')) {
    const d = new Date()
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    s = s.replace('今天', date)
  }
  const date = new Date(s + ':00')
  return isNaN(date.getTime()) ? null : date
}

/** 将 Date 格式化为 "YYYY-MM-DD HH:MM" */
function formatTime(date) {
  if (!date || isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 计算结束时间 = depart_time + duration */
function calcEndTime(departTimeStr, durationStr) {
  const depart = parseTime(departTimeStr)
  if (!depart) return null
  const hours = parseDurationHours(durationStr)
  if (hours <= 0) return null
  depart.setHours(depart.getHours() + hours)
  return isNaN(depart.getTime()) ? null : depart
}


/** 格式化套餐时长为显示用字符串（如 "4小时", "1天"） */
function formatDurationStr(durationStr) {
  const hours = parseDurationHours(durationStr)
  if (hours <= 0) return durationStr || ''
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}天`
  return `${hours}小时`
}

module.exports = {
  pad, nowLocal, parseDurationHours, parseTime, formatTime, calcEndTime, formatDurationStr
}
