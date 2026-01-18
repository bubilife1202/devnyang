import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BidForm from './BidForm'
import BidList from './BidList'

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
    return `${days}일 ${hours % 24}시간 남음`
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

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // 의뢰 정보 조회
  const { data: request } = await supabase
    .from('requests')
    .select(`
      *,
      client:profiles!requests_client_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (!request) {
    notFound()
  }

  // 현재 사용자의 프로필 조회
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() : { data: null }

  // 입찰 목록 조회
  const { data: bids } = await supabase
    .from('bids')
    .select(`
      *,
      developer:profiles!bids_developer_id_fkey(id, name, bio, portfolio_url)
    `)
    .eq('request_id', id)
    .order('created_at', { ascending: true })

  // 현재 사용자의 입찰 조회
  const myBid = user && bids?.find(bid => bid.developer_id === user.id)

  const isOwner = user?.id === request.client_id
  const isDeveloper = profile?.role === 'developer'
  const isExpired = new Date(request.expires_at) < new Date()
  const canBid = isDeveloper && !isOwner && request.status === 'open' && !isExpired && !myBid
  const canEditBid = isDeveloper && myBid && request.status === 'open' && !isExpired

  const statusBadge = getStatusBadge(request.status, request.expires_at)

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={isOwner ? '/dashboard/client' : '/requests'}
        className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {isOwner ? '내 의뢰로 돌아가기' : '의뢰 목록으로 돌아가기'}
      </Link>

      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
            {request.status === 'open' && !isExpired && (
              <span className="text-sm text-zinc-500">
                {formatTimeLeft(request.expires_at)}
              </span>
            )}
          </div>
          <span className="text-sm text-zinc-500">
            {bids?.length || 0}명 입찰
          </span>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          {request.title}
        </h1>

        <div className="prose dark:prose-invert max-w-none mb-6">
          <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {request.description}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="block text-sm text-zinc-500 mb-1">예산 범위</span>
            <span className="font-medium text-zinc-900 dark:text-white">
              {formatCurrency(request.budget_min)} ~ {formatCurrency(request.budget_max)}
            </span>
          </div>
          {request.deadline && (
            <div>
              <span className="block text-sm text-zinc-500 mb-1">희망 마감일</span>
              <span className="font-medium text-zinc-900 dark:text-white">
                {new Date(request.deadline).toLocaleDateString('ko-KR')}
              </span>
            </div>
          )}
          <div>
            <span className="block text-sm text-zinc-500 mb-1">의뢰자</span>
            <span className="font-medium text-zinc-900 dark:text-white">
              {request.client?.name || '익명'}
            </span>
          </div>
        </div>
      </div>

      {/* 입찰 폼 (개발자용) */}
      {canBid && (
        <BidForm requestId={request.id} budgetMin={request.budget_min} budgetMax={request.budget_max} />
      )}

      {/* 내 입찰 수정 폼 (개발자용) */}
      {canEditBid && myBid && (
        <BidForm 
          requestId={request.id} 
          budgetMin={request.budget_min} 
          budgetMax={request.budget_max}
          existingBid={myBid}
        />
      )}

      {/* 입찰 목록 (의뢰자용) */}
      {isOwner && bids && bids.length > 0 && (
        <BidList 
          bids={bids} 
          canSelect={request.status === 'open'} 
        />
      )}

      {/* 입찰 대기 안내 (의뢰자용) */}
      {isOwner && (!bids || bids.length === 0) && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 text-zinc-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            아직 입찰이 없습니다
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            개발자들이 견적을 검토 중입니다. 입찰이 들어오면 알려드릴게요.
          </p>
        </div>
      )}

      {/* 이미 입찰한 경우 안내 (개발자용) */}
      {isDeveloper && myBid && !canEditBid && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                입찰 완료
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                이 의뢰에 {formatCurrency(myBid.price)}로 입찰하셨습니다.
                {myBid.is_selected && ' 🎉 축하합니다! 낙찰되었습니다.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
