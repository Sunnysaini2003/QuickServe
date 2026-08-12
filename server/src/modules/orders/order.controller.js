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

module.exports = {
    createOrder,
    getCurrentOrders,
    getOrderById,
    getOrderHistory
};