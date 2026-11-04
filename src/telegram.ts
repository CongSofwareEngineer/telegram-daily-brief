// ===== Gui tin len Telegram Bot API =====

/** Telegram gioi han 4096 ky tu moi tin; de du mot chut cho an toan */
const MAX_LENGTH = 4000

export async function sendTelegram(text: string): Promise<void> {
  // DRY_RUN=1: in ra man hinh thay vi gui, dung de test
  if (process.env.DRY_RUN) {
    console.log('=== DRY RUN - noi dung se gui ===\n')
    console.log(text)
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    throw new Error('Thieu TELEGRAM_BOT_TOKEN hoac TELEGRAM_CHAT_ID')
  }

  for (const chunk of splitMessage(text)) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      throw new Error(`Telegram tra ve ${res.status}: ${await res.text()}`)
    }
  }
}

/** Cat tin dai theo doan trong, de khong lam vo the HTML giua duong */
export function splitMessage(text: string, limit = MAX_LENGTH): string[] {
  if (text.length <= limit) return [text]

  const chunks: string[] = []
  let buffer = ''

  for (const block of text.split('\n\n')) {
    if (buffer && (buffer + '\n\n' + block).length > limit) {
      chunks.push(buffer)
      buffer = block
    } else {
      buffer = buffer ? buffer + '\n\n' + block : block
    }
  }
  if (buffer) chunks.push(buffer)

  return chunks
}
