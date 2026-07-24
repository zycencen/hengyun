import { useState } from 'react'
import { Search, Download, Plus, Eye } from 'lucide-react'
import type { DrivingLog, DrivingLogFillStatus } from '@/types'
import { MOCK_DRIVING_LOGS } from '@/data/adminDefaults'

const FILL_STATUS_CONFIG: Record<DrivingLogFillStatus, { label: string; bg: string; text: string }> = {
  filled: { label: '已填写', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  unfilled: { label: '未填写', bg: 'bg-red-50', text: 'text-red-600' },
  filling: { label: '填写中', bg: 'bg-amber-50', text: 'text-amber-600' },
}

const VEHICLE_STATUS_CONFIG: Record<DrivingLog['vehicleStatus'], { label: string }> = {
  running: { label: '运行' },
  annual_review: { label: '年审' },
  repair: { label: '维修' },
}

export function DrivingLog() {
  const [logs] = useState<DrivingLog[]>(MOCK_DRIVING_LOGS)
  const [statusFilter, setStatusFilter] = useState<'all' | DrivingLogFillStatus>('all')
  const [vehicleFilter, setVehicleFilter] = useState<'all' | DrivingLog['vehicleStatus']>('all')
  const [search, setSearch] = useState('')

  const filtered = logs.filter(log => {
    if (statusFilter !== 'all' && log.fillStatus !== statusFilter) return false
    if (vehicleFilter !== 'all' && log.vehicleStatus !== vehicleFilter) return false
    if (search && !log.plateNo.includes(search) && !log.driverName.includes(search) && !log.fleet.includes(search)) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={vehicleFilter}
              onChange={e => setVehicleFilter(e.target.value as typeof vehicleFilter)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">车辆状态</option>
              <option value="running">运行</option>
              <option value="annual_review">年审</option>
              <option value="repair">维修</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">填写日志</option>
              <option value="filled">已填写</option>
              <option value="unfilled">未填写</option>
              <option value="filling">填写中</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="填写人 / 司机姓名"
              className="pl-3 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-40"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="请输入车牌"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-44"
            />
          </div>

          <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
            查询
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors">
            <Download className="w-4 h-4" />
            导出
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            新增
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="py-3 px-4 font-medium whitespace-nowrap">车牌号</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">所属车队</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">所属司机</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">司机手机号</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">填写状态</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">填写时间</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">车辆状态</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const fillCfg = FILL_STATUS_CONFIG[log.fillStatus]
                return (
                  <tr key={log.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">{log.plateNo}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{log.fleet}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">{log.driverName}</td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{log.driverPhone}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fillCfg.bg} ${fillCfg.text}`}>
                        {fillCfg.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{log.fillTime || '—'}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-700">{VEHICLE_STATUS_CONFIG[log.vehicleStatus].label}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                        查看
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">暂无行车日志</div>
        )}
      </div>
    </div>
  )
}
