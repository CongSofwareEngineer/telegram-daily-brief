// ===== Tien ich dung chung: fetch co retry, format so, escape HTML =====

/** Goi lai toi da `tries` lan neu loi mang, bi rate-limit (429) hoac loi server (5xx) */
export async function fetchRetry(
  url: string,
  opts: RequestInit = {},
  tries = 3,
): Promise<Response> {
  let lastErr: unknown

  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'user-agent': 'daily-brief-bot/1.0', ...(opts.headers ?? {}) },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} tu ${url}`)
      return res
    } catch (err) {
      lastErr = err
      // Cho lau hon sau moi lan that bai: 1.5s, 3s
      if (i < tries - 1) await sleep(1500 * (i + 1))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

export async function fetchJson<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetchRetry(url, opts)
  return (await res.json()) as T
}

export async function fetchText(url: string, opts: RequestInit = {}): Promise<string> {
  const res = await fetchRetry(url, opts)
  return res.text()
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Escape cho parse_mode=HTML cua Telegram. Bat buoc dung cho moi noi dung tu API. */
export function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

// Quy uoc style trong ban tin: tieu de <b>, so lieu chinh <code>, ky so lieu <i>, chu thich de thuong.
// Telegram khong cho long the khac vao <code> nen khong dung <b><code>.

/** So lieu chinh, ngay gio can doc: hien chu mono mau xanh, bam de copy */
export function code(s: string | number): string {
  return `<code>${esc(s)}</code>`
}

/** Ky cua so lieu, vi du 09/2026 */
export function period(s: string): string {
  return `<i>${esc(s)}</i>`
}

/** Gia token: $103,250 / $612.5 / $0.0042 tuy do lon */
export function fmtUsd(n: number | null): string {
  if (n === null || Number.isNaN(n)) return 'không có'
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + n.toFixed(4)
}

/** So tien lon, rut gon: $2.64 nghìn tỷ / $42.0 triệu / $1.3 triệu */
export function fmtBigUsd(n: number | null): string {
  if (n === null || Number.isNaN(n)) return 'không có'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + ' nghìn tỷ'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + ' tỷ'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + ' triệu'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + ' nghìn'
  return '$' + n.toFixed(0)
}

/** % kem mau, tra ve HTML nen khong esc lai: 🟢 <code>+2.31%</code> */
export function fmtPct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return 'không có'
  const mark = n > 0 ? '🟢' : n < 0 ? '🔴' : '⚪️'
  return `${mark} ${code(`${n > 0 ? '+' : ''}${n.toFixed(2)}%`)}`
}

/** "Thứ Tư, 04/11/2026" theo gio Viet Nam */
export function todayVN(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

/** Moc thoi gian cach day n ngay, milliseconds */
export function daysAgo(n: number): number {
  return Date.now() - n * 86_400_000
}

/** Lay message cua loi ma khong lo bi `unknown` */
export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
