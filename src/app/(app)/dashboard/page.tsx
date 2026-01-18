import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // 역할에 따라 적절한 대시보드로 리다이렉트
  if (profile?.role === 'client') {
    redirect('/dashboard/client')
  } else if (profile?.role === 'developer') {
    redirect('/dashboard/developer')
  } else {
    redirect('/onboarding')
  }
}
