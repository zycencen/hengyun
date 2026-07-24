import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface DateTimePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onConfirm: (value: string) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function DateTimePicker({ open, onOpenChange, value, onConfirm }: DateTimePickerProps) {
  const today = new Date()
  // 最早可选时间 = 当前时间 + 2 小时
  const minDatetime = new Date(today.getTime() + 2 * 60 * 60 * 1000)
  // 今天的最后一个时间槽是 22:00，如果 minDatetime > 22:00 则今天全天不可选
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 22, 0)
  const isTodayFullyPast = minDatetime >= todayEnd

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // 初始化解析当前值
  const initFromValue = () => {
    let dateStr = value
    let timeStr = '14:00'

    // 先尝试解析 "今天 14:00" 格式
    const dayLabels: Record<string, number> = { '今天': 0, '明天': 1, '后天': 2 }
    for (const [label, offset] of Object.entries(dayLabels)) {
      if (value.startsWith(label)) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
        setSelectedDate({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() })
        const rest = value.slice(label.length).trim()
        if (rest) timeStr = rest
        setSelectedTime(timeStr)
        return
      }
    }

    // 再尝试解析 "2026-07-03 14:00" 标准格式
    const parts = value.split(' ')
    if (parts.length >= 2) {
      dateStr = parts[0]
      timeStr = parts[1]
    }
    const dateMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (dateMatch) {
      setSelectedDate({ year: +dateMatch[1], month: +dateMatch[2] - 1, day: +dateMatch[3] })
    } else {
      setSelectedDate({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() })
    }
    setSelectedTime(timeStr)
  }

  // 对话框打开时初始化
  useEffect(() => {
    if (open) {
      initFromValue()
      // 如果今天已无可用时间槽（当前时间+2h 超过 22:00），自动跳到明天
      const now = new Date()
      const minDt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0)
      if (minDt >= endOfDay) {
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        setSelectedDate({ year: tomorrow.getFullYear(), month: tomorrow.getMonth(), day: tomorrow.getDate() })
        setSelectedTime(null)
        if (tomorrow.getMonth() !== now.getMonth()) {
          setViewMonth(tomorrow.getMonth())
          setViewYear(tomorrow.getFullYear())
        }
      }
    }
  }, [open])

  const days = useMemo(() => {
    const totalDays = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= totalDays; d++) cells.push(d)
    return cells
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d < t
  }

  const isSelected = (day: number) =>
    selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day

  const formatDate = () => {
    if (!selectedDate) return ''
    const m = String(selectedDate.month + 1).padStart(2, '0')
    const d = String(selectedDate.day).padStart(2, '0')
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const selDate = new Date(selectedDate.year, selectedDate.month, selectedDate.day)
    const diff = Math.floor((selDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
    const label = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : `${selectedDate.year}-${m}-${d}`
    return `${label} ${selectedTime || ''}`
  }

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return
    onConfirm(formatDate())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) initFromValue(); onOpenChange(o) }}>
      <DialogContent className="max-w-md p-0 gap-0 sm:rounded-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            选择出发时间
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-2">
          {/* 月导航 */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {viewYear}年 {viewMonth + 1}月
            </span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* 星期头 */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-xs text-slate-400 py-1">{w}</div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, idx) => (
              <div key={idx} className="aspect-square flex items-center justify-center">
                {day ? (
                  <button
                    disabled={isPast(day) || (isToday(day) && isTodayFullyPast)}
                    onClick={() => setSelectedDate({ year: viewYear, month: viewMonth, day })}
                    className={`w-9 h-9 rounded-full text-sm flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isSelected(day)
                        ? 'bg-primary text-white font-semibold shadow-sm'
                        : isToday(day)
                          ? isTodayFullyPast
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-primary font-semibold hover:bg-primary/10'
                          : isPast(day)
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 时间选择 */}
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-slate-500">选择时间（最早可选当前时间+2小时）</span>
          </div>
          <ScrollArea className="h-32">
            <div className="grid grid-cols-4 gap-1.5 pr-2">
              {TIME_SLOTS.map(time => {
                const isSelectedToday = selectedDate &&
                  selectedDate.year === today.getFullYear() &&
                  selectedDate.month === today.getMonth() &&
                  selectedDate.day === today.getDate()
                const timeDisabled = !!isSelectedToday && (() => {
                  const [h, m] = time.split(':').map(Number)
                  const slotDate = new Date(selectedDate!.year, selectedDate!.month, selectedDate!.day, h, m)
                  return slotDate < minDatetime
                })()
                return (
                <button
                  key={time}
                  disabled={timeDisabled}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    timeDisabled
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : selectedTime === time
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95'
                  }`}
                >
                  {time}
                </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 预览 & 确认 */}
        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="text-slate-400 text-xs">已选：</span>
            <span className="font-semibold text-slate-800">{formatDate()}</span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            确定
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
