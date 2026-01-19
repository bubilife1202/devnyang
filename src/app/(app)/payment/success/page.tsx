'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { confirmPayment } from '@/lib/actions/payments'
import Link from 'next/link'

function PaymentSuccessContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const requestId = searchParams.get('requestId')
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')

  useEffect(() => {
    async function confirm() {
      if (!paymentKey || !orderId || !amount) {
        setError('결제 정보가 올바르지 않습니다.')
        setStatus('error')
        return
      }

      const parsedAmount = parseInt(amount, 10)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('결제 금액이 올바르지 않습니다.')
        setStatus('error')
        return
      }

      const result = await confirmPayment(paymentKey, orderId, parsedAmount)

      if (result.error) {
        setError(result.error)
        setStatus('error')
      } else {
        setStatus('success')
      }
    }

    confirm()
  }, [paymentKey, orderId, amount])

  if (status === 'loading') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          결제 확인 중...
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          잠시만 기다려주세요.
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          결제 처리 실패
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {error || '결제 처리 중 오류가 발생했습니다.'}
        </p>
        {requestId && (
          <Link
            href={`/requests/${requestId}`}
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
          >
            의뢰로 돌아가기
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        결제 완료!
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        결제가 성공적으로 처리되었습니다.<br />
        결제 금액은 에스크로에 안전하게 보관됩니다.
      </p>
      {requestId && (
        <Link
          href={`/requests/${requestId}`}
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
        >
          의뢰로 돌아가기
        </Link>
      )}
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-600 dark:text-zinc-400">로딩 중...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
