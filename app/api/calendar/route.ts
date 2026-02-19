import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvents } from '@/lib/googleCalendar'
import { EventData } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const data: EventData = await req.json()

    if (!data.title || !data.dates || data.dates.length === 0) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบ: ต้องมีชื่อและวันที่อย่างน้อย 1 รายการ' },
        { status: 400 }
      )
    }

    for (const dateRange of data.dates) {
      if (!dateRange.startDateTime || !dateRange.endDateTime) {
        return NextResponse.json(
          { error: 'ข้อมูลไม่ครบ: ทุกรายการวันที่ต้องมีเวลาเริ่มต้นและสิ้นสุด' },
          { status: 400 }
        )
      }
      const start = new Date(dateRange.startDateTime)
      const end = new Date(dateRange.endDateTime)
      if (start >= end) {
        return NextResponse.json(
          { error: 'วันเริ่มต้นต้องมาก่อนวันสิ้นสุด' },
          { status: 400 }
        )
      }
    }

    const links = await createCalendarEvents(data)

    return NextResponse.json({ links })
  } catch (error) {
    console.error('Calendar error:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถบันทึกลงปฏิทินได้ กรุณาตรวจสอบการตั้งค่า Google Calendar' },
      { status: 500 }
    )
  }
}
