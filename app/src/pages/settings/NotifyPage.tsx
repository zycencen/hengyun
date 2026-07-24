import { useState } from 'react'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { Bell, Smartphone, Mail } from 'lucide-react'

interface NotifyPageProps {
  onBack: () => void
}

interface ToggleItem {
  key: string
  label: string
  desc: string
  icon: typeof Bell
}

export default function NotifyPage({ onBack }: NotifyPageProps) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    order: true,
    dispatch: true,
    payment: true,
    promotion: false,
    system: true,
    sms: true,
    email: false,
  })

  const toggle = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const notifyItems: ToggleItem[] = [
    { key: 'order', label: '订单通知', desc: '订单状态变更时通知', icon: Bell },
    { key: 'dispatch', label: '派车通知', desc: '司机接单、派车成功时通知', icon: Bell },
    { key: 'payment', label: '支付通知', desc: '支付成功、退款到账时通知', icon: Bell },
    { key: 'promotion', label: '优惠活动', desc: '促销活动、优惠券到期提醒', icon: Bell },
    { key: 'system', label: '系统通知', desc: '版本更新、服务公告等', icon: Bell },
  ]

  const channelItems = [
    { key: 'sms', label: '短信通知', desc: '通过短信接收重要通知', icon: Smartphone },
    { key: 'email', label: '邮件通知', desc: '通过邮件接收通知摘要', icon: Mail },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <SubNavbar title="消息通知" onBack={onBack} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-6 space-y-4">
        {/* 通知类型 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">通知类型</span>
          </div>
          {notifyItems.map((item, idx) => (
            <div
              key={item.key}
              className={`flex items-center px-4 py-3.5 ${idx < notifyItems.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center mr-3">
                <item.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  toggles[item.key] ? 'bg-primary' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    toggles[item.key] ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* 通知渠道 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">通知渠道</span>
          </div>
          {channelItems.map((item, idx) => (
            <div
              key={item.key}
              className={`flex items-center px-4 py-3.5 ${idx < channelItems.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center mr-3">
                <item.icon className="w-4.5 h-4.5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  toggles[item.key] ? 'bg-primary' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    toggles[item.key] ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* 免打扰设置 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">免打扰时段</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-700">夜间免打扰</div>
              <div className="text-xs text-slate-400 mt-0.5">22:00 - 08:00 不推送通知</div>
            </div>
            <button
              onClick={() => toggle('quiet')}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                toggles['quiet'] ? 'bg-primary' : 'bg-slate-200'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  toggles['quiet'] ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
