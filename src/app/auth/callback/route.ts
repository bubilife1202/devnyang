import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 프로필 확인하여 역할이 없으면 온보딩으로
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (!profile?.role) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
      }
      
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // 에러 발생 시 로그인 페이지로
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
}
