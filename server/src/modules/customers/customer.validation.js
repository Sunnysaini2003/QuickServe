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

const registerCustomerValidation = [

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({
            min: 2,
            max: 120
        })
        .withMessage(
            "Name must be between 2 and 120 characters"
        ),

    body("mobile")
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage(
            "Enter a valid Indian mobile number"
        ),

    body("email")
        .trim()
        .isEmail()
        .withMessage(
            "Enter a valid email address"
        )
        .normalizeEmail(),

    body("password")
        .isLength({
            min: 6,
            max: 100
        })
        .withMessage(
            "Password must be between 6 and 100 characters"
        )

];


const loginCustomerValidation = [

    body("mobile")
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage(
            "Enter a valid Indian mobile number"
        ),

    body("password")
        .notEmpty()
        .withMessage(
            "Password is required"
        )

];

module.exports = {
    createCustomerSessionValidation,
    registerCustomerValidation,
    loginCustomerValidation
};