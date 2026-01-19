import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPortfolioByDeveloper } from '@/lib/actions/portfolio'
import { getReviewsForUser } from '@/lib/actions/reviews'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DeveloperProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // 개발자 프로필 조회
  const { data: developer } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'developer')
    .single()

  if (!developer) {
    notFound()
  }

  // 포트폴리오 조회
  const portfolio = await getPortfolioByDeveloper(id)

  // 리뷰 조회
  const reviews = await getReviewsForUser(id)

  // 리뷰 통계
  const avgRating = developer.avg_rating || 0
  const reviewCount = developer.review_count || 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* 프로필 헤더 */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-3xl text-white font-bold">
            {developer.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {developer.name}
              </h1>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                개발자
              </span>
            </div>

            {/* 평점 */}
            {reviewCount > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= Math.round(avgRating)
                          ? 'text-yellow-400'
                          : 'text-zinc-300 dark:text-zinc-600'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {avgRating.toFixed(1)} ({reviewCount}개 리뷰)
                </span>
              </div>
            )}

            {/* 자기소개 */}
            {developer.bio && (
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {developer.bio}
              </p>
            )}

            {/* 외부 링크 */}
            {developer.portfolio_url && (
              <a
                href={developer.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                🔗 포트폴리오 사이트
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 포트폴리오 섹션 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
          작업물 ({portfolio.length})
        </h2>

        {portfolio.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <div className="text-4xl mb-4">📂</div>
            <p className="text-zinc-600 dark:text-zinc-400">
              아직 등록된 작업물이 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {portfolio.map((item) => (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 리뷰 섹션 */}
      {reviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
            리뷰 ({reviews.length})
          </h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {review.reviewer?.name || '익명'}
                    </span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-sm ${
                            star <= review.rating
                              ? 'text-yellow-400'
                              : 'text-zinc-300 dark:text-zinc-600'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {review.comment}
                  </p>
                )}
                {review.request && (
                  <Link
                    href={`/requests/${review.request.id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block cursor-pointer"
                  >
                    {review.request.title}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 뒤로가기 */}
      <div className="mt-8">
        <Link
          href="/requests"
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
        >
          ← 의뢰 목록으로
        </Link>
      </div>
    </div>
  )
}
