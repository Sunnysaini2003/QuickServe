const { error } = require("../utils/apiResponse");

const errorHandler = (err, req, res, next) => {

    console.error(err);

    return error(
        res,
        err.message || "Internal Server Error",
        err.statusCode || 500
    );

};

module.exports = errorHandler;