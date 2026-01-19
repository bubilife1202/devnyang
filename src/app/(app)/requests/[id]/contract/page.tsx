'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getContractData, type ContractData } from '@/lib/actions/contracts'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadContract() {
      const result = await getContractData(id)
      
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setContract(result.data)
      }
      setLoading(false)
    }

    loadContract()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500">로딩 중...</div>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          계약서를 불러올 수 없습니다
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {error || '알 수 없는 오류가 발생했습니다.'}
        </p>
        <Link
          href={`/requests/${id}`}
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
        >
          의뢰로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 인쇄 버튼 (화면에서만 표시) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Link
          href={`/requests/${id}`}
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
        >
          ← 의뢰로 돌아가기
        </Link>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          인쇄 / PDF 저장
        </button>
      </div>

      {/* 계약서 본문 */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 print:border-none print:p-0 print:bg-white">
        {/* 헤더 */}
        <div className="text-center mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-700 print:border-zinc-300">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white print:text-black mb-2">
            소프트웨어 개발 용역 계약서
          </h1>
          <p className="text-sm text-zinc-500 print:text-gray-600">
            데브냥 플랫폼 계약
          </p>
        </div>

        {/* 계약 당사자 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white print:text-black mb-4">
            제1조 (계약 당사자)
          </h2>
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300 print:text-black">
            <p>
              <span className="font-medium">의뢰자(갑):</span> {contract.clientName}
            </p>
            <p>
              <span className="font-medium">개발자(을):</span> {contract.developerName}
            </p>
          </div>
        </section>

        {/* 프로젝트 개요 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white print:text-black mb-4">
            제2조 (프로젝트 개요)
          </h2>
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300 print:text-black">
            <p>
              <span className="font-medium">프로젝트명:</span> {contract.requestTitle}
            </p>
            <div>
              <span className="font-medium">프로젝트 내용:</span>
              <p className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800 print:bg-gray-100 rounded-lg whitespace-pre-wrap text-sm">
                {contract.requestDescription}
              </p>
            </div>
          </div>
        </section>

        {/* 계약 금액 및 기간 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white print:text-black mb-4">
            제3조 (계약 금액 및 기간)
          </h2>
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300 print:text-black">
            <p>
              <span className="font-medium">계약 금액:</span> {formatCurrency(contract.price)} (VAT 포함)
            </p>
            {contract.estimatedDays && (
              <p>
                <span className="font-medium">예상 작업 기간:</span> {contract.estimatedDays}일
              </p>
            )}
            {contract.deadline && (
              <p>
                <span className="font-medium">희망 완료일:</span> {formatDate(contract.deadline)}
              </p>
            )}
            <p>
              <span className="font-medium">계약 체결일:</span> {formatDate(contract.createdAt)}
            </p>
          </div>
        </section>

        {/* 결제 조건 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white print:text-black mb-4">
            제4조 (결제 조건)
          </h2>
          <div className="space-y-2 text-zinc-700 dark:text-zinc-300 print:text-black text-sm">
            <p>1. 의뢰자(갑)는 계약 체결 후 계약 금액을 데브냥 에스크로 시스템에 입금한다.</p>
            <p>2. 에스크로에 보관된 금액은 프로젝트 완료 확인 후 개발자(을)에게 정산된다.</p>
            <p>3. 프로젝트 중도 취소 시 상호 협의에 따라 환불 여부를 결정한다.</p>
          </div>
        </section>

        {/* 권리 및 의무 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white print:text-black mb-4">
            제5조 (권리 및 의무)
          </h2>
          <div className="space-y-2 text-zinc-700 dark:text-zinc-300 print:text-black text-sm">
            <p>1. 개발자(을)는 성실하게 프로젝트를 수행하며, 합의된 기간 내에 완료하도록 최선을 다한다.</p>
            <p>2. 의뢰자(갑)는 프로젝트 진행에 필요한 자료와 정보를 적시에 제공한다.</p>
            <p>3. 개발 결과물의 저작권은 대금 정산 완료 시 의뢰자(갑)에게 이전된다.</p>
            <p>4. 개발자(을)는 프로젝트 수행 중 알게 된 비밀 정보를 제3자에게 누설하지 않는다.</p>
          </div>
        </section>

        {/* 하자 보수 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white print:text-black mb-4">
            제6조 (하자 보수)
          </h2>
          <div className="space-y-2 text-zinc-700 dark:text-zinc-300 print:text-black text-sm">
            <p>1. 프로젝트 완료 후 30일 이내 발견된 버그는 개발자(을)가 무상으로 수정한다.</p>
            <p>2. 단, 의뢰자(갑)의 요청에 의한 기능 추가나 변경은 별도 협의한다.</p>
          </div>
        </section>

        {/* 분쟁 해결 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white print:text-black mb-4">
            제7조 (분쟁 해결)
          </h2>
          <div className="space-y-2 text-zinc-700 dark:text-zinc-300 print:text-black text-sm">
            <p>1. 본 계약에 관한 분쟁은 상호 협의를 통해 해결함을 원칙으로 한다.</p>
            <p>2. 협의가 이루어지지 않을 경우, 서울중앙지방법원을 관할법원으로 한다.</p>
          </div>
        </section>

        {/* 서명란 */}
        <section className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-700 print:border-zinc-300">
          <p className="text-center text-zinc-600 dark:text-zinc-400 print:text-gray-600 mb-8">
            위 계약 내용을 확인하고, 양 당사자는 본 계약의 체결을 증명하기 위해 서명(전자서명)합니다.
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="font-medium text-zinc-900 dark:text-white print:text-black mb-2">
                의뢰자(갑)
              </p>
              <div className="border-b border-zinc-300 dark:border-zinc-600 print:border-black pb-2 mb-2">
                <span className="text-zinc-700 dark:text-zinc-300 print:text-black">
                  {contract.clientName}
                </span>
              </div>
              <p className="text-xs text-zinc-500 print:text-gray-500">서명</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-900 dark:text-white print:text-black mb-2">
                개발자(을)
              </p>
              <div className="border-b border-zinc-300 dark:border-zinc-600 print:border-black pb-2 mb-2">
                <span className="text-zinc-700 dark:text-zinc-300 print:text-black">
                  {contract.developerName}
                </span>
              </div>
              <p className="text-xs text-zinc-500 print:text-gray-500">서명</p>
            </div>
          </div>
        </section>

        {/* 푸터 */}
        <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-700 print:border-zinc-300 text-center">
          <p className="text-xs text-zinc-500 print:text-gray-500">
            본 계약서는 데브냥 플랫폼을 통해 자동 생성되었으며, 전자문서로서 법적 효력을 가집니다.
          </p>
          <p className="text-xs text-zinc-400 print:text-gray-400 mt-1">
            계약서 ID: {contract.requestId}
          </p>
        </div>
      </div>
    </div>
  )
}
