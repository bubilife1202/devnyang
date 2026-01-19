'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [bio, setBio] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setName(profile.name || '')
        setRole(profile.role)
        setBio(profile.bio || '')
        setPortfolioUrl(profile.portfolio_url || '')
      }
      setLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !role) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인이 필요합니다.')
      setSaving(false)
      return
    }

    // URL 자동 보정
    let finalUrl = portfolioUrl
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        role,
        bio: bio || null,
        portfolio_url: finalUrl || null,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          프로필 설정
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          계정 정보를 수정할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="space-y-6">
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              역할 *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`p-4 border-2 rounded-xl transition text-left cursor-pointer ${
                  role === 'client'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-300'
                }`}
              >
                <div className="font-medium text-zinc-900 dark:text-white">의뢰자</div>
                <div className="text-sm text-zinc-500 mt-1">프로젝트를 의뢰합니다</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('developer')}
                className={`p-4 border-2 rounded-xl transition text-left cursor-pointer ${
                  role === 'developer'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-green-300'
                }`}
              >
                <div className="font-medium text-zinc-900 dark:text-white">개발자</div>
                <div className="text-sm text-zinc-500 mt-1">프로젝트에 입찰합니다</div>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              자기소개
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
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
                onChange={(e) => setPortfolioUrl(e.target.value)}
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

          {success && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
              프로필이 저장되었습니다!
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || !name || !role}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition cursor-pointer"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium rounded-lg transition cursor-pointer"
            >
              취소
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
