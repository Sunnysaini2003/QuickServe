const orderService = require("./order.service");
const { success } = require("../../utils/apiResponse");

const createOrder = async (req, res, next) => {

    try {

        const order = await orderService.createOrder({
            sessionId: req.customer.sessionId,
            items: req.body.items,
            notes: req.body.notes
        });

        // Send new order to kitchen
        const io = req.app.get("io");

        if (io) {
            io.to("kitchen").emit("new_order", order);
        }

        return success(
            res,
            "Order placed successfully",
            order,
            201
        );

    } catch (error) {

        next(error);

    }
};


const getCurrentOrders = async (req, res, next) => {

    try {

        const orders = await orderService.getCurrentOrders(
            req.customer.sessionId
        );

        return success(
            res,
            "Current orders fetched successfully",
            orders
        );

    } catch (error) {

        next(error);

    }
};

const getOrderById = async (req, res, next) => {

    try {
        const order =
            await orderService.getOrderById(
                req.params.id,
                req.customer.sessionId
            );

        return success(
            res,
            "Order fetched successfully",
            order
        );

    } catch (error) {

        next(error);

    }
};

const getOrderHistory = async (req, res, next) => {

    try {

        const orders =
            await orderService.getOrderHistory(
                req.customer.sessionId
            );

        return success(
            res,
            "Order history fetched successfully",
            orders
        );

    } catch (error) {

        next(error);

    }
};

// ADMIN Routes 


const getAdminOrders = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await orderService.getAdminOrders({
                search:
                    req.query.search || "",

                status:
                    req.query.status || "",

                orderMode:
                    req.query.orderMode || "",

                orderType:
                    req.query.orderType || "",

                page:
                    req.query.page || 1,

                limit:
                    req.query.limit || 10
            });

        return success(
            res,
            "Admin orders fetched successfully",
            result
        );

    } catch (error) {

        next(error);

    }
};


const getAdminOrderById = async (
    req,
    res,
    next
) => {

    try {

        const order =
            await orderService.getAdminOrderById(
                req.params.id
            );

        return success(
            res,
            "Admin order fetched successfully",
            order
        );

    } catch (error) {

        next(error);

    }
};


const updateAdminOrderStatus = async (
    req,
    res,
    next
) => {

    try {

        const order =
            await orderService.updateOrderStatus(
                req.params.id,
                req.body.status
            );


        const io =
            req.app.get("io");


        if (io) {

            if (order.session_id) {

                io.to(
                    `session_${order.session_id}`
                ).emit(
                    "order_status_updated",
                    order
                );
            }

            io.to("kitchen").emit(
                "order_status_updated",
                order
            );
        }


        return success(
            res,
            "Order status updated successfully",
            order
        );

    } catch (error) {

        next(error);

    }
};

module.exports = {
    createOrder,
    getCurrentOrders,
    getOrderById,
    getOrderHistory,
    // ADMIN ROUTES
    getAdminOrders,
    getAdminOrderById,
    updateAdminOrderStatus 
};