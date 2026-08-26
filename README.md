# ArenaSetCracker

Angular frontend for Arena Set Cracker (browser, Electron desktop, Capacitor mobile).

## Prerequisites

- Node.js + npm
- A running backend API (default `http://localhost:8080` from `src/assets/config.json`) for login, register, password reset, and cloud sync

## Development server

```bash
npm start
# or: ng serve
```

Open `http://localhost:4200/`.

Local SQLite is bootstrapped in-browser via sql.js + IndexedDB. Cloud features still need the backend on `:8080`.

## Desktop (Electron)

```bash
npm run desktop:run
```

Uses a native SQLite file named by `sqliteDbName` in `src/assets/config.json` (default `mtg_vault.db`).

## Build

```bash
npm run build
```

Output: `dist/arena-set-cracker/browser/`

## Database schema (Drizzle)

```bash
npm run db:generate
```

Migrations live in `public/drizzle/` and are applied on first bootstrap.

## Mobile

```bash
npm run mobile:build-android
npm run mobile:build-ios
```

Capacitor `webDir` points at `dist/arena-set-cracker/browser`.
