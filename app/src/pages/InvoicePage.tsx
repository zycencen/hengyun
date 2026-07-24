import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast, useNavigation } from '@/store'
import { useInvoices } from '@/hooks'
import type { InvoiceTab } from '@/hooks/useInvoices'
import type { ApplyInvoiceParams } from '@/api/modules/invoice'
import { SubNavbar } from '@/components/shared/SubNavbar'
import {
  CheckCircle2, FileText, Building2, User, Mail,
  X, Receipt, Clock, CheckCheck,
} from 'lucide-react'

type FormData = {
  invoiceType: '个人' | '企业'
  title: string
  taxId: string
  email: string
}

const TAB_LIST: { key: InvoiceTab; label: string }[] = [
  { key: 'available', label: '可申请' },
  { key: 'applied', label: '已申请' },
]

export default function InvoicePage() {
  const showToast = useToast()
  const { goBack } = useNavigation()
  const {
    tab, setTab,
    availableOrders, appliedRecords,
    loading, submitting,
    toggleOne, toggleAll,
    allSelected, selectedOrders, selectedCount, totalAmount,
    submitInvoice,
  } = useInvoices()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>({
    invoiceType: '个人',
    title: '',
    taxId: '',
    email: '',
  })

  const handleOpenForm = () => {
    if (selectedCount === 0) {
      showToast('请先选择需要开票的行程')
      return
    }
    setForm({ invoiceType: '个人', title: '', taxId: '', email: '' })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { showToast('请填写发票抬头'); return }
    if (!form.email.trim()) { showToast('请填写接收发票的邮箱'); return }
    if (form.invoiceType === '企业' && !form.taxId.trim()) { showToast('企业发票请填写税号'); return }

    const params: ApplyInvoiceParams = {
      orderIds: selectedOrders.map(o => o.id),
      invoiceType: form.invoiceType,
      title: form.title.trim(),
      taxId: form.invoiceType === '企业' ? form.taxId.trim() : '',
      email: form.email.trim(),
    }

    await submitInvoice(params)
    setShowForm(false)
    showToast(`已提交开票申请，共 ${selectedCount} 笔 ¥${totalAmount}`)
  }

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    '申请中': { color: 'text-orange-600', bg: 'bg-orange-50', icon: <Clock className="w-3 h-3" />, label: '申请中' },
    '已申请': { color: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock className="w-3 h-3" />, label: '已申请' },
    '开票中': { color: 'text-blue-600', bg: 'bg-blue-50', icon: <Receipt className="w-3 h-3" />, label: '开票中' },
    '已开票': { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCheck className="w-3 h-3" />, label: '已开票' },
  }

  return (
    <div className="flex flex-col h-full">
      <SubNavbar title="我的发票" onBack={goBack} />

      {/* Tab 切换 */}
      <div className="flex bg-white border-b border-slate-100">
        {TAB_LIST.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              tab === t.key ? 'text-primary' : 'text-slate-400'
            }`}
          >
            {t.label}
            {tab === t.key && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        {/* 可申请 Tab */}
        {tab === 'available' && (
          <>
            {/* 选择栏 */}
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={toggleAll} className="flex items-center gap-2.5 text-sm text-slate-600">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  allSelected ? 'bg-primary border-primary' : 'border-slate-300'
                }`}>
                  {allSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="font-medium">全选</span>
              </button>
              <span className="text-xs text-slate-400">共 {availableOrders.length} 笔行程</span>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400 text-sm">加载中...</div>
            ) : availableOrders.length === 0 ? (
              <div className="text-center py-16">
                <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">暂无待开票行程</p>
              </div>
            ) : (
              <div className="px-4 space-y-2.5">
                {availableOrders.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => toggleOne(inv.id)}
                    className={`bg-white rounded-2xl p-4 flex items-center gap-3.5 border-2 transition-all cursor-pointer ${
                      inv.selected ? 'border-primary bg-indigo-50/30 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      inv.selected ? 'bg-primary border-primary' : 'border-slate-300'
                    }`}>
                      {inv.selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{inv.route}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        下单时间：{inv.orderTime}
                      </div>
                      <div className="text-xs text-slate-400">{inv.orderNo}</div>
                    </div>
                    <span className="text-base font-bold text-slate-700 flex-shrink-0">¥{inv.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 已申请 Tab */}
        {tab === 'applied' && (
          appliedRecords.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">暂无已申请的发票</p>
            </div>
          ) : (
            <div className="px-4 pt-3 space-y-2.5">
              {appliedRecords.map(rec => {
                const config = statusConfig[rec.status] || statusConfig['申请中']
                return (
                  <div key={rec.id} className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bg} ${config.color}`}>
                          {config.icon}{config.label}
                        </span>
                      </div>
                      <span className="text-base font-bold text-slate-700">¥{rec.amount}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">{rec.title}</div>
                    {rec.invoiceType === '企业' && rec.taxId && (
                      <div className="text-xs text-slate-400 mb-1">税号：{rec.taxId}</div>
                    )}
                    <div className="text-xs text-slate-400 mb-1">
                      {rec.orderNos.length > 1 ? `合并开票（${rec.orderNos.length}笔）` : '单笔开票'}
                      ：{rec.orderNos.join('、')}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>发送至：{rec.email}</span>
                      <span>{rec.appliedAt}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        <div className="h-24" />
      </ScrollArea>

      {/* 底部合并开票按钮（仅可申请 tab 显示） */}
      {tab === 'available' && (
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          {selectedCount > 0 && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-slate-500">已选 {selectedCount} 笔</span>
              <span className="text-sm font-semibold text-slate-700">合计 ¥{totalAmount}</span>
            </div>
          )}
          <Button
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 shadow-lg shadow-accent/25 text-base font-semibold"
            onClick={handleOpenForm}
            disabled={selectedCount === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            {selectedCount > 1 ? `合并开票（${selectedCount}笔）` : selectedCount === 1 ? '申请开票' : '请选择行程'}
          </Button>
        </div>
      )}

      {/* 开票申请表单 — 底部弹出 */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setShowForm(false)}>
          <div
            className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[85%] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* 表单头部 */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">申请开票</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* 已选订单摘要 */}
            <div className="bg-slate-50 rounded-xl p-3 mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">
                  {selectedOrders.length > 1 ? '合并开票' : '单笔开票'}（{selectedOrders.length} 笔）
                </span>
                <span className="text-sm font-bold text-slate-700">¥{totalAmount}</span>
              </div>
              <div className="text-xs text-slate-400 truncate">
                {selectedOrders.map(o => o.route).join('、')}
              </div>
            </div>

            {/* 发票类型 */}
            <label className="block text-sm font-medium text-slate-600 mb-2">发票类型</label>
            <div className="flex gap-2 mb-5">
              {(['个人', '企业'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, invoiceType: t, taxId: t === '个人' ? '' : f.taxId }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all flex items-center justify-center gap-2 ${
                    form.invoiceType === t
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t === '个人' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  {t}
                </button>
              ))}
            </div>

            {/* 发票抬头 */}
            <label className="block text-sm font-medium text-slate-600 mb-2">发票抬头</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={form.invoiceType === '个人' ? '请输入姓名' : '请输入企业全称'}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all mb-5"
            />

            {/* 税号（企业时显示） */}
            {form.invoiceType === '企业' && (
              <>
                <label className="block text-sm font-medium text-slate-600 mb-2">纳税人识别号</label>
                <input
                  type="text"
                  value={form.taxId}
                  onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))}
                  placeholder="请输入纳税人识别号"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all mb-5"
                />
              </>
            )}

            {/* 接收邮箱 */}
            <label className="block text-sm font-medium text-slate-600 mb-2">接收发票邮箱</label>
            <div className="relative mb-3">
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="请输入接收电子发票的邮箱"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400 mb-5">电子发票将在 24 小时内发送至该邮箱</p>

            {/* 提交按钮 */}
            <Button
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 shadow-lg shadow-accent/25 text-base font-semibold"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '提交中...' : `确认申请（¥${totalAmount}）`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
