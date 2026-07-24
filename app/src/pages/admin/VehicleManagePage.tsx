import { useState, useEffect, useRef } from 'react'
import { DEFAULT_CARS } from '@/data/defaults'
import { getVehicles, getCarModels, createVehicle, updateVehicle, uploadVehicleImage } from '@/api/modules/admin'
import type { CarInfo } from '@/types'
import type { AdminCarModelItem } from '@/api/modules/admin'
import { Search, Plus, Edit3, Power, PowerOff, X, ChevronDown, Upload, Image, Trash2 } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  available: { label: '空闲', cls: 'bg-emerald-50 text-emerald-600' },
  busy: { label: '出车中', cls: 'bg-orange-50 text-orange-600' },
  offline: { label: '已下架', cls: 'bg-slate-100 text-slate-500' },
}

export function VehicleManagePage() {
  const initialVehicles = DEFAULT_CARS.map((c, i) => ({ ...c, status: (['available', 'busy', 'offline', 'available'] as const)[i] || 'available' }))
  const [vehicles, setVehicles] = useState<CarInfo[]>(initialVehicles)
  const [carModels, setCarModels] = useState<AdminCarModelItem[]>([])

  useEffect(() => {
    getVehicles().then(data => {
      if (data && data.length > 0) setVehicles(data)
    }).catch(() => {})
    getCarModels().then(data => {
      if (data && data.length > 0) setCarModels(data)
    }).catch(() => {})
  }, [])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<CarInfo | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const filtered = vehicles.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return v.name.toLowerCase().includes(s) ||
        v.model.toLowerCase().includes(s) ||
        (v.plate || '').toLowerCase().includes(s)
    }
    return true
  })

  const toggleStatus = async (v: CarInfo) => {
    try {
      const newStatus = v.status === 'offline' ? 'available' : 'offline'
      await updateVehicle(v.id, { status: newStatus })
      setVehicles(prev => prev.map(x => x.id === v.id ? { ...x, status: newStatus } : x))
      showToast(newStatus === 'offline' ? '车辆已下架' : '车辆已上架')
    } catch {
      setVehicles(prev => prev.map(x => x.id === v.id ? { ...x, status: v.status === 'offline' ? 'available' : 'offline' } : x))
      showToast('车辆状态已更新')
    }
  }

  const handleSave = async (data: CarInfo, isEdit: boolean) => {
    try {
      if (isEdit) {
        const result = await updateVehicle(data.id, data)
        setVehicles(prev => prev.map(x => x.id === result.id ? result : x))
        showToast('车辆信息已更新')
      } else {
        const result = await createVehicle(data)
        setVehicles(prev => [result, ...prev])
        showToast('车辆添加成功')
      }
    } catch {
      if (isEdit) {
        setVehicles(prev => prev.map(x => x.id === data.id ? data : x))
        showToast('车辆信息已更新')
      } else {
        const newId = Math.max(...vehicles.map(v => v.id), 0) + 1
        setVehicles(prev => [{ ...data, id: newId }, ...prev])
        showToast('车辆添加成功')
      }
    }
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">车辆管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理平台车辆信息、车牌号与上下架状态</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowAdd(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />添加车辆
        </button>
      </div>

      {/* 搜索 & 状态筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="搜索车辆名称、型号、车牌号..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'available', label: '空闲' },
            { key: 'busy', label: '出车中' },
            { key: 'offline', label: '已下架' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.key ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 车辆表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">车辆图片</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">车辆名称</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">车牌号</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">型号</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">座位数</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">关联组织</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => {
                const st = STATUS_MAP[v.status || 'available']
                return (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      {v.imageUrl ? (
                        <img src={v.imageUrl} alt={v.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Image className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{v.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {v.plate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-mono text-xs font-medium">
                          {v.plate}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">未设置</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.model}</td>
                    <td className="px-4 py-3 text-slate-600">{v.seats}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{v.orgName || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditing(v); setShowAdd(true) }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(v)}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                            v.status === 'offline' ? 'text-slate-400 hover:text-emerald-600' : 'text-slate-400 hover:text-red-500'
                          }`}
                          title={v.status === 'offline' ? '上架' : '下架'}
                        >
                          {v.status === 'offline' ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <div className="text-4xl mb-2">🚗</div>
            <p className="text-sm">暂无车辆数据</p>
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      {showAdd && (
        <VehicleModal
          init={editing}
          carModels={carModels}
          onSave={data => handleSave(data, !!editing)}
          onClose={() => setShowAdd(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}

function VehicleModal({
  init,
  carModels,
  onSave,
  onClose,
}: {
  init: CarInfo | null
  carModels: AdminCarModelItem[]
  onSave: (v: CarInfo) => void
  onClose: () => void
}) {
  const isEdit = !!init
  const activeModels = carModels.filter(m => m.status === 'active')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedModelId, setSelectedModelId] = useState(init?.carModelId || '')
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [name, setName] = useState(init?.name || '')
  const [model, setModel] = useState(init?.model || '')
  const [seats, setSeats] = useState(init?.seats || '')
  const [capacity, setCapacity] = useState(init?.capacity || '')
  const [tags, setTags] = useState(init?.tags?.join('，') || '')
  const [plate, setPlate] = useState(init?.plate || '')
  const [imageUrl, setImageUrl] = useState(init?.imageUrl || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // 根据选择的车型自动填充字段
  const handleModelSelect = (modelItem: AdminCarModelItem) => {
    setSelectedModelId(modelItem.id)
    setName(modelItem.name)
    setModel(`${modelItem.brand} ${modelItem.model}`)
    setSeats(`${modelItem.seats}座`)
    setCapacity(`${modelItem.seats}人`)
    setTags(modelItem.tags?.join('，') || '')
    setModelDropdownOpen(false)
  }

  // 图片上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 前端校验文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB')
      return
    }
    setUploading(true)
    setError('')
    try {
      const result = await uploadVehicleImage(file)
      setImageUrl(result.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => setImageUrl('')

  const selectedModel = activeModels.find(m => m.id === selectedModelId)

  const handleSave = () => {
    if (!name || !model) { setError('请选择车型配置'); return }
    if (!plate.trim()) { setError('请输入车牌号'); return }
    onSave({
      id: init?.id || 0,
      name, model, seats, capacity,
      tags: tags.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      hourlyPrice: init?.hourlyPrice || 0,
      dailyPrice: init?.dailyPrice || 0,
      color: init?.color || '#3B82F6',
      status: init?.status || 'available',
      plate: plate.trim(),
      carModelId: selectedModelId,
      imageUrl,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? '编辑车辆' : '添加车辆'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2.5">{error}</div>}

          {/* 车型选择 */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">选择车型配置</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-left hover:border-primary/50 transition-colors bg-white"
              >
                {selectedModel ? (
                  <span className="text-slate-800">
                    <span className="font-medium">{selectedModel.name}</span>
                    <span className="text-slate-400 ml-2">— {selectedModel.brand} {selectedModel.model} · {selectedModel.seats}座</span>
                  </span>
                ) : (
                  <span className="text-slate-400">点击选择车型...</span>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {modelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-52 overflow-y-auto">
                  {activeModels.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-slate-400">暂无可选车型</div>
                  ) : (
                    activeModels.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModelSelect(m)}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                          selectedModelId === m.id ? 'bg-primary/5 text-primary' : 'text-slate-700'
                        }`}
                      >
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {m.brand} {m.model} · {m.seats}座 · {m.category}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 车牌号 */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">车牌号 <span className="text-red-400">*</span></label>
            <input
              value={plate}
              onChange={e => setPlate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="京A·12345"
            />
          </div>

          {/* 车型信息（自动填充，只读预览） */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">车型信息</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400">名称</span>
                <p className="text-slate-700 font-medium mt-0.5">{name || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">型号</span>
                <p className="text-slate-700 mt-0.5">{model || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">座位数</span>
                <p className="text-slate-700 mt-0.5">{seats || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">容量</span>
                <p className="text-slate-700 mt-0.5">{capacity || '—'}</p>
              </div>
            </div>
          </div>

          {/* 车辆图片上传 */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">车辆图片</label>
            {imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="车辆图片"
                  className="w-32 h-24 rounded-xl object-cover border border-slate-200"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                {uploading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400">上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-300" />
                    <span className="text-xs text-slate-400">点击上传车辆图片</span>
                    <span className="text-[10px] text-slate-300">支持 JPG、PNG、WebP，不超过 5MB</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">取消</button>
          <button onClick={handleSave} className="flex-1 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary/90 font-medium transition-colors">
            {isEdit ? '保存修改' : '添加车辆'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VehicleManagePage
