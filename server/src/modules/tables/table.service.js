const { v4: uuid } = require("uuid");
const db = require("../../utils/db");
const AppError = require("../../utils/AppError");
const generateQRCode = require("../../utils/qrGenerator");

const getAllTables = async () => {
    return await db.query(
        "SELECT * FROM restaurant_tables ORDER BY id ASC"
    );
};

const getTableByToken = async (token) => {

    const tables = await db.query(
        `SELECT
            id,
            table_number,
            qr_token,
            status
         FROM restaurant_tables
         WHERE qr_token = ?`,
        [token]
    );

    if (!tables.length) {
        throw new AppError("Invalid QR code", 404);
    }

    const table = tables[0];

    if (!table.status) {
        throw new AppError("This table is currently unavailable", 400);
    }

    return {
        id: table.id,
        table_number: table.table_number,
        status: Boolean(table.status)
    };
};



const createTable = async ({ table_number }) => {

    // Check duplicate table number
    const existing = await db.query(
        "SELECT id FROM restaurant_tables WHERE table_number = ?",
        [table_number]
    );

    if (existing.length) {
        throw new AppError("Table already exists", 409);
    }

    // Generate UUID
    const qrToken = uuid();

    // Save table
    const result = await db.query(
        `INSERT INTO restaurant_tables
        (table_number, qr_token)
        VALUES (?, ?)`,
        [table_number, qrToken]
    );

    // Generate QR Image
    const qr = await generateQRCode(
        table_number,
        qrToken
    );

    // Optional (recommended)
    await db.query(
        "UPDATE restaurant_tables SET qr_image = ? WHERE id = ?",
        [qr.qrImage, result.insertId]
    );

    // Return complete table
    const table = await db.query(
        "SELECT * FROM restaurant_tables WHERE id = ?",
        [result.insertId]
    );

    return {
        ...table[0],
        qr
    };
};

module.exports = {
    getAllTables,
    getTableByToken,
    createTable
};