import { useAppContext, useNavigation } from '@/store'
import { CheckCircle2, Home } from 'lucide-react'

export function OrderSuccessPage() {
  const { state } = useAppContext()
  const { navigateTo } = useNavigation()

  const bizType = state.bizType
  const isCommute = bizType === 'commute'
  const isCustom = bizType === 'custom'

  const title = isCommute ? '申请已提交' : isCustom ? '需求已提交' : '提交成功'

  const message = isCommute
    ? '您的上下班包车申请已提交，工作人员将尽快与您联系确认行程安排'
    : isCustom
    ? '您的定制包车需求已提交，专属客服将在 1 个工作日内与您联系'
    : '您的需求已提交成功'

  const handleReloadHome = () => {
    navigateTo('home')
    // 延迟刷新以确保导航先执行
    setTimeout(() => window.location.reload(), 50)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
      {/* 成功图标 */}
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6 animate-bounce">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>

      {/* 标题 */}
      <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed max-w-xs">
        {message}
      </p>

      {/* 提示卡片 */}
      <div className="w-full max-w-sm bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">💡</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">温馨提示</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>· 请保持手机畅通，方便工作人员联系</li>
              <li>· 您可在首页查看最新活动和优惠</li>
              <li>· 如有紧急需求可联系在线客服</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 按钮 */}
      <div className="w-full max-w-sm">
        <button
          onClick={handleReloadHome}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-semibold text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-lg shadow-primary/25"
        >
          <Home className="w-4 h-4" />
          返回首页
        </button>
      </div>
    </div>
  )
}

export default OrderSuccessPage
