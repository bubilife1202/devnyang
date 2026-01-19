import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@devnyang.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://devnyang.vercel.app'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] RESEND_API_KEY not set, skipping email:', subject)
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: `데브냥 <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[Email] Send failed:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

// 이메일 템플릿들
export const emailTemplates = {
  newBid: (data: { requestTitle: string; developerName: string; price: number; requestId: string }) => ({
    subject: `[데브냥] "${data.requestTitle}"에 새 입찰이 들어왔습니다`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #18181b; margin-bottom: 20px;">새 입찰 알림</h2>
        <p style="color: #3f3f46;">안녕하세요,</p>
        <p style="color: #3f3f46;">
          <strong>"${data.requestTitle}"</strong> 의뢰에 새 입찰이 등록되었습니다.
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #3f3f46;">
            <strong>개발자:</strong> ${data.developerName}<br>
            <strong>제안 금액:</strong> ${data.price.toLocaleString()}원
          </p>
        </div>
        <a href="${SITE_URL}/requests/${data.requestId}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          입찰 확인하기
        </a>
        <p style="color: #71717a; font-size: 12px; margin-top: 32px;">
          이 메일은 데브냥에서 발송되었습니다.
        </p>
      </div>
    `,
  }),

  awarded: (data: { requestTitle: string; clientName: string; price: number; requestId: string }) => ({
    subject: `[데브냥] 축하합니다! "${data.requestTitle}" 프로젝트에 낙찰되었습니다`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #18181b; margin-bottom: 20px;">🎉 낙찰 축하드립니다!</h2>
        <p style="color: #3f3f46;">안녕하세요,</p>
        <p style="color: #3f3f46;">
          <strong>"${data.requestTitle}"</strong> 프로젝트에 낙찰되셨습니다!
        </p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #166534;">
            <strong>의뢰자:</strong> ${data.clientName}<br>
            <strong>계약 금액:</strong> ${data.price.toLocaleString()}원
          </p>
        </div>
        <p style="color: #3f3f46;">
          의뢰자와 채팅을 통해 프로젝트 세부 사항을 논의해주세요.
        </p>
        <a href="${SITE_URL}/requests/${data.requestId}" 
           style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          프로젝트 확인하기
        </a>
        <p style="color: #71717a; font-size: 12px; margin-top: 32px;">
          이 메일은 데브냥에서 발송되었습니다.
        </p>
      </div>
    `,
  }),

  paymentReceived: (data: { requestTitle: string; amount: number; requestId: string }) => ({
    subject: `[데브냥] "${data.requestTitle}" 결제가 완료되었습니다`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #18181b; margin-bottom: 20px;">💰 결제 완료 알림</h2>
        <p style="color: #3f3f46;">안녕하세요,</p>
        <p style="color: #3f3f46;">
          <strong>"${data.requestTitle}"</strong> 프로젝트의 결제가 완료되었습니다.
        </p>
        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>결제 금액:</strong> ${data.amount.toLocaleString()}원<br>
            <strong>상태:</strong> 에스크로 보관 중
          </p>
        </div>
        <p style="color: #3f3f46;">
          프로젝트가 완료되면 대금이 정산됩니다.
        </p>
        <a href="${SITE_URL}/requests/${data.requestId}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          프로젝트 확인하기
        </a>
        <p style="color: #71717a; font-size: 12px; margin-top: 32px;">
          이 메일은 데브냥에서 발송되었습니다.
        </p>
      </div>
    `,
  }),

  projectCompleted: (data: { requestTitle: string; amount: number; requestId: string }) => ({
    subject: `[데브냥] "${data.requestTitle}" 프로젝트가 완료되었습니다`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #18181b; margin-bottom: 20px;">✅ 프로젝트 완료!</h2>
        <p style="color: #3f3f46;">안녕하세요,</p>
        <p style="color: #3f3f46;">
          <strong>"${data.requestTitle}"</strong> 프로젝트가 완료되었습니다.
        </p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #166534;">
            <strong>정산 금액:</strong> ${data.amount.toLocaleString()}원<br>
            <strong>상태:</strong> 정산 완료
          </p>
        </div>
        <p style="color: #3f3f46;">
          서로에게 리뷰를 남겨주세요!
        </p>
        <a href="${SITE_URL}/requests/${data.requestId}" 
           style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          리뷰 작성하기
        </a>
        <p style="color: #71717a; font-size: 12px; margin-top: 32px;">
          이 메일은 데브냥에서 발송되었습니다.
        </p>
      </div>
    `,
  }),
}
