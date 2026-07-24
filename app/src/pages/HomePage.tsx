import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'
import { useAppContext, useToast, useNavigation } from '@/store'
import { DateTimePicker, PhoneVerify } from '@/components/shared'
import { ChatWindow } from '@/components/shared/ChatWindow'
import {
  MapPin, ChevronRight, MessageCircle, User, Building2,
  FileText, Car, Shield, Award, Monitor, Map, Users, Navigation,
  Calendar, Zap, CheckCircle2, Sparkles,
} from 'lucide-react'

// ============ 每日提交次数限制（localStorage） ============
const COMMUTE_DAILY_LIMIT = 2
const CUSTOM_DAILY_LIMIT = 3

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function getDailyCount(type: 'commute' | 'custom'): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(`ht_submit_${type}`)
    const parsed = raw ? JSON.parse(raw) : null
    const today = getTodayKey()
    if (parsed && parsed.date === today) return parsed
    return { date: today, count: 0 }
  } catch { return { date: getTodayKey(), count: 0 } }
}

function setDailyCount(type: 'commute' | 'custom', data: { date: string; count: number }) {
  try { localStorage.setItem(`ht_submit_${type}`, JSON.stringify(data)) } catch { /* quota exceeded, ignore */ }
}

function canSubmit(type: 'commute' | 'custom'): boolean {
  const { count } = getDailyCount(type)
  const limit = type === 'commute' ? COMMUTE_DAILY_LIMIT : CUSTOM_DAILY_LIMIT
  return count < limit
}

