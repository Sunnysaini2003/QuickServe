const { body, param } = require("express-validator");

const createTableValidation = [
    body("table_number")
        .trim()
        .notEmpty()
        .withMessage("Table number is required")
        .isLength({ max: 20 })
        .withMessage("Table number cannot exceed 20 characters")
];

const updateTableValidation = [
    param("id")
        .isInt()
        .withMessage("Invalid table ID"),

    body("table_number")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Table number cannot be empty")
];

const tableIdValidation = [
    param("id")
        .isInt()
        .withMessage("Invalid table ID")
];

module.exports = {
    createTableValidation,
    updateTableValidation,
    tableIdValidation
};