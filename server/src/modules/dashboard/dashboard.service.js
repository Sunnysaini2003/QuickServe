const db = require("../../config/database");

/*
|--------------------------------------------------------------------------
| Dashboard Service
|--------------------------------------------------------------------------
|
| Provides all data required by the Admin Dashboard:
|
| - Total orders
| - Revenue
| - Pending / active kitchen orders
| - Occupied tables
| - Available tables
| - Total tables
| - Customers
| - Completed orders
| - Sales overview
| - Recent orders
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| GET DATE CONDITION
|--------------------------------------------------------------------------
|
| Supported periods:
|
| Today
| This Week
| This Month
|
|--------------------------------------------------------------------------
*/

const getDateCondition = (
    period,
    column = "created_at"
) => {

    switch (period) {

        case "This Week":

            return `
                ${column} >= DATE_SUB(
                    CURDATE(),
                    INTERVAL 6 DAY
                )

                AND ${column} < DATE_ADD(
                    CURDATE(),
                    INTERVAL 1 DAY
                )
            `;


        case "This Month":

            return `
                ${column} >= DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                )

                AND ${column} < DATE_ADD(
                    DATE_FORMAT(
                        CURDATE(),
                        '%Y-%m-01'
                    ),
                    INTERVAL 1 MONTH
                )
            `;


        case "Today":

        default:

            return `
                ${column} >= CURDATE()

                AND ${column} < DATE_ADD(
                    CURDATE(),
                    INTERVAL 1 DAY
                )
            `;
    }
};


/*
|--------------------------------------------------------------------------
| GET DASHBOARD STATS
|--------------------------------------------------------------------------
*/

const getDashboardStats = async (
    period = "Today"
) => {

    /*
    |--------------------------------------------------------------------------
    | Order date condition
    |--------------------------------------------------------------------------
    */

    const dateCondition =
        getDateCondition(
            period,
            "o.created_at"
        );


    /*
    |--------------------------------------------------------------------------
    | Dashboard statistics
    |--------------------------------------------------------------------------
    */

    const [[stats]] =
        await db.query(`

            SELECT

                /*
                |--------------------------------------------------------------------------
                | TOTAL ORDERS
                |--------------------------------------------------------------------------
                */

                (
                    SELECT COUNT(*)

                    FROM orders o

                    WHERE ${dateCondition}

                ) AS orders,


                /*
                |--------------------------------------------------------------------------
                | REVENUE
                |--------------------------------------------------------------------------
                |
                | Cancelled orders are excluded.
                |
                */

                (
                    SELECT COALESCE(
                        SUM(o.total),
                        0
                    )

                    FROM orders o

                    WHERE ${dateCondition}

                    AND o.status <> 'Cancelled'

                ) AS revenue,


                /*
                |--------------------------------------------------------------------------
                | PENDING / ACTIVE ORDERS
                |--------------------------------------------------------------------------
                |
                | These are orders which are still part of the
                | active kitchen workflow:
                |
                | Pending
                | Preparing
                | Ready
                |
                | IMPORTANT:
                |
                | This is now limited to the selected dashboard
                | period.
                |
                */

                (
                    SELECT COUNT(*)

                    FROM orders o

                    WHERE ${dateCondition}

                    AND o.status IN (
                        'Pending',
                        'Preparing',
                        'Ready'
                    )

                ) AS pending_orders,


                /*
                |--------------------------------------------------------------------------
                | OCCUPIED TABLES
                |--------------------------------------------------------------------------
                |
                | A table is occupied when:
                |
                | 1. It belongs to an active restaurant table.
                | 2. It has a valid table session.
                | 3. The session is active.
                | 4. The session is DineIn.
                | 5. The session has at least one active order.
                |
                | We count DISTINCT table_id so that:
                |
                | One table
                |   -> Order 1
                |   -> Order 2
                |   -> Order 3
                |
                | still counts as:
                |
                | 1 occupied table.
                |
                */

                (
                    SELECT COUNT(
                        DISTINCT ts.table_id
                    )

                    FROM table_sessions ts

                    INNER JOIN restaurant_tables rt
                        ON rt.id = ts.table_id

                    INNER JOIN orders o
                        ON o.session_id = ts.id

                    WHERE ts.is_active = 1

                    AND ts.session_type = 'DineIn'

                    AND ts.table_id IS NOT NULL

                    AND rt.status = 1

                    AND o.status IN (
                        'Pending',
                        'Preparing',
                        'Ready'
                    )

                ) AS active_tables,


                /*
                |--------------------------------------------------------------------------
                | TOTAL TABLES
                |--------------------------------------------------------------------------
                */

                (
                    SELECT COUNT(*)

                    FROM restaurant_tables rt

                    WHERE rt.status = 1

                ) AS total_tables,


                /*
                |--------------------------------------------------------------------------
                | CUSTOMERS
                |--------------------------------------------------------------------------
                |
                | Unique customers who placed an order
                | during the selected period.
                |
                */

                (
                    SELECT COUNT(
                        DISTINCT o.customer_id
                    )

                    FROM orders o

                    WHERE ${dateCondition}

                    AND o.customer_id IS NOT NULL

                ) AS customers,


                /*
                |--------------------------------------------------------------------------
                | COMPLETED ORDERS
                |--------------------------------------------------------------------------
                |
                | Served orders are completed.
                |
                */

                (
                    SELECT COUNT(*)

                    FROM orders o

                    WHERE ${dateCondition}

                    AND o.status = 'Served'

                ) AS completed_orders

        `);


    /*
    |--------------------------------------------------------------------------
    | Convert values to numbers
    |--------------------------------------------------------------------------
    */

    const totalTables =
        Number(
            stats?.total_tables || 0
        );


    const activeTables =
        Number(
            stats?.active_tables || 0
        );


    /*
    |--------------------------------------------------------------------------
    | Available tables
    |--------------------------------------------------------------------------
    */

    const availableTables =
        Math.max(
            totalTables -
            activeTables,
            0
        );


    /*
    |--------------------------------------------------------------------------
    | Return stats
    |--------------------------------------------------------------------------
    */

    return {

        orders:
            Number(
                stats?.orders || 0
            ),

        revenue:
            Number(
                stats?.revenue || 0
            ),

        pending_orders:
            Number(
                stats?.pending_orders || 0
            ),

        active_tables:
            activeTables,

        total_tables:
            totalTables,

        available_tables:
            availableTables,

        customers:
            Number(
                stats?.customers || 0
            ),

        completed_orders:
            Number(
                stats?.completed_orders || 0
            )

    };
};


