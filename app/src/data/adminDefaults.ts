import type { DriverInfo, ContractInfo, ContractTemplate, CarModelConfig, PriceConfig, DispatchTask, AdminUser } from '@/types'

// ============ Mock 司机数据 ============
export const MOCK_DRIVERS: DriverInfo[] = [
  { id: 'D001', name: '王建国', phone: '138****6789', licenseNo: '4401****1234', vehiclePlate: '粤A·88888', vehicleType: '经济型 5座', status: 'online', rating: 4.9, orderCount: 1256, joinDate: '2025-03-15', city: '广州', orgId: 'org_001', orgName: '恒运出行广州' },
  { id: 'D002', name: '李明辉', phone: '139****8901', licenseNo: '4403****5678', vehiclePlate: '粤B·66666', vehicleType: '商务型 7座', status: 'busy', rating: 4.8, orderCount: 892, joinDate: '2025-06-20', city: '深圳', orgId: 'org_002', orgName: '恒运出行深圳' },
  { id: 'D003', name: '张伟强', phone: '137****0123', licenseNo: '4401****9012', vehiclePlate: '粤A·99999', vehicleType: '舒适型 7座', status: 'online', rating: 4.7, orderCount: 2103, joinDate: '2024-11-01', city: '广州', orgId: 'org_001', orgName: '恒运出行广州' },
  { id: 'D004', name: '陈志远', phone: '136****3456', licenseNo: '4401****3456', vehiclePlate: '粤A·77777', vehicleType: '豪华型 19座', status: 'offline', rating: 4.6, orderCount: 567, joinDate: '2025-01-10', city: '广州', orgId: 'org_001', orgName: '恒运出行广州' },
  { id: 'D005', name: '赵永刚', phone: '135****7890', licenseNo: '4406****7890', vehiclePlate: '粤E·55555', vehicleType: '经济型 5座', status: 'online', rating: 4.9, orderCount: 789, joinDate: '2025-08-05', city: '佛山', orgId: 'org_003', orgName: '恒运出行佛山' },
  { id: 'D006', name: '刘文博', phone: '133****2345', licenseNo: '4419****2345', vehiclePlate: '粤S·33333', vehicleType: '舒适型 7座', status: 'pending', rating: 0, orderCount: 0, joinDate: '2026-06-28', city: '东莞', orgId: 'org_004', orgName: '恒运出行东莞' },
  { id: 'D007', name: '黄俊杰', phone: '132****5678', licenseNo: '4403****6789', vehiclePlate: '粤B·22222', vehicleType: '商务型 7座', status: 'online', rating: 4.8, orderCount: 1034, joinDate: '2025-04-18', city: '深圳', orgId: 'org_002', orgName: '恒运出行深圳' },
]

// ============ Mock 合同模板 ============
export const MOCK_CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'T001', name: '包车服务合同（标准版）', type: '包车',
    content: '甲方（用车方）：{customerName}\n联系电话：{customerPhone}\n\n乙方（服务方）：恒运出行\n\n一、服务内容\n1. 用车路线：{route}\n2. 出发时间：{departTime}\n3. 车辆类型：{carType}\n\n二、费用说明\n1. 服务费用：¥{amount}元\n2. 费用包含：车辆使用费、司机服务费、燃油费、过路费\n\n三、双方权利义务\n1. 甲方应按约定时间、地点乘车\n2. 乙方应确保车辆安全、整洁，司机持证上岗\n3. 如因乙方原因导致无法提供服务，全额退款\n\n四、违约责任\n1. 甲方取消订单：出发前2小时可免费取消\n2. 乙方违约：双倍赔偿甲方损失\n\n五、其他约定\n本合同自双方确认之日起生效。',
    updatedAt: '2026-06-15'
  },
  {
    id: 'T002', name: '企业长期用车合同', type: '企业包车',
    content: '甲方（企业）：{customerName}\n联系电话：{customerPhone}\n\n乙方（服务方）：恒运出行\n\n一、合作期限\n自合同签订之日起一年\n\n二、服务内容\n1. 用车路线：{route}\n2. 发车时间：{departTime}\n3. 车辆类型：{carType}\n4. 服务频次：工作日每日\n\n三、费用结算\n1. 月度服务费：¥{amount}元/月\n2. 结算方式：月结，次月5日前支付\n\n四、服务标准\n1. 车辆定期保养，保持清洁\n2. 司机统一着装，持证上岗\n3. 准时发车，迟到超15分钟免当日费用\n\n五、违约责任\n按《中华人民共和国民法典》相关规定执行。',
    updatedAt: '2026-05-20'
  },
  {
    id: 'T003', name: '团体活动包车合同', type: '团体包车',
    content: '甲方（组织方）：{customerName}\n联系电话：{customerPhone}\n\n乙方（服务方）：恒运出行\n\n一、活动信息\n1. 活动路线：{route}\n2. 出发时间：{departTime}\n3. 车辆类型：{carType}\n4. 参与人数：根据车型核定\n\n二、费用\n1. 包车费用：¥{amount}元\n2. 定金：总费用的30%\n\n三、安全责任\n1. 乙方购买足额乘客险\n2. 甲方负责乘客安全教育和秩序管理\n\n四、其他\n行程变更需提前24小时通知。',
    updatedAt: '2026-04-10'
  },
]

