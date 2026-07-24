import { useState, useEffect } from 'react'
import { getAdminReviews, replyReview, deleteReview } from '@/api/modules/admin'
import type { AdminReviewItem } from '@/api/modules/admin'
import {
  Search, Star, MessageSquare, Trash2, Eye, X, Send, ChevronLeft, ChevronRight, MessageCircle,
} from 'lucide-react'

export function ReviewManagePage() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [starsFilter, setStarsFilter] = useState<number | 'all'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [toast, setToast] = useState('')

  // 弹窗状态
  const [selectedReview, setSelectedReview] = useState<AdminReviewItem | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const result = await getAdminReviews({
        search: search || undefined,
        stars: starsFilter !== 'all' ? starsFilter : undefined,
        page,
        pageSize: 15,
      })
      setReviews(result.list)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (_) {
      showToast('加载评价列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [page])

  // 搜索/筛选变化时重置页码
  useEffect(() => {
    setPage(1)
    const timer = setTimeout(() => { loadData() }, 300)
    return () => clearTimeout(timer)
  }, [search, starsFilter])

  // 删除评价
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该评价吗？删除后司机评分将重新计算。')) return
    try {
      await deleteReview(id)
      showToast('评价已删除')
      await loadData()
    } catch (_) { showToast('删除失败') }
  }

  // 回复评价
  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) {
      showToast('请填写回复内容')
      return
    }
    setSubmitting(true)
    try {
      await replyReview(selectedReview.id, replyText.trim())
      showToast('回复成功')
      setShowReply(false)
      setReplyText('')
      await loadData()
    } catch (_) {
      showToast('回复失败')
    } finally { setSubmitting(false) }
  }

  // 打开回复弹窗
  const openReply = (r: AdminReviewItem) => {
    setSelectedReview(r)
    setReplyText(r.reply || '')
    setShowReply(true)
  }

  // 打开详情弹窗
  const openDetail = (r: AdminReviewItem) => {
    setSelectedReview(r)
    setShowDetail(true)
  }

  // 渲染星级
  const renderStars = (stars: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= stars ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
        />
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">评价管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理乘客评价，回复用户反馈，维护平台口碑</p>
        </div>
      </div>

      {/* 搜索 & 筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="搜索司机名称、评价内容..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: '全部星级' },
            { key: 5, label: '5星' },
            { key: 4, label: '4星' },
            { key: 3, label: '3星' },
            { key: 2, label: '2星' },
            { key: 1, label: '1星' },
          ].map(tab => (
            <button
              key={String(tab.key)}
              onClick={() => setStarsFilter(tab.key as number | 'all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                starsFilter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 font-medium w-16">ID</th>
                <th className="py-3 px-4 font-medium">司机</th>
                <th className="py-3 px-4 font-medium w-24">星级</th>
                <th className="py-3 px-4 font-medium">评价内容</th>
                <th className="py-3 px-4 font-medium">路线</th>
                <th className="py-3 px-4 font-medium w-28">日期</th>
                <th className="py-3 px-4 font-medium w-20">回复</th>
                <th className="py-3 px-4 font-medium w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="py-3 px-4 text-sm text-slate-400 font-mono">#{r.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        r.stars >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.driverName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{r.driverName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{renderStars(r.stars)}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-slate-600 line-clamp-2 max-w-xs">{r.content || '（无文字内容）'}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500 max-w-[120px] truncate">
                    {r.route || r.city || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 px-4">
                    {r.reply ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                        <MessageCircle className="w-3 h-3" />已回复
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                        待回复
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openReply(r)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title={r.reply ? '修改回复' : '回复评价'}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDetail(r)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
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
        {reviews.length === 0 && (
          <div className="py-12 text-center text-slate-400">暂无评价数据</div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-400">共 {total} 条评价</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 评价详情弹窗 ===== */}
      {showDetail && selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">评价详情</h3>
              <button onClick={() => setShowDetail(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 司机信息 */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold">
                  {selectedReview.driverName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">{selectedReview.driverName}</div>
                  <div className="text-xs text-slate-400">
                    {selectedReview.route || selectedReview.city || '未知路线'}
                  </div>
                </div>
              </div>

              {/* 星级 + 日期 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">评分：</span>
                  {renderStars(selectedReview.stars)}
                </div>
                <span className="text-sm text-slate-400">{selectedReview.date}</span>
              </div>

              {/* 评价内容 */}
              <div>
                <div className="text-sm font-medium text-slate-500 mb-2">评价内容</div>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedReview.content || '（无文字内容）'}
                </div>
              </div>

              {/* 平台回复 */}
              {selectedReview.reply ? (
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-2">平台回复</div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium mb-1">
                      <MessageCircle className="w-3.5 h-3.5" />平台回复
                    </div>
                    {selectedReview.reply}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center text-sm text-amber-600">
                  该评价暂未回复
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowDetail(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => { setShowDetail(false); openReply(selectedReview) }}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                {selectedReview.reply ? '修改回复' : '立即回复'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 回复评价弹窗 ===== */}
      {showReply && selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReply(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">{selectedReview.reply ? '修改回复' : '回复评价'}</h3>
              <button onClick={() => setShowReply(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 评价摘要 */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 text-xs font-bold">
                    {selectedReview.driverName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{selectedReview.driverName}</span>
                  <div className="flex items-center ml-auto">
                    {renderStars(selectedReview.stars)}
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{selectedReview.content || '（无文字内容）'}</p>
              </div>

              {/* 回复输入 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">回复内容 <span className="text-red-400">*</span></label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="输入回复内容，展示给乘客..."
                  className="w-full h-28 rounded-xl border border-slate-200 bg-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  maxLength={300}
                />
                <div className="text-right text-xs text-slate-400 mt-1">{replyText.length}/300</div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowReply(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleReply}
                disabled={submitting || !replyText.trim()}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  '提交中...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />发布回复
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white rounded-xl text-sm shadow-lg animate-pulse">
          {toast}
        </div>
      )}
    </div>
  )
}

export default ReviewManagePage