/*
|--------------------------------------------------------------------------
| SALES OVERVIEW
|--------------------------------------------------------------------------
*/

const getSalesOverview = async (
    period = "Today"
) => {

    const dateCondition =
        getDateCondition(
            period,
            "created_at"
        );


    const [sales] =
        await db.query(`

            SELECT

                DATE(created_at) AS date,

                COALESCE(
                    SUM(total),
                    0
                ) AS revenue

            FROM orders

            WHERE ${dateCondition}

            AND status <> 'Cancelled'

            GROUP BY DATE(created_at)

            ORDER BY date ASC

        `);


    return sales.map(
        (item) => ({

            date:
                item.date,

            revenue:
                Number(
                    item.revenue || 0
                )

        })
    );
};


/*
|--------------------------------------------------------------------------
| RECENT ORDERS
|--------------------------------------------------------------------------
*/

const getRecentOrders = async () => {

    const [orders] =
        await db.query(`

            SELECT

                o.id,

                o.order_number,

                o.order_mode,

                o.order_type,

                o.status,

                o.total,

                o.created_at,

                c.name AS customer_name

            FROM orders o

            LEFT JOIN customers c
                ON c.id = o.customer_id

            ORDER BY
                o.created_at DESC

            LIMIT 10

        `);


    return orders.map(
        (order) => ({

            id:
                order.id,

            order_number:
                order.order_number,

            customer:
                order.customer_name ||
                "Walk-in Customer",

            type:
                order.order_mode,

            amount:
                Number(
                    order.total || 0
                ),

            status:
                order.status,

            created_at:
                order.created_at

        })
    );
};


/*
|--------------------------------------------------------------------------
| GET COMPLETE DASHBOARD
|--------------------------------------------------------------------------
*/

const getDashboard = async (
    period = "Today"
) => {

    /*
    |--------------------------------------------------------------------------
    | Validate period
    |--------------------------------------------------------------------------
    */

    const allowedPeriods = [

        "Today",

        "This Week",

        "This Month"

    ];


    if (
        !allowedPeriods.includes(
            period
        )
    ) {

        period = "Today";

    }


    /*
    |--------------------------------------------------------------------------
    | Load dashboard sections
    |--------------------------------------------------------------------------
    */

    const [
        stats,
        sales,
        recentOrders
    ] = await Promise.all([

        getDashboardStats(
            period
        ),

        getSalesOverview(
            period
        ),

        getRecentOrders()

    ]);


    /*
    |--------------------------------------------------------------------------
    | Return dashboard
    |--------------------------------------------------------------------------
    */

    return {

        period,

        stats,

        sales,

        recent_orders:
            recentOrders

    };
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {

    getDashboard,

    getDashboardStats,

    getSalesOverview,

    getRecentOrders

};