// ============ Mock 合同（政府网站同步样式）============
export const MOCK_CONTRACTS: ContractInfo[] = [
  { id: 'C001', contractNo: 'HT20260701001', partyA: '华为技术有限公司', partyB: '恒运出行科技有限公司', origin: '深圳南山科技园', destination: '深圳宝安国际机场', plateNo: '粤B·12345', driverName: '王建国', startDate: '2026-01-15', endDate: '2027-01-14', amount: 300, status: '履行中', filingCreateTime: '2026-01-10', orderNo: '', fleet: '深圳南山车队', createdAt: '2026-01-10' },
  { id: 'C002', contractNo: 'HT20260701002', partyA: '恒运出行科技有限公司', partyB: '腾讯科技', origin: '深圳创维大厦', destination: '广州白云国际机场', plateNo: '粤B·23456', driverName: '李志强', startDate: '2026-01-01', endDate: '2027-02-28', amount: 600, status: '履行中', filingCreateTime: '2026-02-25', orderNo: '', fleet: '深圳南山车队', createdAt: '2026-02-25' },
  { id: 'C003', contractNo: 'HT20260701003', partyA: '恒运出行科技有限公司', partyB: '百度在线', origin: '北京上地', destination: '北京中关村软件园', plateNo: '京A·34567', driverName: '刘洋', startDate: '2025-08-10', endDate: '2026-08-09', amount: 400, status: '即将到期', filingCreateTime: '2025-08-05', orderNo: '', fleet: '北京海淀车队', createdAt: '2025-08-05' },
  { id: 'C004', contractNo: 'HT20260701004', partyA: '恒运出行科技有限公司', partyB: '字节跳动', origin: '北京知春路', destination: '北京望京SOHO', plateNo: '京A·45678', driverName: '赵军', startDate: '2026-04-01', endDate: '2027-03-31', amount: 300, status: '履行中', filingCreateTime: '2026-03-28', orderNo: 'HY20260706008', fleet: '北京朝阳车队', createdAt: '2026-03-28' },
]

// ============ Mock 车型配置 ============
export const MOCK_CAR_MODELS: CarModelConfig[] = [
  { id: 'CM001', name: '经济型 5座', brand: '大众', model: '帕萨特', seats: 5, category: '经济型', tags: ['舒适', '经济实惠'], status: 'active' },
  { id: 'CM002', name: '舒适型 7座', brand: '别克', model: 'GL8', seats: 7, category: '舒适型', tags: ['商务', '空间宽敞'], status: 'active' },
  { id: 'CM003', name: '商务型 7座', brand: '丰田', model: '埃尔法', seats: 7, category: '商务型', tags: ['豪华', '尊享体验'], status: 'active' },
  { id: 'CM004', name: '豪华型 19座', brand: '丰田', model: '考斯特', seats: 19, category: '豪华型', tags: ['团体', '大型客车'], status: 'active' },
  { id: 'CM005', name: '舒适型 5座', brand: '本田', model: '雅阁', seats: 5, category: '舒适型', tags: ['舒适', '家用'], status: 'inactive' },
  { id: 'CM006', name: '豪华型 7座', brand: '奔驰', model: 'V级', seats: 7, category: '豪华型', tags: ['尊享', '商务接待'], status: 'active' },
]

