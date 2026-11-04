// ===== Gia token: CoinGecko la chinh, Binance la du phong =====

import { fetchJson, fmtUsd, fmtPct, fmtBigUsd, esc, errMsg, code } from './util.ts'
import type { CoinRow } from './types.ts'

interface CoinConfig {
  /** Id tren CoinGecko */
  id: string
  /** Ky hieu hien thi */
  sym: string
  /** Cap giao dich tren Binance, dung khi CoinGecko loi */
  binance: string
}

/** Token vang: lay gia cung dot voi cac token khac, nhung hien o muc vang va dau */
export const GOLD_SYM = 'XAUT'

/** Danh sach token, theo dung thu tu muon hien thi */
const COINS: readonly CoinConfig[] = [
  { id: 'bitcoin', sym: 'BTC', binance: 'BTCUSDT' },
  { id: 'ethereum', sym: 'ETH', binance: 'ETHUSDT' },
  { id: 'binancecoin', sym: 'BNB', binance: 'BNBUSDT' },
  { id: 'solana', sym: 'SOL', binance: 'SOLUSDT' },
  { id: 'chainlink', sym: 'LINK', binance: 'LINKUSDT' },
  { id: 'tether-gold', sym: GOLD_SYM, binance: 'XAUTUSDT' },
]

/** Hinh dang phan hoi cua CoinGecko /coins/markets (chi khai bao field minh dung) */
interface GeckoMarket {
  id: string
  current_price: number | null
  price_change_percentage_24h: number | null
  price_change_percentage_24h_in_currency?: number | null
  price_change_percentage_7d_in_currency?: number | null
  market_cap: number | null
}

/** Hinh dang phan hoi cua Binance /ticker/24hr */
interface BinanceTicker {
  symbol: string
  lastPrice: string
  priceChangePercent: string
}

export async function getPrices(): Promise<CoinRow[]> {
  try {
    return await fromCoinGecko()
  } catch (err) {
    console.warn('[prices] CoinGecko loi, chuyen sang Binance:', errMsg(err))
    return fromBinance()
  }
}

async function fromCoinGecko(): Promise<CoinRow[]> {
  const ids = COINS.map((c) => c.id).join(',')
  const url =
    'https://api.coingecko.com/api/v3/coins/markets' +
    `?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d&precision=full`

  const data = await fetchJson<GeckoMarket[]>(url)
  const byId = new Map(data.map((d) => [d.id, d]))

  return COINS.map((c) => {
    const d = byId.get(c.id)
    return {
      sym: c.sym,
      price: d?.current_price ?? null,
      ch24: d?.price_change_percentage_24h_in_currency ?? d?.price_change_percentage_24h ?? null,
      ch7d: d?.price_change_percentage_7d_in_currency ?? null,
      mcap: d?.market_cap ?? null,
    }
  })
}

async function fromBinance(): Promise<CoinRow[]> {
  const symbols = JSON.stringify(COINS.map((c) => c.binance))
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`

  const data = await fetchJson<BinanceTicker[]>(url)
  const bySymbol = new Map(data.map((d) => [d.symbol, d]))

  return COINS.map((c) => {
    const d = bySymbol.get(c.binance)
    return {
      sym: c.sym,
      price: d ? Number(d.lastPrice) : null,
      ch24: d ? Number(d.priceChangePercent) : null,
      ch7d: null, // Binance /ticker/24hr khong co so lieu 7 ngay
      mcap: null,
    }
  })
}

export function renderPrices(allRows: CoinRow[]): string {
  const rows = allRows.filter((r) => r.sym !== GOLD_SYM)
  if (rows.length === 0) {
    return '💰 <b>GIÁ TOKEN</b>\nKhông lấy được giá lần này.'
  }

  const lines = rows.map((r) => {
    const parts = [`<b>${esc(r.sym)}</b>  ${code(fmtUsd(r.price))}`, `24 giờ ${fmtPct(r.ch24)}`]
    if (r.ch7d !== null) parts.push(`7 ngày ${fmtPct(r.ch7d)}`)
    return '• ' + parts.join('  |  ')
  })

  const totalMcap = rows.reduce((sum, r) => sum + (r.mcap ?? 0), 0)
  if (totalMcap > 0) {
    lines.push(`\nTổng vốn hóa 5 token: ${code(fmtBigUsd(totalMcap))}`)
  }

  return '💰 <b>GIÁ TOKEN</b>\n' + lines.join('\n')
}
