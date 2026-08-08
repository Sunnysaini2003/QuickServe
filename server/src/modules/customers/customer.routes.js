const express = require("express");

const router = express.Router();

const customerController =
    require("./customer.controller");

const authenticateCustomer =
    require("../../middleware/customer.middleware");

const validate =
    require("../../middleware/validate");

const {
    createCustomerSessionValidation
} = require("./customer.validation");


router.post(
    "/session",
    createCustomerSessionValidation,
    validate,
    customerController.createCustomerSession
);


router.get(
    "/session",
    authenticateCustomer,
    customerController.getCustomerSession
);


module.exports = router;