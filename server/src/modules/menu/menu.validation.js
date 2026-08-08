const { body, param } = require("express-validator");

const createMenuValidation = [
    body("category_id")
        .isInt({ min: 1 })
        .withMessage("Valid category is required"),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Menu name is required"),

    body("price")
        .isFloat({ gt: 0 })
        .withMessage("Price must be greater than 0"),

    body("description")
        .optional()
        .trim(),

    body("is_veg")
        .optional()
        .isBoolean()
        .withMessage("is_veg must be true or false"),

    body("is_available")
        .optional()
        .isBoolean()
        .withMessage("is_available must be true or false")
];

const updateMenuValidation = [
    param("id")
        .isInt()
        .withMessage("Invalid menu id"),

    body("category_id")
        .optional()
        .isInt(),

    body("name")
        .optional()
        .trim(),

    body("price")
        .optional()
        .isFloat({ gt: 0 }),

    body("description")
        .optional()
        .trim(),

    body("is_veg")
        .optional()
        .isBoolean(),

    body("is_available")
        .optional()
        .isBoolean()
];

const menuIdValidation = [
    param("id")
        .isInt()
        .withMessage("Invalid menu id")
];

module.exports = {
    createMenuValidation,
    updateMenuValidation,
    menuIdValidation
};