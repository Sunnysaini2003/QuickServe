const {
    body,
    param
} = require("express-validator");


// CREATE


const createTableValidation = [
    body("table_number")
        .trim()
        .notEmpty()
        .withMessage(
            "Table number is required"
        )
        .isLength({
            max: 20
        })
        .withMessage(
            "Table number cannot exceed 20 characters"
        ),

    body("status")
        .optional()
        .isBoolean()
        .withMessage(
            "Status must be true or false"
        )
];


// UPDATE


const updateTableValidation = [
    param("id")
        .isInt({
            min: 1
        })
        .withMessage(
            "Invalid table ID"
        ),

    body("table_number")
        .optional()
        .trim()
        .notEmpty()
        .withMessage(
            "Table number cannot be empty"
        )
        .isLength({
            max: 20
        })
        .withMessage(
            "Table number cannot exceed 20 characters"
        ),

    body("status")
        .optional()
        .isBoolean()
        .withMessage(
            "Status must be true or false"
        )
];


// TABLE ID


const tableIdValidation = [
    param("id")
        .isInt({
            min: 1
        })
        .withMessage(
            "Invalid table ID"
        )
];


// STATUS


const tableStatusValidation = [
    param("id")
        .isInt({
            min: 1
        })
        .withMessage(
            "Invalid table ID"
        ),

    body("status")
        .exists()
        .withMessage(
            "Status is required"
        )
        .isBoolean()
        .withMessage(
            "Status must be true or false"
        )
];


// EXPORTS


module.exports = {
    createTableValidation,
    updateTableValidation,
    tableIdValidation,
    tableStatusValidation
};