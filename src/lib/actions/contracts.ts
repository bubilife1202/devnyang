'use server'

import { createClient } from '@/lib/supabase/server'

export interface ContractData {
  requestId: string
  requestTitle: string
  requestDescription: string
  clientName: string
  developerName: string
  price: number
  estimatedDays: number | null
  deadline: string | null
  createdAt: string
}

export async function getContractData(requestId: string): Promise<{ data?: ContractData; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 의뢰 정보 조회
  const { data: request } = await supabase
    .from('requests')
    .select(`
      id,
      title,
      description,
      deadline,
      client_id,
      awarded_bid_id,
      status,
      created_at,
      client:profiles!requests_client_id_fkey(id, name)
    `)
    .eq('id', requestId)
    .single()

  if (!request) {
    return { error: '의뢰를 찾을 수 없습니다.' }
  }

  if (request.status !== 'awarded' && request.status !== 'completed') {
    return { error: '낙찰된 의뢰만 계약서를 생성할 수 있습니다.' }
  }

  // 낙찰된 입찰 정보 조회
  const { data: bid } = await supabase
    .from('bids')
    .select(`
      id,
      price,
      estimated_days,
      developer_id,
      developer:profiles!bids_developer_id_fkey(id, name)
    `)
    .eq('id', request.awarded_bid_id)
    .single()

  if (!bid) {
    return { error: '낙찰 정보를 찾을 수 없습니다.' }
  }

  // 권한 확인 (의뢰자 또는 낙찰된 개발자만)
  const isClient = user.id === request.client_id
  const isDeveloper = user.id === bid.developer_id

  if (!isClient && !isDeveloper) {
    return { error: '계약서 조회 권한이 없습니다.' }
  }

  // 타입 안전성: Supabase 관계 쿼리 결과는 배열 또는 단일 객체일 수 있음
  const clientData = Array.isArray(request.client) ? request.client[0] : request.client
  const developerData = Array.isArray(bid.developer) ? bid.developer[0] : bid.developer

  return {
    data: {
      requestId: request.id,
      requestTitle: request.title,
      requestDescription: request.description,
      clientName: clientData?.name || '의뢰자',
      developerName: developerData?.name || '개발자',
      price: bid.price,
      estimatedDays: bid.estimated_days,
      deadline: request.deadline,
      createdAt: request.created_at,
    }
  }
}
