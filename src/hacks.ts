// ===== VỤ HACK MỚI NHẤT: DefiLlama (so lieu) + Rekt News (phan tich) =====

import { fetchJson, fetchText, fmtBigUsd, esc, daysAgo, errMsg, code } from './util.ts'
import { parseRss } from './rss.ts'
import type { HackItem, RektPost } from './types.ts'

/** Quet 7 ngay de khong bo sot vu duoc cap nhat muon */
const LOOKBACK_DAYS = 7

/** Ten tieng Viet cua ky thuat tan cong; gia tri chua co trong bang thi giu nguyen goc */
const TECHNIQUES_VI: Readonly<Record<string, string>> = {
  'improper access control': 'Kiểm soát truy cập sai',
  'spot price manipulation': 'Thao túng giá giao ngay',
  'private key compromised': 'Lộ khóa riêng',
  'hot wallet key compromised': 'Lộ khóa ví nóng',
  reentrancy: 'Tấn công tái nhập',
  unknown: 'Chưa rõ',
  'missing input validation': 'Thiếu kiểm tra đầu vào',
  'incorrect share accounting': 'Tính sai phần sở hữu',
  'key leaked via infrastructure': 'Lộ khóa qua hạ tầng',
  'swap logic flaw': 'Lỗi logic hoán đổi',
  'infinite mint': 'Đúc token vô hạn',
  'arithmetic error': 'Lỗi tính toán',
  'withdrawal logic flaw': 'Lỗi logic rút tiền',
  phishing: 'Lừa đảo giả mạo',
  'arbitrary external call': 'Gọi ngoài tùy ý',
  'reward logic flaw': 'Lỗi logic phần thưởng',
  'token approval abuse': 'Lạm dụng quyền phê duyệt token',
  'admin drain': 'Quản trị viên rút cạn quỹ',
  'forged proof': 'Giả mạo bằng chứng',
  'dns hijack': 'Chiếm quyền DNS',
  'oracle misconfiguration': 'Cấu hình sai oracle',
  'malicious proposal': 'Đề xuất độc hại',
  'rounding error': 'Lỗi làm tròn',
  'bridge logic flaw': 'Lỗi logic cầu nối',
  'donation attack': 'Tấn công quyên góp',
  'signature verification flaw': 'Lỗi xác minh chữ ký',
  malware: 'Mã độc',
  'validator key compromised': 'Lộ khóa trình xác thực',
  'frontend compromise': 'Xâm nhập giao diện web',
  'uninitialized proxy': 'Proxy chưa khởi tạo',
  'weak key generation': 'Tạo khóa yếu',
  'deposit logic flaw': 'Lỗi logic nạp tiền',
  'liquidity rug': 'Rút cạn thanh khoản',
  'supply chain attack': 'Tấn công chuỗi cung ứng',
  'deployer key compromised': 'Lộ khóa triển khai',
  'backdoor contract': 'Hợp đồng có cửa hậu',
  'risk parameter abuse': 'Lạm dụng tham số rủi ro',
  'stale oracle price': 'Giá oracle lỗi thời',
  'api key compromised': 'Lộ khóa API',
  'impersonation scam': 'Lừa đảo mạo danh',
}

/** Hinh dang mot phan tu trong https://api.llama.fi/hacks */
interface LlamaHack {
  name: string
  /** Unix timestamp, don vi GIAY */
  date: number
  /** Thiet hai, don vi USD */
  amount: number
  chain?: string | string[]
  technique?: string
  classification?: string
  source?: string
  link?: string
}

export async function getLlamaHacks(sentIds: string[]): Promise<HackItem[]> {
  let list: LlamaHack[]
  try {
    list = await fetchJson<LlamaHack[]>('https://api.llama.fi/hacks')
  } catch (err) {
    console.warn('[hacks] DefiLlama loi:', errMsg(err))
    return []
  }
  if (!Array.isArray(list)) return []

  const already = new Set(sentIds)
  const cutoffSeconds = daysAgo(LOOKBACK_DAYS) / 1000

  return list
    .filter((h) => Number(h.date) >= cutoffSeconds)
    .map<HackItem>((h) => ({
      id: `llama:${h.name}:${h.date}`,
      name: h.name,
      amount: Number(h.amount) || 0,
      chains: Array.isArray(h.chain) ? h.chain : h.chain ? [h.chain] : [],
      technique: h.technique ?? h.classification ?? '',
      link: h.source ?? h.link ?? '',
      date: Number(h.date) * 1000,
    }))
    .filter((h) => !already.has(h.id))
    .sort((a, b) => b.amount - a.amount) // vu lon nhat len dau
}

export async function getRektPosts(sentIds: string[]): Promise<RektPost[]> {
  let xml: string
  try {
    xml = await fetchText('https://rekt.news/rss.xml')
  } catch (err) {
    console.warn('[hacks] Rekt RSS loi:', errMsg(err))
    return []
  }

  const already = new Set(sentIds)
  const cutoff = daysAgo(LOOKBACK_DAYS)

  return parseRss(xml)
    .filter((it) => it.ts >= cutoff)
    .map<RektPost>((it) => ({ id: `rekt:${it.link}`, title: it.title, link: it.link, ts: it.ts }))
    .filter((it) => !already.has(it.id))
    .slice(0, 5)
}

export function renderHacks(llama: HackItem[], rekt: RektPost[]): string {
  if (llama.length === 0 && rekt.length === 0) {
    return '🛡 <b>VỤ HACK MỚI NHẤT</b>\nKhông có vụ mới trong 7 ngày qua (hoặc đã báo trước đó).'
  }

  const lines = ['🛡 <b>VỤ HACK MỚI NHẤT</b>']

  for (const h of llama.slice(0, 6)) {
    const bits = [`<b>${esc(h.name)}</b> — ${code(fmtBigUsd(h.amount))}`]
    if (h.chains.length > 0) bits.push(esc(h.chains.join(', ')))
    if (h.technique) bits.push(esc(TECHNIQUES_VI[h.technique.trim().toLowerCase()] ?? h.technique))

    let line = '• ' + bits.join(' · ')
    if (h.link) line += `\n  <a href="${esc(h.link)}">chi tiết</a>`
    lines.push(line)
  }

  if (rekt.length > 0) {
    lines.push('\n<b>Phân tích từ Rekt News</b>')
    for (const r of rekt) {
      lines.push(`• <a href="${esc(r.link)}">${esc(r.title)}</a>`)
    }
  }

  return lines.join('\n')
}
