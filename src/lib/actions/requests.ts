'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createRequest(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const budget_min = parseInt(formData.get('budget_min') as string)
  const budget_max = parseInt(formData.get('budget_max') as string)
  const deadline = formData.get('deadline') as string | null

  // Validation
  if (!title || title.length < 5) {
    return { error: '제목은 최소 5자 이상이어야 합니다.' }
  }
  if (!description || description.length < 20) {
    return { error: '설명은 최소 20자 이상이어야 합니다.' }
  }
  if (budget_min <= 0 || budget_max <= 0) {
    return { error: '예산은 0보다 커야 합니다.' }
  }
  if (budget_min > budget_max) {
    return { error: '최소 예산이 최대 예산보다 클 수 없습니다.' }
  }

  const { data, error } = await supabase
    .from('requests')
    .insert({
      client_id: user.id,
      title,
      description,
      budget_min,
      budget_max,
      deadline: deadline || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/client')
  revalidatePath('/requests')
  redirect(`/requests/${data.id}`)
}

export async function updateRequest(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const budget_min = parseInt(formData.get('budget_min') as string)
  const budget_max = parseInt(formData.get('budget_max') as string)
  const deadline = formData.get('deadline') as string | null

  const { error } = await supabase
    .from('requests')
    .update({
      title,
      description,
      budget_min,
      budget_max,
      deadline: deadline || null,
    })
    .eq('id', id)
    .eq('client_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/requests/${id}`)
  revalidatePath('/dashboard/client')
  return { success: true }
}

export async function cancelRequest(requestId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('client_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/dashboard/client')
  return { success: true }
}

export async function getOpenRequests() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      client:profiles!requests_client_id_fkey(id, name),
      bids(count)
    `)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching requests:', error)
    return []
  }

  return data.map(request => ({
    ...request,
    bid_count: request.bids?.[0]?.count || 0
  }))
}

export async function getRequestById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      client:profiles!requests_client_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return null
  }

  return data
}

export async function getMyRequests() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      bids(count)
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching my requests:', error)
    return []
  }

  return data.map(request => ({
    ...request,
    bid_count: request.bids?.[0]?.count || 0
  }))
}
