const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");


// AUTHENTICATE


const authenticate = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
    ) {
        return next(
            new AppError("Unauthorized", 401)
        );
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(
            token,
            env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        next(
            new AppError(
                "Invalid or expired token",
                401
            )
        );
    }
};



// AUTHORIZE ROLE


const authorize = (...allowedRoles) => {

    return (req, res, next) => {

        if (!req.user) {
            return next(
                new AppError("Unauthorized", 401)
            );
        }

        if (!req.user.role) {
            return next(
                new AppError(
                    "User role not found",
                    403
                )
            );
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new AppError(
                    "Forbidden",
                    403
                )
            );
        }

        next();
    };
};


module.exports = authenticate;

module.exports.authenticate = authenticate;
module.exports.authorize = authorize;