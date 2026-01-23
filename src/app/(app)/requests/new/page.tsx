'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AIAnalysis {
  refinedDescription: string
  techStack: string[]
  budgetMin: number
  budgetMax: number
  estimatedDays: number
  suggestions: string[]
}

export default function NewRequestPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // AI 도우미 상태
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const handleAiAnalyze = async () => {
    if (description.length < 10) {
      setError('AI 분석을 위해 최소 10자 이상의 설명이 필요합니다.')
      return
    }

    setAiLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI 분석 실패')
      }

      setAiAnalysis(data.analysis)
      setShowAiPanel(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  const applyAiSuggestion = () => {
    if (!aiAnalysis) return
    
    if (aiAnalysis.refinedDescription) {
      setDescription(aiAnalysis.refinedDescription)
    }
    if (aiAnalysis.budgetMin) {
      setBudgetMin(aiAnalysis.budgetMin.toString())
    }
    if (aiAnalysis.budgetMax) {
      setBudgetMax(aiAnalysis.budgetMax.toString())
    }
    if (aiAnalysis.estimatedDays) {
      const deadlineDate = new Date()
      deadlineDate.setDate(deadlineDate.getDate() + aiAnalysis.estimatedDays)
      setDeadline(deadlineDate.toISOString().split('T')[0])
    }
    
    setShowAiPanel(false)
  }

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
    if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) {
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

    // 48시간 후 만료
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    const { data, error } = await supabase
      .from('requests')
      .insert({
        client_id: user.id,
        title,
        description,
        budget_min: min,
        budget_max: max,
        deadline: deadline || null,
        status: 'open',
        expires_at: expiresAt.toISOString(),
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
        새 의뢰 등록
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        프로젝트 상세 내용을 작성하면 48시간 동안 개발자들의 견적을 받을 수 있습니다.
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 메인 폼 */}
        <div className="lg:col-span-2">
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
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    상세 설명 *
                  </label>
                  <button
                    type="button"
                    onClick={handleAiAnalyze}
                    disabled={aiLoading || description.length < 10}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-zinc-400 disabled:to-zinc-500 disabled:cursor-not-allowed text-white rounded-lg transition cursor-pointer"
                  >
                    {aiLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        분석 중...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI 도우미
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={20}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder="프로젝트의 목표, 필요한 기능, 기술 스택 요구사항 등을 상세히 작성해주세요.&#10;&#10;예시: 쇼핑몰을 만들고 싶어요. 상품 등록, 결제, 배송 추적 기능이 필요합니다."
                />
                <p className="mt-1 text-xs text-zinc-500">
                  최소 20자 이상 • AI 도우미가 요구사항 정리와 예산 산정을 도와드립니다
                </p>
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
                className="flex-1 py-3 px-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-medium rounded-lg transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition cursor-pointer"
              >
                {loading ? '등록 중...' : '의뢰 등록하기'}
              </button>
            </div>
          </form>
        </div>

        {/* AI 분석 결과 패널 */}
        <div className="lg:col-span-1">
          {showAiPanel && aiAnalysis ? (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">AI 분석 결과</h3>
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="ml-auto text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-sm">
                {/* 추천 기술 스택 */}
                {aiAnalysis.techStack.length > 0 && (
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">추천 기술 스택</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.techStack.map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-xs border border-zinc-200 dark:border-zinc-700"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 예상 예산 */}
                <div>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">예상 예산</p>
                  <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    {formatCurrency(aiAnalysis.budgetMin)} ~ {formatCurrency(aiAnalysis.budgetMax)}
                  </p>
                </div>

                {/* 예상 기간 */}
                <div>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">예상 개발 기간</p>
                  <p className="text-purple-700 dark:text-purple-300">
                    약 {aiAnalysis.estimatedDays}일
                  </p>
                </div>

                {/* 추가 제안 */}
                {aiAnalysis.suggestions.length > 0 && (
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">추가 고려사항</p>
                    <ul className="space-y-1.5">
                      {aiAnalysis.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="text-purple-500">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 적용 버튼 */}
                <button
                  onClick={applyAiSuggestion}
                  className="w-full mt-4 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition cursor-pointer"
                >
                  AI 추천 적용하기
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-medium text-zinc-900 dark:text-white mb-2">AI 도우미</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  프로젝트 설명을 입력하고 AI 도우미 버튼을 클릭하면:
                </p>
                <ul className="text-sm text-zinc-600 dark:text-zinc-400 text-left space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✓</span>
                    요구사항을 체계적으로 정리
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✓</span>
                    적합한 기술 스택 추천
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✓</span>
                    합리적인 예산 범위 제안
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✓</span>
                    예상 개발 기간 산정
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
