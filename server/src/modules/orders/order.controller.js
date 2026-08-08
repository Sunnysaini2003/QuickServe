const orderService = require("./order.service");
const { success } = require("../../utils/apiResponse");

const createOrder = async (req, res, next) => {

    try {

        const order = await orderService.createOrder({
            sessionId: req.customer.sessionId,
            items: req.body.items,
            notes: req.body.notes
        });

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

module.exports = {
    createOrder,
    getCurrentOrders
};