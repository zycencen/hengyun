const Database = require('better-sqlite3')
const path = require('path')
const { calcEndTime, formatTime, formatDurationStr } = require('./utils')


const DB_PATH = path.join(__dirname, '..', 'data.db')

let db

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = DELETE')
    db.pragma('foreign_keys = ON')
    initSchema()
    seedCarModels()
    seedPrices()
    seedCities()
    migrateCarsCarModelId()
    migrateStatusDimensions()
    migrateOrderEndTime()
    migrateDriverCarId()
    migrateDriverCorpUserId()
    migrateUserType()
    migrateOrderPriceExtras()
    migrateDemandStatus()
    migrateOrderBusinessType()
    migrateOrderSettlement()
    migrateScheduleStatus()


  }
  return db
}


function initSchema() {
  // 迁移：订单多维度状态字段（订单类型/支付状态/接单状态/调度状态）
  try { db.exec(`ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT '普通用户订单'`); console.log('✅ 迁移 orders: 已添加 order_type 列') } catch (_) { /* 该列已存在 */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT '未支付'`); console.log('✅ 迁移 orders: 已添加 payment_status 列') } catch (_) { /* 该列已存在 */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN accept_status TEXT NOT NULL DEFAULT '未接单'`); console.log('✅ 迁移 orders: 已添加 accept_status 列') } catch (_) { /* 该列已存在 */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN dispatch_status TEXT NOT NULL DEFAULT '未派车'`); console.log('✅ 迁移 orders: 已添加 dispatch_status 列') } catch (_) { /* 该列已存在 */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN business_type TEXT NOT NULL DEFAULT 'charter'`); console.log('✅ 迁移 orders: 已添加 business_type 列') } catch (_) { /* 该列已存在 */ }

  // 迁移：为旧 orders 表补充 customer_name / customer_phone 列

  try { db.exec(`ALTER TABLE orders ADD COLUMN customer_name TEXT NOT NULL DEFAULT ''`); console.log('✅ 迁移 orders: 已添加 customer_name 列') } catch (_) { /* 该列已存在 */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN customer_phone TEXT NOT NULL DEFAULT ''`); console.log('✅ 迁移 orders: 已添加 customer_phone 列') } catch (_) { /* 该列已存在 */ }

  // 迁移：为旧 contracts 表补充政府合同同步字段
  const contractColumns = [
    { name: 'party_a', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'party_b', def: "TEXT NOT NULL DEFAULT '恒运出行科技有限公司'" },
    { name: 'origin', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'destination', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'plate_no', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'driver_name', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'start_date', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'end_date', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'filing_create_time', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'order_no', def: "TEXT NOT NULL DEFAULT ''" },
    { name: 'fleet', def: "TEXT NOT NULL DEFAULT ''" },
  ]
  for (const col of contractColumns) {
    try { db.exec(`ALTER TABLE contracts ADD COLUMN ${col.name} ${col.def}`); console.log(`✅ 迁移 contracts: 已添加 ${col.name} 列`) } catch (_) { /* 该列已存在 */ }
  }

  // 迁移：车辆表添加 car_model_id 列
  try { db.exec(`ALTER TABLE cars ADD COLUMN car_model_id TEXT NOT NULL DEFAULT ''`); console.log('✅ 迁移 cars: 已添加 car_model_id 列') } catch (_) { /* 该列已存在 */ }

  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      avatar TEXT,
      is_vip INTEGER NOT NULL DEFAULT 0,
      is_enterprise_verified INTEGER NOT NULL DEFAULT 0,
      user_type TEXT NOT NULL DEFAULT '普通用户',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 车辆表
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      seats TEXT NOT NULL,
      model TEXT NOT NULL,
      capacity TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      hourly_price REAL NOT NULL DEFAULT 0,
      daily_price REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#1E3A8A',
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      plate_number TEXT NOT NULL DEFAULT '',
      car_model_id TEXT NOT NULL DEFAULT ''
    );

    -- 订单表
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      route TEXT NOT NULL DEFAULT '',
      depart_city TEXT NOT NULL DEFAULT '',
      order_time TEXT NOT NULL DEFAULT '',
      depart_time TEXT NOT NULL DEFAULT '',
      end_time TEXT,
      trip_duration TEXT,
      package_type TEXT NOT NULL DEFAULT 'hourly',
      duration TEXT NOT NULL DEFAULT '4小时',
      car_name TEXT NOT NULL DEFAULT '',
      car_model TEXT NOT NULL DEFAULT '',
      seats TEXT NOT NULL DEFAULT '5座',
      amount REAL NOT NULL DEFAULT 0,
      service_fee REAL NOT NULL DEFAULT 20,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '未支付',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      customer_name TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      driver_name TEXT,
      driver_phone TEXT,
      contract_id TEXT,
      order_type TEXT NOT NULL DEFAULT '普通用户订单',
      payment_status TEXT NOT NULL DEFAULT '未支付',
      accept_status TEXT NOT NULL DEFAULT '未接单',
      dispatch_status TEXT NOT NULL DEFAULT '未派车',
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 评价表
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      stars INTEGER NOT NULL DEFAULT 5,
      content TEXT NOT NULL DEFAULT '',
      driver_name TEXT NOT NULL DEFAULT '',
      reply TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT (date('now','localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 发票表
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL DEFAULT (date('now','localtime'))
    );

    -- 通勤车申请表
    CREATE TABLE IF NOT EXISTS commute_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      company TEXT NOT NULL,
      city TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 定制包车需求表
    CREATE TABLE IF NOT EXISTS custom_charter_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      demand TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 司机表
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      avatar TEXT,
      license_no TEXT NOT NULL,
      vehicle_plate TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      rating REAL NOT NULL DEFAULT 5.0,
      order_count INTEGER NOT NULL DEFAULT 0,
      join_date TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT ''
    );

    -- 合同模板表
    CREATE TABLE IF NOT EXISTS contract_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (date('now','localtime'))
    );

    -- 合同表（政府网站同步合同）
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      contract_no TEXT NOT NULL UNIQUE,
      party_a TEXT NOT NULL DEFAULT '',
      party_b TEXT NOT NULL DEFAULT '恒运出行科技有限公司',
      origin TEXT NOT NULL DEFAULT '',
      destination TEXT NOT NULL DEFAULT '',
      plate_no TEXT NOT NULL DEFAULT '',
      driver_name TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '履行中',
      filing_create_time TEXT NOT NULL DEFAULT '',
      order_no TEXT NOT NULL DEFAULT '',
      fleet TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (date('now','localtime'))
    );

    -- 车型配置表
    CREATE TABLE IF NOT EXISTS car_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      seats INTEGER NOT NULL DEFAULT 5,
      category TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );

    -- 价格配置表
    CREATE TABLE IF NOT EXISTS prices (
      id TEXT PRIMARY KEY,
      car_model_id TEXT NOT NULL,
      car_model_name TEXT NOT NULL,
      package_type TEXT NOT NULL,
      duration TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      km_limit INTEGER NOT NULL DEFAULT 50,
      overtime_rate REAL NOT NULL DEFAULT 60,
      over_km_rate REAL NOT NULL DEFAULT 4,
      service_fee REAL NOT NULL DEFAULT 20,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (car_model_id) REFERENCES car_models(id)
    );

    -- 调度任务表
    CREATE TABLE IF NOT EXISTS dispatch_tasks (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL,
      route TEXT NOT NULL DEFAULT '',
      depart_time TEXT NOT NULL DEFAULT '',
      car_type TEXT NOT NULL DEFAULT '',
      driver_id TEXT,
      driver_name TEXT,
      vehicle_plate TEXT,
      contract_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 调度排班记录表
    CREATE TABLE IF NOT EXISTS dispatch_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      charter_contract TEXT DEFAULT '',
      fleet TEXT DEFAULT '',
      charter_type TEXT DEFAULT '',
      plate_number TEXT DEFAULT '',
      depart_time TEXT DEFAULT '',
      passenger_count INTEGER DEFAULT 0,
      unit TEXT DEFAULT '',
      driver TEXT DEFAULT '',
      route TEXT DEFAULT '',
      vehicle_status TEXT DEFAULT '',
      dispatcher TEXT DEFAULT '',
      kilometers REAL DEFAULT 0,
      return_time TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      order_no TEXT DEFAULT '',
      org_id TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 排班通知记录表
    CREATE TABLE IF NOT EXISTS dispatch_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notify_date TEXT NOT NULL,
      schedule_date TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      task_count INTEGER DEFAULT 0,
      routes TEXT DEFAULT '',
      depart_times TEXT DEFAULT '',
      result TEXT DEFAULT 'sent',
      created_by TEXT DEFAULT '',
      org_id TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 管理员用户表
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL DEFAULT '123456',
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (date('now','localtime'))
    );

    -- SMS 验证码表（开发环境，生产应使用 Redis）
    CREATE TABLE IF NOT EXISTS sms_codes (
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    -- 仪表盘缓存表
    CREATE TABLE IF NOT EXISTS dashboard_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 组织架构表
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL,
      path TEXT NOT NULL DEFAULT '',
      level INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 角色表
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      is_system INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 角色权限表
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_key),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );

    -- 车队信息表（管理对外用户端入口与订单归属）
    CREATE TABLE IF NOT EXISTS fleets (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL UNIQUE,
      parent_org_id TEXT,
      name TEXT NOT NULL,
      leader_name TEXT NOT NULL DEFAULT '',
      leader_phone TEXT NOT NULL DEFAULT '',
      service_enabled INTEGER NOT NULL DEFAULT 1,
      entry_enabled INTEGER NOT NULL DEFAULT 1,
      entry_config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 城市管理表（服务城市配置）
    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- 车队-城市关联表（每个车队可运营的城市集合）
    CREATE TABLE IF NOT EXISTS fleet_cities (
      fleet_id TEXT NOT NULL,
      city_id INTEGER NOT NULL,
      PRIMARY KEY (fleet_id, city_id),
      FOREIGN KEY (fleet_id) REFERENCES fleets(id) ON DELETE CASCADE,
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
    );

    -- 上下班班次配置表（用于自动排班生成）
    CREATE TABLE IF NOT EXISTS commute_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      route TEXT NOT NULL,
      order_no TEXT NOT NULL DEFAULT '',
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      schedule_mode TEXT NOT NULL DEFAULT 'weekly',
      schedule_days TEXT NOT NULL DEFAULT '[]',
      monthly_days TEXT NOT NULL DEFAULT '[]',
      vehicle_type TEXT NOT NULL DEFAULT '大巴',
      seat_count INTEGER NOT NULL DEFAULT 45,
      status TEXT NOT NULL DEFAULT 'active',
      active_from TEXT NOT NULL DEFAULT '',
      active_to TEXT NOT NULL DEFAULT '',
      org_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `)

  // 迁移：commute_shifts 添加 driver_id（预设司机）
  try { db.exec(`ALTER TABLE commute_shifts ADD COLUMN driver_id TEXT DEFAULT NULL`); console.log('✅ 迁移 commute_shifts: 已添加 driver_id 列') } catch (_) { /* 已存在 */ }

  // 迁移：为核心业务表添加 fleet_id 字段（用于车队入口直接归属）
  try { db.exec(`ALTER TABLE orders ADD COLUMN fleet_id TEXT DEFAULT NULL`); console.log('✅ 迁移 orders: 已添加 fleet_id 列') } catch (_) { /* 已存在 */ }

  // 迁移：fleets 表添加 logo 字段（车队 LOGO）
  try { db.exec(`ALTER TABLE fleets ADD COLUMN logo TEXT DEFAULT ''`); console.log('✅ 迁移 fleets: 已添加 logo 列') } catch (_) { /* 已存在 */ }


  // 迁移：admin_users 添加 org_id
  try { db.exec(`ALTER TABLE admin_users ADD COLUMN org_id TEXT DEFAULT NULL`); console.log('✅ 迁移 admin_users: 已添加 org_id 列') } catch (_) { /* 已存在 */ }

  // 迁移：数据隔离 - 为核心业务表添加 org_id 字段
  const orgIdTables = ['orders', 'cars', 'drivers', 'users', 'contracts', 'dispatch_tasks',
    'commute_applications', 'custom_charter_requests', 'reviews', 'invoices',
    'car_models', 'prices', 'contract_templates']
  for (const tbl of orgIdTables) {
    try { db.exec(`ALTER TABLE ${tbl} ADD COLUMN org_id TEXT DEFAULT NULL`); console.log(`✅ 迁移 ${tbl}: 已添加 org_id 列`) } catch (_) { /* 已存在 */ }
  }

  // 迁移：invoices 表扩展 — 合并开票、发票类型、抬头、税号、邮箱、状态
  try { db.exec(`ALTER TABLE invoices ADD COLUMN order_ids TEXT DEFAULT '[]'`); console.log('✅ 迁移 invoices: 已添加 order_ids 列') } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT '个人'`); console.log('✅ 迁移 invoices: 已添加 invoice_type 列') } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN tax_id TEXT DEFAULT ''`); console.log('✅ 迁移 invoices: 已添加 tax_id 列') } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN email TEXT DEFAULT ''`); console.log('✅ 迁移 invoices: 已添加 email 列') } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT '已申请'`); console.log('✅ 迁移 invoices: 已添加 status 列') } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN applied_at TEXT DEFAULT ''`); console.log('✅ 迁移 invoices: 已添加 applied_at 列') } catch (_) {}

  // 迁移：为 prices 表添加 service_fee 字段
  try { db.exec('ALTER TABLE prices ADD COLUMN service_fee REAL NOT NULL DEFAULT 20'); console.log('✅ 迁移: prices 已添加 service_fee 列') } catch (_) { /* 已存在 */ }

  // 迁移：将所有未分配组织的业务数据默认关联到"恒运"
  try {
    const hengyun = db.prepare("SELECT id FROM organizations WHERE name = ? AND parent_id IS NULL LIMIT 1").get('恒运')
    if (hengyun) {
      const allOrgIdTables = [...orgIdTables, 'admin_users']
      for (const tbl of allOrgIdTables) {
        try {
          const result = db.prepare(`UPDATE ${tbl} SET org_id = ? WHERE org_id IS NULL`).run(hengyun.id)
          if (result.changes > 0) console.log(`✅ 迁移 ${tbl}: ${result.changes} 条数据已关联恒运组织`)
        } catch (_) { /* 该表可能尚无数据 */ }
      }
    }
  } catch (_) { /* 迁移失败不影响启动 */ }

  // 迁移：用户多组织关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_orgs (
      user_id INTEGER NOT NULL,
      org_id TEXT NOT NULL,
      PRIMARY KEY (user_id, org_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
    )
  `)
  // 将现有用户的单组织 org_id 迁移到 user_orgs 表
  try {
    const usersWithOrg = db.prepare('SELECT id, org_id FROM users WHERE org_id IS NOT NULL').all()
    const insertStmt = db.prepare('INSERT OR IGNORE INTO user_orgs (user_id, org_id) VALUES (?, ?)')
    for (const u of usersWithOrg) {
      insertStmt.run(u.id, u.org_id)
    }
    if (usersWithOrg.length > 0) console.log(`✅ 迁移 user_orgs: 已将 ${usersWithOrg.length} 个用户的组织关联同步到多对多表`)
  } catch (_) { /* 迁移失败不影响启动 */ }

  seedFleets()
  migrateFleetCities()
  seedCommuteShifts()
}

