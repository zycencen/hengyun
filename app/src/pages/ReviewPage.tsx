import { ScrollArea } from '@/components/ui/scroll-area'
import { useReviews } from '@/hooks'
import { useNavigation } from '@/store'
import { SubNavbar } from '@/components/shared/SubNavbar'
import { Star, User, CheckCircle2 } from 'lucide-react'

export default function ReviewPage() {
  const { goBack } = useNavigation()
  const { reviews, loading } = useReviews()

  return (
    <div className="flex flex-col h-full">
      <SubNavbar title="服务评价" onBack={goBack} />

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-sm text-slate-400">加载中...</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <Star className="w-10 h-10 text-slate-300" />
                </div>
                <div className="text-sm font-medium text-slate-400 mb-1">暂无评价</div>
                <div className="text-xs text-slate-300">完成行程后可以对服务进行评价</div>
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.stars ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-amber-500 font-medium">{review.stars}.0 分</span>
                    </div>
                    <span className="text-xs text-slate-400">{review.date}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs text-slate-500">司机：<strong className="text-slate-700">{review.driver}</strong></span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-0">{review.content}</p>

                  {review.reply && (
                    <div className="mt-3 bg-gradient-to-r from-indigo-50 to-white rounded-xl p-3 border border-indigo-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-primary">平台回复</span>
                      </div>
                      <p className="text-[13px] text-slate-500">{review.reply}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
