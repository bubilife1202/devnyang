'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addPortfolioItem, updatePortfolioItem, deletePortfolioItem, getMyPortfolio } from '@/lib/actions/portfolio'
import Link from 'next/link'

interface PortfolioItem {
  id: string
  title: string
  description: string | null
  url: string | null
  image_url: string | null
  created_at: string
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    image_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeveloper, setIsDeveloper] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'developer') {
        setIsDeveloper(false)
        setLoading(false)
        return
      }

      const data = await getMyPortfolio()
      setItems(data)
      setLoading(false)
    }

    loadData()
  }, [supabase, router])

  const resetForm = () => {
    setFormData({ title: '', description: '', url: '', image_url: '' })
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  const handleEdit = (item: PortfolioItem) => {
    setFormData({
      title: item.title,
      description: item.description || '',
      url: item.url || '',
      image_url: item.image_url || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = new FormData()
    form.append('title', formData.title)
    form.append('description', formData.description)
    form.append('url', formData.url)
    form.append('image_url', formData.image_url)

    let result
    if (editingId) {
      form.append('id', editingId)
      result = await updatePortfolioItem(form)
    } else {
      result = await addPortfolioItem(form)
    }

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    // Reload data
    const data = await getMyPortfolio()
    setItems(data)
    resetForm()
    setSaving(false)
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const result = await deletePortfolioItem(itemId)
    if (result.error) {
      setError(result.error)
      return
    }

    setItems(items.filter(item => item.id !== itemId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500">로딩 중...</div>
      </div>
    )
  }

  if (!isDeveloper) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            개발자 전용 페이지
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            포트폴리오는 개발자만 등록할 수 있습니다.
          </p>
          <Link
            href="/profile"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
          >
            프로필에서 역할 변경하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            내 포트폴리오
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            작업물을 등록하여 의뢰자에게 실력을 보여주세요.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
          >
            + 새 작업물
          </button>
        )}
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
            {editingId ? '작업물 수정' : '새 작업물 등록'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                제목 *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="프로젝트 이름"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                설명
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="프로젝트에 대해 설명해주세요"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                프로젝트 URL
              </label>
              <input
                id="url"
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="github.com/user/repo 또는 프로젝트 링크"
              />
            </div>

            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                이미지 URL
              </label>
              <input
                id="image_url"
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="스크린샷 또는 썸네일 이미지 URL"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || !formData.title}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition cursor-pointer"
              >
                {saving ? '저장 중...' : (editingId ? '수정하기' : '등록하기')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium rounded-lg transition cursor-pointer"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 포트폴리오 목록 */}
      {items.length === 0 && !showForm ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div className="text-4xl mb-4">📂</div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            아직 등록된 작업물이 없습니다
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            첫 번째 작업물을 등록하여 포트폴리오를 시작하세요!
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition cursor-pointer"
          >
            + 첫 작업물 등록하기
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              {/* 이미지 */}
              {item.image_url ? (
                <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <span className="text-4xl">💻</span>
                </div>
              )}

              {/* 내용 */}
              <div className="p-4">
                <h3 className="font-bold text-zinc-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    🔗 프로젝트 보기
                  </a>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 py-2 px-3 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 py-2 px-3 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