function incrDailyCount(type: 'commute' | 'custom'): number {
  const data = getDailyCount(type)
  data.count += 1
  setDailyCount(type, data)
  return data.count
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export default function HomePage() {
  const { state, dispatch } = useAppContext()
  const showToast = useToast()
  const { navigateTo } = useNavigation()
  const [customCharCount, setCustomCharCount] = useState(0)
  const [showChat, setShowChat] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [commutePhoneVerified, setCommutePhoneVerified] = useState(false)
  const [customPhoneVerified, setCustomPhoneVerified] = useState(false)
  // 每日剩余次数（动态从 localStorage 读取）
  const [commuteRemaining, setCommuteRemaining] = useState(() => COMMUTE_DAILY_LIMIT - getDailyCount('commute').count)
  const [customRemaining, setCustomRemaining] = useState(() => CUSTOM_DAILY_LIMIT - getDailyCount('custom').count)

  const bizTabs = [
    { key: 'charter' as const, label: '包车', icon: Car, desc: '按小时/天灵活用车' },
    { key: 'commute' as const, label: '上下班车', icon: Users, desc: '企业通勤解决方案' },
    { key: 'custom' as const, label: '定制包车', icon: Sparkles, desc: '专属定制出行服务' },
  ]
  // 根据车队配置过滤服务入口
  const visibleBizTabs = bizTabs.filter(tab => {
    const cfg = state.fleetEntryConfig
    if (tab.key === 'charter' && cfg.showCharter === false) return false
    if (tab.key === 'commute' && cfg.showCommute === false) return false
    if (tab.key === 'custom' && cfg.showCustom === false) return false
    return true
  })
  // 如果当前选中的业务被禁用，自动切到第一个可用 tab
  const currentBizType = visibleBizTabs.find(t => t.key === state.bizType) ? state.bizType : visibleBizTabs[0]?.key || 'charter'

  // Banner 文案
  const bannerTitle = state.fleetEntryConfig.bannerTitle || state.fleetInfo.name || '恒运出行'
  const bannerSubtitle = state.fleetEntryConfig.bannerSubtitle || '智慧出行 · 一键直达'
  const bannerDesc = state.fleetOrgId && state.fleetInfo.name
    ? `专业企业用车服务平台 · ${state.fleetInfo.name}`
    : '专业企业用车服务平台 · 珠三角九城覆盖'

  const handleSubmitCommute = async () => {
    if (!commutePhoneVerified) { showToast('请先验证手机号'); return }
    if (!canSubmit('commute')) { showToast(`今日通勤申请次数已用完（${COMMUTE_DAILY_LIMIT}次/天）`); return }
    try {
      const { submitCommuteApply } = await import('@/api/modules/commute')
      await submitCommuteApply({ name: state.commuteName, phone: state.commutePhone, company: state.commuteCompany, city: state.departCity })
    } catch {
      // 即使失败也跳转成功页
    }
    incrDailyCount('commute')
    setCommuteRemaining(prev => prev - 1)
    navigateTo('order-success')
  }

  const handleSubmitCustom = async () => {
    if (!customPhoneVerified) { showToast('请先验证手机号'); return }
    if (!canSubmit('custom')) { showToast(`今日定制包车需求次数已用完（${CUSTOM_DAILY_LIMIT}次/天）`); return }
    try {
      const { submitCustomCharter } = await import('@/api/modules/custom')
      await submitCustomCharter({ name: state.customName, phone: state.customPhone, city: state.departCity, demand: state.customDemand })
    } catch {
      // 即使失败也跳转成功页
    }
    incrDailyCount('custom')
    setCustomRemaining(prev => prev - 1)
    navigateTo('order-success')
  }

  return (
    <ScrollArea className="h-full">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-700 to-blue-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-white" />
          <div className="absolute top-1/2 right-1/4 w-4 h-4 rounded-full bg-white" />
          <div className="absolute top-1/3 left-1/3 w-2 h-2 rounded-full bg-white" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative z-10 px-5 pt-10 pb-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/80 text-xs font-medium tracking-wide">{bannerTitle}</span>
          </div>
          <h1 className="text-[28px] font-extrabold text-white leading-tight tracking-tight">
            {bannerSubtitle.includes('·') ? (
              <>
                {bannerSubtitle.split('·')[0].trim()}<br />
                <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">{bannerSubtitle.split('·')[1]?.trim() || '一键直达'}</span>
              </>
            ) : (
              bannerSubtitle
            )}
          </h1>
          <p className="text-white/60 text-sm mt-2">{bannerDesc}</p>
        </div>
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 24" preserveAspectRatio="none">
          <path d="M0 24 Q100 0 200 12 Q300 24 400 12 L400 24 Z" fill="white" />
        </svg>
      </div>

      {/* Business Tabs */}
      <div className="px-4 -mt-3 relative z-10">
        <div className={`grid gap-2 ${visibleBizTabs.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {visibleBizTabs.map((tab) => {
            const active = currentBizType === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => dispatch({ type: 'SET_BIZ_TYPE', payload: tab.key })}
                className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all duration-300 cursor-pointer ${
                  active ? 'bg-white shadow-lg shadow-primary/10 scale-[1.03]' : 'bg-white/80 hover:bg-white hover:shadow-md'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                  active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <tab.icon className="w-4.5 h-4.5" />
                </div>
                <span className={`text-xs font-semibold transition-colors duration-300 ${
                  active ? 'text-primary' : 'text-slate-600'
                }`}>{tab.label}</span>
                {active && <span className="text-[10px] text-slate-400 leading-none">{tab.desc}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Charter Panel */}
      {currentBizType === 'charter' && (
        <Card className="mx-4 mt-3 shadow-sm border-0">
          <CardContent className="pt-4 space-y-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-slate-700">填写用车信息</span>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />出发城市
              </label>
              <button
                onClick={() => navigateTo('city-select')}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 flex items-center justify-between text-sm hover:border-primary/50 hover:bg-slate-50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <span className={state.departCity ? 'text-slate-800 font-medium' : 'text-slate-300'}>{state.departCity || '请选择出发城市'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />出发时间
              </label>
              <button
                onClick={() => setShowDatePicker(true)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 flex items-center justify-between text-sm hover:border-primary/50 hover:bg-slate-50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <span className={state.departTime ? 'text-slate-800 font-medium' : 'text-slate-300'}>{state.departTime || '请选择出发时间'}</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <DateTimePicker
              open={showDatePicker}
              onOpenChange={setShowDatePicker}
              value={state.departTime}
              onConfirm={(val) => dispatch({ type: 'SET_DEPART_TIME', payload: val })}
            />
            <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 shadow-lg shadow-accent/25 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => navigateTo('car-select')} disabled={state.fleetEntryConfig.order === false}>
              选择车辆 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Commute Panel */}
      {currentBizType === 'commute' && (
        <Card className="mx-4 mt-3 shadow-sm border-0">
          <CardContent className="pt-4 space-y-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-slate-700">企业通勤信息</span>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-medium">企业专享</span>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><User className="w-3.5 h-3.5 text-primary" />姓名</label>
              <Input value={state.commuteName} onChange={e => dispatch({ type: 'SET_COMMUTE_NAME', payload: e.target.value })} placeholder="您的姓名" className="h-11 rounded-xl border-slate-200 focus:border-primary" />
            </div>
            <PhoneVerify
              phone={state.commutePhone}
              onPhoneChange={(v) => dispatch({ type: 'SET_COMMUTE_PHONE', payload: v })}
              verified={commutePhoneVerified}
              onVerifiedChange={setCommutePhoneVerified}
            />
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-primary" />企业名称</label>
              <Input value={state.commuteCompany} onChange={e => dispatch({ type: 'SET_COMMUTE_COMPANY', payload: e.target.value })} placeholder="请输入企业名称" className="h-11 rounded-xl border-slate-200 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />用车城市</label>
              <button
                onClick={() => navigateTo('city-select')}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 flex items-center justify-between text-sm hover:border-primary/50 hover:bg-slate-50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <span className={state.departCity ? 'text-slate-800 font-medium' : 'text-slate-300'}>{state.departCity || '请选择用车城市'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <Button
              className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 shadow-lg shadow-accent/25 text-base font-semibold"
              onClick={handleSubmitCommute}
              disabled={!commutePhoneVerified || state.fleetEntryConfig.order === false}
            >
              提交申请 <CheckCircle2 className="w-4 h-4 ml-1" />
            </Button>
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-700">今日剩余 <strong>{commuteRemaining}</strong> 次</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Charter Panel */}
      {currentBizType === 'custom' && (
        <Card className="mx-4 mt-3 shadow-sm border-0">
          <CardContent className="pt-4 space-y-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-slate-700">定制出行需求</span>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-medium">VIP服务</span>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><User className="w-3.5 h-3.5 text-primary" />姓名</label>
              <Input value={state.customName} onChange={e => dispatch({ type: 'SET_CUSTOM_NAME', payload: e.target.value })} placeholder="您的姓名" className="h-11 rounded-xl border-slate-200 focus:border-primary" />
            </div>
            <PhoneVerify
              phone={state.customPhone}
              onPhoneChange={(v) => dispatch({ type: 'SET_CUSTOM_PHONE', payload: v })}
              verified={customPhoneVerified}
              onVerifiedChange={setCustomPhoneVerified}
            />
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />用车城市</label>
              <button
                onClick={() => navigateTo('city-select')}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 flex items-center justify-between text-sm hover:border-primary/50 hover:bg-slate-50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <span className={state.departCity ? 'text-slate-800 font-medium' : 'text-slate-300'}>{state.departCity || '请选择用车城市'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="relative">
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-primary" />用车需求</label>
              <textarea
                className="flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px] resize-none transition-all"
                placeholder="请描述您的用车需求，如人数、路线、时间等..."
                maxLength={200}
                value={state.customDemand}
                onChange={e => { dispatch({ type: 'SET_CUSTOM_DEMAND', payload: e.target.value }); setCustomCharCount(e.target.value.length) }}
              />
              <span className={`absolute right-3 bottom-3 text-xs ${customCharCount >= 200 ? 'text-red-400' : 'text-slate-400'}`}>
                {customCharCount}<span className="text-slate-300">/200</span>
              </span>
            </div>
            <Button
              className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 shadow-lg shadow-accent/25 text-base font-semibold"
              onClick={handleSubmitCustom}
              disabled={!customPhoneVerified || state.fleetEntryConfig.order === false}
            >
              提交需求 <SendIcon className="w-4 h-4 ml-1" />
            </Button>
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-purple-700">今日剩余 <strong>{customRemaining}</strong> 次</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Advantages */}
      <div className="px-4 mt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-800">为什么选择{bannerTitle}</h3>
          <span className="text-xs text-slate-400">2000+企业信赖</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Shield, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', title: '100%合规', desc: '全资质准入\n正规营运车辆' },
            { icon: Monitor, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', title: '透明一口价', desc: '费用明细\n100%公示' },
            { icon: Map, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', title: '本地化深耕', desc: '珠三角\n九城覆盖' },
            { icon: Car, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', title: '全场景覆盖', desc: '5-55座车型\n全覆盖' },
            { icon: Users, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', title: '企业专属', desc: '统一开票\n专属客服经理' },
            { icon: Award, color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', title: '服务保障', desc: '24h客服\n先行赔付' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-3.5 text-center shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-semibold text-[13px] text-slate-800 mb-0.5">{item.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Customer Service */}
      <button
        onClick={() => setShowChat(true)}
        className="absolute bottom-20 right-4 h-11 px-4 rounded-2xl bg-gradient-to-r from-accent to-orange-500 text-white flex items-center gap-2 text-[13px] font-semibold shadow-lg shadow-accent/30 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 z-30 active:scale-95"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle className="w-3.5 h-3.5" />
        </div>
        在线客服
      </button>

      {/* 客服聊天窗口 */}
      {showChat && (
        <div className="absolute inset-0 z-50 bg-white">
          <ChatWindow onClose={() => setShowChat(false)} />
        </div>
      )}
    </ScrollArea>
  )
}
