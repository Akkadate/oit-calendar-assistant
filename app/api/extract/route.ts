import { NextRequest, NextResponse } from 'next/server'
import { openai, EXTRACT_PROMPT, EventData } from '@/lib/openai'

// Normalize AI response — handles both new format (dates array) and old flat format
function normalizeEventData(raw: Record<string, unknown>): EventData {
  if (raw.dates && Array.isArray(raw.dates) && raw.dates.length > 0) {
    return {
      title: (raw.title as string) ?? '',
      dates: raw.dates as EventData['dates'],
      location: (raw.location as string) ?? '',
      description: (raw.description as string) ?? '',
    }
  }
  // Fallback: AI returned old flat format, convert to dates array
  return {
    title: (raw.title as string) ?? '',
    dates: [
      {
        startDateTime: (raw.startDateTime as string) ?? '',
        endDateTime: (raw.endDateTime as string) ?? '',
      },
    ],
    location: (raw.location as string) ?? '',
    description: (raw.description as string) ?? '',
  }
}

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
      model: 'gpt-4.1-mini',
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
    const raw = JSON.parse(content)
    const data: EventData = normalizeEventData(raw)

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
