import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { passkey } = await req.json()

  if (!passkey || passkey !== process.env.PASSKEY) {
    return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('oit_auth', process.env.PASSKEY!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 วัน
    path: '/',
  })

  return res
}
