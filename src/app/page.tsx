import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  let user: unknown = null

  // Supabase 환경변수가 없는 개발/프리뷰 환경에서도 홈은 렌더링되게 한다.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient()
      const result = await supabase.auth.getUser()
      user = result.data.user
    } catch {
      user = null
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white cursor-pointer">
              데브냥
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
<Link
                  href="/dashboard"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
                >
                  대시보드
                </Link>
              ) : (
                <>
<Link
                    href="/login"
                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                  >
                    로그인
                  </Link>
<Link
                    href="/signup"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
                  >
                    시작하기
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
            개발 외주의
            <br />
            <span className="text-blue-600">새로운 방식</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            프로젝트를 올리고 48시간 안에 개발자들의 견적을 받아보세요.
            역경매 방식으로 최적의 개발자를 찾을 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
<Link
              href="/signup"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-lg cursor-pointer"
            >
              무료로 시작하기
            </Link>
<Link
              href="/requests"
              className="px-8 py-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-medium rounded-xl transition text-lg cursor-pointer"
            >
              의뢰 둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white text-center mb-12">
            어떻게 작동하나요?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                프로젝트 등록
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                원하는 프로젝트의 상세 내용과 예산 범위를 작성하세요.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                견적 받기
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                48시간 동안 개발자들이 견적과 제안을 보내드립니다.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                개발자 선택
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                견적과 포트폴리오를 비교하고 최적의 개발자를 선택하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
                의뢰자를 위한 혜택
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-white">경쟁 입찰</strong> - 여러 개발자의 견적을 비교할 수 있어요
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-white">빠른 매칭</strong> - 48시간 내에 견적을 받아볼 수 있어요
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-white">투명한 가격</strong> - 예산 범위를 직접 설정할 수 있어요
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
                개발자를 위한 혜택
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-white">다양한 프로젝트</strong> - 관심 분야의 프로젝트를 찾아보세요
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-white">자유로운 견적</strong> - 본인의 역량에 맞는 가격을 제시하세요
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-white">부업 기회</strong> - 본업 외 추가 수익을 올릴 수 있어요
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            무료로 가입하고 첫 프로젝트를 등록하거나 개발 기회를 찾아보세요.
          </p>
<Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white hover:bg-zinc-100 text-blue-600 font-medium rounded-xl transition text-lg cursor-pointer"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            &copy; 2026 데브냥. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
