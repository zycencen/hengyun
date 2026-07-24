import { useState } from 'react'
import { Shield, ArrowRight, Eye, EyeOff, Building2, Loader2 } from 'lucide-react'
import { adminLogin } from '@/api/modules/admin'

interface AdminLoginPageProps {
  onLogin: () => void
}

export function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username.trim()) { setError('请输入账号'); return }
    if (!password.trim()) { setError('请输入密码'); return }
    setError('')
    setLoading(true)

    try {
      const result = await adminLogin({ username: username.trim(), password })
      if (result.token) {
        localStorage.setItem('admin_token', result.token)
        onLogin()
      } else {
        setError('登录失败，请重试')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登录失败'
      if (msg.includes('密码') || msg.includes('password')) {
        setError('账号或密码错误')
      } else if (msg.includes('被禁用') || msg.includes('disabled')) {
        setError('该账号已被禁用')
      } else {
        setError(msg || '登录失败，请检查后端服务是否启动')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">恒运管理后台</h1>
          <p className="text-sm text-slate-400 mt-1">管理员账号登录</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">账号</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="请输入管理员账号"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">密码</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
              />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />{error}
          </div>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-medium text-sm hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-800/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 登录中...</>
            ) : (
              <>登录管理后台 <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* 提示 */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            测试账号：admin / 123456
          </p>
          <a href="/" className="inline-block mt-2 text-xs text-slate-400 hover:text-primary transition-colors">
            返回用户端
          </a>
        </div>
      </div>
    </div>
  )
}

export default AdminLoginPage
