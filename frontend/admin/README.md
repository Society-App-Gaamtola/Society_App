# Admin Panel

Super Admin web panel. It reads its data from `../mock-server` by default.

```powershell
# terminal 1
cd mock-server
npm run mock

# terminal 2
cd admin
npm install
npm run dev
```

Open http://localhost:3000. Login is UI only: any email and password work (there is no OTP step).

Pages: Dashboard, Members (with member details), Executives (requests and permissions), Events & Notices, Donations, Expenses, Financial Reports (overview and export), Media Approval and App Settings.

The mock data lives in `../mock-server/db.json`; `src/services/seed.json` is a copy used by `mock` mode. Keep them in sync when you change the data shape.

Change the data source with `DATA_MODE` in `src/config.ts`: `local-server`, `mock` (browser localStorage) or `supabase` (not implemented yet).