// ============ Mock 价格配置 ============
export const MOCK_PRICES: PriceConfig[] = [
  // 经济型 5座
  { id: 'P001', carModelId: 'CM001', carModelName: '经济型 5座', packageType: 'hourly', duration: '4小时', price: 280, kmLimit: 50, overtimeRate: 60, overKmRate: 4, status: 'active', orgName: '恒运' },
  { id: 'P002', carModelId: 'CM001', carModelName: '经济型 5座', packageType: 'hourly', duration: '6小时', price: 380, kmLimit: 80, overtimeRate: 60, overKmRate: 4, status: 'active', orgName: '恒运' },
  { id: 'P003', carModelId: 'CM001', carModelName: '经济型 5座', packageType: 'hourly', duration: '8小时', price: 480, kmLimit: 100, overtimeRate: 60, overKmRate: 4, status: 'active', orgName: '恒运' },
  { id: 'P004', carModelId: 'CM001', carModelName: '经济型 5座', packageType: 'daily', duration: '1天', price: 800, kmLimit: 200, overtimeRate: 80, overKmRate: 4, status: 'active', orgName: '恒运' },
  { id: 'P005', carModelId: 'CM001', carModelName: '经济型 5座', packageType: 'daily', duration: '2天', price: 1500, kmLimit: 360, overtimeRate: 80, overKmRate: 4, status: 'active', orgName: '恒运' },
  // 舒适型 7座
  { id: 'P006', carModelId: 'CM002', carModelName: '舒适型 7座', packageType: 'hourly', duration: '4小时', price: 380, kmLimit: 50, overtimeRate: 80, overKmRate: 5, status: 'active', orgName: '恒运' },
  { id: 'P007', carModelId: 'CM002', carModelName: '舒适型 7座', packageType: 'hourly', duration: '8小时', price: 680, kmLimit: 100, overtimeRate: 80, overKmRate: 5, status: 'active', orgName: '恒运' },
  { id: 'P008', carModelId: 'CM002', carModelName: '舒适型 7座', packageType: 'daily', duration: '1天', price: 1200, kmLimit: 200, overtimeRate: 100, overKmRate: 5, status: 'active', orgName: '恒运' },
  // 商务型 7座
  { id: 'P009', carModelId: 'CM003', carModelName: '商务型 7座', packageType: 'hourly', duration: '4小时', price: 580, kmLimit: 50, overtimeRate: 120, overKmRate: 8, status: 'active', orgName: '恒运' },
  { id: 'P010', carModelId: 'CM003', carModelName: '商务型 7座', packageType: 'daily', duration: '1天', price: 1800, kmLimit: 200, overtimeRate: 150, overKmRate: 8, status: 'active', orgName: '恒运' },
  // 豪华型 19座
  { id: 'P011', carModelId: 'CM004', carModelName: '豪华型 19座', packageType: 'hourly', duration: '4小时', price: 880, kmLimit: 50, overtimeRate: 200, overKmRate: 12, status: 'active', orgName: '恒运' },
  { id: 'P012', carModelId: 'CM004', carModelName: '豪华型 19座', packageType: 'daily', duration: '1天', price: 2800, kmLimit: 200, overtimeRate: 250, overKmRate: 12, status: 'active', orgName: '恒运' },
]

// ============ Mock 调度任务 ============
export const MOCK_DISPATCHES: DispatchTask[] = [
  { id: 'DS001', orderNo: 'HY20260703004', route: '广州 → 东莞松山湖', departTime: '2026-07-03 15:00', carType: '经济型 5座', status: 'pending', createdAt: '2026-07-03 11:00' },
  { id: 'DS002', orderNo: 'HY20260704005', route: '深圳 → 惠州西湖', departTime: '2026-07-04 08:30', carType: '舒适型 7座', status: 'pending', createdAt: '2026-07-03 14:00' },
  { id: 'DS003', orderNo: 'HY20260703003', route: '广州 → 珠海横琴口岸', departTime: '2026-07-03 08:00', carType: '舒适型 7座', driverId: 'D003', driverName: '张伟强', vehiclePlate: '粤A·99999', contractId: 'C003', status: 'confirmed', createdAt: '2026-07-02 20:00' },
  { id: 'DS004', orderNo: 'HY20260705006', route: '广州 → 佛山祖庙', departTime: '2026-07-05 10:00', carType: '商务型 7座', driverId: 'D002', driverName: '李明辉', vehiclePlate: '粤B·66666', contractId: 'C004', status: 'assigned', createdAt: '2026-07-03 09:00' },
]