function seedCarModels() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM car_models').get()
  if (count.cnt > 0) return
  const models = [
    { id: 'economy-5', name: '经济型 5座', brand: '大众', model: '帕萨特', seats: 5, category: '经济型', tags: '["舒适","经济实惠"]' },
    { id: 'comfort-7', name: '舒适型 7座', brand: '别克', model: 'GL8', seats: 7, category: '舒适型', tags: '["商务","空间宽敞"]' },
    { id: 'business-7', name: '商务型 7座', brand: '丰田', model: '埃尔法', seats: 7, category: '商务型', tags: '["豪华","尊享体验"]' },
    { id: 'luxury-19', name: '豪华型 19座', brand: '丰田', model: '考斯特', seats: 19, category: '豪华型', tags: '["团体","大型客车"]' },
  ]
  const stmt = db.prepare('INSERT INTO car_models (id, name, brand, model, seats, category, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
  for (const m of models) {
    stmt.run(m.id, m.name, m.brand, m.model, m.seats, m.category, m.tags)
  }
  console.log(`✅ 已插入 ${models.length} 条默认车型配置`)
}

/** 种子价格配置数据 */
function seedPrices() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM prices').get()
  if (count.cnt > 0) return
  const prices = [
    // 经济型 5座
    { id: 'P001', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'hourly', duration: '4小时', price: 280, km_limit: 50, overtime_rate: 60, over_km_rate: 4, service_fee: 20 },
    { id: 'P002', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'hourly', duration: '6小时', price: 380, km_limit: 80, overtime_rate: 60, over_km_rate: 4, service_fee: 20 },
    { id: 'P003', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'hourly', duration: '8小时', price: 480, km_limit: 100, overtime_rate: 60, over_km_rate: 4, service_fee: 20 },
    { id: 'P004', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'hourly', duration: '12小时', price: 680, km_limit: 150, overtime_rate: 60, over_km_rate: 4, service_fee: 20 },
    { id: 'P005', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'daily', duration: '1天', price: 800, km_limit: 200, overtime_rate: 80, over_km_rate: 4, service_fee: 20 },
    { id: 'P006', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'daily', duration: '2天', price: 1500, km_limit: 360, overtime_rate: 80, over_km_rate: 4, service_fee: 20 },
    { id: 'P007', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'daily', duration: '3天', price: 2100, km_limit: 450, overtime_rate: 80, over_km_rate: 4, service_fee: 20 },
    { id: 'P008', car_model_id: 'economy-5', car_model_name: '经济型 5座', package_type: 'daily', duration: '7天', price: 4500, km_limit: 840, overtime_rate: 80, over_km_rate: 4, service_fee: 20 },
    // 舒适型 7座
    { id: 'P009', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'hourly', duration: '4小时', price: 380, km_limit: 50, overtime_rate: 80, over_km_rate: 5, service_fee: 30 },
    { id: 'P010', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'hourly', duration: '6小时', price: 500, km_limit: 80, overtime_rate: 80, over_km_rate: 5, service_fee: 30 },
    { id: 'P011', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'hourly', duration: '8小时', price: 620, km_limit: 100, overtime_rate: 80, over_km_rate: 5, service_fee: 30 },
    { id: 'P012', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'hourly', duration: '12小时', price: 880, km_limit: 150, overtime_rate: 80, over_km_rate: 5, service_fee: 30 },
    { id: 'P013', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'daily', duration: '1天', price: 1200, km_limit: 200, overtime_rate: 100, over_km_rate: 5, service_fee: 30 },
    { id: 'P014', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'daily', duration: '2天', price: 2200, km_limit: 360, overtime_rate: 100, over_km_rate: 5, service_fee: 30 },
    { id: 'P015', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'daily', duration: '3天', price: 3100, km_limit: 450, overtime_rate: 100, over_km_rate: 5, service_fee: 30 },
    { id: 'P016', car_model_id: 'comfort-7', car_model_name: '舒适型 7座', package_type: 'daily', duration: '7天', price: 6800, km_limit: 840, overtime_rate: 100, over_km_rate: 5, service_fee: 30 },
    // 商务型 7座
    { id: 'P017', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'hourly', duration: '4小时', price: 580, km_limit: 50, overtime_rate: 100, over_km_rate: 6, service_fee: 40 },
    { id: 'P018', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'hourly', duration: '6小时', price: 750, km_limit: 80, overtime_rate: 100, over_km_rate: 6, service_fee: 40 },
    { id: 'P019', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'hourly', duration: '8小时', price: 920, km_limit: 100, overtime_rate: 100, over_km_rate: 6, service_fee: 40 },
    { id: 'P020', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'hourly', duration: '12小时', price: 1280, km_limit: 150, overtime_rate: 100, over_km_rate: 6, service_fee: 40 },
    { id: 'P021', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'daily', duration: '1天', price: 1800, km_limit: 200, overtime_rate: 120, over_km_rate: 6, service_fee: 40 },
    { id: 'P022', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'daily', duration: '2天', price: 3300, km_limit: 360, overtime_rate: 120, over_km_rate: 6, service_fee: 40 },
    { id: 'P023', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'daily', duration: '3天', price: 4600, km_limit: 450, overtime_rate: 120, over_km_rate: 6, service_fee: 40 },
    { id: 'P024', car_model_id: 'business-7', car_model_name: '商务型 7座', package_type: 'daily', duration: '7天', price: 9800, km_limit: 840, overtime_rate: 120, over_km_rate: 6, service_fee: 40 },
    // 豪华型 19座
    { id: 'P025', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'hourly', duration: '4小时', price: 880, km_limit: 50, overtime_rate: 150, over_km_rate: 8, service_fee: 60 },
    { id: 'P026', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'hourly', duration: '6小时', price: 1100, km_limit: 80, overtime_rate: 150, over_km_rate: 8, service_fee: 60 },
    { id: 'P027', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'hourly', duration: '8小时', price: 1350, km_limit: 100, overtime_rate: 150, over_km_rate: 8, service_fee: 60 },
    { id: 'P028', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'hourly', duration: '12小时', price: 1880, km_limit: 150, overtime_rate: 150, over_km_rate: 8, service_fee: 60 },
    { id: 'P029', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'daily', duration: '1天', price: 2800, km_limit: 200, overtime_rate: 180, over_km_rate: 8, service_fee: 60 },
    { id: 'P030', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'daily', duration: '2天', price: 5000, km_limit: 360, overtime_rate: 180, over_km_rate: 8, service_fee: 60 },
    { id: 'P031', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'daily', duration: '3天', price: 7000, km_limit: 450, overtime_rate: 180, over_km_rate: 8, service_fee: 60 },
    { id: 'P032', car_model_id: 'luxury-19', car_model_name: '豪华型 19座', package_type: 'daily', duration: '7天', price: 15000, km_limit: 840, overtime_rate: 180, over_km_rate: 8, service_fee: 60 },
  ]
  const stmt = db.prepare('INSERT INTO prices (id, car_model_id, car_model_name, package_type, duration, price, km_limit, overtime_rate, over_km_rate, service_fee, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  for (const p of prices) {
    stmt.run(p.id, p.car_model_id, p.car_model_name, p.package_type, p.duration, p.price, p.km_limit, p.overtime_rate, p.over_km_rate, p.service_fee, 'active')
  }
  console.log(`✅ 已插入 ${prices.length} 条默认价格配置`)
}

