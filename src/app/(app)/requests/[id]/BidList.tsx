'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Bid, Profile } from '@/types/database'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

interface BidWithDeveloper extends Bid {
  developer: Profile
}

interface BidListProps {
  bids: BidWithDeveloper[]
  canSelect: boolean
}

export default function BidList({ bids, canSelect }: BidListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSelect = async (bidId: string) => {
    if (!confirm('이 개발자를 낙찰자로 선택하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      return
    }

    setLoading(bidId)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { error } = await supabase.rpc('select_winning_bid', {
        p_bid_id: bidId,
        p_client_id: user.id,
      })

      if (error) throw error

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  const selectedBid = bids.find(bid => bid.is_selected)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          받은 입찰 ({bids.length}건)
        </h2>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className={`p-4 ${bid.is_selected ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {bid.developer?.name || '익명'}
                  </span>
                  {bid.is_selected && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                      낙찰됨
                    </span>
                  )}
                </div>

                {bid.developer?.bio && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
                    {bid.developer.bio}
                  </p>
                )}

                {bid.developer?.portfolio_url && (
                  <a
                    href={bid.developer.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 mb-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    포트폴리오
                  </a>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {formatCurrency(bid.price)}
                  </span>
                  {bid.estimated_days && (
                    <span className="text-zinc-500">
                      예상 {bid.estimated_days}일
                    </span>
                  )}
                </div>

                {bid.message && (
                  <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {bid.message}
                    </p>
                  </div>
                )}
              </div>

              {canSelect && !selectedBid && (
                <button
                  onClick={() => handleSelect(bid.id)}
                  disabled={loading === bid.id}
                  className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition"
                >
                  {loading === bid.id ? '처리 중...' : '선택하기'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
