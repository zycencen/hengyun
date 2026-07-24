import { useState, useMemo } from 'react'
import { Map, Clock, ClipboardList, Package } from 'lucide-react'
import type { BizType } from '@/types'
import { IntelligentDispatch } from '@/components/dispatch/IntelligentDispatch'
import { ScheduleManage } from '@/components/dispatch/ScheduleManage'
import { ShiftManage } from '@/components/dispatch/ShiftManage'
import { ScheduleList } from '@/components/dispatch/ScheduleList'
import CustomCharterDispatch from '@/components/dispatch/CustomCharterDispatch'

type BizTab = 'charter' | 'commute' | 'custom'
type SubTab = 'dispatch' | 'schedule' | 'shift' | 'scheduleList' | 'ctDispatch'

interface SubTabDef {
  key: SubTab
  label: string
  icon: React.ReactNode
}

const bizTabs: { key: BizTab; label: string }[] = [
  { key: 'charter', label: '包车调度管理' },
  { key: 'commute', label: '上下班车调度管理' },
  { key: 'custom', label: '定制包车调度管理' },
]

// 每个业务类型对应的子 Tab 配置
const bizSubTabMap: Record<BizTab, SubTabDef[]> = {
  charter: [
    { key: 'dispatch', label: '智能调度', icon: <Map className="w-4 h-4" /> },
  ],
  commute: [
    { key: 'shift', label: '班次管理', icon: <Clock className="w-4 h-4" /> },
    { key: 'scheduleList', label: '排班调度', icon: <ClipboardList className="w-4 h-4" /> },
  ],
  custom: [
    { key: 'ctDispatch', label: '定制包车调度', icon: <Package className="w-4 h-4" /> },
  ],
}

export function DispatchPage({ bizType: propBizType }: { bizType?: BizType } = {}) {
  const [bizTab, setBizTab] = useState<BizTab>(propBizType || 'charter')
  const [subTab, setSubTab] = useState<SubTab>('dispatch')

  const activeBizType = propBizType || bizTab
  const subTabs = useMemo(() => bizSubTabMap[activeBizType], [activeBizType])

  // 切换业务类型时重置子 Tab 到第一项
  const handleBizChange = (type: BizTab) => {
    setBizTab(type)
    setSubTab(bizSubTabMap[type][0].key)
  }

  // propBizType 变化时也重置
  useMemo(() => {
    if (propBizType) {
      setSubTab(bizSubTabMap[propBizType][0].key)
    }
  }, [propBizType])

  const bizLabel = activeBizType === 'charter' ? '包车调度管理' :
    activeBizType === 'commute' ? '上下班车调度管理' : '定制包车调度管理'

  return (
    <div className="h-full flex flex-col">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-slate-800">{bizLabel}</h1>
        <p className="text-sm text-slate-500 mt-1">智能调度、排班、车辆日历和行车日志</p>
      </div>

      {/* 业务类型 Tab — 仅当未从左侧菜单指定 bizType 时显示 */}
      {!propBizType && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {bizTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleBizChange(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                bizTab === tab.key
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 子功能 Tab — 根据业务类型动态显示 */}
      {subTabs.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-200 mb-4">
          {subTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                subTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 min-h-0">
        {subTab === 'dispatch' && <IntelligentDispatch businessType={activeBizType as BizType} />}
        {subTab === 'schedule' && <ScheduleManage />}
        {subTab === 'shift' && <ShiftManage />}
        {subTab === 'scheduleList' && <ScheduleList />}
        {subTab === 'ctDispatch' && <CustomCharterDispatch />}
      </div>
    </div>
  )
}

export default DispatchPage
