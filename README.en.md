# OIT Calendar Assistance

An AI-powered web application that reads Thai government documents and automatically creates Google Calendar events.
Developed for the **Office of Information Technology (OIT)**.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [System Workflow](#system-workflow)
5. [Environment Variables](#environment-variables)
6. [Local Development Setup](#local-development-setup)
7. [API Reference](#api-reference)
8. [Deploying to Vercel](#deploying-to-vercel)
9. [Phase 1 Features](#phase-1-features)
10. [Future Roadmap](#future-roadmap)

---

## System Overview

```
User uploads document image
         ↓
  GPT-4.1-mini (Vision API)
  extracts event data
         ↓
  Editable form displayed
         ↓
  Save to Google Calendar
  (OIT Calendar target)
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| AI/Vision | OpenAI API | gpt-4.1-mini |
| Calendar | Google Calendar API | v3 |
| Auth | OAuth2 Refresh Token | - |
| Deployment | Vercel | - |
| Repository | GitHub | Akkadate/oit-calendar-assistant |

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                    # Main page: upload + form + save
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles (Tailwind)
│   ├── login/
│   │   └── page.tsx               # Passkey entry page
│   └── api/
│       ├── extract/
│       │   └── route.ts           # POST: receives image → OpenAI → returns JSON
│       ├── calendar/
│       │   └── route.ts           # POST: receives event data → saves to Google Calendar
│       └── auth/
│           └── login/
│               └── route.ts       # POST: verifies passkey → sets cookie
├── components/
│   ├── UploadZone.tsx             # Drag & drop / click upload with preview
│   └── EventForm.tsx              # Editable event form + past-date warning
├── lib/
│   ├── openai.ts                  # OpenAI client + EXTRACT_PROMPT + EventData type
│   └── googleCalendar.ts          # Google Calendar client + createCalendarEvent()
├── middleware.ts                   # Route guard: checks auth cookie
├── .env.local                      # Environment variables (not pushed to GitHub)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## System Workflow

### Main Flow

```
1. User visits URL → middleware checks oit_auth cookie
2. No cookie → redirect to /login
3. Enter passkey → POST /api/auth/login → set httpOnly cookie (7 days)
4. Redirect back to /
5. Upload document image (JPEG/PNG/WEBP/GIF, max 20MB)
6. Click "Read Document" → POST /api/extract → OpenAI Vision → JSON
7. Event data shown in editable EventForm
8. If date is in the past → yellow warning banner displayed
9. Click "Save to Calendar" → POST /api/calendar → Google Calendar API
10. Success message with link to created event
```

### Thai Buddhist Era (BE) to Common Era (CE) Conversion

Thai government documents use Buddhist Era (BE) years, which are 543 years ahead of CE.
The prompt explicitly instructs GPT to:
- Always subtract 543 from BE years (e.g., BE 2568 → CE 2025)
- Handle abbreviated years (e.g., "68" → BE 2568 → CE 2025)
- Never use the raw year number without conversion

If a wrong year is detected, the form displays a warning showing the extracted year so users can correct it manually.

---

## Environment Variables

Set in `.env.local` for local development, or in Vercel **Environment Variables** for production.

| Variable | Example | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI API Key |
| `GOOGLE_CLIENT_ID` | `225993...apps.googleusercontent.com` | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google OAuth2 Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://your-domain.vercel.app/api/auth/callback` | OAuth Redirect URI |
| `GOOGLE_REFRESH_TOKEN` | `1//04k...` | Google OAuth2 Refresh Token (long-lived) |
| `GOOGLE_CALENDAR_ID` | `c_86ea...@group.calendar.google.com` | Target calendar ID |
| `PASSKEY` | `nbu2026` | Application access passkey |

### How to Get a Google Refresh Token

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Calendar API**
3. Create OAuth2 Credentials (Web Application type)
4. Add Authorized Redirect URIs:
   - `https://developers.google.com/oauthplayground`
   - `https://your-domain.vercel.app/api/auth/callback`
5. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
6. Click Settings (⚙️) → check **Use your own OAuth credentials** → enter Client ID & Secret
7. In Step 1, enter scope: `https://www.googleapis.com/auth/calendar`
8. Click **Authorize APIs** → sign in with Google
9. In Step 2, click **Exchange authorization code for tokens**
10. Copy the **Refresh Token**

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/Akkadate/oit-calendar-assistant.git
cd oit-calendar-assistant

# 2. Install dependencies
npm install

# 3. Create .env.local and fill in all values
# (copy the variables listed in the Environment Variables section above)

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

### POST `/api/auth/login`

Verifies the passkey and sets a session cookie.

**Request Body:**
```json
{ "passkey": "nbu2026" }
```

**Response (200):**
```json
{ "ok": true }
```
Sets cookie: `oit_auth` (httpOnly, 7-day expiry)

**Response (401):**
```json
{ "error": "รหัสผ่านไม่ถูกต้อง" }
```

---

### POST `/api/extract`

Accepts a document image and returns extracted event data via OpenAI Vision.

**Request:** `multipart/form-data`
- field `image`: image file (JPEG/PNG/WEBP/GIF, max 20MB)

**Response (200):**
```json
{
  "title": "Project or meeting title",
  "startDateTime": "2025-03-15T09:00:00",
  "endDateTime": "2025-03-15T11:00:00",
  "location": "Meeting Room 101",
  "description": "Summary of requirements, contact info, notes..."
}
```

---

### POST `/api/calendar`

Creates a Google Calendar event from the provided event data.

**Request Body:** `EventData` (JSON)
```json
{
  "title": "Project or meeting title",
  "startDateTime": "2025-03-15T09:00:00",
  "endDateTime": "2025-03-15T11:00:00",
  "location": "Meeting Room 101",
  "description": "Details..."
}
```

**Response (200):**
```json
{ "link": "https://calendar.google.com/calendar/event?eid=..." }
```

---

## Deploying to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import `Akkadate/oit-calendar-assistant`
2. Set all **Environment Variables** before deploying
3. Click **Deploy** (skip build cache when adding new env vars)
4. Every `git push main` triggers an automatic redeploy

---

## Phase 1 Features

- [x] Drag & drop or click-to-upload document image
- [x] AI document reading with GPT-4.1-mini Vision
- [x] Automatic Thai Buddhist Era (BE) to Common Era (CE) year conversion
- [x] Past-date warning to catch year conversion errors
- [x] Editable form before saving to calendar
- [x] Save directly to a specific Google Calendar (OIT calendar)
- [x] Passkey-based access protection (configurable via env var)
- [x] Deployed on Vercel with GitHub auto-deploy

---

## Future Roadmap

### Phase 2 — Multi-user & History

- [ ] Per-user login with NextAuth.js + Google OAuth
- [ ] Event history log (database: Supabase or PlanetScale)
- [ ] View previously created events
- [ ] Edit or delete saved events from the app

### Phase 3 — UX Improvements

- [ ] Multi-image upload (multi-page documents)
- [ ] Native PDF support (auto-convert pages to images before sending to AI)
- [ ] Calendar preview before saving
- [ ] Calendar selector (choose from multiple calendars)

### Phase 4 — Automation

- [ ] Line Bot integration (send image via Line → auto-save to calendar)
- [ ] Email integration (forward email with attachment → auto-save)
- [ ] Event reminder notifications

### Phase 5 — Admin & Analytics

- [ ] Admin dashboard with usage statistics
- [ ] Multi-user and passkey management
- [ ] Monthly event report export

---

## Security Notes

- `.env.local` is gitignored and never pushed to GitHub
- API keys and Refresh Token are stored only in environment variables
- Passkey is stored as an httpOnly cookie (XSS-protected)
- Rotate OpenAI API Key periodically via [platform.openai.com](https://platform.openai.com/api-keys)
- Google Refresh Token does not expire but can be revoked from Google Account settings

---

*Developed by Office of Information Technology — Phase 1 (February 2026)*
