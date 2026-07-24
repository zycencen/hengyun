import { get, post, put, del } from '../request'
import request from '../request'
import type { OrderStatus } from './order'
import type { PackageType } from '@/types'

// ============ 类型 ============
export interface AdminLoginParams {
  username: string
  password: string
}

export interface AdminLoginResult {
  token: string
  user: { id: string; username: string; name: string; role: string; phone: string }
}

export interface DashboardData {
  todayOrders: number; todayRevenue: number; onlineDrivers: number; totalDrivers: number
  pendingOrders: number; completedOrders: number; monthlyRevenue: number; monthlyOrders: number
  recentOrders: { orderNo: string; customer: string; route: string; amount: number; status: string; time: string; orgName?: string }[]
  revenueTrend: { date: string; amount: number }[]
  orderTrend: { date: string; count: number }[]
}

export interface AdminOrderItem {
  id: string; orderNo: string; route: string; departCity: string
  orderTime: string; departTime: string; endTime?: string; tripDuration?: string
  packageType: string; duration: string; carName: string; carModel: string; seats: string
  amount: number; serviceFee: number; total: number; status: OrderStatus; createdAt: string
  orderType: import('./order').OrderType
  paymentStatus: import('./order').PaymentStatus
  acceptStatus: import('./order').AcceptStatus
  dispatchStatus: import('./order').DispatchStatus
  businessType: 'charter' | 'commute' | 'custom'
  customerName?: string; customerPhone?: string
  driverName?: string; driverPhone?: string; contractId?: string
  orgId?: string | null; orgName?: string
  // 结算相关
  deposit?: number; paidAmount?: number; balanceAmount?: number
  rideCount?: number; settlement?: string; createdBy?: string; remark?: string
}


export interface AdminOrderListResult {
  list: AdminOrderItem[]; total: number; page: number; pageSize: number
}

export interface AdminDriverItem {
  id: string; name: string; phone: string; avatar?: string; licenseNo: string
  vehiclePlate: string; vehicleType: string; status: string; rating: number
  orderCount: number; joinDate: string; city: string
  carId?: number | null; carPlate?: string; carModelName?: string; carSeats?: string; carImageUrl?: string
  fleetName?: string; fleet?: string
  orgId?: string | null; orgName?: string
  corpUserId?: string
}

export interface AdminDispatchItem {
  id: string; orderNo: string; route: string; departTime: string; carType: string
  driverId?: string; driverName?: string; vehiclePlate?: string
  contractId?: string; status: string; createdAt: string
}

export interface AdminContractItem {
  id: string
  contractNo: string
  partyA: string
  partyB: string
  origin: string
  destination: string
  plateNo: string
  driverName: string
  startDate: string
  endDate: string
  amount: number
  status: '履行中' | '即将到期' | '已过期'
  filingCreateTime: string
  orderNo: string
  fleet: string
  createdAt: string
}

export interface AdminContractTemplate {
  id: string; name: string; type: string; content: string; updatedAt: string
}

export interface AdminCarModelItem {
  id: string; name: string; brand: string; model: string; seats: number
  category: string; tags: string[]; imageUrl?: string; status: 'active' | 'inactive'
}

export interface AdminPriceItem {
  id: string; carModelId: string; carModelName: string; packageType: PackageType
  duration: string; price: number; kmLimit: number; overtimeRate: number; overKmRate: number; serviceFee: number; status: 'active' | 'inactive'
}

export interface AdminCustomerItem {
  id: string; name: string; phone: string; company: string
  isVip: boolean; isEnterpriseVerified: boolean
  userType: string; status: string; orderCount: number; totalAmount: number; createdAt: string
  orgs?: { id: string; name: string }[]
  orgName?: string
}

export interface UserOrgItem {
  id: string; name: string
}

export interface AdminFinanceData {
  todayRevenue: number; todayOrders: number; monthRevenue: number; monthOrders: number
}

/** 管理端发票项 */
export interface AdminInvoiceItem {
  id: number
  orderNos: string[]
  title: string
  amount: number
  invoiceType: string
  taxId: string
  email: string
  status: string       // '已申请' | '开票中' | '已开票'
  appliedAt: string
  customerName: string
  customerPhone: string
  date: string
}

export interface AdminUserItem {
  id: string; username: string; name: string; role: string; phone: string; status: string; createdAt: string
}

// ============ API ============

