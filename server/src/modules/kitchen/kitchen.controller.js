const kitchenService = require("./kitchen.service");
const { success } = require("../../utils/apiResponse");


const getKitchenOrders = async (req, res, next) => {

    try {

        const orders =
            await kitchenService.getKitchenOrders();

        return success(
            res,
            "Kitchen orders fetched successfully",
            orders
        );

    } catch (error) {

        next(error);

    }
};


const updateOrderStatus = async (req, res, next) => {

    try {

        const order =
            await kitchenService.updateOrderStatus(
                req.params.id,
                req.body.status
            );

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
    getKitchenOrders,
    updateOrderStatus
};