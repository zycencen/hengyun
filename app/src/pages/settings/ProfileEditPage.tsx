import { useState } from 'react'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { Button } from '@/components/ui/button'
import { useToast, useAppContext } from '@/store'
import { useUser } from '@/hooks'
import { updateUserProfile } from '@/api/modules/user'
import { User, Phone, Building2, Camera, Loader2 } from 'lucide-react'

interface ProfileEditPageProps {
  onBack: () => void
}

export default function ProfileEditPage({ onBack }: ProfileEditPageProps) {
  const showToast = useToast()
  const { dispatch, state } = useAppContext()
  const { user } = useUser()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [company, setCompany] = useState(user?.company || '')
  const [avatar] = useState(user?.avatar || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('请输入姓名')
      return
    }
    setSaving(true)
    try {
      await updateUserProfile({ name: name.trim(), phone: phone.trim(), company: company.trim() })
      // 同步更新全局 context，确保所有页面立即可见
      if (state.user) {
        dispatch({ type: 'SET_USER', payload: { ...state.user, name: name.trim(), company: company.trim() } })
      }
      showToast('个人信息已保存')
      onBack()
    } catch (e: unknown) {
      // 401 已由 request.ts 拦截器统一处理（清除 token + 跳转登录页），此处无需重复处理
      const msg = e instanceof Error ? e.message : '保存失败，请重试'
      showToast(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <SubNavbar title="个人信息" onBack={onBack} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-6 space-y-4">
        {/* 头像 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-sm font-medium text-slate-500 mb-3">头像</div>
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">点击更换头像</div>
              <div className="text-xs text-slate-400 mt-0.5">支持 JPG、PNG 格式</div>
            </div>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">基本信息</span>
          </div>

          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-500 w-14 flex-shrink-0">姓名</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-300"
              placeholder="请输入姓名"
            />
          </div>

          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-500 w-14 flex-shrink-0">手机号</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-300"
              placeholder="请输入手机号"
            />
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-500 w-14 flex-shrink-0">公司</span>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-300"
              placeholder="请输入公司名称"
            />
          </div>
        </div>

        {/* 认证信息（只读） */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">认证状态</span>
          </div>
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">VIP 会员</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.isVip ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              {user?.isVip ? '已开通' : '未开通'}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">企业认证</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.isEnterpriseVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {user?.isEnterpriseVerified ? '已认证' : '未认证'}
            </span>
          </div>
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
        <Button
          className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-medium"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            '保存修改'
          )}
        </Button>
      </div>
    </div>
  )
}
