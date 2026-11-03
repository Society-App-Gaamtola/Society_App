# Mock Server

A shared fake backend for the mobile app and the admin panel. There is no real database: all data lives in `db.json`.

## Run

```powershell
cd mock-server
npm install
npm run mock
```

The server listens on port `4000` on all network interfaces. Every request is delayed by 300 ms to feel like a real network.

Check it in a browser on the laptop: http://localhost:4000/api/members

## Connect a phone: find the laptop IP

A phone cannot use `localhost`, because that means the phone itself. Use the laptop's IP address instead.

1. Connect the phone and the laptop to the same WiFi.
2. Run this on the laptop:

   ```powershell
   ipconfig
   ```

3. Under your WiFi adapter ("Wireless LAN adapter Wi-Fi"), copy the `IPv4 Address`, for example `192.168.1.25`.
4. Use `http://192.168.1.25:4000/api` as the API URL.

If the phone cannot connect, allow Node.js through Windows Firewall on private networks.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET, POST, PUT, PATCH, DELETE | `/api/<collection>` and `/api/<collection>/<id>` | Read and change data |
| GET, PUT, PATCH | `/api/settings` | Read and change the settings object |
| POST | `/upload` | Upload a file as multipart form field `file` (max 10 MB). Returns `{ "url": "..." }` |
| GET | `/uploads/<filename>` | Open an uploaded file |

Collections: `members`, `events`, `notices`, `donations`, `expenses`, `volunteerDuties`, `assignments`, `executiveRequests`, `permissions`, `media`, `reports`, `auditLogs`, `notifications`.

json-server filters also work, for example `/api/donations?status=Pending` or `/api/members?_page=1&_limit=10`.

## Good to know

- Changes are written straight into `db.json`. To get the seed data back, restore the file with `git checkout mock-server/db.json`.
- There is no login or permission check. Anyone on the same network can read and change the data, so use it only on a trusted network and only with test data.
