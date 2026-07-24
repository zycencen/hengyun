export function StatusBar() {
  return (
    <div className="h-11 bg-white flex items-center justify-between px-6 flex-shrink-0 text-xs font-semibold text-slate-900 border-b border-slate-100">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C17.93 3.93 6.07 3.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-6-6l2 2c2.76-2.76 7.24-2.76 10 0l2-2C13.14 7.14 5.86 7.14 3 11z"/>
        </svg>
        <svg viewBox="0 0 24 14" fill="currentColor" width="24" height="14">
          <rect x="0" y="0" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <rect x="2" y="2" width="16" height="10" rx="1" fill="currentColor"/>
          <rect x="22" y="3" width="1.5" height="8" rx="0.75" fill="currentColor"/>
        </svg>
      </div>
    </div>
  )
}
