const express = require("express");
const router = express.Router();

const tableController = require("./table.controller");
const authenticate = require("../auth/auth.middleware");
const validate = require("../../middleware/validate");

const {
    createTableValidation
} = require("./table.validation");


/// Public - Customer QR
router.get(
    "/token/:token",
    tableController.getTableByToken
);

// Admin
router.get(
    "/",
    authenticate,
    tableController.getAllTables
);

router.post(
    "/",
    authenticate,
    createTableValidation,
    validate,
    tableController.createTable
);




module.exports = router;