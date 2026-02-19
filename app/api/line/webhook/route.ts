import { NextRequest, NextResponse } from 'next/server'
import * as line from '@line/bot-sdk'
import { openai, EXTRACT_PROMPT, EventData } from '@/lib/openai'
import { createCalendarEvent } from '@/lib/googleCalendar'

const channelSecret = process.env.LINE_CHANNEL_SECRET!
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!

const client = new line.messagingApi.MessagingApiClient({ channelAccessToken })

async function downloadLineImage(messageId: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    { headers: { Authorization: `Bearer ${channelAccessToken}` } }
  )
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
  return { base64, mimeType }
}

function formatThaiDateTime(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const dateStr = date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  })
  const timeStr = date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
  return `${dateStr} ${timeStr} น.`
}

async function handleImageMessage(
  replyToken: string,
  messageId: string
): Promise<void> {
  try {
    // 1. Download image from Line
    const { base64, mimeType } = await downloadLineImage(messageId)

    // 2. Extract event data via OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACT_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const content = response.choices[0].message.content ?? '{}'
    const data: EventData = JSON.parse(content)

    if (!data.title || !data.startDateTime) {
      await client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '⚠️ ไม่พบข้อมูลวันเวลาในเอกสาร\nกรุณาตรวจสอบภาพและลองใหม่อีกครั้ง' }],
      })
      return
    }

    // 3. Save to Google Calendar
    const calendarLink = await createCalendarEvent(data)

    // 4. Reply with summary
    const endTime = new Date(data.endDateTime).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok',
    })
    const startFull = formatThaiDateTime(data.startDateTime)

    const lines = [
      '✅ บันทึกลงปฏิทินแล้ว!',
      '',
      `📋 ${data.title}`,
      `📅 ${startFull} - ${endTime} น.`,
      data.location ? `📍 ${data.location}` : null,
      data.description ? `📝 ${data.description.slice(0, 100)}${data.description.length > 100 ? '...' : ''}` : null,
      '',
      `🔗 ${calendarLink}`,
    ].filter((l): l is string => l !== null)

    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: lines.join('\n') }],
    })
  } catch (error) {
    console.error('Line webhook handleImageMessage error:', error)
    await client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการประมวลผล\nกรุณาลองใหม่อีกครั้ง',
        },
      ],
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  // Verify Line signature
  if (!line.validateSignature(body, channelSecret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { events } = JSON.parse(body) as { events: line.WebhookEvent[] }

  await Promise.all(
    events.map(async (event) => {
      if (event.type !== 'message') return

      const replyToken = event.replyToken

      if (event.message.type === 'image') {
        await handleImageMessage(replyToken, event.message.id)
      } else if (event.message.type === 'text') {
        await client.replyMessage({
          replyToken,
          messages: [
            {
              type: 'text',
              text: '📎 กรุณาส่งภาพถ่ายเอกสารราชการ\nระบบจะอ่านข้อมูลและบันทึกลง Google Calendar ให้อัตโนมัติ\n\nรองรับ: JPEG, PNG',
            },
          ],
        })
      }
    })
  )

  return NextResponse.json({ ok: true })
}
