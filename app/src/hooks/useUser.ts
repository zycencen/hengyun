import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserProfile } from '@/api/modules/user'
import type { UserProfile } from '@/api/modules/user'
import { useAppContext } from '@/store'

const DEFAULT_USER: UserProfile = {
  id: 0,
  name: '游客',
  phone: '',
  company: '',
  isVip: false,
  isEnterpriseVerified: false,
}

export function useUser() {
  const { state, dispatch, logout } = useAppContext()
  const [localUser, setLocalUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // 用 ref 保持 logout 最新引用，避免 fetchUser 依赖链导致循环刷新
  const logoutRef = useRef(logout)
  logoutRef.current = logout

  const fetchUser = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    getUserProfile()
      .then((data) => {
        if (data && data.id) {
          setLocalUser(data)
          dispatch({ type: 'SET_USER', payload: data })
        } else {
          // 接口返回了空用户：token 对应的人可能已被删除，退出登录
          logoutRef.current()
        }
      })
      .catch((e: unknown) => {
        // 仅 401 明确表示 token 无效时才退出，其他错误静默降级为游客
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('未登录') || msg.includes('登录已过期') || msg.includes('token')) {
          logoutRef.current()
        } else {
          // 网络波动等临时错误：不清除登录状态，仅本地显示游客
          setLocalUser(DEFAULT_USER)
          dispatch({ type: 'SET_USER', payload: DEFAULT_USER })
        }
      })
      .finally(() => setLoading(false))
  }, [dispatch])

  useEffect(() => {
    // 如果 context 中已有有效用户数据，直接使用
    if (state.user && state.user.id) {
      setLocalUser(state.user)
      setLoading(false)
      return
    }
    fetchUser()
  }, [state.user, fetchUser])

  // 优先使用 context 中的用户数据（全局最新），fallback 到本地状态
  const user = state.user && state.user.id ? state.user : localUser

  return { user, loading, logout, refresh: fetchUser, isLoggedIn: !!localStorage.getItem('token') }
}
