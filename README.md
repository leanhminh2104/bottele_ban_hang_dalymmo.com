# bottele_ban_hang_dalymmo.com

Telegram sales bot for digital account products, top-up, and warranty flows.

## Main Features

- Telegram bot webhook endpoint on Vercel (`/api/bot`)
- Scheduled tasks endpoint (`/api/cron`) with `CRON_KEY` protection
- Auto bootstrap database schema (`/setup` flow for admin)
- Multi-language support (`vi`, `en`)
- Product shop flow:
- Category and product browsing
- Buy with balance or invoice payment
- Order history and warranty request
- Admin tools:
- Product and category management
- Stock import from text or Telegram `.txt` file
- Warranty approve and reject flow

## Tech Stack

- Node.js (ESM)
- Vercel serverless functions
- PostgreSQL (Supabase pool/direct URL)
- Telegram Bot API

## Project Structure

- `api/`: Vercel endpoints (`bot.js`, `cron.js`)
- `config/`: environment and i18n
- `lib/`: DB, HTTP, and Telegram client
- `models/`: DB data access layer
- `services/`: business logic and bot flows
- `scripts/`: helper scripts

## Required Environment Variables

Create `.env.local` (or `.env`) and set:

```bash
TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
SUPABASE_DB_URL=your_postgres_connection_url
CRON_KEY=your_secret_cron_key
ADMIN_ID=your_telegram_user_id
```

Optional Telegram network tuning:

```bash
TELEGRAM_TIMEOUT_MS=16000
TELEGRAM_MAX_RETRIES=3
TELEGRAM_RETRY_BASE_MS=600
TELEGRAM_RETRY_MAX_MS=5000
TELEGRAM_API_BASE=https://api.telegram.org
```

## Local Development

```bash
npm install
npm run local
```

Local server default in this project:

- `http://localhost:2104`

## Set Webhook

After deploy (or with tunnel), set Telegram webhook:

```bash
npm run webhook:set -- https://your-domain/api/bot
```

## Import Stock Accounts

```bash
npm run import:accounts -- path/to/accounts.txt
```

Each line in txt file should be one account record.

## Deployment (Vercel)

1. Push code to GitHub.
2. Import repo in Vercel.
3. Add all environment variables in Vercel Project Settings.
4. Deploy.
5. Run webhook setup with your production URL.

## License

MIT. See `LICENSE`.
