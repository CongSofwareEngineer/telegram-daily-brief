// ===== Vang va dau: vang lay theo token XAUT (prices.ts), dau tu Yahoo, du phong FRED =====

import { fetchJson, fmtUsd, fmtPct, esc, errMsg, code, period } from './util.ts'
import { GOLD_SYM } from './prices.ts'
import { fredSeries, pctChange } from './fred.ts'
import type { CoinRow, OilRow } from './types.ts'

interface OilConfig {
  label: string
  /** Ma hop dong tuong lai tren Yahoo Finance */
  yahoo: string
  /** Series gia giao ngay tren FRED, cham hon Yahoo vai ngay nen chi de du phong */
  fred: string
}

const OILS: readonly OilConfig[] = [
  { label: 'Dầu WTI', yahoo: 'CL=F', fred: 'DCOILWTICO' },
  { label: 'Dầu Brent', yahoo: 'BZ=F', fred: 'DCOILBRENTEU' },
]

const WEEK_SECONDS = 7 * 86_400

/** Hinh dang phan hoi cua Yahoo /v8/finance/chart (chi khai bao field minh dung) */
export interface YahooChart {
  chart?: {
    result?: {
      timestamp?: number[]
      indicators?: { quote?: { close?: (number | null)[] }[] }
    }[] | null
  }
}

const pct = (now: number, then: number): number => ((now - then) / then) * 100

/** Doc gia dong cua theo ngay. Yahoo de null o phien thieu du lieu nen phai loc */
export function parseYahooChart(data: YahooChart, label: string): OilRow | null {
  const result = data.chart?.result?.[0]
  const closes = result?.indicators?.quote?.[0]?.close ?? []
  const points = (result?.timestamp ?? []).flatMap((t, i) => {
    const close = closes[i]
    return close === null || close === undefined ? [] : [{ t, close }]
  })

  const last = points.at(-1)
  if (!last) return null
  const prev = points.at(-2)
  // Phien gan nhat cach day it nhat 7 ngay: tinh theo ngay vi cuoi tuan khong co phien
  const weekAgo = points.findLast((p) => p.t <= last.t - WEEK_SECONDS)

  return {
    label,
    price: last.close,
    chSession: prev ? pct(last.close, prev.close) : null,
    ch7d: weekAgo ? pct(last.close, weekAgo.close) : null,
    asOf: null,
  }
}

async function fromYahoo({ label, yahoo }: OilConfig): Promise<OilRow | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=1mo&interval=1d`
  return parseYahooChart(await fetchJson<YahooChart>(url), label)
}

async function fromFred({ label, fred }: OilConfig): Promise<OilRow | null> {
  const [now, prev] = (await fredSeries(fred, 2)) ?? []
  if (!now) return null
  return {
    label,
    price: Number(now.value),
    chSession: prev ? pctChange(now, prev) : null,
    ch7d: null,
    asOf: now.date,
  }
}

async function getOne(oil: OilConfig): Promise<OilRow | null> {
  try {
    const row = await fromYahoo(oil)
    if (row) return row
    console.warn(`[oil] Yahoo khong co du lieu ${oil.yahoo}, chuyen sang FRED`)
  } catch (err) {
    console.warn(`[oil] Yahoo ${oil.yahoo} loi, chuyen sang FRED:`, errMsg(err))
  }
  try {
    return await fromFred(oil)
  } catch (err) {
    console.warn(`[oil] FRED ${oil.fred} loi:`, errMsg(err))
    return null
  }
}

export async function getOil(): Promise<OilRow[]> {
  const rows = await Promise.all(OILS.map(getOne))
  return rows.filter((r): r is OilRow => r !== null)
}

function renderGold(r: CoinRow): string {
  const parts = [
    `<b>Vàng (${esc(r.sym)})</b>  ${code(`${fmtUsd(r.price)}/oz`)}`,
    `24 giờ ${fmtPct(r.ch24)}`,
  ]
  if (r.ch7d !== null) parts.push(`7 ngày ${fmtPct(r.ch7d)}`)
  return '• ' + parts.join('  |  ')
}

function renderOil(r: OilRow): string {
  // Gia du phong tu FRED cu hon vai ngay nen phai ghi ro ngay cua so lieu
  const asOf = r.asOf ? ` ${period(`${r.asOf.slice(8, 10)}/${r.asOf.slice(5, 7)}`)}` : ''
  const parts = [`<b>${esc(r.label)}</b>${asOf}  ${code(`$${r.price.toFixed(2)}/thùng`)}`]
  if (r.chSession !== null) parts.push(`1 phiên ${fmtPct(r.chSession)}`)
  if (r.ch7d !== null) parts.push(`7 ngày ${fmtPct(r.ch7d)}`)
  return '• ' + parts.join('  |  ')
}

export function renderCommodities(prices: CoinRow[], oil: OilRow[]): string {
  const gold = prices.find((r) => r.sym === GOLD_SYM && r.price !== null)
  const lines = [...(gold ? [renderGold(gold)] : []), ...oil.map(renderOil)]
  if (lines.length === 0) lines.push('<i>Không lấy được giá vàng và dầu lần này.</i>')
  return ['🛢 <b>VÀNG &amp; DẦU</b>', ...lines].join('\n')
}
