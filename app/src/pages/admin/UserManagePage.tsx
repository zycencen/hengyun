import { useState, useEffect } from 'react'
import { MOCK_CUSTOMERS } from '@/data/adminDefaults'
import { getCustomers, updateCustomer, getUserOrgs, updateUserOrgs, getOrganizations } from '@/api/modules/admin'
import { Search, Building2, Eye, Ban, Check, X, UserCheck, Crown, Layers, Trash2 } from 'lucide-react'

export function UserManagePage() {
  const [users, setUsers] = useState(MOCK_CUSTOMERS)

  useEffect(() => {
    getCustomers().then(data => { if (data && data.length > 0) setUsers(data as any) }).catch(() => {})
    getOrganizations().then(data => { if (data) setAllOrgs(data) }).catch(() => {})
  }, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [detailUser, setDetailUser] = useState<any>(null)
  const [allOrgs, setAllOrgs] = useState<any[]>([])
  const [orgEditUser, setOrgEditUser] = useState<any>(null)
  const [orgEditIds, setOrgEditIds] = useState<string[]>([])
  const [orgEditLoading, setOrgEditLoading] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  // 切换用户类型
  const handleToggleUserType = async (id: number, currentType: string) => {
    const newType = currentType === '大客户用户' ? '普通用户' : '大客户用户'
    // 乐观更新
    setUsers(prev => prev.map(u => u.id === id ? { ...u, userType: newType } : u))
    try {
      await updateCustomer(id, { userType: newType })
      showToast(`已切换为「${newType}」`)
    } catch {
      // 回滚
      setUsers(prev => prev.map(u => u.id === id ? { ...u, userType: currentType } : u))
      showToast('操作失败，请重试')
    }
  }

  const handleAudit = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' as const } : u))
    showToast('用户审核已通过')
  }

  const handleBan = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'pending' as const : 'active' as const } : u))
    const user = users.find(u => u.id === id)
    showToast(user?.status === 'active' ? '用户已禁用' : '用户已启用')
  }

  // 打开组织编辑弹窗
  const openOrgEdit = async (u: any) => {
    setOrgEditUser(u)
    setOrgEditLoading(true)
    try {
      const userOrgs = await getUserOrgs(u.id)
      setOrgEditIds((userOrgs || []).map((o: any) => o.id))
    } catch {
      setOrgEditIds([])
    } finally {
      setOrgEditLoading(false)
    }
  }

  // 切换组织选中
  const toggleOrg = (orgId: string) => {
    setOrgEditIds(prev => prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId])
  }

  // 保存组织关联
  const saveOrgs = async () => {
    if (!orgEditUser) return
    try {
      await updateUserOrgs(orgEditUser.id, orgEditIds)
      showToast('组织关联已更新')
      // 刷新用户列表
      const data = await getCustomers()
      if (data && data.length > 0) setUsers(data as any)
      setOrgEditUser(null)
    } catch {
      showToast('更新失败，请重试')
    }
  }

  const filtered = users.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    if (typeFilter !== 'all' && u.userType !== typeFilter) return false
    if (search && !u.name.includes(search) && !u.phone.includes(search) && !u.company.includes(search)) return false
    return true
  })

  const vipCount = users.filter(u => u.userType === '大客户用户').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">用户管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理平台乘客用户，区分普通用户与大客户，审核企业认证，查看用户数据</p>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: '总用户数', value: users.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '活跃用户', value: users.filter(u => u.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '大客户', value: vipCount, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '企业用户', value: users.filter(u => u.company).length, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '待审核', value: users.filter(u => u.status === 'pending').length, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
            <p className="text-sm text-slate-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="搜索用户名、手机、企业..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部状态' },
            { key: 'active', label: '活跃' },
            { key: 'pending', label: '待审核' },
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
          <span className="w-px bg-slate-200 mx-1" />
          {[
            { key: 'all', label: '全部类型' },
            { key: '普通用户', label: '普通用户' },
            { key: '大客户用户', label: '大客户' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                typeFilter === tab.key ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-500/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-5 font-medium">用户</th>
                <th className="py-3 px-5 font-medium">用户类型</th>
                <th className="py-3 px-5 font-medium">企业</th>
                <th className="py-3 px-5 font-medium">关联组织</th>
                <th className="py-3 px-5 font-medium">订单数</th>
                <th className="py-3 px-5 font-medium">消费总额</th>
                <th className="py-3 px-5 font-medium">注册时间</th>
                <th className="py-3 px-5 font-medium">状态</th>
                <th className="py-3 px-5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">{u.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.userType === '大客户用户'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}>
                      {u.userType === '大客户用户' && <Crown className="w-3 h-3" />}
                      {u.userType || '普通用户'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-sm text-slate-600">
                    {u.company ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        {u.company}
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-3 px-5">
                    <button
                      onClick={() => openOrgEdit(u)}
                      className="text-sm text-left hover:text-primary transition-colors flex items-center gap-1 group"
                      title="点击设置关联组织"
                    >
                      {u.orgName && u.orgName !== '-' ? (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary" />
                          <span className="text-slate-600 group-hover:text-primary max-w-[180px] truncate">{u.orgName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 italic text-xs">未关联组织</span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-5 text-sm text-slate-600">{u.orderCount}</td>
                  <td className="py-3 px-5 text-sm font-medium text-slate-700">¥{u.totalAmount.toLocaleString()}</td>
                  <td className="py-3 px-5 text-sm text-slate-400">{u.createdAt}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {u.status === 'active' ? '活跃' : '待审核'}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1">
                      {u.status === 'pending' && (
                        <button onClick={() => handleAudit(u.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="通过审核">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleUserType(u.id, u.userType || '普通用户')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.userType === '大客户用户'
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            : 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                        }`}
                        title={u.userType === '大客户用户' ? '切换为普通用户' : '切换为大客户用户'}
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDetailUser(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleBan(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title={u.status === 'active' ? '禁用' : '启用'}>
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">暂无用户数据</div>
        )}
      </div>

      {/* 用户详情弹窗 */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">用户详情</h3>
              <button onClick={() => setDetailUser(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">{detailUser.name[0]}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{detailUser.name}</h3>
                  <p className="text-sm text-slate-500">{detailUser.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: '企业', value: detailUser.company || '-' },
                  { label: '用户类型', value: detailUser.userType || '普通用户', highlight: detailUser.userType === '大客户用户' },
                  { label: '订单数', value: detailUser.orderCount },
                  { label: '消费总额', value: `¥${detailUser.totalAmount.toLocaleString()}` },
                  { label: '注册时间', value: detailUser.createdAt },
                  { label: '状态', value: detailUser.status === 'active' ? '活跃' : '待审核' },
                ].map((item, i) => (
                  <div key={i}>
                    <span className="text-slate-400 text-xs">{item.label}</span>
                    <p className={`font-medium mt-0.5 ${item.highlight ? 'text-amber-600' : 'text-slate-800'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => { handleToggleUserType(detailUser.id, detailUser.userType || '普通用户'); setDetailUser(null) }}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  detailUser.userType === '大客户用户'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {detailUser.userType === '大客户用户' ? '取消大客户' : '设为大客户'}
              </button>
              <button onClick={() => setDetailUser(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 组织关联编辑弹窗 */}
      {orgEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOrgEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">关联组织 - {orgEditUser.name}</h3>
              <button onClick={() => setOrgEditUser(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500 mb-3">选择该用户所属的组织（可多选）。仅关联「恒运」一级组织的用户可在用户端看到所属组织。</p>
              {orgEditLoading ? (
                <div className="py-8 text-center text-slate-400">加载中...</div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {allOrgs.map((org: any) => (
                    <label
                      key={org.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        orgEditIds.includes(org.id) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={orgEditIds.includes(org.id)}
                        onChange={() => toggleOrg(org.id)}
                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${orgEditIds.includes(org.id) ? 'text-primary' : 'text-slate-700'}`}>
                          {org.name}
                        </span>
                        {org.parentId && (
                          <span className="text-xs text-slate-400 ml-1.5">
                            ({allOrgs.find((o: any) => o.id === org.parentId)?.name || ''})
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                  {allOrgs.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-sm">暂无可用组织</div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setOrgEditUser(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200">取消</button>
              <button onClick={saveOrgs} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90" disabled={orgEditLoading}>保存</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg">{toast}</div>}
    </div>
  )
}

export default UserManagePage
