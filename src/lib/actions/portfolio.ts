'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addPortfolioItem(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  let url = formData.get('url') as string | null
  const image_url = formData.get('image_url') as string | null

  if (!title) {
    return { error: '제목은 필수입니다.' }
  }

  // URL 자동 보정
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.') && !url.includes(' ')) {
      url = 'https://' + url
    }
  }

  const { error } = await supabase
    .from('portfolio_items')
    .insert({
      developer_id: user.id,
      title,
      description: description || null,
      url: url || null,
      image_url: image_url || null,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/profile')
  revalidatePath('/portfolio')
  return { success: true }
}

export async function updatePortfolioItem(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  let url = formData.get('url') as string | null
  const image_url = formData.get('image_url') as string | null

  if (!title) {
    return { error: '제목은 필수입니다.' }
  }

  // URL 자동 보정
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.') && !url.includes(' ')) {
      url = 'https://' + url
    }
  }

  const { error } = await supabase
    .from('portfolio_items')
    .update({
      title,
      description: description || null,
      url: url || null,
      image_url: image_url || null,
    })
    .eq('id', id)
    .eq('developer_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/profile')
  revalidatePath('/portfolio')
  return { success: true }
}

export async function deletePortfolioItem(itemId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', itemId)
    .eq('developer_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/profile')
  revalidatePath('/portfolio')
  return { success: true }
}

export async function getMyPortfolio() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('developer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching portfolio:', error)
    return []
  }

  return data
}

export async function getPortfolioByDeveloper(developerId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('developer_id', developerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching portfolio:', error)
    return []
  }

  return data
}
