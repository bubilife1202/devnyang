'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ReportModal from '@/components/ReportModal'
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
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

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
                  <Link
                    href={`/developers/${bid.developer_id}`}
                    className="font-medium text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                  >
                    {bid.developer?.name || '익명'}
                  </Link>
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

                <div className="flex items-center gap-4 mb-3">
                  <Link
                    href={`/developers/${bid.developer_id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    프로필 보기
                  </Link>
                  {bid.developer?.portfolio_url && (
                    <a
                      href={bid.developer.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      외부 포트폴리오
                    </a>
                  )}
                </div>

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

              <div className="ml-4 flex flex-col gap-2">
                {canSelect && !selectedBid && (
                  <button
                    onClick={() => handleSelect(bid.id)}
                    disabled={loading === bid.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition cursor-pointer"
                  >
                    {loading === bid.id ? '처리 중...' : '선택하기'}
                  </button>
                )}
                <button
                  onClick={() => setReportTarget({ id: bid.developer_id, name: bid.developer?.name || '개발자' })}
                  className="px-3 py-1 text-xs text-zinc-500 hover:text-red-600 transition cursor-pointer"
                >
                  신고
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 신고 모달 */}
      <ReportModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="user"
        targetId={reportTarget?.id || ''}
        targetName={reportTarget?.name}
      />
    </div>
  )
}
