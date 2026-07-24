import { useAppContext } from '@/store'

export function Toast() {
  const { state } = useAppContext()
  if (!state.toastMessage) return null
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-5 py-2.5 rounded-lg text-sm z-[200] animate-in fade-in">
      {state.toastMessage}
    </div>
  )
}
