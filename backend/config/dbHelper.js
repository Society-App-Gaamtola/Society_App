import db from "./db.js";

const query = {
    updateQuery: async (table, params, where = null, whereParams = []) => {
        try {
            let sql = `UPDATE ${table} SET `;
            const values = [];

            if (params && typeof params === "object" && !Array.isArray(params)) {
                sql += "?";
                values.push(params);
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

            return await db.query(sql, values);
        } catch (error) {
            console.error("Error executing update query:", error);
            throw error;
        }
    },

    insertQuery: async (table, params) => {
        try {
            const sql = `INSERT INTO ${table} SET ?`;
            return await db.query(sql, [params]);
        } catch (error) {
            console.error("Error executing insert query:", error);
            throw error;
        }
    }
}

export default query;