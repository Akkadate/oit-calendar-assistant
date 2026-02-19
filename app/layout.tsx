import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OIT Calendar Assistance',
  description: 'อ่านเอกสารราชการและบันทึกลง Google Calendar อัตโนมัติ',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
