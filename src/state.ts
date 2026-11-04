// ===== Doc/ghi state.json de khong gui trung tin giua cac lan chay =====

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { State } from './types.ts'

// state.json nam o goc project, canh package.json (dist/ nam cung cap do)
const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'state.json')

const EMPTY: State = { sentHackIds: [], lastCpiPeriod: null, sentFedLinks: [] }

/** Doc state; neu file chua co hoac bi loi thi coi nhu rong */
export async function loadState(): Promise<State> {
  try {
    const raw = await readFile(FILE, 'utf8')
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<State>) }
  } catch {
    return { ...EMPTY }
  }
}

/** Ghi state, giu lai so luong id gioi han de file khong phong to mai */
export async function saveState(state: State): Promise<void> {
  const trimmed: State = {
    sentHackIds: state.sentHackIds.slice(-300),
    lastCpiPeriod: state.lastCpiPeriod,
    sentFedLinks: state.sentFedLinks.slice(-150),
  }
  await writeFile(FILE, JSON.stringify(trimmed, null, 2) + '\n')
}
