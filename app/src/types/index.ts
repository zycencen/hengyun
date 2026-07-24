// ============ 共享类型定义 ============

export type BizType = 'charter' | 'commute' | 'custom'

// 多维度状态类型
export type OrderType = '普通用户订单' | '大客户订单'
export type PaymentStatus = '未支付' | '已支付' | '已退款'
export type AcceptStatus = '未接单' | '已接单'
export type DispatchStatus = '未派车' | '已派车' | '已完成'

/** 订单状态（原 status 改为计算态） */
export type OrderStatus =
  | '待付款'
  | '待接单'
  | '待派车'
  | '进行中'
  | '已完成'
  | '已取消'
  | '已关闭'

export type PackageType = 'hourly' | 'daily'


/** 价格详情（对应一条价格配置） */
export interface PriceDetail {
  price: number
  kmLimit: number
  overtimeRate: number
  overKmRate: number
  serviceFee: number
}

/** 车辆价格映射：key = "hourly_4小时" 或 "daily_1天" */
export type CarPriceMap = Record<string, PriceDetail>

// 车辆
export interface CarInfo {
  id: number
  name: string
  seats: string
  model: string
  capacity: string
  tags: string[]
  hourlyPrice: number
  dailyPrice: number
  color: string
  imageUrl?: string
  status?: 'available' | 'busy' | 'offline'
  plate?: string
  carModelId?: string
  /** 价格配置映射 */
  prices?: CarPriceMap
  /** 所属组织名称 */
  orgName?: string
}

export interface DurationOption {
  label: string
  sublabel: string
  /** 里程限制（从价格配置读取） */
  kmLimit?: number
}

// 订单
export interface OrderInfo {
  id: string
  orderNo: string
  route: string
  departCity: string
  orderTime: string       // 下单时间
  departTime: string       // 出发时间
  endTime?: string         // 结束时间
  tripDuration?: string    // 用车时长，如 "4小时30分"
  packageType: PackageType
  duration: string
  carName: string
  carModel: string
  seats: string
  amount: number
  serviceFee: number
  total: number
  kmLimit: number        // 里程限制(km)
  overtimeRate: number   // 超时费率(元/h)
  overKmRate: number     // 超公里费率(元/km)
  status: OrderStatus
  createdAt: string
  customerName?: string    // 下单人
  customerPhone?: string   // 下单人手机
  driverName?: string
  driverPhone?: string
  contractId?: string
  orgId?: string            // 订单归属组织ID
  orgName?: string          // 订单归属组织名称
  fleetId?: string          // 车队ID（通过车队入口下单时）
  // 多维度状态
  orderType: OrderType
  paymentStatus: PaymentStatus
  acceptStatus: AcceptStatus
  dispatchStatus: DispatchStatus
  /** 业务类型：包车(charter) / 上下班(commute) / 定制(custom) */
  businessType: BizType
  // 结算相关字段（上下班/定制包车）
  deposit?: number           // 定金
  paidAmount?: number        // 累计已付
  balanceAmount?: number     // 待结尾款
  rideCount?: number         // 用车次数
  settlement?: 'none' | 'partial' | 'done'  // 结账状态
  createdBy?: 'user' | 'dispatcher'         // 创建来源
  remark?: string            // 备注
}


// 用户
export interface UserProfile {
  id: number
  name: string
  phone: string
  company: string
  avatar?: string
  isVip: boolean
  isEnterpriseVerified: boolean
  userType?: string
  orgs?: { id: string; name: string }[] | null
}

// 评价
export interface ReviewInfo {
  id: number
  stars: number
  content: string
  driver: string
  reply: string
  date: string
}

// 发票
export interface InvoiceInfo {
  id: number
  orderNo: string
  title: string
  amount: number
  date: string
  selected?: boolean
  orgName?: string
}

