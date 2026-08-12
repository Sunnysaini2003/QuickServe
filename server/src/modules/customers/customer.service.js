const { v4: uuid } = require("uuid");
const jwt = require("jsonwebtoken");

const db = require("../../utils/db");
const AppError = require("../../utils/AppError");
const env = require("../../config/env");
const crypto = require("crypto");


const createCustomerSession = async ({
    table_token,
    name,
    mobile
}) => {

    // 1. Verify table
    const tables = await db.query(
        `SELECT id, table_number, status
         FROM restaurant_tables
         WHERE qr_token = ?`,
        [table_token]
    );

    if (!tables.length) {
        throw new AppError("Invalid QR code", 404);
    }

    const table = tables[0];

    if (!table.status) {
        throw new AppError(
            "This table is currently unavailable",
            400
        );
    }


    // 2. Find customer
    const customers = await db.query(
        `SELECT id, name, mobile
         FROM customers
         WHERE mobile = ?`,
        [mobile]
    );

    let customer;


    // 3. Existing customer
    if (customers.length) {

        customer = customers[0];

        // Update name if changed
        if (customer.name !== name) {

            await db.query(
                `UPDATE customers
                 SET name = ?
                 WHERE id = ?`,
                [name, customer.id]
            );

            customer.name = name;
        }

    }

    // 4. New customer
    else {

        const result = await db.query(
            `INSERT INTO customers
             (name, mobile)
             VALUES (?, ?)`,
            [name, mobile]
        );

        customer = {
            id: result.insertId,
            name,
            mobile
        };
    }


    // 5. Check active session for this customer + table
    const sessions = await db.query(
        `SELECT id, session_token
         FROM table_sessions
         WHERE customer_id = ?
         AND table_id = ?
         AND is_active = 1
         LIMIT 1`,
        [customer.id, table.id]
    );

    let session;


    // 6. Existing session
    if (sessions.length) {

        session = sessions[0];

    }

    // 7. Create new session
    else {

        const sessionToken = uuid();

        const result = await db.query(
            `INSERT INTO table_sessions
             (session_token, customer_id, table_id)
             VALUES (?, ?, ?)`,
            [
                sessionToken,
                customer.id,
                table.id
            ]
        );

        session = {
            id: result.insertId,
            session_token: sessionToken
        };
    }


    // 8. Generate customer JWT
    const token = jwt.sign(
        {
            customerId: customer.id,
            sessionId: session.id,
            tableId: table.id
        },
        env.CUSTOMER_JWT_SECRET,
        {
            expiresIn: "12h"
        }
    );


    // 9. Return everything frontend needs
    return {
        customer: {
            id: customer.id,
            name: customer.name,
            mobile: customer.mobile
        },

        table: {
            id: table.id,
            table_number: table.table_number
        },

        session: {
            id: session.id,
            session_token: session.session_token
        },

        token
    };
};

const createTakeawaySession = async ({ name, mobile }) => {

    if (!name || !mobile) {
        throw new AppError(
            "Name and mobile number are required",
            400
        );
    }

    // Find existing customer
    let customers = await db.query(
        `SELECT id, name, mobile
         FROM customers
         WHERE mobile = ?
         LIMIT 1`,
        [mobile]
    );

    let customer;

    if (customers.length) {

        customer = customers[0];

        // Keep latest name
        await db.query(
            `UPDATE customers
             SET name = ?
             WHERE id = ?`,
            [name, customer.id]
        );

        customer.name = name;

    } else {

        const result = await db.query(
            `INSERT INTO customers
            (name, mobile)
            VALUES (?, ?)`,
            [name, mobile]
        );

        customer = {
            id: result.insertId,
            name,
            mobile
        };
    }


    // Create takeaway session
    const sessionToken = crypto.randomUUID();

    const sessionResult = await db.query(
        `INSERT INTO table_sessions
    (
        customer_id,
        table_id,
        session_token,
        session_type
    )
    VALUES (?, NULL, ?, 'Takeaway')`,
        [
            customer.id,
            sessionToken
        ]
    );

    const sessionId = sessionResult.insertId;


    // IMPORTANT:
    // Use the same JWT payload/secret that your
    // existing customer session uses.
    const token = jwt.sign(
        {
            customerId: customer.id,
            sessionId: sessionId
        },
        env.CUSTOMER_JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );


    return {
        customer: {
            id: customer.id,
            name: customer.name,
            mobile: customer.mobile
        },

        session: {
            id: sessionId,
            session_type: "Takeaway"
        },

        token
    };
};


module.exports = {
    createCustomerSession,
    createTakeawaySession
};