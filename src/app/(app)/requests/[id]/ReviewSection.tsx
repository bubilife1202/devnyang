'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitReview } from '@/lib/actions/reviews'

interface ReviewSectionProps {
  requestId: string
  revieweeId: string
  revieweeName: string
  isClient: boolean
  existingReviews: Array<{
    id: string
    rating: number
    comment: string | null
    is_visible: boolean
    reviewer: { id: string; name: string | null }
    reviewee: { id: string; name: string | null }
    created_at: string
  }>
  currentUserId: string
}

export default function ReviewSection({
  requestId,
  revieweeId,
  revieweeName,
  isClient,
  existingReviews,
  currentUserId,
}: ReviewSectionProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [hoveredRating, setHoveredRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // 이미 작성한 리뷰가 있는지 확인
  const myReview = existingReviews.find(r => r.reviewer.id === currentUserId)
  // 상대방이 작성한 리뷰 (공개된 경우)
  const theirReview = existingReviews.find(r => r.reviewee.id === currentUserId && r.is_visible)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('request_id', requestId)
    formData.append('reviewee_id', revieweeId)
    formData.append('rating', rating.toString())
    formData.append('comment', comment)

    const result = await submitReview(formData)

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          리뷰
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* 내가 작성한 리뷰 */}
        {myReview && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                내가 작성한 리뷰
              </span>
              {!myReview.is_visible && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  (상대방도 리뷰를 작성하면 공개됩니다)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-lg ${
                    star <= myReview.rating ? 'text-yellow-400' : 'text-zinc-300 dark:text-zinc-600'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            {myReview.comment && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {myReview.comment}
              </p>
            )}
          </div>
        )}

        {/* 상대방이 작성한 리뷰 (공개된 경우) */}
        {theirReview && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              {theirReview.reviewer.name}님이 작성한 리뷰
            </div>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-lg ${
                    star <= theirReview.rating ? 'text-yellow-400' : 'text-zinc-300 dark:text-zinc-600'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            {theirReview.comment && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {theirReview.comment}
              </p>
            )}
          </div>
        )}

        {/* 리뷰 작성 폼 */}
        {!myReview && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {isClient ? '개발자' : '의뢰자'}에게 리뷰 작성
              </label>
              <p className="text-sm text-zinc-500 mb-3">
                {revieweeName}님과의 작업은 어떠셨나요?
              </p>
              
              {/* 별점 */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="text-3xl transition cursor-pointer"
                  >
                    <span
                      className={
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400'
                          : 'text-zinc-300 dark:text-zinc-600'
                      }
                    >
                      ★
                    </span>
                  </button>
                ))}
                <span className="ml-2 text-sm text-zinc-500">
                  {rating}점
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                상세 리뷰 (선택)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="작업 경험에 대해 자세히 적어주세요."
              />
            </div>

            <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
              💡 양측 모두 리뷰를 작성하면 서로의 리뷰가 공개됩니다.
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? '제출 중...' : '리뷰 제출'}
            </button>
          </form>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-green-700 dark:text-green-300 font-medium">
              리뷰가 성공적으로 제출되었습니다!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              상대방도 리뷰를 작성하면 서로의 리뷰가 공개됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
