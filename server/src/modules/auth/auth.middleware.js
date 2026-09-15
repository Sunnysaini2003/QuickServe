const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");


// AUTHENTICATE


const { getEmployeeTokenFromRequest } = require("../../utils/authCookies");

const normalizeRole = (value) => {
    if (!value) return null;

    const normalized = String(value).toLowerCase();

    if (normalized === "admin") return "Admin";
    if (normalized === "staff") return "Staff";
    if (normalized === "manager") return "Manager";

    return null;
};

const authenticate = (req, res, next) => {
    const role = normalizeRole(req.headers["x-quickserve-role"]);

    if (!role) {
        return next(
            new AppError("Authentication role is required", 401)
        );
    }

    const token = getEmployeeTokenFromRequest(req, role);

    if (!token) {
        return next(new AppError("Unauthorized", 401));
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);

        if (decoded.role !== role) {
            return next(new AppError("Forbidden", 403));
        }

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