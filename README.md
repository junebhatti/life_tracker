# Life Tracker

A personal command center for tracking productivity, life, tasks, and more —
your own minimal, Notion-style home base. Built as a website now, with an iOS
app planned later.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**

## Current state

The **Today** home page is built with placeholder data:

- **Left sidebar** — Today, Tasks, Projects, People, Library
- **Top 3 for Today** — the three tasks to focus on
- **Up Next** — an agenda list (will connect to Google Calendar)
- **All Open** — every open task
- **Routines** — a daily habit/routine tracker (right column)

Data currently lives in `lib/data.ts` as typed placeholder data, shaped to make
swapping in live sources (database, Google Calendar) a small change.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roadmap

- [ ] Persist tasks/habits to a database (cross-device sync)
- [ ] Google Calendar integration (OAuth + Calendar API)
- [ ] Tasks page with full date/time/project organization
- [ ] Library + Obsidian sync
- [ ] Deploy (e.g. Vercel) so it's usable everywhere
- [ ] iOS app / PWA
