const { v4: uuid } = require("uuid");
const jwt = require("jsonwebtoken");

const db = require("../../utils/db");
const AppError = require("../../utils/AppError");
const env = require("../../config/env");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");


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

const registerCustomer = async ({
    name,
    mobile,
    email,
    password
}) => {

    name = String(name || "").trim();

    mobile = String(mobile || "")
        .replace(/\D/g, "")
        .slice(0, 10);

    email = String(email || "")
        .trim()
        .toLowerCase();

    password = String(password || "");

    if (!name) {
        throw new AppError(
            "Name is required",
            400
        );
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
        throw new AppError(
            "Enter a valid Indian mobile number",
            400
        );
    }

    if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        throw new AppError(
            "Enter a valid email address",
            400
        );
    }

    if (password.length < 6) {
        throw new AppError(
            "Password must be at least 6 characters",
            400
        );
    }


    // ----------------------------------------------------
    // CHECK MOBILE
    // ----------------------------------------------------

    const existingMobile =
        await db.query(
            `
            SELECT id
            FROM customers
            WHERE mobile = ?
            LIMIT 1
            `,
            [mobile]
        );

    if (existingMobile.length) {
        throw new AppError(
            "An account with this mobile number already exists",
            409
        );
    }


    // ----------------------------------------------------
    // CHECK EMAIL
    // ----------------------------------------------------

    const existingEmail =
        await db.query(
            `
            SELECT id
            FROM customers
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

    if (existingEmail.length) {
        throw new AppError(
            "An account with this email already exists",
            409
        );
    }


    // ----------------------------------------------------
    // HASH PASSWORD
    // ----------------------------------------------------

    const passwordHash =
        await bcrypt.hash(
            password,
            12
        );


    // ----------------------------------------------------
    // CREATE CUSTOMER
    // ----------------------------------------------------

    const result =
        await db.query(
            `
            INSERT INTO customers
            (
                name,
                mobile,
                email,
                password_hash,
                is_active
            )
            VALUES (?, ?, ?, ?, 1)
            `,
            [
                name,
                mobile,
                email,
                passwordHash
            ]
        );


    const customerId =
        result.insertId;


    // ----------------------------------------------------
    // CUSTOMER ACCOUNT TOKEN
    // ----------------------------------------------------

    const token =
        jwt.sign(
            {
                customerId,
                role: "customer"
            },
            env.CUSTOMER_JWT_SECRET,
            {
                expiresIn: "30d"
            }
        );


    return {

        customer: {
            id: customerId,
            name,
            mobile,
            email
        },

        token

    };
};


const loginCustomer = async ({
    mobile,
    password
}) => {

    mobile = String(mobile || "")
        .replace(/\D/g, "")
        .slice(0, 10);

    password = String(password || "");


    if (!/^[6-9]\d{9}$/.test(mobile)) {
        throw new AppError(
            "Enter a valid Indian mobile number",
            400
        );
    }


    if (!password) {
        throw new AppError(
            "Password is required",
            400
        );
    }


    const customers =
        await db.query(
            `
            SELECT
                id,
                name,
                mobile,
                email,
                password_hash,
                is_active
            FROM customers
            WHERE mobile = ?
            LIMIT 1
            `,
            [mobile]
        );


    if (!customers.length) {
        throw new AppError(
            "Invalid mobile number or password",
            401
        );
    }


    const customer =
        customers[0];


    if (!customer.is_active) {
        throw new AppError(
            "Your account is inactive",
            403
        );
    }


    if (!customer.password_hash) {
        throw new AppError(
            "This account does not have a password. Please create an account.",
            400
        );
    }


    const passwordValid =
        await bcrypt.compare(
            password,
            customer.password_hash
        );


    if (!passwordValid) {
        throw new AppError(
            "Invalid mobile number or password",
            401
        );
    }


    await db.query(
        `
        UPDATE customers
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [customer.id]
    );


    const token =
        jwt.sign(
            {
                customerId:
                    customer.id,

                role:
                    "customer"
            },
            env.CUSTOMER_JWT_SECRET,
            {
                expiresIn: "30d"
            }
        );


    return {

        customer: {
            id:
                customer.id,

            name:
                customer.name,

            mobile:
                customer.mobile,

            email:
                customer.email
        },

        token

    };
};

module.exports = {
    createCustomerSession,
    createTakeawaySession,
    registerCustomer,
    loginCustomer
};