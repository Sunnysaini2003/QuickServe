const { body, param } = require("express-validator");

const createcategoriesValidation = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("categories name is required")
        .isLength({ max: 100 })
        .withMessage("categories name cannot exceed 100 characters"),

    body("status")
        .optional()
        .isBoolean()
        .withMessage("Status must be true or false")
];

const updatecategoriesValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid categories ID"),

    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("categories name cannot be empty")
        .isLength({ max: 100 })
        .withMessage("categories name cannot exceed 100 characters"),

    body("status")
        .optional()
        .isBoolean()
        .withMessage("Status must be true or false")
];

const categoriesIdValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid categories ID")
];

module.exports = {
    createcategoriesValidation,
    updatecategoriesValidation,
    categoriesIdValidation
};