import { NextRequest, NextResponse } from 'next/server'
import { openai, EXTRACT_PROMPT, EventData } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ภาพ' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์ JPEG, PNG, WEBP, GIF' },
        { status: 400 }
      )
    }

    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์ต้องไม่เกิน 20MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACT_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const content = response.choices[0].message.content ?? '{}'
    const data: EventData = JSON.parse(content)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Extract error:', error)
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'ไม่สามารถอ่านข้อมูลจากเอกสารได้ กรุณาลองใหม่อีกครั้ง' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    )
  }
}
