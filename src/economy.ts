// ===== Tinh hinh kinh te My: so lieu tu FRED =====

import { errMsg, code, period } from './util.ts'
import { fredSeries, pctChange, findYearAgo, monthsApart } from './fred.ts'
import type { FredObservation } from './fred.ts'
import type { EconomyData, Reading } from './types.ts'

/** Mot series loi thi chi mat dong do, cac chi so khac van hien */
async function safeSeries(seriesId: string, limit: number): Promise<FredObservation[]> {
  try {
    return (await fredSeries(seriesId, limit)) ?? []
  } catch (err) {
    console.warn(`[economy] ${seriesId} loi:`, errMsg(err))
    return []
  }
}

/** Gia tri moi nhat va ky lien truoc, nhan voi `scale` de doi don vi */
function latest(obs: FredObservation[], scale = 1): Reading | null {
  const [now, prev] = obs
  if (!now) return null
  return {
    date: now.date,
    value: Number(now.value) * scale,
    prev: prev ? Number(prev.value) * scale : null,
  }
}

/** % so voi cung ky nam truoc, doi chieu theo ngay vi series co the thieu ky */
function yoyAt(obs: FredObservation[], index: number): number | null {
  const now = obs[index]
  const yearAgo = now && findYearAgo(obs, now)
  return now && yearAgo ? pctChange(now, yearAgo) : null
}

function yoy(obs: FredObservation[]): Reading | null {
  const date = obs[0]?.date
  const value = yoyAt(obs, 0)
  return date && value !== null ? { date, value, prev: yoyAt(obs, 1) } : null
}

export async function getEconomy(): Promise<EconomyData> {
  const [gdp, corePce, payrolls, unemployment, retail, sentiment, y10, y2, dollar, vix] = await Promise.all([
    safeSeries('A191RL1Q225SBEA', 2), // GDP thuc, % theo quy da quy nam
    safeSeries('PCEPILFE', 15), // Core PCE, thuoc do lam phat Fed theo doi
    safeSeries('PAYEMS', 4), // Nonfarm payrolls, nghin nguoi
    safeSeries('UNRATE', 2),
    safeSeries('RSAFS', 2),
    safeSeries('UMCSENT', 2),
    safeSeries('DGS10', 2),
    safeSeries('DGS2', 2),
    safeSeries('DTWEXBGS', 2), // Chi so dollar rong cua Fed (khong phai DXY)
    safeSeries('VIXCLS', 2),
  ])

  const [newest, , , threeBack] = payrolls
  const hasThreeMonths =
    newest && threeBack && monthsApart(newest.date, threeBack.date) === 3

  const [retailNow, retailPrev] = retail
  const retailMom =
    retailNow && retailPrev && monthsApart(retailNow.date, retailPrev.date) === 1
      ? { date: retailNow.date, value: pctChange(retailNow, retailPrev), prev: null }
      : null

  return {
    gdp: latest(gdp),
    corePceYoy: yoy(corePce),
    nfpAvg3: hasThreeMonths ? (Number(newest.value) - Number(threeBack.value)) / 3 : null,
    unemployment: latest(unemployment),
    retailMom,
    sentiment: latest(sentiment),
    y10: latest(y10),
    y2: latest(y2),
    dollar: latest(dollar),
    vix: latest(vix),
  }
}

// ----- Dinh dang -----

/** "2026-09-01" -> "09/2026" */
const fmtMonth = (date: string): string => `${date.slice(5, 7)}/${date.slice(0, 4)}`

/** "2026-10-24" -> "24/10" */
const fmtDay = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`

/** "2026-07-01" -> "quý 3/2026" */
function fmtQuarter(date: string): string {
  return `quý ${Math.ceil(Number(date.slice(5, 7)) / 3)}/${date.slice(0, 4)}`
}

const signed = (n: number, digits = 0): string => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`

/** So tang giam, don vi nghin: +29 nghìn / -12 nghìn */
const fmtDelta = (thousands: number): string => `${signed(thousands)} nghìn`

/** Nguong phan loai la quy uoc cua bot, khong phai danh gia chinh thuc */
function growthLabel(gdp: number): string {
  if (gdp < 0) return 'suy giảm'
  if (gdp < 1) return 'yếu'
  if (gdp < 2.5) return 'vừa phải'
  return 'mạnh'
}

