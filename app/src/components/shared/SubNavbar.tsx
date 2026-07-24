import { ArrowLeft } from 'lucide-react'

export function SubNavbar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-white flex items-center justify-center h-12 px-4 border-b border-slate-100 flex-shrink-0">
      <button onClick={onBack} className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-sm text-slate-700 cursor-pointer hover:text-primary transition-colors duration-200">
        <ArrowLeft className="w-5 h-5" />返回
      </button>
      <span className="text-[17px] font-semibold text-slate-800">{title}</span>
    </div>
  )
}
