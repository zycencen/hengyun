import type { CarInfo, DurationOption, OrderInfo, ReviewInfo, InvoiceInfo } from '@/types'

// ============ 默认车辆数据（API 不可用时的降级方案） ============
export const DEFAULT_CARS: CarInfo[] = [
  { id: 1, name: '经济型 5座', seats: '5座', model: '大众帕萨特', capacity: '可乘4人', tags: ['舒适', '经济实惠'], hourlyPrice: 280, dailyPrice: 800, color: '#1E3A8A', plate: '粤A·88888', carModelId: 'CM001', prices: { 'hourly_4小时': { price: 280, kmLimit: 50, overtimeRate: 60, overKmRate: 4 }, 'hourly_6小时': { price: 380, kmLimit: 80, overtimeRate: 60, overKmRate: 4 }, 'hourly_8小时': { price: 480, kmLimit: 100, overtimeRate: 60, overKmRate: 4 }, 'hourly_12小时': { price: 680, kmLimit: 150, overtimeRate: 60, overKmRate: 4 }, 'daily_1天': { price: 800, kmLimit: 200, overtimeRate: 80, overKmRate: 4 }, 'daily_2天': { price: 1500, kmLimit: 360, overtimeRate: 80, overKmRate: 4 }, 'daily_3天': { price: 2100, kmLimit: 450, overtimeRate: 80, overKmRate: 4 }, 'daily_7天': { price: 4500, kmLimit: 840, overtimeRate: 80, overKmRate: 4 } } },
  { id: 2, name: '舒适型 7座', seats: '7座', model: '别克GL8', capacity: '可乘6人', tags: ['商务', '空间宽敞'], hourlyPrice: 380, dailyPrice: 1200, color: '#F97316', plate: '粤B·66666', carModelId: 'CM002', prices: { 'hourly_4小时': { price: 380, kmLimit: 50, overtimeRate: 80, overKmRate: 5 }, 'hourly_6小时': { price: 500, kmLimit: 80, overtimeRate: 80, overKmRate: 5 }, 'hourly_8小时': { price: 620, kmLimit: 100, overtimeRate: 80, overKmRate: 5 }, 'hourly_12小时': { price: 880, kmLimit: 150, overtimeRate: 80, overKmRate: 5 }, 'daily_1天': { price: 1200, kmLimit: 200, overtimeRate: 100, overKmRate: 5 }, 'daily_2天': { price: 2200, kmLimit: 360, overtimeRate: 100, overKmRate: 5 }, 'daily_3天': { price: 3100, kmLimit: 450, overtimeRate: 100, overKmRate: 5 }, 'daily_7天': { price: 6800, kmLimit: 840, overtimeRate: 100, overKmRate: 5 } } },
  { id: 3, name: '商务型 7座', seats: '7座', model: '丰田埃尔法', capacity: '可乘6人', tags: ['豪华', '尊享体验'], hourlyPrice: 580, dailyPrice: 1800, color: '#7C3AED', plate: '粤A·99999', carModelId: 'CM003', prices: { 'hourly_4小时': { price: 580, kmLimit: 50, overtimeRate: 100, overKmRate: 6 }, 'hourly_6小时': { price: 750, kmLimit: 80, overtimeRate: 100, overKmRate: 6 }, 'hourly_8小时': { price: 920, kmLimit: 100, overtimeRate: 100, overKmRate: 6 }, 'hourly_12小时': { price: 1280, kmLimit: 150, overtimeRate: 100, overKmRate: 6 }, 'daily_1天': { price: 1800, kmLimit: 200, overtimeRate: 120, overKmRate: 6 }, 'daily_2天': { price: 3300, kmLimit: 360, overtimeRate: 120, overKmRate: 6 }, 'daily_3天': { price: 4600, kmLimit: 450, overtimeRate: 120, overKmRate: 6 }, 'daily_7天': { price: 9800, kmLimit: 840, overtimeRate: 120, overKmRate: 6 } } },
  { id: 4, name: '豪华型 19座', seats: '19座', model: '丰田考斯特', capacity: '可乘18人', tags: ['团体', '大型客车'], hourlyPrice: 880, dailyPrice: 2800, color: '#DC2626', plate: '粤A·77777', carModelId: 'CM004', prices: { 'hourly_4小时': { price: 880, kmLimit: 50, overtimeRate: 150, overKmRate: 8 }, 'hourly_6小时': { price: 1100, kmLimit: 80, overtimeRate: 150, overKmRate: 8 }, 'hourly_8小时': { price: 1350, kmLimit: 100, overtimeRate: 150, overKmRate: 8 }, 'hourly_12小时': { price: 1880, kmLimit: 150, overtimeRate: 150, overKmRate: 8 }, 'daily_1天': { price: 2800, kmLimit: 200, overtimeRate: 180, overKmRate: 8 }, 'daily_2天': { price: 5000, kmLimit: 360, overtimeRate: 180, overKmRate: 8 }, 'daily_3天': { price: 7000, kmLimit: 450, overtimeRate: 180, overKmRate: 8 }, 'daily_7天': { price: 15000, kmLimit: 840, overtimeRate: 180, overKmRate: 8 } } },
]

export const DEFAULT_HOURLY_DURATIONS: DurationOption[] = [
  { label: '4小时', sublabel: '含50公里', kmLimit: 50 },
  { label: '6小时', sublabel: '含80公里', kmLimit: 80 },
  { label: '8小时', sublabel: '含100公里', kmLimit: 100 },
  { label: '12小时', sublabel: '含150公里', kmLimit: 150 },
]

export const DEFAULT_DAILY_DURATIONS: DurationOption[] = [
  { label: '1天', sublabel: '200公里/天', kmLimit: 200 },
  { label: '2天', sublabel: '180公里/天', kmLimit: 360 },
  { label: '3天', sublabel: '150公里/天', kmLimit: 450 },
  { label: '7天', sublabel: '120公里/天', kmLimit: 840 },
]

// ============ Mock 订单（按下单时间倒序排列） ============
export const MOCK_ORDERS: OrderInfo[] = [
  { id: 'HY20260706008', orderNo: 'HY20260706008', route: '佛山 → 广州白云机场', departCity: '佛山', orderTime: '2026-07-05 20:10', departTime: '2026-07-06 11:00', endTime: undefined, tripDuration: undefined, packageType: 'hourly', duration: '4小时', carName: '商务型 7座', carModel: '丰田埃尔法', seats: '7座', amount: 580, serviceFee: 20, total: 600, status: '进行中', createdAt: '2026-07-06', customerName: '王五', customerPhone: '13700000003', driverName: '李明辉', contractId: 'C004', orderType: '普通用户订单', paymentStatus: '已支付', acceptStatus: '已接单', dispatchStatus: '已派车', businessType: 'charter' },
  { id: 'HY20260705007', orderNo: 'HY20260705007', route: '广州 → 广州南站', departCity: '广州', orderTime: '2026-07-04 19:45', departTime: '2026-07-05 06:00', endTime: '2026-07-05 07:15', tripDuration: '1小时15分', packageType: 'hourly', duration: '2小时', carName: '经济型 5座', carModel: '大众帕萨特', seats: '5座', amount: 180, serviceFee: 20, total: 200, status: '已完成', createdAt: '2026-07-05', customerName: '张三', customerPhone: '13800000001', driverName: '王师傅', orderType: '普通用户订单', paymentStatus: '已支付', acceptStatus: '已接单', dispatchStatus: '已完成', businessType: 'commute' },
  { id: 'HY20260704006', orderNo: 'HY20260704006', route: '深圳 → 惠州西湖', departCity: '深圳', orderTime: '2026-07-03 14:20', departTime: '2026-07-04 08:30', endTime: undefined, tripDuration: undefined, packageType: 'daily', duration: '1天', carName: '舒适型 7座', carModel: '别克GL8', seats: '7座', amount: 1200, serviceFee: 20, total: 1220, status: '待派车', createdAt: '2026-07-04', customerName: '李四', customerPhone: '13900000002', driverName: '陈师傅', orderType: '普通用户订单', paymentStatus: '已支付', acceptStatus: '已接单', dispatchStatus: '未派车', businessType: 'custom' },
  { id: 'HY20260703004', orderNo: 'HY20260703004', route: '广州 → 东莞松山湖', departCity: '广州', orderTime: '2026-07-03 10:30', departTime: '2026-07-03 15:00', endTime: undefined, tripDuration: undefined, packageType: 'hourly', duration: '4小时', carName: '经济型 5座', carModel: '大众帕萨特', seats: '5座', amount: 280, serviceFee: 20, total: 300, status: '待付款', createdAt: '2026-07-03', customerName: '赵六', customerPhone: '13600000004', orderType: '普通用户订单', paymentStatus: '未支付', acceptStatus: '未接单', dispatchStatus: '未派车', businessType: 'charter' },
  { id: 'HY20260703003', orderNo: 'HY20260703003', route: '广州 → 珠海横琴口岸', departCity: '广州', orderTime: '2026-07-02 16:42', departTime: '2026-07-03 08:00', endTime: undefined, tripDuration: undefined, packageType: 'daily', duration: '1天', carName: '舒适型 7座', carModel: '别克GL8', seats: '7座', amount: 380, serviceFee: 20, total: 400, status: '进行中', createdAt: '2026-07-03', customerName: '王五', customerPhone: '13700000003', driverName: '赵师傅', orderType: '普通用户订单', paymentStatus: '已支付', acceptStatus: '已接单', dispatchStatus: '已派车', businessType: 'charter' },
  { id: 'HY20260702002', orderNo: 'HY20260702002', route: '深圳 → 广州南站', departCity: '深圳', orderTime: '2026-07-02 07:15', departTime: '2026-07-02 09:30', endTime: '2026-07-02 15:50', tripDuration: '6小时20分', packageType: 'hourly', duration: '6小时', carName: '商务型 7座', carModel: '丰田埃尔法', seats: '7座', amount: 580, serviceFee: 20, total: 600, status: '已完成', createdAt: '2026-07-02', customerName: '李四', customerPhone: '13900000002', driverName: '李师傅', orderType: '普通用户订单', paymentStatus: '已支付', acceptStatus: '已接单', dispatchStatus: '已完成', businessType: 'commute' },
  { id: 'HY20260701001', orderNo: 'HY20260701001', route: '广州 → 白云国际机场T2', departCity: '广州', orderTime: '2026-07-01 09:23', departTime: '2026-07-01 14:00', endTime: '2026-07-01 18:15', tripDuration: '4小时15分', packageType: 'hourly', duration: '4小时', carName: '经济型 5座', carModel: '大众帕萨特', seats: '5座', amount: 280, serviceFee: 20, total: 300, status: '已完成', createdAt: '2026-07-01', customerName: '张三', customerPhone: '13800000001', driverName: '王师傅', orderType: '普通用户订单', paymentStatus: '已支付', acceptStatus: '已接单', dispatchStatus: '已完成', businessType: 'charter' },
  { id: 'HY20260701005', orderNo: 'HY20260701005', route: '广州 → 佛山祖庙', departCity: '广州', orderTime: '2026-07-01 08:05', departTime: '2026-07-01 10:00', endTime: undefined, tripDuration: undefined, packageType: 'hourly', duration: '4小时', carName: '经济型 5座', carModel: '大众帕萨特', seats: '5座', amount: 180, serviceFee: 20, total: 200, status: '已取消', createdAt: '2026-07-01', customerName: '张三', customerPhone: '13800000001', orderType: '普通用户订单', paymentStatus: '已退款', acceptStatus: '未接单', dispatchStatus: '未派车', businessType: 'custom' },
]


