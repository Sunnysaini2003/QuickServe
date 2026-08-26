const {
    body,
    param
} = require("express-validator");



// CREATE


const createMenuValidation = [

    body("category_id")
        .isInt({
            min: 1
        })
        .withMessage(
            "Valid category is required"
        ),

    body("name")
        .trim()
        .notEmpty()
        .withMessage(
            "Menu name is required"
        )
        .isLength({
            max: 120
        })
        .withMessage(
            "Menu name cannot exceed 120 characters"
        ),

    body("price")
        .isFloat({
            gt: 0
        })
        .withMessage(
            "Price must be greater than 0"
        ),

    body("description")
        .optional({
            nullable: true
        })
        .trim(),

    body("is_veg")
        .optional()
        .isBoolean()
        .withMessage(
            "is_veg must be true or false"
        ),

    body("is_available")
        .optional()
        .isBoolean()
        .withMessage(
            "is_available must be true or false"
        )

];



// UPDATE


const updateMenuValidation = [

    param("id")
        .isInt({
            min: 1
        })
        .withMessage(
            "Invalid menu id"
        ),

    body("category_id")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Invalid category"
        ),

    body("name")
        .optional()
        .trim()
        .isLength({
            max: 120
        })
        .withMessage(
            "Menu name cannot exceed 120 characters"
        ),

    body("price")
        .optional()
        .isFloat({
            gt: 0
        })
        .withMessage(
            "Price must be greater than 0"
        ),

    body("description")
        .optional({
            nullable: true
        })
        .trim(),

    body("is_veg")
        .optional()
        .isBoolean()
        .withMessage(
            "is_veg must be true or false"
        ),

    body("is_available")
        .optional()
        .isBoolean()
        .withMessage(
            "is_available must be true or false"
        )

];



// MENU ID


const menuIdValidation = [

    param("id")
        .isInt({
            min: 1
        })
        .withMessage(
            "Invalid menu id"
        )

];



// EXPORT


module.exports = {

    createMenuValidation,

    updateMenuValidation,

    menuIdValidation

};