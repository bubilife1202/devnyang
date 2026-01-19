'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Bid } from '@/types/database'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

interface BidFormProps {
  requestId: string
  budgetMin: number
  budgetMax: number
  existingBid?: Bid
}

export default function BidForm({ requestId, budgetMin, budgetMax, existingBid }: BidFormProps) {
  const [price, setPrice] = useState(existingBid?.price?.toString() || '')
  const [message, setMessage] = useState(existingBid?.message || '')
  const [estimatedDays, setEstimatedDays] = useState(existingBid?.estimated_days?.toString() || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const isEditing = !!existingBid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const priceNum = parseInt(price)
    if (priceNum <= 0) {
      setError('견적 금액은 0보다 커야 합니다.')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        // 입찰 수정
        const { error } = await supabase
          .from('bids')
          .update({
            price: priceNum,
            message: message || null,
            estimated_days: estimatedDays ? parseInt(estimatedDays) : null,
          })
          .eq('id', existingBid.id)

        if (error) throw error
      } else {
        // 새 입찰
        const { error } = await supabase
          .from('bids')
          .insert({
            request_id: requestId,
            developer_id: (await supabase.auth.getUser()).data.user?.id,
            price: priceNum,
            message: message || null,
            estimated_days: estimatedDays ? parseInt(estimatedDays) : null,
          })

        if (error) throw error
      }

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingBid) return
    if (!confirm('입찰을 취소하시겠습니까?')) return

    setLoading(true)
    const { error } = await supabase
      .from('bids')
      .delete()
      .eq('id', existingBid.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 mb-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        {isEditing ? '입찰 수정' : '견적 제출하기'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            견적 금액 (원) *
          </label>
          <input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min={1}
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="1000000"
          />
          <p className="mt-1 text-xs text-zinc-500">
            예산 범위: {formatCurrency(budgetMin)} ~ {formatCurrency(budgetMax)}
          </p>
        </div>

        <div>
          <label htmlFor="estimatedDays" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            예상 작업 기간 (일)
          </label>
          <input
            id="estimatedDays"
            type="number"
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
            min={1}
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="14"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            제안 메시지
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            placeholder="프로젝트에 대한 이해, 접근 방식, 관련 경험 등을 작성해주세요."
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
<button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition cursor-pointer"
          >
            {loading ? '처리 중...' : isEditing ? '수정하기' : '입찰하기'}
          </button>
          {isEditing && (
<button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="py-3 px-4 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed font-medium rounded-lg transition cursor-pointer"
            >
              취소
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