// ============ Mock 评价 ============
export const MOCK_REVIEWS: ReviewInfo[] = [
  { id: 1, stars: 5, content: '司机服务态度很好，车辆干净整洁，非常满意的一次出行体验！', driver: '王师傅', reply: '感谢您的认可，我们会继续努力！', date: '2026-07-01' },
  { id: 2, stars: 4, content: '整体不错，准时到达，车辆状况良好。建议可以多提供一些车内饮品。', driver: '李师傅', reply: '', date: '2026-06-28' },
]

// ============ Mock 发票 — 可开票订单 ============
export const MOCK_INVOICE_ORDERS = [
  { id: 1, orderNo: 'HY20260705007', route: '广州 → 广州南站', amount: 200, date: '2026-07-05', orderTime: '2026-07-04 19:45' },
  { id: 2, orderNo: 'HY20260702002', route: '深圳 → 广州南站', amount: 600, date: '2026-07-02', orderTime: '2026-07-02 07:15' },
  { id: 3, orderNo: 'HY20260701001', route: '广州 → 白云国际机场T2', amount: 300, date: '2026-07-01', orderTime: '2026-07-01 09:23' },
]

// ============ Mock 发票 — 已申请记录 ============
export const MOCK_INVOICE_RECORDS = [
  { id: 102, orderIds: ['HY20260702002'], orderNos: ['HY20260702002'], title: '李四', amount: 600, invoiceType: '个人', taxId: '', email: 'lisi@qq.com', status: '已开票', appliedAt: '2026-07-05 09:00', date: '2026-07-05' },
  { id: 101, orderIds: ['HY20260703003'], orderNos: ['HY20260703003'], title: '广州恒运出行有限公司', amount: 400, invoiceType: '企业', taxId: '91440101MA5XXXXX', email: 'finance@hengyun.com', status: '开票中', appliedAt: '2026-07-03 17:30', date: '2026-07-03' },
  { id: 100, orderIds: ['HY20260701001'], orderNos: ['HY20260701001'], title: '张三', amount: 300, invoiceType: '个人', taxId: '', email: 'zhangsan@qq.com', status: '申请中', appliedAt: '2026-07-02 10:15', date: '2026-07-02' },
]

// 兼容旧代码的 MOCK_INVOICES（管理端降级用）
export const MOCK_INVOICES = MOCK_INVOICE_RECORDS.map(r => ({
  id: r.id,
  orderNos: r.orderNos,
  orderNo: r.orderNos[0],
  title: r.title,
  amount: r.amount,
  date: r.date,
  invoiceType: r.invoiceType,
  taxId: r.taxId,
  email: r.email,
  status: r.status,
  appliedAt: r.appliedAt,
  orgName: '恒运',
  customerName: '',
  customerPhone: '',
}))
