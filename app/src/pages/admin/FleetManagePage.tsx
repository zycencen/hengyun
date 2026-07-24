import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Edit3, Trash2, Settings2, ShieldCheck, ShieldX, Building2,
  Phone, User, Users, Truck, ClipboardList, Star,
  QrCode, Copy, Download, Check, Link2, Layout, Image, Type, Loader2
} from 'lucide-react'
import QRCode from 'qrcode'
import {
  getFleets,
  createFleet,
  updateFleet,
  deleteFleet,
  uploadFleetLogo,
  type FleetItem,
  type FleetFormData,
} from '@/api/modules/admin'
import { getOrganizations, type OrgItem } from '@/api/modules/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const DEFAULT_ENTRY_CONFIG = {
  home: true,
  order: true,
  orderList: true,
  profile: true,
  invoice: true,
  reviews: true,
  settings: true,
  showCharter: true,
  showCommute: true,
  showCustom: true,
  bannerTitle: '',
  bannerSubtitle: '',
}

export default function FleetManagePage() {
  const [fleets, setFleets] = useState<FleetItem[]>([])
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [searchLeader, setSearchLeader] = useState('')
  const [searchPhone, setSearchPhone] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FleetItem | null>(null)
  const [form, setForm] = useState<Partial<FleetFormData>>({
    orgId: '',
    name: '',
    leaderName: '',
    leaderPhone: '',
    logo: '',
    serviceEnabled: true,
    entryEnabled: true,
    entryConfig: { ...DEFAULT_ENTRY_CONFIG },
  })
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState('') // 本地预览（上传完成前展示）


  const [authFleet, setAuthFleet] = useState<FleetItem | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authForm, setAuthForm] = useState<Record<string, any>>({})
  const [authSaving, setAuthSaving] = useState(false)

  const [qrFleet, setQrFleet] = useState<FleetItem | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const getFleetLink = (fleet: FleetItem) => {
    return `${window.location.origin}/?fleetOrgId=${fleet.orgId}`
  }

  const openQrCode = async (fleet: FleetItem) => {
    setQrFleet(fleet)
    setShowQr(true)
    setCopied(false)
    const link = getFleetLink(fleet)
    try {
      const dataUrl = await QRCode.toDataURL(link, {
        width: 320,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
    } catch {
      setQrDataUrl('')
    }
  }

  const copyLink = async () => {
    if (!qrFleet) return
    try {
      await navigator.clipboard.writeText(getFleetLink(qrFleet))
      setCopied(true)
      showToast('链接已复制到剪贴板')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      showToast('复制失败，请手动复制')
    }
  }

  const downloadQr = () => {
    if (!qrDataUrl || !qrFleet) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `车队入口-${qrFleet.name}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [fleetList, orgList] = await Promise.all([getFleets(), getOrganizations()])
      setFleets(fleetList || [])
      setOrgs(orgList || [])
    } catch (e) {
      showToast(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return fleets.filter(f => {
      const matchName = !searchName || f.name.toLowerCase().includes(searchName.toLowerCase()) || f.orgName.toLowerCase().includes(searchName.toLowerCase())
      const matchLeader = !searchLeader || f.leaderName.toLowerCase().includes(searchLeader.toLowerCase())
      const matchPhone = !searchPhone || f.leaderPhone.includes(searchPhone)
      return matchName && matchLeader && matchPhone
    })
  }, [fleets, searchName, searchLeader, searchPhone])

  // 已有车队的组织 ID 集合（新建车队时过滤掉）
  const usedOrgIds = useMemo(() => new Set(fleets.map(f => f.orgId)), [fleets])

  // 可选的组织列表（排除已有车队的组织）
  const availableOrgs = useMemo(() => {
    if (editing) return orgs // 编辑时不限制
    return orgs.filter(o => !usedOrgIds.has(o.id))
  }, [orgs, usedOrgIds, editing])

  const openAdd = () => {
    setEditing(null)
    setForm({
      orgId: '',
      name: '',
      leaderName: '',
      leaderPhone: '',
      logo: '',
      serviceEnabled: true,
      entryEnabled: true,
      entryConfig: { ...DEFAULT_ENTRY_CONFIG },
    })
    setLogoPreview('')
    setShowForm(true)
  }

  const openEdit = (f: FleetItem) => {
    setEditing(f)
    setForm({
      orgId: f.orgId,
      name: f.name,
      leaderName: f.leaderName,
      leaderPhone: f.leaderPhone,
      logo: f.logo || '',
      serviceEnabled: f.serviceEnabled,
      entryEnabled: f.entryEnabled,
      entryConfig: { ...DEFAULT_ENTRY_CONFIG, ...f.entryConfig },
    })
    setLogoPreview('')
    setShowForm(true)
  }

  const openAuth = (f: FleetItem) => {
    const merged = { ...DEFAULT_ENTRY_CONFIG, ...f.entryConfig }
    setAuthFleet(f)
    setAuthForm({ ...merged })
    setShowAuth(true)
  }

  const handleAuthFormToggle = (key: string) => {
    setAuthForm(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAuthSave = async () => {
    if (!authFleet) return
    setAuthSaving(true)
    try {
      await updateFleet(authFleet.id, { entryConfig: authForm })
      showToast('授权配置已更新')
      setShowAuth(false)
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '更新失败')
    } finally {
      setAuthSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.orgId || !form.name) {
      showToast('请选择所属组织并填写车队名称')
      return
    }
    try {
      if (editing) {
        await updateFleet(editing.id, form)
        showToast('更新成功')
        setShowForm(false)
        load()
      } else {
        await createFleet(form as FleetFormData)
        showToast('创建成功')
        setShowForm(false)
        load()
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    }
  }


  const handleDelete = async (f: FleetItem) => {
    if (!confirm(`确定删除车队「${f.name}」？`)) return
    try {
      await deleteFleet(f.id)
      showToast('删除成功')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除失败')
    }
  }


  const renderEntrySwitch = (key: string, label: string, icon: React.ReactNode) => (
    <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        {icon}
        {label}
      </div>
      <input
        type="checkbox"
        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
        checked={!!authForm[key]}
        onChange={() => handleAuthFormToggle(key)}
      />
    </label>
  )

  const handleServiceToggle = async (f: FleetItem) => {
    try {
      const updated = await updateFleet(f.id, { serviceEnabled: !f.serviceEnabled })
      showToast(`服务授权已${updated.serviceEnabled ? '开启' : '关闭'}`)
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '更新失败')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 先展示本地预览
    const localUrl = URL.createObjectURL(file)
    setLogoPreview(localUrl)
    setLogoUploading(true)
    try {
      const result = await uploadFleetLogo(file)
      setForm({ ...form, logo: result.url })
      setLogoPreview('')
      showToast('LOGO 上传成功')
    } catch (e) {
      setLogoPreview('')
      showToast(e instanceof Error ? e.message : 'LOGO 上传失败')
    } finally {
      setLogoUploading(false)
      // 清空 input，允许重复选择同一文件
      e.target.value = ''
    }
  }



  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">车队信息管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理各车队的对外用户端入口、服务授权及订单归属组织</p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> 新增车队
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="车队名称"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="pl-10 h-10 rounded-lg border-slate-200"
            />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="归属车队队长"
              value={searchLeader}
              onChange={e => setSearchLeader(e.target.value)}
              className="pl-10 h-10 rounded-lg border-slate-200"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索车队电话"
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              className="pl-10 h-10 rounded-lg border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1 border-slate-200 text-slate-600" onClick={() => { setSearchName(''); setSearchLeader(''); setSearchPhone('') }}>
              重置
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white">
              <Search className="w-4 h-4 mr-2" /> 查询
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">所属组织</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">车队名称</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">车队长</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">车队电话</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">司机数</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">车辆数</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">总接单</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">拒单率</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">平均评价</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">服务授权</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="py-12 text-center text-slate-400">加载中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-slate-400">暂无车队数据</td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-slate-700 font-medium">{f.orgName}</td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium">{f.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{f.leaderName || '-'}</td>
                  <td className="px-4 py-3.5 text-slate-600">{f.leaderPhone || '-'}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{f.driverCount}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{f.vehicleCount}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{f.totalOrders}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{f.rejectRate}%</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                      <Star className="w-3.5 h-3.5 fill-current" /> {f.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => handleServiceToggle(f)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        f.serviceEnabled
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {f.serviceEnabled ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                      {f.serviceEnabled ? '已授权' : '未授权'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openQrCode(f)}
                        className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"
                        title="车队入口链接和二维码"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(f)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openAuth(f)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                        title="授权配置"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑车队' : '新增车队'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">所属组织</label>
              <select
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={form.orgId || ''}
                disabled={!!editing}
                onChange={e => setForm({ ...form, orgId: e.target.value })}
              >
                <option value="">请选择组织</option>
                {availableOrgs.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
                {availableOrgs.length === 0 && !editing && (
                  <option value="" disabled>所有组织均已创建车队</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">车队名称</label>
              <Input
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="请输入车队名称"
                className="h-10 rounded-lg border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">车队长</label>
                <Input
                  value={form.leaderName || ''}
                  onChange={e => setForm({ ...form, leaderName: e.target.value })}
                  placeholder="车队长姓名"
                  className="h-10 rounded-lg border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">车队电话</label>
                <Input
                  value={form.leaderPhone || ''}
                  onChange={e => setForm({ ...form, leaderPhone: e.target.value })}
                  placeholder="联系电话"
                  className="h-10 rounded-lg border-slate-200"
                />
              </div>
            </div>
            {/* LOGO 上传 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">车队 LOGO</label>
              <p className="text-xs text-slate-400 mb-2">用于用户端登录页展示，支持 jpg/png/gif/webp，建议正方形图片</p>
              <div className="flex items-center gap-4">
                {(form.logo || logoPreview) ? (
                  <div className="relative group">
                    <img
                      src={form.logo || logoPreview}
                      alt="车队 LOGO"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                    {logoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    )}
                    <button
                      onClick={() => { setForm({ ...form, logo: '' }); setLogoPreview('') }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="移除 LOGO"
                      disabled={logoUploading}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                    <Image className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    logoUploading
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                    {logoUploading ? (
                      <>上传中...</>
                    ) : (
                      <>
                        <Image className="w-4 h-4" />
                        {form.logo || logoPreview ? '更换 LOGO' : '上传 LOGO'}
                      </>
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                  checked={form.serviceEnabled}
                  onChange={e => setForm({ ...form, serviceEnabled: e.target.checked })}
                />
                服务授权
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                  checked={form.entryEnabled}
                  onChange={e => setForm({ ...form, entryEnabled: e.target.checked })}
                />
                用户端入口启用
              </label>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-200 text-slate-600">取消</Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-white">{editing ? '保存' : '创建'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Config Dialog */}
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>授权配置 - {authFleet?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 首页服务入口 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5" />首页服务入口
              </p>
              <div className="space-y-1.5">
                {renderEntrySwitch('showCharter', '包车服务', <Users className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('showCommute', '上下班车', <Truck className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('showCustom', '定制包车', <Star className="w-4 h-4 text-slate-500" />)}
              </div>
            </div>

            {/* 模块入口 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />页面模块入口
              </p>
              <div className="space-y-1.5">
                {renderEntrySwitch('home', '首页', <Building2 className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('order', '下单/预约', <ClipboardList className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('orderList', '订单列表', <ClipboardList className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('profile', '个人中心', <User className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('invoice', '发票', <Settings2 className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('reviews', '评价', <Star className="w-4 h-4 text-slate-500" />)}
                {renderEntrySwitch('settings', '设置', <Settings2 className="w-4 h-4 text-slate-500" />)}
              </div>
            </div>

            {/* Banner 配置 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />首页 Banner 配置
              </p>
              <p className="text-xs text-slate-400 mb-3">留空则默认显示车队名称。非恒运车队建议配置自有品牌名称。</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                    <Type className="w-3 h-3" />品牌名称
                  </label>
                  <Input
                    value={authForm.bannerTitle || ''}
                    onChange={e => setAuthForm(prev => ({ ...prev, bannerTitle: e.target.value }))}
                    placeholder="如：恒运出行（留空则显示车队名）"
                    className="h-9 rounded-lg border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                    <Type className="w-3 h-3" />副标题/标语
                  </label>
                  <Input
                    value={authForm.bannerSubtitle || ''}
                    onChange={e => setAuthForm(prev => ({ ...prev, bannerSubtitle: e.target.value }))}
                    placeholder="如：智慧出行·一键直达"
                    className="h-9 rounded-lg border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button onClick={() => setShowAuth(false)} variant="outline" className="border-slate-200 text-slate-600">取消</Button>
              <Button onClick={handleAuthSave} disabled={authSaving} className="bg-primary hover:bg-primary/90 text-white">
                {authSaving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>车队入口 - {qrFleet?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-5 py-3">
            <p className="text-xs text-slate-500 text-center">
              用户扫描二维码或点击链接即可进入该车队的专属用户端，下单将自动归属到该车队
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="车队入口二维码" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-300">
                  <QrCode className="w-12 h-12 animate-pulse" />
                </div>
              )}
            </div>

            {/* Fleet Info */}
            <div className="w-full bg-slate-50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">车队：</span>
                <span className="text-slate-700 font-medium">{qrFleet?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">车队长：</span>
                <span className="text-slate-700">{qrFleet?.leaderName || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">电话：</span>
                <span className="text-slate-700">{qrFleet?.leaderPhone || '-'}</span>
              </div>
            </div>

            {/* Link */}
            <div className="w-full">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">车队专属链接</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-600 font-mono break-all select-all">
                  {qrFleet ? getFleetLink(qrFleet) : ''}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyLink}
                  className="shrink-0 border-slate-200 gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full pt-1">
              <Button
                variant="outline"
                className="flex-1 border-slate-200 text-slate-600 gap-2"
                onClick={downloadQr}
                disabled={!qrDataUrl}
              >
                <Download className="w-4 h-4" />
                下载二维码
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-slate-200 text-slate-600 gap-2"
                onClick={() => setShowQr(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg">{toast}</div>}
    </div>
  )
}
