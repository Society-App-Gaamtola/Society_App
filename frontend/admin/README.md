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

Open http://localhost:3000. Login is UI only: any email, password and 6-digit OTP work.

Change the data source with `DATA_MODE` in `src/config.ts`: `local-server`, `mock` (browser localStorage) or `supabase` (not implemented yet).
