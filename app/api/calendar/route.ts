import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from '@/lib/googleCalendar'
import { EventData } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const data: EventData = await req.json()

    if (!data.title || !data.startDateTime || !data.endDateTime) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบ: ต้องมีชื่อ, วันเริ่มต้น และวันสิ้นสุด' },
        { status: 400 }
      )
    }

    const start = new Date(data.startDateTime)
    const end = new Date(data.endDateTime)
    if (start >= end) {
      return NextResponse.json(
        { error: 'วันเริ่มต้นต้องมาก่อนวันสิ้นสุด' },
        { status: 400 }
      )
    }

    const link = await createCalendarEvent(data)

    return NextResponse.json({ link })
  } catch (error) {
    console.error('Calendar error:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถบันทึกลงปฏิทินได้ กรุณาตรวจสอบการตั้งค่า Google Calendar' },
      { status: 500 }
    )
  }
}
