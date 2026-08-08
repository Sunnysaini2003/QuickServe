const pool = require("../config/database");

const query = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
};

const getConnection = async () => {
    return await pool.getConnection();
};

module.exports = {
    query,
    getConnection,
};