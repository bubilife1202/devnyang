'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const name = formData.get('name') as string
  const role = formData.get('role') as UserRole
  const bio = formData.get('bio') as string | null
  const portfolio_url = formData.get('portfolio_url') as string | null

  if (!name || !role) {
    return { error: '이름과 역할은 필수입니다.' }
  }

  if (!['client', 'developer'].includes(role)) {
    return { error: '올바른 역할을 선택해주세요.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      name,
      role,
      bio: bio || null,
      portfolio_url: portfolio_url || null,
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function getProfile() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
