const db = require("../../utils/db");
const AppError = require("../../utils/AppError");

const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-8);

    const random = Math.floor(
        100 + Math.random() * 900
    );

    return `QS-${timestamp}-${random}`;
};


const createOrder = async ({
    sessionId,
    items,
    notes
}) => {

    if (!items || !items.length) {
        throw new AppError(
            "Order must contain at least one item",
            400
        );
    }

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();


        // ------------------------------------------------
        // 1. Verify active customer session
        // ------------------------------------------------

        const [sessionRows] = await connection.query(
            `SELECT
                ts.id,
                ts.customer_id,
                ts.table_id,
                ts.session_type,
                rt.table_number
             FROM table_sessions ts
             LEFT JOIN restaurant_tables rt
                ON rt.id = ts.table_id
             WHERE ts.id = ?
             AND ts.is_active = 1
             LIMIT 1`,
            [sessionId]
        );


        if (!sessionRows.length) {

            throw new AppError(
                "Active customer session not found",
                404
            );

        }


        const session = sessionRows[0];


        // ------------------------------------------------
        // 2. Determine Order Mode
        // ------------------------------------------------

        const orderMode =
            session.session_type === "Takeaway"
                ? "Takeaway"
                : "DineIn";


        // ------------------------------------------------
        // 3. Check Existing Pending Order
        // ------------------------------------------------

        const [existingOrders] = await connection.query(
            `SELECT *
             FROM orders
             WHERE session_id = ?
             AND status = 'Pending'
             ORDER BY id DESC
             LIMIT 1`,
            [sessionId]
        );


        let orderId;


        // ------------------------------------------------
        // 4. Existing Pending Order
        // ------------------------------------------------

        if (existingOrders.length) {

            orderId = existingOrders[0].id;

        }


        // ------------------------------------------------
        // 5. Create New Order
        // ------------------------------------------------

        else {

            const [sessionOrders] = await connection.query(
                `SELECT id
                 FROM orders
                 WHERE session_id = ?
                 LIMIT 1`,
                [sessionId]
            );


            const orderType =
                sessionOrders.length > 0
                    ? "Additional"
                    : "New";


            const orderNumber =
                generateOrderNumber();


            const [result] = await connection.query(
                `INSERT INTO orders
                (
                    order_number,
                    session_id,
                    order_type,
                    order_mode,
                    status,
                    total,
                    notes,
                    estimated_ready_time
                )
                VALUES (?, ?, ?, ?, 'Pending', 0, ?, 15)`,
                [
                    orderNumber,
                    sessionId,
                    orderType,
                    orderMode,
                    notes || null
                ]
            );


            orderId = result.insertId;

        }


        // ------------------------------------------------
        // 6. Process Items
        // ------------------------------------------------

        for (const item of items) {

            const [menuRows] = await connection.query(
                `SELECT
                    id,
                    name,
                    price,
                    is_available
                 FROM menu_items
                 WHERE id = ?
                 LIMIT 1`,
                [item.menu_id]
            );


            if (!menuRows.length) {

                throw new AppError(
                    `Menu item ${item.menu_id} not found`,
                    404
                );

            }


            const menuItem = menuRows[0];


            if (!menuItem.is_available) {

                throw new AppError(
                    `${menuItem.name} is currently unavailable`,
                    400
                );

            }


            const quantity = Number(item.quantity);


            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                throw new AppError(
                    `Invalid quantity for ${menuItem.name}`,
                    400
                );

            }


            const price = Number(menuItem.price);

            const subtotal = price * quantity;


            // ------------------------------------------------
            // Check Existing Item
            // ------------------------------------------------

            const [existingItems] = await connection.query(
                `SELECT
                    id,
                    quantity
                 FROM order_items
                 WHERE order_id = ?
                 AND menu_item_id = ?
                 LIMIT 1`,
                [
                    orderId,
                    menuItem.id
                ]
            );


            if (existingItems.length) {

                const newQuantity =
                    Number(existingItems[0].quantity) +
                    quantity;


                const newSubtotal =
                    price * newQuantity;


                await connection.query(
                    `UPDATE order_items
                     SET
                        quantity = ?,
                        price = ?,
                        subtotal = ?
                     WHERE id = ?`,
                    [
                        newQuantity,
                        price,
                        newSubtotal,
                        existingItems[0].id
                    ]
                );

            } else {

                await connection.query(
                    `INSERT INTO order_items
                    (
                        order_id,
                        menu_item_id,
                        quantity,
                        price,
                        subtotal
                    )
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        orderId,
                        menuItem.id,
                        quantity,
                        price,
                        subtotal
                    ]
                );

            }

        }


        // ------------------------------------------------
        // 7. Recalculate Complete Order Total
        // ------------------------------------------------

        const [totalRows] = await connection.query(
            `SELECT
                COALESCE(SUM(subtotal), 0) AS total
             FROM order_items
             WHERE order_id = ?`,
            [orderId]
        );


        const total =
            Number(totalRows[0].total);


        // ------------------------------------------------
        // 8. Update Order
        // ------------------------------------------------

        await connection.query(
            `UPDATE orders
             SET
                total = ?,
                notes = COALESCE(?, notes)
             WHERE id = ?`,
            [
                total,
                notes || null,
                orderId
            ]
        );


        // ------------------------------------------------
        // 9. Get Complete Order
        // ------------------------------------------------

        const [orderRows] = await connection.query(
            `SELECT
                o.id,
                o.order_number,
                o.session_id,
                o.order_type,
                o.order_mode,
                o.status,
                o.total,
                o.notes,
                o.estimated_ready_time,
                o.preparing_at,
                o.ready_at,
                o.created_at,
                rt.table_number
             FROM orders o
             INNER JOIN table_sessions ts
                ON ts.id = o.session_id
             LEFT JOIN restaurant_tables rt
                ON rt.id = ts.table_id
             WHERE o.id = ?`,
            [orderId]
        );


        const [orderItems] = await connection.query(
            `SELECT
                oi.id,
                oi.menu_item_id,
                m.name,
                oi.quantity,
                oi.price,
                oi.subtotal
             FROM order_items oi
             INNER JOIN menu_items m
                ON m.id = oi.menu_item_id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`,
            [orderId]
        );


        await connection.commit();


        return {
            ...orderRows[0],
            items: orderItems
        };


    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();

    }
};

const getOrderById = async (orderId, sessionId) => {

 
    const orderRows = await db.query(
        `SELECT
        o.id,
        o.order_number,
        o.session_id,
        o.order_type,
        o.order_mode,
        o.status,
        o.total,
        o.notes,
        o.estimated_ready_time,
        o.preparing_at,
        o.ready_at,
        o.created_at,
        o.updated_at,
        rt.table_number
     FROM orders o
     LEFT JOIN table_sessions ts
        ON ts.id = o.session_id
     LEFT JOIN restaurant_tables rt
        ON rt.id = ts.table_id
     WHERE o.id = ?
     AND o.session_id = ?
     LIMIT 1`,
        [orderId, sessionId]
    );


    if (!orderRows.length) {
        throw new AppError(
            "Order not found",
            404
        );
    }

    const items = await db.query(
        `SELECT
            oi.id,
            oi.menu_item_id,
            m.name,
            oi.quantity,
            oi.price,
            oi.subtotal
         FROM order_items oi
         INNER JOIN menu_items m
            ON m.id = oi.menu_item_id
         WHERE oi.order_id = ?
         ORDER BY oi.id ASC`,
        [orderId]
    );

    return {
        ...orderRows[0],
        items
    };
};


const getCurrentOrders = async (sessionId) => {

    const orders = await db.query(
        `SELECT
            o.id,
            o.order_number,
            o.session_id,
            o.order_type,
            o.status,
            o.total,
            o.notes,
            o.estimated_ready_time,
            o.created_at,
            o.updated_at,
            rt.table_number
         FROM orders o
         INNER JOIN table_sessions ts
            ON ts.id = o.session_id
         INNER JOIN restaurant_tables rt
            ON rt.id = ts.table_id
         WHERE o.session_id = ?
         AND o.status IN ('Pending', 'Preparing', 'Ready')
         ORDER BY o.id ASC`,
        [sessionId]
    );

    for (const order of orders) {

        order.items = await db.query(
            `SELECT
                oi.id,
                oi.menu_item_id,
                m.name,
                oi.quantity,
                oi.price,
                oi.subtotal
             FROM order_items oi
             INNER JOIN menu_items m
                ON m.id = oi.menu_item_id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`,
            [order.id]
        );
    }

    return orders;
};

const getOrderHistory = async (sessionId) => {

    const orders = await db.query(
        `SELECT
            o.id,
            o.order_number,
            o.session_id,
            o.order_type,
            o.order_mode,
            o.status,
            o.total,
            o.notes,
            o.created_at,
            o.updated_at,
            rt.table_number
         FROM orders o
         INNER JOIN table_sessions ts
            ON ts.id = o.session_id
         LEFT JOIN restaurant_tables rt
            ON rt.id = ts.table_id
         WHERE o.session_id = ?
         AND o.status IN ('Served', 'Cancelled')
         ORDER BY o.id DESC`,
        [sessionId]
    );

    for (const order of orders) {

        order.items = await db.query(
            `SELECT
                oi.id,
                oi.menu_item_id,
                m.name,
                oi.quantity,
                oi.price,
                oi.subtotal
             FROM order_items oi
             INNER JOIN menu_items m
                ON m.id = oi.menu_item_id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`,
            [order.id]
        );

    }

    return orders;
};


module.exports = {
    createOrder,
    getCurrentOrders,
    getOrderById,
    getOrderHistory
};