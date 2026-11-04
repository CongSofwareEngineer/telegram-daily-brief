// ===== Test offline: kiem tra phan dinh dang bang du lieu gia =====
// Chay: npm run test:render

import { renderPrices } from './prices.ts'
import { renderHacks } from './hacks.ts'
import { renderMacro } from './macro.ts'
import { parseFomcCalendar, selectFomc, renderFomc } from './fomc.ts'
import { renderEconomy } from './economy.ts'
import { parseYahooChart, renderCommodities } from './commodities.ts'
import { parseRss } from './rss.ts'
import { splitMessage } from './telegram.ts'
import type {
  CoinRow,
  HackItem,
  RektPost,
  CpiData,
  FedRate,
  RssItem,
  FomcCalendar,
  EconomyData,
  OilRow,
} from './types.ts'

const prices: CoinRow[] = [
  { sym: 'BTC', price: 103_250.44, ch24: 2.31, ch7d: -4.12, mcap: 2.05e12 },
  { sym: 'ETH', price: 3412.8, ch24: -1.08, ch7d: 3.44, mcap: 4.1e11 },
  { sym: 'BNB', price: 612.5, ch24: 0, ch7d: 1.2, mcap: 8.9e10 },
  { sym: 'SOL', price: 178.33, ch24: 5.67, ch7d: 12.01, mcap: 8.4e10 },
  { sym: 'LINK', price: 14.9072, ch24: -0.44, ch7d: null, mcap: 9.5e9 },
  { sym: 'XAUT', price: 3941.18, ch24: 0.65, ch7d: -2.72, mcap: 3.19e9 },
]

const oil: OilRow[] = [
  { label: 'Dầu WTI', price: 95.45, chSession: -0.67, ch7d: -6.42, asOf: null },
  // Gia du phong tu FRED: co ngay so lieu, khong co % 7 ngay
  { label: 'Dầu Brent', price: 99.1, chSession: 0.4, ch7d: null, asOf: '2026-10-27' },
]

// Co phien null va nghi cuoi tuan: 7 ngay truoc phien 10/11 phai la phien 03/11
const day = (s: string): number => Date.parse(`${s}T00:00:00Z`) / 1000
const sampleChart = {
  chart: {
    result: [
      {
        timestamp: [day('2026-11-02'), day('2026-11-03'), day('2026-11-06'), day('2026-11-09'), day('2026-11-10')],
        indicators: { quote: [{ close: [90, 100, null, 95, 110] }] },
      },
    ],
  },
}

const llama: HackItem[] = [
  {
    id: 'llama:SomeBridge:1',
    name: 'SomeBridge',
    amount: 42_000_000,
    chains: ['Ethereum', 'BSC'],
    technique: 'Private Key Compromised',
    link: 'https://example.com/report',
    date: Date.now(),
  },
  {
    id: 'llama:YieldVault:2',
    name: 'YieldVault <test & co>', // kiem tra escape HTML
    amount: 1_250_000,
    chains: ['Base'],
    technique: 'Oracle manipulation',
    link: '',
    date: Date.now(),
  },
]

const rekt: RektPost[] = [
  { id: 'rekt:1', title: 'SomeBridge - Rekt', link: 'https://rekt.news/somebridge', ts: Date.now() },
]

const cpi: CpiData = { period: '2026-09-01', yoy: 2.84, mom: 0.21, coreYoy: 3.05 }
const fedRate: FedRate = {
  rate: 3.88,
  date: '2026-11-03',
  prev: 4.12,
  target: { low: 3.75, high: 4 },
}
const fedNews: RssItem[] = [
  { title: 'FOMC statement', link: 'https://federalreserve.gov/x.htm', ts: Date.now() },
]

// Mau theo cau truc that cua trang lich Fed: nam khong theo thu tu, co cuoc hop vat
// qua hai thang, co SEP (*), va mot dong bat thuong phai bi bo qua.
const sampleFomc = `
<div><h4><a id="1">2027 FOMC Meetings</a></h4></div>
<div class="fomc-meeting__month col"><strong>January</strong></div>
<div class="fomc-meeting__date col">26-27</div>
<div><h4><a id="2">2026 FOMC Meetings</a></h4></div>
<div class="fomc-meeting__month col"><strong>October</strong></div>
<div class="fomc-meeting__date col">27-28</div>
<div class="fomc-meeting--shaded fomc-meeting__month col"><strong>Oct/Nov</strong></div>
<div class="fomc-meeting__date col">31-1</div>
<div class="fomc-meeting__month col"><strong>November</strong></div>
<div class="fomc-meeting__date col">20 (unscheduled)</div>
<div class="fomc-meeting__month col"><strong>December</strong></div>
<div class="fomc-meeting__date col">8-9*</div>`

