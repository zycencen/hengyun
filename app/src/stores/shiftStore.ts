// 班次数据共享模块 — ShiftManage 与 ScheduleList 共用
// 数据持久化到后端数据库，前端缓存同步

import {
  getShifts as apiGetShifts,
  createShift as apiCreateShift,
  updateShift as apiUpdateShift,
  deleteShift as apiDeleteShift,
  type AdminShiftItem,
} from '@/api/modules/admin'

export interface CommuteShift {
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
  createdAt: string
  driverId?: string
  driverName?: string
  driverPhone?: string
  driverPlate?: string
}

type Listener = () => void
const listeners = new Set<Listener>()

let _shifts: CommuteShift[] = []
let _loaded = false
let _loading = false
let _loadPromise: Promise<void> | null = null

function toCommuteShift(item: AdminShiftItem): CommuteShift {
  return {
    id: item.id,
    name: item.name,
    route: item.route,
    orderNo: item.orderNo,
    departureTime: item.departureTime,
    arrivalTime: item.arrivalTime,
    scheduleMode: item.scheduleMode,
    scheduleDays: item.scheduleDays,
    monthlyDays: item.monthlyDays,
    vehicleType: item.vehicleType,
    seatCount: item.seatCount,
    status: item.status,
    activeFrom: item.activeFrom,
    activeTo: item.activeTo,
    createdAt: item.createdAt,
    driverId: item.driverId,
    driverName: item.driverName,
    driverPhone: item.driverPhone,
    driverPlate: item.driverPlate,
  }
}

function notify() {
  listeners.forEach(fn => fn())
}

/** 从后端加载班次数据 */
export async function loadShifts(): Promise<void> {
  if (_loaded) return
  if (_loading && _loadPromise) return _loadPromise

  _loading = true
  _loadPromise = (async () => {
    try {
      const res = await apiGetShifts()
      _shifts = (res.list || []).map(toCommuteShift)
      _loaded = true
    } catch {
      console.warn('[shiftStore] 加载班次数据失败，使用缓存')
    } finally {
      _loading = false
      notify()
    }
  })()
  return _loadPromise
}

export function getShifts(): CommuteShift[] {
  return _shifts
}

export function getActiveShifts(): CommuteShift[] {
  return _shifts.filter(s => s.status === 'active')
}

export function setShifts(shifts: CommuteShift[]) {
  _shifts = shifts
  _loaded = true
  notify()
}

export async function addShift(shift: Omit<CommuteShift, 'id' | 'createdAt'>): Promise<CommuteShift> {
  const created = await apiCreateShift({
    name: shift.name,
    route: shift.route,
    orderNo: shift.orderNo,
    departureTime: shift.departureTime,
    arrivalTime: shift.arrivalTime,
    scheduleMode: shift.scheduleMode,
    scheduleDays: shift.scheduleDays,
    monthlyDays: shift.monthlyDays,
    vehicleType: shift.vehicleType,
    seatCount: shift.seatCount,
    status: shift.status,
    activeFrom: shift.activeFrom,
    activeTo: shift.activeTo,
  })
  const cs = toCommuteShift(created)
  _shifts = [..._shifts, cs]
  notify()
  return cs
}

export async function updateShift(id: number, data: Partial<CommuteShift>): Promise<void> {
  await apiUpdateShift(id, data)
  _shifts = _shifts.map(s => (s.id === id ? { ...s, ...data } : s))
  notify()
}

export async function deleteShift(id: number): Promise<void> {
  await apiDeleteShift(id)
  _shifts = _shifts.filter(s => s.id !== id)
  notify()
}

/** 获取下一个可用 ID（创建时预览用） */
export function nextShiftId(): number {
  return Math.max(0, ..._shifts.map(s => s.id)) + 1
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export const WEEK_DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function formatWeeklyDays(days: number[]): string {
  if (days.length === 0) return '-'
  return days.sort((a, b) => a - b).map(d => WEEK_DAY_LABELS[d - 1]).join('、')
}

export function formatMonthlyDays(days: number[]): string {
  if (days.length === 0) return '-'
  return days.sort((a, b) => a - b).map(d => `${d}号`).join('、')
}

/** 根据班次配置计算匹配的排班日期 */
export function calcShiftDates(shift: CommuteShift, from: string, to: string): string[] {
  if (!shift.activeFrom || !shift.activeTo) return []
  const dates: string[] = []
  const start = new Date(Math.max(new Date(shift.activeFrom).getTime(), new Date(from).getTime()))
  const end = new Date(Math.min(new Date(shift.activeTo).getTime(), new Date(to).getTime()))
  const cursor = new Date(start)

  while (cursor <= end) {
    let match = false
    if (shift.scheduleMode === 'weekly') {
      const dayOfWeek = cursor.getDay()
      const mapped = dayOfWeek === 0 ? 7 : dayOfWeek
      match = shift.scheduleDays.includes(mapped)
    } else {
      match = shift.monthlyDays.includes(cursor.getDate())
    }
    if (match) {
      dates.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** 生成的排班项（前端虚拟条目） */
export interface GeneratedScheduleEntry {
  _generated: true
  shiftId: number
  shiftName: string
  date: string
  route: string
  orderNo: string
  departTime: string
  returnTime: string
  passengerCount: number
  vehicleType: string
  charterType: string
  vehicleStatus: string
  fleet: string
  plateNumber: string
  driver: string
  phone: string
  charterContract: string
  unit: string
  dispatcher: string
  kilometers: number
  remark: string
}