/** 管理端登录 */
export function adminLogin(params: AdminLoginParams) {
  return post<AdminLoginResult>('/user/admin/login', params)
}

/** 仪表盘数据 */
export function getDashboard() {
  return get<DashboardData>('/admin/dashboard')
}

/** 订单列表 */
export function getAdminOrders(params?: { status?: string; search?: string; businessType?: string; page?: number; pageSize?: number }) {
  return get<AdminOrderListResult>('/admin/orders', params as Record<string, unknown>)
}

/** 派单 */
export function dispatchOrder(orderId: string, driverId: string, contractId: string) {
  return post<{ success: boolean }>('/admin/orders/dispatch', { orderId, driverId, contractId })
}

/** 确认接单（未支付/已支付 → 已接单） */
export function acceptOrder(orderId: string) {
  return post<AdminOrderItem>('/admin/orders/accept', { orderId })
}

/** 订单回滚 */
export function rollbackOrder(orderId: string) {
  return post<AdminOrderItem>('/admin/orders/rollback', { orderId })
}

/** 完成订单 */
export function completeOrder(orderId: string) {
  return post<AdminOrderItem>('/admin/orders/complete', { orderId })
}

/** 调度列表 */
export function getDispatches() {
  return get<AdminDispatchItem[]>('/admin/dispatches')
}

/** 合同列表 */
export function getContracts() {
  return get<AdminContractItem[]>('/admin/contracts')
}

/** 新增合同 */
export function createContract(data: {
  contractNo: string; partyA: string; partyB?: string; origin?: string; destination?: string
  plateNo?: string; driverName?: string; startDate: string; endDate: string
  amount?: number; filingCreateTime?: string; orderNo?: string; fleet?: string
}) {
  return post<AdminContractItem>('/admin/contracts', data)
}

/** 合同模板列表 */
export function getContractTemplates() {
  return get<AdminContractTemplate[]>('/admin/contract-templates')
}

/** 车辆列表 */
export function getVehicles() {
  return get<import('./car').CarInfo[]>('/admin/vehicles')
}

/** 车辆日历事件（排班占用时间） */
export function getVehicleCalendarEvents(startDate: string, endDate: string) {
  return get<import('@/types').VehicleCalendarEvent[]>('/admin/vehicle-calendar-events', { startDate, endDate })
}

/** 新增车辆 */
export function createVehicle(data: Partial<import('./car').CarInfo> & { carModelId?: string }) {
  return post<import('./car').CarInfo>('/admin/vehicles', data)
}

/** 更新车辆 */
export function updateVehicle(id: number, data: Partial<import('./car').CarInfo> & { carModelId?: string }) {
  return put<import('./car').CarInfo>(`/admin/vehicles/${id}`, data)
}

/** 车型配置列表 */
export function getCarModels() {
  return get<AdminCarModelItem[]>('/admin/car-models')
}

/** 价格配置列表 */
export function getPrices() {
  return get<AdminPriceItem[]>('/admin/prices')
}

/** 新增价格配置 */
export function createPrice(data: {
  carModelId: string; carModelName: string; packageType: string; duration: string
  price: number; kmLimit: number; overtimeRate: number; overKmRate: number; serviceFee: number
}) {
  return post<AdminPriceItem>('/admin/prices', data)
}

/** 更新价格配置 */
export function updatePrice(id: string, data: Partial<{
  carModelId: string; carModelName: string; packageType: string; duration: string
  price: number; kmLimit: number; overtimeRate: number; overKmRate: number; serviceFee: number; status: string
}>) {
  return put<AdminPriceItem>(`/admin/prices/${id}`, data)
}

/** 切换价格配置状态 */
export function togglePrice(id: string) {
  return put<{ id: string; status: string }>(`/admin/prices/${id}/toggle`)
}

/** 删除价格配置 */
export function deletePrice(id: string) {
  return del<{ id: string }>(`/admin/prices/${id}`)
}