// 订单状态映射
export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  '待付款': { label: '待付款', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-amber-500' },
  '待接单': { label: '待接单', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-l-orange-500' },
  '待派车': { label: '待派车', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-l-blue-500' },
  '进行中': { label: '进行中', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-l-indigo-500' },
  '已完成': { label: '已完成', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-500' },
  '已取消': { label: '已取消', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-l-slate-300' },
  '已关闭': { label: '已关闭', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-l-slate-200' },
}

// 支付状态映射
export const PAYMENT_STATUS_MAP: Record<PaymentStatus, string> = {
  '未支付': '未支付',
  '已支付': '已支付',
  '已退款': '已退款',
}

// 接单状态映射
export const ACCEPT_STATUS_MAP: Record<AcceptStatus, string> = {
  '未接单': '未接单',
  '已接单': '已接单',
}

// 调度状态映射
export const DISPATCH_STATUS_MAP: Record<DispatchStatus, string> = {
  '未派车': '未派车',
  '已派车': '已派车',
  '已完成': '已完成',
}


// ============ 管理端类型 ============

// 司机
export interface DriverInfo {
  id: string
  name: string
  phone: string
  avatar?: string
  licenseNo: string
  vehiclePlate: string
  vehicleType: string
  status: 'online' | 'offline' | 'busy' | 'pending'
  rating: number
  orderCount: number
  joinDate: string
  city: string
  orgId?: string | null     // 所属组织ID
  orgName?: string          // 所属组织名称
}

// 合同
export interface ContractInfo {
  id: string
  contractNo: string
  partyA: string          // 甲方
  partyB: string          // 乙方
  origin: string          // 出发地
  destination: string     // 目的地
  plateNo: string         // 车牌号
  driverName: string      // 驾驶员
  startDate: string       // 开始时间
  endDate: string         // 结束时间
  amount: number
  status: '履行中' | '即将到期' | '已过期'
  filingCreateTime: string // 备案创建时间
  orderNo: string          // 关联订单号
  fleet: string            // 关联车队
  createdAt: string
}

// 合同模板
export interface ContractTemplate {
  id: string
  name: string
  type: string
  content: string
  updatedAt: string
}

// 车型配置
export interface CarModelConfig {
  id: string
  name: string
  brand: string
  model: string
  seats: number
  category: string
  tags: string[]
  imageUrl?: string
  status: 'active' | 'inactive'
}

// 价格配置
export interface PriceConfig {
  id: string
  carModelId: string
  carModelName: string
  packageType: PackageType
  duration: string
  price: number
  kmLimit: number
  overtimeRate: number
  overKmRate: number
  serviceFee: number
  status: 'active' | 'inactive'
  orgName?: string
}

// 调度任务
export interface DispatchTask {
  id: string
  orderNo: string
  route: string
  departTime: string
  carType: string
  driverId?: string
  driverName?: string
  vehiclePlate?: string
  contractId?: string
  status: 'pending' | 'assigned' | 'confirmed' | 'completed'
  createdAt: string
}

// 管理端用户
export interface AdminUser {
  id: string
  username: string
  name: string
  role: 'superadmin' | 'admin' | 'operator' | 'finance'
  phone: string
  status: 'active' | 'disabled'
  createdAt: string
  /** 所属组织ID */
  orgId?: string | null
  /** 所属组织名称 */
  orgName?: string
}

// 组织架构节点
export interface Organization {
  id: string
  name: string
  parentId: string | null
  path: string
  level: number
  sortOrder: number
  createdAt: string
  /** UI 辅助：子组织列表 */
  children?: Organization[]
}

// 角色
export interface Role {
  id: string
  name: string
  code: string
  description: string
  isSystem: boolean
  permissions: string[]
  createdAt: string
}

// 权限定义
export interface PermissionDef {
  key: string
  group: string
  label: string
}

// 车队用户端入口权限配置
export interface FleetEntryConfig {
  home?: boolean
  order?: boolean
  orderList?: boolean
  profile?: boolean
  invoice?: boolean
  reviews?: boolean
  settings?: boolean
  showCharter?: boolean
  showCommute?: boolean
  showCustom?: boolean
  bannerTitle?: string
  bannerSubtitle?: string
}

// 车队信息
export interface FleetInfo {
  id: string
  orgId: string
  orgName: string
  name: string
  leaderName: string
  leaderPhone: string
  serviceEnabled: boolean
  entryEnabled: boolean
  entryConfig: FleetEntryConfig
  driverCount: number
  vehicleCount: number
  totalOrders: number
  rejectRate: number
  rating: number
  createdAt: string
}

// ============ 调度管理类型 ============

/** 车辆日历事件状态 */
export type VehicleCalendarStatus = 'free' | 'booked' | 'dispatched' | 'maintenance'

/** 车辆日历事件 */
export interface VehicleCalendarEvent {
  id: string
  vehicleId: number | string
  startTime: string   // YYYY-MM-DD HH:mm
  endTime: string     // YYYY-MM-DD HH:mm
  status: VehicleCalendarStatus
  orderNo?: string
  route?: string
  driverName?: string
}

/** 行车日志填写状态 */
export type DrivingLogFillStatus = 'filled' | 'unfilled' | 'filling'

/** 行车日志 */
export interface DrivingLog {
  id: string
  plateNo: string
  fleet: string
  driverName: string
  driverPhone: string
  fillStatus: DrivingLogFillStatus
  fillTime?: string
  vehicleStatus: 'running' | 'annual_review' | 'repair'
  mileage?: number
  fuelCost?: number
  tollCost?: number
  remark?: string
}

/** 地图车辆（智能调度） */
export interface MapVehicle {
  id: string
  plateNo: string
  driverName: string
  vehicleType: string
  status: 'online' | 'busy' | 'offline'
  x: number   // 0-100 百分比
  y: number   // 0-100 百分比
  rating: number
  orderCount: number
}

/** 智能调度推荐车辆 */
export interface RecommendedVehicle extends DriverInfo {
  score: number
  distance: number    // km
  eta: number         // min
}

