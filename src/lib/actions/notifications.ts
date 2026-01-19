'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type NotificationType = 
  | 'new_bid' 
  | 'bid_updated' 
  | 'awarded' 
  | 'not_selected' 
  | 'new_message' 
  | 'review_received' 
  | 'payment_received' 
  | 'project_completed'

interface CreateNotificationOptions {
  userId: string
  type: NotificationType
  title: string
  content?: string
  link?: string
}

export async function createNotification(options: CreateNotificationOptions) {
  const { userId, type, title, content, link } = options
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      content: content || null,
      link: link || null,
    })

  if (error) {
    console.error('Error creating notification:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function getMyNotifications(limit = 20) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return 0
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count || 0
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// 입찰 시 알림 생성 헬퍼
export async function notifyNewBid(clientId: string, requestTitle: string, requestId: string, developerName: string) {
  return createNotification({
    userId: clientId,
    type: 'new_bid',
    title: '새로운 입찰이 도착했습니다',
    content: `${developerName}님이 "${requestTitle}" 의뢰에 입찰했습니다.`,
    link: `/requests/${requestId}`,
  })
}

// 낙찰 시 알림 생성 헬퍼
export async function notifyAwarded(developerId: string, requestTitle: string, requestId: string) {
  return createNotification({
    userId: developerId,
    type: 'awarded',
    title: '🎉 축하합니다! 낙찰되었습니다',
    content: `"${requestTitle}" 의뢰에 낙찰되었습니다.`,
    link: `/requests/${requestId}`,
  })
}

// 미선택 알림 헬퍼
export async function notifyNotSelected(developerId: string, requestTitle: string, requestId: string) {
  return createNotification({
    userId: developerId,
    type: 'not_selected',
    title: '입찰 결과 알림',
    content: `"${requestTitle}" 의뢰에서 다른 개발자가 선택되었습니다.`,
    link: `/requests/${requestId}`,
  })
}
