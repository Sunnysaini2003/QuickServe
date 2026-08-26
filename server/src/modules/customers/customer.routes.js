const express = require("express");

const router = express.Router();

const customerController =
    require("./customer.controller");

const authenticateCustomer =
    require("../../middleware/customer.middleware");

const validate =
    require("../../middleware/validate");

const {
    createCustomerSessionValidation,
    registerCustomerValidation,
    loginCustomerValidation
} = require("./customer.validation");


// CUSTOMER ACCOUNT
router.post(
    "/register",
    registerCustomerValidation,
    validate,
    customerController.registerCustomer
);


router.post(
    "/login",
    loginCustomerValidation,
    validate,
    customerController.loginCustomer
);

// CUSTOMER SESSION

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

// TAKEAWAY

router.post(
    "/takeaway",
    validate,
    customerController.createTakeawaySession
);


module.exports = router;