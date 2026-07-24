import { useState } from 'react'
import { Search, MessageCircle, Send, X, User, CheckCircle2 } from 'lucide-react'

interface Conversation {
  id: string
  customerName: string
  customerAvatar: string
  lastMessage: string
  unread: number
  time: string
  status: 'waiting' | 'active' | 'closed'
  messages: { from: 'customer' | 'agent'; text: string; time: string }[]
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'C001', customerName: '张三', customerAvatar: '张三', lastMessage: '请问包车发票怎么开具？', unread: 2, time: '14:30',
    status: 'waiting',
    messages: [
      { from: 'customer', text: '你好，我想问一下包车的发票怎么开？', time: '14:28' },
      { from: 'customer', text: '还有发票抬头可以用个人的吗？', time: '14:30' },
    ],
  },
  {
    id: 'C002', customerName: '李四', customerAvatar: '李四', lastMessage: '好的，谢谢', unread: 0, time: '13:15',
    status: 'active',
    messages: [
      { from: 'customer', text: '我的订单可以改时间吗？', time: '13:05' },
      { from: 'agent', text: '可以的，请问您的订单号是多少？', time: '13:08' },
      { from: 'customer', text: 'HY20260702002', time: '13:10' },
      { from: 'agent', text: '已为您查看到，出发时间可以从14:00改到15:00，需要我帮您修改吗？', time: '13:12' },
      { from: 'customer', text: '好的，谢谢', time: '13:15' },
    ],
  },
  {
    id: 'C003', customerName: '王五', customerAvatar: '王五', lastMessage: '司机还没到，已经等了20分钟了', unread: 1, time: '11:40',
    status: 'waiting',
    messages: [
      { from: 'customer', text: '司机还没到，已经等了20分钟了！', time: '11:40' },
    ],
  },
  {
    id: 'C004', customerName: '赵六', customerAvatar: '赵六', lastMessage: '可以给我安排一个大一点的车型吗', unread: 0, time: '10:05',
    status: 'active',
    messages: [
      { from: 'customer', text: '可以给我安排一个大一点的车型吗？我们多了一个人', time: '10:02' },
      { from: 'agent', text: '了解，您原选的经济型5座确实比较紧凑。我可以帮您升级到舒适型7座，需要补差价80元，可以吗？', time: '10:05' },
    ],
  },
  {
    id: 'C005', customerName: '钱七', customerAvatar: '钱七', lastMessage: '已经收到退款，谢谢', unread: 0, time: '昨天 16:20',
    status: 'closed',
    messages: [
      { from: 'customer', text: '我昨天因为航班取消没法用车，可以退款吗', time: '昨天 15:45' },
      { from: 'agent', text: '我看到您提前2小时取消了订单，按照政策全额退款，已原路返回', time: '昨天 16:00' },
      { from: 'customer', text: '已经收到退款，谢谢', time: '昨天 16:20' },
    ],
  },
]

export function ServicePage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const selected = conversations.find(c => c.id === selectedId)

  const filtered = conversations.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.customerName.includes(search) && !c.lastMessage.includes(search)) return false
    return true
  })

  const handleSend = () => {
    if (!replyText.trim() || !selectedId) return
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setConversations(prev => prev.map(c =>
      c.id === selectedId
        ? {
            ...c,
            messages: [...c.messages, { from: 'agent', text: replyText, time }],
            lastMessage: replyText,
            time,
            unread: 0,
            status: 'active' as const,
          }
        : c
    ))
    setReplyText('')
  }

  const handleClose = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, status: 'closed' as const } : c))
    if (selectedId === id) setSelectedId(null)
  }

  const handleTakeOver = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, status: 'active' as const, unread: 0 } : c))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">客服中心</h1>
        <p className="text-sm text-slate-500 mt-1">处理用户咨询、投诉和建议</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '等待接入', value: conversations.filter(c => c.status === 'waiting').length, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '处理中', value: conversations.filter(c => c.status === 'active').length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '已关闭', value: conversations.filter(c => c.status === 'closed').length, color: 'text-slate-500', bg: 'bg-slate-50' },
          { label: '总未读', value: conversations.reduce((s, c) => s + c.unread, 0), color: 'text-red-500', bg: 'bg-red-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
            <p className="text-sm text-slate-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* 筛选 + 搜索 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="搜索客户名称或消息..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部' }, { key: 'waiting', label: '等待中' }, { key: 'active', label: '处理中' }, { key: 'closed', label: '已关闭' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${statusFilter === tab.key ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/50'}`}
            >{tab.label}</button>
          ))}
        </div>
      </div>

      {/* 会话列表 + 聊天窗口 */}
      <div className="flex gap-4 h-[500px]">
        {/* 左侧列表 */}
        <div className="w-80 shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 text-xs font-medium text-slate-500">会话列表</div>
          <div className="flex-1 overflow-auto">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); handleTakeOver(c.id) }}
                className={`w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedId === c.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">{c.customerAvatar[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{c.customerName}</span>
                      <div className="flex items-center gap-1.5">
                        {c.status === 'waiting' && <span className="w-2 h-2 rounded-full bg-amber-400" title="等待接入" />}
                        {c.unread > 0 && <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">{c.unread}</span>}
                        <span className="text-[10px] text-slate-400">{c.time}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="py-8 text-center text-sm text-slate-400">暂无会话</div>}
          </div>
        </div>

        {/* 右侧聊天区 */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* 聊天头 */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{selected.customerAvatar[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{selected.customerName}</p>
                    <p className="text-xs text-slate-400">
                      {selected.status === 'waiting' ? '等待接入' : selected.status === 'active' ? '处理中' : '已关闭'}
                    </p>
                  </div>
                </div>
                {selected.status !== 'closed' && (
                  <button onClick={() => handleClose(selected.id)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5 inline mr-1" />关闭会话
                  </button>
                )}
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-auto p-4 space-y-4 bg-slate-50/50">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end gap-2 max-w-[70%] ${msg.from === 'agent' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.from === 'agent' ? 'bg-primary/10' : 'bg-slate-200'}`}>
                        {msg.from === 'agent' ? <User className="w-3.5 h-3.5 text-primary" /> : <MessageCircle className="w-3.5 h-3.5 text-slate-500" />}
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-sm ${msg.from === 'agent' ? 'bg-primary text-white rounded-br-md' : 'bg-white border border-slate-200 rounded-bl-md shadow-sm'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mb-1">{msg.time}</span>
                    </div>
                  </div>
                ))}
                {selected.status === 'closed' && (
                  <div className="flex justify-center">
                    <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />会话已关闭
                    </span>
                  </div>
                )}
              </div>

              {/* 输入区 */}
              {selected.status !== 'closed' ? (
                <div className="p-4 border-t border-slate-100 flex gap-3">
                  <input
                    type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="输入回复内容..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button onClick={handleSend} disabled={!replyText.trim()}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-4 border-t border-slate-100 text-center text-sm text-slate-400">会话已关闭，无法回复</div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">选择一个会话开始处理</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServicePage
