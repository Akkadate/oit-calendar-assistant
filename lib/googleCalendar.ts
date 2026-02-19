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

async function createSingleEvent(
  title: string,
  startDateTime: string,
  endDateTime: string,
  location: string,
  description: string
): Promise<string> {
  const calendar = getGoogleCalendarClient()

  const event = {
    summary: title,
    location,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: endDateTime,
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

export async function createCalendarEvents(data: EventData): Promise<string[]> {
  const links: string[] = []
  for (const dateRange of data.dates) {
    const link = await createSingleEvent(
      data.title,
      dateRange.startDateTime,
      dateRange.endDateTime,
      data.location,
      data.description
    )
    links.push(link)
  }
  return links
}
