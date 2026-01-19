import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyBookmarks } from '@/lib/actions/bookmarks'

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

function getBidStatusBadge(isSelected: boolean, requestStatus: string) {
  if (isSelected) {
    return { text: '낙찰됨', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
  }
  if (requestStatus === 'awarded') {
    return { text: '미선택', className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' }
  }
  if (requestStatus === 'open') {
    return { text: '대기 중', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
  }
  return { text: '종료', className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' }
}

export default async function DeveloperDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 내 입찰 목록 조회
  const { data: bids } = await supabase
    .from('bids')
    .select(`
      *,
      request:requests!bids_request_id_fkey(id, title, status, budget_min, budget_max, expires_at, client:profiles!requests_client_id_fkey(name))
    `)
    .eq('developer_id', user.id)
    .order('created_at', { ascending: false })

  const formattedBids = bids || []

  // 최근 오픈 의뢰 (입찰하지 않은 것)
  const bidRequestIds = formattedBids.map(b => b.request_id)
  const { data: openRequests } = await supabase
    .from('requests')
    .select(`
      *,
      client:profiles!requests_client_id_fkey(name),
      bids(count)
    `)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .not('id', 'in', bidRequestIds.length > 0 ? `(${bidRequestIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
    .order('created_at', { ascending: false })
    .limit(5)

  const formattedOpenRequests = openRequests?.map(request => ({
    ...request,
    bid_count: request.bids?.[0]?.count || 0
  })) || []

  // 북마크 목록 조회
  const bookmarks = await getMyBookmarks()

  // 통계 계산
  const stats = {
    totalBids: formattedBids.length,
    pending: formattedBids.filter(b => b.request?.status === 'open').length,
    won: formattedBids.filter(b => b.is_selected).length,
    totalValue: formattedBids.filter(b => b.is_selected).reduce((sum, b) => sum + b.price, 0),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            개발자 대시보드
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            입찰 현황과 새로운 기회를 확인하세요.
          </p>
        </div>
<Link
          href="/requests"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
        >
          의뢰 찾기
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">총 입찰</span>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stats.totalBids}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">대기 중</span>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">낙찰</span>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.won}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">총 낙찰 금액</span>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* 북마크 섹션 */}
      {bookmarks.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              북마크 ({bookmarks.length})
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-64 overflow-y-auto">
            {bookmarks.map((bookmark) => (
              <Link
                key={bookmark.id}
                href={`/requests/${bookmark.request_id}`}
                className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                      {bookmark.request?.title}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      예산: {formatCurrency(bookmark.request?.budget_min || 0)} ~ {formatCurrency(bookmark.request?.budget_max || 0)}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    bookmark.request?.status === 'open' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {bookmark.request?.status === 'open' ? formatTimeLeft(bookmark.request?.expires_at || '') : '마감'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 내 입찰 목록 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              내 입찰 ({formattedBids.length})
            </h2>
          </div>
          {formattedBids.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                아직 입찰한 의뢰가 없습니다.
              </p>
<Link
                href="/requests"
                className="text-blue-600 hover:text-blue-500 font-medium transition cursor-pointer"
              >
                의뢰 찾아보기 →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
              {formattedBids.map((bid) => {
                const statusBadge = getBidStatusBadge(bid.is_selected, bid.request?.status || '')
                
                return (
<Link
                    key={bid.id}
                    href={`/requests/${bid.request_id}`}
                    className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.className}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                          {bid.request?.title}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          내 견적: <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(bid.price)}</span>
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* 새로운 기회 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              새로운 기회
            </h2>
<Link
              href="/requests"
              className="text-sm text-blue-600 hover:text-blue-500 transition cursor-pointer"
            >
              전체 보기
            </Link>
          </div>
          {formattedOpenRequests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                현재 진행 중인 새 의뢰가 없습니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {formattedOpenRequests.map((request) => (
<Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                          {formatTimeLeft(request.expires_at)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {request.bid_count}명 입찰
                        </span>
                      </div>
                      <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                        {request.title}
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        예산: {formatCurrency(request.budget_min)} ~ {formatCurrency(request.budget_max)}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
