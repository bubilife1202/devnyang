'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyNewBid, notifyAwarded, notifyNotSelected } from './notifications'
import { createOrGetChatRoom } from './chat'

export async function createBid(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const request_id = formData.get('request_id') as string
  const priceStr = formData.get('price')
  const price = priceStr ? parseInt(priceStr as string, 10) : NaN
  const message = formData.get('message') as string | null
  const estimatedDaysStr = formData.get('estimated_days')
  const estimated_days = estimatedDaysStr ? parseInt(estimatedDaysStr as string, 10) : null

  // Validation
  if (!request_id) {
    return { error: '의뢰 정보가 없습니다.' }
  }
  if (isNaN(price) || price <= 0) {
    return { error: '견적 금액은 0보다 커야 합니다.' }
  }
  if (estimated_days !== null && (isNaN(estimated_days) || estimated_days <= 0)) {
    return { error: '예상 작업일은 0보다 커야 합니다.' }
  }

  // 의뢰 상태 확인
  const { data: request } = await supabase
    .from('requests')
    .select('status, expires_at, client_id, title')
    .eq('id', request_id)
    .single()

  if (!request) {
    return { error: '존재하지 않는 의뢰입니다.' }
  }

  if (request.client_id === user.id) {
    return { error: '본인의 의뢰에는 입찰할 수 없습니다.' }
  }

  if (request.status !== 'open') {
    return { error: '마감된 의뢰입니다.' }
  }

  if (new Date(request.expires_at) < new Date()) {
    return { error: '입찰 기간이 만료되었습니다.' }
  }

  // 기존 입찰 확인
  const { data: existingBid } = await supabase
    .from('bids')
    .select('id')
    .eq('request_id', request_id)
    .eq('developer_id', user.id)
    .single()

  if (existingBid) {
    return { error: '이미 입찰한 의뢰입니다. 입찰 수정을 이용해주세요.' }
  }

  const { error } = await supabase
    .from('bids')
    .insert({
      request_id,
      developer_id: user.id,
      price,
      message: message || null,
      estimated_days,
    })

  if (error) {
    return { error: error.message }
  }

  // 개발자 이름 가져오기
  const { data: developer } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  // 의뢰자에게 알림 발송
  await notifyNewBid(
    request.client_id,
    request.title,
    request_id,
    developer?.name || '개발자'
  )

  // 채팅방 자동 생성
  await createOrGetChatRoom(request_id, user.id)

  revalidatePath(`/requests/${request_id}`)
  revalidatePath('/dashboard/developer')
  return { success: true }
}

export async function updateBid(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const bid_id = formData.get('bid_id') as string
  const priceStr = formData.get('price')
  const price = priceStr ? parseInt(priceStr as string, 10) : NaN
  const message = formData.get('message') as string | null
  const estimatedDaysStr = formData.get('estimated_days')
  const estimated_days = estimatedDaysStr ? parseInt(estimatedDaysStr as string, 10) : null

  if (isNaN(price) || price <= 0) {
    return { error: '견적 금액은 0보다 커야 합니다.' }
  }

  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .select('request_id')
    .eq('id', bid_id)
    .eq('developer_id', user.id)
    .single()

  if (bidError || !bid) {
    return { error: '입찰 정보를 찾을 수 없습니다.' }
  }

  const { error } = await supabase
    .from('bids')
    .update({
      price,
      message: message || null,
      estimated_days,
    })
    .eq('id', bid_id)
    .eq('developer_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/requests/${bid.request_id}`)
  revalidatePath('/dashboard/developer')
  return { success: true }
}

export async function deleteBid(bidId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: bid } = await supabase
    .from('bids')
    .select('request_id, is_selected')
    .eq('id', bidId)
    .eq('developer_id', user.id)
    .single()

  if (!bid) {
    return { error: '입찰 정보를 찾을 수 없습니다.' }
  }

  if (bid.is_selected) {
    return { error: '선택된 입찰은 취소할 수 없습니다.' }
  }

  const { error } = await supabase
    .from('bids')
    .delete()
    .eq('id', bidId)
    .eq('developer_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/requests/${bid.request_id}`)
  revalidatePath('/dashboard/developer')
  return { success: true }
}

export async function selectWinningBid(bidId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 낙찰 전 입찰 정보 가져오기
  const { data: selectedBid } = await supabase
    .from('bids')
    .select('request_id, developer_id')
    .eq('id', bidId)
    .single()

  if (!selectedBid) {
    return { error: '입찰 정보를 찾을 수 없습니다.' }
  }

  // 의뢰 정보 가져오기
  const { data: request } = await supabase
    .from('requests')
    .select('title')
    .eq('id', selectedBid.request_id)
    .single()

  // 해당 의뢰의 모든 입찰자 가져오기 (알림용)
  const { data: allBids } = await supabase
    .from('bids')
    .select('developer_id')
    .eq('request_id', selectedBid.request_id)

  // RPC 함수 호출 (트랜잭션 보장)
  const { error } = await supabase.rpc('select_winning_bid', {
    p_bid_id: bidId,
    p_client_id: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  // 낙찰자에게 알림
  await notifyAwarded(
    selectedBid.developer_id,
    request?.title || '의뢰',
    selectedBid.request_id
  )

  // 미선택 개발자들에게 알림
  if (allBids) {
    for (const bid of allBids) {
      if (bid.developer_id !== selectedBid.developer_id) {
        await notifyNotSelected(
          bid.developer_id,
          request?.title || '의뢰',
          selectedBid.request_id
        )
      }
    }
  }

  revalidatePath(`/requests/${selectedBid.request_id}`)
  revalidatePath('/dashboard/client')

  return { success: true }
}

export async function getBidsForRequest(requestId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      developer:profiles!bids_developer_id_fkey(id, name, bio, portfolio_url)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching bids:', error)
    return []
  }

  return data
}

export async function getMyBids() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      request:requests!bids_request_id_fkey(id, title, status, budget_min, budget_max, expires_at, client:profiles!requests_client_id_fkey(name))
    `)
    .eq('developer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching my bids:', error)
    return []
  }

  return data
}

export async function getMyBidForRequest(requestId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data } = await supabase
    .from('bids')
    .select('*')
    .eq('request_id', requestId)
    .eq('developer_id', user.id)
    .single()

  return data
}
