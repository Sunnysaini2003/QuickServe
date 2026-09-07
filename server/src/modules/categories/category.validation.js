const { body, param } = require("express-validator");

====
// CATEGORY ID VALIDATION
====

const categoryIdValidation = [

    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid category ID")

];

====
// CREATE CATEGORY VALIDATION
====

const createCategoryValidation = [

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .isLength({ max: 100 })
        .withMessage(
            "Category name cannot exceed 100 characters"
        ),

    body("status")
        .optional()
        .isIn(["0", "1", 0, 1, true, false, "true", "false"])
        .withMessage(
            "Category status must be valid"
        )

];

====
// UPDATE CATEGORY VALIDATION
====

const updateCategoryValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid category ID"),

    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage(
            "Category name cannot be empty"
        )
        .isLength({ max: 100 })
        .withMessage(
            "Category name cannot exceed 100 characters"
        )
];

====
// UPDATE CATEGORY STATUS VALIDATION
====

const categoryStatusValidation = [

    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid category ID"),

    body("status")
        .isBoolean()
        .withMessage(
            "Status must be true or false"
        )

];

====
// EXPORTS
====

module.exports = {

    createCategoryValidation,
    updateCategoryValidation,
    categoryIdValidation,
    categoryStatusValidation

};