/** 上传车辆图片 */
export function uploadVehicleImage(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('image', file)
  return request.post('/admin/vehicles/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<{ url: string }>
}

/** 司机列表 */
export function getDrivers() {
  return get<AdminDriverItem[]>('/admin/drivers')
}

/** 新增司机 */
export function createDriver(data: {
  name: string; phone: string; licenseNo: string; city?: string; carId?: number | null; corpUserId?: string
}) {
  return post<AdminDriverItem>('/admin/drivers', data)
}

/** 更新司机 */
export function updateDriver(id: string, data: {
  name?: string; phone?: string; licenseNo?: string; city?: string; carId?: number | null; corpUserId?: string
}) {
  return put<AdminDriverItem>(`/admin/drivers/${id}`, data)
}

/** 删除司机 */
export function deleteDriver(id: string) {
  return del<null>(`/admin/drivers/${id}`)
}

/** 审核司机 */
export function auditDriver(id: string, approved: boolean) {
  return put<{ status?: string }>(`/admin/drivers/${id}/audit`, { approved })
}

/** 用户列表 */
export function getCustomers() {
  return get<AdminCustomerItem[]>('/admin/users')
}

/** 更新用户（设置用户类型等） */
export function updateCustomer(id: string, data: { userType?: string }) {
  return put<AdminCustomerItem>(`/admin/users/${id}`, data)
}

/** 获取用户关联组织 */
export function getUserOrgs(userId: number) {
  return get<UserOrgItem[]>(`/admin/users/${userId}/orgs`)
}

/** 设置用户关联组织 */
export function updateUserOrgs(userId: number, orgIds: string[]) {
  return put<UserOrgItem[]>(`/admin/users/${userId}/orgs`, { orgIds })
}

/** 财务数据 */
export function getFinance() {
  return get<AdminFinanceData>('/admin/finance')
}

/** 管理端发票列表 */
export function getAdminInvoices(params?: { search?: string; status?: string; invoiceType?: string }) {
  return get<AdminInvoiceItem[]>('/admin/invoices', params as Record<string, unknown>)
}

/** 更新发票状态 */
export function updateInvoiceStatus(id: number, status: string) {
  return put<{ id: number; status: string }>(`/admin/invoices/${id}/status`, { status })
}

/** 管理端用户列表 */
export function getAdminUsers() {
  return get<AdminUserItem[]>('/admin/admin-users')
}

/** 新建管理员 */
export function createAdminUser(data: { username: string; name: string; role?: string; phone?: string; password: string; orgId?: string | null }) {
  return post<AdminUserItem>('/admin/admin-users', data)
}

/** 更新管理员 */
export function updateAdminUser(id: string, data: { username?: string; name?: string; role?: string; phone?: string; password?: string; orgId?: string | null; status?: string }) {
  return put<AdminUserItem>(`/admin/admin-users/${id}`, data)
}

/** 更新管理员组织归属 */
export function updateAdminOrg(id: string, orgId: string | null) {
  return put<{ id: string; orgId: string | null; orgName: string }>(`/admin/admin-users/${id}/org`, { orgId })
}

// ========== 调度排班管理 ==========

export interface AdminScheduleItem {
  id: number
  date: string
  charterContract: string
  fleet: string
  charterType: string
  plateNumber: string
  departTime: string
  passengerCount: number
  unit: string
  driver: string
  route: string
  vehicleStatus: string
  dispatcher: string
  kilometers: number
  returnTime: string
  phone: string
  remark: string
  orgId: string
  orderNo: string
  status: string
  notifyStatus: string
  createdAt: string
  updatedAt: string
}

export interface AdminScheduleListResult {
  list: AdminScheduleItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 获取排班列表 */
export function getSchedules(params?: {
  search?: string; dateFrom?: string; dateTo?: string; fleet?: string; page?: number; pageSize?: number
}) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params?.dateTo) query.set('dateTo', params.dateTo)
  if (params?.fleet && params.fleet !== 'all') query.set('fleet', params.fleet)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return get<AdminScheduleListResult>(`/admin/schedules${qs ? '?' + qs : ''}`)
}

/** 新增排班 */
export function createSchedule(data: Partial<AdminScheduleItem> & { date: string }) {
  return post<AdminScheduleItem>('/admin/schedules', data)
}

/** 车辆冲突信息 */
export interface VehicleConflictInfo {
  id: number
  date: string
  departTime: string
  returnTime: string
  route: string
  driver: string
  charterContract: string
  status: string
}

/** 校验车辆时间段冲突 */
export function checkVehicleConflict(plateNumber: string, date: string, departTime: string, returnTime?: string, excludeId?: number) {
  return get<{ hasConflict: boolean; conflicts: VehicleConflictInfo[] }>('/admin/schedules/check-vehicle-conflict', {
    plateNumber, date, departTime, returnTime, excludeId,
  })
}

/** 更新排班 */
export function updateSchedule(id: number, data: Partial<AdminScheduleItem>) {
  return put<AdminScheduleItem>(`/admin/schedules/${id}`, data)
}

