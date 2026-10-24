# South Jersey Food Truck

Source for **SouthJerseyFoodTruck.com** — a directory of South Jersey food trucks with county/city/cuisine landing pages, guides, an event-inquiry form (presented by Grilly Cheese), and an optional AI assistant.

## Stack
- Node 22+, Express 4, server-rendered HTML templates (`html/*.js`)
- Content/listings stored as JSON in `data/` (no database)
- Email via Resend; optional assistant via the OpenAI SDK
- Deployed on Railway (`railway.json`)

## Layout
| Path | What |
|---|---|
| `server.js` | Routes, sitemap, forms, admin |
| `html/` | Page templates |
| `public/` | Static assets, `app.js`, `style.css` |
| `data/` | `trucks.json`, `posts.json`, `image-submissions.json` (seed data) |
| `scripts/` | Validation suite (`npm test` runs them all against a local server) |
| `research/` | Source records and research notes behind listings |

## Run locally
```bash
npm install
cp .env.example .env   # fill in what you need; all optional in dev
npm run dev            # http://localhost:3000
npm test               # full validation suite
```

## Data persistence
Admin actions (truck verification, image review) write JSON. In production `DATA_DIR=/data` points at a Railway volume; on first boot the bundled `data/*.json` files are copied there, and after that the volume copy is the source of truth. **Editing `data/*.json` in git will not overwrite files already on the volume** — delete the file on the volume (or unset `DATA_DIR`) to reseed.

## Environment
See `.env.example`. Production requires `SESSION_SECRET` and `ADMIN_TOKEN`; `RESEND_API_KEY` enables email; `OPENAI_API_KEY` enables the assistant.

Admin: `/admin?token=<ADMIN_TOKEN>`

## Search readiness

See [SEO-AIO-AUDIT.md](SEO-AIO-AUDIT.md) for the audit, implemented fixes, validation
evidence, and remaining production/content evidence gaps. `npm test` includes the
full sitemap crawl, metadata, content evidence, and generated-image checks.
`npm run validate:browser` is an optional UI smoke test against a running server
(set `DIRECTORY_URL`; requires Playwright and Chromium).
