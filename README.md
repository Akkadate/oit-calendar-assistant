# OIT Calendar Assistance

ระบบอ่านเอกสารราชการไทยด้วย AI แล้วบันทึกนัดหมายลง Google Calendar อัตโนมัติ
พัฒนาสำหรับ **สำนักเทคโนโลยีสารสนเทศ (OIT)**

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
9. [ฟีเจอร์ที่มีใน Phase 1](#ฟีเจอร์ที่มีใน-phase-1)
10. [แนวทางพัฒนา Phase ต่อไป](#แนวทางพัฒนา-phase-ต่อไป)

---

## ภาพรวมระบบ

```
ผู้ใช้อัพโหลดภาพเอกสาร
        ↓
  GPT-4.1-mini (Vision)
  อ่านข้อมูลจากเอกสาร
        ↓
  แสดงผลใน Form ให้แก้ไข
        ↓
  บันทึกลง Google Calendar
  (ปฏิทิน: สำนักเทคโนโลยีสารสนเทศ)
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
| Auth | OAuth2 Refresh Token | - |
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
│       │   └── route.ts           # POST: รับภาพ → OpenAI → return JSON
│       ├── calendar/
│       │   └── route.ts           # POST: รับ event data → บันทึก Google Calendar
│       └── auth/
│           └── login/
│               └── route.ts       # POST: ตรวจ passkey → set cookie
├── components/
│   ├── UploadZone.tsx             # Drag & drop / click to upload + preview
│   └── EventForm.tsx              # Form แสดง/แก้ไขข้อมูล + warning วันที่อดีต
├── lib/
│   ├── openai.ts                  # OpenAI client + EXTRACT_PROMPT + EventData type
│   └── googleCalendar.ts          # Google Calendar client + createCalendarEvent()
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

### Flow หลัก

```
1. ผู้ใช้เปิด URL → middleware ตรวจ cookie oit_auth
2. ถ้าไม่มี cookie → redirect /login
3. ป้อน passkey → POST /api/auth/login → set httpOnly cookie (7 วัน)
4. redirect กลับ /
5. อัพโหลดภาพเอกสาร (JPEG/PNG/WEBP/GIF, max 20MB)
6. กด "อ่านเอกสาร" → POST /api/extract → OpenAI Vision → JSON
7. แสดงข้อมูลใน EventForm (แก้ไขได้)
8. ถ้าวันที่เป็นอดีต → แสดง warning สีเหลือง
9. กด "บันทึกลงปฏิทิน" → POST /api/calendar → Google Calendar API
10. แสดง link ไปยัง event ที่สร้าง
```

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
| `GOOGLE_REFRESH_TOKEN` | `1//04k...` | Google OAuth2 Refresh Token (ถาวร) |
| `GOOGLE_CALENDAR_ID` | `c_86ea...@group.calendar.google.com` | ID ปฏิทินปลายทาง |
| `PASSKEY` | `nbu2026` | รหัสผ่านเข้าใช้งานระบบ |

### วิธีขอ Google Refresh Token

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Calendar API**
3. สร้าง OAuth2 Credentials (Web Application)
4. เพิ่ม Authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
   - `https://your-domain.vercel.app/api/auth/callback`
5. ไปที่ [OAuth Playground](https://developers.google.com/oauthplayground)
6. Settings → Use your own OAuth credentials → ใส่ Client ID/Secret
7. Scope: `https://www.googleapis.com/auth/calendar`
8. Authorize → Exchange for tokens → Copy **Refresh Token**

---

## การติดตั้งและรันในเครื่อง

```bash
# 1. Clone repository
git clone https://github.com/Akkadate/oit-calendar-assistant.git
cd oit-calendar-assistant

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env.local และใส่ค่าทั้งหมด
cp .env.example .env.local  # หรือสร้างเอง

# 4. รัน development server
npm run dev
```

เปิดที่ `http://localhost:3000`

---

## API Reference

### POST `/api/auth/login`

ตรวจสอบ passkey และตั้ง session cookie

**Request Body:**
```json
{ "passkey": "nbu2026" }
```

**Response (200):**
```json
{ "ok": true }
```
+ Set-Cookie: `oit_auth` (httpOnly, 7 วัน)

---

### POST `/api/extract`

รับภาพเอกสาร → ส่ง OpenAI → คืน EventData

**Request:** `multipart/form-data`
- field `image`: ไฟล์ภาพ (JPEG/PNG/WEBP/GIF, max 20MB)

**Response (200):**
```json
{
  "title": "ชื่อโครงการ",
  "startDateTime": "2025-03-15T09:00:00",
  "endDateTime": "2025-03-15T11:00:00",
  "location": "ห้องประชุม 101",
  "description": "สรุปรายละเอียด..."
}
```

---

### POST `/api/calendar`

บันทึก event ลง Google Calendar

**Request Body:** `EventData` (JSON)
```json
{
  "title": "ชื่อโครงการ",
  "startDateTime": "2025-03-15T09:00:00",
  "endDateTime": "2025-03-15T11:00:00",
  "location": "ห้องประชุม 101",
  "description": "รายละเอียด..."
}
```

**Response (200):**
```json
{ "link": "https://calendar.google.com/calendar/event?eid=..." }
```

---

## การ Deploy บน Vercel

1. ไปที่ [vercel.com](https://vercel.com) → Import GitHub repo `Akkadate/oit-calendar-assistant`
2. ตั้งค่า **Environment Variables** ทุกตัวก่อน Deploy
3. Deploy (ไม่ใช้ cache ถ้าเพิ่ง env vars ใหม่)
4. ทุกครั้งที่ `git push main` → Vercel auto-deploy อัตโนมัติ

---

## ฟีเจอร์ที่มีใน Phase 1

- [x] อัพโหลดภาพด้วย Drag & Drop หรือ Click
- [x] อ่านเอกสารด้วย GPT-4.1-mini Vision
- [x] แปลงปี พ.ศ. → ค.ศ. อัตโนมัติ
- [x] แสดง warning เมื่อวันที่เป็นอดีต (ตรวจจับปีผิด)
- [x] Form แก้ไขข้อมูลก่อนบันทึก
- [x] บันทึกลง Google Calendar (ปฏิทิน OIT)
- [x] Passkey protection (เปลี่ยนได้ผ่าน env var)
- [x] Deploy บน Vercel + GitHub auto-deploy

---

## แนวทางพัฒนา Phase ต่อไป

### Phase 2 — Multi-user & History

- [ ] ระบบ Login รายบุคคล (NextAuth.js + Google OAuth)
- [ ] บันทึกประวัติการเพิ่มกิจกรรม (database เช่น Supabase หรือ PlanetScale)
- [ ] ดูรายการกิจกรรมที่เคยบันทึกไว้
- [ ] ลบ/แก้ไข event ที่บันทึกไปแล้ว

### Phase 3 — UX Improvements

- [ ] อัพโหลดหลายภาพพร้อมกัน (หลายหน้า)
- [ ] รองรับ PDF โดยตรง (แปลงหน้า PDF เป็นภาพก่อนส่ง AI)
- [ ] แสดง preview ปฏิทินก่อนบันทึก
- [ ] เลือกปฏิทินปลายทางได้ (dropdown หลายปฏิทิน)

### Phase 4 — Automation

- [ ] Line Bot integration (ส่งรูปผ่าน Line → บันทึกปฏิทินอัตโนมัติ)
- [ ] Email integration (forward email แนบเอกสาร → บันทึก)
- [ ] Reminder notification ก่อนกิจกรรม

### Phase 5 — Admin & Analytics

- [ ] Admin dashboard สรุปการใช้งาน
- [ ] จัดการ passkey / user หลายคน
- [ ] Export รายงานกิจกรรมประจำเดือน

---

## หมายเหตุด้านความปลอดภัย

- `.env.local` ถูก gitignore ไว้ ไม่ถูก push ขึ้น GitHub
- API Keys และ Refresh Token เก็บเฉพาะใน Environment Variables
- Passkey เก็บเป็น httpOnly cookie ป้องกัน XSS
- แนะนำ rotate OpenAI API Key เป็นระยะ
- Refresh Token Google ไม่หมดอายุ แต่ revoke ได้จาก Google Account Settings

---

*พัฒนาโดย สำนักเทคโนโลยีสารสนเทศ — Phase 1 (กุมภาพันธ์ 2569)*
