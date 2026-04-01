# bottele_ban_hang_dalymmo.com

Bot Telegram ban hang tai khoan so, nap tien, quan ly don hang va bao hanh.

## Ban quyen va Tac gia

- Ban quyen ma nguon: Copyright (c) 2026 dalymmo.com - LAMDev
- Thuong hieu va tai san lien quan den dalymmo.com thuoc quyen so huu cua dalymmo.com
- Phan ma nguon trong repo duoc phat hanh theo MIT License (xem file `LICENSE`)
- Phat trien boi: LAMDev

## Tinh nang chinh

- Webhook Telegram: `api/bot`
- Cron xu ly nen: `api/cron` (kiem tra thanh toan, nhan don tre han, giai phong hold)
- Tu dong bootstrap schema database khi he thong chua co bang
- Ho tro da ngon ngu: `vi`, `en`
- Luong mua hang:
- Chon danh muc -> chon san pham -> chon so luong -> chon phuong thuc thanh toan
- Thanh toan bang so du hoac hoa don chuyen khoan
- Theo doi don hang va gui yeu cau bao hanh
- Luong quan tri:
- Quan ly danh muc, san pham, ton kho
- Import tai khoan tu text/file `.txt`
- Duyet/Tu choi bao hanh

## Cong nghe su dung

- Node.js (ESM)
- Vercel Functions
- PostgreSQL (Supabase)
- Telegram Bot API

## Cau truc thu muc

- `api/`: Entry point serverless (`bot.js`, `cron.js`)
- `config/`: ENV loader, i18n, constants
- `lib/`: Telegram client, DB, HTTP
- `models/`: Truy van database
- `services/`: Nghiep vu chinh
- `scripts/`: Script ho tro (`set-webhook`, `import-accounts`)
- `utils/`: Logger, parser, keyboard

## Bien moi truong bat buoc

Tao file `.env.local` hoac `.env`:

```bash
TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
SUPABASE_DB_URL=your_postgres_connection_url
CRON_KEY=your_secret_cron_key
ADMIN_ID=your_telegram_user_id
```

Tuy chon tinh chinh mang Telegram:

```bash
TELEGRAM_TIMEOUT_MS=16000
TELEGRAM_MAX_RETRIES=3
TELEGRAM_RETRY_BASE_MS=600
TELEGRAM_RETRY_MAX_MS=5000
TELEGRAM_API_BASE=https://api.telegram.org
```

Luu y:

- `ADMIN_ID` la Telegram numeric user id cua admin tong
- Khong commit `.env` va `.env.local` len Git

## Cai dat Local day du

1. Clone source:

```bash
git clone https://github.com/leanhminh2104/bottele_ban_hang_dalymmo.com.git
cd bottele_ban_hang_dalymmo.com
```

2. Cai dependency:

```bash
npm install
```

3. Tao va cau hinh `.env.local` theo mau ben tren.

4. Chay local:

```bash
npm run local
```

Mac dinh app local:

- `http://localhost:2104`

5. Expose local de Telegram goi webhook (vi du dung ngrok):

```bash
ngrok http 2104
```

6. Set webhook:

```bash
npm run webhook:set -- https://<your-ngrok-or-domain>/api/bot
```

7. Khoi tao schema (lan dau):

- Dang nhap Telegram bang tai khoan co `user_id = ADMIN_ID`
- Gui `/start`
- Neu bot bao chua co schema, gui `/setup` (hoac bam nut khoi tao)

## Deploy Vercel day du

1. Push code len GitHub.
2. Import repo vao Vercel.
3. Khai bao ENV trong Project Settings (toan bo bien bat buoc).
4. Deploy.
5. Set webhook production:

```bash
npm run webhook:set -- https://<your-vercel-domain>/api/bot
```

6. Kiem tra:

- Gui `/start` tren Telegram
- Kiem tra log Function tren Vercel

## Cau hinh Cron day du

Endpoint cron:

- `GET /api/cron?key=<CRON_KEY>`
- Hoac gui header: `x-cron-key: <CRON_KEY>`

Muc dich cron:

- Kiem tra thanh toan topup
- Giai phong hold het han
- Huy don hoa don qua han va thong bao user

Vi du test thu cong:

```bash
curl "https://<your-domain>/api/cron?key=<CRON_KEY>"
```

PowerShell:

```powershell
Invoke-WebRequest "https://<your-domain>/api/cron?key=<CRON_KEY>"
```

Khuyen nghi lich chay:

- Moi 1-2 phut moi lan chay (tu nhu cau tai he thong)

Ban co the dung:

- cron-job.org / EasyCron / server cron rieng
- Hoac Vercel Cron (neu ban truyen duoc `key` qua URL)

## Cach dung bot

### Lenh user

- `/start`: mo menu chinh
- `/language` hoac `/lang`: doi ngon ngu (`vi` / `en`)
- `/nap`: vao quy trinh nap tien
- `/info`, `/me`, `/thongtin`: xem thong tin tai khoan
- `/biendong`, `/balancehistory`, `/lichsusodu`: lich su bien dong so du
- `/lsdonhang`, `/orders`, `/lichsudonhang`: lich su don hang

### Lenh admin

- `/settings`: xem cau hinh he thong
- `/setacb <token>`: cap nhat token ACB
- `/addadmin <telegram_user_id>`: them admin
- `/import`: huong dan import ton kho
- `/ping`: kiem tra do tre
- `/cpu`: xem thong tin CPU
- `/restart`: thong bao trang thai restart
- `/setup`, `/init`, `/initdb`: khoi tao schema (khi can)

### Luong thao tac user

1. Bam `Mua tai khoan`
2. Chon danh muc, chon server/san pham, chon so luong
3. Chon thanh toan bang so du hoac hoa don
4. Nhan tai khoan sau khi thanh toan thanh cong
5. Vao `Don hang cua toi` de theo doi va gui yeu cau bao hanh

### Luong thao tac admin

1. Vao menu quan tri
2. Quan ly danh muc va san pham
3. Nhap kho thu cong hoac bang file `.txt`
4. Xu ly don va yeu cau bao hanh

## Scripts ho tro

Set webhook:

```bash
npm run webhook:set -- https://your-domain/api/bot
```

Import account tu file:

```bash
npm run import:accounts -- path/to/accounts.txt
```

## Bao mat va van hanh

- Khong commit thong tin nhay cam (`TOKEN`, DB URL, keys)
- Nen xoay token dinh ky neu nghi ro ri
- Nen bat monitor/log cho endpoint `api/bot` va `api/cron`
- Neu Telegram timeout gian doan, tang `TELEGRAM_TIMEOUT_MS` va `TELEGRAM_MAX_RETRIES`

## License

MIT License. Xem chi tiet tai file `LICENSE`.
