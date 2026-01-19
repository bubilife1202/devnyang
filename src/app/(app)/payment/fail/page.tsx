'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const requestId = searchParams.get('requestId')
  const errorCode = searchParams.get('code')
  const errorMessage = searchParams.get('message')

  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="text-6xl mb-4">😔</div>
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        결제 실패
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-2">
        결제가 완료되지 않았습니다.
      </p>
      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
          {decodeURIComponent(errorMessage)}
          {errorCode && ` (${errorCode})`}
        </p>
      )}
      <div className="flex gap-4 justify-center">
        {requestId && (
          <Link
            href={`/requests/${requestId}`}
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
          >
            다시 시도하기
          </Link>
        )}
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium rounded-lg transition cursor-pointer"
        >
          대시보드로 가기
        </Link>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-zinc-600 dark:text-zinc-400">로딩 중...</p>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  )
}
