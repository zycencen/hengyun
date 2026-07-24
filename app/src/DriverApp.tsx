import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDriverReviewStats } from '@/api/modules/review'
import type { ReviewItem } from '@/api/modules/review'
import {
  ArrowLeft,
  Star,
  Phone,
  HeadphonesIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Bell,
  FileText,
  Megaphone,
  ClipboardCheck,
  Camera,
} from 'lucide-react'

// ============ 类型 ============
type DriverTab = 'work' | 'messages' | 'profile'
type DriverPage = 'work' | 'messages' | 'profile' | 'pending-logs' | 'license' | 'reviews' | 'customer' | 'settings'

// ============ Toast ============
function Toast({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-5 py-2.5 rounded-lg text-sm z-[200] animate-in fade-in">
      {message}
    </div>
  )
}

// ============ 子页面导航 ============
function SubNavbar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-white flex items-center justify-center h-12 px-4 border-b border-slate-100 flex-shrink-0">
      <button onClick={onBack} className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-sm text-slate-700 cursor-pointer hover:text-primary transition-colors duration-200">
        <ArrowLeft className="w-5 h-5" />返回
      </button>
      <span className="text-[17px] font-semibold text-slate-800">{title}</span>
    </div>
  )
}

// ============ 底部 Tab ============
function DriverTabBar({ activeTab, onTabChange }: { activeTab: DriverTab; onTabChange: (t: DriverTab) => void }) {
  const tabs: { key: DriverTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'work',
      label: '工作台',
      icon: <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/><path d="M5 12l2-6h10l2 6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>,
    },
    {
      key: 'messages',
      label: '消息',
      icon: <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    },
    {
      key: 'profile',
      label: '我的',
      icon: <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ]

  return (
    <div className="h-14 bg-white border-t border-slate-200 flex flex-shrink-0 z-20">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors duration-200 cursor-pointer ${activeTab === tab.key ? 'text-primary' : 'text-slate-400'}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

// ============ 出车日志弹窗 ============
function DepartSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [health, setHealth] = useState('良好')
  const [traffic, setTraffic] = useState('畅通')
  const [passengerCount, setPassengerCount] = useState('42')
  const [pledgeConfirmed, setPledgeConfirmed] = useState(true)

  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div className="w-full max-h-[88%] overflow-y-auto bg-white rounded-t-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-800">出车日志</h3>
        <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">请完成出车前日志。天气和路况由系统接口自动获取，四告诫需司机确认后才能出车。</p>

        <div className="mt-4 space-y-3">
          {/* 天气 */}
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="text-sm font-bold text-slate-400">天气情况（天气API自动获取）</div>
            <div className="mt-1 text-lg font-extrabold text-slate-700">广州 多云 31℃</div>
          </div>

          {/* 身体情况 */}
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="text-sm font-bold text-slate-400">司机身体情况</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['良好', '感冒', '发烧'].map(h => (
                <label key={h} className={`flex items-center justify-center gap-1.5 min-h-[42px] border rounded-md text-[15px] font-bold cursor-pointer transition-all ${health === h ? 'border-primary bg-indigo-50 text-primary' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input type="radio" name="health" value={h} checked={health === h} onChange={e => setHealth(e.target.value)} className="accent-primary" />
                  {h}
                </label>
              ))}
            </div>
          </div>

          {/* 路况 */}
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="text-sm font-bold text-slate-400">路况情况（地图API自动获取）</div>
            <div className="mt-1 text-lg font-extrabold text-slate-700">当前路况：畅通</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['拥堵', '畅通'].map(t => (
                <label key={t} className={`flex items-center justify-center gap-1.5 min-h-[42px] border rounded-md text-[15px] font-bold cursor-pointer transition-all ${traffic === t ? 'border-primary bg-indigo-50 text-primary' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input type="radio" name="traffic" value={t} checked={traffic === t} onChange={e => setTraffic(e.target.value)} className="accent-primary" />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* 实载人数 */}
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <label className="text-sm font-bold text-slate-400">实载人数</label>
            <Input
              type="number"
              min={0}
              max={55}
              value={passengerCount}
              onChange={e => setPassengerCount(e.target.value)}
              placeholder="请输入实际乘车人数"
              className="mt-2"
            />
          </div>

          {/* 四告诫 */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="font-extrabold text-slate-700 mb-2">四告诫（语音播报）</div>
            <div className="text-[15px] text-slate-600 leading-relaxed">
              出车前落实安全承诺工作：不超速、不超员、不疲劳驾驶、不酒驾；严禁行车打电话，保持 GPS 正常运行；精神状态良好，无服用影响安全驾驶的药物。
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-sm">
                <Megaphone className="w-4 h-4 mr-1" />播放语音
              </Button>
              <label className={`flex items-center justify-center gap-1.5 min-h-[42px] border rounded-md text-[15px] font-bold cursor-pointer ${pledgeConfirmed ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                <input type="checkbox" checked={pledgeConfirmed} onChange={e => setPledgeConfirmed(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
                已确认
              </label>
            </div>
          </div>

          {/* 拍摄车辆照片 */}
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="text-sm font-bold text-slate-400">拍摄车辆照片</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['前45°', '后45°', '车胎'].map(label => (
                <div key={label} className="min-h-[76px] border border-dashed border-slate-300 rounded-lg bg-white text-primary flex items-center justify-center text-sm font-extrabold cursor-pointer hover:border-primary hover:bg-indigo-50 transition-colors">
                  <Camera className="w-4 h-4 mr-1" />{label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2.5">
          <Button variant="outline" size="lg" onClick={onClose}>取消</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={onConfirm}>提交日志并出车</Button>
        </div>
      </div>
    </div>
  )
}

// ============ 收车检查弹窗 ============
function ReturnSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: (hasIssue: boolean) => void }) {
  const [checks, setChecks] = useState<boolean[]>(Array(18).fill(true))
  const [remark, setRemark] = useState('')
  const [result, setResult] = useState('无隐患')

  const items = [
    '四轮气压、轮胎螺母、胎面、钢圈',
    '前后大灯、转向灯、防雾灯、前后车牌牌照',
    '转向系（方向机、横直拉杆和尚头）',
    '制动系（阀门、气包、连接螺栓）、手动驻车',
    '传动系（转动轴螺栓、万向十字轴及保险片卡簧）',
    '油箱（箱盖）、电瓶（通气孔、正负极桩头）、电解液',
    '发动机（润滑油、防冻液、怠速运转）',
    '空气滤清器、进气管',
    '工具箱、行李舱',
    '内部方向机、油门刹车、离合器、排档',
    '仪表、指示灯',
    '雨刮器、喇叭',
    '车辆倒视镜',
    '行车架、座椅、扶手、窗帘、安全带、安全锤',
    '门窗玻璃',
    '灭火器、备胎、打气皮管、三角架',
    '总电源、电器线路',
    '底盘',
  ]

  const toggleCheck = (idx: number) => {
    setChecks(prev => prev.map((c, i) => i === idx ? !c : c))
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div className="w-full max-h-[88%] overflow-y-auto bg-white rounded-t-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-800">收车检查</h3>
        <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">请完成回场检查。勾选表示"良好"，未勾选表示"存在隐患"。存在隐患必须停班维修。</p>

        <div className="mt-4 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="p-2.5 border border-slate-200 rounded-lg bg-white">
              <div className="text-[15px] font-bold text-slate-700 leading-snug">{item}</div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checks[idx]}
                    onChange={() => toggleCheck(idx)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className={checks[idx] ? 'text-emerald-600 font-extrabold' : 'text-red-500'}>
                    {checks[idx] ? '良好' : '存在隐患'}
                  </span>
                </label>
                <span>不选为存在隐患</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-[13px] font-bold text-slate-500">补充说明</label>
          <textarea
            className="mt-1.5 w-full border border-slate-200 rounded-md p-2.5 text-sm resize-none min-h-[76px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="如有异常，请填写隐患位置和处理说明"
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-50">
          <div className="text-base font-extrabold text-slate-700">检查结果</div>
          <p className="text-[13px] text-slate-400 mt-1">存在隐患必须停班维修。</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className={`flex items-center justify-center gap-1.5 min-h-[42px] border rounded-md text-[15px] font-bold cursor-pointer ${result === '无隐患' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
              <input type="radio" name="checkResult" value="无隐患" checked={result === '无隐患'} onChange={e => setResult(e.target.value)} className="accent-emerald-600" />
              无隐患
            </label>
            <label className={`flex items-center justify-center gap-1.5 min-h-[42px] border rounded-md text-[15px] font-bold cursor-pointer ${result === '有隐患' ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-600'}`}>
              <input type="radio" name="checkResult" value="有隐患" checked={result === '有隐患'} onChange={e => setResult(e.target.value)} className="accent-red-500" />
              有隐患
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2.5">
          <Button variant="outline" size="lg" onClick={onClose}>取消</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={() => onConfirm(result === '有隐患')}>提交收车</Button>
        </div>
      </div>
    </div>
  )
}

// ============ 补录收车弹窗 ============
function FinishSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div className="w-full max-h-[88%] overflow-y-auto bg-white rounded-t-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-800">补录收车完成</h3>
        <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">用于今日任务时间已过但司机未点击收车的情况。提交后订单进入"已完成"，平台保留补录痕迹。</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[13px] font-bold text-slate-500">实际结束时间</label>
            <Input className="mt-1.5" defaultValue="2026-06-12 10:18" />
          </div>
          <div>
            <label className="text-[13px] font-bold text-slate-500">结束里程</label>
            <Input className="mt-1.5" defaultValue="86.4 公里" />
          </div>
          <div>
            <label className="text-[13px] font-bold text-slate-500">补录原因</label>
            <textarea
              className="mt-1.5 w-full border border-slate-200 rounded-md p-2.5 text-sm resize-none min-h-[76px] focus:outline-none focus:ring-2 focus:ring-primary/20"
              defaultValue="已按时送达，因现场协助乘客搬运行李，未及时点击收车。"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2.5">
          <Button variant="outline" size="lg" onClick={onClose}>取消</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={onConfirm}>提交并闭环</Button>
        </div>
      </div>
    </div>
  )
}

// ============ 行车日志弹窗（无任务时） ============
function VehicleLogSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [status, setStatus] = useState('停班')
  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div className="w-full max-h-[88%] overflow-y-auto bg-white rounded-t-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-800">行车日志</h3>
        <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">当天没有出车任务与维修事项时，请补充车辆日志，便于车队确认车辆状态。</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[13px] font-bold text-slate-500">日志日期时间</label>
            <Input className="mt-1.5" defaultValue="2026-06-15" />
          </div>
          <div>
            <label className="text-[13px] font-bold text-slate-500">出车日期</label>
            <Input className="mt-1.5" defaultValue="2026-06-15" />
          </div>
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="text-sm font-bold text-slate-400">车辆状态</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['停班', '年审', '维修', '车场移车'].map(s => (
                <label key={s} className={`flex items-center justify-center gap-1.5 min-h-[42px] border rounded-md text-[15px] font-bold cursor-pointer transition-all ${status === s ? 'border-primary bg-indigo-50 text-primary' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input type="radio" name="vehicleLogStatus" value={s} checked={status === s} onChange={e => setStatus(e.target.value)} className="accent-primary" />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2.5">
          <Button variant="outline" size="lg" onClick={onClose}>取消</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={onConfirm}>提交日志</Button>
        </div>
      </div>
    </div>
  )
}

// ============ 主组件 ============
export default function DriverApp() {
  const [currentPage, setCurrentPage] = useState<DriverPage>('work')
  const [activeTab, setActiveTab] = useState<DriverTab>('work')
  const [showToast, setShowToast] = useState('')
  const [showDepartSheet, setShowDepartSheet] = useState(false)
  const [showReturnSheet, setShowReturnSheet] = useState(false)
  const [showFinishSheet, setShowFinishSheet] = useState(false)
  const [showVehicleLogSheet, setShowVehicleLogSheet] = useState(false)
  const [currentTaskStatus, setCurrentTaskStatus] = useState<'driving' | 'none'>('driving')
  const [nextTaskStatus, setNextTaskStatus] = useState<'waiting' | 'driving'>('waiting')
  const [closureResolved, setClosureResolved] = useState(false)
  const [pendingLogCount, setPendingLogCount] = useState(1)

  // 评价数据
  const [driverRating, setDriverRating] = useState(4.9)
  const [driverReviewCount, setDriverReviewCount] = useState(128)
  const [driverReviews, setDriverReviews] = useState<ReviewItem[]>([])
  const DRIVER_NAME = '王师傅'

  useEffect(() => {
    getDriverReviewStats(DRIVER_NAME)
      .then(data => {
        setDriverRating(data.avgRating)
        setDriverReviewCount(data.reviewCount)
        setDriverReviews(data.reviews)
      })
      .catch(() => {
        // API 失败时使用默认值
      })
  }, [])

  const showToastMsg = (msg: string) => {
    setShowToast(msg)
    setTimeout(() => setShowToast(''), 1600)
  }

  const handleTabChange = (tab: DriverTab) => {
    setActiveTab(tab)
    if (tab === 'work') setCurrentPage('work')
    else if (tab === 'messages') setCurrentPage('messages')
    else setCurrentPage('profile')
  }

  const goSubPage = (page: DriverPage) => {
    setCurrentPage(page)
  }

  const backToWork = () => {
    setCurrentPage('work')
    setActiveTab('work')
  }

  const backToProfile = () => {
    setCurrentPage('profile')
    setActiveTab('profile')
  }

  const confirmDepart = () => {
    setShowDepartSheet(false)
    setNextTaskStatus('driving')
    showToastMsg('已出车，行程开始记录')
  }

  const confirmReturn = (hasIssue: boolean) => {
    setShowReturnSheet(false)
    if (currentTaskStatus === 'driving') {
      setCurrentTaskStatus('none')
      setNextTaskStatus('driving')
      showToastMsg(hasIssue ? '已收车，车辆隐患已上报' : '已收车，当前任务已完成')
    } else {
      showToastMsg(hasIssue ? '已收车，车辆隐患已上报' : '已收车')
    }
  }

  const confirmFinish = () => {
    setShowFinishSheet(false)
    setClosureResolved(true)
    showToastMsg('已提交，任务完成闭环')
  }

  const confirmVehicleLog = () => {
    setShowVehicleLogSheet(false)
    setPendingLogCount(0)
    showToastMsg('行车日志已提交')
  }

  const isSubPage = !['work', 'messages', 'profile'].includes(currentPage)

  return (
    <div className="min-h-screen bg-[#F4F4F4] font-sans">
      <div className="mx-auto max-w-md min-h-screen bg-[#F4F4F4] flex flex-col shadow-2xl relative">
        {/* 顶部状态栏 + 头部 */}
        {!isSubPage && (
          <>
            <div className="h-11 bg-primary-900 text-white flex items-center justify-between px-4 flex-shrink-0 text-sm font-semibold">
              <span>9:41</span>
              <span>5G 100%</span>
            </div>
            <div className="h-14 bg-primary text-white flex items-center justify-between px-4 flex-shrink-0">
              <span className="text-xl font-bold">
                {activeTab === 'work' ? '司机工作台' : activeTab === 'messages' ? '消息' : '我的'}
              </span>
              {activeTab === 'work' && (
                <div className="h-8 px-3 rounded-full bg-white/15 flex items-center gap-1.5 text-[13px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  在线
                </div>
              )}
            </div>
          </>
        )}

        {/* 主内容 */}
        <div className="flex-1 overflow-hidden relative">
          {/* ===== 工作台 ===== */}
          {currentPage === 'work' && (
            <ScrollArea className="h-full">
              {/* 指标卡片 */}
              <div className="grid grid-cols-3 bg-white mx-4 mt-3 rounded-lg overflow-hidden shadow-sm">
                <div className="py-3 text-center border-r border-slate-100">
                  <div className="text-2xl font-extrabold text-primary">{currentTaskStatus === 'driving' ? '1' : '0'}</div>
                  <div className="mt-1 text-[13px] text-slate-400">当前任务</div>
                </div>
                <div
                  className="py-3 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => goSubPage('pending-logs')}
                >
                  <div className="text-2xl font-extrabold text-primary">{pendingLogCount}</div>
                  <div className="mt-1 text-[13px] text-slate-400">待填行车日志</div>
                </div>
                <div className="py-3 text-center">
                  <div className="text-2xl font-extrabold text-primary">{driverRating}</div>
                  <div className="mt-1 text-[13px] text-slate-400">服务评分</div>
                </div>
              </div>

              {/* 当前任务 */}
              {currentTaskStatus === 'driving' && (
                <>
                  <h3 className="px-4 pt-4 pb-2 text-lg font-extrabold text-slate-700">当前任务</h3>
                  <div className="mx-4 bg-white rounded-lg shadow-sm p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold text-primary bg-indigo-50">出车中</span>
                      <span className="inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold text-accent bg-orange-50">已行驶 1小时28分</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">订单号：HY20260608005</div>

                    {/* 路线 */}
                    <div className="mt-3 grid grid-cols-[16px_1fr] gap-2.5">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        <div className="w-0.5 flex-1 min-h-[28px] bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      </div>
                      <div>
                        <div className="text-[17px] font-extrabold text-slate-700">深圳腾讯滨海大厦</div>
                        <div className="text-[17px] font-extrabold text-slate-700 mt-1.5">广州天河体育中心</div>
                      </div>
                    </div>

                    {/* 详情网格 */}
                    <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 text-sm">
                      <div className="text-slate-400">出行时间<strong className="block mt-1 text-slate-700 text-[15px]">2026-06-12 08:00</strong></div>
                      <div className="text-slate-400">用车时长<strong className="block mt-1 text-slate-700 text-[15px]">1天 / 24小时</strong></div>
                      <div className="text-slate-400">用车人<strong className="block mt-1 text-slate-700 text-[15px]">张** / 138****6789</strong></div>
                      <div className="text-slate-400">出行人数<strong className="block mt-1 text-slate-700 text-[15px]">5人</strong></div>
                      <div className="text-slate-400">车型要求<strong className="block mt-1 text-slate-700 text-[15px]">7座商务车</strong></div>
                      <div className="text-slate-400">任务类型<strong className="block mt-1 text-slate-700 text-[15px]">广州+包车</strong></div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" onClick={() => showToastMsg('正在拨打用车人')}>
                        <Phone className="w-4 h-4 mr-1" />联系
                      </Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => showToastMsg('正在启动导航')}>
                        <Navigation className="w-4 h-4 mr-1" />导航
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setShowReturnSheet(true)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />收车
                      </Button>
                    </div>

                    {/* 时间线 */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex gap-2 text-[13px] text-emerald-600">
                        <span className="w-2 h-2 mt-1.5 rounded-full bg-current flex-shrink-0" />
                        <span>07:10 已完成车辆检查</span>
                      </div>
                      <div className="flex gap-2 text-[13px] text-emerald-600">
                        <span className="w-2 h-2 mt-1.5 rounded-full bg-current flex-shrink-0" />
                        <span>07:28 已到达上车点</span>
                      </div>
                      <div className="flex gap-2 text-[13px] text-primary font-bold">
                        <span className="w-2 h-2 mt-1.5 rounded-full bg-current flex-shrink-0" />
                        <span>08:02 行程进行中</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 超时闭环警告 */}
              {currentTaskStatus === 'driving' && !closureResolved && (
                <div className="mx-4 mt-3 p-3.5 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[15px] font-extrabold text-red-500">任务超时未闭环</div>
                    <span className="inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold text-red-500 bg-red-100">待处理</span>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
                    计划结束时间 10:00 已过，系统未收到司机"收车"记录。请补录实际结束信息，或上报异常交由调度处理。
                  </p>
                  <div className="mt-3 grid grid-cols-[2fr_1fr_1fr] gap-2">
                    <Button variant="destructive" size="sm" onClick={() => setShowFinishSheet(true)}>补录完成</Button>
                    <Button variant="outline" size="sm" onClick={() => showToastMsg('已通知调度')}>上报异常</Button>
                    <Button variant="outline" size="sm" onClick={() => showToastMsg('正在联系调度')}>调度</Button>
                  </div>
                </div>
              )}

              {currentTaskStatus === 'driving' && closureResolved && (
                <div className="mx-4 mt-3 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[15px] font-extrabold text-emerald-600">任务已闭环</div>
                    <span className="inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold text-emerald-600 bg-emerald-100">已完成</span>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
                    司机已补录实际结束时间 10:18，订单进入已完成。系统保留补录原因，后台可复核费用与服务评价。
                  </p>
                </div>
              )}

              {/* 下一任务 / 当前任务 */}
              {nextTaskStatus === 'waiting' && currentTaskStatus === 'none' ? (
                <>
                  <h3 className="px-4 pt-4 pb-2 text-lg font-extrabold text-slate-700">当前任务</h3>
                  <div className="mx-4 bg-white rounded-lg shadow-sm p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold text-accent bg-orange-50">待出车</span>
                      <span className="text-sm font-bold text-accent">距出发 2小时15分</span>
                    </div>
                    <div className="mt-3 grid grid-cols-[16px_1fr] gap-2.5">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        <div className="w-0.5 flex-1 min-h-[28px] bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      </div>
                      <div>
                        <div className="text-[17px] font-extrabold text-slate-700">深圳福田车公庙</div>
                        <div className="text-[17px] font-extrabold text-slate-700 mt-1.5">深圳蛇口邮轮中心</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 text-sm">
                      <div className="text-slate-400">出行时间<strong className="block mt-1 text-slate-700 text-[15px]">2026-06-12 11:30</strong></div>
                      <div className="text-slate-400">用车时长<strong className="block mt-1 text-slate-700 text-[15px]">1天 / 8小时</strong></div>
                      <div className="text-slate-400">用车人<strong className="block mt-1 text-slate-700 text-[15px]">陈** / 136****8899</strong></div>
                      <div className="text-slate-400">出行人数<strong className="block mt-1 text-slate-700 text-[15px]">42人</strong></div>
                      <div className="text-slate-400">车型要求<strong className="block mt-1 text-slate-700 text-[15px]">45座大巴</strong></div>
                      <div className="text-slate-400">任务类型<strong className="block mt-1 text-slate-700 text-[15px]">定制包车</strong></div>
                    </div>
                    <div className="mt-3 grid grid-cols-[2fr_1fr] gap-2">
                      <Button className="bg-primary hover:bg-primary-700" size="sm" onClick={() => setShowDepartSheet(true)}>点击出车</Button>
                      <Button variant="outline" size="sm" onClick={() => showToastMsg('正在拨打用车人')}>联系</Button>
                    </div>
                  </div>
                </>
              ) : nextTaskStatus === 'waiting' && currentTaskStatus === 'driving' ? (
                <>
                  <h3 className="px-4 pt-4 pb-2 text-lg font-extrabold text-slate-700">下一任务</h3>
                  <div className="mx-4 bg-white rounded-lg shadow-sm p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold text-accent bg-orange-50">待出车</span>
                      <span className="text-sm font-bold text-accent">距出发 2小时15分</span>
                    </div>
                    <div className="mt-3 grid grid-cols-[16px_1fr] gap-2.5">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        <div className="w-0.5 flex-1 min-h-[28px] bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      </div>
                      <div>
                        <div className="text-[17px] font-extrabold text-slate-700">深圳福田车公庙</div>
                        <div className="text-[17px] font-extrabold text-slate-700 mt-1.5">深圳蛇口邮轮中心</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 text-sm">
                      <div className="text-slate-400">出行时间<strong className="block mt-1 text-slate-700 text-[15px]">2026-06-12 11:30</strong></div>
                      <div className="text-slate-400">用车时长<strong className="block mt-1 text-slate-700 text-[15px]">1天 / 8小时</strong></div>
                      <div className="text-slate-400">用车人<strong className="block mt-1 text-slate-700 text-[15px]">陈** / 136****8899</strong></div>
                      <div className="text-slate-400">出行人数<strong className="block mt-1 text-slate-700 text-[15px]">42人</strong></div>
                      <div className="text-slate-400">车型要求<strong className="block mt-1 text-slate-700 text-[15px]">45座大巴</strong></div>
                      <div className="text-slate-400">任务类型<strong className="block mt-1 text-slate-700 text-[15px]">定制包车</strong></div>
                    </div>
                    <div className="mt-3 grid grid-cols-[2fr_1fr] gap-2">
                      <Button variant="outline" size="sm" disabled className="opacity-60">未收车不可出车</Button>
                      <Button variant="outline" size="sm" onClick={() => showToastMsg('正在拨打用车人')}>联系</Button>
                    </div>
                    <p className="mt-2 text-sm font-bold text-red-500">请先完成当前任务收车，再开始下一任务。</p>
                  </div>
                </>
              ) : null}

              {/* 快捷操作 */}
              <h3 className="px-4 pt-4 pb-2 text-lg font-extrabold text-slate-700">快捷操作</h3>
              <div className="mx-4 grid grid-cols-4 gap-px overflow-hidden rounded-lg bg-slate-200">
                {[
                  { icon: ClipboardCheck, label: '车检', onClick: () => showToastMsg('打开车辆检查') },
                  { icon: Camera, label: '上传', onClick: () => showToastMsg('上传行程凭证') },
                  { icon: HeadphonesIcon, label: '客服', onClick: () => showToastMsg('联系平台客服') },
                  { icon: FileText, label: '证照', onClick: () => showToastMsg('查看证照') },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={item.onClick}
                    className="min-h-[76px] bg-white flex flex-col items-center justify-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* 驾驶证即将到期警告 */}
              <div className="mx-4 mt-3 p-3.5 rounded-lg border border-amber-200 bg-amber-50 flex gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-extrabold text-amber-700">驾驶证即将到期</div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">有效期至 2026-07-15，请尽快办理换证，避免影响接单。</p>
                </div>
              </div>

              <div className="pb-4" />
            </ScrollArea>
          )}

          {/* ===== 消息页 ===== */}
          {currentPage === 'messages' && (
            <ScrollArea className="h-full">
              <h3 className="px-4 pt-4 pb-2 text-lg font-extrabold text-slate-700">消息</h3>
              {[
                {
                  icon: <Clock className="w-5 h-5" />,
                  iconBg: 'bg-indigo-50 text-primary',
                  title: '今日出车提醒',
                  text: '11:30 有出车任务，请提前 20 分钟到达上车点并完成车辆检查。',
                  time: '09:10',
                },
                {
                  icon: <CheckCircle2 className="w-5 h-5" />,
                  iconBg: 'bg-emerald-50 text-emerald-600',
                  title: '行车日志提醒',
                  text: '您当天没有出车任务与维修事项，请提供车辆日志。',
                  time: '09:05',
                },
                {
                  icon: <FileText className="w-5 h-5" />,
                  iconBg: 'bg-orange-50 text-accent',
                  title: '新任务已分配',
                  text: '平台已为您分配深圳福田车公庙至蛇口邮轮中心订单。',
                  time: '08:42',
                },
                {
                  icon: <Bell className="w-5 h-5" />,
                  iconBg: 'bg-red-50 text-red-500',
                  title: '证照到期预警',
                  text: '您的驾驶证将在 30 天后到期，请及时处理。',
                  time: '昨天',
                },
              ].map((msg, idx) => (
                <div key={idx} className="mx-4 mb-3 bg-white rounded-lg shadow-sm p-3.5 grid grid-cols-[40px_1fr_auto] gap-2.5 items-start">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${msg.iconBg}`}>
                    {msg.icon}
                  </div>
                  <div>
                    <div className="text-[15px] font-extrabold text-slate-700">{msg.title}</div>
                    <div className="mt-1 text-[13px] text-slate-400 leading-relaxed">{msg.text}</div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{msg.time}</span>
                </div>
              ))}
            </ScrollArea>
          )}

          {/* ===== 个人中心 ===== */}
          {currentPage === 'profile' && (
            <ScrollArea className="h-full">
              <div className="bg-white mx-4 mt-3 rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-primary flex items-center justify-center text-xl font-extrabold">王</div>
                    <div>
                      <div className="text-[17px] font-extrabold text-slate-700">王师傅</div>
                      <div className="mt-1 text-xs text-slate-400">司机ID：HY-DR-08856</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold text-emerald-600 bg-emerald-50">认证通过</span>
                </div>
                <div className="pt-1">
                  {[
                    { label: '绑定车辆', value: '粤A·88888' },
                    { label: '准驾车型', value: 'A1 / A2' },
                    { label: '服务评分', value: `${driverRating} 分` },
                    { label: '安全驾驶', value: '128 天' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between min-h-[48px] border-b border-slate-50 last:border-0 text-[15px]">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-slate-400">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white mx-4 mt-3 rounded-lg shadow-sm overflow-hidden">
                {[
                  { label: '证照信息', value: '驾驶证即将到期 ›', onClick: () => goSubPage('license') },
                  { label: '服务评价', value: `${driverReviewCount} 条 ›`, onClick: () => goSubPage('reviews') },
                  { label: '联系客服', value: '400-800-6688 ›', onClick: () => goSubPage('customer') },
                  { label: '设置', value: '›', onClick: () => goSubPage('settings') },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={item.onClick}
                    className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors text-[15px]"
                  >
                    <span className="text-slate-600">{item.label}</span>
                    <span className="text-slate-400">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="px-4 mt-3 pb-4">
                <Button variant="outline" className="w-full text-red-400 border-red-300 hover:bg-red-50 hover:text-red-500" onClick={() => showToastMsg('正在退出登录')}>
                  退出登录
                </Button>
              </div>
            </ScrollArea>
          )}

          {/* ===== 待填行车日志 ===== */}
          {currentPage === 'pending-logs' && (
            <div className="flex flex-col h-full bg-[#F4F4F4]">
              <SubNavbar title="待填行车日志" onBack={backToWork} />
              <ScrollArea className="flex-1 p-4">
                {pendingLogCount > 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-3.5 grid grid-cols-[1fr_auto] items-center gap-2.5">
                    <div>
                      <div className="text-lg font-extrabold text-slate-700">2026-06-15</div>
                    </div>
                    <Button size="sm" onClick={() => setShowVehicleLogSheet(true)}>填写</Button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-base font-bold py-16">暂无待填行车日志</div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* ===== 证照信息 ===== */}
          {currentPage === 'license' && (
            <div className="flex flex-col h-full bg-[#F4F4F4]">
              <SubNavbar title="证照信息" onBack={backToProfile} />
              <ScrollArea className="flex-1 p-4">
                {[
                  { icon: '证', iconBg: 'bg-emerald-50 text-emerald-600', name: '身份证', detail: '已验证 · 有效期至 2030-05-20', tag: '已认证', tagColor: 'text-emerald-600 bg-emerald-50' },
                  { icon: '驾', iconBg: 'bg-amber-50 text-accent', name: '驾驶证', detail: '已验证 · 有效期至 2026-07-15', tag: '即将过期', tagColor: 'text-accent bg-orange-50' },
                  { icon: '营', iconBg: 'bg-red-50 text-red-500', name: '营运证', detail: '未验证 · 过期 2025-11-10', tag: '已过期', tagColor: 'text-red-500 bg-red-50' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-sm p-3.5 mb-3">
                    <div className="grid grid-cols-[42px_1fr_auto] gap-2.5 items-center">
                      <div className={`w-[42px] h-[42px] rounded-lg flex items-center justify-center text-lg font-extrabold ${item.iconBg}`}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-[17px] font-extrabold text-slate-700">{item.name}</div>
                        <div className="mt-1 text-[13px] text-slate-400">{item.detail}</div>
                      </div>
                      <span className={`inline-flex items-center min-h-[24px] px-2 rounded text-sm font-bold ${item.tagColor}`}>{item.tag}</span>
                    </div>
                  </div>
                ))}
                <Button className="w-full" onClick={() => showToastMsg('请上传最新证照')}>更新证照</Button>
              </ScrollArea>
            </div>
          )}

          {/* ===== 服务评价 ===== */}
          {currentPage === 'reviews' && (
            <div className="flex flex-col h-full bg-[#F4F4F4]">
              <SubNavbar title="服务评价" onBack={backToProfile} />
              <ScrollArea className="flex-1 p-4">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-3 text-center">
                  <div className="text-[42px] font-extrabold text-accent">{driverRating}</div>
                  <div className="mt-1 text-sm text-slate-400">共 {driverReviewCount} 条评价</div>
                  <div className="mt-2 text-2xl text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`inline w-6 h-6 ${i < Math.round(driverRating) ? 'fill-amber-400' : 'fill-slate-200'} text-transparent`} />
                    ))}
                  </div>
                </div>
                {driverReviews.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">暂无评价</div>
                )}
                {driverReviews.map((r) => (
                  <div key={r.id} className="bg-white rounded-lg shadow-sm p-3.5 mb-2.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-700">匿名用户</strong>
                      <span className="text-[13px] text-slate-400">{r.date}</span>
                    </div>
                    <div className="mt-2 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`inline w-4 h-4 ${i < r.stars ? 'fill-amber-400' : 'fill-slate-200'} text-transparent`} />
                      ))}
                    </div>
                    <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">{r.content}</p>
                    {r.reply && (
                      <div className="mt-2 bg-slate-50 rounded-lg p-2.5 text-[13px] text-slate-500">
                        <span className="font-semibold text-slate-600">平台回复：</span>{r.reply}
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* ===== 联系客服 ===== */}
          {currentPage === 'customer' && (
            <div className="flex flex-col h-full bg-[#F4F4F4]">
              <SubNavbar title="联系客服" onBack={backToProfile} />
              <ScrollArea className="flex-1 p-4">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-3">
                  <div className="text-[17px] font-extrabold text-slate-700">平台客服</div>
                  <div className="mt-1 text-[13px] text-slate-400">服务时间：全天 24 小时</div>
                  <Button className="w-full mt-3" onClick={() => showToastMsg('正在拨打 400-800-6688')}>
                    <Phone className="w-4 h-4 mr-1" />拨打 400-800-6688
                  </Button>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="text-[17px] font-extrabold text-slate-700">调度中心</div>
                  <div className="mt-1 text-[13px] text-slate-400">出车异常、路线调整、乘客未到等问题请联系调度。</div>
                  <Button variant="outline" className="w-full mt-3" onClick={() => showToastMsg('正在联系调度')}>联系调度</Button>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* ===== 设置 ===== */}
          {currentPage === 'settings' && (
            <div className="flex flex-col h-full bg-[#F4F4F4]">
              <SubNavbar title="设置" onBack={backToProfile} />
              <ScrollArea className="flex-1">
                <div className="bg-white mx-4 mt-4 rounded-lg shadow-sm overflow-hidden">
                  {[
                    { label: '个人资料', value: '›' },
                    { label: '账号安全', value: '›' },
                    { label: '消息通知', value: '已开启 ›' },
                    { label: '清除缓存', value: '12.8MB ›' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors text-[15px]"
                    >
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-slate-400">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 mt-4 pb-4">
                  <Button variant="outline" className="w-full text-red-400 border-red-300 hover:bg-red-50 hover:text-red-500" onClick={() => showToastMsg('正在退出登录')}>
                    退出登录
                  </Button>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* 弹窗 */}
        {showDepartSheet && (
          <DepartSheet onClose={() => setShowDepartSheet(false)} onConfirm={confirmDepart} />
        )}
        {showReturnSheet && (
          <ReturnSheet onClose={() => setShowReturnSheet(false)} onConfirm={confirmReturn} />
        )}
        {showFinishSheet && (
          <FinishSheet onClose={() => setShowFinishSheet(false)} onConfirm={confirmFinish} />
        )}
        {showVehicleLogSheet && (
          <VehicleLogSheet onClose={() => setShowVehicleLogSheet(false)} onConfirm={confirmVehicleLog} />
        )}

        {/* 底部 Tab */}
        {!isSubPage && (
          <DriverTabBar activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        <Toast message={showToast} />
      </div>
    </div>
  )
}
