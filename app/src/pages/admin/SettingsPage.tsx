import { useState, useEffect } from 'react'
import { MOCK_CAR_MODELS, MOCK_PRICES, MOCK_ADMIN_USERS } from '@/data/adminDefaults'
import {
  getCarModels, getPrices, getAdminUsers, createAdminUser, updateAdminUser,
  getOrganizations, createOrganization, updateOrganization, deleteOrganization,
  getRoles, createRole, updateRole, deleteRole, updateRolePermissions, getPermissionDefs,
  getCities, createCity, deleteCity, getFleets, type FleetItem,
  createPrice, updatePrice, togglePrice, deletePrice,
} from '@/api/modules/admin'
import type { CarModelConfig, PriceConfig, AdminUser, PackageType } from '@/types'
import type { OrgItem, RoleItem, PermissionDefItem, CityItem, AdminPriceItem } from '@/api/modules/admin'
import {
  Car, DollarSign, MapPin, Shield, Plus, Search,
  Edit3, Trash2, X, Network, Key, ChevronRight, ChevronDown,
  FolderTree, FolderOpen, Truck,
} from 'lucide-react'

type SettingsTab = 'car-models' | 'prices' | 'cities' | 'accounts' | 'roles'

// ============ 弹窗组件 ============
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function FormInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
    />
  )
}

