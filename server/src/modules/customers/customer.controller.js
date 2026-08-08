const customerService = require("./customer.service");
const { success } = require("../../utils/apiResponse");

const createCustomerSession = async (req, res, next) => {

    try {

        const session =
            await customerService.createCustomerSession(
                req.body
            );

        return success(
            res,
            "Customer session created successfully",
            session,
            201
        );

    } catch (error) {

        next(error);

    }
};

const getCustomerSession = async (req, res, next) => {

    try {

        return success(
            res,
            "Customer authenticated successfully",
            {
                customerId: req.customer.customerId,
                sessionId: req.customer.sessionId,
                tableId: req.customer.tableId
            }
        );

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCustomerSession,
    getCustomerSession
};