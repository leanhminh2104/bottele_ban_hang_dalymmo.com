# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.1.x (beta) | Yes |
| < 0.1.0-beta | No |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. Preferred: open a private security advisory on GitHub (if available for this repository).
2. Fallback: contact the maintainer directly via repository owner profile.
3. Do not publish exploit details in public issues before a fix is available.

## What to Include in a Report

- Affected component/file
- Steps to reproduce
- Expected vs actual behavior
- Impact assessment
- Suggested mitigation (if any)

## Response Targets

- Initial acknowledgment: within 72 hours
- Status update: within 7 days
- Fix timeline: depends on severity and deployment risk

## Security Best Practices for Contributors

- Never commit secrets (`TOKEN`, DB credentials, API keys).
- Keep cron endpoints protected (`CRON_KEY`).
- Validate all external inputs (Telegram payloads, file imports).
- Minimize sensitive logs in production.
