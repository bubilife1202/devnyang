import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

function formatTimeLeft(expiresAt: string) {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  
  if (diff <= 0) return '마감됨'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}일 남음`
  }
  
  return `${hours}시간 ${minutes}분 남음`
}

function getStatusBadge(status: string, expiresAt: string) {
  const isExpired = new Date(expiresAt) < new Date()
  
  if (status === 'open' && isExpired) {
    return { text: '입찰 마감', className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' }
  }
  
  switch (status) {
    case 'open':
      return { text: '입찰 중', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
    case 'awarded':
      return { text: '낙찰 완료', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    case 'completed':
      return { text: '완료', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' }
    case 'cancelled':
      return { text: '취소됨', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    default:
      return { text: status, className: 'bg-zinc-100 text-zinc-700' }
  }
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 내 의뢰 목록 조회
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      *,
      bids(count)
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  const formattedRequests = requests?.map(request => ({
    ...request,
    bid_count: request.bids?.[0]?.count || 0
  })) || []

  // 통계 계산
  const stats = {
    total: formattedRequests.length,
    open: formattedRequests.filter(r => r.status === 'open' && new Date(r.expires_at) > new Date()).length,
    awarded: formattedRequests.filter(r => r.status === 'awarded').length,
    totalBids: formattedRequests.reduce((sum, r) => sum + r.bid_count, 0),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            내 의뢰
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            등록한 의뢰와 받은 입찰을 관리하세요.
          </p>
        </div>
<Link
          href="/requests/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          새 의뢰 등록
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">전체 의뢰</span>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">진행 중</span>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.open}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">낙찰 완료</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.awarded}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">총 입찰 수</span>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stats.totalBids}</p>
        </div>
      </div>

      {/* 의뢰 목록 */}
      {formattedRequests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <svg className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            아직 등록한 의뢰가 없습니다
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            첫 번째 프로젝트를 등록하고 개발자들의 견적을 받아보세요.
          </p>
<Link
            href="/requests/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 의뢰 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {formattedRequests.map((request) => {
            const statusBadge = getStatusBadge(request.status, request.expires_at)
            const isOpen = request.status === 'open' && new Date(request.expires_at) > new Date()
            
            return (
<Link
                key={request.id}
                href={`/requests/${request.id}`}
                className="block bg-white dark:bg-zinc-900 rounded-xl p-6 hover:shadow-lg transition border border-zinc-200 dark:border-zinc-800 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}>
                        {statusBadge.text}
                      </span>
                      {isOpen && (
                        <span className="text-xs text-zinc-500">
                          {formatTimeLeft(request.expires_at)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                      {request.title}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-2 mb-4">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-500">
                        예산: <span className="font-medium text-zinc-900 dark:text-white">
                          {formatCurrency(request.budget_min)} ~ {formatCurrency(request.budget_max)}
                        </span>
                      </span>
                      <span className="text-zinc-500">
                        입찰: <span className="font-medium text-blue-600">{request.bid_count}건</span>
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
