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


// ADMIN ORDERS


const getAdminOrders = async ({
    search = "",
    status = "",
    orderMode = "",
    orderType = "",
    page = 1,
    limit = 10
}) => {

    const currentPage = Math.max(
        Number(page) || 1,
        1
    );

    const currentLimit = Math.min(
        Math.max(Number(limit) || 10, 1),
        100
    );

    const offset =
        (currentPage - 1) * currentLimit;

    const conditions = [];
    const params = [];

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search.trim()) {

        const searchValue =
            `%${search.trim()}%`;

        conditions.push(`
            (
                o.order_number LIKE ?
                OR c.name LIKE ?
                OR c.mobile LIKE ?
                OR CAST(rt.table_number AS CHAR) LIKE ?
            )
        `);

        params.push(
            searchValue,
            searchValue,
            searchValue,
            searchValue
        );
    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (status) {

        const allowedStatuses = [
            "Pending",
            "Preparing",
            "Ready",
            "Served",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {

            throw new AppError(
                "Invalid order status",
                400
            );
        }

        conditions.push(
            "o.status = ?"
        );

        params.push(status);
    }


    // --------------------------------------------------------
    // ORDER MODE
    // --------------------------------------------------------

    if (orderMode) {

        if (
            !["DineIn", "Takeaway"]
                .includes(orderMode)
        ) {

            throw new AppError(
                "Invalid order mode",
                400
            );
        }

        conditions.push(
            "o.order_mode = ?"
        );

        params.push(orderMode);
    }


    // --------------------------------------------------------
    // ORDER TYPE
    // --------------------------------------------------------

    if (orderType) {

        if (
            !["New", "Additional"]
                .includes(orderType)
        ) {

            throw new AppError(
                "Invalid order type",
                400
            );
        }

        conditions.push(
            "o.order_type = ?"
        );

        params.push(orderType);
    }


    const whereClause =
        conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";


    // --------------------------------------------------------
    // TOTAL COUNT
    // --------------------------------------------------------

    const countRows = await db.query(
        `
            SELECT COUNT(*) AS total

            FROM orders o

            LEFT JOIN table_sessions ts
                ON ts.id = o.session_id

            LEFT JOIN customers c
                ON c.id = ts.customer_id

            LEFT JOIN restaurant_tables rt
                ON rt.id = ts.table_id

            ${whereClause}
        `,
        params
    );


    const total =
        Number(countRows[0]?.total || 0);


    // --------------------------------------------------------
    // ORDERS
    // --------------------------------------------------------

  const orders = await db.query(
    `
        SELECT

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

            ts.customer_id,
            ts.table_id,

            c.name AS customer_name,
            c.mobile AS customer_mobile,

            rt.table_number

        FROM orders o

        LEFT JOIN table_sessions ts
            ON ts.id = o.session_id

        LEFT JOIN customers c
            ON c.id = ts.customer_id

        LEFT JOIN restaurant_tables rt
            ON rt.id = ts.table_id

        ${whereClause}

        ORDER BY o.created_at DESC

        LIMIT ${currentLimit}
        OFFSET ${offset}
    `,
    params
);


    // --------------------------------------------------------
    // ORDER ITEMS
    // --------------------------------------------------------

    for (const order of orders) {

        order.items = await db.query(
            `
                SELECT

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

                ORDER BY oi.id ASC
            `,
            [order.id]
        );
    }


    return {
        orders,

        pagination: {
            page: currentPage,
            limit: currentLimit,
            total,
            totalPages:
                Math.ceil(
                    total / currentLimit
                )
        }
    };
};



// ADMIN ORDER DETAILS


const getAdminOrderById = async (
    orderId
) => {

    const orders = await db.query(
        `
            SELECT

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

                ts.customer_id,
                ts.table_id,

                c.name AS customer_name,
                c.mobile AS customer_phone,

                rt.table_number

            FROM orders o

            LEFT JOIN table_sessions ts
                ON ts.id = o.session_id

            LEFT JOIN customers c
                ON c.id = ts.customer_id

            LEFT JOIN restaurant_tables rt
                ON rt.id = ts.table_id

            WHERE o.id = ?

            LIMIT 1
        `,
        [orderId]
    );


    if (!orders.length) {

        throw new AppError(
            "Order not found",
            404
        );
    }


    const order = orders[0];


    order.items = await db.query(
        `
            SELECT

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

            ORDER BY oi.id ASC
        `,
        [orderId]
    );


    return order;
};

const updateOrderStatus = async (orderId, status) => {

    const allowedStatuses = [
        "Pending",
        "Preparing",
        "Ready",
        "Served",
        "Cancelled"
    ];

    // ---------------------------------------------------------
    // Validate status
    // ---------------------------------------------------------

    if (!allowedStatuses.includes(status)) {
        throw new AppError(
            "Invalid order status",
            400
        );
    }


    // ---------------------------------------------------------
    // Get current order
    // ---------------------------------------------------------

    const orders = await db.query(
        `SELECT
            id,
            session_id,
            status
         FROM orders
         WHERE id = ?`,
        [orderId]
    );

    if (!orders.length) {
        throw new AppError(
            "Order not found",
            404
        );
    }


    const currentOrder = orders[0];

    const currentStatus = currentOrder.status;
    const sessionId = currentOrder.session_id;


    // ---------------------------------------------------------
    // Prevent changing completed/cancelled orders
    // ---------------------------------------------------------

    if (
        currentStatus === "Served" ||
        currentStatus === "Cancelled"
    ) {
        throw new AppError(
            `Order is already ${currentStatus}`,
            400
        );
    }


    // ---------------------------------------------------------
    // Update order status
    // ---------------------------------------------------------

    if (status === "Preparing") {

        await db.query(
            `UPDATE orders
             SET
                status = ?,
                preparing_at = COALESCE(
                    preparing_at,
                    CURRENT_TIMESTAMP
                )
             WHERE id = ?`,
            [status, orderId]
        );

    } else if (status === "Ready") {

        await db.query(
            `UPDATE orders
             SET
                status = ?,
                ready_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [status, orderId]
        );

    } else {

        await db.query(
            `UPDATE orders
             SET status = ?
             WHERE id = ?`,
            [status, orderId]
        );
    }


    // ---------------------------------------------------------
    // CLOSE TABLE SESSION
    //
    // Only when order becomes Served/Cancelled
    // AND there are no other active orders in this session.
    // ---------------------------------------------------------

    if (
        status === "Served" ||
        status === "Cancelled"
    ) {

        const activeOrders = await db.query(
            `SELECT
                id
             FROM orders
             WHERE session_id = ?
             AND status IN (
                'Pending',
                'Preparing',
                'Ready'
             )
             LIMIT 1`,
            [sessionId]
        );


        // -----------------------------------------------------
        // No active orders remaining
        // -----------------------------------------------------

        if (activeOrders.length === 0) {

            await db.query(
                `UPDATE table_sessions
                 SET
                    is_active = 0,
                    ended_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                 AND is_active = 1`,
                [sessionId]
            );

        }
    }


    // ---------------------------------------------------------
    // Get updated order
    // ---------------------------------------------------------

    const updated = await db.query(
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
            o.created_at,
            o.updated_at,
            rt.table_number
         FROM orders o
         LEFT JOIN table_sessions ts
            ON ts.id = o.session_id
         LEFT JOIN restaurant_tables rt
            ON rt.id = ts.table_id
         WHERE o.id = ?`,
        [orderId]
    );


    if (!updated.length) {
        throw new AppError(
            "Updated order could not be found",
            500
        );
    }


    return updated[0];
};

module.exports = {
    createOrder,
    getCurrentOrders,
    getOrderById,
    getOrderHistory,
    // ADMIN ROUTES 
    getAdminOrders,
    getAdminOrderById,
    updateOrderStatus

};