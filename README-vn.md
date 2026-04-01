# BotTele Sales Bot cho dalymmo.com (Tieng Viet)

Tai lieu tieng Viet cho du an bot Telegram ban hang cua dalymmo.com.

## Ngon ngu

- Tieng Anh (mac dinh): [README.md](./README.md)
- Tieng Viet: file nay

## Chi tiet phien ban

| Truong | Gia tri |
| --- | --- |
| Phien ban ung dung | `0.1.0` |
| Kenh phat hanh | `beta` |
| Nhanh chinh | `main` |
| Ngay cap nhat tai lieu gan nhat | `2026-04-01` |
| Lich su cap nhat day du | [CHANGELOG.md](./CHANGELOG.md) |

## Lich su cap nhat

| Ngay | Commit | Loai | Noi dung |
| --- | --- | --- | --- |
| 2026-04-01 | `84e64de` | Tai lieu | Lam moi README: song ngu, huong dan day du cai dat, cron, su dung |
| 2026-04-01 | `2286b47` | Tai lieu | Bo sung huong dan full setup + ban quyen |
| 2026-04-01 | `cfcc2fd` | Tai lieu | Cap nhat README va LICENSE |
| 2026-04-01 | `7869941` | Core | Import toan bo source code bot len repository |
| 2026-03-29 | `3cab930` | Tai lieu | Cap nhat README trang thai beta |
| 2026-03-29 | `69ffe70` | Core | Initial commit |

## Tinh nang chinh

- Endpoint webhook Telegram: `api/bot`
- Endpoint cron xu ly nen: `api/cron`
- Tu dong bootstrap schema khi he thong chua co bang
- Ho tro ngon ngu `vi` va `en`
- Luong mua hang: danh muc -> san pham -> so luong -> thanh toan
- Luong admin: quan ly danh muc, san pham, ton kho, bao hanh

## Cai dat nhanh

```bash
git clone https://github.com/leanhminh2104/bottele_ban_hang_dalymmo.com.git
cd bottele_ban_hang_dalymmo.com
npm install
npm run local
```

URL local mac dinh:

- `http://localhost:2104`

## Bien moi truong bat buoc

Tao `.env.local` (hoac `.env`):

```env
TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
SUPABASE_DB_URL=your_postgres_connection_url
CRON_KEY=your_secret_cron_key
ADMIN_ID=your_telegram_user_id
```

Tuy chinh Telegram (khong bat buoc):

```env
TELEGRAM_TIMEOUT_MS=16000
TELEGRAM_MAX_RETRIES=3
TELEGRAM_RETRY_BASE_MS=600
TELEGRAM_RETRY_MAX_MS=5000
TELEGRAM_API_BASE=https://api.telegram.org
```

## Cau hinh webhook

Expose local voi ngrok:

```bash
ngrok http 2104
```

Set webhook:

```bash
npm run webhook:set -- https://<your-public-domain>/api/bot
```

## Cau hinh cron

- URL: `GET /api/cron?key=<CRON_KEY>`
- Hoac header: `x-cron-key: <CRON_KEY>`
- Nen chay moi 1-2 phut

Test thu cong:

```bash
curl "https://<your-domain>/api/cron?key=<CRON_KEY>"
```

## Deploy Vercel

1. Push code len GitHub.
2. Import repository vao Vercel.
3. Them day du ENV trong Project Settings.
4. Deploy.
5. Set webhook production:

```bash
npm run webhook:set -- https://<your-vercel-domain>/api/bot
```

## Lenh bot

### User

- `/start`
- `/language` hoac `/lang`
- `/nap`
- `/info`, `/me`, `/thongtin`
- `/biendong`, `/balancehistory`, `/lichsusodu`
- `/lsdonhang`, `/orders`, `/lichsudonhang`

### Admin

- `/setup`, `/init`, `/initdb`
- `/settings`
- `/setacb <token>`
- `/addadmin <telegram_user_id>`
- `/import`
- `/ping`
- `/cpu`
- `/restart`

## Scripts

```bash
npm run webhook:set -- https://your-domain/api/bot
npm run import:accounts -- path/to/accounts.txt
```

## Ban quyen

- Copyright (c) 2026 **dalymmo.com - LAMDev**
- Phat trien boi **LAMDev**
- Domain chinh thuc: **dalymmo.com**
- License: MIT (xem [LICENSE](./LICENSE))