// ============ Mock 管理端用户 ============
export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: 'A001', username: 'admin', name: '系统管理员', role: 'superadmin', phone: '138****0001', status: 'active', createdAt: '2025-01-01', orgId: 'ORG1783498176683', orgName: '恒运' },
  { id: 'A002', username: 'ops01', name: '运营小王', role: 'operator', phone: '138****0002', status: 'active', createdAt: '2025-06-15', orgId: 'ORG1783498176683', orgName: '恒运' },
  { id: 'A003', username: 'finance01', name: '财务小陈', role: 'finance', phone: '138****0003', status: 'active', createdAt: '2025-08-20', orgId: 'ORG1783498176683', orgName: '恒运' },
  { id: 'A004', username: 'ops02', name: '运营小李', role: 'operator', phone: '138****0004', status: 'disabled', createdAt: '2026-01-10', orgId: 'ORG1783498176683', orgName: '恒运' },
]

// ============ Mock 用户端用户 ============
export const MOCK_CUSTOMERS = [
  { id: 'U001', name: '张三', phone: '138****8888', company: '腾讯科技', status: 'active', orderCount: 15, totalAmount: 12500, createdAt: '2025-06-01', orgName: '恒运', userType: '普通用户' },
  { id: 'U002', name: '李四', phone: '139****9999', company: '华为技术', status: 'active', orderCount: 8, totalAmount: 6800, createdAt: '2025-08-15', orgName: '恒运', userType: '普通用户' },
  { id: 'U003', name: '王五', phone: '137****7777', company: '字节跳动', status: 'active', orderCount: 3, totalAmount: 2400, createdAt: '2026-03-20', orgName: '恒运', userType: '普通用户' },
  { id: 'U004', name: '赵六', phone: '136****6666', company: '', status: 'pending', orderCount: 0, totalAmount: 0, createdAt: '2026-07-01', orgName: '恒运', userType: '普通用户' },
]

// ============ 车辆日历事件 ============
export const MOCK_CALENDAR_EVENTS: import('@/types').VehicleCalendarEvent[] = [
  { id: 'E001', vehicleId: 1, startTime: '2026-07-07 08:00', endTime: '2026-07-07 12:00', status: 'dispatched', orderNo: 'HY20260701001', route: '广州 → 白云机场', driverName: '王建国' },
  { id: 'E002', vehicleId: 1, startTime: '2026-07-08 14:00', endTime: '2026-07-08 18:00', status: 'booked', orderNo: 'HY20260702002', route: '深圳 → 广州南站', driverName: '李明辉' },
  { id: 'E003', vehicleId: 2, startTime: '2026-07-09 09:00', endTime: '2026-07-09 15:00', status: 'dispatched', orderNo: 'HY20260703003', route: '广州 → 珠海横琴', driverName: '张伟强' },
  { id: 'E004', vehicleId: 3, startTime: '2026-07-10 08:00', endTime: '2026-07-11 08:00', status: 'booked', orderNo: 'HY20260704004', route: '深圳 → 惠州西湖', driverName: '陈志远' },
  { id: 'E005', vehicleId: 4, startTime: '2026-07-11 10:00', endTime: '2026-07-11 16:00', status: 'maintenance', route: '定期保养' },
  { id: 'E006', vehicleId: 5, startTime: '2026-07-12 07:00', endTime: '2026-07-12 11:00', status: 'dispatched', orderNo: 'HY20260705005', route: '广州 → 佛山祖庙', driverName: '赵永刚' },
]

