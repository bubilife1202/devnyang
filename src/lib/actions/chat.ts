'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrGetChatRoom(requestId: string, developerId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 의뢰 정보 조회
  const { data: request } = await supabase
    .from('requests')
    .select('client_id')
    .eq('id', requestId)
    .single()

  if (!request) {
    return { error: '존재하지 않는 의뢰입니다.' }
  }

  // 권한 검증: 의뢰자 또는 해당 개발자만 채팅방 생성 가능
  const isClient = user.id === request.client_id
  const isDeveloper = user.id === developerId
  if (!isClient && !isDeveloper) {
    return { error: '이 채팅방에 접근 권한이 없습니다.' }
  }

  // 기존 채팅방 확인
  const { data: existingRoom } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('request_id', requestId)
    .eq('developer_id', developerId)
    .single()

  if (existingRoom) {
    return { success: true, roomId: existingRoom.id }
  }

  // 새 채팅방 생성
  const { data: newRoom, error } = await supabase
    .from('chat_rooms')
    .insert({
      request_id: requestId,
      client_id: request.client_id,
      developer_id: developerId,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { success: true, roomId: newRoom.id }
}

export async function sendMessage(roomId: string, content: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  if (!content.trim()) {
    return { error: '메시지를 입력해주세요.' }
  }

  // 권한 검증: 채팅방 참여자만 메시지 전송 가능
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('client_id, developer_id')
    .eq('id', roomId)
    .single()

  if (!room) {
    return { error: '존재하지 않는 채팅방입니다.' }
  }

  if (user.id !== room.client_id && user.id !== room.developer_id) {
    return { error: '이 채팅방에 메시지를 보낼 권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: user.id,
      content: content.trim(),
    })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getMyChatRooms() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('chat_rooms')
    .select(`
      *,
      request:requests!chat_rooms_request_id_fkey(id, title),
      client:profiles!chat_rooms_client_id_fkey(id, name),
      developer:profiles!chat_rooms_developer_id_fkey(id, name)
    `)
    .or(`client_id.eq.${user.id},developer_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching chat rooms:', error)
    return []
  }

  return data
}

export async function getChatRoom(roomId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data } = await supabase
    .from('chat_rooms')
    .select(`
      *,
      request:requests!chat_rooms_request_id_fkey(id, title),
      client:profiles!chat_rooms_client_id_fkey(id, name),
      developer:profiles!chat_rooms_developer_id_fkey(id, name)
    `)
    .eq('id', roomId)
    .or(`client_id.eq.${user.id},developer_id.eq.${user.id}`)
    .single()

  return data
}

export async function getMessages(roomId: string, limit = 50) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, name)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  return data
}

export async function markMessagesAsRead(roomId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return
  }

  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('room_id', roomId)
    .neq('sender_id', user.id)
    .eq('is_read', false)
}

export async function getUnreadMessageCount() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return 0
  }

  // 내 채팅방 목록 가져오기
  const { data: rooms } = await supabase
    .from('chat_rooms')
    .select('id')
    .or(`client_id.eq.${user.id},developer_id.eq.${user.id}`)

  if (!rooms || rooms.length === 0) {
    return 0
  }

  const roomIds = rooms.map(r => r.id)

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('room_id', roomIds)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  return count || 0
}
