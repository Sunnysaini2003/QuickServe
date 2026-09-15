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

const managerAssistedOrderValidation = [
    body("orderMode")
        .isIn(["DineIn", "Takeaway"])
        .withMessage("Order mode must be DineIn or Takeaway"),

    body("tableId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Invalid table"),

    body("customerMode")
        .optional()
        .isIn(["existing", "walkin"])
        .withMessage("Invalid customer mode"),

    body("customerId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Invalid customer"),

    body("customerName")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 120 })
        .withMessage("Customer name cannot exceed 120 characters"),

    body("customerMobile")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Enter a valid Indian mobile number"),

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
    createOrderValidation,
    managerAssistedOrderValidation
};