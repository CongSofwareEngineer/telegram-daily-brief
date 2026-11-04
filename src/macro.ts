// ===== CPI va FED: so lieu tu FRED, tin tu RSS cua Federal Reserve =====

import { fetchText, esc, daysAgo, errMsg, code, period } from './util.ts'
import { fredSeries, pctChange, findYearAgo } from './fred.ts'
import { renderFomc } from './fomc.ts'
import { parseRss } from './rss.ts'
import type { CpiData, FedRate, RssItem, MacroView } from './types.ts'

/**
 * CPI: dung chuoi NSA (chua dieu chinh mua vu) de tinh YoY — dung chuan BLS hay cong bo,
 * va chuoi SA (da dieu chinh) de tinh MoM.
 */
export async function getCpi(): Promise<CpiData | null> {
  try {
    const [nsa, sa, core] = await Promise.all([
      fredSeries('CPIAUCNS', 14), // CPI all items, not seasonally adjusted
      fredSeries('CPIAUCSL', 3), // CPI all items, seasonally adjusted
      fredSeries('CPILFESL', 14), // Core CPI (bo thuc pham + nang luong)
    ])

    // So voi cung ky nam truoc theo NGAY, khong theo vi tri: FRED co the thieu ky
    // (vi du 2025-10), khi do index 12 se la 13 thang truoc va YoY bi sai.
    const latest = nsa?.[0]
    const yearAgo = nsa && latest && findYearAgo(nsa, latest)
    if (!latest || !yearAgo) return null

    const saNow = sa?.[0]
    const saPrev = sa?.[1]
    const coreNow = core?.[0]
    const corePrev = core && coreNow && findYearAgo(core, coreNow)

    return {
      period: latest.date,
      yoy: pctChange(latest, yearAgo),
      mom: saNow && saPrev ? pctChange(saNow, saPrev) : null,
      coreYoy: coreNow && corePrev ? pctChange(coreNow, corePrev) : null,
    }
  } catch (err) {
    console.warn('[macro] CPI loi:', errMsg(err))
    return null
  }
}

/** Fed funds effective rate — chuoi DFF, cap nhat hang ngay */
export async function getFedRate(): Promise<FedRate | null> {
  try {
    const [obs, low, high] = await Promise.all([
      fredSeries('DFF', 40),
      // Thieu bien do muc tieu van hien duoc lai suat hieu dung
      fredSeries('DFEDTARL', 1).catch(() => null),
      fredSeries('DFEDTARU', 1).catch(() => null),
    ])
    const now = obs?.[0]
    if (!now) return null

    const monthAgo = obs.find((o) => Date.parse(o.date) <= daysAgo(30))
    const targetLow = low?.[0]
    const targetHigh = high?.[0]

    return {
      rate: Number(now.value),
      date: now.date,
      prev: monthAgo ? Number(monthAgo.value) : null,
      target:
        targetLow && targetHigh
          ? { low: Number(targetLow.value), high: Number(targetHigh.value) }
          : null,
    }
  } catch (err) {
    console.warn('[macro] Fed rate loi:', errMsg(err))
    return null
  }
}

/** Thong cao bao chi cua Fed trong 3 ngay qua, bo nhung cai da gui */
export async function getFedNews(sentLinks: string[]): Promise<RssItem[]> {
  try {
    const xml = await fetchText('https://www.federalreserve.gov/feeds/press_all.xml')
    const already = new Set(sentLinks)
    const cutoff = daysAgo(3)

    return parseRss(xml)
      .filter((it) => it.ts >= cutoff)
      .filter((it) => !already.has(it.link))
      .slice(0, 5)
  } catch (err) {
    console.warn('[macro] Fed RSS loi:', errMsg(err))
    return []
  }
}

/** "2026-09-01" -> "thang 09/2026" */
function fmtPeriod(value: string): string {
  const [year, month] = value.split('-')
  return year && month ? `tháng ${month}/${year}` : value
}

function renderCpi(cpi: CpiData, isNew: boolean): string {
  const mom =
    cpi.mom === null
      ? ''
      : `  |  ${code(`${cpi.mom >= 0 ? '+' : ''}${cpi.mom.toFixed(2)}%`)} so với tháng trước`
  const lines = [
    `📈 <b>Lạm phát CPI</b>  ${period(fmtPeriod(cpi.period))}${isNew ? ' 🆕' : ''}`,
    `• Tổng thể: ${code(`${cpi.yoy.toFixed(2)}%`)} so với cùng kỳ${mom}`,
  ]
  if (cpi.coreYoy !== null) {
    lines.push(`• Lõi (bỏ thực phẩm, năng lượng): ${code(`${cpi.coreYoy.toFixed(2)}%`)} so với cùng kỳ`)
  }
  return lines.join('\n')
}

function renderFedRate(fedRate: FedRate): string {
  let line = `• Hiệu dụng: ${code(`${fedRate.rate.toFixed(2)}%`)}`
  if (fedRate.prev !== null) {
    const delta = fedRate.rate - fedRate.prev
    // Nguong 0.005 de khong hien "-0.00" khi chenh lech chi la sai so lam tron
    if (Math.abs(delta) < 0.005) line += '  |  ➖ không đổi so với 30 ngày trước'
    else if (delta > 0) line += `  |  🔺 ${code(`+${delta.toFixed(2)}`)} điểm % so với 30 ngày trước`
    else line += `  |  🔻 ${code(delta.toFixed(2))} điểm % so với 30 ngày trước`
  }
  const target = fedRate.target
    ? `\n• Mục tiêu: ${code(`${fedRate.target.low.toFixed(2)}–${fedRate.target.high.toFixed(2)}%`)}`
    : ''
  return `💵 <b>Lãi suất Fed</b>\n${line}${target}`
}

function renderFedNews(fedNews: RssItem[]): string {
  if (fedNews.length === 0) return '<i>Không có thông cáo Fed mới trong 3 ngày qua.</i>'
  const items = fedNews.map((n) => `• <a href="${esc(n.link)}">${esc(n.title)}</a>`)
  return ['📰 <b>Thông cáo Fed mới</b>', ...items].join('\n')
}

export function renderMacro({ cpi, fedRate, fedNews, fomc, cpiIsNew }: MacroView): string {
  const blocks = ['🏛 <b>LẠM PHÁT &amp; FED</b>']

  if (!process.env.FRED_API_KEY) {
    blocks.push('<i>Chưa có FRED_API_KEY nên bỏ qua CPI và lãi suất.</i>')
  } else {
    blocks.push(cpi ? renderCpi(cpi, cpiIsNew) : '<i>Không lấy được số liệu CPI lần này.</i>')
    blocks.push(fedRate ? renderFedRate(fedRate) : '<i>Không lấy được lãi suất Fed lần này.</i>')
  }

  blocks.push(renderFomc(fomc))
  blocks.push(renderFedNews(fedNews))

  return blocks.join('\n\n')
}
