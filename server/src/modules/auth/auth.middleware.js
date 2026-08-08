const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");

const authenticate = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new AppError("Unauthorized", 401));
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(token, env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        next(new AppError("Invalid or expired token", 401));

    }
};

module.exports = authenticate;