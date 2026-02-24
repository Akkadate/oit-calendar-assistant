# OIT Calendar Assistance — Developer Guide

## Project Overview

Web application + Line Bot ที่อ่านเอกสารราชการไทยด้วย AI แล้วบันทึกนัดหมายลง Google Calendar อัตโนมัติ พร้อมจัดเก็บเอกสารต้นฉบับใน Google Drive

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **AI**: OpenAI API — model `gpt-4.1-mini` (vision)
- **Calendar**: Google Calendar API v3
- **Storage**: Google Drive API v3
- **Line Bot**: @line/bot-sdk 10.x
- **Styling**: Tailwind CSS 3.x
- **Deployment**: Vercel (auto-deploy from GitHub)

## Architecture

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│     Web (page.tsx)          │      │     Line Bot (webhook)      │
│  Upload → Form → Save      │      │  Image → Auto → Reply       │
└──────────┬──────────────────┘      └──────────┬──────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Shared Libraries (lib/)                       │
│  openai.ts │ googleCalendar.ts │ googleDrive.ts                 │
└──────────────────────────────────────────────────────────────────┘
           │              │                │
           ▼              ▼                ▼
      OpenAI API    Google Calendar   Google Drive
      (Vision)      API v3           API v3
```

## Project Structure

```
/
├── app/
│   ├── page.tsx                    # หน้าหลัก: upload + form + บันทึก
│   ├── layout.tsx                  # Layout หลัก
│   ├── globals.css                 # Global styles (Tailwind)
│   ├── login/page.tsx              # หน้าป้อน passkey
│   └── api/
│       ├── extract/route.ts        # POST: รับภาพ → OpenAI + Drive → return JSON
│       ├── calendar/route.ts       # POST: รับ event data → บันทึก Google Calendar
│       ├── auth/login/route.ts     # POST: ตรวจ passkey → set cookie
│       └── line/webhook/route.ts   # POST: Line Bot webhook
├── components/
│   ├── UploadZone.tsx              # Drag & drop + preview
│   └── EventForm.tsx               # Form + date warning + multi-date
├── lib/
│   ├── openai.ts                   # OpenAI client + prompt + types
│   ├── googleCalendar.ts           # Calendar auth + createCalendarEvents()
│   └── googleDrive.ts              # Drive auth + uploadImageToDrive()
├── middleware.ts                    # Cookie auth guard
└── .env.local                      # Env vars (gitignored)
```

## Core Data Types (`lib/openai.ts`)

```typescript
interface DateRange {
  startDateTime: string  // ISO 8601: "2025-03-15T09:00:00"
  endDateTime: string
}

interface EventData {
  title: string       // ชื่อโครงการ/การประชุม
  dates: DateRange[]  // รองรับหลายวันที่ (1 event ต่อ 1 dateRange)
  location: string
  description: string
}
```

## Key Libraries

### `lib/openai.ts`
- `openai` — OpenAI client instance
- `EXTRACT_PROMPT` — Prompt สำหรับ Vision (แปลง พ.ศ. → ค.ศ., รองรับหลายวันที่)
- `EventData` — TypeScript interface สำหรับข้อมูลกิจกรรม

### `lib/googleCalendar.ts`
- `getGoogleCalendarClient()` — สร้าง Calendar client ด้วย OAuth2
- `createCalendarEvents(data)` — สร้าง events (1 event ต่อ 1 dateRange)
  - return: `string[]` (links ไป Calendar events)

### `lib/googleDrive.ts`
- `getGoogleDriveClient()` — สร้าง Drive client (ใช้ OAuth2 เดียวกับ Calendar)
- `generateFilename(mimeType)` — สร้างชื่อไฟล์ `LINE_YYYYMMDD_HHmmss.{ext}` (Bangkok time)
- `uploadImageToDrive(buffer, mimeType, customFilename?)` — Upload ไปโฟลเดอร์ที่กำหนด
  - return: `{ fileId, webViewLink }`

## Data Flows

### Web Flow
```
page.tsx: handleExtract()
  → POST /api/extract (formData with image)
  → openai.chat.completions.create() + uploadImageToDrive() [PARALLEL]
  → return { ...EventData, driveLink }

