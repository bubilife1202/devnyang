'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || ''

// 결제 생성 (결제 요청 전)
export async function createPayment(requestId: string, bidId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 의뢰 및 입찰 정보 확인
  const { data: request } = await supabase
    .from('requests')
    .select('id, client_id, status, awarded_bid_id')
    .eq('id', requestId)
    .single()

  if (!request) {
    return { error: '의뢰를 찾을 수 없습니다.' }
  }

  if (request.client_id !== user.id) {
    return { error: '결제 권한이 없습니다.' }
  }

  if (request.status !== 'awarded') {
    return { error: '낙찰된 의뢰만 결제할 수 있습니다.' }
  }

  if (request.awarded_bid_id !== bidId) {
    return { error: '낙찰된 입찰만 결제할 수 있습니다.' }
  }

  // 입찰 정보 조회
  const { data: bid } = await supabase
    .from('bids')
    .select('id, price, developer_id')
    .eq('id', bidId)
    .single()

  if (!bid) {
    return { error: '입찰 정보를 찾을 수 없습니다.' }
  }

  // 이미 결제가 있는지 확인
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('request_id', requestId)
    .single()

  if (existingPayment) {
    if (existingPayment.status === 'paid' || existingPayment.status === 'held') {
      return { error: '이미 결제가 완료되었습니다.' }
    }
    // pending 상태면 기존 결제 정보 반환
    return { 
      paymentId: existingPayment.id,
      orderId: `ORDER_${existingPayment.id.replace(/-/g, '').slice(0, 20)}`,
    }
  }

  // 결제 생성
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      request_id: requestId,
      bid_id: bidId,
      payer_id: user.id,
      payee_id: bid.developer_id,
      amount: bid.price,
      status: 'pending',
      order_id: `ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { 
    paymentId: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,
  }
}

// 결제 승인 (토스페이먼츠 콜백 후)
// amount는 URL에서 오지만 검증용으로만 사용, 실제 결제는 DB 금액 사용
export async function confirmPayment(paymentKey: string, orderId: string, clientAmount: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 결제 정보 조회
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!payment) {
    return { error: '결제 정보를 찾을 수 없습니다.' }
  }

  if (payment.payer_id !== user.id) {
    return { error: '결제 권한이 없습니다.' }
  }

  // 클라이언트에서 전달된 금액과 DB 금액 비교 (조작 감지)
  if (payment.amount !== clientAmount) {
    console.error('Payment amount mismatch! DB:', payment.amount, 'Client:', clientAmount)
    return { error: '결제 금액이 일치하지 않습니다. 다시 시도해주세요.' }
  }

  // 이미 처리된 결제인지 확인
  if (payment.status !== 'pending') {
    return { error: '이미 처리된 결제입니다.' }
  }

  // 토스페이먼츠 API로 결제 승인 (DB에서 가져온 금액 사용!)
  const amount = payment.amount
  try {
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,  // DB에서 가져온 안전한 금액 사용
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { error: errorData.message || '결제 승인에 실패했습니다.' }
    }

    // 결제 상태 업데이트 (에스크로: held 상태로)
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'held',
        payment_key: paymentKey,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (updateError) {
      return { error: updateError.message }
    }

    // 알림 발송 (개발자에게)
    await createNotification({
      userId: payment.payee_id,
      type: 'payment_received',
      title: '결제가 완료되었습니다',
      content: `${amount.toLocaleString()}원이 에스크로에 입금되었습니다.`,
      link: `/requests/${payment.request_id}`,
    })

    revalidatePath(`/requests/${payment.request_id}`)
    return { success: true }
  } catch (err) {
    console.error('Payment confirmation error:', err)
    return { error: '결제 처리 중 오류가 발생했습니다.' }
  }
}

// 결제 정산 (프로젝트 완료 후 개발자에게 지급)
export async function releasePayment(paymentId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 결제 정보 조회
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (!payment) {
    return { error: '결제 정보를 찾을 수 없습니다.' }
  }

  if (payment.payer_id !== user.id) {
    return { error: '정산 권한이 없습니다.' }
  }

  if (payment.status !== 'held') {
    return { error: '정산 대기 중인 결제가 아닙니다.' }
  }

  // 결제 상태 업데이트
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 의뢰 상태 완료로 변경
  await supabase
    .from('requests')
    .update({ status: 'completed' })
    .eq('id', payment.request_id)

  // 알림 발송 (개발자에게)
  await createNotification({
    userId: payment.payee_id,
    type: 'project_completed',
    title: '프로젝트가 완료되었습니다',
    content: `${payment.amount.toLocaleString()}원이 정산되었습니다.`,
    link: `/requests/${payment.request_id}`,
  })

  revalidatePath(`/requests/${payment.request_id}`)
  return { success: true }
}

// 결제 정보 조회
export async function getPaymentForRequest(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('request_id', requestId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching payment:', error)
  }

  return data
}
