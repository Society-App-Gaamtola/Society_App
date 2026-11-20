import pg from "pg";
import constant from "./constant.js";

// BIGINT ids and COUNT(*) come back as numbers (pg returns them as strings by default); ids here stay far below 2^53.
// NUMERIC money amounts stay strings, as they were with MySQL
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value, 10));

// Hosted PostgreSQL (Render, Neon, Supabase…): set DATABASE_URL to the connection string it gives you
// (add ?sslmode=require when it needs SSL). Locally the DB_* values are used.
// DB_SSL_CA: a CA certificate (with \n for line breaks) for hosts that ask you to verify their certificate
const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");

const pool = new pg.Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "society_app",
      }),
  ssl: sslCa ? { ca: sslCa, rejectUnauthorized: true } : undefined,
  // Every connection starts in Indian time (NOW(), CURRENT_DATE, ::date), locally and on the host
  options: `-c TimeZone=${constant.DB_TIME_ZONE}`,
  max: constant.DB_POOL_MAX,
  connectionTimeoutMillis: constant.DB_CONNECT_TIMEOUT_MS,
  idleTimeoutMillis: constant.DB_IDLE_TIMEOUT_MS,
  statement_timeout: constant.DB_STATEMENT_TIMEOUT_MS,
  keepAlive: true,
});

// Neon closes idle connections (e.g. when it sleeps after a few idle minutes). Without this listener that error
// would crash the server; the pool just drops the broken connection and opens a new one on the next query
pool.on("error", (error) => {
  console.error("[db] Idle connection closed:", error.message);
});

// The SQL in this project uses MySQL-style ? placeholders; pg wants $1, $2…
// (No query has a literal ? inside a string, so a plain replace is safe)
const toPgPlaceholders = (sql) => {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
};

// Same shape as mysql2, so the modules didn't have to change:
//   SELECT (or anything that returns rows without being a write) → [rows]
//   INSERT / UPDATE / DELETE → [{ affectedRows, insertId, rows }] (insertId needs RETURNING id)
const run = async (connection, sql, params = []) => {
  const result = await connection.query(toPgPlaceholders(sql), params);
  if (result.command === "SELECT") {
    return [result.rows];
  }
  return [{ affectedRows: result.rowCount, insertId: result.rows[0]?.id ?? null, rows: result.rows }];
};

const db = {
  query: (sql, params) => run(pool, sql, params),

  // Several writes that must all succeed or all be undone:
  //   await db.transaction(async (tx) => { await tx.query(...); await query.insertQuery(..., tx); });
  // tx.query works like db.query. Throwing inside rolls everything back
  async transaction(work) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work({ query: (sql, params) => run(client, sql, params) });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  pool,
};

export default db;
