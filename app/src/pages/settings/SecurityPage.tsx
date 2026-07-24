import { useState, useRef, useEffect } from 'react'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/store'
import { sendSmsCode } from '@/api/modules/user'
import { Lock, Smartphone, Key, Eye, EyeOff } from 'lucide-react'

interface SecurityPageProps {
  onBack: () => void
}

/** 只提取数字 */
function toDigits(s: string): string {
  return s.replace(/\D/g, '').slice(0, 11)
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export default function SecurityPage({ onBack }: SecurityPageProps) {
  const showToast = useToast()
  const [section, setSection] = useState<'main' | 'password' | 'phone'>('main')
  const [showOldPwd, setShowOldPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [countdown])

  const handleSendPhoneCode = async () => {
    const digits = toDigits(newPhone)
    if (!isValidPhone(digits)) {
      showToast('请输入正确的11位手机号码')
      return
    }
    setSending(true)
    try {
      await sendSmsCode(digits)
      setCountdown(60)
    } catch {
      setCountdown(60)
    } finally {
      setSending(false)
    }
  }

  const handleChangePassword = () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      showToast('请填写完整信息')
      return
    }
    if (newPwd !== confirmPwd) {
      showToast('两次输入的新密码不一致')
      return
    }
    if (newPwd.length < 6) {
      showToast('新密码至少6位')
      return
    }
    showToast('密码修改成功')
    setSection('main')
    setOldPwd('')
    setNewPwd('')
    setConfirmPwd('')
  }

  const handleChangePhone = () => {
    if (!newPhone || !phoneCode) {
      showToast('请填写完整信息')
      return
    }
    showToast('手机号修改成功')
    setSection('main')
    setNewPhone('')
    setPhoneCode('')
  }

  // 主页面
  if (section === 'main') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <SubNavbar title="账户安全" onBack={onBack} />

        <div className="flex-1 overflow-auto px-4 pt-4 pb-6 space-y-4">
          {/* 安全评分 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-slate-700">安全评分</div>
                <div className="text-xs text-slate-400 mt-0.5">您的账户安全等级</div>
              </div>
              <div className="text-2xl font-bold text-emerald-500">高</div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-[85%] bg-emerald-400 rounded-full" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>低</span>
              <span>中</span>
              <span>高</span>
            </div>
          </div>

          {/* 安全设置项 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <span className="text-sm font-semibold text-slate-700">安全设置</span>
            </div>

            <div
              onClick={() => setSection('password')}
              className="flex items-center px-4 py-3.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center mr-3">
                <Lock className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">修改密码</div>
                <div className="text-xs text-slate-400 mt-0.5">建议定期更换登录密码</div>
              </div>
              <span className="text-xs text-slate-400">修改 &gt;</span>
            </div>

            <div
              onClick={() => setSection('phone')}
              className="flex items-center px-4 py-3.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center mr-3">
                <Smartphone className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">修改手机号</div>
                <div className="text-xs text-slate-400 mt-0.5">更换绑定手机号码</div>
              </div>
              <span className="text-xs text-slate-400">修改 &gt;</span>
            </div>

            <div className="flex items-center px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center mr-3">
                <Key className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">登录设备管理</div>
                <div className="text-xs text-slate-400 mt-0.5">当前设备：iPhone 15 Pro</div>
              </div>
              <span className="text-xs text-slate-400">管理 &gt;</span>
            </div>
          </div>

          {/* 安全日志 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <span className="text-sm font-semibold text-slate-700">最近登录记录</span>
            </div>
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-700">广州 · iPhone 15 Pro</div>
                <div className="text-xs text-slate-400 mt-0.5">2026-07-03 09:30</div>
              </div>
              <span className="text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">当前</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-700">深圳 · Chrome 浏览器</div>
                <div className="text-xs text-slate-400 mt-0.5">2026-07-01 14:20</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 修改密码页面
  if (section === 'password') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <SubNavbar title="修改密码" onBack={() => setSection('main')} />

        <div className="flex-1 overflow-auto px-4 pt-4 pb-6 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <span className="text-sm font-semibold text-slate-700">设置新密码</span>
            </div>

            <div className="px-4 py-3 border-b border-slate-50">
              <label className="text-xs text-slate-400 mb-1 block">当前密码</label>
              <div className="flex items-center gap-2">
                <input
                  type={showOldPwd ? 'text' : 'password'}
                  value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)}
                  className="flex-1 text-sm text-slate-800 bg-transparent outline-none"
                  placeholder="请输入当前密码"
                />
                <button onClick={() => setShowOldPwd(!showOldPwd)}>
                  {showOldPwd ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-50">
              <label className="text-xs text-slate-400 mb-1 block">新密码</label>
              <div className="flex items-center gap-2">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="flex-1 text-sm text-slate-800 bg-transparent outline-none"
                  placeholder="至少6位，包含字母和数字"
                />
                <button onClick={() => setShowNewPwd(!showNewPwd)}>
                  {showNewPwd ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              <label className="text-xs text-slate-400 mb-1 block">确认新密码</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                className="w-full text-sm text-slate-800 bg-transparent outline-none"
                placeholder="请再次输入新密码"
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 px-1">
            密码长度至少6位，建议包含字母、数字和特殊字符
          </div>
        </div>

        <div className="px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
          <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-medium" onClick={handleChangePassword}>
            确认修改
          </Button>
        </div>
      </div>
    )
  }

  // 修改手机号页面
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <SubNavbar title="修改手机号" onBack={() => setSection('main')} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">绑定新手机号</span>
          </div>

          <div className="px-4 py-3 border-b border-slate-50">
            <label className="text-xs text-slate-400 mb-1 block">当前手机号</label>
            <div className="text-sm text-slate-400">138****8888</div>
          </div>

          <div className="px-4 py-3 border-b border-slate-50">
            <label className="text-xs text-slate-400 mb-1 block">新手机号</label>
            <input
              type="tel"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              className="w-full text-sm text-slate-800 bg-transparent outline-none"
              placeholder="请输入新手机号"
            />
          </div>

          <div className="px-4 py-3">
            <label className="text-xs text-slate-400 mb-1 block">验证码</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={phoneCode}
                onChange={e => setPhoneCode(e.target.value)}
                className="flex-1 text-sm text-slate-800 bg-transparent outline-none"
                placeholder="请输入验证码"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={countdown > 0 || sending || !isValidPhone(toDigits(newPhone))}
                className="rounded-lg text-primary border-primary h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendPhoneCode}
              >
                {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
        <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-medium" onClick={handleChangePhone}>
          确认修改
        </Button>
      </div>
    </div>
  )
}
