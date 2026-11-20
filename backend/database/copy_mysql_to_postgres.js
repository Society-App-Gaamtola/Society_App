// One-time copy of every row from the old MySQL database into PostgreSQL (run after schema.sql).
//   node database/copy_mysql_to_postgres.js
// Reads MySQL from MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE (+ MYSQL_SSL_CA) (defaults: local XAMPP),
// and writes to the PostgreSQL in .env (DATABASE_URL or DB_*). The PostgreSQL tables must be empty.
import "dotenv/config";
import mysql from "mysql2/promise";
import db from "../config/db.js";

// Parents before children, so every foreign key already has its row
const TABLES = [
    "roles", "users", "user_profiles", "user_devices", "otp_codes", "declaration_acceptances",
    "modules", "executive_permissions", "app_settings", "audit_logs",
    "event_categories", "events", "event_volunteers", "future_event_plans",
    "notices", "notice_recipients", "media_items",
    "notifications", "notification_recipients",
    "donations", "payments", "executive_applications", "society_transactions", "upi_settings",
];

// MySQL columns that changed in PostgreSQL: null = not copied, text = copied into that column
const RENAMED_COLUMNS = {
    users: { mobile_verified_at: null }, // only the email is verified
    event_categories: { name_en: "name", name_hi: null, name_gu: null }, // translations live in languages/
    events: { rejection_reason: null }, // events need no approval any more (2026-11-19)
};

const source = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "society_app",
    // Hosted MySQL (Aiven) needs SSL: MYSQL_SSL_CA = its CA certificate (\n for line breaks)
    ssl: process.env.MYSQL_SSL_CA ? { ca: process.env.MYSQL_SSL_CA.replace(/\\n/g, "\n") } : undefined,
    charset: "utf8mb4",
    // DATETIME values were stored as Indian time; DATE stays text so no time zone can shift the day
    timezone: "+05:30",
    dateStrings: ["DATE"],
});

const client = await db.pool.connect();
try {
    await client.query("BEGIN");
    for (const table of TABLES) {
        // users.created_by points at users: insert in id order so the referenced user exists first
        const [rows] = await source.query(`SELECT * FROM \`${table}\` ORDER BY id`);
        const renamed = RENAMED_COLUMNS[table] || {};
        for (const row of rows) {
            const columns = [];
            const values = [];
            for (const [column, value] of Object.entries(row)) {
                const target = column in renamed ? renamed[column] : column;
                if (target) {
                    columns.push(target);
                    values.push(value);
                }
            }
            await client.query(
                `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})`,
                values,
            );
        }

        // Identity columns must continue after the copied ids (roles has fixed ids, no identity)
        await client.query(
            `SELECT setval(pg_get_serial_sequence($1, 'id'), GREATEST((SELECT MAX(id) FROM ${table}), 1),
                    (SELECT MAX(id) FROM ${table}) IS NOT NULL)
             WHERE pg_get_serial_sequence($1, 'id') IS NOT NULL`,
            [table],
        );
        console.log(`${table.padEnd(26)} ${rows.length} row(s)`);
    }
    await client.query("COMMIT");
    console.log("Done.");
} catch (error) {
    await client.query("ROLLBACK");
    console.error("Copy failed, nothing was saved:", error.message);
    process.exitCode = 1;
} finally {
    client.release();
    await source.end();
    await db.pool.end();
}
