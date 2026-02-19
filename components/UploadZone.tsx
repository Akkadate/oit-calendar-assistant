'use client'

import { useCallback, useState } from 'react'

interface UploadZoneProps {
  onFileSelect: (file: File, preview: string) => void
  preview: string
  disabled?: boolean
}

export default function UploadZone({ onFileSelect, preview, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        onFileSelect(file, e.target?.result as string)
      }
      reader.readAsDataURL(file)
    },
    [onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="w-full">
      <label
        className={`
          relative flex flex-col items-center justify-center w-full min-h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
      >
        {preview ? (
          <div className="relative w-full p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="ตัวอย่างเอกสาร"
              className="max-h-80 mx-auto rounded-lg object-contain shadow-md"
            />
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 rounded-xl transition-all duration-200">
                <span className="text-white opacity-0 hover:opacity-100 text-sm font-medium">
                  คลิกเพื่อเปลี่ยนภาพ
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <svg
              className="w-12 h-12 mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-600 mb-1">
              ลากและวางภาพเอกสารที่นี่
            </p>
            <p className="text-sm text-gray-400 mb-4">หรือคลิกเพื่อเลือกไฟล์</p>
            <p className="text-xs text-gray-400">
              รองรับ JPEG, PNG, WEBP, GIF (สูงสุด 20MB)
            </p>
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </label>
    </div>
  )
}
