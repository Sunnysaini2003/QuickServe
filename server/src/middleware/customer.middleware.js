const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/AppError");

const authenticateCustomer = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new AppError("Customer authentication required", 401));
    }

    const token = authHeader.split(" ")[1];

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