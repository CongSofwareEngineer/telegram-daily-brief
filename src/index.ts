// ===== Diem vao: gom cac phan, gui Telegram, luu state =====

import { getPrices, renderPrices } from './prices.ts'
import { getLlamaHacks, getRektPosts, renderHacks } from './hacks.ts'
import { getCpi, getFedRate, getFedNews, renderMacro } from './macro.ts'
import { getFomc } from './fomc.ts'
import { getOil, renderCommodities } from './commodities.ts'
import { getEconomy, renderEconomy } from './economy.ts'
import { loadState, saveState } from './state.ts'
import { sendTelegram } from './telegram.ts'
import { todayVN, errMsg, code } from './util.ts'
import type { CoinRow } from './types.ts'

async function main(): Promise<void> {
  const state = await loadState()

  // Goi song song cho nhanh. Moi nguon tu xu ly loi cua no nen mot API chet
  // thi cac phan con lai van gui duoc.
  const [prices, oil, llama, rekt, cpi, fedRate, fedNews, fomc, economy] = await Promise.all([
    getPrices().catch((err: unknown): CoinRow[] => {
      console.error('[prices]', errMsg(err))
      return []
    }),
    getOil(),
    getLlamaHacks(state.sentHackIds),
    getRektPosts(state.sentHackIds),
    getCpi(),
    getFedRate(),
    getFedNews(state.sentFedLinks),
    getFomc(),
    getEconomy(),
  ])

  const cpiIsNew = cpi !== null && cpi.period !== state.lastCpiPeriod

  const message = [
    `📊 <b>BẢN TIN SÁNG</b>\n${code(todayVN())}`,
    renderPrices(prices),
    renderCommodities(prices, oil),
    renderHacks(llama, rekt),
    renderMacro({ cpi, fedRate, fedNews, fomc, cpiIsNew }),
    renderEconomy(economy),
  ].join('\n\n')

  await sendTelegram(message)

  // Chi ghi state SAU KHI gui thanh cong — gui loi thi lan sau van con tin
  state.sentHackIds.push(...llama.map((h) => h.id), ...rekt.map((r) => r.id))
  state.sentFedLinks.push(...fedNews.map((n) => n.link))
  if (cpi) state.lastCpiPeriod = cpi.period
  await saveState(state)

  console.log(
    `Da gui. Hack moi: ${llama.length + rekt.length}, ` +
    `thong cao Fed: ${fedNews.length}, CPI moi: ${cpiIsNew}`,
  )
}

main().catch((err: unknown) => {
  console.error('Loi:', err)
  process.exit(1)
})
