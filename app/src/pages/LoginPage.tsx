import { useState, useRef, useEffect } from 'react'
import { Shield, ArrowRight, Building2, Loader2, Phone as PhoneIcon } from 'lucide-react'
import { login as apiLogin, sendSmsCode } from '@/api/modules/user'
import { getFleetEntryConfig } from '@/api/modules/fleet'

function toDigits(s: string): string {
  return s.replace(/\D/g, '').slice(0, 11)
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 车队 LOGO 状态
  const [fleetLogo, setFleetLogo] = useState('')
  const [fleetName, setFleetName] = useState('恒运出行')
  const [fleetSubtitle, setFleetSubtitle] = useState('企业出行服务管理平台')
  const fleetOrgIdRef = useRef<string | null>(null) // 登录时传给后端

  // 检测车队入口并加载 LOGO
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fleetOrgId = params.get('fleetOrgId') || localStorage.getItem('fleetOrgId')
    if (fleetOrgId) {
      fleetOrgIdRef.current = fleetOrgId
      getFleetEntryConfig(fleetOrgId)
        .then((data) => {
          if (data.logo) setFleetLogo(data.logo)
          if (data.name) setFleetName(data.name)
          if (data.entryConfig?.bannerTitle) {
            setFleetName(data.entryConfig.bannerTitle)
          } else if (data.name) {
            setFleetName(data.name)
          }
          if (data.entryConfig?.bannerSubtitle) {
            setFleetSubtitle(data.entryConfig.bannerSubtitle)
          }
        })
        .catch(() => {
          // 加载失败，使用默认
        })
    }
  }, [])

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

  const handleSendCode = async () => {
    setError('')
    if (!isValidPhone(phone)) {
      setError('请输入正确的11位手机号码')
      return
    }
    setSending(true)
    try {
      await sendSmsCode(phone)
      setCountdown(60)
    } catch {
      setCountdown(60) // 接口失败也允许测试
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = () => {
    if (!isValidPhone(phone)) { setError('请输入正确的手机号'); return }
    if (!code || code.length < 6) { setError('请输入6位验证码'); return }
    if (!agreed) { setError('请同意服务协议'); return }

    setLoading(true)
    setError('')
    apiLogin({ phone, code, fleetOrgId: fleetOrgIdRef.current || undefined })
      .then((result) => {
        if (result.token) {
          localStorage.setItem('token', result.token)
          onLogin()
        } else {
          setError('登录失败，请重试')
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : '登录失败'
        if (msg.includes('验证码') || msg.includes('code')) {
          setError('验证码错误或已过期')
        } else {
          setError(msg || '登录失败，请检查后端服务是否启动')
        }
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-white to-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-10 text-center">
        {fleetLogo ? (
          <img
            src={fleetLogo}
            alt={fleetName}
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-lg shadow-primary/20 border-2 border-white"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Building2 className="w-9 h-9 text-white" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-800">{fleetName}</h1>
        {fleetSubtitle && (
          <p className="text-sm text-slate-400 mt-1">{fleetSubtitle}</p>
        )}
      </div>

      {/* Form Card */}
      <div className="flex-1 px-6">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-slate-800 text-center mb-6">用户登录</h2>

          {/* 手机号 */}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1">
              <PhoneIcon className="w-3.5 h-3.5 text-primary" />手机号
            </label>
            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary px-4">
              <span className="text-sm text-slate-500 mr-2">+86</span>
              <span className="text-slate-300">|</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(toDigits(e.target.value))}
                placeholder="请输入手机号"
                maxLength={11}
                className="flex-1 py-3 px-3 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          {/* 验证码 */}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">验证码</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="请输入6位验证码"
                maxLength={6}
                className="flex-1 py-3 px-4 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0 || sending}
                className="shrink-0 h-11 px-4 rounded-xl text-xs font-medium transition-all border
                  enabled:bg-primary/5 enabled:text-primary enabled:border-primary/30 enabled:hover:bg-primary/10 enabled:cursor-pointer
                  disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
              >
                {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </div>

          {/* Agreement */}
          <div className="mb-4 flex items-start gap-2">
            <button
              onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                agreed ? 'bg-primary border-primary' : 'border-slate-300'
              }`}
            >
              {agreed && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
            <span className="text-xs text-slate-400 leading-relaxed">
              已阅读并同意
              <span className="text-primary cursor-pointer">《服务协议》</span>和
              <span className="text-primary cursor-pointer">《隐私政策》</span>
            </span>
          </div>

          {error && <div className="mb-3 text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</div>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                登录
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Admin Login Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <a
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              管理员登录
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
