const db = require("../../config/database");

/*
|--------------------------------------------------------------------------
| Dashboard Service
|--------------------------------------------------------------------------
|
| This service is responsible for preparing all data required by the
| Admin Dashboard.
|
| It provides:
| - Order statistics
| - Revenue statistics
| - Kitchen order statistics
| - Table occupancy statistics
| - Customer statistics
| - Completed order statistics
| - Sales chart data
| - Recent orders
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Get Date Condition
|--------------------------------------------------------------------------
|
| Creates the SQL date condition according to the selected dashboard
| period.
|
| Supported periods:
|
| Today
|     -> Orders created today
|
| This Week
|     -> Last 7 days including today
|
| This Month
|     -> Current calendar month
|
| The column name is passed as an argument because different queries
| may use different table aliases.
|
|--------------------------------------------------------------------------
*/

const getDateCondition = (period, column = "created_at") => {

    switch (period) {

        /*
        |--------------------------------------------------------------------------
        | This Week
        |--------------------------------------------------------------------------
        | Include today and the previous 6 days.
        |--------------------------------------------------------------------------
        */

        case "This Week":

            return `
                ${column} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                AND ${column} < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
            `;


        /*
        |--------------------------------------------------------------------------
        | This Month
        |--------------------------------------------------------------------------
        | Start from the first day of the current month and stop before
        | the first day of the next month.
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | Today
        |--------------------------------------------------------------------------
        | Default period.
        |--------------------------------------------------------------------------
        */

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
| Get Dashboard Stats
|--------------------------------------------------------------------------
|
| Returns all numbers displayed in the dashboard statistic cards and
| Quick Overview section.
|
|--------------------------------------------------------------------------
*/

const getDashboardStats = async (period = "Today") => {

    /*
    |--------------------------------------------------------------------------
    | Create the date filter for order-based statistics.
    |--------------------------------------------------------------------------
    */

    const dateCondition =
        getDateCondition(
            period,
            "o.created_at"
        );


    /*
    |--------------------------------------------------------------------------
    | Get all dashboard statistics in one database query.
    |--------------------------------------------------------------------------
    */

    const [[stats]] = await db.query(`

        SELECT

            /*
            |--------------------------------------------------------------------------
            | TOTAL ORDERS
            |--------------------------------------------------------------------------
            | Number of orders created during the selected period.
            |--------------------------------------------------------------------------
            */

            (
                SELECT COUNT(*)

                FROM orders o

                WHERE ${dateCondition}

            ) AS orders,


            /*
            |--------------------------------------------------------------------------
            | TOTAL REVENUE
            |--------------------------------------------------------------------------
            | Adds the total of all non-cancelled orders.
            |
            | Cancelled orders are intentionally excluded from revenue.
            |--------------------------------------------------------------------------
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
            | ACTIVE KITCHEN ORDERS
            |--------------------------------------------------------------------------
            | Orders that still require kitchen action.
            |
            | These orders are:
            | Pending
            | Preparing
            | Ready
            |--------------------------------------------------------------------------
            */

            (
                SELECT COUNT(*)

                FROM orders o

                WHERE o.status IN (
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
            | A table is considered occupied only when:
            |
            | 1. It has an active session.
            | 2. The session is a DineIn session.
            | 3. The session belongs to a valid table.
            | 4. The table itself is active.
            | 5. At least one order for that session is still active.
            |
            | Active order statuses:
            |
            | Pending
            | Preparing
            | Ready
            |
            | This prevents a table from being shown as occupied when all
            | of its orders have already been Served or Cancelled.
            |--------------------------------------------------------------------------
            */

            (
                SELECT COUNT(DISTINCT ts.table_id)

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
            |
            | Counts all active restaurant tables.
            |
            | Inactive tables are not included.
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
            | Counts unique customers who placed an order during the
            | selected period.
            |
            | Walk-in orders without a customer_id are ignored.
            |--------------------------------------------------------------------------
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
            | An order is considered completed when its status is Served.
            |--------------------------------------------------------------------------
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
    | Convert database values into JavaScript numbers.
    |--------------------------------------------------------------------------
    */

    const totalTables =
        Number(stats.total_tables || 0);

    const activeTables =
        Number(stats.active_tables || 0);


    /*
    |--------------------------------------------------------------------------
    | Calculate available tables.
    |--------------------------------------------------------------------------
    |
    | Available tables = Total tables - Occupied tables
    |
    | Math.max() prevents the result from becoming negative.
    |--------------------------------------------------------------------------
    */

    const availableTables =
        Math.max(
            totalTables - activeTables,
            0
        );


    /*
    |--------------------------------------------------------------------------
    | Return dashboard statistics.
    |--------------------------------------------------------------------------
    */

    return {

        orders:
            Number(stats.orders || 0),

        revenue:
            Number(stats.revenue || 0),

        pending_orders:
            Number(stats.pending_orders || 0),

        active_tables:
            activeTables,

        total_tables:
            totalTables,

        available_tables:
            availableTables,

        customers:
            Number(stats.customers || 0),

        completed_orders:
            Number(stats.completed_orders || 0)
    };
};


/*
|--------------------------------------------------------------------------
| Sales Overview
|--------------------------------------------------------------------------
|
| Provides the revenue data used by the Sales Overview chart.
|
| The same period selected on the dashboard is used here.
|
|--------------------------------------------------------------------------
*/

const getSalesOverview = async (period = "Today") => {

    /*
    |--------------------------------------------------------------------------
    | Create the date condition.
    |--------------------------------------------------------------------------
    */

    const dateCondition =
        getDateCondition(
            period,
            "created_at"
        );


    /*
    |--------------------------------------------------------------------------
    | Get revenue grouped by date.
    |--------------------------------------------------------------------------
    |
    | Cancelled orders are excluded.
    |--------------------------------------------------------------------------
    */

    const [sales] = await db.query(`

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


    /*
    |--------------------------------------------------------------------------
    | Convert database values into JavaScript-friendly values.
    |--------------------------------------------------------------------------
    */

    return sales.map((item) => ({

        date:
            item.date,

        revenue:
            Number(item.revenue || 0)

    }));
};


/*
|--------------------------------------------------------------------------
| Recent Orders
|--------------------------------------------------------------------------
|
| Returns the latest 10 orders for the Recent Orders table.
|
|--------------------------------------------------------------------------
*/

const getRecentOrders = async () => {

    /*
    |--------------------------------------------------------------------------
    | Get the latest 10 orders.
    |--------------------------------------------------------------------------
    */

    const [orders] = await db.query(`

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


    /*
    |--------------------------------------------------------------------------
    | Format the database result for the frontend.
    |--------------------------------------------------------------------------
    */

    return orders.map((order) => ({

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
            Number(order.total || 0),

        status:
            order.status,

        created_at:
            order.created_at

    }));
};


/*
|--------------------------------------------------------------------------
| Complete Dashboard
|--------------------------------------------------------------------------
|
| Combines:
|
| - Dashboard statistics
| - Sales overview
| - Recent orders
|
| Promise.all() allows all three database operations to run together
| instead of waiting for each one individually.
|
|--------------------------------------------------------------------------
*/

const getDashboard = async (period = "Today") => {

    /*
    |--------------------------------------------------------------------------
    | Only allow supported dashboard periods.
    |--------------------------------------------------------------------------
    */

    const allowedPeriods = [
        "Today",
        "This Week",
        "This Month"
    ];


    /*
    |--------------------------------------------------------------------------
    | If an invalid period is supplied, fall back to Today.
    |--------------------------------------------------------------------------
    */

    if (!allowedPeriods.includes(period)) {

        period = "Today";

    }


    /*
    |--------------------------------------------------------------------------
    | Load all dashboard sections.
    |--------------------------------------------------------------------------
    */

    const [
        stats,
        sales,
        recentOrders
    ] = await Promise.all([

        getDashboardStats(period),

        getSalesOverview(period),

        getRecentOrders()

    ]);


    /*
    |--------------------------------------------------------------------------
    | Return the complete dashboard response.
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
| Export Dashboard Services
|--------------------------------------------------------------------------
*/

module.exports = {

    getDashboard,

    getDashboardStats,

    getSalesOverview,

    getRecentOrders

};