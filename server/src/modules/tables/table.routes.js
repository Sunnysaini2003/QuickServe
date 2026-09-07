const express = require("express");

const router = express.Router();

const tableController = require("./table.controller");

const authenticate =
    require("../auth/auth.middleware");

const validate =
    require("../../middleware/validate");

const {
    createTableValidation,
    updateTableValidation,
    tableIdValidation,
    tableStatusValidation
} = require("./table.validation");


// PUBLIC CUSTOMER ROUTES


// Verify table using QR token
router.get(
    "/token/:token",
    tableController.getTableByToken
);


// ADMIN ROUTES


// Get all tables
router.get(
    "/",
    authenticate,
    tableController.getAllTables
);

// Get table by ID
router.get(
    "/:id",
    authenticate,
    tableIdValidation,
    validate,
    tableController.getTableById
);

// Create table
router.post(
    "/",
    authenticate,
    createTableValidation,
    validate,
    tableController.createTable
);

// Update table
router.put(
    "/:id",
    authenticate,
    updateTableValidation,
    validate,
    tableController.updateTable
);

// Update table status
router.patch(
    "/:id/status",
    authenticate,
    tableStatusValidation,
    validate,
    tableController.updateTableStatus
);

// Delete table
router.delete(
    "/:id",
    authenticate,
    tableIdValidation,
    validate,
    tableController.deleteTable
);

module.exports = router;