const meetings = parseFomcCalendar(sampleFomc)
const now = Date.parse('2026-11-04T00:00:00Z')
const fomc: FomcCalendar = selectFomc(meetings, now)

const economy: EconomyData = {
  gdp: { date: '2026-07-01', value: 3.4, prev: 2.2 },
  corePceYoy: { date: '2026-09-01', value: 3.12, prev: 3.05 },
  nfpAvg3: 62.3,
  unemployment: { date: '2026-09-01', value: 4.2, prev: 4.1 },
  retailMom: { date: '2026-09-01', value: 0.77, prev: null },
  sentiment: { date: '2026-09-01', value: 48.1, prev: 51.7 },
  y10: { date: '2026-11-02', value: 4.91, prev: 4.94 },
  y2: { date: '2026-11-02', value: 4.59, prev: 4.56 },
  dollar: { date: '2026-10-30', value: 121.67, prev: 121.74 },
  vix: { date: '2026-11-02', value: 21.15, prev: 19.42 },
}
const emptyEconomy: EconomyData = {
  gdp: null,
  corePceYoy: null,
  nfpAvg3: null,
  unemployment: null,
  retailMom: null,
  sentiment: null,
  y10: null,
  y2: null,
  dollar: null,
  vix: null,
}

// renderMacro chi hien so lieu khi co key; test offline nen dat key gia
process.env.FRED_API_KEY ??= 'test'

console.log(
  [
    renderPrices(prices),
    renderCommodities(prices, oil),
    renderHacks(llama, rekt),
    renderMacro({ cpi, fedRate, fedNews, fomc, cpiIsNew: true }),
    renderEconomy(economy),
  ].join('\n\n'),
)

console.log('\n--- vang & dau: doc Yahoo, thieu vang, rong ---')
console.log(parseYahooChart(sampleChart, 'Dầu WTI')) // price 110, chSession ~15.79, ch7d 10
console.log(parseYahooChart({ chart: { result: null } }, 'Dầu WTI')) // null
console.log(renderCommodities([], oil))
console.log(renderCommodities([], []))

console.log('\n--- macro: thieu truong, lai suat khong doi, lai suat tang ---')
console.log(
  renderMacro({
    cpi: { period: '2026-09-01', yoy: 2.84, mom: null, coreYoy: null },
    fedRate: { rate: 3.88, date: '2026-11-03', prev: 3.88, target: null },
    fedNews: [],
    fomc,
    cpiIsNew: false,
  }),
)
console.log(
  renderMacro({
    cpi: null,
    fedRate: { rate: 4.12, date: '2026-11-03', prev: 3.88, target: null },
    fedNews: [],
    fomc: null,
    cpiIsNew: false,
  }),
)
console.log(renderMacro({ cpi, fedRate: null, fedNews: [], fomc: null, cpiIsNew: false }))

console.log('\n--- FOMC: ket qua doc lich va cac moc thoi gian ---')
console.log(meetings)
console.log(renderFomc(selectFomc(meetings, Date.parse('2026-12-09T12:00:00Z')), Date.parse('2026-12-09T12:00:00Z')))
console.log(renderFomc({ upcoming: [], pendingMinutes: null }))

console.log('\n--- kinh te: thieu truong, duong cong dao nguoc ---')
console.log(
  renderEconomy({
    ...emptyEconomy,
    y10: { date: '2026-11-02', value: 3.5, prev: null },
    y2: { date: '2026-11-02', value: 3.9, prev: null },
  }),
)

console.log('\n--- truong hop rong ---')
console.log(renderPrices([]))
console.log(renderHacks([], []))
console.log(renderEconomy(emptyEconomy))
delete process.env.FRED_API_KEY
console.log(renderMacro({ cpi: null, fedRate: null, fedNews: [], fomc: null, cpiIsNew: false }))
console.log(renderEconomy(emptyEconomy))

console.log('\n--- parseRss ---')
const sampleRss = `<rss><channel>
<item><title><![CDATA[Hack X & Y]]></title><link>https://a.b/1</link><pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`
console.log(parseRss(sampleRss))

const sampleAtom = '<feed><entry><title>Atom post</title><link href="https://a.b/2"/><updated>2026-11-03T10:00:00Z</updated></entry></feed>'
console.log(parseRss(sampleAtom))

console.log('\n--- splitMessage ---')
const long = Array.from({ length: 10 }, (_, i) => `Doan ${i}: ` + 'x'.repeat(500)).join('\n\n')
const parts = splitMessage(long)
console.log(`${long.length} ky tu -> ${parts.length} tin, dai nhat ${Math.max(...parts.map((p) => p.length))}`)
