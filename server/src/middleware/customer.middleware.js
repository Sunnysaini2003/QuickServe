const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/AppError");

const { getCustomerSessionTokenFromRequest } = require("../utils/authCookies");

const authenticateCustomer = (req, res, next) => {
    const token = getCustomerSessionTokenFromRequest(req);

    if (!token) {
        return next(
            new AppError(
                "Customer authentication required",
                401
            )
        );
    }

    try {
        const decoded = jwt.verify(
            token,
            env.CUSTOMER_JWT_SECRET
        );

        req.customer = decoded;
        next();
    } catch (error) {
        return next(
            new AppError(
                "Invalid or expired customer token",
                401
            )
        );
    }
};

module.exports = authenticateCustomer;