function inflationLabel(corePce: number): string {
  if (corePce <= 2.2) return 'gần mục tiêu'
  if (corePce <= 3) return 'trên mục tiêu'
  return 'cao hơn nhiều so với mục tiêu'
}

function jobsLabel(nfpAvg3: number): string {
  if (nfpAvg3 < 50) return 'yếu'
  if (nfpAvg3 < 150) return 'vừa phải'
  return 'vững'
}

function renderYields({ y10, y2 }: EconomyData): string | null {
  if (!y10 && !y2) return null
  const parts: string[] = []
  if (y10) parts.push(`10 năm ${code(`${y10.value.toFixed(2)}%`)}`)
  if (y2) parts.push(`2 năm ${code(`${y2.value.toFixed(2)}%`)}`)

  // Hai chuoi co the lech ngay cap nhat, chi tru khi cung ngay
  if (y10 && y2 && y10.date === y2.date) {
    const spread = y10.value - y2.value
    parts.push(
      `chênh lệch ${code(signed(spread, 2))} (${spread < 0 ? 'đường cong đảo ngược' : 'đường cong bình thường'})`,
    )
  }
  return `• Lợi suất trái phiếu Mỹ ${period(fmtDay((y10 ?? y2)?.date ?? ''))}: ${parts.join(', ')}`
}

export function renderEconomy(economy: EconomyData): string {
  const title = '🌎 <b>TÌNH HÌNH KINH TẾ MỸ</b>'
  if (!process.env.FRED_API_KEY) return `${title}\n<i>Chưa có FRED_API_KEY nên bỏ qua phần này.</i>`

  const { gdp, corePceYoy, nfpAvg3, unemployment, retailMom, sentiment, dollar, vix } = economy
  const lines: string[] = []

  if (gdp) {
    const prev = gdp.prev === null ? '' : ` (quý trước ${signed(gdp.prev, 1)}%)`
    lines.push(
      `• Tăng trưởng: <b>${growthLabel(gdp.value)}</b> — GDP ${period(fmtQuarter(gdp.date))} ${code(`${signed(gdp.value, 1)}%`)}${prev}`,
    )
  }
  if (corePceYoy) {
    lines.push(
      `• Lạm phát: <b>${inflationLabel(corePceYoy.value)}</b> — PCE lõi ${period(fmtMonth(corePceYoy.date))} ` +
        `${code(`${corePceYoy.value.toFixed(2)}%`)} so với cùng kỳ, mục tiêu của Fed là 2%`,
    )
  }
  if (nfpAvg3 !== null) {
    const rate = unemployment ? `, thất nghiệp ${code(`${unemployment.value.toFixed(1)}%`)}` : ''
    lines.push(
      `• Việc làm: <b>${jobsLabel(nfpAvg3)}</b> — NFP trung bình 3 tháng ${code(fmtDelta(nfpAvg3))}${rate}`,
    )
  }
  if (retailMom) {
    lines.push(
      `• Bán lẻ ${period(fmtMonth(retailMom.date))}: ${code(`${signed(retailMom.value, 2)}%`)} so với tháng trước`,
    )
  }
  if (sentiment) {
    const prev = sentiment.prev === null ? '' : ` (tháng trước ${sentiment.prev.toFixed(1)})`
    lines.push(
      `• Niềm tin tiêu dùng Đại học Michigan ${period(fmtMonth(sentiment.date))}: ${code(sentiment.value.toFixed(1))}${prev}`,
    )
  }

  const yields = renderYields(economy)
  if (yields) lines.push(yields)

  if (dollar) lines.push(`• Chỉ số đồng đô la ${period(fmtDay(dollar.date))}: ${code(dollar.value.toFixed(2))}`)
  if (vix) lines.push(`• Chỉ số biến động VIX ${period(fmtDay(vix.date))}: ${code(vix.value.toFixed(2))}`)

  if (lines.length === 0) lines.push('<i>Không lấy được số liệu kinh tế lần này.</i>')
  return [title, ...lines].join('\n')
}
