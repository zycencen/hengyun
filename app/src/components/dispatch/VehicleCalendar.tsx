import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { CarInfo, VehicleCalendarEvent, VehicleCalendarStatus } from '@/types'
import { getVehicles, getVehicleCalendarEvents } from '@/api/modules/admin'

const HOUR_WIDTH = 40
const DAYS = ['一', '二', '三', '四', '五', '六', '日']

const STATUS_CONFIG: Record<VehicleCalendarStatus, { label: string; bg: string; text: string; border: string }> = {
  free: { label: '空闲', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  booked: { label: '已预订', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  dispatched: { label: '出车中', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  maintenance: { label: '维修中', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
}

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number) {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function formatMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function parseLocal(str: string) {
  const [date, time] = str.split(' ')
  if (!date || !time) return null
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

function eventPosition(event: VehicleCalendarEvent, weekStart: Date) {

  const start = parseLocal(event.startTime)
  const end = parseLocal(event.endTime)
  if (!start || !end) return null

  const startDay = Math.floor((start.getTime() - weekStart.getTime()) / 86400000)
  if (startDay < 0 || startDay >= 7) return null

  const left = (startDay * 24 + start.getHours() + start.getMinutes() / 60) * HOUR_WIDTH
  const width = ((end.getTime() - start.getTime()) / 3600000) * HOUR_WIDTH
  return { left, width: Math.max(width, 20) }
}

export function VehicleCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [vehicles, setVehicles] = useState<CarInfo[]>([])
  const [events, setEvents] = useState<VehicleCalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerDate, setPickerDate] = useState(() => new Date())

  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const isSyncing = useRef(false)

  // 同步表头、车身与固定列的滚动
  const syncFromBody = useCallback(() => {
    if (isSyncing.current) return
    isSyncing.current = true
    try {
      const body = bodyScrollRef.current
      const header = headerScrollRef.current
      if (!body) return
      if (header) header.scrollLeft = body.scrollLeft
    } finally {
      isSyncing.current = false
    }
  }, [])

  const syncFromHeader = useCallback(() => {
    if (isSyncing.current) return
    isSyncing.current = true
    try {
      const body = bodyScrollRef.current
      const header = headerScrollRef.current
      if (header && body) body.scrollLeft = header.scrollLeft
    } finally {
      isSyncing.current = false
    }
  }, [])

  const syncFromLeft = useCallback(() => {
    if (isSyncing.current) return
    isSyncing.current = true
    try {
      const body = bodyScrollRef.current
      const left = leftScrollRef.current
      if (left && body) body.scrollTop = left.scrollTop
    } finally {
      isSyncing.current = false
    }
  }, [])

  // 右侧区域鼠标滚轮 → 同步到左侧滚动条
  const handleBodyWheel = useCallback((e: React.WheelEvent) => {
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop += e.deltaY
    }
  }, [])

  const handleHeaderWheel = useCallback((e: React.WheelEvent) => {
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop += e.deltaY
    }
  }, [])

  useEffect(() => {
    getVehicles().then(res => setVehicles(res as CarInfo[])).catch(() => setVehicles([]))
  }, [])

  // 获取当前周的排班日历事件
  useEffect(() => {
    const start = weekStart
    const end = addDays(weekStart, 6)
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    setLoadingEvents(true)
    getVehicleCalendarEvents(fmt(start), fmt(end))
      .then(res => setEvents(res as VehicleCalendarEvent[]))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false))
  }, [weekStart])

  // 点击外部关闭日期选择器
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    if (showDatePicker) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDatePicker])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const timelineWidth = 7 * 24 * HOUR_WIDTH

  const changeWeek = (n: number) => setWeekStart(prev => addDays(prev, n * 7))
  const goToday = () => { setWeekStart(startOfWeek(new Date())); setPickerDate(new Date()) }

  // 跳转到指定日期所在周
  const jumpToDate = (d: Date) => {
    setWeekStart(startOfWeek(d))
    setPickerDate(d)
    setShowDatePicker(false)
  }

  // 日历选择器：当月网格
  const pickerYear = pickerDate.getFullYear()
  const pickerMonth = pickerDate.getMonth()
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(pickerYear, pickerMonth, 1).getDay() || 7
  const today = new Date()
  const isInSelectedWeek = (d: Date) => {
    const ws = startOfWeek(d)
    return ws.getTime() === weekStart.getTime()
  }
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-primary/50 hover:text-primary transition-colors"
          >
            本周
          </button>
          <button
            onClick={() => changeWeek(1)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:text-primary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 ml-2 relative" ref={pickerRef}>
            <button
              onClick={() => { setShowDatePicker(!showDatePicker); setPickerDate(new Date(weekStart.getTime() + 3 * 86400000)) }}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm text-slate-700 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span>{weekDays[0].toLocaleDateString('zh-CN')} — {weekDays[6].toLocaleDateString('zh-CN')}</span>
            </button>

            {/* 日期选择器弹窗 */}
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-4 w-[280px]">
                {/* 月份导航 */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setPickerDate(new Date(pickerYear, pickerMonth - 1, 1))}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {pickerYear}年{pickerMonth + 1}月
                  </span>
                  <button
                    onClick={() => setPickerDate(new Date(pickerYear, pickerMonth + 1, 1))}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 星期表头 */}
                <div className="grid grid-cols-7 mb-1">
                  {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                    <div key={d} className="text-center text-[11px] text-slate-400 py-1">{d}</div>
                  ))}
                </div>

                {/* 日期网格 */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfWeek - 1 }, (_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = new Date(pickerYear, pickerMonth, i + 1)
                    const selected = isInSelectedWeek(d)
                    const todayClass = isToday(d)
                    return (
                      <button
                        key={i}
                        onClick={() => jumpToDate(d)}
                        className={`h-8 rounded text-xs font-medium transition-colors
                          ${selected ? 'bg-primary text-white hover:bg-primary/90' : ''}
                          ${!selected && todayClass ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : ''}
                          ${!selected && !todayClass ? 'text-slate-600 hover:bg-slate-100' : ''}
                        `}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>

                {/* 快捷操作 */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => jumpToDate(new Date())}
                    className="flex-1 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    回到本周
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {(Object.keys(STATUS_CONFIG) as VehicleCalendarStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${STATUS_CONFIG[s].bg} border ${STATUS_CONFIG[s].border}`} />
              <span className="text-slate-600">{STATUS_CONFIG[s].label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 日历主体 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* 表头 */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <div className="w-[180px] shrink-0 px-4 py-3 text-sm font-medium text-slate-600 border-r border-slate-200 bg-slate-50">
            车辆 / 车牌
          </div>
          <div
            ref={headerScrollRef}
            onScroll={syncFromHeader}
            onWheel={handleHeaderWheel}
            className="flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar:horizontal]:hidden [scrollbar-width:none]"
          >
            <div className="flex" style={{ width: timelineWidth, minWidth: timelineWidth }}>
              {weekDays.map((day, i) => (
                <div key={i} className="flex-1 border-r border-slate-100 last:border-r-0">
                  <div className="px-2 py-2 text-center text-sm font-medium text-slate-700">
                    周{DAYS[i]} <span className="text-slate-400 font-normal">{formatMD(day)}</span>
                  </div>
                  <div className="flex border-t border-slate-100">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div
                        key={h}
                        className="shrink-0 border-r border-slate-50 text-[10px] text-slate-400 text-center py-1"
                        style={{ width: HOUR_WIDTH }}
                      >
                        {h % 4 === 0 ? h : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 车辆行 */}
        <div className="flex max-h-[520px]">
          {/* 固定车辆列 */}
          <div
            ref={leftScrollRef}
            onScroll={syncFromLeft}
            className="w-[180px] shrink-0 max-h-[520px] overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-slate-50"
          >
            {vehicles.length === 0 && (
              <div className="min-h-[64px] px-4 py-3 text-sm text-slate-400 flex items-center justify-center">暂无车辆数据</div>
            )}
            {vehicles.map((vehicle, idx) => (
              <div key={`info-${vehicle.id}`} className={`min-h-[64px] px-4 py-3 flex flex-col justify-center border-b border-slate-100 last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="text-sm font-medium text-slate-700">{vehicle.model || vehicle.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{vehicle.seats}{vehicle.plate ? ` · ${vehicle.plate}` : ''}</div>
              </div>
            ))}
          </div>

          {/* 可滚动时间轴 */}
          <div
            ref={bodyScrollRef}
            onScroll={syncFromBody}
            onWheel={handleBodyWheel}
            className="flex-1 max-h-[520px] overflow-x-auto overflow-y-hidden"
          >
            <div style={{ width: timelineWidth, minWidth: timelineWidth }}>
              {vehicles.length === 0 && (
                <div className="min-h-[64px] flex items-center justify-center text-sm text-slate-400">暂无车辆数据</div>
              )}
              {vehicles.map((vehicle, idx) => {
                const vehicleEvents = events.filter(e => String(e.vehicleId) === String(vehicle.id))
                return (
                  <div key={`row-${vehicle.id}`} className={`relative min-h-[64px] border-b border-slate-100 last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    {/* 小时背景格 */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: 7 * 24 }, (_, i) => (
                        <div
                          key={i}
                          className={`shrink-0 h-full border-r border-slate-50 ${i % 24 === 0 ? 'border-l border-slate-100' : ''}`}
                          style={{ width: HOUR_WIDTH }}
                        />
                      ))}
                    </div>

                    {/* 空闲占位（整周空闲） */}
                    {vehicleEvents.length === 0 && (
                      <div className="absolute inset-y-2 left-0 right-0 flex items-center justify-center">
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">空闲</span>
                      </div>
                    )}

                    {/* 事件块 */}
                    {vehicleEvents.map(event => {
                      const pos = eventPosition(event, weekStart)
                      if (!pos) return null
                      const cfg = STATUS_CONFIG[event.status]
                      return (
                        <div
                          key={event.id}
                          className={`absolute top-2 bottom-2 rounded-md border px-2 py-1 text-xs overflow-hidden ${cfg.bg} ${cfg.text} ${cfg.border} cursor-pointer hover:brightness-95 transition-all`}
                          style={{ left: pos.left, width: pos.width }}
                          title={`${event.route || cfg.label} ${event.startTime} ~ ${event.endTime}`}
                        >
                          <div className="font-medium truncate">{event.route || cfg.label}</div>
                          {pos.width > 80 && (
                            <div className="truncate opacity-80 mt-0.5">
                              {event.orderNo || event.driverName}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
