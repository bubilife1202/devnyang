import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getChatRoom, getMessages, markMessagesAsRead } from '@/lib/actions/chat'
import ChatMessages from './ChatMessages'

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const room = await getChatRoom(roomId)
  
  if (!room) {
    notFound()
  }

  const messages = await getMessages(roomId)
  
  // 읽음 처리
  await markMessagesAsRead(roomId)

  const otherUser = room.client_id === user.id ? room.developer : room.client
  const isClient = room.client_id === user.id

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href="/chat"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
        >
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-zinc-900 dark:text-white">
            {otherUser?.name || '알 수 없음'}
          </h1>
          <Link
            href={`/requests/${room.request_id}`}
            className="text-sm text-blue-600 hover:text-blue-500 transition cursor-pointer"
          >
            {room.request?.title}
          </Link>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          isClient 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {isClient ? '의뢰자' : '개발자'}
        </span>
      </div>

      {/* 메시지 영역 */}
      <ChatMessages 
        roomId={roomId} 
        initialMessages={messages} 
        currentUserId={user.id} 
      />
    </div>
  )
}
