const customerService = require("./customer.service");
const { success } = require("../../utils/apiResponse");
const {
    setCustomerSessionCookie,
    setCustomerAuthCookie,
    clearAllCustomerCookies
} = require("../../utils/authCookies");

const createCustomerSession = async (req, res, next) => {

    try {

        const session =
            await customerService.createCustomerSession(
                req.body
            );

        if (!session?.token) {
            throw new Error("Customer session token was not generated");
        }

        setCustomerSessionCookie(res, session.token);

        const { token: _token, ...safeSession } = session;

        return success(
            res,
            "Customer session created successfully",
            safeSession,
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

        if (!result?.token) {
            throw new Error("Takeaway session token was not generated");
        }

        setCustomerSessionCookie(
            res,
            result.token,
            7 * 24 * 60 * 60 * 1000
        );

        const { token: _token, ...safeResult } = result;

        return success(
            res,
            "Takeaway session created successfully",
            safeResult,
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

        if (!result?.token) {
            throw new Error("Customer authentication token was not generated");
        }

        setCustomerAuthCookie(res, result.token);

        const { token: _token, ...safeResult } = result;

        return success(
            res,
            "Customer account created successfully",
            safeResult,
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

        if (!result?.token) {
            throw new Error("Customer authentication token was not generated");
        }

        setCustomerAuthCookie(res, result.token);

        const { token: _token, ...safeResult } = result;

        return success(
            res,
            "Customer login successful",
            safeResult
        );

    } catch (error) {

        next(error);

    }
};
const logoutCustomer = async (req, res, next) => {
    try {
        clearAllCustomerCookies(res);

        return success(
            res,
            "Customer logout successful",
            null
        );
    } catch (error) {
        next(error);
    }
};

const searchManagerCustomers = async (
    req,
    res,
    next
) => {
    try {

        const customers =
            await customerService.searchManagerCustomers({
                search:
                    req.query.search || "",

                limit:
                    req.query.limit || 20,
            });

        return success(
            res,
            "Customers fetched successfully",
            customers
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
    loginCustomer,
    logoutCustomer,
    searchManagerCustomers
};