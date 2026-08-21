const { body, param } = require("express-validator");


// CATEGORY ID VALIDATION


const categoryIdValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid category ID")
];


// CREATE CATEGORY VALIDATION


const createCategoryValidation = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .isLength({ max: 100 })
        .withMessage(
            "Category name cannot exceed 100 characters"
        ),

    body("image")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "Category image must be a string"
        )
];


// UPDATE CATEGORY VALIDATION


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
        ),

    body("image")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "Category image must be a string"
        )
];


// UPDATE CATEGORY STATUS VALIDATION


const updateCategoryStatusValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid category ID"),

    body("status")
        .notEmpty()
        .withMessage("Category status is required")
        .isIn([0, 1, "0", "1"])
        .withMessage(
            "Category status must be 0 or 1"
        )
];

const categoryStatusValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Invalid category ID"),

    body("status")
        .isBoolean()
        .withMessage("Status must be true or false")
];


// EXPORTS


module.exports = {
    createCategoryValidation,
    updateCategoryValidation,
    updateCategoryStatusValidation,
    categoryIdValidation,   
    categoryStatusValidation
};