// ============ 组织架构树 ============
function OrgTree({ orgs, onEdit, onDelete }: {
  orgs: OrgItem[]
  onEdit: (org: OrgItem) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(orgs.filter(o => !o.parentId).map(o => o.id)))

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const renderNode = (org: OrgItem, depth: number = 0) => {
    const children = orgs.filter(o => o.parentId === org.id)
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(org.id)

    return (
      <div key={org.id}>
        <div
          className="flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
          style={{ paddingLeft: `${12 + depth * 24}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(org.id)} className="p-0.5 rounded text-slate-400 hover:text-slate-600">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          {hasChildren ? (
            isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <FolderTree className="w-4 h-4 text-amber-500" />
          ) : (
            <FolderTree className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-700 flex-1">{org.name}</span>
          <span className="text-xs text-slate-400">{orgs.filter(o => o.parentId === org.id).length > 0 ? `${children.length}个子部门` : ''}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(org)} className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100" title="编辑">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { if (confirm(`确定删除「${org.name}」及其下属？`)) onDelete(org.id) }}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50" title="删除">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  const topLevel = orgs.filter(o => !o.parentId)
  return <div className="divide-y divide-slate-50">{topLevel.map(org => renderNode(org))}</div>
}

// ============ 新增/编辑 车型弹窗 ============
function CarModelModal({ init, carModels, onSave, onClose }: {
  init?: CarModelConfig
  carModels: CarModelConfig[]
  onSave: (item: CarModelConfig) => void
  onClose: () => void
}) {
  const isEdit = !!init
  const [name, setName] = useState(init?.name || '')
  const [brand, setBrand] = useState(init?.brand || '')
  const [model, setModel] = useState(init?.model || '')
  const [seats, setSeats] = useState(String(init?.seats || 5))
  const [category, setCategory] = useState(init?.category || '经济型')
  const [tags, setTags] = useState(init?.tags?.join('，') || '')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name || !brand || !model) { setError('请填写车型名称、品牌和型号'); return }
    const item: CarModelConfig = {
      id: isEdit ? init.id : `CM${String(carModels.length + 1).padStart(3, '0')}`,
      name, brand, model,
      seats: parseInt(seats) || 5,
      category,
      tags: tags.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      status: init?.status || 'active',
    }
    onSave(item)
    onClose()
  }

  return (
    <Modal title={isEdit ? '编辑车型' : '添加车型'} onClose={onClose}>
      {error && <div className="mb-3 text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</div>}
      <FormField label="车型名称"><FormInput value={name} onChange={setName} placeholder="如：经济型 5座" /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="品牌"><FormInput value={brand} onChange={setBrand} placeholder="大众" /></FormField>
        <FormField label="型号"><FormInput value={model} onChange={setModel} placeholder="帕萨特" /></FormField>
      </div>
      <FormField label="座位数">
        <select value={seats} onChange={e => setSeats(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
          {[5, 7, 9, 12, 19, 33, 45, 55].map(n => <option key={n} value={n}>{n}座</option>)}
        </select>
      </FormField>
      <FormField label="分类">
        <div className="flex gap-2 flex-wrap">
          {['经济型', '舒适型', '商务型', '豪华型'].map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
          ))}
        </div>
      </FormField>
      <FormField label="标签"><FormInput value={tags} onChange={setTags} placeholder="舒适，经济实惠（用逗号分隔）" /></FormField>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">取消</button>
        <button onClick={handleSave} className="flex-1 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary/90 font-medium">{isEdit ? '保存' : '添加'}</button>
      </div>
    </Modal>
  )
}

// ============ 新增/编辑 价格弹窗 ============
function PriceModal({ init, carModels, onSave, onClose }: {
  init?: PriceConfig
  carModels: CarModelConfig[]
  onSave: (item: PriceConfig) => void
  onClose: () => void
}) {
  const isEdit = !!init
  const [carModelId, setCarModelId] = useState(init?.carModelId || carModels[0]?.id || '')
  const [packageType, setPType] = useState<PackageType>(init?.packageType || 'hourly')
  const [duration, setDuration] = useState(init?.duration || '')
  const [price, setPrice] = useState(String(init?.price || ''))
  const [kmLimit, setKmLimit] = useState(String(init?.kmLimit || ''))
  const [overtimeRate, setOvertimeRate] = useState(String(init?.overtimeRate || ''))
  const [overKmRate, setOverKmRate] = useState(String(init?.overKmRate || ''))
  const [serviceFee, setServiceFee] = useState(String(init?.serviceFee || ''))
  const [error, setError] = useState('')

  const selectedModel = carModels.find(m => m.id === carModelId)

  const handleSave = () => {
    if (!carModelId || !duration || !price) { setError('请完整填写信息'); return }
    const item: PriceConfig = {
      id: isEdit ? init.id : `P${Date.now()}`,
      carModelId,
      carModelName: selectedModel?.name || '',
      packageType,
      duration,
      price: parseFloat(price) || 0,
      kmLimit: parseInt(kmLimit) || 0,
      overtimeRate: parseFloat(overtimeRate) || 0,
      overKmRate: parseFloat(overKmRate) || 0,
      serviceFee: parseFloat(serviceFee) || 0,
      status: init?.status || 'active',
    }
    onSave(item)
    onClose()
  }

  return (
    <Modal title={isEdit ? '编辑价格' : '添加价格'} onClose={onClose}>
      {error && <div className="mb-3 text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</div>}
      <FormField label="关联车型">
        <select value={carModelId} onChange={e => setCarModelId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
          {carModels.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </FormField>
      <FormField label="套餐类型">
        <div className="flex gap-2">
          {[
            { key: 'hourly' as PackageType, label: '按小时' },
            { key: 'daily' as PackageType, label: '按天' },
          ].map(p => (
            <button key={p.key} onClick={() => setPType(p.key)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${packageType === p.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{p.label}</button>
          ))}
        </div>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={`时长（${packageType === 'hourly' ? '如4小时' : '如1天'}）`}><FormInput value={duration} onChange={setDuration} placeholder={packageType === 'hourly' ? '4小时' : '1天'} /></FormField>
        <FormField label="价格（元）"><FormInput value={price} onChange={setPrice} placeholder="280" type="number" /></FormField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="里程限制（km）"><FormInput value={kmLimit} onChange={setKmLimit} placeholder="50" type="number" /></FormField>
        <FormField label="超时费（元/h）"><FormInput value={overtimeRate} onChange={setOvertimeRate} placeholder="60" type="number" /></FormField>
        <FormField label="超公里费（元/km）"><FormInput value={overKmRate} onChange={setOverKmRate} placeholder="4" type="number" /></FormField>
      </div>
      <FormField label="服务费（元）"><FormInput value={serviceFee} onChange={setServiceFee} placeholder="20" type="number" /></FormField>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">取消</button>
        <button onClick={handleSave} className="flex-1 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary/90 font-medium">{isEdit ? '保存' : '添加'}</button>
      </div>
    </Modal>
  )
}

// ============ 新增/编辑 管理员账号弹窗 ============
function AdminUserModal({ init, orgs, onSave, onClose }: {
  init?: AdminUser
  orgs: OrgItem[]
  onSave: (item: AdminUser & { password?: string; orgId?: string | null }) => void
  onClose: () => void
}) {
  const isEdit = !!init
  const [username, setUsername] = useState(init?.username || '')
  const [name, setName] = useState(init?.name || '')
  const [role, setRole] = useState<string>(init?.role || 'operator')
  const [phone, setPhone] = useState(init?.phone || '')
  const [password, setPassword] = useState('')
  const [orgId, setOrgId] = useState(init?.orgId || '')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!username || !name || !phone) { setError('请填写必填项'); return }
    if (!isEdit && !password) { setError('请输入密码'); return }
    const item: AdminUser & { password?: string; orgId?: string | null } = {
      id: isEdit ? init.id : `A${Date.now()}`,
      username, name, role, phone,
      status: init?.status || 'active',
      createdAt: init?.createdAt || new Date().toISOString().split('T')[0],
      password: password || undefined,
      orgId: orgId || null,
    } as any
    onSave(item)
    onClose()
  }

  // 构建组织树下拉选项
  const buildOrgOptions = (items: OrgItem[], indent = 0): { value: string; label: string; disabled: boolean }[] => {
    const options: { value: string; label: string; disabled: boolean }[] = []
    const topLevel = items.filter(o => !o.parentId)
    for (const org of topLevel) {
      options.push({ value: org.id, label: '　'.repeat(indent) + org.name, disabled: false })
      const children = items.filter(o => o.parentId === org.id)
      options.push(...buildOrgOptions(children, indent + 1))
    }
    return options
  }

  return (
    <Modal title={isEdit ? '编辑账号' : '添加账号'} onClose={onClose}>
      {error && <div className="mb-3 text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="用户名 *"><FormInput value={username} onChange={setUsername} placeholder="admin" /></FormField>
        <FormField label="姓名 *"><FormInput value={name} onChange={setName} placeholder="张三" /></FormField>
      </div>
      <FormField label="角色">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'superadmin', label: '超级管理员' },
            { key: 'admin', label: '管理员' },
            { key: 'operator', label: '运营' },
            { key: 'finance', label: '财务' },
          ].map(r => (
            <button key={r.key} onClick={() => setRole(r.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${role === r.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r.label}</button>
          ))}
        </div>
      </FormField>
      <FormField label="所属组织">
        <select value={orgId} onChange={e => setOrgId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">-- 无（全部数据）--</option>
          {orgs.filter(o => !o.parentId).flatMap(org => {
            const children = orgs.filter(c => c.parentId === org.id)
            return [
              <option key={org.id} value={org.id}>{org.name}</option>,
              ...children.map(c => (
                <option key={c.id} value={c.id}>　├ {c.name}</option>
              )),
            ]
          })}
        </select>
      </FormField>
      <FormField label="手机号 *"><FormInput value={phone} onChange={setPhone} placeholder="138****0001" /></FormField>
      <FormField label={isEdit ? '新密码（留空不修改）' : '密码 *'}>
        <FormInput value={password} onChange={setPassword} placeholder={isEdit ? '留空则不修改' : '请输入密码'} type="password" />
      </FormField>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">取消</button>
        <button onClick={handleSave} className="flex-1 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary/90 font-medium">{isEdit ? '保存' : '添加'}</button>
      </div>
    </Modal>
  )
}

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('car-models')
  const [carModels, setCarModels] = useState<CarModelConfig[]>(MOCK_CAR_MODELS)
  const [prices, setPrices] = useState<PriceConfig[]>(MOCK_PRICES)
  const [cities, setCities] = useState<CityItem[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(MOCK_ADMIN_USERS)
  const [search, setSearch] = useState('')
  // 价格配置专用筛选
  const [priceSearch, setPriceSearch] = useState('')
  const [pricePackageFilter, setPricePackageFilter] = useState<'all' | PackageType>('all')
  const [priceStatusFilter, setPriceStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [priceCarFilter, setPriceCarFilter] = useState<string>('all')

  // 城市管理的车队筛选 — 必须在引用它的 useEffect 之前声明
  const [cityFleetFilter, setCityFleetFilter] = useState<string>('all')

  useEffect(() => { getCarModels().then(d => setCarModels(d as any)).catch(() => {}) }, [])
  useEffect(() => { getPrices().then(d => setPrices(d as any)).catch(() => {}) }, [])
  useEffect(() => { getAdminUsers().then(d => setAdminUsers(d as any)).catch(() => {}) }, [])
  // 城市列表：根据车队筛选重新加载
  useEffect(() => {
    const fleetId = cityFleetFilter === 'all' ? undefined : cityFleetFilter
    getCities(fleetId).then(d => setCities(d as any)).catch(() => {})
  }, [cityFleetFilter])

  // 组织架构数据
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const loadOrgs = () => { getOrganizations().then(d => { setOrgs(d as any) }).catch(() => {}) }
  useEffect(() => { loadOrgs() }, [])

  // 角色权限数据
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [permDefs, setPermDefs] = useState<PermissionDefItem[]>([])
  const loadRoles = () => {
    Promise.all([getRoles(), getPermissionDefs()])
      .then(([r, p]) => { setRoles(r as any); setPermDefs(p as any) })
      .catch(() => {})
  }
  useEffect(() => { loadRoles() }, [])

  // 车队数据（用于城市管理车队选择器）
  const [fleets, setFleets] = useState<FleetItem[]>([])
  useEffect(() => { getFleets().then(d => setFleets(d as any)).catch(() => {}) }, [])

  // 组织架构弹窗
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrgItem | null>(null)
  const [orgFormName, setOrgFormName] = useState('')
  const [orgFormParentId, setOrgFormParentId] = useState<string | null>(null)
  const [orgFormError, setOrgFormError] = useState('')

  // 角色权限弹窗
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null)
  const [roleFormName, setRoleFormName] = useState('')
  const [roleFormCode, setRoleFormCode] = useState('')
  const [roleFormDesc, setRoleFormDesc] = useState('')
  const [roleFormPerms, setRoleFormPerms] = useState<string[]>([])
  const [roleFormError, setRoleFormError] = useState('')

  // 弹窗状态
  const [modalType, setModalType] = useState<'car' | 'price' | 'account' | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)

  // 城市添加
  const [showCityInput, setShowCityInput] = useState(false)
  const [newCity, setNewCity] = useState('')

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'car-models', label: '车型配置', icon: <Car className="w-4 h-4" /> },
    { key: 'prices', label: '价格配置', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'cities', label: '城市管理', icon: <MapPin className="w-4 h-4" /> },
    { key: 'accounts', label: '账号管理', icon: <Shield className="w-4 h-4" /> },
    { key: 'roles', label: '角色权限', icon: <Key className="w-4 h-4" /> },
  ]

  // ===== 车型操作 =====
  const handleAddCar = () => { setEditingItem(null); setModalType('car') }
  const handleEditCar = (item: CarModelConfig) => { setEditingItem(item); setModalType('car') }
  const handleToggleCar = (id: string) => {
    setCarModels(prev => prev.map(m => m.id === id ? { ...m, status: m.status === 'active' ? 'inactive' as const : 'active' as const } : m))
  }
  const handleDeleteCar = (id: string) => {
    setCarModels(prev => prev.filter(m => m.id !== id))
  }
  const handleSaveCar = (item: CarModelConfig) => {
    if (editingItem) {
      setCarModels(prev => prev.map(m => m.id === item.id ? item : m))
    } else {
      setCarModels(prev => [...prev, item])
    }
  }

  // ===== 价格操作 =====
  const handleAddPrice = () => { setEditingItem(null); setModalType('price') }
  const handleEditPrice = (item: PriceConfig) => { setEditingItem(item); setModalType('price') }
  const handleTogglePrice = async (id: string) => {
    try {
      await togglePrice(id)
      setPrices(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' as const : 'active' as const } : p))
    } catch (_) { /* 忽略错误 */ }
  }
  const handleDeletePrice = async (id: string) => {
    try {
      await deletePrice(id)
      setPrices(prev => prev.filter(p => p.id !== id))
    } catch (_) { /* 忽略错误 */ }
  }
  const handleSavePrice = async (item: PriceConfig) => {
    try {
      if (editingItem) {
        const updated = await updatePrice(item.id, {
          carModelId: item.carModelId,
          carModelName: item.carModelName,
          packageType: item.packageType,
          duration: item.duration,
          price: item.price,
          kmLimit: item.kmLimit,
          overtimeRate: item.overtimeRate,
          overKmRate: item.overKmRate,
          serviceFee: item.serviceFee,
        })
        setPrices(prev => prev.map(p => p.id === item.id ? { ...p, ...(updated as AdminPriceItem) } : p))
      } else {
        const created = await createPrice({
          carModelId: item.carModelId,
          carModelName: item.carModelName,
          packageType: item.packageType,
          duration: item.duration,
          price: item.price,
          kmLimit: item.kmLimit,
          overtimeRate: item.overtimeRate,
          overKmRate: item.overKmRate,
          serviceFee: item.serviceFee,
        })
        setPrices(prev => [...prev, created as unknown as PriceConfig])
      }
    } catch (_) { /* 忽略错误 */ }
  }

  // ===== 城市操作 =====
  const currentFleetId = cityFleetFilter === 'all' ? undefined : cityFleetFilter
  const handleAddCity = async () => {
    const city = newCity.trim()
    if (!city) return
    try {
      const added = await createCity(city, currentFleetId)
      setCities(prev => [...prev, added as CityItem])
      setNewCity('')
      setShowCityInput(false)
    } catch (e: any) {
      setNewCity('')
      setShowCityInput(false)
    }
  }
  const handleRemoveCity = async (city: CityItem) => {
    try {
      await deleteCity(city.id, currentFleetId)
      setCities(prev => prev.filter(c => c.id !== city.id))
    } catch (_) {
      // 删除失败静默处理
    }
  }

  // ===== 账号操作 =====
  const handleAddAccount = () => { setEditingItem(null); setModalType('account') }
  const handleEditAccount = (item: AdminUser) => { setEditingItem(item); setModalType('account') }
  const handleToggleAccount = (id: string) => {
    setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'disabled' as const : 'active' as const } : u))
  }
  const handleSaveAccount = (item: AdminUser & { password?: string }) => {
    if (editingItem) {
      updateAdminUser(item.id, {
        username: item.username, name: item.name, role: item.role, phone: item.phone,
        password: (item as any).password || '',
        orgId: (item as any).orgId, status: item.status,
      }).then(() => getAdminUsers().then(d => setAdminUsers(d as any))).catch(() => {
        setAdminUsers(prev => prev.map(u => u.id === item.id ? item : u))
      })
    } else {
      createAdminUser({
        username: item.username, name: item.name, role: item.role, phone: item.phone,
        password: (item as any).password || '123456',
        orgId: (item as any).orgId,
      }).then(() => getAdminUsers().then(d => setAdminUsers(d as any))).catch(() => {
        setAdminUsers(prev => [...prev, item])
      })
    }
  }

  const closeModal = () => { setModalType(null); setEditingItem(null) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-sm text-slate-500 mt-1">配置车型、价格、服务城市和管理员账号</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearch('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 车型配置 ===== */}
      {activeTab === 'car-models' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" placeholder="搜索车型..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button onClick={handleAddCar} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />添加车型
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {carModels.filter(m => search ? m.name.includes(search) || m.brand.includes(search) || m.model.includes(search) : true).map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{m.name}</h3>
                    <p className="text-sm text-slate-500">{m.brand} {m.model} · {m.seats}座</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {m.status === 'active' ? '启用' : '停用'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{m.category}</span>
                  {m.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{tag}</span>
                  ))}
                </div>
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => handleEditCar(m)} className="flex-1 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" />编辑
                  </button>
                  <button onClick={() => handleToggleCar(m.id)} className="flex-1 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <Shield className="w-3.5 h-3.5" />{m.status === 'active' ? '停用' : '启用'}
                  </button>
                  <button onClick={() => handleDeleteCar(m.id)} className="flex-1 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />删除
                  </button>
                </div>
              </div>
            ))}
            {carModels.filter(m => search ? m.name.includes(search) || m.brand.includes(search) || m.model.includes(search) : true).length === 0 && (
              <div className="col-span-full text-center py-12 text-sm text-slate-400">没有匹配的车型</div>
            )}
          </div>
        </div>
      )}

      {/* ===== 价格配置 ===== */}
      {activeTab === 'prices' && (() => {
        // 价格筛选项：套餐类型 + 状态 + 车型 + 搜索
        const carModelNames = [...new Set(prices.map(p => p.carModelName).filter(Boolean))].sort()
        const filteredPrices = prices.filter(p => {
          if (pricePackageFilter !== 'all' && p.packageType !== pricePackageFilter) return false
          if (priceStatusFilter !== 'all' && p.status !== priceStatusFilter) return false
          if (priceCarFilter !== 'all' && p.carModelName !== priceCarFilter) return false
          if (priceSearch && !p.carModelName.includes(priceSearch) && !p.duration.includes(priceSearch)) return false
          return true
        })

        return (
          <div className="space-y-4">
            {/* 顶部工具栏 */}
            <div className="flex flex-col gap-3">
              {/* 第一行：套餐类型 + 状态 筛选 */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-slate-400 shrink-0">套餐类型：</span>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {[
                    { key: 'all' as const, label: '全部' },
                    { key: 'hourly' as const, label: '按小时' },
                    { key: 'daily' as const, label: '按天' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setPricePackageFilter(item.key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        pricePackageFilter === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400 shrink-0 ml-2">状态：</span>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {[
                    { key: 'all' as const, label: '全部' },
                    { key: 'active' as const, label: '启用' },
                    { key: 'inactive' as const, label: '停用' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setPriceStatusFilter(item.key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        priceStatusFilter === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 第二行：车型下拉 + 搜索 + 添加按钮 */}
              <div className="flex items-center gap-3">
                <select
                  value={priceCarFilter}
                  onChange={e => setPriceCarFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary max-w-[180px]"
                >
                  <option value="all">全部车型</option>
                  {carModelNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" placeholder="搜索车型或时长..."
                    value={priceSearch} onChange={e => setPriceSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                  <span>{filteredPrices.length} / {prices.length} 条</span>
                </div>
                <button onClick={handleAddPrice} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
                  <Plus className="w-4 h-4" />添加价格
                </button>
              </div>
            </div>

            {/* 价格表格 */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                      <th className="py-3 px-5 font-medium">车型</th>
                      <th className="py-3 px-5 font-medium">套餐类型</th>
                      <th className="py-3 px-5 font-medium">关联组织</th>
                      <th className="py-3 px-5 font-medium">时长</th>
                      <th className="py-3 px-5 font-medium">价格</th>
                      <th className="py-3 px-5 font-medium">里程限制</th>
                      <th className="py-3 px-5 font-medium">超时费</th>
                      <th className="py-3 px-5 font-medium">超公里费</th>
                      <th className="py-3 px-5 font-medium">服务费</th>
                      <th className="py-3 px-5 font-medium">状态</th>
                      <th className="py-3 px-5 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrices.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-5 text-sm font-medium text-slate-700">{p.carModelName}</td>
                        <td className="py-3 px-5 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            p.packageType === 'hourly' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                          }`}>
                            {p.packageType === 'hourly' ? '按小时' : '按天'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-slate-500">{p.orgName || '-'}</td>
                        <td className="py-3 px-5 text-sm text-slate-600">{p.duration}</td>
                        <td className="py-3 px-5 text-sm font-semibold text-primary">¥{p.price}</td>
                        <td className="py-3 px-5 text-sm text-slate-500">{p.kmLimit}km</td>
                        <td className="py-3 px-5 text-sm text-slate-500">¥{p.overtimeRate}/h</td>
                        <td className="py-3 px-5 text-sm text-slate-500">¥{p.overKmRate}/km</td>
                        <td className="py-3 px-5 text-sm text-slate-600">¥{p.serviceFee ?? 0}</td>
                        <td className="py-3 px-5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {p.status === 'active' ? '启用' : '停用'}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEditPrice(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary" title="编辑">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleTogglePrice(p.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-orange-500" title={p.status === 'active' ? '停用' : '启用'}>
                              <Shield className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletePrice(p.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500" title="删除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPrices.length === 0 && (
                      <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-400">没有匹配的价格配置</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ===== 城市管理 ===== */}
      {activeTab === 'cities' && (
        <div className="space-y-4">
          {/* 车队选择器 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Truck className="w-4 h-4 text-slate-400" />
              <span>选择车队：</span>
            </div>
            <select
              value={cityFleetFilter}
              onChange={e => setCityFleetFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[160px]"
            >
              <option value="all">全部车队（全局）</option>
              {fleets.filter(f => f.serviceEnabled).map(f => (
                <option key={f.id} value={f.id}>{f.name}（{f.orgName}）</option>
              ))}
            </select>
            <span className="text-xs text-slate-400 ml-2">
              共 {cities.length} 个城市
              {cityFleetFilter !== 'all' && (
                <span className="text-primary font-medium ml-1">
                  · {fleets.find(f => f.id === cityFleetFilter)?.name || ''}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {cityFleetFilter === 'all'
                ? '管理所有车队可运营的城市'
                : `管理「${fleets.find(f => f.id === cityFleetFilter)?.name || ''}」可运营的城市`}
            </p>
            <div className="flex items-center gap-2">
              {showCityInput ? (
                <>
                  <input
                    type="text" placeholder="输入城市名称" value={newCity} onChange={e => setNewCity(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCity()}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    autoFocus
                  />
                  <button onClick={handleAddCity} className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90">确认</button>
                  <button onClick={() => { setShowCityInput(false); setNewCity('') }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">取消</button>
                </>
              ) : (
                <button onClick={() => setShowCityInput(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  {cityFleetFilter !== 'all' ? '为此车队添加城市' : '添加城市'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {cities.map(city => (
              <div key={city.id} className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-sm hover:border-primary/30 transition-all group relative">
                <button
                  onClick={() => handleRemoveCity(city)}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title={cityFleetFilter !== 'all' ? '从该车队移除' : '删除城市'}
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-slate-700">{city.name}</p>
                {/* 全局视图下显示关联车队标签 */}
                {cityFleetFilter === 'all' && city.fleets && city.fleets.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                    {city.fleets.slice(0, 2).map(f => (
                      <span key={f.fleetId} className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                        {f.fleetName}
                      </span>
                    ))}
                    {city.fleets.length > 2 && (
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px]">
                        +{city.fleets.length - 2}
                      </span>
                    )}
                  </div>
                )}
                {cityFleetFilter === 'all' && (!city.fleets || city.fleets.length === 0) && (
                  <p className="text-[10px] text-orange-400 mt-1">未关联车队</p>
                )}
              </div>
            ))}
            {cities.length === 0 && (
              <div className="col-span-full text-center py-12 text-sm text-slate-400">
                {cityFleetFilter !== 'all' ? '该车队暂无关联城市' : '暂无开通城市'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 账号管理 ===== */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">管理系统管理员账号和权限</p>

          <div className="flex gap-4 items-start">
            {/* 左侧：组织架构树 */}
            <div className="w-60 shrink-0 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between p-3 border-b border-slate-100">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Network className="w-4 h-4 text-slate-500" />
                  组织架构
                </h3>
                <button
                  onClick={() => { setEditingOrg(null); setOrgFormName(''); setOrgFormParentId(null); setOrgFormError(''); setShowOrgModal(true) }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                  title="添加组织"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 max-h-[460px] overflow-y-auto">
                {orgs.length > 0 ? (
                  <OrgTree
                    orgs={orgs}
                    onEdit={(org) => {
                      setEditingOrg(org)
                      setOrgFormName(org.name)
                      setOrgFormParentId(org.parentId)
                      setOrgFormError('')
                      setShowOrgModal(true)
                    }}
                    onDelete={async (id) => {
                      if (!confirm('确定删除该组织及其下属？')) return
                      try {
                        await deleteOrganization(id)
                        loadOrgs()
                      } catch (e: any) {
                        alert(e?.message || '删除失败')
                      }
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">暂无组织<br />点击 + 添加</div>
                )}
              </div>
            </div>

            {/* 右侧：账号列表 */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center justify-end">
                <button onClick={handleAddAccount} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />添加账号
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                        <th className="py-3 px-5 font-medium">账号</th>
                        <th className="py-3 px-5 font-medium">姓名</th>
                        <th className="py-3 px-5 font-medium">角色</th>
                        <th className="py-3 px-5 font-medium">所属组织</th>
                        <th className="py-3 px-5 font-medium">手机</th>
                        <th className="py-3 px-5 font-medium">创建时间</th>
                        <th className="py-3 px-5 font-medium">状态</th>
                        <th className="py-3 px-5 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-5 text-sm font-medium text-slate-700">{u.username}</td>
                          <td className="py-3 px-5 text-sm text-slate-600">{u.name}</td>
                          <td className="py-3 px-5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.role === 'superadmin' ? 'bg-red-50 text-red-600' :
                              u.role === 'admin' ? 'bg-blue-50 text-blue-600' :
                              u.role === 'operator' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-purple-50 text-purple-600'
                            }`}>
                              {u.role === 'superadmin' ? '超级管理员' : u.role === 'admin' ? '管理员' : u.role === 'operator' ? '运营' : '财务'}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-sm text-slate-500">{(u as any).orgName || '-'}</td>
                          <td className="py-3 px-5 text-sm text-slate-500">{u.phone}</td>
                          <td className="py-3 px-5 text-sm text-slate-400">{u.createdAt}</td>
                          <td className="py-3 px-5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {u.status === 'active' ? '正常' : '已禁用'}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditAccount(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary" title="编辑">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleToggleAccount(u.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-orange-500" title={u.status === 'active' ? '禁用' : '启用'}>
                                <Shield className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {adminUsers.length === 0 && (
                        <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">暂无管理员账号</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 角色权限 ===== */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">配置角色及其菜单和数据权限</p>
            <button onClick={() => {
              setEditingRole(null); setRoleFormName(''); setRoleFormCode(''); setRoleFormDesc('')
              setRoleFormPerms([]); setRoleFormError(''); setShowRoleModal(true)
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />添加角色
            </button>
          </div>

          {/* 权限矩阵 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-5 font-medium">角色名称</th>
                    <th className="py-3 px-5 font-medium">编码</th>
                    <th className="py-3 px-5 font-medium">系统角色</th>
                    {permDefs.map(d => (
                      <th key={d.key} className="py-3 px-2 font-medium text-center whitespace-nowrap" title={`${d.group}: ${d.label}`}>
                        <div className="text-[10px] text-slate-400">{d.group}</div>
                        <div>{d.label}</div>
                      </th>
                    ))}
                    <th className="py-3 px-5 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length > 0 ? roles.map(role => (
                    <tr key={role.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="py-3 px-5 text-sm font-medium text-slate-700">{role.name}</td>
                      <td className="py-3 px-5 text-sm text-slate-500">{role.code}</td>
                      <td className="py-3 px-5">
                        {role.isSystem ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">系统</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">自定义</span>
                        )}
                      </td>
                      {permDefs.map(d => (
                        <td key={d.key} className="py-3 px-2 text-center">
                          <span className={`inline-block w-4 h-4 rounded ${role.permissions.includes(d.key) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        </td>
                      ))}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingRole(role)
                              setRoleFormName(role.name)
                              setRoleFormCode(role.code)
                              setRoleFormDesc(role.description)
                              setRoleFormPerms([...role.permissions])
                              setRoleFormError('')
                              setShowRoleModal(true)
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary" title="编辑权限">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!role.isSystem && (
                            <button
                              onClick={async () => {
                                if (!confirm(`确定删除角色「${role.name}」？`)) return
                                try {
                                  await deleteRole(role.id)
                                  loadRoles()
                                } catch (e: any) { alert(e?.message || '删除失败') }
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500" title="删除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={permDefs.length + 4} className="py-12 text-center text-sm text-slate-400">暂无角色数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== 弹窗 ===== */}
      {modalType === 'car' && (
        <CarModelModal
          init={editingItem}
          carModels={carModels}
          onSave={handleSaveCar}
          onClose={closeModal}
        />
      )}
      {modalType === 'price' && (
        <PriceModal
          init={editingItem}
          carModels={carModels}
          onSave={handleSavePrice}
          onClose={closeModal}
        />
      )}
      {modalType === 'account' && (
        <AdminUserModal
          init={editingItem}
          orgs={orgs}
          onSave={handleSaveAccount}
          onClose={closeModal}
        />
      )}

      {/* 组织架构弹窗 */}
      {showOrgModal && (
        <Modal title={editingOrg ? '编辑组织' : '添加组织'} onClose={() => setShowOrgModal(false)}>
          {orgFormError && <div className="mb-3 text-xs text-red-500 bg-red-50 rounded-lg p-2">{orgFormError}</div>}
          <FormField label="组织名称 *">
            <FormInput value={orgFormName} onChange={setOrgFormName} placeholder="请输入组织名称" />
          </FormField>
          <FormField label="上级组织">
            <select value={orgFormParentId || ''} onChange={e => setOrgFormParentId(e.target.value || null)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">-- 顶级组织 --</option>
              {orgs.filter(o => !editingOrg || o.id !== editingOrg.id).map(o => (
                <option key={o.id} value={o.id}>{'　'.repeat(o.level)}{o.name}</option>
              ))}
            </select>
          </FormField>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowOrgModal(false)} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">取消</button>
            <button onClick={async () => {
              if (!orgFormName.trim()) { setOrgFormError('请输入组织名称'); return }
              try {
                if (editingOrg) {
                  await updateOrganization(editingOrg.id, { name: orgFormName.trim(), parentId: orgFormParentId })
                } else {
                  await createOrganization({ name: orgFormName.trim(), parentId: orgFormParentId })
                }
                setShowOrgModal(false)
                loadOrgs()
              } catch (e: any) { setOrgFormError(e?.message || '操作失败') }
            }} className="flex-1 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary/90 font-medium">
              {editingOrg ? '保存' : '添加'}
            </button>
          </div>
        </Modal>
      )}

      {/* 角色权限弹窗 */}
      {showRoleModal && (
        <Modal title={editingRole ? '编辑角色权限' : '添加角色'} onClose={() => setShowRoleModal(false)}>
          {roleFormError && <div className="mb-3 text-xs text-red-500 bg-red-50 rounded-lg p-2">{roleFormError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="角色名称 *"><FormInput value={roleFormName} onChange={setRoleFormName} placeholder="如：运营人员" /></FormField>
            <FormField label="角色编码 *"><FormInput value={roleFormCode} onChange={setRoleFormCode} placeholder="如：operator" /></FormField>
          </div>
          <FormField label="描述"><FormInput value={roleFormDesc} onChange={setRoleFormDesc} placeholder="角色描述说明" /></FormField>

          <FormField label="权限配置">
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {(() => {
                const groups = [...new Set(permDefs.map(d => d.group))]
                return groups.map(group => (
                  <div key={group} className="p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {permDefs.filter(d => d.group === group).map(d => (
                        <label key={d.key} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roleFormPerms.includes(d.key)}
                            onChange={() => {
                              setRoleFormPerms(prev =>
                                prev.includes(d.key) ? prev.filter(p => p !== d.key) : [...prev, d.key]
                              )
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-xs text-slate-600">{d.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setRoleFormPerms(permDefs.map(d => d.key))} className="text-xs text-primary hover:underline">全选</button>
              <button onClick={() => setRoleFormPerms([])} className="text-xs text-slate-400 hover:underline">清空</button>
            </div>
          </FormField>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowRoleModal(false)} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">取消</button>
            <button onClick={async () => {
              if (!roleFormName.trim()) { setRoleFormError('请输入角色名称'); return }
              if (!roleFormCode.trim()) { setRoleFormError('请输入角色编码'); return }
              try {
                if (editingRole) {
                  await updateRole(editingRole.id, { name: roleFormName.trim(), code: roleFormCode.trim(), description: roleFormDesc })
                  await updateRolePermissions(editingRole.id, roleFormPerms)
                } else {
                  await createRole({ name: roleFormName.trim(), code: roleFormCode.trim(), description: roleFormDesc, permissions: roleFormPerms })
                }
                setShowRoleModal(false)
                loadRoles()
              } catch (e: any) { setRoleFormError(e?.message || '操作失败') }
            }} className="flex-1 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary/90 font-medium">
              {editingRole ? '保存' : '添加'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdminSettingsPage
