# Document Image to Google Calendar

## Project Overview

Web application ที่ให้ผู้ใช้อัพโหลดภาพเอกสาร (เช่น หนังสือขอใช้บริการ, หนังสือราชการ) แล้วใช้ GPT-4o-mini อ่านข้อมูล แสดงผลใน form ให้แก้ไข จากนั้นบันทึกลง Google Calendar

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **AI**: OpenAI API — model `gpt-4o-mini` (vision)
- **Calendar**: Google Calendar API v3
- **Styling**: Tailwind CSS
- **Image Upload**: Next.js API Route + `formidable` หรือ `multer`

## Project Structure

```
/
├── app/
│   ├── page.tsx                  # หน้าหลัก: upload + form + ปุ่มบันทึก
│   ├── api/
│   │   ├── extract/
│   │   │   └── route.ts          # รับภาพ → ส่ง OpenAI → return JSON
│   │   └── calendar/
│   │       └── route.ts          # รับ event data → บันทึก Google Calendar
├── lib/
│   ├── openai.ts                 # OpenAI client + prompt
│   └── googleCalendar.ts         # Google Calendar client + auth
├── components/
│   ├── UploadZone.tsx            # Drag & drop / click to upload
│   └── EventForm.tsx             # Form แสดงและแก้ไขข้อมูล
├── .env.local                    # Environment variables
└── claude.md                     # This file
```

## Environment Variables (.env.local)

```env
OPENAI_API_KEY=sk-...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
GOOGLE_REFRESH_TOKEN=...
```

> หมายเหตุ: ใช้ OAuth2 Refresh Token แบบ server-side (ไม่ต้อง login ทุกครั้ง)  
> วิธีได้ Refresh Token: ใช้ Google OAuth Playground หรือ script แยกต่างหาก

## Data Fields ที่ต้องการ

```typescript
interface EventData {
  title: string       // ชื่อโครงการหรือหัวข้อการประชุม
  startDateTime: string  // ISO 8601 เช่น "2025-03-15T09:00:00"
  endDateTime: string    // ISO 8601 เช่น "2025-03-15T12:00:00"
  location: string    // สถานที่จัดงาน
  description: string // สรุปสิ่งที่ต้องเตรียม, เบอร์โทร, หมายเหตุ
}
```

## OpenAI Prompt (lib/openai.ts)

```typescript
const prompt = `
คุณคือผู้ช่วยอ่านเอกสารราชการไทย

จากภาพเอกสารที่ให้มา ให้สกัดข้อมูลต่อไปนี้แล้วตอบเป็น JSON เท่านั้น ห้ามมี text อื่น:

{
  "title": "ชื่อโครงการหรือหัวข้อการประชุม (กระชับ ชัดเจน)",
  "startDateTime": "วันที่และเวลาเริ่มต้น ในรูปแบบ ISO 8601 เช่น 2025-03-15T09:00:00 (ถ้าเอกสารระบุ พ.ศ. ให้แปลงเป็น ค.ศ. โดยลบ 543)",
  "endDateTime": "วันที่และเวลาสิ้นสุด ในรูปแบบ ISO 8601 (ถ้าไม่มีให้ประมาณ startDateTime + 2 ชั่วโมง)",
  "location": "สถานที่จัดงาน",
  "description": "สรุปสิ่งที่ต้องเตรียม, เบอร์โทรผู้ประสานงาน, หมายเหตุสำคัญ"
}

กฎสำคัญ:
- ถ้าไม่มีข้อมูลให้ใส่ string ว่าง ""
- ห้ามเดาข้อมูลที่ไม่มีในเอกสาร
- ตอบเป็น JSON ล้วน ไม่มี markdown code block
`
```

## API Routes

### POST /api/extract

รับ: `multipart/form-data` มี field `image` (file)

ขั้นตอน:
1. รับไฟล์ภาพ
2. แปลงเป็น base64
3. ส่งไปยัง OpenAI Vision API พร้อม prompt
4. Parse JSON response
5. Return `EventData`

```typescript
// app/api/extract/route.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('image') as File
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type // image/jpeg, image/png

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }
    ],
    max_tokens: 1000
  })

  const content = response.choices[0].message.content ?? '{}'
  const data = JSON.parse(content)
  return Response.json(data)
}
```

### POST /api/calendar

รับ: JSON `EventData`

ขั้นตอน:
1. Auth ด้วย Google OAuth2 Refresh Token
2. สร้าง event ใน Google Calendar
3. Return `htmlLink` (link ไปยัง event)

```typescript
// app/api/calendar/route.ts
import { google } from 'googleapis'

export async function POST(req: Request) {
  const data = await req.json()

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const calendar = google.calendar({ version: 'v3', auth })

  const event = {
    summary: data.title,
    location: data.location,
    description: data.description,
    start: { dateTime: data.startDateTime, timeZone: 'Asia/Bangkok' },
    end: { dateTime: data.endDateTime, timeZone: 'Asia/Bangkok' }
  }

  const result = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event
  })

  return Response.json({ link: result.data.htmlLink })
}
```

## UI Flow (app/page.tsx)

```
[UploadZone] 
  → ผู้ใช้ drag/drop หรือ click เลือกภาพ
  → preview ภาพ
  → กดปุ่ม "อ่านเอกสาร"
  → loading state
  → [EventForm] แสดง fields ที่อ่านได้ (แก้ไขได้ทุก field)
  → กดปุ่ม "บันทึกลงปฏิทิน"
  → แสดง success + link ไปยัง Google Calendar
```

## State Management (ใน page.tsx)

```typescript
const [file, setFile] = useState<File | null>(null)
const [preview, setPreview] = useState<string>('')
const [eventData, setEventData] = useState<EventData | null>(null)
const [loading, setLoading] = useState(false)
const [saving, setSaving] = useState(false)
const [calendarLink, setCalendarLink] = useState('')
const [error, setError] = useState('')
```

## Dependencies ที่ต้องติดตั้ง

```bash
npm install openai googleapis
npm install -D @types/node
```

Tailwind CSS มากับ Next.js default แล้ว

## Setup Steps

1. `npx create-next-app@latest doc-to-calendar --typescript --tailwind --app`
2. `cd doc-to-calendar`
3. `npm install openai googleapis`
4. สร้าง `.env.local` ใส่ keys
5. สร้างไฟล์ตาม Project Structure ด้านบน
6. รับ Google Refresh Token (ดูขั้นตอนด้านล่าง)

## วิธีรับ Google Refresh Token

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project → Enable Google Calendar API
3. สร้าง OAuth2 Credentials (Web Application)
4. ไปที่ [OAuth Playground](https://developers.google.com/oauthplayground)
5. Settings → Use your own OAuth credentials → ใส่ Client ID/Secret
6. เลือก scope: `https://www.googleapis.com/auth/calendar`
7. Authorize → Exchange for tokens → Copy Refresh Token

## Notes

- ภาพที่รองรับ: JPEG, PNG, WEBP, GIF (ตาม OpenAI Vision)
- ขนาดภาพสูงสุด: 20MB (OpenAI limit)
- ควร validate ก่อนบันทึก: startDateTime ต้องมาก่อน endDateTime
- ถ้าต้องการ multi-user ในอนาคต → เพิ่ม NextAuth.js + per-user token
