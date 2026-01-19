'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

interface RequestsFilterProps {
  initialSearch: string
  initialMinBudget: string
  initialMaxBudget: string
  initialSort: string
}

export default function RequestsFilter({
  initialSearch,
  initialMinBudget,
  initialMaxBudget,
  initialSort,
}: RequestsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(initialSearch)
  const [minBudget, setMinBudget] = useState(initialMinBudget)
  const [maxBudget, setMaxBudget] = useState(initialMaxBudget)
  const [sort, setSort] = useState(initialSort)

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (minBudget) params.set('minBudget', minBudget)
    if (maxBudget) params.set('maxBudget', maxBudget)
    if (sort && sort !== 'latest') params.set('sort', sort)
    
    startTransition(() => {
      router.push(`/requests?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setSearch('')
    setMinBudget('')
    setMaxBudget('')
    setSort('latest')
    startTransition(() => {
      router.push('/requests')
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilters()
    }
  }

  const hasFilters = search || minBudget || maxBudget || sort !== 'latest'

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 검색 */}
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="키워드로 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* 예산 범위 */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="최소 예산"
            className="w-32 px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
          />
          <span className="text-zinc-400">~</span>
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="최대 예산"
            className="w-32 px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
          />
          <span className="text-zinc-500 text-sm">원</span>
        </div>

        {/* 정렬 */}
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value)
            const params = new URLSearchParams(searchParams.toString())
            if (e.target.value !== 'latest') {
              params.set('sort', e.target.value)
            } else {
              params.delete('sort')
            }
            if (search) params.set('q', search)
            if (minBudget) params.set('minBudget', minBudget)
            if (maxBudget) params.set('maxBudget', maxBudget)
            startTransition(() => {
              router.push(`/requests?${params.toString()}`)
            })
          }}
          className="px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm cursor-pointer"
        >
          <option value="latest">최신순</option>
          <option value="budget_high">예산 높은순</option>
          <option value="budget_low">예산 낮은순</option>
          <option value="deadline">마감 임박순</option>
        </select>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            disabled={isPending}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition cursor-pointer"
          >
            {isPending ? '검색 중...' : '검색'}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              disabled={isPending}
              className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium rounded-lg transition cursor-pointer"
            >
              초기화
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
