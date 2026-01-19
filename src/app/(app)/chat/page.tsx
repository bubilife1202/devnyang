import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyChatRooms } from '@/lib/actions/chat'

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString('ko-KR')
}

export default async function ChatListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const chatRooms = await getMyChatRooms()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          메시지
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          의뢰자/개발자와 대화하세요.
        </p>
      </div>

      {chatRooms.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <svg className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            아직 대화가 없습니다
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            의뢰에 입찰하거나 입찰을 받으면 대화를 시작할 수 있습니다.
          </p>
          <Link
            href="/requests"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
          >
            의뢰 둘러보기
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
          {chatRooms.map((room) => {
            const otherUser = room.client_id === user.id ? room.developer : room.client
            
            return (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      {otherUser?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                        {otherUser?.name || '알 수 없음'}
                      </h3>
                      {room.last_message_at && (
                        <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
                          {formatRelativeTime(room.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 truncate">
                      {room.request?.title}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
