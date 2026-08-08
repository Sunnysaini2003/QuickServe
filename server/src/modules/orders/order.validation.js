const { body } = require("express-validator");

const createOrderValidation = [
    body("items")
        .isArray({ min: 1 })
        .withMessage("Order must contain at least one item"),

    body("items.*.menu_id")
        .isInt({ min: 1 })
        .withMessage("Invalid menu item"),

    body("items.*.quantity")
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1"),

    body("notes")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Notes cannot exceed 500 characters")
];

module.exports = {
    createOrderValidation
};