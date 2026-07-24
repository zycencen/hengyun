import { useState, useEffect } from 'react'
import { getReviewList } from '@/api/modules/review'
import type { ReviewItem } from '@/api/modules/review'
import { MOCK_REVIEWS } from '@/data/defaults'

export function useReviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getReviewList()
      .then(data => setReviews(data))
      .catch(() => setReviews(MOCK_REVIEWS))
      .finally(() => setLoading(false))
  }, [])

  return { reviews, loading }
}
