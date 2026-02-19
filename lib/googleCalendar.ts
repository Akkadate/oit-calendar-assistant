import { google } from 'googleapis'
import { EventData } from './openai'

export function getGoogleCalendarClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  return google.calendar({ version: 'v3', auth })
}

export async function createCalendarEvent(data: EventData): Promise<string> {
  const calendar = getGoogleCalendarClient()

  const event = {
    summary: data.title,
    location: data.location,
    description: data.description,
    start: {
      dateTime: data.startDateTime,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: data.endDateTime,
      timeZone: 'Asia/Bangkok',
    },
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  const result = await calendar.events.insert({
    calendarId,
    requestBody: event,
  })

  return result.data.htmlLink ?? ''
}
