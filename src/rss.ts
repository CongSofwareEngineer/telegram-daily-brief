// ===== Parser RSS/Atom toi gian, du dung cho cac feed trong project =====
// Tach rieng ra file nay vi ca hacks.ts va macro.ts deu can.

import type { RssItem } from './types.ts'

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  // RSS dung <item>, Atom dung <entry> — bat ca hai
  const blockRe = /<(item|entry)\b[\s\S]*?<\/\1>/g

  for (const match of xml.matchAll(blockRe)) {
    const block = match[0]

    const title = pickTag(block, 'title')
    let link = pickTag(block, 'link')
    if (!link) {
      // Atom dat link trong thuoc tinh href: <link href="..."/>
      const href = block.match(/<link[^>]*href="([^"]+)"/i)
      link = href?.[1] ?? ''
    }

    const dateStr =
      pickTag(block, 'pubDate') || pickTag(block, 'updated') || pickTag(block, 'published')
    const parsed = dateStr ? Date.parse(dateStr) : NaN

    if (title && link) {
      items.push({ title, link, ts: Number.isNaN(parsed) ? 0 : parsed })
    }
  }
  return items
}

/** Lay noi dung mot tag, bo CDATA, bo tag con, giai ma vai entity hay gap */
function pickTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m?.[1]) return ''

  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
    .trim()
}
