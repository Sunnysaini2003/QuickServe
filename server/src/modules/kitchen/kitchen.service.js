const db = require("../../utils/db");
const orderService = require("../orders/order.service");
const AppError = require("../../utils/AppError");


const getKitchenOrders = async () => {
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
            o.estimated_ready_time,
            o.created_at,
            o.updated_at,
            c.name AS customer_name,
            c.mobile AS customer_mobile,
            rt.table_number
         FROM orders o
         INNER JOIN table_sessions ts
            ON ts.id = o.session_id
         LEFT JOIN customers c
            ON c.id = ts.customer_id
         LEFT JOIN restaurant_tables rt
            ON rt.id = ts.table_id
         WHERE o.status IN (
            'Pending',
            'Preparing',
            'Ready'
         )
         ORDER BY
            CASE o.status
                WHEN 'Pending' THEN 1
                WHEN 'Preparing' THEN 2
                WHEN 'Ready' THEN 3
            END,
            o.created_at ASC`
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
    getKitchenOrders,
    updateOrderStatus: orderService.updateOrderStatus
};