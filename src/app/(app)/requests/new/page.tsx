'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewRequestPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (title.length < 5) {
      setError('제목은 최소 5자 이상이어야 합니다.')
      return
    }
    if (description.length < 20) {
      setError('설명은 최소 20자 이상이어야 합니다.')
      return
    }
    const min = parseInt(budgetMin)
    const max = parseInt(budgetMax)
    if (min <= 0 || max <= 0) {
      setError('예산은 0보다 커야 합니다.')
      return
    }
    if (min > max) {
      setError('최소 예산이 최대 예산보다 클 수 없습니다.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('requests')
      .insert({
        client_id: user.id,
        title,
        description,
        budget_min: min,
        budget_max: max,
        deadline: deadline || null,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/requests/${data.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        새 의뢰 등록
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        프로젝트 상세 내용을 작성하면 48시간 동안 개발자들의 견적을 받을 수 있습니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-6 border border-zinc-200 dark:border-zinc-800">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              프로젝트 제목 *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="예: 음식 배달 앱 MVP 개발"
            />
            <p className="mt-1 text-xs text-zinc-500">최소 5자 이상</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              상세 설명 *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={20}
              rows={6}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              placeholder="프로젝트의 목표, 필요한 기능, 기술 스택 요구사항 등을 상세히 작성해주세요."
            />
            <p className="mt-1 text-xs text-zinc-500">최소 20자 이상</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budgetMin" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                최소 예산 (원) *
              </label>
              <input
                id="budgetMin"
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                required
                min={1}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="500000"
              />
            </div>
            <div>
              <label htmlFor="budgetMax" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                최대 예산 (원) *
              </label>
              <input
                id="budgetMax"
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                required
                min={1}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="1500000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              희망 마감일 (선택)
            </label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">입찰 기간 안내</p>
              <p className="text-blue-700 dark:text-blue-300">
                의뢰 등록 후 48시간 동안 개발자들의 견적을 받을 수 있습니다.
                입찰 기간이 종료되면 받은 견적 중에서 개발자를 선택할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 px-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-medium rounded-lg transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
          >
            {loading ? '등록 중...' : '의뢰 등록하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
