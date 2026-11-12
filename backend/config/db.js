import mysql from "mysql2/promise";
import constant from "./constant.js";

// Hosted MySQL (e.g. Aiven) needs SSL: put its CA certificate in DB_SSL_CA (with \n for line breaks, or real
// line breaks). Local XAMPP needs neither DB_PORT nor DB_SSL_CA.
const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");

// Create a connection pool for better performance
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "society_app",
  ssl: sslCa ? { ca: sslCa, rejectUnauthorized: true } : undefined,
  // Dates read from and written to MySQL are Indian time, whatever time zone the server machine uses
  timezone: constant.DB_TIME_ZONE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Every new connection gets the same time zone (NOW(), CURDATE()) and SQL rules, locally and on the host
db.pool.on("connection", (connection) => {
  connection.query("SET time_zone = ?, sql_mode = ?", [constant.DB_TIME_ZONE, constant.DB_SQL_MODE]);
});

export default db;
