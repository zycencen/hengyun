import { useState, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast, useNavigation, useAppContext } from '@/store'
import { SubNavbar } from '@/components/shared/SubNavbar'
import {
  User, Shield, FileText, Award, LogOut, ChevronRight,
} from 'lucide-react'

// 懒加载设置子页面
const ProfileEditPage = lazy(() => import('@/pages/settings/ProfileEditPage'))
const UserAgreementPage = lazy(() => import('@/pages/settings/UserAgreementPage'))
const PrivacyPage = lazy(() => import('@/pages/settings/PrivacyPage'))

type SubPage = 'main' | 'profile' | 'agreement' | 'privacy'

function Loading() {
  return <div className="flex items-center justify-center h-full text-sm text-slate-400">加载中...</div>
}

export default function SettingsPage() {
  const showToast = useToast()
  const { goBack } = useNavigation()
  const { logout } = useAppContext()
  const [showLogout, setShowLogout] = useState(false)
  const [subPage, setSubPage] = useState<SubPage>('main')

  const handleLogout = () => {
    logout()
    setShowLogout(false)
    showToast('已退出登录')
  }

  // 子页面渲染
  if (subPage !== 'main') {
    return (
      <Suspense fallback={<Loading />}>
        {subPage === 'profile' && <ProfileEditPage onBack={() => setSubPage('main')} />}
        {subPage === 'agreement' && <UserAgreementPage onBack={() => setSubPage('main')} />}
        {subPage === 'privacy' && <PrivacyPage onBack={() => setSubPage('main')} />}
      </Suspense>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <SubNavbar title="设置" onBack={goBack} />

      <ScrollArea className="flex-1 relative">
        <div className="mx-4 mt-4 space-y-3">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            {[
              { icon: User, label: '个人信息', desc: '查看和编辑个人资料', page: 'profile' as SubPage },
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSubPage(item.page)}
                className="flex items-center px-4 py-3.5 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center mr-3">
                  <item.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            {[
              { icon: FileText, label: '用户协议', page: 'agreement' as SubPage },
              { icon: Shield, label: '隐私政策', page: 'privacy' as SubPage },
              { icon: Award, label: '关于恒运出行', onClick: () => showToast('恒运出行 v1.0.0'), value: 'v1.0.0' },
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.page ? setSubPage(item.page) : item.onClick?.()}
                className="flex items-center px-4 py-3.5 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center mr-3">
                  <item.icon className="w-4.5 h-4.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-xs text-slate-400">{item.value}</span>}
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="destructive"
            className="w-full h-12 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 border-0 font-medium"
            onClick={() => setShowLogout(true)}
          >
            <LogOut className="w-4 h-4 mr-2" />退出登录
          </Button>

          <div className="text-center text-[11px] text-slate-300 pb-8">恒运出行 v1.0.0</div>
        </div>

        {showLogout && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLogout(false)}>
            <div className="bg-white rounded-2xl p-5 mx-8 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800">确认退出</h3>
                <p className="text-sm text-slate-400 mt-1">退出登录后需要重新验证身份</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={() => setShowLogout(false)}>取消</Button>
                <Button className="flex-1 rounded-xl h-10 bg-red-500 hover:bg-red-600 font-medium" onClick={handleLogout}>确认退出</Button>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
