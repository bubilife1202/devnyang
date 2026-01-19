'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPayment, releasePayment } from '@/lib/actions/payments'

declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      requestPayment: (method: string, options: TossPaymentOptions) => Promise<void>
    }
  }
}

interface TossPaymentOptions {
  amount: { currency: string; value: number }
  orderId: string
  orderName: string
  successUrl: string
  failUrl: string
  customerEmail?: string
  customerName?: string
}

interface PaymentSectionProps {
  requestId: string
  bidId: string
  amount: number
  developerName: string
  requestTitle: string
  payment: {
    id: string
    status: string
    paid_at: string | null
    released_at: string | null
  } | null
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

export default function PaymentSection({
  requestId,
  bidId,
  amount,
  developerName,
  requestTitle,
  payment,
}: PaymentSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const router = useRouter()

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || ''

  useEffect(() => {
    // 토스페이먼츠 SDK 로드
    if (typeof window !== 'undefined' && !window.TossPayments) {
      const script = document.createElement('script')
      script.src = 'https://js.tosspayments.com/v2/standard'
      script.onload = () => setSdkLoaded(true)
      document.body.appendChild(script)
    } else if (typeof window.TossPayments !== 'undefined') {
      setSdkLoaded(true)
    }
  }, [])

  const handlePayment = async () => {
    if (!sdkLoaded || !window.TossPayments) {
      setError('결제 모듈을 불러오는 중입니다.')
      return
    }

    setLoading(true)
    setError(null)

    // 결제 정보 생성
    const result = await createPayment(requestId, bidId)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    try {
      const tossPayments = window.TossPayments(clientKey)
      
      await tossPayments.requestPayment('카드', {
        amount: { currency: 'KRW', value: amount },
        orderId: result.orderId!,
        orderName: requestTitle.slice(0, 100),
        successUrl: `${window.location.origin}/payment/success?requestId=${requestId}`,
        failUrl: `${window.location.origin}/payment/fail?requestId=${requestId}`,
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  const handleRelease = async () => {
    if (!payment) return
    
    if (!confirm('프로젝트 완료를 확인하고 개발자에게 대금을 정산하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      return
    }

    setLoading(true)
    setError(null)

    const result = await releasePayment(payment.id)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          결제
        </h2>
      </div>

      <div className="p-6">
        {/* 결제 정보 */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">개발자</span>
              <p className="font-medium text-zinc-900 dark:text-white">{developerName}</p>
            </div>
            <div>
              <span className="text-zinc-500">결제 금액</span>
              <p className="font-bold text-xl text-zinc-900 dark:text-white">{formatCurrency(amount)}</p>
            </div>
          </div>
        </div>

        {/* 결제 상태별 UI */}
        {!payment ? (
          // 결제 전
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>에스크로 결제</strong>: 결제 금액은 프로젝트 완료 시까지 안전하게 보관되며, 
                완료 확인 후 개발자에게 정산됩니다.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={loading || !sdkLoaded}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? '처리 중...' : `${formatCurrency(amount)} 결제하기`}
            </button>
          </>
        ) : payment.status === 'held' ? (
          // 에스크로 보관 중
          <>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔒</span>
                <span className="font-medium text-yellow-800 dark:text-yellow-200">에스크로 보관 중</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                결제 금액이 안전하게 보관되어 있습니다. 프로젝트 완료 후 정산 버튼을 눌러주세요.
              </p>
              {payment.paid_at && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  결제일: {new Date(payment.paid_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleRelease}
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? '처리 중...' : '프로젝트 완료 확인 및 정산'}
            </button>
          </>
        ) : payment.status === 'released' ? (
          // 정산 완료
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">✅</span>
              <span className="font-medium text-green-800 dark:text-green-200">정산 완료</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              프로젝트가 완료되었고, 개발자에게 대금이 정산되었습니다.
            </p>
            {payment.released_at && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                정산일: {new Date(payment.released_at).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        ) : payment.status === 'paid' ? (
          // 직접 결제 완료 (에스크로 없이)
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">✅</span>
              <span className="font-medium text-green-800 dark:text-green-200">결제 완료</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              결제가 완료되었습니다.
            </p>
          </div>
        ) : (
          // 기타 상태 (pending, refunded 등)
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              결제 상태: {payment.status}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