/** 种子城市数据 */
function seedCities() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM cities').get()
  if (count.cnt > 0) return
  const cities = [
    '广州', '深圳', '珠海', '佛山', '东莞', '惠州', '中山', '江门', '肇庆',
    '北京', '上海', '杭州', '南京', '成都', '重庆', '武汉', '长沙', '西安', '郑州', '厦门', '三亚'
  ]
  const stmt = db.prepare('INSERT INTO cities (name, sort_order) VALUES (?, ?)')
  cities.forEach((name, idx) => stmt.run(name, idx))
  console.log(`✅ 已插入 ${cities.length} 条默认城市配置`)
}

/** 将 cars 表的 car_model_id 与 car_models 关联 */
function migrateCarsCarModelId() {
  const mapping = [
    { name: '经济型 5座', modelId: 'economy-5' },
    { name: '舒适型 7座', modelId: 'comfort-7' },
    { name: '商务型 7座', modelId: 'business-7' },
    { name: '豪华型 19座', modelId: 'luxury-19' },
  ]
  let updated = 0
  for (const m of mapping) {
    const result = db.prepare("UPDATE cars SET car_model_id = ? WHERE name = ? AND (car_model_id IS NULL OR car_model_id = '')").run(m.modelId, m.name)
    updated += result.changes
  }
  if (updated > 0) console.log(`✅ 迁移 cars: 已为 ${updated} 辆车关联车型ID`)
}

