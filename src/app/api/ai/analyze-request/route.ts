import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const SYSTEM_PROMPT = `당신은 소프트웨어 개발 외주 전문 컨설턴트입니다. 
의뢰자가 작성한 프로젝트 설명을 분석하여 다음을 제공합니다:

1. **정리된 요구사항**: 의뢰 내용을 체계적으로 정리
2. **추천 기술 스택**: 프로젝트에 적합한 기술 스택 제안
3. **예상 예산 범위**: 한국 시장 기준 합리적인 예산 (만원 단위)
4. **예상 개발 기간**: 현실적인 일정 산정
5. **추가 고려사항**: 의뢰자가 놓칠 수 있는 기능이나 요구사항

응답은 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{
  "refinedDescription": "정리된 프로젝트 설명",
  "techStack": ["기술1", "기술2"],
  "budgetMin": 숫자(만원단위),
  "budgetMax": 숫자(만원단위),
  "estimatedDays": 숫자,
  "suggestions": ["제안1", "제안2"]
}

주의사항:
- 한국어로 응답
- 예산은 한국 프리랜서 시장 기준 (시니어 일당 50-80만원, 주니어 30-50만원)
- MVP 기준으로 최소 기능만 산정
- 과도한 예산이나 일정 부풀리기 금지`

export async function POST(request: NextRequest) {
  try {
    const { description, title } = await request.json()

    if (!description || description.length < 10) {
      return NextResponse.json(
        { error: '프로젝트 설명이 너무 짧습니다.' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI 서비스가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const userMessage = title 
      ? `프로젝트 제목: ${title}\n\n프로젝트 설명:\n${description}`
      : `프로젝트 설명:\n${description}`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })
    
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userMessage },
    ])

    const response = result.response
    const content = response.text()
    
    if (!content) {
      throw new Error('AI 응답이 비어있습니다.')
    }

    // JSON 파싱 (마크다운 코드블록 제거)
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const analysis = JSON.parse(jsonStr)

    return NextResponse.json({
      success: true,
      analysis: {
        refinedDescription: analysis.refinedDescription || '',
        techStack: analysis.techStack || [],
        budgetMin: (analysis.budgetMin || 100) * 10000, // 만원 → 원
        budgetMax: (analysis.budgetMax || 300) * 10000,
        estimatedDays: analysis.estimatedDays || 14,
        suggestions: analysis.suggestions || [],
      },
    })
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { error: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
