import { useState, useEffect, useMemo } from 'react'
import { useAppContext, useNavigation } from '@/store'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MapPin, Check, Loader2 } from 'lucide-react'
import { getCityList, type CityInfo } from '@/api/modules/car'

// 珠三角热门城市（用于分组展示，不在数据库中的会被自动过滤）
const HOT_CITY_NAMES = new Set([
  '广州', '深圳', '东莞', '佛山', '珠海', '惠州', '中山', '江门', '肇庆',
])

export default function CitySelectPage() {
  const { state, dispatch } = useAppContext()
  const { goBack } = useNavigation()
  const [search, setSearch] = useState('')
  const [cities, setCities] = useState<CityInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCityList(state.fleetOrgId).then(res => {
      if (Array.isArray(res)) {
        setCities(res as CityInfo[])
      }
    }).finally(() => setLoading(false))
  }, [state.fleetOrgId])

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities
    const s = search.trim().toLowerCase()
    return cities.filter(c => c.name.toLowerCase().includes(s) || c.name.includes(search.trim()))
  }, [search, cities])

  const hotCities = cities.filter(c => HOT_CITY_NAMES.has(c.name))

  const handleSelect = (city: string) => {
    dispatch({ type: 'SET_DEPART_CITY', payload: city })
    goBack()
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶栏 */}
      <SubNavbar title="选择出发城市" onBack={goBack} />

      {/* 搜索栏 */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索城市"
            className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-sm"
            autoFocus
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {!search.trim() && (
                <>
                  {/* 定位城市 */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-slate-700">当前选择</span>
                    </div>
                    <button
                      onClick={() => handleSelect(state.departCity)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-primary font-semibold text-sm cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      <span>{state.departCity}</span>
                      <Check className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 热门城市 */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-slate-700">珠三角城市</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {hotCities.map(city => (
                        <button
                          key={city.name}
                          onClick={() => handleSelect(city.name)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                            state.departCity === city.name
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95'
                          }`}
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 全国城市 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-slate-700">全国城市</span>
                    </div>
                  </div>
                </>
              )}

              {/* 城市列表 */}
              <div className="space-y-0.5">
                {filteredCities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => handleSelect(city.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                      state.departCity === city.name
                        ? 'bg-primary/5 text-primary font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <span>{city.name}</span>
                    {state.departCity === city.name && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
                {!loading && filteredCities.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">未找到匹配的城市</div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
