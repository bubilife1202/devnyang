import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

function formatTimeLeft(expiresAt: string) {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  
  if (diff <= 0) return '마감'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}일 남음`
  }
  
  return `${hours}시간 ${minutes}분 남음`
}

export default async function RequestsPage() {
  const supabase = await createClient()
  
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      *,
      client:profiles!requests_client_id_fkey(id, name),
      bids(count)
    `)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const formattedRequests = requests?.map(request => ({
    ...request,
    bid_count: request.bids?.[0]?.count || 0
  })) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            의뢰 찾기
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            진행 중인 프로젝트를 탐색하고 견적을 제출하세요.
          </p>
        </div>
      </div>

      {formattedRequests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl">
          <svg className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            현재 진행 중인 의뢰가 없습니다
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            새로운 의뢰가 등록되면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {formattedRequests.map((request) => (
            <Link
              key={request.id}
              href={`/requests/${request.id}`}
              className="block bg-white dark:bg-zinc-900 rounded-xl p-6 hover:shadow-lg transition border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                      {formatTimeLeft(request.expires_at)}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                      {request.bid_count}명 입찰
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    {request.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-2 mb-4">
                    {request.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-500 dark:text-zinc-500">
                      예산: <span className="font-medium text-zinc-900 dark:text-white">
                        {formatCurrency(request.budget_min)} ~ {formatCurrency(request.budget_max)}
                      </span>
                    </span>
                    {request.deadline && (
                      <span className="text-zinc-500 dark:text-zinc-500">
                        마감: <span className="font-medium text-zinc-900 dark:text-white">
                          {new Date(request.deadline).toLocaleDateString('ko-KR')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
