// ===== Lich hop FOMC: doc tu trang lich chinh thuc cua Federal Reserve =====

import { fetchText, esc, errMsg, code, period } from './util.ts'
import type { FomcCalendar, FomcMeeting } from './types.ts'

const CALENDAR_URL = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** So cuoc hop sap toi hien trong ban tin */
const UPCOMING_LIMIT = 3
/** Fed cong bo bien ban 3 tuan sau ngay ra quyet dinh */
const MINUTES_LAG_DAYS = 21
/** Quyet dinh lai suat va bien ban deu cong bo luc 14:00 gio New York */
const RELEASE_HOUR_ET = 14

const DAY_MS = 86_400_000
const VN_OFFSET_MS = 7 * 3_600_000

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.trim().slice(0, 3).toLowerCase())
}

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
}

/**
 * Doc cac cuoc hop theo lich tu HTML. Trang liet ke cac nam khong theo thu tu nen phai sap xep.
 * Bo qua dong khong co dang "27-28" (vi du cuoc hop bat thuong da dien ra).
 */
export function parseFomcCalendar(html: string): FomcMeeting[] {
  const meetings: FomcMeeting[] = []

  for (const panel of html.split(/(?=<a id="\d+">\d{4} FOMC Meetings)/)) {
    const year = Number(/^<a id="\d+">(\d{4}) FOMC Meetings/.exec(panel)?.[1])
    if (!year) continue

    const rows = panel.matchAll(
      /fomc-meeting__month[^>]*>\s*<strong>([^<]+)<\/strong>[\s\S]*?fomc-meeting__date[^>]*>([^<]+)</g,
    )

    for (const [, monthText = '', dateText = ''] of rows) {
      const days = /^\s*(\d{1,2})-(\d{1,2})(\*?)/.exec(dateText)
      // Cuoc hop vat qua hai thang duoc ghi "Oct/Nov"
      const [startName = '', endName = startName] = monthText.split('/')
      const startMonth = monthIndex(startName)
      const endMonth = monthIndex(endName)
      if (!days || startMonth < 0 || endMonth < 0) continue

      meetings.push({
        start: isoDate(year, startMonth, Number(days[1])),
        end: isoDate(year, endMonth, Number(days[2])),
        hasProjections: days[3] === '*',
      })
    }
  }

  return meetings.sort((a, b) => a.end.localeCompare(b.end))
}

/** 14:00 gio New York cua mot ngay, cong them n ngay; tu tinh gio mua he (EDT/EST) */
function releaseTs(date: string, addDays = 0): number {
  const noonUtc = Date.parse(`${date}T12:00:00Z`) + addDays * DAY_MS
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(noonUtc)
    .find((p) => p.type === 'timeZoneName')?.value
  const offsetHours = Number(/GMT([+-]\d+)/.exec(offset ?? '')?.[1] ?? -5)

  const startOfDay = Math.floor(noonUtc / DAY_MS) * DAY_MS
  return startOfDay + (RELEASE_HOUR_ET - offsetHours) * 3_600_000
}

/** Chon cac cuoc hop chua ra quyet dinh va bien ban dang cho cong bo */
export function selectFomc(meetings: FomcMeeting[], now: number): FomcCalendar {
  const upcoming = meetings
    .filter((m) => releaseTs(m.end) > now)
    .slice(0, UPCOMING_LIMIT)
    .map((m) => ({ ...m, decisionTs: releaseTs(m.end) }))

  const lastHeld = meetings.filter((m) => releaseTs(m.end) <= now).at(-1)
  const minutesTs = lastHeld ? releaseTs(lastHeld.end, MINUTES_LAG_DAYS) : 0

  return {
    upcoming,
    pendingMinutes:
      lastHeld && minutesTs > now ? { meeting: lastHeld, releaseTs: minutesTs } : null,
  }
}

export async function getFomc(): Promise<FomcCalendar | null> {
  try {
    const meetings = parseFomcCalendar(await fetchText(CALENDAR_URL))
    if (meetings.length === 0) {
      console.warn('[fomc] Khong doc duoc cuoc hop nao, co the trang da doi cau truc')
      return null
    }
    return selectFomc(meetings, Date.now())
  } catch (err) {
    console.warn('[fomc] Lich hop loi:', errMsg(err))
    return null
  }
}

/** "08-09/12/2026", hoac "31/10-01/11/2026" neu vat qua hai thang */
function fmtMeetingDates({ start, end }: FomcMeeting): string {
  const [, startMonth = '', startDay = ''] = start.split('-')
  const [endYear = '', endMonth = '', endDay = ''] = end.split('-')
  const from = startMonth === endMonth ? startDay : `${startDay}/${startMonth}`
  return `${from}-${endDay}/${endMonth}/${endYear}`
}

/** "02:00 10/12" theo gio Viet Nam */
function fmtVnTime(ts: number): string {
  const iso = new Date(ts + VN_OFFSET_MS).toISOString()
  return `${iso.slice(11, 16)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

/** So ngay theo lich Viet Nam, de "ngay mai" khong bi tinh thanh 0 ngay */
function daysLeft(ts: number, now: number): number {
  const vnDay = (t: number): number => Math.floor((t + VN_OFFSET_MS) / DAY_MS)
  return vnDay(ts) - vnDay(now)
}

function fmtDaysLeft(days: number): string {
  if (days <= 0) return 'hôm nay'
  if (days === 1) return 'ngày mai'
  return `còn ${days} ngày`
}

export function renderFomc(fomc: FomcCalendar | null, now = Date.now()): string {
  if (!fomc) return '<i>Không lấy được lịch họp FOMC lần này.</i>'

  const lines = [
    `🗓 <b><a href="${esc(CALENDAR_URL)}">Lịch họp FOMC sắp tới</a></b>  ${period('giờ Việt Nam')}`,
  ]

  if (fomc.upcoming.length === 0) lines.push('• Fed chưa công bố lịch họp tiếp theo.')

  for (const meeting of fomc.upcoming) {
    const sep = meeting.hasProjections ? ' 📊 có dự báo kinh tế' : ''
    lines.push(
      `• ${code(fmtMeetingDates(meeting))}${sep}\n` +
        `   Quyết định: ${code(fmtVnTime(meeting.decisionTs))} (${fmtDaysLeft(daysLeft(meeting.decisionTs, now))})`,
    )
  }

  if (fomc.pendingMinutes) {
    const { meeting, releaseTs: ts } = fomc.pendingMinutes
    lines.push(
      `• Biên bản họp ${period(fmtMeetingDates(meeting))}: dự kiến ${code(fmtVnTime(ts))} (${fmtDaysLeft(daysLeft(ts, now))})`,
    )
  }

  return lines.join('\n')
}
