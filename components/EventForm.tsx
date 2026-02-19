'use client'

import { EventData } from '@/lib/openai'

interface EventFormProps {
  data: EventData
  onChange: (data: EventData) => void
  disabled?: boolean
}

function formatDateTimeLocal(isoString: string): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  } catch {
    return isoString
  }
}

function parseLocalToISO(localString: string): string {
  if (!localString) return ''
  // Convert datetime-local format to ISO 8601 without timezone offset
  return localString.length === 16 ? `${localString}:00` : localString
}

function isPastDate(isoString: string): boolean {
  if (!isoString) return false
  try {
    const date = new Date(isoString)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return date < sevenDaysAgo
  } catch {
    return false
  }
}

function getDisplayYear(isoString: string): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const ce = date.getFullYear()
    const be = ce + 543
    return `ค.ศ. ${ce} (พ.ศ. ${be})`
  } catch {
    return ''
  }
}

export default function EventForm({ data, onChange, disabled }: EventFormProps) {
  const handleChange = (field: keyof EventData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const inputClass = `
    w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500
    transition-colors
  `

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  const startIsPast = isPastDate(data.startDateTime)

  return (
    <div className="space-y-4">
      {/* Past date warning */}
      {startIsPast && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-700">วันที่อยู่ในอดีต — กรุณาตรวจสอบปี</p>
            <p className="text-xs text-amber-600 mt-0.5">
              ระบบอ่านได้: <strong>{getDisplayYear(data.startDateTime)}</strong>
              {' '}— เอกสารราชการไทยใช้ปี พ.ศ. ซึ่งต้องลบ 543 เพื่อได้ ค.ศ.
              ถ้าปีไม่ถูกต้องให้แก้ไขในช่องด้านล่าง
            </p>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>
          ชื่อโครงการ / หัวข้อการประชุม
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          value={data.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="ระบุชื่อโครงการหรือหัวข้อการประชุม"
          disabled={disabled}
        />
      </div>

      {/* Date Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            วันที่และเวลาเริ่มต้น
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="datetime-local"
            className={inputClass}
            value={formatDateTimeLocal(data.startDateTime)}
            onChange={(e) => handleChange('startDateTime', parseLocalToISO(e.target.value))}
            disabled={disabled}
          />
        </div>
        <div>
          <label className={labelClass}>
            วันที่และเวลาสิ้นสุด
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="datetime-local"
            className={inputClass}
            value={formatDateTimeLocal(data.endDateTime)}
            onChange={(e) => handleChange('endDateTime', parseLocalToISO(e.target.value))}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className={labelClass}>สถานที่จัดงาน</label>
        <input
          type="text"
          className={inputClass}
          value={data.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="ระบุสถานที่จัดงาน"
          disabled={disabled}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>
          รายละเอียด / สิ่งที่ต้องเตรียม / หมายเหตุ
        </label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={5}
          value={data.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="สรุปสิ่งที่ต้องเตรียม, เบอร์โทรผู้ประสานงาน, หมายเหตุสำคัญ"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