page.tsx: handleSave()
  → POST /api/calendar (JSON: EventData + driveLink)
  → append driveLink to description
  → createCalendarEvents(data)
  → return { links }
```

### Line Bot Flow
```
POST /api/line/webhook
  → validateSignature()
  → downloadLineImage(messageId)
  → openai.chat.completions.create() + uploadImageToDrive() [PARALLEL]
  → driveResult failure is NON-BLOCKING (.catch returns null)
  → append driveLink to description
  → createCalendarEvents(data)
  → client.replyMessage(summary + driveLink + calendarLinks)
```

## Important Patterns

### Parallel Processing
ทั้ง Web และ Line ใช้ `Promise.all()` ทำ OpenAI + Drive upload พร้อมกัน:
```typescript
const [aiResponse, driveResult] = await Promise.all([
  openai.chat.completions.create({...}),
  uploadImageToDrive(buffer, mimeType).catch(() => null),
])
```

### Non-blocking Drive Upload
Drive upload ล้มเหลว → catch แล้ว return null → flow หลักทำงานต่อได้:
```typescript
uploadImageToDrive(buffer, mimeType).catch((err) => {
  console.error('Google Drive upload error (non-blocking):', err)
  return null
})
```

### Bangkok Timezone Handling
ISO strings จาก OpenAI ไม่มี timezone → ต้องเติม `+07:00`:
```typescript
function parseBangkokTime(isoString: string): Date {
  const hasOffset = isoString.includes('+') || isoString.includes('Z')
  return new Date(hasOffset ? isoString : isoString + '+07:00')
}
```

### Multi-date Event Normalization
AI อาจ return ทั้งแบบเก่า (flat) และแบบใหม่ (dates array):
```typescript
function normalizeEventData(raw): EventData {
  if (raw.dates && Array.isArray(raw.dates)) return { ...raw } // new format
  return { ...raw, dates: [{ startDateTime, endDateTime }] }   // old format → wrap
}
```

## Environment Variables

| Variable | คำอธิบาย |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI API Key |
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client Secret |
| `GOOGLE_REDIRECT_URI` | OAuth Redirect URI |
| `GOOGLE_REFRESH_TOKEN` | Refresh Token (scope: Calendar + Drive) |
| `GOOGLE_CALENDAR_ID` | ID ปฏิทินปลายทาง |
| `GOOGLE_DRIVE_FOLDER_ID` | ID โฟลเดอร์ Google Drive |
| `PASSKEY` | รหัสผ่านเข้าเว็บ |
| `LINE_CHANNEL_SECRET` | Line Bot Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | Line Bot Channel Access Token |

> **สำคัญ**: `GOOGLE_REFRESH_TOKEN` ต้องมี scope ทั้ง `calendar` + `drive.file`

## Dependencies

```bash
npm install openai googleapis @line/bot-sdk
npm install -D @types/node typescript
```

## Development Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Lint checking
```

## Deployment

- Platform: **Vercel** (connected to GitHub `Akkadate/oit-calendar-assistant`)
- Auto-deploy: ทุก `git push main` → Vercel deploy อัตโนมัติ
- Line Bot Webhook URL: `https://<domain>.vercel.app/api/line/webhook`

## Notes for Development

- ใช้ `gpt-4.1-mini` (ไม่ใช่ `gpt-4o-mini`) — ตรวจสอบให้ถูกรุ่น
- Drive API ใช้ scope `drive.file` — จำกัดเฉพาะไฟล์ที่แอปสร้างเท่านั้น
- `driveapi.txt` มี credentials → gitignored แล้ว อย่า push
- `.env.local` ไม่ push ขึ้น GitHub → ต้องเพิ่ม env vars ใน Vercel แยก
- Line Bot ทดสอบ local ไม่ได้ → ต้อง deploy Vercel ก่อน (Line เรียก webhook URL)
- ไฟล์จาก Web ตั้งชื่อ `WEB_ชื่อไฟล์เดิม`, จาก Line ตั้งชื่อ `LINE_YYYYMMDD_HHmmss.{ext}`
