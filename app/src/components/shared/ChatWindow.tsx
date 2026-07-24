import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, X, User, Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  time: string
}

const MOCK_AGENT_REPLIES: Record<string, string> = {
  '你好': '您好！欢迎联系恒运出行客服，请问有什么可以帮助您的？',
  '订单': '请问您需要查询哪笔订单？请提供订单编号，我会为您查询。',
  '取消': '您好，如需取消订单，请在订单详情页面点击"取消订单"按钮。如需帮助，请告知订单编号。',
  '发票': '您好，您可以在"发票管理"页面选择需要开票的订单，点击"申请开票"即可。发票将在3个工作日内开具。',
  '退款': '退款将在1-3个工作日内原路返回您的支付账户，请您耐心等待。',
  '司机': '司机会在出发前通过电话或平台消息与您联系，请保持电话畅通。',
  '价格': '具体价格请以选车页面展示为准，不同车型和套餐价格不同。如有疑问可拨打客服热线。',
  '车型': '我们提供经济型5座、舒适型7座、商务型7座、豪华型19座等多种车型，您可在选车页面查看详情。',
}

function getAutoReply(input: string): string {
  const lower = input.toLowerCase()
  for (const [key, reply] of Object.entries(MOCK_AGENT_REPLIES)) {
    if (lower.includes(key)) return reply
  }
  return '您的问题已收到，客服人员会尽快回复您。如需紧急帮助，请拨打客服热线：400-xxx-xxxx。'
}

interface ChatWindowProps {
  onClose: () => void
  title?: string
}

export function ChatWindow({ onClose, title = '在线客服' }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: '您好！我是恒运出行智能客服，请问有什么可以帮助您的？',
      time: formatTime(new Date()),
    },
  ])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    const now = new Date()
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      time: formatTime(now),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')

    // 模拟客服回复延迟
    setTimeout(() => {
      const agentMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'agent',
        content: getAutoReply(text),
        time: formatTime(new Date()),
      }
      setMessages(prev => [...prev, agentMsg])
    }, 800 + Math.random() * 1200)
  }

  const quickReplies = ['订单查询', '取消订单', '发票开具', '退款进度', '联系司机', '价格咨询']

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0 bg-primary">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-[11px] text-white/60">在线 · 智能客服</div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3 space-y-3 bg-slate-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-primary' : 'bg-slate-200'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-white" />
                : <Bot className="w-4 h-4 text-slate-500" />
              }
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-md'
                  : 'bg-white text-slate-700 rounded-tl-md shadow-sm border border-slate-100'
              }`}>
                {msg.content}
              </div>
              <div className={`text-[10px] text-slate-400 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 快捷回复 */}
      <div className="px-3 py-2 border-t border-slate-50 flex-shrink-0 flex gap-1.5 overflow-x-auto bg-white">
        {quickReplies.map(q => (
          <button
            key={q}
            onClick={() => setInput(q)}
            className="px-2.5 py-1 text-xs rounded-full border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors whitespace-nowrap flex-shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            placeholder="输入您的问题..."
            className="flex-1 h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center p-0"
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