/** 删除排班 */
export function deleteSchedule(id: number) {
  return del<{ id: number }>(`/admin/schedules/${id}`)
}

/** 批量确认排班 */
export function confirmSchedules(ids: number[]) {
  return post<{ ids: number[] }>('/admin/schedules/confirm', { ids })
}

/** 批量通知司机（更新通知状态） */
export function notifySchedulesStatus(ids: number[]) {
  return post<{ ids: number[] }>('/admin/schedules/notify-status', { ids })
}

/** 导出排班数据 (返回 blob 触发下载) */
export async function exportSchedules(params?: {
  search?: string; dateFrom?: string; dateTo?: string; fleet?: string
}) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params?.dateTo) query.set('dateTo', params.dateTo)
  if (params?.fleet && params.fleet !== 'all') query.set('fleet', params.fleet)
  const qs = query.toString()

  const token = localStorage.getItem('admin_token')
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
  const res = await fetch(`${baseURL}/admin/schedules/export${qs ? '?' + qs : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('导出失败')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `调度排班_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 下载导入模板 */
export async function downloadScheduleTemplate() {
  const token = localStorage.getItem('admin_token')
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
  const res = await fetch(`${baseURL}/admin/schedules/template`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('下载模板失败')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '调度排班导入模板.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 批量导入排班数据 */
export function importSchedules(rows: Record<string, string>[]) {
  return post<{ success: number; errors: string[]; total: number; message: string }>('/admin/schedules/import', { rows })
}

/** 一键通知今日排班司机（可指定排班ID数组，不传则通知全部） */
export function notifySchedules(scheduleIds?: number[]) {
  return post<{ notified: number; failedCount: number; totalSchedules: number; details: { driverName: string; phone: string; taskCount: number; routes: string; departTimes: string }[]; failedDetails: { driverName: string; phone: string; reason: string }[] }>('/admin/schedules/notify', { scheduleIds })
}

// ========== 评价管理 ==========

export interface AdminReviewItem {
  id: number
  orderId: string
  stars: number
  content: string
  driverName: string
  reply: string
  date: string
  city: string
  route: string
  orgId: string
}

export interface AdminReviewListResult {
  list: AdminReviewItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ========== 组织架构 ==========

export interface OrgItem {
  id: string; name: string; parentId: string | null; path: string; level: number; sortOrder: number; createdAt: string
}

export function getOrganizations() {
  return get<OrgItem[]>('/admin/organizations')
}

export function createOrganization(data: { name: string; parentId?: string | null }) {
  return post<OrgItem>('/admin/organizations', data)
}

export function updateOrganization(id: string, data: { name: string; parentId?: string | null }) {
  return put<OrgItem>(`/admin/organizations/${id}`, data)
}

export function deleteOrganization(id: string) {
  return del<null>(`/admin/organizations/${id}`)
}

// ========== 角色权限 ==========

export interface RoleItem {
  id: string; name: string; code: string; description: string; isSystem: boolean; permissions: string[]; createdAt: string
}

export interface PermissionDefItem {
  key: string; group: string; label: string
}

export function getRoles() {
  return get<RoleItem[]>('/admin/roles')
}

export function createRole(data: { name: string; code: string; description?: string; permissions?: string[] }) {
  return post<RoleItem>('/admin/roles', data)
}

export function updateRole(id: string, data: { name?: string; code?: string; description?: string }) {
  return put<RoleItem>(`/admin/roles/${id}`, data)
}

export function deleteRole(id: string) {
  return del<null>(`/admin/roles/${id}`)
}

export function updateRolePermissions(id: string, permissions: string[]) {
  return put<{ id: string; permissions: string[] }>(`/admin/roles/${id}/permissions`, { permissions })
}

export function getPermissionDefs() {
  return get<PermissionDefItem[]>('/admin/permission-defs')
}

/** 删除订单（仅待付款） */
export function deleteOrder(orderId: string) {
  return del<{ success: boolean }>(`/admin/orders/${orderId}`)
}

/** 手动录入订单（上下班/定制包车） */
export interface ManualOrderParams {
  bizType: 'commute' | 'custom'
  customerName: string
  customerPhone: string
  carName: string
  seats?: string
  rideCount: number
  amount: number
  deposit: number
  contractId?: string
  remark?: string
  orgId?: string
}
export function createManualOrder(params: ManualOrderParams) {
  return post<AdminOrderItem>('/admin/orders/manual', params as unknown as Record<string, unknown>)
}

/** 结账（追加付款） */
export function settleOrder(orderId: string, paidAmount: number) {
  return put<AdminOrderItem>(`/admin/orders/${orderId}/settlement`, { paidAmount })
}

// ========== 需求管理（通勤 + 定制） ==========

export interface DemandItem {
  id: number
  name: string
  phone: string
  city: string
  status: string        // 待处理 | 已联系 | 已成交 | 已关闭
  adminNote: string
  createdAt: string
  company?: string       // 通勤独有
  demand?: string        // 定制独有
}

export type DemandType = 'commute' | 'custom'

/** 获取通勤车申请列表 */
export function getCommuteDemands() {
  return get<DemandItem[]>('/admin/demands/commute')
}

/** 获取定制包车需求列表 */
export function getCustomDemands() {
  return get<DemandItem[]>('/admin/demands/custom')
}

/** 更新需求状态/备注 */
export function updateDemand(type: DemandType, id: number, data: { status?: string; adminNote?: string }) {
  return put<DemandItem>(`/admin/demands/${type}/${id}`, data)
}

// ========== 车队管理 ==========

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

export interface FleetItem {
  id: string
  orgId: string
  orgName: string
  name: string
  leaderName: string
  leaderPhone: string
  logo: string
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

export interface FleetFormData {
  orgId: string
  name: string
  leaderName: string
  leaderPhone: string
  logo: string
  serviceEnabled: boolean
  entryEnabled: boolean
  entryConfig: FleetEntryConfig
}

/** 获取车队列表 */
export function getFleets() {
  return get<FleetItem[]>('/admin/fleets')
}

/** 创建车队 */
export function createFleet(data: FleetFormData) {
  return post<FleetItem>('/admin/fleets', data)
}

/** 更新车队 */
export function updateFleet(id: string, data: Partial<FleetFormData>) {
  return put<FleetItem>(`/admin/fleets/${id}`, data)
}

/** 删除车队 */
export function deleteFleet(id: string) {
  return del<null>(`/admin/fleets/${id}`)
}

/** 上传车队 LOGO */
export function uploadFleetLogo(file: File) {
  const formData = new FormData()
  formData.append('logo', file)
  // 不手动设置 Content-Type，让 axios 自动处理 FormData（包含正确的 boundary）
  return post<{ url: string }>('/admin/fleets/upload-logo', formData)
}

// ========== 定制包车调度管理 ==========

/** 定制包车订单（用于调度） */
export interface CustomCharterOrder {
  id: number
  orderNo: string
  customerName: string
  customerPhone: string
  route: string
  departCity: string
  departTime: string
  endTime: string
  tripDuration: string
  packageType: string
  duration: string
  carName: string
  carModel: string
  seats: string
  amount: number
  total: number
  status: string
  dispatchStatus: string
  orderType: string
  createdAt: string
  vehicles: CustomCharterDispatchItem[]
}

/** 定制包车调度记录 */
export interface CustomCharterDispatchItem {
  id: number
  date: string
  orderNo: string
  fleet: string
  plateNumber: string
  driver: string
  departTime: string
  returnTime: string
  passengerCount: number
  route: string
  unit: string
  phone: string
  remark: string
  kilometers: number
  status: string
  notifyStatus: string
  createdAt?: string
  updatedAt?: string
}

/** 获取定制包车订单列表（含已派车辆） */
export function getCustomCharterOrders(params?: {
  search?: string; status?: string; page?: number; pageSize?: number
}) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.status) query.set('status', params.status)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return get<{ list: CustomCharterOrder[]; total: number; page: number; pageSize: number; totalPages: number }>(
    `/admin/custom-charter-orders${qs ? '?' + qs : ''}`
  )
}

/** 获取定制包车调度记录 */
export function getCustomCharterSchedules(params?: {
  orderNo?: string; search?: string; fleet?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number
}) {
  const query = new URLSearchParams()
  if (params?.orderNo) query.set('orderNo', params.orderNo)
  if (params?.search) query.set('search', params.search)
  if (params?.fleet) query.set('fleet', params.fleet)
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params?.dateTo) query.set('dateTo', params.dateTo)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return get<{ list: CustomCharterDispatchItem[]; total: number; page: number; pageSize: number; totalPages: number }>(
    `/admin/custom-charter-schedules${qs ? '?' + qs : ''}`
  )
}

/** 新增定制包车调度 */
export function createCustomCharterSchedule(data: {
  date: string; orderNo?: string; fleet?: string; plateNumber: string; driver?: string
  departTime?: string; returnTime?: string; passengerCount?: number
  route?: string; unit?: string; phone?: string; remark?: string; kilometers?: number
}) {
  return post<CustomCharterDispatchItem>('/admin/custom-charter-schedules', data)
}

/** 更新定制包车调度 */
export function updateCustomCharterSchedule(id: number, data: Partial<CustomCharterDispatchItem>) {
  return put<CustomCharterDispatchItem>(`/admin/custom-charter-schedules/${id}`, data)
}

/** 删除定制包车调度 */
export function deleteCustomCharterSchedule(id: number) {
  return del<{ id: number }>(`/admin/custom-charter-schedules/${id}`)
}

// ========== 城市管理 ==========

export interface FleetCityRef {
  fleetId: string
  fleetName: string
}

export interface CityItem {
  id: number
  name: string
  sortOrder: number
  createdAt: string
  fleetId?: string      // 当按车队筛选时返回
  fleets?: FleetCityRef[] // 全局查询时返回该城市关联的车队列表
}

/** 获取城市列表（可按车队筛选） */
export function getCities(fleetId?: string) {
  return get<CityItem[]>('/admin/cities', fleetId ? { fleetId } : {})
}

/** 添加城市（可指定关联车队） */
export function createCity(name: string, fleetId?: string) {
  return post<CityItem>('/admin/cities', { name, fleetId: fleetId || undefined })
}

/** 删除城市（可从指定车队移除或全局删除） */
export function deleteCity(id: number, fleetId?: string) {
  const query = fleetId ? `?fleetId=${fleetId}` : ''
  return del<{ success: boolean }>(`/admin/cities/${id}${query}`)
}

// ========== 评价管理 ==========

/** 获取评价列表 */
export function getAdminReviews(params?: {
  search?: string; stars?: number; orgId?: string; page?: number; pageSize?: number
}) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.stars) query.set('stars', String(params.stars))
  if (params?.orgId) query.set('orgId', params.orgId)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return get<AdminReviewListResult>(`/admin/reviews${qs ? '?' + qs : ''}`)
}

/** 回复评价 */
export function replyReview(id: number, reply: string) {
  return post<{ id: number; reply: string }>(`/admin/reviews/${id}/reply`, { reply })
}

/** 删除评价 */
export function deleteReview(id: number) {
  return del<{ id: number }>(`/admin/reviews/${id}`)
}

// ========== 上下班班次管理 ==========

export interface AdminShiftItem {
  id: number
  name: string
  route: string
  orderNo: string
  departureTime: string
  arrivalTime: string
  scheduleMode: 'weekly' | 'monthly'
  scheduleDays: number[]
  monthlyDays: number[]
  vehicleType: string
  seatCount: number
  status: 'active' | 'inactive'
  activeFrom: string
  activeTo: string
  orgId?: string
  createdAt: string
  updatedAt: string
  driverId?: string
  driverName?: string
  driverPhone?: string
  driverPlate?: string
}

export interface AdminShiftListResult {
  list: AdminShiftItem[]
  total: number
}

/** 获取班次列表 */
export function getShifts(params?: { search?: string; status?: string }) {
  return get<AdminShiftListResult>('/admin/shifts', params as Record<string, unknown>)
}

/** 新增班次 */
export function createShift(data: Omit<AdminShiftItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return post<AdminShiftItem>('/admin/shifts', data)
}

/** 更新班次 */
export function updateShift(id: number, data: Partial<AdminShiftItem>) {
  return put<AdminShiftItem>(`/admin/shifts/${id}`, data)
}

/** 删除班次 */
export function deleteShift(id: number) {
  return del<{ id: number }>(`/admin/shifts/${id}`)
}

// ========== 部署管理 ==========

export interface SyncStatusResult {
  lastSync: { admin_name: string; created_at: string } | null
  testStatus: { backend: string; frontend: string }
  prodStatus: { backend: string; frontend: string }
}

export interface SyncResult {
  output: string
}

/** 获取同步状态 */
export function getSyncStatus() {
  return get<SyncStatusResult>('/admin/sync-status')
}

/** 触发测试→正式环境同步 */
export function syncToProd() {
  return post<SyncResult>('/admin/sync-to-prod')
}

