# Telegram Daily Brief

Bot gửi bản tin vào Telegram **7h00 sáng (giờ VN) mỗi ngày**:

- Giá **BTC, ETH, BNB, SOL, LINK** — kèm % thay đổi 24h và 7 ngày
- **Vàng & dầu** (USD) — vàng theo token XAUT, dầu WTI và Brent
- **Vụ hack crypto mới** — số tiền thiệt hại, chain, kỹ thuật tấn công
- **CPI & FED** — CPI YoY/MoM/core, fed funds rate và biên độ mục tiêu, lịch họp FOMC sắp tới (giờ VN), lịch công bố biên bản, thông cáo báo chí mới của Fed
- **Tình hình kinh tế Mỹ** — GDP, Core PCE, việc làm (NFP trung bình 3 tháng, thất nghiệp), bán lẻ, niềm tin tiêu dùng, lợi suất trái phiếu, chỉ số dollar, VIX

Viết bằng TypeScript. **Không cần `npm install`, không cần build** — Node 22 chạy
trực tiếp file `.ts` (nó chỉ xoá phần type đi rồi chạy). Không dùng thư viện ngoài nào.

> Cần **Node >= 22.6**. Kiểm tra: `node -v`.
> Nếu máy bạn thấp hơn: `brew install node` hoặc `nvm install 22`.

---

## 1. Tạo bot Telegram

1. Chat với [@BotFather](https://t.me/BotFather) → gõ `/newbot` → đặt tên → nhận **bot token**
   (dạng `123456789:AAH...`)
2. Nhắn một tin bất kỳ cho bot vừa tạo (bot không gửi được cho người chưa chat với nó)
3. Mở `https://api.telegram.org/bot<TOKEN>/getUpdates` trên browser → tìm `"chat":{"id":...}` → đó là **chat_id**

> Muốn gửi vào group: thêm bot vào group, nhắn 1 tin trong group, rồi mở `getUpdates` lại.
> `chat_id` của group là số âm, ví dụ `-1001234567890`.

## 2. Lấy FRED API key (miễn phí, cho CPI, lãi suất, việc làm & kinh tế)

Đăng ký tại https://fred.stlouisfed.org/docs/api/api_key.html — mất khoảng 1 phút.
Không có key thì bot vẫn chạy, chỉ bỏ qua các số liệu lấy từ FRED. Lịch họp FOMC và
thông cáo của Fed không cần key.

## 3. Chạy thử trên máy

```bash
cd telegram-daily-brief

# Test phần định dạng bằng dữ liệu giả, không gọi mạng
npm run test:render

# Gọi API thật, in ra màn hình, KHÔNG gửi Telegram
npm run dry

# Gửi thật
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy FRED_API_KEY=zzz npm start
```

Hoặc copy `.env.example` thành `.env`, điền vào, rồi:

```bash
node --env-file=.env src/index.ts
```

## 4. Deploy lên GitHub Actions (khuyên dùng — free, không cần server)

```bash
cd telegram-daily-brief
git init
git add .
git commit -m "init: telegram daily brief"
git branch -M main
git remote add origin git@github.com:<username>/telegram-daily-brief.git
git push -u origin main
```

Rồi vào repo → **Settings → Secrets and variables → Actions → New repository secret**, thêm 3 secret:

| Tên | Giá trị |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token từ BotFather |
| `TELEGRAM_CHAT_ID` | chat id lấy ở bước 1 |
| `FRED_API_KEY` | key FRED (có thể để trống) |

Chạy thử ngay: tab **Actions** → *Ban tin sang 7h* → **Run workflow**.
Sau đó nó tự chạy mỗi ngày.

> **Lưu ý:** cron của GitHub Actions có thể trễ 3–10 phút vào giờ cao điểm.
> Nếu cần đúng giờ tuyệt đối thì dùng VPS + `node-cron`, hoặc Vercel Cron.
>
> GitHub tự tắt scheduled workflow nếu repo không có commit nào trong 60 ngày.
> Bot này tự commit `state.json` mỗi khi có tin mới nên thường không bị, nhưng
> nên kiểm tra lại mỗi vài tháng.

## Cấu trúc

```
src/
  types.ts       – TẤT CẢ interface nằm ở đây, đọc file này trước là hiểu toàn bộ data flow
  index.ts       – gom các phần, gửi Telegram, lưu state
  prices.ts      – CoinGecko (fallback Binance nếu lỗi), gồm cả token vàng XAUT
  commodities.ts – giá dầu từ Yahoo Finance (fallback FRED nếu lỗi), hiển thị mục vàng & dầu
  hacks.ts       – DefiLlama /hacks + RSS Rekt News
  macro.ts       – FRED (CPIAUCNS, CPIAUCSL, CPILFESL, DFF, DFEDTARL, DFEDTARU) + RSS Fed
  fomc.ts        – lịch họp FOMC, đọc từ trang chính thức của Fed
  economy.ts     – việc làm & kinh tế từ FRED
  fred.ts        – client FRED dùng chung
  rss.ts         – parser RSS/Atom tự viết, dùng chung cho hacks và macro
  telegram.ts    – gửi tin, tự cắt nếu dài hơn 4096 ký tự
  state.ts       – đọc/ghi state.json
  util.ts        – fetch có retry, format tiền/%, escape HTML
  test-render.ts – test offline phần định dạng
state.json       – các vụ hack / thông cáo đã gửi, kỳ CPI gần nhất
tsconfig.json    – chỉ để editor/VS Code báo lỗi type, không dùng để build
```

Mỗi file nguồn dữ liệu đều theo cùng một khuôn: hàm `getXxx()` lấy dữ liệu và
**không bao giờ throw** (lỗi thì log + trả về rỗng/null), hàm `renderXxx()` biến
dữ liệu đó thành chuỗi HTML. Nhờ vậy một API chết không làm cả bản tin chết.

## Type-check và lint (tuỳ chọn)

Code chạy không cần TypeScript compiler hay ESLint. Nếu muốn VS Code báo lỗi hoặc
chạy check trong terminal:

```bash
npm install          # chỉ cài công cụ dev: typescript, @types/node, eslint
npm run typecheck
npm run lint         # npm run lint:fix để tự sửa những lỗi sửa được
```

## Chống gửi trùng

`state.json` lưu lại id các vụ hack và link thông cáo Fed đã gửi, cùng kỳ CPI gần nhất.
Nhờ đó phần hack và Fed **chỉ hiện tin mới**; giá token thì luôn gửi.
Kỳ CPI mới được đánh dấu 🆕.

File chỉ được ghi **sau khi** gửi Telegram thành công — nếu gửi lỗi, lần sau vẫn còn tin.
Giữ tối đa 300 id hack và 150 link Fed để file không phình to.

## Đổi giờ gửi

Sửa cron trong `.github/workflows/daily-brief.yml`. Cron dùng **UTC**, giờ VN = UTC+7:

| Giờ VN | cron |
|---|---|
| 07:00 | `0 0 * * *` |
| 06:52 (đang dùng) | `52 23 * * *` |
| 08:00 | `0 1 * * *` |
| 20:00 | `0 13 * * *` |
| 7h sáng chỉ T2–T6 | `0 0 * * 1-5` |

## Thêm token khác

Sửa mảng `COINS` trong `src/prices.ts`. Lấy `id` của CoinGecko tại
https://api.coingecko.com/api/v3/coins/list
