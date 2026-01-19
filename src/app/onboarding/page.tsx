'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<UserRole | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role || !name) return

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        role,
        bio: bio || null,
        portfolio_url: portfolioUrl || null,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-zinc-300'}`} />
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-300'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-300'}`} />
          </div>

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white text-center mb-2">
                환영합니다!
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-center mb-8">
                데브냥에서 어떤 역할을 하시겠어요?
              </p>

              <div className="grid gap-4">
                <button
                  onClick={() => handleRoleSelect('client')}
                  className="p-6 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                        의뢰자 (Client)
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        개발 프로젝트를 의뢰하고 개발자들의 견적을 받아보세요.
                        48시간 역경매로 최적의 개발자를 찾을 수 있습니다.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('developer')}
                  className="p-6 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-green-500 dark:hover:border-green-500 transition group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                        개발자 (Developer)
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        다양한 개발 의뢰를 탐색하고 견적을 제출하세요.
                        부업이나 프리랜서로 수익을 올릴 수 있습니다.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                역할 다시 선택
              </button>

              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                프로필 설정
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                {role === 'client' ? '의뢰자' : '개발자'}로 활동할 기본 정보를 입력해주세요.
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    이름 / 닉네임 *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="홍길동"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    자기소개
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    placeholder={role === 'developer' ? '경력, 기술 스택, 관심 분야 등을 적어주세요.' : '어떤 프로젝트를 찾고 계신지 적어주세요.'}
                  />
                </div>

                {role === 'developer' && (
                  <div>
                    <label htmlFor="portfolio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      포트폴리오 URL
                    </label>
                    <input
                      id="portfolio"
                      type="text"
                      value={portfolioUrl}
                      onChange={(e) => {
                        let value = e.target.value
                        // 자동으로 https:// 붙이기 (입력 시작할 때)
                        if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                          // 도메인 형태로 보이면 https:// 자동 추가
                          if (value.includes('.') && !value.includes(' ')) {
                            value = 'https://' + value
                          }
                        }
                        setPortfolioUrl(value)
                      }}
                      className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="github.com/username 또는 포트폴리오 주소"
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !name}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
                >
                  {loading ? '저장 중...' : '시작하기'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
