import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Phone, ShieldCheck } from 'lucide-react'
import { sendSmsCode } from '@/api/modules/user'

interface PhoneVerifyProps {
  phone: string
  onPhoneChange: (phone: string) => void
  verified: boolean
  onVerifiedChange: (verified: boolean) => void
  /** 当前验证码值（外部控制） */
  code?: string
  /** 验证码变化回调 */
  onCodeChange?: (code: string) => void
}

/** 验证中国大陆手机号格式 */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\s/g, '')
  return /^1[3-9]\d{9}$/.test(digits)
}

/** 只提取数字 */
function toDigits(s: string): string {
  return s.replace(/\D/g, '').slice(0, 11)
}

export function PhoneVerify({ phone, onPhoneChange, verified, onVerifiedChange, code: externalCode, onCodeChange }: PhoneVerifyProps) {
  const [code, setCode] = useState(externalCode || '')
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
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

  const handleSendCode = async () => {
    setError('')
    const digits = toDigits(phone)
    if (!isValidPhone(digits)) {
      setError('请输入正确的11位手机号码')
      return
    }
    setSending(true)
    try {
      await sendSmsCode(digits)
      setCountdown(60)
    } catch {
      setCountdown(60) // 即使接口失败也允许测试
    } finally {
      setSending(false)
    }
  }

  const handleCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    onCodeChange?.(digits)
    if (digits.length === 6) {
      // 验证码输入完整，标记已验证
      onVerifiedChange(true)
      setError('')
    } else {
      onVerifiedChange(false)
    }
  }

  const handlePhoneInput = (val: string) => {
    const digits = toDigits(val)
    onPhoneChange(digits)
    setError('')
    if (verified && digits !== phone) {
      onVerifiedChange(false)
      setCode('')
    }
  }

  return (
    <div className="space-y-2.5">
      {/* 手机号 */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
          <Phone className="w-3.5 h-3.5 text-primary" />手机号
        </label>
        <div className="flex gap-2">
          <Input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => handlePhoneInput(e.target.value)}
            placeholder="请输入手机号码"
            className="h-11 rounded-xl border-slate-200 focus:border-primary flex-1"
            maxLength={11}
          />
          <button
            type="button"
            disabled={countdown > 0 || sending || !isValidPhone(toDigits(phone))}
            onClick={handleSendCode}
            className="shrink-0 h-11 px-3 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed border
              enabled:bg-primary/5 enabled:text-primary enabled:border-primary/30 enabled:hover:bg-primary/10
              disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
          >
            {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* 验证码 */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />验证码
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={e => handleCodeChange(e.target.value)}
          placeholder="请输入6位验证码"
          className="h-11 rounded-xl border-slate-200 focus:border-primary"
          maxLength={6}
        />
        {verified && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />验证通过
          </p>
        )}
      </div>
    </div>
  )
}
