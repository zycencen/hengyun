export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F0F4FF] font-sans">
      <div className="mx-auto max-w-md min-h-screen bg-white flex flex-col shadow-2xl relative">
        {children}
      </div>
    </div>
  )
}
