import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

function randomPassword() {
  // 24 chars base64url (~144 bits). Contains upper/lower/digits/-/_
  return crypto.randomBytes(18).toString('base64url')
}

function e2eEmail(prefix: string, runId: string) {
  // Using gmail.com because some domains get rejected by Auth validation.
  // email_confirm=true so we won't need inbox clicks.
  return `devnyang.e2e.${prefix}.${runId}@gmail.com`
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.TEST_SETUP_TOKEN
  const providedToken = getBearerToken(request)

  if (!expectedToken || !providedToken || !timingSafeEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server misconfigured (missing Supabase env vars)' },
      { status: 500 }
    )
  }

  const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const clientEmail = e2eEmail('client', runId)
  const developerEmail = e2eEmail('developer', runId)
  const clientPassword = randomPassword()
  const developerPassword = randomPassword()

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: clientUser, error: clientUserError } = await admin.auth.admin.createUser({
    email: clientEmail,
    password: clientPassword,
    email_confirm: true,
    user_metadata: {
      e2e: true,
      role: 'client',
      run_id: runId,
    },
  })

  if (clientUserError || !clientUser.user) {
    return NextResponse.json(
      { error: clientUserError?.message || 'Failed to create client user' },
      { status: 500 }
    )
  }

  const { data: developerUser, error: developerUserError } = await admin.auth.admin.createUser({
    email: developerEmail,
    password: developerPassword,
    email_confirm: true,
    user_metadata: {
      e2e: true,
      role: 'developer',
      run_id: runId,
    },
  })

  if (developerUserError || !developerUser.user) {
    return NextResponse.json(
      { error: developerUserError?.message || 'Failed to create developer user' },
      { status: 500 }
    )
  }

  // profiles row is created by DB trigger (handle_new_user). We set role + name here.
  const { error: profileUpsertError } = await admin.from('profiles').upsert(
    [
      {
        id: clientUser.user.id,
        email: clientEmail,
        name: `E2E Client (${runId})`,
        role: 'client',
      },
      {
        id: developerUser.user.id,
        email: developerEmail,
        name: `E2E Developer (${runId})`,
        role: 'developer',
      },
    ],
    { onConflict: 'id' }
  )

  if (profileUpsertError) {
    return NextResponse.json(
      { error: profileUpsertError.message || 'Failed to upsert profiles' },
      { status: 500 }
    )
  }

  // 테스트용 의뢰 생성 (client 계정으로)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 48)

  const { data: testRequest, error: requestError } = await admin
    .from('requests')
    .insert({
      client_id: clientUser.user.id,
      title: `[테스트] 웹 서비스 개발 의뢰 (${runId})`,
      description: '테스트용 의뢰입니다. E2E 테스트를 위해 자동 생성되었습니다. React와 Node.js를 사용한 웹 서비스 개발을 의뢰합니다. 사용자 인증, 대시보드, API 연동 기능이 필요합니다.',
      budget_min: 1000000,
      budget_max: 3000000,
      status: 'open',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (requestError) {
    return NextResponse.json(
      { error: requestError.message || 'Failed to create test request' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    runId,
    users: {
      client: {
        id: clientUser.user.id,
        email: clientEmail,
        password: clientPassword,
      },
      developer: {
        id: developerUser.user.id,
        email: developerEmail,
        password: developerPassword,
      },
    },
    testRequest: {
      id: testRequest.id,
      title: testRequest.title,
    },
  })
}
