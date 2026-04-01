# BotTele Sales Bot for dalymmo.com

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fleanhminh2104%2Fbottele_ban_hang_dalymmo.com&env=TOKEN,SUPABASE_URL,SUPABASE_KEY,SUPABASE_DB_URL,CRON_KEY,ADMIN_ID)
![Version](https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-beta-orange?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=for-the-badge&logo=vercel&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-Bot%20API-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Production-ready Telegram sales bot with top-up, order workflow, stock management, and warranty handling.

Built for **dalymmo.com** by **LAMDev**.

## Language

- English (default): this file
- Vietnamese: [README-vn.md](./README-vn.md)

## Table of Contents

- [Version Details](#version-details)
- [Update History](#update-history)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Webhook Setup](#webhook-setup)
- [Cron Setup](#cron-setup)
- [Full Deployment on Vercel](#full-deployment-on-vercel)
- [Bot Commands](#bot-commands)
- [Operational Flow](#operational-flow)
- [Scripts](#scripts)
- [Security Checklist](#security-checklist)
- [Copyright and Credits](#copyright-and-credits)

## Version Details

| Field | Value |
| --- | --- |
| Application version | `0.1.0` |
| Release channel | `beta` |
| Main branch | `main` |
| Last documented update | `2026-04-01` |
| Changelog file | [CHANGELOG.md](./CHANGELOG.md) |

## Update History

| Date | Commit | Type | Summary |
| --- | --- | --- | --- |
| 2026-04-01 | `84e64de` | Docs | README revamp: bilingual docs, full setup, cron, usage |
| 2026-04-01 | `2286b47` | Docs | Expanded docs: full setup, cron, usage, copyright |
| 2026-04-01 | `cfcc2fd` | Docs | Updated README and LICENSE |
| 2026-04-01 | `7869941` | Core | Imported bot source code to repository |
| 2026-03-29 | `3cab930` | Docs | Updated README with beta status message |
| 2026-03-29 | `69ffe70` | Core | Initial commit |

For full details, see [CHANGELOG.md](./CHANGELOG.md).

## Features

### Core Bot

- Telegram webhook endpoint: `api/bot`
- Scheduled background endpoint: `api/cron`
- Auto schema bootstrap flow for first-time setup
- Multi-language support: `vi` and `en`

### User Features

- Browse categories and products
- Buy with balance or invoice transfer flow
- View account info, balance history, order history
- Create warranty request

### Admin Features

- Configure payment and bank settings
- Manage categories, products, stock
- Import stock from text and `.txt` file
- Handle warranty approvals and rejections

### Reliability

- Telegram timeout and retry controls via ENV
- Retry backoff with jitter for unstable network conditions
- Cron-safe processing with `CRON_KEY` authentication

## Architecture

```text
bottele_ban_hang_dalymmo.com/
|- api/          # Serverless handlers (bot, cron)
|- config/       # ENV loader, constants, i18n
|- lib/          # Telegram client, DB, HTTP layer
|- models/       # Data-access functions
|- services/     # Business logic and workflows
|- scripts/      # Helper scripts (webhook, import)
|- utils/        # Parsers, keyboard builders, logger
```

## Quick Start

### Prerequisites

- Node.js `18+`
- npm
- PostgreSQL/Supabase project
- Telegram bot token from BotFather

### Install

```bash
git clone https://github.com/leanhminh2104/bottele_ban_hang_dalymmo.com.git
cd bottele_ban_hang_dalymmo.com
npm install
```

### Run Local

```bash
npm run local
```

Default local URL:

- `http://localhost:2104`

## Environment Variables

Create `.env.local` (or `.env`):

```env
TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
SUPABASE_DB_URL=your_postgres_connection_url
CRON_KEY=your_secret_cron_key
ADMIN_ID=your_telegram_user_id
```

Optional Telegram tuning:

```env
TELEGRAM_TIMEOUT_MS=16000
TELEGRAM_MAX_RETRIES=3
TELEGRAM_RETRY_BASE_MS=600
TELEGRAM_RETRY_MAX_MS=5000
TELEGRAM_API_BASE=https://api.telegram.org
```

Notes:

- `ADMIN_ID` must be a numeric Telegram user ID.
- Keep `.env` and `.env.local` private and out of Git.

## Webhook Setup

For local testing, expose your local server (example with ngrok):

```bash
ngrok http 2104
```

Then set Telegram webhook:

```bash
npm run webhook:set -- https://<your-public-domain>/api/bot
```

## Cron Setup

Endpoint:

- `GET /api/cron?key=<CRON_KEY>`
- or header `x-cron-key: <CRON_KEY>`

Cron handles:

- payment checks
- expired hold release
- pending invoice expiration and user notifications

Manual test:

```bash
curl "https://<your-domain>/api/cron?key=<CRON_KEY>"
```

PowerShell:

```powershell
Invoke-WebRequest "https://<your-domain>/api/cron?key=<CRON_KEY>"
```

Recommended interval:

- every 1-2 minutes

## Full Deployment on Vercel

1. Push your code to GitHub.
2. Import repository in Vercel.
3. Add all required ENV variables.
4. Deploy project.
5. Set production webhook:

```bash
npm run webhook:set -- https://<your-vercel-domain>/api/bot
```

6. First boot in Telegram:
- Login with account matching `ADMIN_ID`
- Send `/start`
- If schema is missing, run `/setup` (or `/init`, `/initdb`)

## Bot Commands

### User Commands

- `/start` - open main menu
- `/language` or `/lang` - switch language
- `/nap` - top-up flow
- `/info`, `/me`, `/thongtin` - personal profile
- `/biendong`, `/balancehistory`, `/lichsusodu` - balance history
- `/lsdonhang`, `/orders`, `/lichsudonhang` - order history

### Admin Commands

- `/setup`, `/init`, `/initdb` - initialize schema when needed
- `/settings` - show current settings
- `/setacb <token>` - update ACB token
- `/addadmin <telegram_user_id>` - add admin user
- `/import` - import guide
- `/ping` - latency check
- `/cpu` - CPU info
- `/restart` - restart message

## Operational Flow

### User Purchase Flow

1. Open Buy menu.
2. Choose category and product.
3. Select quantity.
4. Choose payment method (balance or invoice).
5. Receive account after successful processing.
6. Use order menu for tracking and warranty requests.

### Admin Flow

1. Open admin menu.
2. Configure bank/payment settings.
3. Manage catalog and stock.
4. Process warranty requests and support tasks.

## Scripts

Set webhook:

```bash
npm run webhook:set -- https://your-domain/api/bot
```

Import account list from text file:

```bash
npm run import:accounts -- path/to/accounts.txt
```

## Security Checklist

- Do not commit secrets (`TOKEN`, DB credentials, API keys).
- Rotate critical keys periodically.
- Protect cron endpoint with strong `CRON_KEY`.
- Monitor Vercel logs for `api/bot` and `api/cron`.
- Increase Telegram timeout/retry values if your network is unstable.

## Copyright and Credits

- Copyright (c) 2026 **dalymmo.com - LAMDev**
- Developed and maintained by **LAMDev**
- Official domain: **dalymmo.com**

This repository uses the MIT License. See [LICENSE](./LICENSE).
