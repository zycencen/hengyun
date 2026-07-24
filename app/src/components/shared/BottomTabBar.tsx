export function BottomTabBar({ activeTab, onTabChange, tabs }: {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: { key: string; label: string; icon: React.ReactNode }[]
}) {
  return (
    <div className="h-14 bg-white border-t border-slate-200 flex flex-shrink-0 z-20">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors duration-200 cursor-pointer ${activeTab === tab.key ? 'text-primary' : 'text-slate-400'}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
