'use client'

import { useState, useTransition } from 'react'
import { addBookmark, removeBookmark } from '@/lib/actions/bookmarks'

interface BookmarkButtonProps {
  requestId: string
  initialBookmarked: boolean
}

export default function BookmarkButton({ requestId, initialBookmarked }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      if (isBookmarked) {
        const result = await removeBookmark(requestId)
        if (result.success) {
          setIsBookmarked(false)
        }
      } else {
        const result = await addBookmark(requestId)
        if (result.success) {
          setIsBookmarked(true)
        }
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
        isBookmarked
          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
          : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
      }`}
      title={isBookmarked ? '북마크 해제' : '북마크 추가'}
    >
      <svg
        className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`}
        fill={isBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      <span className="text-sm font-medium">
        {isPending ? '처리 중...' : isBookmarked ? '북마크됨' : '북마크'}
      </span>
    </button>
  )
}
