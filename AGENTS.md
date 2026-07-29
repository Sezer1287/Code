# Repository Guide

This is a personal learning repo. It contains small Python CLI projects and one React web app.

- `Projects/` — Python learning projects (CLI, mostly SQLite-backed).
- `Lessons/`, `Async_Thread/` — standalone notes/scripts.
- `ww/football-event-tracker/` — React + Vite web app (data stored client-side in IndexedDB, no backend).

## Cursor Cloud specific instructions

The startup update script installs both toolchains: web-app npm deps and a Python
virtualenv at `/workspace/.venv` containing the third-party Python deps used across
`Projects/`.

### Web app — `ww/football-event-tracker` (primary GUI app)
- Node 22 + npm (there is a `package-lock.json`; use `npm`, not pnpm/yarn).
- Standard scripts live in `ww/football-event-tracker/package.json`: `npm run dev`
  (Vite dev server on http://localhost:5173/), `npm run lint`, `npm run build`,
  `npm run preview`.
- All data (players, matches, lineups, events) is stored in the browser's IndexedDB
  — there is no server/database to run. State is per-browser-profile, so a fresh
  browser starts empty and seeds a default squad/team on first load.
- Core workflow gotcha: you must set an 11-player lineup ("Open Lineup Setup" →
  fill the XI → save) and press "Start 1st Half" before match-event buttons
  (Goal, cards, etc.) become active.

### Python projects — `Projects/`
- Activate the venv first: `source /workspace/.venv/bin/activate`.
- Most CLI apps (`GuessTheWord`, `Howmuchmoneydoyouhave`) use only the stdlib; the
  venv is needed for `pytest`, the Cappuccino scrapers (`requests`/`aiohttp`/`bs4`),
  and the optional Telegram bot (`python-telegram-bot`).
- Run each project from its own directory — modules are imported by bare name
  (e.g. `from database import ...`), so `cwd` must be the project folder.
- `GuessTheWord`: run `python setup_db.py` once to create/seed `Wordbank.db`, then
  `python Guess_the_word.py` to play, or `python -m pytest` to run its tests.
- `Howmuchmoneydoyouhave`: `python main.py` (creates `finance.db` on first run).
  The Telegram bot (`python bot.py`) needs `TELEGRAM_BOT_TOKEN` and network access.
- `*.db` files are gitignored and are regenerated on demand; safe to delete.
