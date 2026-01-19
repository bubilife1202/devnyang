'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ReportTargetType = 'user' | 'request' | 'message' | 'review'

export type ReportReason = 
  | '스팸/광고'
  | '사기/허위 정보'
  | '욕설/비방'
  | '부적절한 콘텐츠'
  | '지식재산권 침해'
  | '기타'

export async function submitReport(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const targetType = formData.get('target_type') as ReportTargetType
  const targetId = formData.get('target_id') as string
  const reason = formData.get('reason') as string
  const description = formData.get('description') as string | null

  if (!targetType || !targetId || !reason) {
    return { error: '필수 정보가 누락되었습니다.' }
  }

  // 중복 신고 확인
  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()

  if (existingReport) {
    return { error: '이미 신고하셨습니다.' }
  }

  // 신고 등록
  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description || null,
    })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: '신고가 접수되었습니다. 검토 후 조치하겠습니다.' }
}

export async function getMyReports() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reports:', error)
    return []
  }

  return data
}
