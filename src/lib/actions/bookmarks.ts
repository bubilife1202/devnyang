'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBookmark(requestId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: user.id,
      request_id: requestId,
    })

  if (error) {
    if (error.code === '23505') {
      return { error: '이미 북마크한 의뢰입니다.' }
    }
    return { error: error.message }
  }

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/dashboard/developer')
  return { success: true }
}

export async function removeBookmark(requestId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('request_id', requestId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/dashboard/developer')
  return { success: true }
}

export async function getMyBookmarks() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      *,
      request:requests!bookmarks_request_id_fkey(
        id,
        title,
        status,
        budget_min,
        budget_max,
        expires_at,
        client:profiles!requests_client_id_fkey(name)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookmarks:', error)
    return []
  }

  return data
}

export async function isBookmarked(requestId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return false
  }

  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('request_id', requestId)
    .single()

  return !!data
}
