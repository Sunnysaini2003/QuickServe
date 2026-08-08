const { body } = require("express-validator");

const createCustomerSessionValidation = [
    body("table_token")
        .trim()
        .notEmpty()
        .withMessage("Table token is required")
        .isUUID()
        .withMessage("Invalid table token"),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Name must be between 2 and 100 characters"),

    body("mobile")
        .trim()
        .notEmpty()
        .withMessage("Mobile number is required")
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Enter a valid Indian mobile number")
];

module.exports = {
    createCustomerSessionValidation
};