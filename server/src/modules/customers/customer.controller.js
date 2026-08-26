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

const createTakeawaySession = async (req, res, next) => {

    try {

        const result =
            await customerService.createTakeawaySession({
                name: req.body.name,
                mobile: req.body.mobile
            });

        return success(
            res,
            "Takeaway session created successfully",
            result,
            201
        );

    } catch (error) {

        next(error);

    }
};
const registerCustomer = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await customerService.registerCustomer(
                req.body
            );

        return success(
            res,
            "Customer account created successfully",
            result,
            201
        );

    } catch (error) {

        next(error);

    }
};


const loginCustomer = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await customerService.loginCustomer(
                req.body
            );

        return success(
            res,
            "Customer login successful",
            result
        );

    } catch (error) {

        next(error);

    }
};

module.exports = {
    createCustomerSession,
    getCustomerSession,
    createTakeawaySession,
    registerCustomer,
    loginCustomer
};