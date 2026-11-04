// ===== Cac kieu du lieu dung chung trong toan bo project =====

/** Mot dong gia token trong ban tin */
export interface CoinRow {
  /** Ky hieu hien thi, vi du "BTC" */
  sym: string
  /** Gia USD hien tai; null neu khong lay duoc */
  price: number | null
  /** % thay doi 24 gio */
  ch24: number | null
  /** % thay doi 7 ngay; Binance khong tra ve nen co the null */
  ch7d: number | null
  /** Von hoa thi truong USD */
  mcap: number | null
}

/** Mot vu hack lay tu DefiLlama */
export interface HackItem {
  /** Id duy nhat de chong gui trung, dang "llama:<ten>:<timestamp>" */
  id: string
  name: string
  /** Thiet hai, don vi USD */
  amount: number
  chains: string[]
  /** Ky thuat tan cong, vi du "Private key compromise" */
  technique: string
  /** Link bai phan tich; co the rong */
  link: string
  /** Thoi diem xay ra, milliseconds */
  date: number
}

/** Mot bai viet tu Rekt News */
export interface RektPost {
  id: string
  title: string
  link: string
  ts: number
}

/** Mot item trong RSS/Atom feed */
export interface RssItem {
  title: string
  link: string
  /** Thoi diem publish, milliseconds; 0 neu khong doc duoc ngay */
  ts: number
}

/** So lieu CPI tu FRED */
export interface CpiData {
  /** Ky bao cao, dang "2026-09-01" */
  period: string
  /** Lam phat so cung ky nam truoc, % */
  yoy: number
  /** Lam phat so thang truoc, %; null neu thieu du lieu */
  mom: number | null
  /** Core CPI (bo thuc pham + nang luong) YoY, % */
  coreYoy: number | null
}

/** Lai suat dieu hanh hieu dung cua Fed */
export interface FedRate {
  /** Lai suat hien tai, % */
  rate: number
  /** Ngay cua so lieu */
  date: string
  /** Lai suat cach day 30 ngay, de so sanh; null neu khong co */
  prev: number | null
  /** Bien do muc tieu do FOMC dat ra, %; null neu khong lay duoc */
  target: { low: number, high: number } | null
}

/** Mot cuoc hop FOMC theo lich */
export interface FomcMeeting {
  /** Ngay dau, dang "2026-12-08" */
  start: string
  /** Ngay cuoi, ngay ra quyet dinh */
  end: string
  /** True neu kem du bao kinh te (SEP / dot plot) */
  hasProjections: boolean
}

/** Cac moc sap toi cua Fed */
export interface FomcCalendar {
  upcoming: (FomcMeeting & { decisionTs: number })[]
  /** Bien ban cua cuoc hop gan nhat, neu chua cong bo */
  pendingMinutes: { meeting: FomcMeeting, releaseTs: number } | null
}

/** Mot chi so kinh te: gia tri moi nhat va ky lien truoc */
export interface Reading {
  /** Ky bao cao, dang "2026-09-01" */
  date: string
  value: number
  prev: number | null
}

/** Tinh hinh kinh te chung */
export interface EconomyData {
  /** GDP thuc, % theo quy da quy nam */
  gdp: Reading | null
  corePceYoy: Reading | null
  /** NFP trung binh 3 thang gan nhat, don vi nghin viec */
  nfpAvg3: number | null
  /** Ty le that nghiep, % */
  unemployment: Reading | null
  retailMom: Reading | null
  /** Chi so niem tin tieu dung cua Dai hoc Michigan */
  sentiment: Reading | null
  y10: Reading | null
  y2: Reading | null
  dollar: Reading | null
  vix: Reading | null
}

/** Mot dong gia dau, USD/thung */
export interface OilRow {
  /** Ten hien thi, vi du "Dầu WTI" */
  label: string
  price: number
  /** % thay doi so voi phien truoc */
  chSession: number | null
  /** % thay doi 7 ngay; nguon du phong FRED khong co nen co the null */
  ch7d: number | null
  /** Ngay cua so lieu khi lay tu nguon du phong; null neu la gia moi nhat */
  asOf: string | null
}

/** Du lieu luu giua cac lan chay, de khong gui trung tin */
export interface State {
  /** Id cac vu hack / bai Rekt da gui */
  sentHackIds: string[]
  /** Ky CPI gan nhat da bao, de danh dau "moi" */
  lastCpiPeriod: string | null
  /** Link cac thong cao Fed da gui */
  sentFedLinks: string[]
}

/** Tham so cho renderMacro */
export interface MacroView {
  cpi: CpiData | null
  fedRate: FedRate | null
  fedNews: RssItem[]
  /** Lich hop FOMC; null neu khong lay duoc */
  fomc: FomcCalendar | null
  /** True neu ky CPI nay chua tung duoc bao */
  cpiIsNew: boolean
}
