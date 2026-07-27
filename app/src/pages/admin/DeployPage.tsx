import { useState, useEffect, useCallback } from 'react'
import { Server, RefreshCw, ArrowRight, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { getSyncStatus, syncToProd, type SyncStatusResult } from '@/api/modules/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    running:     { icon: <CheckCircle className="w-4 h-4" />, label: '运行中',   className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    deployed:    { icon: <CheckCircle className="w-4 h-4" />, label: '已部署',   className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    unknown:     { icon: <AlertCircle className="w-4 h-4" />, label: '未知',     className: 'bg-amber-100 text-amber-700 border-amber-200' },
    stopped:     { icon: <XCircle className="w-4 h-4" />,    label: '已停止',   className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const c = config[status] || config.unknown
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  )
}

export default function DeployPage() {
  const [status, setStatus] = useState<SyncStatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSyncStatus()
      setStatus(res)
    } catch {
      // 本地开发环境 API 不可用
      setStatus({
        lastSync: null,
        testStatus: { backend: 'unknown', frontend: 'unknown' },
        prodStatus: { backend: 'unknown', frontend: 'unknown' },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await syncToProd()
      setSyncResult(res.output || '同步完成')
      await loadStatus()
    } catch (e: any) {
      setSyncResult(e?.message || '同步请求失败')
    } finally {
      setSyncing(false)
    }
  }

  const lastSyncTime = status?.lastSync
    ? new Date(status.lastSync.created_at).toLocaleString('zh-CN')
    : null

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">环境部署管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理测试环境与正式环境的部署和同步</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStatus} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新状态
        </Button>
      </div>

      {/* 环境状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 测试环境 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-slate-800">测试环境</h3>
            </div>
            <p className="text-xs text-slate-500">test.admin.hengyunbus.cn</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">后端 API</span>
                <StatusBadge status={status?.testStatus.backend || 'unknown'} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">前端页面</span>
                <StatusBadge status={status?.testStatus.frontend || 'unknown'} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 正式环境 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">正式环境</h3>
            </div>
            <p className="text-xs text-slate-500">admin.hengyunbus.cn</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">后端 API</span>
                <StatusBadge status={status?.prodStatus.backend || 'unknown'} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">前端页面</span>
                <StatusBadge status={status?.prodStatus.frontend || 'unknown'} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 同步操作 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">同步到正式环境</h3>
              <p className="text-xs text-slate-500 mt-1">
                将测试环境的代码同步到正式环境（数据库和上传文件不会被覆盖）
              </p>
            </div>
            {lastSyncTime && (
              <span className="text-xs text-slate-400">
                上次同步：{lastSyncTime}（{status?.lastSync?.admin_name}）
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <strong>注意：</strong>同步仅复制代码文件，正式环境的数据库、上传文件和配置将保持不变。同步过程中后端服务会短暂重启。
            </div>
          </div>

          <Button
            onClick={handleSync}
            disabled={syncing}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {syncing
              ? <><Loader2 className="w-4 h-4 animate-spin" />同步中...</>
              : <><ArrowRight className="w-4 h-4" />同步测试环境 → 正式环境</>
            }
          </Button>

          {/* 同步结果 */}
          {syncResult && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">同步输出：</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-40 overflow-auto">
                {syncResult}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
