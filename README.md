# WordCraft AI — AI SEO Content Writer & Article Generator (SaaS)

Version 1.0.0

A complete, self-hosted AI writing SaaS: 12 writing templates, streaming generation,
AI chat, credits & subscriptions (PayPal + Stripe), referrals, a developer API,
blog/CMS, support tickets, a full admin panel, 5 languages (incl. RTL) and dark mode.
Built on Node.js + Express + React, with SQLite (no database server required).

## Quick start

1. Requirements: Node.js v18 or newer.
2. Install dependencies:
   npm install
3. Start the server:
   npm start
4. Open http://localhost:3000 and complete the one-screen install wizard.
5. In Admin → Settings → AI Provider, add your AI credentials (any OpenAI-compatible
   provider: OpenAI, DeepSeek, Groq, OpenRouter, or self-hosted).
6. (Optional) Add PayPal / Stripe credentials in Admin → Settings → Payments.

A production build of the React frontend is included in `client/dist`, so no build
step is required. If you edit frontend sources, rebuild with `npm run build`.

## Documentation

Open `Documentation/index.html` in a browser for the full manual: installation,
AI provider setup, features, admin panel, payments, developer API, deployment
(PM2 + Nginx), languages/RTL, and troubleshooting.

`Documentation/item-description.html` contains ready-to-paste marketplace listing copy.

## Data & backup

All data lives in a single SQLite file at `data/wordcraft.sqlite` (created on first
run). Back up that one file to back up everything. Relocate it with the
`WCAI_DATA_DIR` environment variable. Change the port with `PORT`.

## License

This source code is licensed for use by the original purchaser under the marketplace
license terms under which it was acquired. Redistribution or resale of the source
code itself is not permitted.
