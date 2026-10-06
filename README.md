# AI_logs_show — Gamma chat trace viewer

Standalone React app to visualize Faktura/Gamma chat JSON: message thread, **`network`** execution timeline, **`streamDebug`**, and **`reportRows`**.

- **GitHub:** https://github.com/AvoCahDoe/ai-logs-show
- **Live (Vercel):** https://ai-logs-show.vercel.app

## Features

- **Run graph** — interactive trace map (pan/zoom/minimap) built from your JSON, LangSmith-style
- **Routing flow** — user → specialist domain → tools → ERP calls
- **Endpoint table** — full URLs, project/action filters, copy link
- **Charts** — latency bars, HTTP status mix, tools; bar/line chart from `reportRows`
- **Step timeline** — detailed `network` + `streamDebug` list

## Quick start

```bash
cd AI_logs_show
npm install
npm run dev
```

Open http://localhost:5173

## What to paste

Any of these JSON shapes:

| Shape | Example |
|-------|---------|
| Full conversation | `PUT /api/chats/{id}` body from DevTools |
| Many conversations | Export array like [`data/current.json`](data/current.json) |
| Messages only | `[{ "role": "user", ... }, { "role": "assistant", "network": [...] }]` |
| Single assistant turn | One object with `role`, `network`, `streamDebug` |

Use **Load file** for large exports (e.g. the full `data/current.json` ~5MB).

**Load bundled sample** fetches `public/sample-conversations.json` (one trimmed conversation).

## Build

```bash
npm run build
npm run preview
```

## Timeline logic

- **`network`**: ordered steps (`routing` → `tool` → `tool_query` → `http` when typed; legacy HTTP-only rows otherwise).
- **`streamDebug.events`**: merged when present (SSE meta, routing, tools, errors).
- Click an **assistant** message to expand the trace, report table, and raw JSON.

## Correlation

Copy **`requestId`** from an assistant turn into Gamma logs or Langfuse.
