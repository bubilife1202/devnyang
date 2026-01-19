'use client'

import { useTransition } from 'react'
import { markAllNotificationsAsRead } from '@/lib/actions/notifications'

export default function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-500 font-medium transition cursor-pointer disabled:opacity-50"
    >
      {isPending ? '처리 중...' : '모두 읽음'}
    </button>
  )
}
