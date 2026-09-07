const { v4: uuid } = require("uuid");

const db = require("../../utils/db");
const AppError = require("../../utils/AppError");
const generateQRCode = require("../../utils/qrGenerator");


// HELPERS


const toBoolean = (value) => {
    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true" ||
        value === "TRUE"
    );
};

const getTableById = async (id) => {
    const rows = await db.query(
        `
        SELECT
            id,
            table_number,
            qr_token,
            qr_image,
            status,
            created_at,
            updated_at
        FROM restaurant_tables
        WHERE id = ?
        LIMIT 1
        `,
        [id]
    );

    if (!rows.length) {
        throw new AppError(
            "Table not found",
            404
        );
    }

    return rows[0];
};


// GET ALL TABLES


const getAllTables = async () => {
    const tables = await db.query(
        `
        SELECT
            id,
            table_number,
            qr_token,
            qr_image,
            status,
            created_at,
            updated_at
        FROM restaurant_tables
        ORDER BY id ASC
        `
    );

    return tables;
};


// GET TABLE BY ID


const getTableByIdService = async (id) => {
    return await getTableById(id);
};


// GET TABLE BY QR TOKEN
// PUBLIC CUSTOMER ROUTE


const getTableByToken = async (token) => {
    const tables = await db.query(
        `
        SELECT
            id,
            table_number,
            qr_token,
            status
        FROM restaurant_tables
        WHERE qr_token = ?
        LIMIT 1
        `,
        [token]
    );

    if (!tables.length) {
        throw new AppError(
            "Invalid QR code",
            404
        );
    }

    const table = tables[0];

    if (!toBoolean(table.status)) {
        throw new AppError(
            "This table is currently unavailable",
            400
        );
    }

    return {
        id: table.id,
        table_number: table.table_number,
        status: true
    };
};


// CREATE TABLE


const createTable = async (data) => {
    const tableNumber = String(
        data?.table_number || ""
    ).trim();

    if (!tableNumber) {
        throw new AppError(
            "Table number is required",
            400
        );
    }

    
    // DUPLICATE TABLE NUMBER
    

    const existing = await db.query(
        `
        SELECT id
        FROM restaurant_tables
        WHERE LOWER(table_number) = LOWER(?)
        LIMIT 1
        `,
        [tableNumber]
    );

    if (existing.length) {
        throw new AppError(
            "Table number already exists",
            409
        );
    }

    
    // QR TOKEN
    

    const qrToken = uuid();

    
    // INSERT TABLE
    

    const result = await db.query(
        `
        INSERT INTO restaurant_tables
        (
            table_number,
            qr_token,
            status
        )
        VALUES (?, ?, ?)
        `,
        [
            tableNumber,
            qrToken,
            data?.status === undefined
                ? 1
                : toBoolean(data.status)
                    ? 1
                    : 0
        ]
    );

    const tableId = result.insertId;

    
    // GENERATE QR
    

    const qr = await generateQRCode(
        tableNumber,
        qrToken
    );

    
    // SAVE QR IMAGE
    

    if (qr?.qrImage) {
        await db.query(
            `
            UPDATE restaurant_tables
            SET qr_image = ?
            WHERE id = ?
            `,
            [
                qr.qrImage,
                tableId
            ]
        );
    }

    return await getTableById(tableId);
};


// UPDATE TABLE


const updateTable = async (id, data) => {
    const existingTable = await getTableById(id);

    const tableNumber = String(
        data?.table_number ??
        existingTable.table_number
    ).trim();

    if (!tableNumber) {
        throw new AppError(
            "Table number is required",
            400
        );
    }

    
    // CHECK DUPLICATE TABLE NUMBER
    

    const duplicate = await db.query(
        `
        SELECT id
        FROM restaurant_tables
        WHERE LOWER(table_number) = LOWER(?)
        AND id <> ?
        LIMIT 1
        `,
        [
            tableNumber,
            id
        ]
    );

    if (duplicate.length) {
        throw new AppError(
            "Table number already exists",
            409
        );
    }

    const status =
        data?.status === undefined
            ? toBoolean(existingTable.status)
            : toBoolean(data.status);

    
    // UPDATE TABLE
    

    await db.query(
        `
        UPDATE restaurant_tables
        SET
            table_number = ?,
            status = ?
        WHERE id = ?
        `,
        [
            tableNumber,
            status ? 1 : 0,
            id
        ]
    );

    
    // REGENERATE QR IMAGE
    //
    // QR token remains the same.
    // This means existing QR URLs remain valid.
    

    const qr = await generateQRCode(
        tableNumber,
        existingTable.qr_token
    );

    if (qr?.qrImage) {
        await db.query(
            `
            UPDATE restaurant_tables
            SET qr_image = ?
            WHERE id = ?
            `,
            [
                qr.qrImage,
                id
            ]
        );
    }

    return await getTableById(id);
};


// UPDATE TABLE STATUS


const updateTableStatus = async (id, status) => {
    await getTableById(id);

    const newStatus = toBoolean(status);

    await db.query(
        `
        UPDATE restaurant_tables
        SET status = ?
        WHERE id = ?
        `,
        [
            newStatus ? 1 : 0,
            id
        ]
    );

    return await getTableById(id);
};


// DELETE TABLE


const deleteTable = async (id) => {
    await getTableById(id);

    
    // CHECK TABLE SESSIONS
    

    const sessions = await db.query(
        `
        SELECT id
        FROM table_sessions
        WHERE table_id = ?
        LIMIT 1
        `,
        [id]
    );

    if (sessions.length) {
        throw new AppError(
            "Cannot delete this table because it has session history. Deactivate it instead.",
            409
        );
    }

    
    // CHECK ORDERS
    

    const orders = await db.query(
        `
        SELECT id
        FROM orders
        WHERE table_id = ?
        LIMIT 1
        `,
        [id]
    );

    if (orders.length) {
        throw new AppError(
            "Cannot delete this table because it has order history. Deactivate it instead.",
            409
        );
    }

    
    // DELETE
    

    await db.query(
        `
        DELETE FROM restaurant_tables
        WHERE id = ?
        `,
        [id]
    );

    return true;
};


// EXPORTS


module.exports = {
    getAllTables,
    getTableByIdService,
    getTableByToken,
    createTable,
    updateTable,
    updateTableStatus,
    deleteTable
};