// ===== Client FRED dung chung cho macro.ts va economy.ts =====

import { fetchJson } from './util.ts'

const FRED_URL = 'https://api.stlouisfed.org/fred/series/observations'

export interface FredObservation {
  date: string
  /** Gia tri, hoac "." khi thieu du lieu */
  value: string
}

interface FredResponse {
  observations?: FredObservation[]
}

/**
 * Lay mot series tu FRED, moi nhat truoc.
 * Tra ve null neu chua cau hinh FRED_API_KEY.
 *
 * Cac ky thieu du lieu bi loc bo, nen vi tri trong mang KHONG tuong ung so thang:
 * khong duoc coi obs[12] la "cung ky nam truoc" — dung findYearAgo / monthsApart.
 */
export async function fredSeries(seriesId: string, limit = 14): Promise<FredObservation[] | null> {
  const key = process.env.FRED_API_KEY
  if (!key) return null

  const url =
    `${FRED_URL}?series_id=${seriesId}&api_key=${key}` +
    `&file_type=json&sort_order=desc&limit=${limit}`

  const data = await fetchJson<FredResponse>(url)
  // FRED danh dau du lieu thieu bang dau "."
  return (data.observations ?? []).filter((o) => o.value !== '.')
}

/** % thay doi giua hai quan sat FRED */
export function pctChange(newer: FredObservation, older: FredObservation): number {
  return (Number(newer.value) / Number(older.value) - 1) * 100
}

/** Quan sat cung thang cua nam truoc; undefined neu ky do thieu du lieu */
export function findYearAgo(
  obs: FredObservation[],
  from: FredObservation,
): FredObservation | undefined {
  const target = `${Number(from.date.slice(0, 4)) - 1}${from.date.slice(4)}`
  return obs.find((o) => o.date === target)
}

/** So thang giua hai ngay dang "YYYY-MM-DD" */
export function monthsApart(newer: string, older: string): number {
  const toMonths = (d: string): number =>
    Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7))
  return toMonths(newer) - toMonths(older)
}
