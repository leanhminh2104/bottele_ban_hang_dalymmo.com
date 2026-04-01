# BotTele Sales Bot cho dalymmo.com

[![Deploy với Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fleanhminh2104%2Fbottele_ban_hang_dalymmo.com&env=TOKEN,SUPABASE_URL,SUPABASE_KEY,SUPABASE_DB_URL,CRON_KEY,ADMIN_ID)
![Phiên bản](https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge)
![Trạng thái](https://img.shields.io/badge/status-beta-orange?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=for-the-badge&logo=vercel&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-Bot%20API-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

Bot Telegram bán hàng hoàn chỉnh cho top-up, xử lý đơn hàng, quản lý tồn kho và bảo hành.

Phát triển cho **dalymmo.com** bởi **LAMDev**.

## Ngôn ngữ

- Tiếng Anh (mặc định): [README.md](./README.md)
- Tiếng Việt: file này

## Mục lục

- [Chi tiết phiên bản](#chi-tiết-phiên-bản)
- [Lịch sử cập nhật](#lịch-sử-cập-nhật)
- [Tính năng](#tính-năng)
- [Kiến trúc](#kiến-trúc)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [Cấu hình Webhook](#cấu-hình-webhook)
- [Cấu hình Cron](#cấu-hình-cron)
- [Triển khai đầy đủ trên Vercel](#triển-khai-đầy-đủ-trên-vercel)
- [Lệnh Bot](#lệnh-bot)
- [Luồng vận hành](#luồng-vận-hành)
- [Scripts](#scripts)
- [Donate](#donate)
- [Đóng góp](#đóng-góp)
- [Bảo mật](#bảo-mật)
- [Hỗ trợ](#hỗ-trợ)
- [Bản quyền và Credits](#bản-quyền-và-credits)

## Chi tiết phiên bản

| Trường | Giá trị |
| --- | --- |
| Phiên bản ứng dụng | `0.1.0` |
| Kênh phát hành | `beta` |
| Nhánh chính | `main` |
| Ngày cập nhật tài liệu gần nhất | `2026-04-01` |
| File changelog | [CHANGELOG.md](./CHANGELOG.md) |

## Lịch sử cập nhật

| Ngày | Commit | Loại | Nội dung |
| --- | --- | --- | --- |
| 2026-04-01 | `f05a2e0` | Tài liệu | Nâng cấp docs toàn diện: VN parity, donate, contributing, security, support |
| 2026-04-01 | `b392519` | Tài liệu | Thêm chi tiết phiên bản, changelog, và tách README tiếng Việt |
| 2026-04-01 | `84e64de` | Tài liệu | Làm mới README: song ngữ, full setup, cron, cách dùng |
| 2026-04-01 | `2286b47` | Tài liệu | Mở rộng tài liệu: cài đặt đầy đủ, cron, vận hành |
| 2026-04-01 | `cfcc2fd` | Tài liệu | Cập nhật README và LICENSE |
| 2026-04-01 | `7869941` | Core | Import toàn bộ source code bot lên repository |
| 2026-03-29 | `3cab930` | Tài liệu | Cập nhật README trạng thái beta |
| 2026-03-29 | `69ffe70` | Core | Initial commit |

Chi tiết theo mốc phát hành xem tại [CHANGELOG.md](./CHANGELOG.md).

## Tính năng

### Bot chính

- Endpoint webhook Telegram: `api/bot`
- Endpoint cron xử lý nền: `api/cron`
- Tự bootstrap schema khi khởi tạo lần đầu
- Hỗ trợ đa ngôn ngữ: `vi` và `en`

### Tính năng người dùng

- Duyệt danh mục và sản phẩm
- Mua bằng số dư hoặc hóa đơn chuyển khoản
- Xem thông tin tài khoản, biến động số dư, lịch sử đơn
- Tạo yêu cầu bảo hành

### Tính năng quản trị

- Cấu hình thanh toán và thông tin ngân hàng
- Quản lý danh mục, sản phẩm và tồn kho
- Import tồn kho từ text và file `.txt`
- Duyệt hoặc từ chối bảo hành

### Độ ổn định

- Tùy chỉnh timeout/retry Telegram bằng ENV
- Retry backoff + jitter cho mạng không ổn định
- Cron có bảo vệ bằng `CRON_KEY`

## Kiến trúc

```text
bottele_ban_hang_dalymmo.com/
|- api/          # Serverless handlers (bot, cron)
|- config/       # ENV loader, constants, i18n
|- lib/          # Telegram client, DB, HTTP layer
|- models/       # Data-access functions
|- services/     # Business logic and workflows
|- scripts/      # Helper scripts (webhook, import)
|- utils/        # Parser, keyboard builders, logger
```

## Bắt đầu nhanh

### Điều kiện cần

- Node.js `18+`
- npm
- PostgreSQL/Supabase project
- Telegram bot token từ BotFather

### Cài đặt

```bash
git clone https://github.com/leanhminh2104/bottele_ban_hang_dalymmo.com.git
cd bottele_ban_hang_dalymmo.com
npm install
```

### Chạy local

```bash
npm run local
```

URL local mặc định:

- `http://localhost:2104`

## Biến môi trường

Tạo `.env.local` (hoặc `.env`) với:

```env
TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
SUPABASE_DB_URL=your_postgres_connection_url
CRON_KEY=your_secret_cron_key
ADMIN_ID=your_telegram_user_id
```

Tùy chỉnh Telegram (không bắt buộc):

```env
TELEGRAM_TIMEOUT_MS=16000
TELEGRAM_MAX_RETRIES=3
TELEGRAM_RETRY_BASE_MS=600
TELEGRAM_RETRY_MAX_MS=5000
TELEGRAM_API_BASE=https://api.telegram.org
```

Lưu ý:

- `ADMIN_ID` phải là Telegram user ID dạng số.
- Không đưa `.env` và `.env.local` lên Git.

## Cấu hình Webhook

Khi test local, cần expose cổng bằng ngrok:

```bash
ngrok http 2104
```

Sau đó set webhook:

```bash
npm run webhook:set -- https://<your-public-domain>/api/bot
```

## Cấu hình Cron

Endpoint:

- `GET /api/cron?key=<CRON_KEY>`
- hoặc header `x-cron-key: <CRON_KEY>`

Cron xử lý:

- kiểm tra thanh toán
- giải phóng hold hết hạn
- hủy hóa đơn quá hạn và thông báo user

Test thủ công:

```bash
curl "https://<your-domain>/api/cron?key=<CRON_KEY>"
```

PowerShell:

```powershell
Invoke-WebRequest "https://<your-domain>/api/cron?key=<CRON_KEY>"
```

Chu kỳ khuyến nghị:

- mỗi 1-2 phút

## Triển khai đầy đủ trên Vercel

1. Push code lên GitHub.
2. Import repository vào Vercel.
3. Thêm đầy đủ ENV bắt buộc.
4. Deploy project.
5. Set webhook production:

```bash
npm run webhook:set -- https://<your-vercel-domain>/api/bot
```

6. Lần chạy đầu trong Telegram:
- Đăng nhập tài khoản trùng `ADMIN_ID`
- Gửi `/start`
- Nếu thiếu schema thì chạy `/setup` (hoặc `/init`, `/initdb`)

## Lệnh Bot

### Lệnh user

- `/start` - mở menu chính
- `/language` hoặc `/lang` - đổi ngôn ngữ
- `/nap` - vào luồng nạp tiền
- `/info`, `/me`, `/thongtin` - thông tin cá nhân
- `/biendong`, `/balancehistory`, `/lichsusodu` - biến động số dư
- `/lsdonhang`, `/orders`, `/lichsudonhang` - lịch sử đơn hàng

### Lệnh admin

- `/setup`, `/init`, `/initdb` - khởi tạo schema khi cần
- `/settings` - xem cấu hình hệ thống
- `/setacb <token>` - cập nhật token ACB
- `/addadmin <telegram_user_id>` - thêm admin
- `/import` - hướng dẫn import
- `/ping` - kiểm tra độ trễ
- `/cpu` - thông tin CPU
- `/restart` - thông báo trạng thái restart

## Luồng vận hành

### Luồng mua của user

1. Vào menu mua.
2. Chọn danh mục và sản phẩm.
3. Chọn số lượng.
4. Chọn phương thức thanh toán (số dư/hóa đơn).
5. Nhận tài khoản sau khi xử lý thành công.
6. Theo dõi đơn và bảo hành trong menu đơn hàng.

### Luồng của admin

1. Vào menu quản trị.
2. Cấu hình ngân hàng và thanh toán.
3. Quản lý danh mục, sản phẩm, tồn kho.
4. Xử lý yêu cầu bảo hành và hỗ trợ.

## Scripts

Set webhook:

```bash
npm run webhook:set -- https://your-domain/api/bot
```

Import danh sách account từ file text:

```bash
npm run import:accounts -- path/to/accounts.txt
```

## Donate

Nếu dự án hỗ trợ tốt cho công việc của bạn, bạn có thể ủng hộ để duy trì và nâng cấp.

| Hình thức | Chi tiết |
| --- | --- |
| Ngân hàng | MB Bank |
| Số tài khoản | `2104200637` |
| Chủ tài khoản | `LE VAN ANH MINH` |
| QR | ![MB QR](https://img.vietqr.io/image/MB-2104200637-qr_only.png) |

## Đóng góp

Rất hoan nghênh đóng góp từ cộng đồng.

- Đọc [CONTRIBUTING.md](./CONTRIBUTING.md) trước khi mở pull request.
- Mỗi PR nên tập trung vào một mục tiêu rõ ràng.
- Nếu thay đổi ảnh hưởng người dùng, hãy cập nhật docs/changelog.

## Bảo mật

Chính sách báo lỗi bảo mật: xem [SECURITY.md](./SECURITY.md).

## Hỗ trợ

- GitHub Issues: dùng để báo bug và đề xuất tính năng.
- Hỗ trợ vận hành: kiểm tra log Vercel (`api/bot`, `api/cron`) trước, sau đó gửi mô tả lỗi + bước tái hiện.

## Bản quyền và Credits

- Copyright (c) 2026 **dalymmo.com - LAMDev**
- Phát triển và vận hành bởi **LAMDev**
- Domain chính thức: **dalymmo.com**

Repository này dùng giấy phép MIT. Xem [LICENSE](./LICENSE).
