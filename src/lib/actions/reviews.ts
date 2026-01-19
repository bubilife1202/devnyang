'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'

export async function submitReview(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const requestId = formData.get('request_id') as string
  const revieweeId = formData.get('reviewee_id') as string
  const ratingStr = formData.get('rating')
  const rating = ratingStr ? parseInt(ratingStr as string, 10) : NaN
  const comment = formData.get('comment') as string | null

  if (!requestId || !revieweeId) {
    return { error: '필수 정보가 누락되었습니다.' }
  }

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { error: '평점은 1~5점 사이여야 합니다.' }
  }

  // 해당 의뢰가 낙찰 완료 상태인지 확인
  const { data: request } = await supabase
    .from('requests')
    .select('id, status, client_id, awarded_bid_id')
    .eq('id', requestId)
    .single()

  if (!request) {
    return { error: '의뢰를 찾을 수 없습니다.' }
  }

  if (request.status !== 'awarded' && request.status !== 'completed') {
    return { error: '낙찰된 의뢰에만 리뷰를 작성할 수 있습니다.' }
  }

  // 낙찰된 개발자 확인
  const { data: awardedBid } = await supabase
    .from('bids')
    .select('developer_id')
    .eq('id', request.awarded_bid_id)
    .single()

  if (!awardedBid) {
    return { error: '낙찰 정보를 찾을 수 없습니다.' }
  }

  // 리뷰 작성 권한 확인 (의뢰자 또는 낙찰된 개발자만)
  const isClient = user.id === request.client_id
  const isDeveloper = user.id === awardedBid.developer_id

  if (!isClient && !isDeveloper) {
    return { error: '리뷰 작성 권한이 없습니다.' }
  }

  // 상대방에게 리뷰를 작성해야 함
  if (isClient && revieweeId !== awardedBid.developer_id) {
    return { error: '낙찰된 개발자에게만 리뷰를 작성할 수 있습니다.' }
  }
  if (isDeveloper && revieweeId !== request.client_id) {
    return { error: '의뢰자에게만 리뷰를 작성할 수 있습니다.' }
  }

  // 이미 리뷰를 작성했는지 확인
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('request_id', requestId)
    .eq('reviewer_id', user.id)
    .single()

  if (existingReview) {
    return { error: '이미 리뷰를 작성하셨습니다.' }
  }

  // 리뷰 등록
  const { error } = await supabase
    .from('reviews')
    .insert({
      request_id: requestId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment || null,
    })

  if (error) {
    return { error: error.message }
  }

  // 알림 발송
  await createNotification({
    userId: revieweeId,
    type: 'review_received',
    title: '새 리뷰가 등록되었습니다',
    content: `${rating}점의 리뷰가 등록되었습니다.`,
    link: `/requests/${requestId}`,
  })

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/profile')
  return { success: true }
}

export async function getReviewsForRequest(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(id, name),
      reviewee:profiles!reviews_reviewee_id_fkey(id, name)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
    return []
  }

  return data
}

export async function getReviewsForUser(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(id, name),
      request:requests(id, title)
    `)
    .eq('reviewee_id', userId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
    return []
  }

  return data
}

export async function canWriteReview(requestId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { canWrite: false, reason: '로그인이 필요합니다.' }
  }

  // 의뢰 정보 확인
  const { data: request } = await supabase
    .from('requests')
    .select('id, status, client_id, awarded_bid_id')
    .eq('id', requestId)
    .single()

  if (!request || !request.awarded_bid_id) {
    return { canWrite: false, reason: '낙찰된 의뢰가 아닙니다.' }
  }

  if (request.status !== 'awarded' && request.status !== 'completed') {
    return { canWrite: false, reason: '낙찰된 의뢰에만 리뷰를 작성할 수 있습니다.' }
  }

  // 낙찰된 개발자 확인
  const { data: awardedBid } = await supabase
    .from('bids')
    .select('developer_id')
    .eq('id', request.awarded_bid_id)
    .single()

  if (!awardedBid) {
    return { canWrite: false, reason: '낙찰 정보를 찾을 수 없습니다.' }
  }

  // 권한 확인
  const isClient = user.id === request.client_id
  const isDeveloper = user.id === awardedBid.developer_id

  if (!isClient && !isDeveloper) {
    return { canWrite: false, reason: '리뷰 작성 권한이 없습니다.' }
  }

  // 이미 리뷰 작성했는지 확인
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('request_id', requestId)
    .eq('reviewer_id', user.id)
    .single()

  if (existingReview) {
    return { canWrite: false, reason: '이미 리뷰를 작성하셨습니다.', alreadyWritten: true }
  }

  // 리뷰 대상 결정
  const revieweeId = isClient ? awardedBid.developer_id : request.client_id

  return { 
    canWrite: true, 
    revieweeId,
    isClient,
  }
}
