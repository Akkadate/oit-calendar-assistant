# OIT Calendar Assistance

ระบบอ่านเอกสารราชการไทยด้วย AI แล้วบันทึกนัดหมายลง Google Calendar อัตโนมัติ พร้อมจัดเก็บเอกสารต้นฉบับใน Google Drive
พัฒนาสำหรับ **สำนักเทคโนโลยีสารสนเทศ (OIT) — มหาวิทยาลัยนอร์ทกรุงเทพ**

---

## สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [Tech Stack](#tech-stack)
3. [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
4. [การทำงานของระบบ](#การทำงานของระบบ)
5. [Environment Variables](#environment-variables)
6. [การติดตั้งและรันในเครื่อง](#การติดตั้งและรันในเครื่อง)
7. [API Reference](#api-reference)
8. [การ Deploy บน Vercel](#การ-deploy-บน-vercel)
9. [ฟีเจอร์ปัจจุบัน](#ฟีเจอร์ปัจจุบัน)
10. [แนวทางพัฒนา Phase ต่อไป](#แนวทางพัฒนา-phase-ต่อไป)

---

## ภาพรวมระบบ

ระบบรองรับ **2 ช่องทาง** ในการรับเอกสาร:

### ช่องทางที่ 1: หน้าเว็บ

```
ผู้ใช้อัพโหลดภาพเอกสาร (Web)
         ↓
   GPT-4.1-mini (Vision)             Google Drive
   อ่านข้อมูลจากเอกสาร       +      เก็บเอกสารต้นฉบับ
         ↓                            (ทำงานพร้อมกัน)
   แสดงผลใน Form ให้แก้ไข
         ↓
   บันทึกลง Google Calendar
   (พร้อมลิงก์เอกสารต้นฉบับ)
```

### ช่องทางที่ 2: Line Bot

```
ผู้ใช้ส่งภาพเอกสารผ่าน Line
         ↓
   GPT-4.1-mini (Vision)             Google Drive
   อ่านข้อมูลจากเอกสาร       +      เก็บเอกสารต้นฉบับ
         ↓                            (ทำงานพร้อมกัน)
   บันทึกลง Google Calendar อัตโนมัติ
         ↓
   ตอบกลับ Line พร้อมสรุป + ลิงก์ปฏิทิน + ลิงก์เอกสาร
```

---

## Tech Stack

| ส่วน | เทคโนโลยี | เวอร์ชัน |
|------|-----------|---------|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| AI/Vision | OpenAI API | gpt-4.1-mini |
| Calendar | Google Calendar API | v3 |
| Storage | Google Drive API | v3 |
| Line Bot | @line/bot-sdk | 10.x |
| Auth | Passkey + httpOnly Cookie | - |
| Deployment | Vercel | - |
| Repository | GitHub | Akkadate/oit-calendar-assistant |

---

## โครงสร้างโปรเจกต์

```
/
├── app/
│   ├── page.tsx                    # หน้าหลัก: upload + form + บันทึก
│   ├── layout.tsx                  # Layout หลัก
│   ├── globals.css                 # Global styles (Tailwind)
│   ├── login/
│   │   └── page.tsx               # หน้าป้อน passkey
│   └── api/
│       ├── extract/
│       │   └── route.ts           # POST: รับภาพ → OpenAI + Drive → return JSON
│       ├── calendar/
│       │   └── route.ts           # POST: รับ event data → บันทึก Google Calendar
│       ├── auth/
│       │   └── login/
│       │       └── route.ts       # POST: ตรวจ passkey → set cookie
│       └── line/
│           └── webhook/
│               └── route.ts       # POST: Line Bot webhook (รับรูป → อ่าน → บันทึก)
├── components/
│   ├── UploadZone.tsx             # Drag & drop / click to upload + preview
│   └── EventForm.tsx              # Form แสดง/แก้ไขข้อมูล + warning วันที่อดีต
├── lib/
│   ├── openai.ts                  # OpenAI client + EXTRACT_PROMPT + EventData type
│   ├── googleCalendar.ts          # Google Calendar client + createCalendarEvents()
│   └── googleDrive.ts             # Google Drive client + uploadImageToDrive()
├── middleware.ts                   # Guard: ตรวจ cookie ก่อนเข้าหน้าหลัก
├── .env.local                      # Environment variables (ไม่ push GitHub)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## การทำงานของระบบ

### Web Flow (หน้าเว็บ)

```
1. ผู้ใช้เปิด URL → middleware ตรวจ cookie oit_auth
2. ถ้าไม่มี cookie → redirect /login
3. ป้อน passkey → POST /api/auth/login → set httpOnly cookie (7 วัน)
4. redirect กลับ /
5. อัพโหลดภาพเอกสาร (JPEG/PNG/WEBP/GIF, max 20MB)
6. กด "อ่านเอกสาร" → POST /api/extract
   → OpenAI Vision อ่านข้อมูล (parallel)
   → Upload ภาพไปเก็บที่ Google Drive
   → return EventData + driveLink
7. แสดงข้อมูลใน EventForm (แก้ไขได้)
8. ถ้าวันที่เป็นอดีต → แสดง warning สีเหลือง
9. กด "บันทึกลงปฏิทิน" → POST /api/calendar
   → เพิ่มลิงก์เอกสารต้นฉบับ (Drive) ใน description
   → บันทึกลง Google Calendar
10. แสดง link ไปยัง event ที่สร้าง
```

### Line Bot Flow

```
1. ผู้ใช้ส่งภาพเอกสารผ่าน Line
2. Webhook POST /api/line/webhook
3. ตรวจสอบ Line signature
4. Download ภาพจาก Line API
5. ทำงาน parallel:
   → OpenAI Vision อ่านข้อมูล
   → Upload ภาพไป Google Drive
6. เพิ่มลิงก์เอกสารต้นฉบับ (Drive) ใน event description
7. บันทึกลง Google Calendar (1 event ต่อ 1 ช่วงวันที่)
8. ตอบกลับ Line:
   - สรุปกิจกรรม (ชื่อ, วันเวลา, สถานที่)
   - ลิงก์เอกสารต้นฉบับ (Drive)
   - ลิงก์ไปยัง Calendar event
```

### การรองรับหลายวันที่ (Multi-date Events)

- วันที่ต่อเนื่อง เช่น "1-3 มกราคม" → สร้าง 1 event
- วันที่ไม่ต่อเนื่อง เช่น "1 และ 5 มกราคม" → สร้าง 2 events แยก
- ผสม เช่น "1-2 และ 7 มกราคม" → สร้าง 2 events

### การแปลงปี พ.ศ. → ค.ศ.

Prompt ที่ส่งให้ GPT กำหนดกฎชัดเจน:
- เอกสารราชการไทยใช้ปี พ.ศ. เสมอ
- ต้องลบ 543 ทุกครั้ง (เช่น พ.ศ. 2568 → ค.ศ. 2025)
- ปีย่อ เช่น "68" → แปลงเป็น 2568 ก่อน แล้วลบ 543
- หากผิดพลาด Form จะแสดง warning และบอกปีที่อ่านได้

---

## Environment Variables

ไฟล์ `.env.local` (local) หรือ Vercel Environment Variables (production)

| Variable | ตัวอย่าง | คำอธิบาย |
|----------|---------|---------|
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI API Key |
| `GOOGLE_CLIENT_ID` | `225993...apps.googleusercontent.com` | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google OAuth2 Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://your-domain.vercel.app/api/auth/callback` | OAuth Redirect URI |
| `GOOGLE_REFRESH_TOKEN` | `1//04k...` | Google OAuth2 Refresh Token (ต้องมี scope ทั้ง Calendar + Drive) |
| `GOOGLE_CALENDAR_ID` | `c_86ea...@group.calendar.google.com` | ID ปฏิทินปลายทาง |
| `GOOGLE_DRIVE_FOLDER_ID` | `11HTrdJ-iRC...` | ID โฟลเดอร์ Google Drive สำหรับเก็บเอกสาร |
| `PASSKEY` | `oit2026` | รหัสผ่านเข้าใช้งานระบบ (Web) |
| `LINE_CHANNEL_SECRET` | `7644cb...` | Line Bot Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | `MqogKJ...` | Line Bot Channel Access Token |

### วิธีขอ Google Refresh Token (Calendar + Drive)

> **สำคัญ**: Refresh Token ต้องมี 2 scopes — Calendar + Drive

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. Enable ทั้ง **Google Calendar API** และ **Google Drive API**
3. สร้าง OAuth2 Credentials (Web Application)
4. เพิ่ม Authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
   - `https://your-domain.vercel.app/api/auth/callback`
5. ไปที่ [OAuth Playground](https://developers.google.com/oauthplayground)
6. Settings → Use your own OAuth credentials → ใส่ Client ID/Secret
7. เลือก **2 scopes**:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/drive.file`
8. Authorize → Exchange for tokens → Copy **Refresh Token**

### วิธีขอ Google Drive Folder ID

1. เปิด Google Drive → สร้างโฟลเดอร์ใหม่ (เช่น "OIT Documents")
2. คลิกขวา → Share → เลือก "Anyone with the link" (ให้คนในทีมเปิดได้)
3. เปิดโฟลเดอร์ → คัดลอก ID จาก URL: `https://drive.google.com/drive/folders/` **`<FOLDER_ID>`**

### วิธีตั้งค่า Line Bot

1. ไปที่ [Line Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider → สร้าง Messaging API Channel
3. คัดลอก **Channel Secret** และ **Channel Access Token**
4. ตั้ง Webhook URL:  `https://your-domain.vercel.app/api/line/webhook`
5. เปิดใช้ Webhook → ปิด Auto-reply messages

---

## การติดตั้งและรันในเครื่อง

```bash
# 1. Clone repository
git clone https://github.com/Akkadate/oit-calendar-assistant.git
cd oit-calendar-assistant

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env.local และใส่ค่าทั้งหมด (ดูตาราง Environment Variables)
# ต้องมีอย่างน้อย: OPENAI_API_KEY, GOOGLE_*, PASSKEY
# สำหรับ Line Bot: LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN

# 4. รัน development server
npm run dev
```

เปิดที่ `http://localhost:3000`

> **หมายเหตุ**: Line Bot จะใช้งานได้เฉพาะเมื่อ deploy บน server ที่มี public URL (เช่น Vercel)
> เพราะ Line ต้องเรียก Webhook URL ได้

---

## API Reference

### POST `/api/auth/login`

ตรวจสอบ passkey และตั้ง session cookie

**Request Body:**
```json
{ "passkey": "oit2026" }
```

**Response (200):**
```json
{ "ok": true }
```
+ Set-Cookie: `oit_auth` (httpOnly, 7 วัน)

---

### POST `/api/extract`

รับภาพเอกสาร → ส่ง OpenAI อ่านข้อมูล + Upload ไป Google Drive (parallel)

**Request:** `multipart/form-data`
- field `image`: ไฟล์ภาพ (JPEG/PNG/WEBP/GIF, max 20MB)

**Response (200):**
```json
{
  "title": "ชื่อโครงการ",
  "dates": [
    {
      "startDateTime": "2025-03-15T09:00:00",
      "endDateTime": "2025-03-15T11:00:00"
    }
  ],
  "location": "ห้องประชุม 101",
  "description": "สรุปรายละเอียด...",
  "driveLink": "https://drive.google.com/file/d/xxx/view"
}
```

---

### POST `/api/calendar`

บันทึก event ลง Google Calendar (รองรับหลายวันที่)

**Request Body:**
```json
{
  "title": "ชื่อโครงการ",
  "dates": [
    {
      "startDateTime": "2025-03-15T09:00:00",
      "endDateTime": "2025-03-15T11:00:00"
    }
  ],
  "location": "ห้องประชุม 101",
  "description": "รายละเอียด...",
  "driveLink": "https://drive.google.com/file/d/xxx/view"
}
```

**Response (200):**
```json
{ "links": ["https://calendar.google.com/calendar/event?eid=..."] }
```

> หากมีหลายวันที่ → สร้างหลาย events → return หลาย links

---

### POST `/api/line/webhook`

Line Bot Webhook — รับภาพเอกสาร → อ่าน → บันทึก → ตอบกลับ

- ตรวจสอบ Line signature อัตโนมัติ
- รับภาพ → download → OpenAI + Drive (parallel) → Calendar → reply
- รับข้อความ → ตอบแนะนำให้ส่งภาพ

---

## การ Deploy บน Vercel

1. ไปที่ [vercel.com](https://vercel.com) → Import GitHub repo `Akkadate/oit-calendar-assistant`
2. ตั้งค่า **Environment Variables** ทุกตัว (10 ตัว) ก่อน Deploy
3. Deploy (ไม่ใช้ cache ถ้าเพิ่ง env vars ใหม่)
4. ทุกครั้งที่ `git push main` → Vercel auto-deploy อัตโนมัติ

### Checklist หลัง Deploy

- [ ] เปิดเว็บ → login ด้วย passkey → ทดสอบอัพโหลดเอกสาร
- [ ] ตรวจสอบว่า event ปรากฏใน Google Calendar
- [ ] ตรวจสอบว่าไฟล์ปรากฏใน Google Drive
- [ ] ส่งภาพผ่าน Line Bot → ตรวจสอบ reply + Calendar + Drive
- [ ] ตรวจสอบว่า description ใน Calendar มีลิงก์เอกสารต้นฉบับ

---

## ฟีเจอร์ปัจจุบัน

### Phase 1 — Core Features ✅

- [x] อัพโหลดภาพด้วย Drag & Drop หรือ Click
- [x] อ่านเอกสารด้วย GPT-4.1-mini Vision
- [x] แปลงปี พ.ศ. → ค.ศ. อัตโนมัติ
- [x] แสดง warning เมื่อวันที่เป็นอดีต (ตรวจจับปีผิด)
- [x] รองรับหลายวันที่ในเอกสารเดียว (Multi-date Events)
- [x] Form แก้ไขข้อมูลก่อนบันทึก (เพิ่ม/ลบวันที่ได้)
- [x] บันทึกลง Google Calendar (ปฏิทิน OIT)
- [x] Passkey protection (เปลี่ยนได้ผ่าน env var)
- [x] Deploy บน Vercel + GitHub auto-deploy

### Phase 1.5 — Line Bot + Document Storage ✅

- [x] Line Bot integration (ส่งรูปผ่าน Line → บันทึกปฏิทินอัตโนมัติ)
- [x] จัดเก็บเอกสารต้นฉบับใน Google Drive (ทั้ง Web และ Line)
- [x] ลิงก์เอกสารต้นฉบับใน Calendar event description
- [x] ลิงก์เอกสารต้นฉบับใน Line reply message
- [x] Upload Drive ทำงาน parallel กับ AI (ไม่เพิ่มเวลารอ)
- [x] Drive upload ล้มเหลว → ไม่กระทบ flow หลัก (non-blocking)

---

## แนวทางพัฒนา Phase ต่อไป

### Phase 2 — Multi-user & History

| ฟีเจอร์ | คำอธิบาย | เทคโนโลยีแนะนำ |
|---------|---------|----------------|
| Login รายบุคคล | ยกเลิก passkey → ใช้ Google OAuth | NextAuth.js |
| ฐานข้อมูล | เก็บประวัติการบันทึก + ข้อมูลผู้ใช้ | Supabase (PostgreSQL) |
| หน้าประวัติ | ดูรายการกิจกรรมที่เคยบันทึก | React Table / DataGrid |
| แก้ไข/ลบ event | จัดการ event จากหน้าประวัติ | Google Calendar API update/delete |

**ข้อแนะนำ**:
- ใช้ Supabase เพราะมีทั้ง Database + Auth + Storage ในที่เดียว
- เก็บ Refresh Token ต่อ user (ไม่ใช้ token เดียวกันทั้งระบบ)
- Migration path: เพิ่ม `/dashboard` route สำหรับหน้าประวัติ

### Phase 3 — UX Improvements

| ฟีเจอร์ | คำอธิบาย | ความซับซ้อน |
|---------|---------|------------|
| อัพโหลดหลายภาพ | หลายหน้าในเอกสารเดียว | ปานกลาง |
| รองรับ PDF | แปลง PDF → ภาพ → ส่ง AI | ปานกลาง (ใช้ pdf.js) |
| Preview ปฏิทิน | แสดง mini calendar ก่อนบันทึก | ง่าย |
| เลือกปฏิทินปลายทาง | dropdown หลายปฏิทิน | ง่าย |

**ข้อแนะนำ**:
- PDF support ใช้ `pdfjs-dist` แปลงเป็นภาพแล้วส่ง OpenAI เหมือนเดิม
- หลายภาพ → ส่ง OpenAI แบบ multi-image ได้ (GPT-4.1-mini รองรับ)

### Phase 4 — Extended Automation

| ฟีเจอร์ | คำอธิบาย | ความซับซ้อน |
|---------|---------|------------|
| Email integration | Forward email แนบเอกสาร → บันทึก | สูง |
| Reminder notification | แจ้งเตือนก่อนกิจกรรมผ่าน Line | ปานกลาง |
| OCR fallback | ใช้ Google Vision OCR เมื่อ OpenAI อ่านไม่ได้ | ปานกลาง |

### Phase 5 — Admin & Analytics

| ฟีเจอร์ | คำอธิบาย | ความซับซ้อน |
|---------|---------|------------|
| Admin dashboard | สรุปจำนวนเอกสาร, กิจกรรม, การใช้งาน | ปานกลาง |
| จัดการ user | เพิ่ม/ลบ/จัดการสิทธิ์ผู้ใช้ | ปานกลาง |
| Export รายงาน | ส่งออกกิจกรรมประจำเดือน (PDF/Excel) | ปานกลาง |

---

## Data Types

```typescript
interface DateRange {
  startDateTime: string  // ISO 8601: "2025-03-15T09:00:00"
  endDateTime: string
}

interface EventData {
  title: string       // ชื่อโครงการ/การประชุม
  dates: DateRange[]  // รองรับหลายวันที่
  location: string    // สถานที่
  description: string // รายละเอียด
}

interface DriveUploadResult {
  fileId: string
  webViewLink: string
}
```

---

## หมายเหตุด้านความปลอดภัย

- `.env.local` ถูก gitignore ไว้ ไม่ถูก push ขึ้น GitHub
- `driveapi.txt` (credentials) ถูก gitignore ไว้
- API Keys และ Refresh Token เก็บเฉพาะใน Environment Variables
- Passkey เก็บเป็น httpOnly cookie ป้องกัน XSS
- Line Webhook ตรวจสอบ signature ทุกครั้ง
- Google Drive upload ใช้ scope `drive.file` (จำกัดเฉพาะไฟล์ที่แอปสร้าง)
- แนะนำ rotate OpenAI API Key เป็นระยะ
- Refresh Token Google ไม่หมดอายุ แต่ revoke ได้จาก Google Account Settings

---

*พัฒนาโดย สำนักเทคโนโลยีสารสนเทศ — Phase 1 + 1.5 (กุมภาพันธ์ 2569)*
