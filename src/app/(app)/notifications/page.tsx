import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyNotifications, markAllNotificationsAsRead } from '@/lib/actions/notifications'
import MarkAllReadButton from './MarkAllReadButton'

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

function getNotificationIcon(type: string) {
  switch (type) {
    case 'new_bid':
      return '📨'
    case 'bid_updated':
      return '✏️'
    case 'awarded':
      return '🎉'
    case 'not_selected':
      return '😢'
    case 'new_message':
      return '💬'
    case 'review_received':
      return '⭐'
    case 'payment_received':
      return '💰'
    case 'project_completed':
      return '✅'
    default:
      return '🔔'
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const notifications = await getMyNotifications(50)
  const hasUnread = notifications.some(n => !n.is_read)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            알림
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            새로운 소식을 확인하세요.
          </p>
        </div>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <svg className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            알림이 없습니다
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            새로운 알림이 오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.link || '#'}
              className={`block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer ${
                !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-medium truncate ${
                      !notification.is_read 
                        ? 'text-zinc-900 dark:text-white' 
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>
                  {notification.content && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {notification.content}
                    </p>
                  )}
                </div>
                {!notification.is_read && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
