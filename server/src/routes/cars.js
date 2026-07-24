const { Router } = require('express')
const { getDb } = require('../db')

const router = Router()

// ===== 获取车辆列表（含价格配置） =====
router.get('/list', (req, res) => {
  const db = getDb()
  const { fleetOrgId } = req.query

  // 获取可用车辆：如果指定了车队 orgId，只返回该车队的车辆（通过 org_id 关联）
  let carRows
  if (fleetOrgId) {
    carRows = db.prepare('SELECT * FROM cars WHERE status = ? AND org_id = ?').all('available', fleetOrgId)
  } else {
    carRows = db.prepare('SELECT * FROM cars WHERE status = ?').all('available')
  }

  const cars = carRows.map(r => ({
    id: r.id, name: r.name, seats: r.seats, model: r.model, capacity: r.capacity,
    tags: JSON.parse(r.tags), color: r.color, imageUrl: r.image_url,
    status: r.status, plate: r.plate_number, carModelId: r.car_model_id,
    hourlyPrice: r.hourly_price, dailyPrice: r.daily_price,
  }))

  // 获取所有启用的价格配置
  const prices = db.prepare('SELECT * FROM prices WHERE status = ?').all('active')

  // 按 package_type 分组，动态生成时长选项
  const hourlySet = new Map()
  const dailySet = new Map()

  for (const p of prices) {
    const key = p.duration
    const option = { label: p.duration, kmLimit: p.km_limit }
    if (p.package_type === 'hourly' && !hourlySet.has(key)) {
      option.sublabel = `含${p.km_limit}公里`
      hourlySet.set(key, option)
    }
    if (p.package_type === 'daily' && !dailySet.has(key)) {
      option.sublabel = `${p.km_limit}公里/天`
      dailySet.set(key, option)
    }
  }

  const hourlyDurations = [...hourlySet.values()]
  const dailyDurations = [...dailySet.values()]

  // 为每辆车挂载其价格详情（按 套餐类型_时长 为 key）
  const carsWithPrices = cars.map(car => {
    const priceMap = {}
    let minHourly = Infinity, minDaily = Infinity
    // 优先用 car_model_id 查车型名称，否则用车的 name
    const carModel = car.carModelId ? db.prepare('SELECT name FROM car_models WHERE id = ?').get(car.carModelId) : null
    const modelName = carModel ? carModel.name : car.name

    for (const p of prices) {
      // 匹配：car_model_id 相同，或 car_model_name 与车型名称/车名匹配
      const idMatch = p.car_model_id === car.carModelId
      const nameMatch = p.car_model_name === modelName || p.car_model_name === car.name
      if (!idMatch && !nameMatch) continue

      const key = `${p.package_type}_${p.duration}`
      priceMap[key] = {
        price: p.price,
        kmLimit: p.km_limit,
        overtimeRate: p.overtime_rate,
        overKmRate: p.over_km_rate,
        serviceFee: p.service_fee || 20,
      }
      if (p.package_type === 'hourly' && p.price < minHourly) minHourly = p.price
      if (p.package_type === 'daily' && p.price < minDaily) minDaily = p.price
    }

    // 如果 cars 表中没有价格（为 0），则从 prices 配置中取最低价
    const hourlyPrice = car.hourlyPrice || (minHourly !== Infinity ? minHourly : 0)
    const dailyPrice = car.dailyPrice || (minDaily !== Infinity ? minDaily : 0)

    return { ...car, hourlyPrice, dailyPrice, prices: priceMap }
  })

  res.json({ code: 200, message: 'ok', data: { cars: carsWithPrices, hourlyDurations, dailyDurations } })
})

// ===== 获取服务城市列表（用户端用，支持按车队过滤） =====
router.get('/cities', (req, res) => {
  const db = getDb()
  const { fleetOrgId } = req.query

  if (fleetOrgId) {
    // 根据车队org_id查找fleet_id，然后查询该车队可运营的城市
    const fleet = db.prepare('SELECT id FROM fleets WHERE org_id = ?').get(fleetOrgId)
    if (fleet) {
      const cities = db.prepare(`
        SELECT c.id, c.name FROM cities c
        INNER JOIN fleet_cities fc ON fc.city_id = c.id
        WHERE fc.fleet_id = ?
        ORDER BY c.sort_order, c.id
      `).all(fleet.id)
      return res.json({ code: 200, message: 'ok', data: cities })
    }
  }

  // 未指定车队或车队不存在时，返回全部城市
  const cities = db.prepare('SELECT id, name FROM cities ORDER BY sort_order, id').all()
  res.json({ code: 200, message: 'ok', data: cities })
})

module.exports = router
