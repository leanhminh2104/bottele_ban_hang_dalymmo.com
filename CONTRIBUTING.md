# Contributing Guide

Thank you for your interest in contributing to this project.

## Scope

This repository contains a production-focused Telegram sales bot for dalymmo.com.

Please keep changes practical, testable, and aligned with the current architecture.

## Before You Start

1. Read [README.md](./README.md) and [README-vn.md](./README-vn.md).
2. Check open issues and existing pull requests.
3. For large changes, open an issue first to discuss approach.

## Development Setup

```bash
git clone https://github.com/leanhminh2104/bottele_ban_hang_dalymmo.com.git
cd bottele_ban_hang_dalymmo.com
npm install
npm run local
```

## Branch and Commit Conventions

- Branch naming:
- `feature/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- Commit message style:
- Clear, imperative, and scoped where possible.
- Example: `docs: add cron troubleshooting section`

## Pull Request Checklist

- Change is focused and minimal.
- Documentation updated (README/README-vn/CHANGELOG) when needed.
- No secrets included in diff (`.env`, keys, tokens).
- Code style is consistent with existing files.
- PR description includes:
- What changed
- Why it changed
- How to test

## Documentation Policy

If behavior changes, update both:

- [README.md](./README.md) (English)
- [README-vn.md](./README-vn.md) (Vietnamese)

If release-facing changes are made, update:

- [CHANGELOG.md](./CHANGELOG.md)

## Security and Sensitive Data

- Never commit production secrets.
- Never commit raw customer data.
- Follow [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Review and Merge

- Maintainers may request changes before merge.
- High-risk production changes may require additional verification.
