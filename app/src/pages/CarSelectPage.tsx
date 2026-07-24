import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppContext, useToast, useNavigation } from '@/store'
import { useCars } from '@/hooks'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { createOrder } from '@/api/modules/order'
import { Clock, Calendar, MapPin, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'

/** 根据选中的套餐和时长，从车辆价格映射中取价格 */
function getPriceFromConfig(car: any, packageType: string, durationLabel: string): number {
  const key = `${packageType}_${durationLabel}`
  return car?.prices?.[key]?.price ?? (packageType === 'hourly' ? car?.hourlyPrice ?? 0 : car?.dailyPrice ?? 0)
}

export default function CarSelectPage() {
  const { state, dispatch } = useAppContext()
  const showToast = useToast()
  const { navigateTo, goBack } = useNavigation()
  const { cars, hourlyDurations, dailyDurations, loading } = useCars()
  const [creating, setCreating] = useState(false)

  const durations = state.packageType === 'hourly' ? hourlyDurations : dailyDurations

  // 选中车辆变更时，自动切换到一个有时长价格配置的选项
  useEffect(() => {
    const selectedCar = cars.find(c => c.id === state.selectedCar)
    if (!selectedCar?.prices) return
    const dur = durations[state.selectedDuration]
    if (!dur) return
    const key = `${state.packageType}_${dur.label}`
    if (key in selectedCar.prices) return // 当前选择的时长有价格，无需切换
    // 找到第一个有价格配置的时长
    const firstValidIdx = durations.findIndex(d => `${state.packageType}_${d.label}` in selectedCar.prices!)
    if (firstValidIdx >= 0) {
      dispatch({ type: 'SET_SELECTED_DURATION', payload: firstValidIdx })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedCar, state.packageType])

  const handleSubmit = async () => {
    const car = cars.find(c => c.id === state.selectedCar)
    if (!car) {
      showToast('请选择一辆车')
      return
    }
    setCreating(true)
    try {
      const dur = durations[state.selectedDuration]
      const order = await createOrder({
        bizType: state.bizType,
        departCity: state.departCity,
        departTime: state.departTime,
        packageType: state.packageType,
        duration: dur?.label || '4小时',
        carId: car.id,
        fleetOrgId: state.fleetOrgId || undefined,
      })
      dispatch({ type: 'SET_CURRENT_ORDER_ID', payload: order.id })
      dispatch({ type: 'SET_VIEWING_ORDER_ID', payload: order.id })
      navigateTo('order-detail')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '下单失败，请重试'
      showToast(msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <SubNavbar title="选择车辆" onBack={goBack} />

      <ScrollArea className="flex-1">
        {/* 行程信息条 */}
        <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3.5 flex items-center gap-3 mb-0 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xs">
              <div className="text-slate-400">出发城市</div>
              <div className="text-sm font-semibold text-slate-800">{state.departCity}</div>
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xs">
              <div className="text-slate-400">出发时间</div>
              <div className="text-sm font-semibold text-slate-800">{state.departTime}</div>
            </div>
          </div>
          <button onClick={goBack} className="ml-auto text-xs text-primary font-medium cursor-pointer hover:underline flex items-center gap-0.5">
            修改<ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* 套餐切换 */}
        <div className="px-4 mt-3">
          <div className="flex bg-slate-100 rounded-xl p-1.5">
            {[
              { key: 'hourly' as const, label: '按小时包', icon: Clock },
              { key: 'daily' as const, label: '按天包', icon: Calendar },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => dispatch({ type: 'SET_PACKAGE_TYPE', payload: opt.key })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 cursor-pointer ${
                  state.packageType === opt.key
                    ? 'bg-white text-primary font-semibold shadow-sm shadow-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <opt.icon className="w-4 h-4" />{opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 时长选择 */}
        <div className="px-4 mt-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {state.packageType === 'hourly' ? '选择时长' : '选择天数'}
          </span>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
            {durations.map((d, idx) => {
              // 只显示被选中车辆有价格配置的时长
              const selectedCar = cars.find(c => c.id === state.selectedCar)
              if (selectedCar?.prices && !(`${state.packageType}_${d.label}` in selectedCar.prices)) {
                return null
              }
              const isSelected = state.selectedDuration === idx
              return (
                <button
                  key={idx}
                  onClick={() => dispatch({ type: 'SET_SELECTED_DURATION', payload: idx })}
                  className={`flex-shrink-0 flex flex-col items-center justify-center text-center px-4 py-3 min-w-[76px] rounded-2xl border-2 text-[13px] transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-gradient-to-b from-indigo-50 to-white text-primary font-semibold shadow-sm'
                      : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[15px] font-bold">{d.label}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{d.sublabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 车辆列表 */}
        <div className="px-4 mt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">可选车辆</span>
            <span className="text-[11px] text-slate-400">{cars.length} 款车型</span>
          </div>
          {loading && cars.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">加载中...</div>
          ) : (
            cars.map(car => {
              const isSelected = state.selectedCar === car.id
              const durLabel = durations[state.selectedDuration]?.label || ''
              const price = getPriceFromConfig(car, state.packageType, durLabel)
              const unit = state.packageType === 'hourly' ? (durLabel || '') : '天'
              return (
                <div
                  key={car.id}
                  onClick={() => dispatch({ type: 'SET_SELECTED_CAR', payload: car.id })}
                  className={`bg-white rounded-2xl p-4 mb-3 flex gap-3.5 items-center border-2 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-gradient-to-r from-indigo-50/80 to-white shadow-md shadow-primary/5'
                      : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* 车辆图片：有上传图片时显示真实图片，否则用 SVG 占位 */}
                  <div className="relative w-[72px] h-14 rounded-xl flex-shrink-0 overflow-hidden" style={car.imageUrl ? {} : { backgroundColor: `${car.color}12` }}>
                    {car.imageUrl ? (
                      <img src={car.imageUrl} alt={car.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 72 56" fill="none" className="w-full h-full p-1.5">
                        <rect x="4" y="10" width="22" height="18" rx="5" fill={car.color} opacity="0.25" />
                        <rect x="30" y="6" width="34" height="26" rx="6" fill={car.color} opacity="0.15" />
                        <rect x="8" y="14" width="14" height="10" rx="3" fill={car.color} opacity="0.4" />
                        <rect x="36" y="10" width="22" height="18" rx="4" fill={car.color} opacity="0.3" />
                        <circle cx="12" cy="44" r="6" fill="#475569" />
                        <circle cx="58" cy="42" r="7" fill="#475569" />
                        <circle cx="12" cy="44" r="2.5" fill="#94A3B8" />
                        <circle cx="58" cy="42" r="3" fill="#94A3B8" />
                      </svg>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-slate-800">{car.name}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-500 font-medium">{car.seats}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{car.model} · {car.capacity}</div>
                    <div className="flex gap-1.5 mt-2">
                      {car.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/5 text-primary border border-primary/10">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-baseline gap-0.5 justify-end">
                      <span className="text-xs text-slate-400 font-medium">¥</span>
                      <span className={`text-xl font-extrabold ${isSelected ? 'text-accent' : 'text-slate-800'}`}>{price}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">/{unit}</div>
                  </div>
                </div>
              )
            })
          )}

          {/* 底部预定按钮 */}
          <div className="mt-1">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs text-slate-400">
                已选：<strong className="text-slate-700">{cars.find(c => c.id === state.selectedCar)?.name || '--'}</strong>
              </span>
              <span className="text-xs text-slate-400">
                套餐：<strong className="text-slate-700">{state.packageType === 'hourly' ? '按小时' : '按天'} · {durations[state.selectedDuration]?.label || '--'}</strong>
              </span>
            </div>
            <Button
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 shadow-lg shadow-accent/25 text-base font-bold"
              onClick={handleSubmit}
              disabled={creating}
            >
              {creating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />下单中...</> : '立即预定'}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