/** 为 users 表添加 user_type 列 */
function migrateUserType() {
  try { db.exec(`ALTER TABLE users ADD COLUMN user_type TEXT NOT NULL DEFAULT '普通用户'`); console.log('✅ 迁移 users: 已添加 user_type 列') } catch (_) { /* 已存在 */ }
}

/** 为 orders 表添加价格配置冗余字段 */
function migrateOrderPriceExtras() {
  try { db.exec(`ALTER TABLE orders ADD COLUMN km_limit INTEGER NOT NULL DEFAULT 0`); console.log('✅ 迁移 orders: 已添加 km_limit 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN overtime_rate REAL NOT NULL DEFAULT 0`); console.log('✅ 迁移 orders: 已添加 overtime_rate 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN over_km_rate REAL NOT NULL DEFAULT 0`); console.log('✅ 迁移 orders: 已添加 over_km_rate 列') } catch (_) { }
}

/** 为通勤/定制需求表添加 status 和 admin_note 列 */
function migrateDemandStatus() {
  try { db.exec(`ALTER TABLE commute_applications ADD COLUMN status TEXT NOT NULL DEFAULT '待处理'`); console.log('✅ 迁移 commute_applications: 已添加 status 列') } catch (_) { }
  try { db.exec(`ALTER TABLE commute_applications ADD COLUMN admin_note TEXT NOT NULL DEFAULT ''`); console.log('✅ 迁移 commute_applications: 已添加 admin_note 列') } catch (_) { }
  try { db.exec(`ALTER TABLE custom_charter_requests ADD COLUMN status TEXT NOT NULL DEFAULT '待处理'`); console.log('✅ 迁移 custom_charter_requests: 已添加 status 列') } catch (_) { }
  try { db.exec(`ALTER TABLE custom_charter_requests ADD COLUMN admin_note TEXT NOT NULL DEFAULT ''`); console.log('✅ 迁移 custom_charter_requests: 已添加 admin_note 列') } catch (_) { }
}

function migrateOrderBusinessType() {
  try { db.exec(`ALTER TABLE orders ADD COLUMN business_type TEXT NOT NULL DEFAULT 'charter'`); console.log('✅ 迁移 orders: 已添加 business_type 列') } catch (_) { }
}

/** 为 orders 表添加结算相关字段（定金/已付/尾款/用车次数/结账状态/创建来源/备注） */
function migrateOrderSettlement() {
  try { db.exec(`ALTER TABLE orders ADD COLUMN deposit REAL NOT NULL DEFAULT 0`); console.log('✅ 迁移 orders: 已添加 deposit 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0`); console.log('✅ 迁移 orders: 已添加 paid_amount 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN balance_amount REAL NOT NULL DEFAULT 0`); console.log('✅ 迁移 orders: 已添加 balance_amount 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN ride_count INTEGER NOT NULL DEFAULT 1`); console.log('✅ 迁移 orders: 已添加 ride_count 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN settlement TEXT NOT NULL DEFAULT 'none'`); console.log('✅ 迁移 orders: 已添加 settlement 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN created_by TEXT NOT NULL DEFAULT 'user'`); console.log('✅ 迁移 orders: 已添加 created_by 列') } catch (_) { }
  try { db.exec(`ALTER TABLE orders ADD COLUMN remark TEXT NOT NULL DEFAULT ''`); console.log('✅ 迁移 orders: 已添加 remark 列') } catch (_) { }
}

function migrateDriverCarId() {
  try { db.exec(`ALTER TABLE drivers ADD COLUMN car_id INTEGER REFERENCES cars(id)`); console.log('✅ 迁移 drivers: 已添加 car_id 列') } catch (_) { /* 已存在 */ }
}

function migrateDriverCorpUserId() {
  try { db.exec(`ALTER TABLE drivers ADD COLUMN corp_userid TEXT DEFAULT ''`); console.log('✅ 迁移 drivers: 已添加 corp_userid 列') } catch (_) { /* 已存在 */ }
}

function migrateScheduleStatus() {
  try { db.exec(`ALTER TABLE dispatch_schedules ADD COLUMN status TEXT DEFAULT '待确认'`); console.log('✅ 迁移 dispatch_schedules: 已添加 status 列') } catch (_) { /* 已存在 */ }
  try { db.exec(`ALTER TABLE dispatch_schedules ADD COLUMN notify_status TEXT DEFAULT '未通知'`); console.log('✅ 迁移 dispatch_schedules: 已添加 notify_status 列') } catch (_) { /* 已存在 */ }
  try { db.exec(`ALTER TABLE dispatch_schedules ADD COLUMN order_no TEXT DEFAULT ''`); console.log('✅ 迁移 dispatch_schedules: 已添加 order_no 列') } catch (_) { /* 已存在 */ }
  try { db.exec(`ALTER TABLE dispatch_schedules ADD COLUMN schedule_type TEXT DEFAULT 'commute'`); console.log('✅ 迁移 dispatch_schedules: 已添加 schedule_type 列') } catch (_) { /* 已存在 */ }
}

/** 初始化默认车队信息 */
function seedFleets() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM fleets').get()
  if (count.cnt > 0) return

  // 动态查找父组织（根组织）
  const rootOrg = db.prepare("SELECT id FROM organizations WHERE parent_id IS NULL LIMIT 1").get()
  if (!rootOrg) {
    console.log('⚠ 跳过车队种子数据：未找到根组织')
    return
  }
  const parentOrgId = rootOrg.id

  // 动态查找或创建车队子组织
  const fleetOrgs = db.prepare("SELECT id, name FROM organizations WHERE parent_id = ? ORDER BY sort_order, created_at LIMIT 2").all(parentOrgId)
  const fleets = [
    { id: 'F001', orgIdx: 0, name: '第一车队', leaderName: '王建国', leaderPhone: '138****1001' },
    { id: 'F002', orgIdx: 1, name: '第二车队', leaderName: '李志强', leaderPhone: '138****1002' },
  ]

  const defaultConfig = { home: true, order: true, orderList: true, profile: true, invoice: true, reviews: true, settings: true, showCharter: true, showCommute: true, showCustom: true, bannerTitle: '', bannerSubtitle: '' }
  const stmt = db.prepare('INSERT INTO fleets (id, org_id, name, leader_name, leader_phone, service_enabled, entry_enabled, entry_config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  let inserted = 0
  for (const f of fleets) {
    const org = fleetOrgs[f.orgIdx]
    if (!org) continue
    stmt.run(f.id, org.id, f.name, f.leaderName, f.leaderPhone, 1, 1, JSON.stringify(defaultConfig))
    inserted++
  }
  console.log(`✅ 已插入 ${inserted} 条默认车队配置`)
}

/** 迁移：将为已有车队关联所有现有城市 */
function migrateFleetCities() {
  // 检查 fleet_cities 是否已有数据
  const existingCount = db.prepare('SELECT COUNT(*) AS cnt FROM fleet_cities').get()
  if (existingCount.cnt > 0) return

  const fleets = db.prepare('SELECT id, org_id, name FROM fleets').all()
  const cities = db.prepare('SELECT id, name FROM cities').all()

  if (fleets.length === 0 || cities.length === 0) return

  const stmt = db.prepare('INSERT OR IGNORE INTO fleet_cities (fleet_id, city_id) VALUES (?, ?)')
  let inserted = 0
  for (const fleet of fleets) {
    for (const city of cities) {
      stmt.run(fleet.id, city.id)
      inserted++
    }
  }
  console.log(`✅ 迁移 fleet_cities: 已为 ${fleets.length} 个车队各关联 ${cities.length} 个城市(${inserted}条)`)
}

function migrateStatusDimensions() {
  const statusMap = {
    '未支付': { status: '待付款', payment_status: '未支付', accept_status: '未接单', dispatch_status: '未派车' },
    '已支付': { status: '待接单', payment_status: '已支付', accept_status: '未接单', dispatch_status: '未派车' },
    '已接单': { status: '待派车', payment_status: '已支付', accept_status: '已接单', dispatch_status: '未派车' },
    '已派车': { status: '进行中', payment_status: '已支付', accept_status: '已接单', dispatch_status: '已派车' },
    '进行中': { status: '进行中', payment_status: '已支付', accept_status: '已接单', dispatch_status: '已派车' },
    '已完成': { status: '已完成', payment_status: '已支付', accept_status: '已接单', dispatch_status: '已完成' },
    '已取消': { status: '已取消', payment_status: '已退款', accept_status: '未接单', dispatch_status: '未派车' },
    '退款中': { status: '已取消', payment_status: '已退款', accept_status: '未接单', dispatch_status: '未派车' },
  }
  const stmt = db.prepare(`UPDATE orders SET status = ?, payment_status = ?, accept_status = ?, dispatch_status = ? WHERE status = ?`)
  let migrated = 0
  for (const [oldStatus, newState] of Object.entries(statusMap)) {
    const result = stmt.run(newState.status, newState.payment_status, newState.accept_status, newState.dispatch_status, oldStatus)
    migrated += result.changes
  }
  if (migrated > 0) console.log(`✅ 迁移 orders: 已将 ${migrated} 条旧状态订单转换为多维度状态`)
}

/** 为旧订单补填结束时间和用车时长 */
function migrateOrderEndTime() {
  const rows = db.prepare(`
    SELECT id, depart_time, duration, end_time, trip_duration
    FROM orders
    WHERE end_time IS NULL OR end_time = '' OR trip_duration IS NULL OR trip_duration = ''
  `).all()

  let endCount = 0
  let tripCount = 0
  const updateEnd = db.prepare('UPDATE orders SET end_time = ? WHERE id = ?')
  const updateTrip = db.prepare('UPDATE orders SET trip_duration = ? WHERE id = ?')

  for (const row of rows) {
    if (!row.trip_duration) {
      updateTrip.run(formatDurationStr(row.duration), row.id)
      tripCount++
    }
    if (!row.end_time) {
      const endTime = calcEndTime(row.depart_time, row.duration)
      if (endTime) {
        updateEnd.run(formatTime(endTime), row.id)
        endCount++
      }
    }
  }

  if (endCount > 0 || tripCount > 0) {
    console.log(`✅ 迁移 orders: 已补填 ${endCount} 条结束时间、${tripCount} 条用车时长`)
  }
}


/** 种子上下班班次配置数据（仅首次初始化时插入，防止覆盖用户数据） */
function seedCommuteShifts() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM commute_shifts').get()
  if (count.cnt > 0) return

  // 检测是否已有调度记录 — 如果有说明班次数据曾存在但被意外清空，此时不应自动覆盖
  let hasSchedules = false
  try {
    const sc = db.prepare('SELECT COUNT(*) AS cnt FROM dispatch_schedules').get()
    hasSchedules = sc.cnt > 0
  } catch (_) { /* dispatch_schedules 可能尚未创建 */ }

  if (hasSchedules) {
    console.warn('⚠️ commute_shifts 为空但已有 dispatch_schedules 记录，跳过自动种子以防止覆盖用户数据。如需重置请手动删除 dispatch_schedules 后重启。')
    return
  }

  const shifts = [
    // ===== 早班 (工作日) =====
    { name: '早班-南山线', route: '南山中心 → 科技园 → 福田CBD', orderNo: 'HY20260701001', departureTime: '07:20', arrivalTime: '08:20', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 50, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D001' },
    { name: '早班-宝安线', route: '宝安中心 → 南山科技园', orderNo: 'HY20260701002', departureTime: '07:00', arrivalTime: '08:00', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 45, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D003' },
    { name: '早班-龙华线', route: '龙华民治 → 福田会展中心', orderNo: 'HY20260701003', departureTime: '07:10', arrivalTime: '08:10', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 45, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D005' },
    { name: '早班-罗湖线', route: '罗湖国贸 → 南山科技园', orderNo: 'HY20260701004', departureTime: '07:30', arrivalTime: '08:40', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '中巴', seatCount: 30, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D007' },
    { name: '早班-龙岗线', route: '龙岗中心城 → 福田CBD', orderNo: 'HY20260701005', departureTime: '06:50', arrivalTime: '08:30', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 50, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D002' },
    // ===== 晚班 (工作日) =====
    { name: '晚班-南山线', route: '福田CBD → 科技园 → 南山中心', orderNo: 'HY20260701006', departureTime: '18:00', arrivalTime: '19:10', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 50, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D001' },
    { name: '晚班-宝安线', route: '南山科技园 → 宝安中心', orderNo: 'HY20260701007', departureTime: '18:00', arrivalTime: '19:00', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 45, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D003' },
    { name: '晚班-龙华线', route: '福田会展中心 → 龙华民治', orderNo: 'HY20260701008', departureTime: '17:30', arrivalTime: '18:30', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 45, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D005' },
    { name: '晚班-罗湖线', route: '南山科技园 → 罗湖国贸', orderNo: 'HY20260701009', departureTime: '18:30', arrivalTime: '19:40', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '中巴', seatCount: 30, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D007' },
    { name: '晚班-龙岗线', route: '福田CBD → 龙岗中心城', orderNo: 'HY20260701010', departureTime: '18:00', arrivalTime: '19:45', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 50, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: 'D002' },
    // ===== 加班专线 =====
    { name: '加班-科技园线', route: '科技园 → 宝安中心/南山中心', orderNo: 'HY20260701011', departureTime: '21:00', arrivalTime: '22:00', scheduleMode: 'weekly', scheduleDays: '[1,2,3,4,5]', monthlyDays: '[]', vehicleType: '中巴', seatCount: 25, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: null },
    // ===== 周末专线 =====
    { name: '周末-购物线', route: '南山中心 → 罗湖万象城', orderNo: 'HY20260701012', departureTime: '09:30', arrivalTime: '10:30', scheduleMode: 'weekly', scheduleDays: '[6,7]', monthlyDays: '[]', vehicleType: '中巴', seatCount: 30, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: null },
    { name: '周末-海滨线', route: '福田中心 → 大梅沙海滨公园', orderNo: 'HY20260701013', departureTime: '08:30', arrivalTime: '09:40', scheduleMode: 'weekly', scheduleDays: '[6,7]', monthlyDays: '[]', vehicleType: '大巴', seatCount: 45, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-10-31', driverId: 'D004' },
    // ===== 特殊/临时 =====
    { name: '接驳-机场快线', route: '南山科技园 → 宝安国际机场', orderNo: 'HY20260701014', departureTime: '06:00', arrivalTime: '06:40', scheduleMode: 'weekly', scheduleDays: '[1,3,5]', monthlyDays: '[]', vehicleType: '商务车', seatCount: 7, status: 'inactive', activeFrom: '2026-07-01', activeTo: '2026-09-30', driverId: null },
    { name: '巡检-月度班车', route: '福田总部 → 龙华仓库', orderNo: 'HY20260701015', departureTime: '09:00', arrivalTime: '10:30', scheduleMode: 'monthly', scheduleDays: '[]', monthlyDays: '[10,20,30]', vehicleType: '小巴', seatCount: 20, status: 'active', activeFrom: '2026-07-01', activeTo: '2026-12-31', driverId: null },
  ]

  const hengyun = db.prepare("SELECT id FROM organizations WHERE name = ? AND parent_id IS NULL LIMIT 1").get('恒运')
  const orgId = hengyun ? hengyun.id : null

  const stmt = db.prepare(
    'INSERT INTO commute_shifts (name, route, order_no, departure_time, arrival_time, schedule_mode, schedule_days, monthly_days, vehicle_type, seat_count, status, active_from, active_to, org_id, driver_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  for (const s of shifts) {
    stmt.run(s.name, s.route, s.orderNo, s.departureTime, s.arrivalTime, s.scheduleMode, s.scheduleDays, s.monthlyDays, s.vehicleType, s.seatCount, s.status, s.activeFrom, s.activeTo, orgId, s.driverId)
  }
  console.log(`✅ 已插入 ${shifts.length} 条默认班次配置`)
}

module.exports = { getDb, migrateStatusDimensions }