// ============ 行车日志 ============
export const MOCK_DRIVING_LOGS: import('@/types').DrivingLog[] = [
  { id: 'L001', plateNo: '粤A·88888', fleet: '恒运第一车队', driverName: '王建国', driverPhone: '138****6789', fillStatus: 'filled', fillTime: '2026-06-15 09:18', vehicleStatus: 'running' },
  { id: 'L002', plateNo: '粤B·66666', fleet: '恒运第二车队', driverName: '李明辉', driverPhone: '139****8901', fillStatus: 'unfilled', vehicleStatus: 'running' },
  { id: 'L003', plateNo: '粤A·99999', fleet: '恒运第一车队', driverName: '张伟强', driverPhone: '137****0123', fillStatus: 'filling', fillTime: '2026-06-15 10:02', vehicleStatus: 'running' },
  { id: 'L004', plateNo: '粤A·77777', fleet: '广州商务车队', driverName: '陈志远', driverPhone: '136****3456', fillStatus: 'filled', fillTime: '2026-06-14 18:30', vehicleStatus: 'annual_review' },
  { id: 'L005', plateNo: '粤E·55555', fleet: '恒运第三车队', driverName: '赵永刚', driverPhone: '135****7890', fillStatus: 'filled', fillTime: '2026-06-14 18:45', vehicleStatus: 'repair' },
  { id: 'L006', plateNo: '粤S·33333', fleet: '东莞车队', driverName: '刘文博', driverPhone: '133****2345', fillStatus: 'unfilled', vehicleStatus: 'running' },
  { id: 'L007', plateNo: '粤B·22222', fleet: '深圳南山车队', driverName: '黄俊杰', driverPhone: '132****5678', fillStatus: 'filled', fillTime: '2026-06-15 08:55', vehicleStatus: 'running' },
]

// ============ 地图车辆（智能调度） ============
export const MOCK_MAP_VEHICLES: import('@/types').MapVehicle[] = [
  { id: 'M001', plateNo: '京A·K8826', driverName: '王建国', vehicleType: '帕萨特', status: 'online', x: 22, y: 28, rating: 4.9, orderCount: 1256 },
  { id: 'M002', plateNo: '京B·A1234', driverName: '李志强', vehicleType: 'GL8', status: 'online', x: 45, y: 42, rating: 4.8, orderCount: 892 },
  { id: 'M003', plateNo: '京A·X5566', driverName: '刘洋', vehicleType: 'A6L', status: 'online', x: 68, y: 35, rating: 4.7, orderCount: 520 },
  { id: 'M004', plateNo: '京B·N7788', driverName: '赵军', vehicleType: '考斯特', status: 'busy', x: 35, y: 65, rating: 4.6, orderCount: 567 },
  { id: 'M005', plateNo: '京A·P3344', driverName: '孙明', vehicleType: '奔驰V', status: 'online', x: 72, y: 70, rating: 4.9, orderCount: 780 },
  { id: 'M006', plateNo: '京B·Q9900', driverName: '周涛', vehicleType: '埃尔法', status: 'offline', x: 55, y: 18, rating: 4.6, orderCount: 430 },
]

// ============ 统计仪表盘数据 ============
export const MOCK_DASHBOARD = {

  todayOrders: 28,
  todayRevenue: 16800,
  onlineDrivers: 35,
  totalDrivers: 42,
  pendingOrders: 5,
  completedOrders: 18,
  monthlyRevenue: 486000,
  monthlyOrders: 820,
  recentOrders: [
    { orderNo: 'HY20260703004', customer: '赵六', route: '广州→东莞松山湖', amount: 300, status: '待付款' as const, time: '15:00', orgName: '恒运' },
    { orderNo: 'HY20260703003', customer: '王五', route: '广州→珠海横琴口岸', amount: 400, status: '进行中' as const, time: '08:00', orgName: '恒运' },
    { orderNo: 'HY20260703005', customer: '钱七', route: '深圳→惠州西湖', amount: 580, status: '待派车' as const, time: '14:30', orgName: '恒运' },
    { orderNo: 'HY20260702002', customer: '李四', route: '深圳→广州南站', amount: 600, status: '已完成' as const, time: '09:30', orgName: '恒运' },
    { orderNo: 'HY20260701001', customer: '张三', route: '广州→白云机场', amount: 300, status: '已完成' as const, time: '14:00', orgName: '恒运' },

  ],
  revenueTrend: [
    { date: '06-27', amount: 15200 },
    { date: '06-28', amount: 18100 },
    { date: '06-29', amount: 13500 },
    { date: '06-30', amount: 16800 },
    { date: '07-01', amount: 19200 },
    { date: '07-02', amount: 22100 },
    { date: '07-03', amount: 16800 },
  ],
  orderTrend: [
    { date: '06-27', count: 22 },
    { date: '06-28', count: 28 },
    { date: '06-29', count: 18 },
    { date: '06-30', count: 25 },
    { date: '07-01', count: 31 },
    { date: '07-02', count: 35 },
    { date: '07-03', count: 28 },
  ],
}
