'use client'

import { useState } from 'react'
import UploadZone from '@/components/UploadZone'
import EventForm from '@/components/EventForm'
import { EventData } from '@/lib/openai'

const EMPTY_EVENT: EventData = {
  title: '',
  dates: [{ startDateTime: '', endDateTime: '' }],
  location: '',
  description: '',
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calendarLinks, setCalendarLinks] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleFileSelect = (selectedFile: File, previewUrl: string) => {
    setFile(selectedFile)
    setPreview(previewUrl)
    setEventData(null)
    setCalendarLinks([])
    setError('')
  }

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setCalendarLinks([])

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการอ่านเอกสาร')
      }

      setEventData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!eventData) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกปฏิทิน')
      }

      setCalendarLinks(json.links)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview('')
    setEventData(null)
    setCalendarLinks([])
    setError('')
  }

  const isFormValid =
    eventData &&
    eventData.title.trim() !== '' &&
    eventData.dates.length > 0 &&
    eventData.dates.every(d => d.startDateTime !== '' && d.endDateTime !== '')

  const isSaved = calendarLinks.length > 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            OIT Calendar Assistance
          </h1>
          <p className="text-gray-500">
            อัพโหลดภาพเอกสารราชการ แล้วบันทึกนัดหมายลง Google Calendar อัตโนมัติ
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Step 1: Upload */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white text-sm font-bold rounded-full">1</span>
              <h2 className="text-lg font-semibold text-gray-700">อัพโหลดเอกสาร</h2>
            </div>

            <UploadZone
              onFileSelect={handleFileSelect}
              preview={preview}
              disabled={loading || saving}
            />

            {file && !isSaved && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  ไฟล์: <span className="font-medium text-gray-700">{file.name}</span>
                  {' '}({(file.size / 1024).toFixed(1)} KB)
                </p>
                <button
                  onClick={handleExtract}
                  disabled={loading || saving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังอ่านเอกสาร...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      อ่านเอกสาร
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Edit Form */}
          {eventData && (
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white text-sm font-bold rounded-full">2</span>
                <h2 className="text-lg font-semibold text-gray-700">ตรวจสอบและแก้ไขข้อมูล</h2>
              </div>

              <EventForm
                data={eventData}
                onChange={setEventData}
                disabled={saving || isSaved}
              />

              {!isSaved && (
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
                  >
                    เริ่มใหม่
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isFormValid || saving}
                    className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        บันทึกลงปฏิทิน{eventData.dates.length > 1 ? ` (${eventData.dates.length} กิจกรรม)` : ''}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {isSaved && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-7 h-7 bg-green-600 text-white text-sm font-bold rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <h2 className="text-lg font-semibold text-green-700">
                  บันทึกสำเร็จ!{calendarLinks.length > 1 ? ` (${calendarLinks.length} กิจกรรม)` : ''}
                </h2>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 space-y-2">
                <p className="text-sm text-green-700 mb-3">
                  บันทึกนัดหมายลง Google Calendar เรียบร้อยแล้ว
                </p>
                {calendarLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {calendarLinks.length > 1 ? `เปิดกิจกรรมที่ ${index + 1} ใน Google Calendar` : 'เปิดใน Google Calendar'}
                  </a>
                ))}
              </div>

              <button
                onClick={handleReset}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                อัพโหลดเอกสารอื่น
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-6 pb-6">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          ข้อมูลจากเอกสารจะถูกส่งไปประมวลผลผ่าน OpenAI API เพื่ออ่านข้อมูล
        </p>
      </div>
    </main>
  )
}
