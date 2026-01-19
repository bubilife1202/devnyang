'use client'

import { useState } from 'react'
import { submitReport, type ReportTargetType } from '@/lib/actions/reports'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: ReportTargetType
  targetId: string
  targetName?: string
}

const REASONS = [
  '스팸/광고',
  '사기/허위 정보',
  '욕설/비방',
  '부적절한 콘텐츠',
  '지식재산권 침해',
  '기타',
]

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) {
      setError('신고 사유를 선택해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('target_type', targetType)
    formData.append('target_id', targetId)
    formData.append('reason', reason)
    formData.append('description', description)

    const result = await submitReport(formData)

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  const handleClose = () => {
    setReason('')
    setDescription('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  const targetLabel = {
    user: '사용자',
    request: '의뢰',
    message: '메시지',
    review: '리뷰',
  }[targetType]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={handleClose}
      />
      
      {/* 모달 */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {success ? '신고 완료' : `${targetLabel} 신고하기`}
            </h2>
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-zinc-600 dark:text-zinc-400">
                신고가 접수되었습니다.<br />
                검토 후 적절한 조치를 취하겠습니다.
              </p>
              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
              >
                확인
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {targetName && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <span className="text-sm text-zinc-500">신고 대상</span>
                  <p className="font-medium text-zinc-900 dark:text-white">{targetName}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  신고 사유 *
                </label>
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-blue-600"
                      />
                      <span className="text-zinc-700 dark:text-zinc-300">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  상세 설명 (선택)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder="추가 설명이 있다면 적어주세요."
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium rounded-lg transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? '처리 중...' : '신고하기'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
