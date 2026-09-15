const mysql = require("mysql2/promise");
const env = require("./env");

const dbConfig = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

const dbSslEnabled = String(env.DB_SSL).toLowerCase() === "true";

if (dbSslEnabled) {
    const ca = String(env.DB_SSL_CA || "").replace(/\\n/g, "\n");

    if (!ca) {
        throw new Error(
            "DB_SSL=true requires DB_SSL_CA to be configured for the database connection.",
        );
    }

    dbConfig.ssl = {
        ca,
        rejectUnauthorized: true,
    };
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;