import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

// 根据环境变量切换 API 地址
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  // 不设置默认 Content-Type，让 axios 根据请求体自动设置（JSON / FormData / URLSearchParams）
})


// 请求拦截器：根据请求接口类型注入对应 token
request.interceptors.request.use(
  (config) => {
    const isAdminApi = config.url?.startsWith('/admin') || config.url?.startsWith('/admin/')
    if (isAdminApi) {
      const adminToken = localStorage.getItem('admin_token')
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`
      }
    } else {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一处理错误
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { code, message, data } = response.data
    if (code === 0 || code === 200) {
      return data
    }
    // Token 过期
    if (code === 401) {
      const isAdminPath = window.location.pathname.startsWith('/admin')
      localStorage.removeItem('token')
      localStorage.removeItem('admin_token')
      window.location.href = isAdminPath ? '/admin' : '/login'
    }
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      const isAdminPath = window.location.pathname.startsWith('/admin')
      localStorage.removeItem('token')
      localStorage.removeItem('admin_token')
      window.location.href = isAdminPath ? '/admin' : '/login'
    }
    // 把常见 HTTP 状态码翻译成更友好的中文提示
    if (status === 404) {
      const serverMessage = error.response?.data?.message
      return Promise.reject(new Error(serverMessage || '请求的资源不存在'))
    }
    if (status === 500) {
      return Promise.reject(new Error('服务器内部错误，请稍后重试'))
    }
    if (status >= 502 && status <= 504) {
      return Promise.reject(new Error('服务器暂时不可用，请稍后重试'))
    }
    return Promise.reject(error)
  },
)

// 封装请求方法
export async function get<T = unknown>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
  return request.get(url, { params, ...config }) as Promise<T>
}

export async function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.post(url, data, config) as Promise<T>
}

export async function put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.put(url, data, config) as Promise<T>
}

export async function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.delete(url, config) as Promise<T>
}

export default request
