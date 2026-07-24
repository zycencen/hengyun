const { getDb } = require('./db')

function seed() {
  const db = getDb()

  console.log('🌱 开始填充种子数据...')

  // ===== 用户 =====
  const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, phone, name, company, avatar, is_vip, is_enterprise_verified, org_id) VALUES (?,?,?,?,?,?,?,?)`)
  insertUser.run(1, '13800000001', '张三', '腾讯科技', null, 1, 1, 'ORG001')
  insertUser.run(2, '13900000002', '李四', '华为技术', null, 0, 1, 'ORG001')
  insertUser.run(3, '13700000003', '王五', '字节跳动', null, 0, 0, 'ORG001')
  insertUser.run(4, '13600000004', '赵六', '', null, 0, 0, 'ORG001')

  // ===== 车辆 =====
  const insertCar = db.prepare(`INSERT OR IGNORE INTO cars (id, name, seats, model, capacity, tags, hourly_price, daily_price, color, plate_number, org_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  insertCar.run(1, '经济型 5座', '5座', '大众帕萨特', '可乘4人', JSON.stringify(['舒适', '经济实惠']), 280, 800, '#1E3A8A', '粤A·88888', 'ORG001')
  insertCar.run(2, '舒适型 7座', '7座', '别克GL8', '可乘6人', JSON.stringify(['商务', '空间宽敞']), 380, 1200, '#F97316', '粤B·66666', 'ORG001')
  insertCar.run(3, '商务型 7座', '7座', '丰田埃尔法', '可乘6人', JSON.stringify(['豪华', '尊享体验']), 580, 1800, '#7C3AED', '粤A·99999', 'ORG001')
  insertCar.run(4, '豪华型 19座', '19座', '丰田考斯特', '可乘18人', JSON.stringify(['团体', '大型客车']), 880, 2800, '#DC2626', '粤A·77777', 'ORG001')
  insertCar.run(5, '轿车 5座', '5座', '日产天籁', '可乘4人', JSON.stringify(['舒适', '家庭出行']), 260, 750, '#0EA5E9', '粤E·55555', 'ORG001')
  insertCar.run(6, 'SUV 5座', '5座', '丰田RAV4', '可乘4人', JSON.stringify(['SUV', '宽敞']), 300, 850, '#10B981', '粤S·33333', 'ORG001')
  insertCar.run(7, '商务型 7座', '7座', '本田奥德赛', '可乘6人', JSON.stringify(['商务', '家用']), 350, 1000, '#8B5CF6', '粤B·22222', 'ORG001')

  // ===== 订单 =====
  const insertOrder = db.prepare(`INSERT OR IGNORE INTO orders (id, order_no, route, depart_city, order_time, depart_time, end_time, trip_duration, package_type, duration, car_name, car_model, seats, amount, service_fee, total, status, created_at, customer_name, customer_phone, driver_name, contract_id, user_id, org_id, business_type, deposit, paid_amount, balance_amount, ride_count, settlement, created_by, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  // charter: 包车订单（全额预付，1次用车）
  insertOrder.run('HY20260701001', 'HY20260701001', '广州 → 白云国际机场T2', '广州', '2026-07-01 09:23', '2026-07-01 14:00', '2026-07-01 18:15', '4小时15分', 'hourly', '4小时', '经济型 5座', '大众帕萨特', '5座', 280, 20, 300, '已完成', '2026-07-01', '张三', '13800000001', '王师傅', null, 1, 'ORG001', 'charter', 0, 300, 0, 1, 'done', 'user', '')
  // commute: 上下班订单（多趟用车，定金+结账）
  insertOrder.run('HY20260702002', 'HY20260702002', '深圳 → 广州南站', '深圳', '2026-07-02 07:15', '2026-07-02 09:30', '2026-07-02 15:50', '6小时20分', 'hourly', '6小时', '商务型 7座', '丰田埃尔法', '7座', 580, 20, 600, '已完成', '2026-07-02', '李四', '13900000002', '李师傅', null, 2, 'ORG001', 'commute', 200, 600, 0, 20, 'done', 'dispatcher', '工作日上下班通勤')
  insertOrder.run('HY20260703003', 'HY20260703003', '广州 → 珠海横琴口岸', '广州', '2026-07-02 16:42', '2026-07-03 08:00', null, null, 'daily', '1天', '舒适型 7座', '别克GL8', '7座', 380, 20, 400, '进行中', '2026-07-03', '王五', '13700000003', '赵师傅', null, 3, 'ORG001', 'charter', 0, 400, 0, 1, 'done', 'user', '')
  // custom: 定制包车订单（定金模式，待结账）
  insertOrder.run('HY20260703004', 'HY20260703004', '广州 → 东莞松山湖', '广州', '2026-07-03 10:30', '2026-07-03 15:00', null, null, 'hourly', '4小时', '经济型 5座', '大众帕萨特', '5座', 280, 20, 300, '待付款', '2026-07-03', '赵六', '13600000004', null, null, 4, 'ORG001', 'custom', 100, 0, 200, 5, 'none', 'dispatcher', '企业团建定制出行')
  insertOrder.run('HY20260701005', 'HY20260701005', '广州 → 佛山祖庙', '广州', '2026-07-01 08:05', '2026-07-01 10:00', null, null, 'hourly', '4小时', '经济型 5座', '大众帕萨特', '5座', 180, 20, 200, '已取消', '2026-07-01', '张三', '13800000001', null, null, 1, 'ORG001', 'charter', 0, 0, 0, 1, 'done', 'user', '')
  // commute: 上下班订单（已付定金，待结部分尾款）
  insertOrder.run('HY20260704006', 'HY20260704006', '深圳 → 惠州西湖', '深圳', '2026-07-03 14:20', '2026-07-04 08:30', null, null, 'daily', '1天', '舒适型 7座', '别克GL8', '7座', 1200, 20, 1220, '待接单', '2026-07-04', '李四', '13900000002', '陈师傅', null, 2, 'ORG001', 'commute', 500, 0, 720, 15, 'none', 'dispatcher', '惠州西湖项目通勤')
  insertOrder.run('HY20260705007', 'HY20260705007', '广州 → 广州南站', '广州', '2026-07-04 19:45', '2026-07-05 06:00', '2026-07-05 07:15', '1小时15分', 'hourly', '2小时', '经济型 5座', '大众帕萨特', '5座', 180, 20, 200, '已完成', '2026-07-05', '张三', '13800000001', '王师傅', null, 1, 'ORG001', 'charter', 0, 200, 0, 1, 'done', 'user', '')
  // custom: 定制包车订单（部分结账）
  insertOrder.run('HY20260706008', 'HY20260706008', '佛山 → 广州白云机场', '佛山', '2026-07-05 20:10', '2026-07-06 11:00', null, null, 'hourly', '4小时', '商务型 7座', '丰田埃尔法', '7座', 580, 20, 600, '待派车', '2026-07-06', '王五', '13700000003', '李明辉', 'C004', 3, 'ORG001', 'custom', 300, 200, 100, 3, 'partial', 'dispatcher', '重要客户接送')

  // ===== 评价 =====
  const insertReview = db.prepare(`INSERT OR IGNORE INTO reviews (id, order_id, stars, content, driver_name, reply, date, org_id) VALUES (?,?,?,?,?,?,?,?)`)
  insertReview.run(1, 'HY20260701001', 5, '司机服务态度很好，车辆干净整洁，非常满意的一次出行体验！', '王师傅', '感谢您的认可，我们会继续努力！', '2026-07-01', 'ORG001')
  insertReview.run(2, 'HY20260702002', 4, '整体不错，准时到达，车辆状况良好。建议可以多提供一些车内饮品。', '李师傅', '', '2026-06-28', 'ORG001')

  // ===== 发票 =====
  const insertInvoice = db.prepare(`INSERT OR IGNORE INTO invoices (id, order_no, title, amount, date, org_id) VALUES (?,?,?,?,?,?)`)
  insertInvoice.run(1, 'HY20260701001', 'HY20260701001 行程费用', 280, '2026-07-01', 'ORG001')
  insertInvoice.run(2, 'HY20260702002', 'HY20260702002 行程费用', 580, '2026-07-02', 'ORG001')
  insertInvoice.run(3, 'HY20260703003', 'HY20260703003 行程费用', 380, '2026-07-03', 'ORG001')

  // ===== 司机 =====
  const insertDriver = db.prepare(`INSERT OR IGNORE INTO drivers (id, name, phone, license_no, vehicle_plate, vehicle_type, status, rating, order_count, join_date, city, org_id, car_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  // D001-D004：绑定已有车辆（car_id 对应 cars 表 id）
  insertDriver.run('D001', '王建国', '138****6789', '4401****1234', '粤A·88888', '经济型 5座', 'online', 4.9, 1256, '2025-03-15', '广州', 'ORG001', 1)
  insertDriver.run('D002', '李明辉', '139****8901', '4403****5678', '粤B·66666', '商务型 7座', 'busy', 4.8, 892, '2025-06-20', '深圳', 'ORG001', 2)
  insertDriver.run('D003', '张伟强', '137****0123', '4401****9012', '粤A·99999', '舒适型 7座', 'online', 4.7, 2103, '2024-11-01', '广州', 'ORG001', 3)
  insertDriver.run('D004', '陈志远', '136****3456', '4401****3456', '粤A·77777', '豪华型 19座', 'offline', 4.6, 567, '2025-01-10', '广州', 'ORG001', 4)
  // D005-D007：绑定新增车辆（car_id 对应 cars 表 id 5-7）
  insertDriver.run('D005', '赵永刚', '135****7890', '4406****7890', '粤E·55555', '轿车 5座', 'online', 4.9, 789, '2025-08-05', '佛山', 'ORG001', 5)
  insertDriver.run('D006', '刘文博', '133****2345', '4419****2345', '粤S·33333', 'SUV 5座', 'pending', 0, 0, '2026-06-28', '东莞', 'ORG001', 6)
  insertDriver.run('D007', '黄俊杰', '132****5678', '4403****6789', '粤B·22222', '商务型 7座', 'online', 4.8, 1034, '2025-04-18', '深圳', 'ORG001', 7)

  // ===== 合同模板 =====
  const insertTemplate = db.prepare(`INSERT OR IGNORE INTO contract_templates (id, name, type, content, updated_at, org_id) VALUES (?,?,?,?,?,?)`)
  insertTemplate.run('T001', '包车服务合同（标准版）', '包车', '甲方（用车方）：{customerName}\n联系电话：{customerPhone}\n\n乙方（服务方）：恒运出行\n\n一、服务内容\n1. 用车路线：{route}\n2. 出发时间：{departTime}\n3. 车辆类型：{carType}\n\n二、费用说明\n1. 服务费用：¥{amount}元\n2. 费用包含：车辆使用费、司机服务费、燃油费、过路费\n\n三、双方权利义务\n1. 甲方应按约定时间、地点乘车\n2. 乙方应确保车辆安全、整洁，司机持证上岗\n3. 如因乙方原因导致无法提供服务，全额退款\n\n四、违约责任\n1. 甲方取消订单：出发前2小时可免费取消\n2. 乙方违约：双倍赔偿甲方损失\n\n五、其他约定\n本合同自双方确认之日起生效。', '2026-06-15', 'ORG001')
  insertTemplate.run('T002', '企业长期用车合同', '企业包车', '甲方（企业）：{customerName}\n联系电话：{customerPhone}\n\n乙方（服务方）：恒运出行\n\n一、合作期限\n自合同签订之日起一年\n\n二、服务内容\n1. 用车路线：{route}\n2. 发车时间：{departTime}\n3. 车辆类型：{carType}\n4. 服务频次：工作日每日\n\n三、费用结算\n1. 月度服务费：¥{amount}元/月\n2. 结算方式：月结，次月5日前支付\n\n四、服务标准\n1. 车辆定期保养，保持清洁\n2. 司机统一着装，持证上岗\n3. 准时发车，迟到超15分钟免当日费用', '2026-05-20', 'ORG001')
  insertTemplate.run('T003', '团体活动包车合同', '团体包车', '甲方（组织方）：{customerName}\n联系电话：{customerPhone}\n\n乙方（服务方）：恒运出行\n\n一、活动信息\n1. 活动路线：{route}\n2. 出发时间：{departTime}\n3. 车辆类型：{carType}\n4. 参与人数：根据车型核定\n\n二、费用\n1. 包车费用：¥{amount}元\n2. 定金：总费用的30%', '2026-04-10', 'ORG001')

  // ===== 合同（政府网站同步样式）======
  const insertContract = db.prepare(`INSERT OR IGNORE INTO contracts (id, contract_no, party_a, party_b, origin, destination, plate_no, driver_name, start_date, end_date, amount, status, filing_create_time, order_no, fleet, created_at, org_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  insertContract.run('C001', 'HT20260701001', '华为技术有限公司', '恒运出行科技有限公司', '深圳南山科技园', '深圳宝安国际机场', '粤B·12345', '王建国', '2026-01-15', '2027-01-14', 300, '履行中', '2026-01-10', '', '深圳南山车队', '2026-01-10', 'ORG001')
  insertContract.run('C002', 'HT20260701002', '恒运出行科技有限公司', '腾讯科技', '深圳创维大厦', '广州白云国际机场', '粤B·23456', '李志强', '2026-01-01', '2027-02-28', 600, '履行中', '2026-02-25', '', '深圳南山车队', '2026-02-25', 'ORG001')
  insertContract.run('C003', 'HT20260701003', '恒运出行科技有限公司', '百度在线', '北京上地', '北京中关村软件园', '京A·34567', '刘洋', '2025-08-10', '2026-08-09', 400, '即将到期', '2025-08-05', '', '北京海淀车队', '2025-08-05', 'ORG001')
  insertContract.run('C004', 'HT20260701004', '恒运出行科技有限公司', '字节跳动', '北京知春路', '北京望京SOHO', '京A·45678', '赵军', '2026-04-01', '2027-03-31', 300, '履行中', '2026-03-28', 'HY20260706008', '北京朝阳车队', '2026-03-28', 'ORG001')


  // ===== 车型配置 =====
  const insertCarModel = db.prepare(`INSERT OR IGNORE INTO car_models (id, name, brand, model, seats, category, tags, status, org_id) VALUES (?,?,?,?,?,?,?,?,?)`)
  insertCarModel.run('CM001', '经济型 5座', '大众', '帕萨特', 5, '经济型', JSON.stringify(['舒适', '经济实惠']), 'active', 'ORG001')
  insertCarModel.run('CM002', '舒适型 7座', '别克', 'GL8', 7, '舒适型', JSON.stringify(['商务', '空间宽敞']), 'active', 'ORG001')
  insertCarModel.run('CM003', '商务型 7座', '丰田', '埃尔法', 7, '商务型', JSON.stringify(['豪华', '尊享体验']), 'active', 'ORG001')
  insertCarModel.run('CM004', '豪华型 19座', '丰田', '考斯特', 19, '豪华型', JSON.stringify(['团体', '大型客车']), 'active', 'ORG001')
  insertCarModel.run('CM005', '舒适型 5座', '本田', '雅阁', 5, '舒适型', JSON.stringify(['舒适', '家用']), 'inactive', 'ORG001')
  insertCarModel.run('CM006', '豪华型 7座', '奔驰', 'V级', 7, '豪华型', JSON.stringify(['尊享', '商务接待']), 'active', 'ORG001')

  // ===== 价格配置 =====
  const insertPrice = db.prepare(`INSERT OR IGNORE INTO prices (id, car_model_id, car_model_name, package_type, duration, price, km_limit, overtime_rate, over_km_rate, status, org_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  insertPrice.run('P001', 'CM001', '经济型 5座', 'hourly', '4小时', 280, 50, 60, 4, 'active', 'ORG001')
  insertPrice.run('P002', 'CM001', '经济型 5座', 'hourly', '6小时', 380, 80, 60, 4, 'active', 'ORG001')
  insertPrice.run('P003', 'CM001', '经济型 5座', 'hourly', '8小时', 480, 100, 60, 4, 'active', 'ORG001')
  insertPrice.run('P004', 'CM001', '经济型 5座', 'daily', '1天', 800, 200, 80, 4, 'active', 'ORG001')
  insertPrice.run('P005', 'CM001', '经济型 5座', 'daily', '2天', 1500, 360, 80, 4, 'active', 'ORG001')
  insertPrice.run('P006', 'CM002', '舒适型 7座', 'hourly', '4小时', 380, 50, 80, 5, 'active', 'ORG001')
  insertPrice.run('P007', 'CM002', '舒适型 7座', 'hourly', '8小时', 680, 100, 80, 5, 'active', 'ORG001')
  insertPrice.run('P008', 'CM002', '舒适型 7座', 'daily', '1天', 1200, 200, 100, 5, 'active', 'ORG001')
  insertPrice.run('P009', 'CM003', '商务型 7座', 'hourly', '4小时', 580, 50, 120, 8, 'active', 'ORG001')
  insertPrice.run('P010', 'CM003', '商务型 7座', 'daily', '1天', 1800, 200, 150, 8, 'active', 'ORG001')
  insertPrice.run('P011', 'CM004', '豪华型 19座', 'hourly', '4小时', 880, 50, 200, 12, 'active', 'ORG001')
  insertPrice.run('P012', 'CM004', '豪华型 19座', 'daily', '1天', 2800, 200, 250, 12, 'active', 'ORG001')

  // ===== 调度任务 =====
  const insertDispatch = db.prepare(`INSERT OR IGNORE INTO dispatch_tasks (id, order_no, route, depart_time, car_type, driver_id, driver_name, vehicle_plate, contract_id, status, created_at, org_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
  insertDispatch.run('DS001', 'HY20260703004', '广州 → 东莞松山湖', '2026-07-03 15:00', '经济型 5座', null, null, null, null, 'pending', '2026-07-03 11:00', 'ORG001')
  insertDispatch.run('DS002', 'HY20260704005', '深圳 → 惠州西湖', '2026-07-04 08:30', '舒适型 7座', null, null, null, null, 'pending', '2026-07-03 14:00', 'ORG001')
  insertDispatch.run('DS003', 'HY20260703003', '广州 → 珠海横琴口岸', '2026-07-03 08:00', '舒适型 7座', 'D003', '张伟强', '粤A·99999', 'C003', 'confirmed', '2026-07-02 20:00', 'ORG001')
  insertDispatch.run('DS004', 'HY20260705006', '广州 → 佛山祖庙', '2026-07-05 10:00', '商务型 7座', 'D002', '李明辉', '粤B·66666', 'C004', 'assigned', '2026-07-03 09:00', 'ORG001')

  // ===== 定制包车排班种子数据 =====
  const insertCustomSchedule = db.prepare(`INSERT OR IGNORE INTO dispatch_schedules (id, order_no, date, route, fleet, plate_number, driver, depart_time, return_time, passenger_count, unit, phone, remark, kilometers, vehicle_status, status, schedule_type, org_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)

  insertCustomSchedule.run(101, 'HY20260706008', '2026-07-06', '佛山 → 广州白云机场', '深圳南山车队', '粤B·66666', '李明辉', '11:00', '13:30', 4, '华星光电', '139****8901', '重要客户接送，走广深高速', 120, '待出车', '已确认', 'custom', 'ORG001')
  insertCustomSchedule.run(102, 'HY20260704006', '2026-07-06', '深圳 → 惠州西湖', '深圳南山车队', '粤A·99999', '张伟强', '08:30', '10:00', 4, '腾讯科技', '137****0123', '惠州西湖项目考察', 90, '待出车', '已确认', 'custom', 'ORG001')
  insertCustomSchedule.run(103, 'HY20260706008', '2026-07-07', '佛山 → 广州白云机场', '北京海淀车队', '粤A·77777', '陈志远', '09:00', '12:00', 18, '百度在线', '136****3456', '团队出差返程送机', 130, '待出车', '已派车', 'custom', 'ORG001')
  insertCustomSchedule.run(104, 'HY20260701005', '2026-07-07', '广州 → 佛山祖庙', '深圳南山车队', '粤A·88888', '王建国', '10:00', '16:00', 3, '字节跳动', '138****6789', '祖庙团建活动', 60, '进行中', '进行中', 'custom', 'ORG001')
  insertCustomSchedule.run(116, 'HY20260705007', '2026-07-08', '广州 → 广州南站', '北京海淀车队', '粤B·22222', '黄俊杰', '06:00', '07:15', 2, '恒运出行', '132****5678', '高铁站接站', 35, '待出车', '已确认', 'custom', 'ORG001')
  insertCustomSchedule.run(117, 'HY20260703004', '2026-07-08', '广州 → 东莞松山湖', '北京朝阳车队', '粤E·55555', '赵永刚', '15:00', '18:30', 5, '华为技术', '135****7890', '松山湖园区考察', 80, '待确认', '待确认', 'custom', 'ORG001')
  insertCustomSchedule.run(118, 'HY20260706008', '2026-07-09', '佛山 → 广州白云机场', '深圳南山车队', '粤S·33333', '刘文博', '13:00', '15:30', 3, '华大基因', '133****2345', '外宾送机，需英语沟通', 110, '待出车', '已确认', 'custom', 'ORG001')
  insertCustomSchedule.run(119, 'HY20260701001', '2026-07-09', '广州 → 白云国际机场T2', '深圳南山车队', '粤A·88888', '王建国', '08:30', '10:30', 3, '腾讯科技', '138****6789', '高管出差送机', 55, '已完成', '已完成', 'custom', 'ORG001')

  console.log('✅ 定制包车种子数据填充完毕！')
  console.log('   - 8 条定制包车调度排班')

  // ===== 管理端用户（含所属组织） =====
  const insertAdmin = db.prepare(`INSERT OR IGNORE INTO admin_users (id, username, password, name, role, phone, status, org_id) VALUES (?,?,?,?,?,?,?,?)`)
  insertAdmin.run('A001', 'admin', '123456', '系统管理员', 'superadmin', '138****0001', 'active', 'ORG001')
  insertAdmin.run('A002', 'ops01', '123456', '运营小王', 'operator', '138****0002', 'active', 'ORG001')
  insertAdmin.run('A003', 'finance01', '123456', '财务小陈', 'finance', '138****0003', 'active', 'ORG001')
  insertAdmin.run('A004', 'ops02', '123456', '运营小李', 'operator', '138****0004', 'disabled', 'ORG001')

  // ===== 组织架构 =====
  const insertOrg = db.prepare(`INSERT OR IGNORE INTO organizations (id, name, parent_id, path, level, sort_order) VALUES (?,?,?,?,?,?)`)
  insertOrg.run('ORG001', '恒运', null, 'ORG001', 0, 1)
  insertOrg.run('ORG002', '车队1', 'ORG001', 'ORG001/ORG002', 1, 1)
  insertOrg.run('ORG003', '二车队', 'ORG001', 'ORG001/ORG003', 1, 2)

  // ===== 角色权限 =====
  const insertRole = db.prepare(`INSERT OR IGNORE INTO roles (id, name, code, description, is_system) VALUES (?,?,?,?,?)`)
  insertRole.run('ROLE001', '超级管理员', 'superadmin', '拥有全部系统和数据权限', 1)
  insertRole.run('ROLE002', '管理员', 'admin', '管理日常运营，可配置系统', 1)
  insertRole.run('ROLE003', '运营人员', 'operator', '处理订单、调度和数据查看', 1)
  insertRole.run('ROLE004', '财务人员', 'finance', '管理财务和发票相关功能', 1)

  const insertPerm = db.prepare(`INSERT OR IGNORE INTO role_permissions (role_id, permission_key) VALUES (?,?)`)
  const ALL_PERMISSIONS = [
    'dashboard:view', 'orders:view', 'orders:manage', 'dispatch:view', 'dispatch:manage',
    'demands:view', 'demands:manage', 'contracts:view', 'contracts:manage',
    'vehicles:view', 'vehicles:manage', 'drivers:view', 'drivers:manage',
    'fleets:view', 'fleets:manage',
    'users:view', 'users:manage', 'finance:view', 'service:view',
    'settings:view', 'settings:edit', 'org:view', 'org:manage', 'role:view', 'role:manage',
  ]
  // superadmin: 全部权限
  for (const perm of ALL_PERMISSIONS) insertPerm.run('ROLE001', perm)
  // admin: 全部权限
  for (const perm of ALL_PERMISSIONS) insertPerm.run('ROLE002', perm)
  // operator: 运营相关
  for (const perm of ['dashboard:view', 'orders:view', 'orders:manage', 'dispatch:view', 'dispatch:manage',
    'demands:view', 'demands:manage', 'contracts:view', 'vehicles:view', 'drivers:view', 'fleets:view',
    'users:view', 'service:view', 'settings:view', 'org:view']) {
    insertPerm.run('ROLE003', perm)
  }
  // finance: 财务相关
  for (const perm of ['dashboard:view', 'orders:view', 'finance:view', 'contracts:view', 'fleets:view', 'settings:view', 'org:view']) {
    insertPerm.run('ROLE004', perm)
  }

  console.log('✅ 种子数据填充完毕！')
  console.log('   - 4 个用户')
  console.log('   - 4 辆车')
  console.log('   - 8 条订单')
  console.log('   - 2 条评价')
  console.log('   - 3 条发票')
  console.log('   - 7 个司机')
  console.log('   - 3 个合同模板 + 4 个合同')
  console.log('   - 6 个车型 + 12 条价格')
  console.log('   - 4 条调度任务')
  console.log('   - 4 个管理员 (admin/123456)')
  console.log('   - 3 个组织（恒运/车队1/二车队）+ 4 个角色 + 权限分配')
}

seed()
