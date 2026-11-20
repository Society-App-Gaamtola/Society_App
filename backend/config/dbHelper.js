import db from "./db.js";

// { a: 1, b: 2 } → { columns: ["a", "b"], values: [1, 2] }. Keys come from code, never from the request
const splitObject = (params) => ({ columns: Object.keys(params), values: Object.values(params) });

// Every helper takes an optional last argument `conn`: the `tx` of db.transaction(), to run inside it
const query = {
    // params: an object of columns to set, or a SQL string such as "attempts = attempts + 1"
    updateQuery: async (table, params, where = null, whereParams = [], conn = db) => {
        try {
            let sql = `UPDATE ${table} SET `;
            const values = [];

            if (params && typeof params === "object" && !Array.isArray(params)) {
                const { columns, values: setValues } = splitObject(params);
                sql += columns.map((column) => `${column} = ?`).join(", ");
                values.push(...setValues);
            } else if (typeof params === "string") {
                sql += params;
            } else {
                throw new Error("updateQuery params must be an object or string");
            }

            if (where) {
                sql += ` WHERE ${where}`;
                if (Array.isArray(whereParams) && whereParams.length > 0) {
                    values.push(...whereParams);
                }
            }

            return await conn.query(sql, values);
        } catch (error) {
            console.error("Error executing update query:", error);
            throw error;
        }
    },

    // Returns [{ insertId, affectedRows }]
    // onConflict: SQL that follows the VALUES, e.g. "ON CONFLICT DO NOTHING"
    insertQuery: async (table, params, onConflict = "", conn = db) => {
        try {
            const { columns, values } = splitObject(params);
            const sql = `INSERT INTO ${table} (${columns.join(", ")})
                VALUES (${columns.map(() => "?").join(", ")}) ${onConflict} RETURNING id`;
            return await conn.query(sql, values);
        } catch (error) {
            console.error("Error executing insert query:", error);
            throw error;
        }
    },

    // Insert, or update the row that already has the same conflictColumns
    // (e.g. one user_profiles row per user_id). Only `params` columns are touched on update
    upsertQuery: async (table, params, conflictColumns, conn = db) => {
        const updates = Object.keys(params)
            .filter((column) => !conflictColumns.includes(column))
            .map((column) => `${column} = EXCLUDED.${column}`);
        const onConflict = updates.length
            ? `ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET ${updates.join(", ")}`
            : `ON CONFLICT (${conflictColumns.join(", ")}) DO NOTHING`;
        return query.insertQuery(table, params, onConflict, conn);
    },

    // One page of a list, and the COUNT for its pagination, run at the same time. Every list API uses this.
    // selectSql has no LIMIT (added here); countSql uses the same WHERE and params.
    // withTotal = false skips the COUNT (e.g. the home page or a detail call); pagination is then null
    fetchPage: async (selectSql, countSql, params, { page = 1, limit = 10, withTotal = true }) => {
        const [[rows], countResult] = await Promise.all([
            db.query(`${selectSql} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]),
            withTotal ? db.query(countSql, params) : null,
        ]);
        if (!withTotal) {
            return { rows, pagination: null };
        }

        const total = countResult[0][0].total;
        return {
            rows,
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit), has_more: page * limit < total },
        };
    },
};

export default query;
