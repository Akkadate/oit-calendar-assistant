import { google } from 'googleapis'
import { Readable } from 'stream'

function getGoogleDriveClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  return google.drive({ version: 'v3', auth })
}

/**
 * Generate a filename based on current Bangkok time
 * Format: LINE_20260224_163000.jpg
 */
function generateFilename(mimeType: string): string {
  const now = new Date()
  const bangkokTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  )

  const pad = (n: number) => n.toString().padStart(2, '0')
  const y = bangkokTime.getFullYear()
  const m = pad(bangkokTime.getMonth() + 1)
  const d = pad(bangkokTime.getDate())
  const hh = pad(bangkokTime.getHours())
  const mm = pad(bangkokTime.getMinutes())
  const ss = pad(bangkokTime.getSeconds())

  const ext = mimeType.includes('png') ? 'png' : 'jpg'
  return `LINE_${y}${m}${d}_${hh}${mm}${ss}.${ext}`
}

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
}

/**
 * Upload an image buffer to Google Drive
 * Returns file ID and shareable view link
 */
export async function uploadImageToDrive(
  buffer: Buffer,
  mimeType: string,
  customFilename?: string
): Promise<DriveUploadResult> {
  const drive = getGoogleDriveClient()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  const filename = customFilename ?? generateFilename(mimeType)

  const fileMetadata: { name: string; parents?: string[] } = {
    name: filename,
  }
  if (folderId) {
    fileMetadata.parents = [folderId]
  }

  const media = {
    mimeType,
    body: Readable.from(buffer),
  }

  const result = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink',
  })

  return {
    fileId: result.data.id ?? '',
    webViewLink: result.data.webViewLink ?? '',
  }
}
