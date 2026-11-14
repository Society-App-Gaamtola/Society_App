# Admin Panel

Super Admin web panel. It runs on built-in demo data by default, so it needs no server (see below).

```powershell
cd admin
npm install
npm run dev
```

Open http://localhost:3000. Login is UI only: any email and password work (there is no OTP step).

Pages: Dashboard, Members (with member details), Executives (requests and permissions), Events & Notices, Donations, Expenses, Financial Reports (overview and export), Media Approval and App Settings.

The mock data lives in `../mock-server/db.json`; `src/services/seed.json` is a copy used by `mock` mode. Keep them in sync when you change the data shape.

By default the panel runs on **demo data** (`DATA_MODE = 'mock'` in `src/config.ts`): `src/services/seed.json` is copied into each browser's localStorage, so no server is needed. This is what gets deployed (e.g. Vercel, root directory `frontend/admin`) for client UI approval. Changes stay in that browser; Settings → Backup & Data → Reset Demo Data starts over. After editing `seed.json`, bump `SEED_VERSION` in `src/config.ts` so browsers pick up the new data.

To use the shared mock server instead, set `NEXT_PUBLIC_DATA_MODE=local-server` (and `NEXT_PUBLIC_API_URL` if it is not on localhost:4000). `supabase` mode is not implemented.
