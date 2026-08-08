const express = require("express");

const router = express.Router();

const orderController = require("./order.controller");

const authenticateCustomer =
    require("../../middleware/customer.middleware");

const validate =
    require("../../middleware/validate");

const {
    createOrderValidation
} = require("./order.validation");


router.post(
    "/",
    authenticateCustomer,
    createOrderValidation,
    validate,
    orderController.createOrder
);

router.get(
    "/current",
    authenticateCustomer,
    orderController.getCurrentOrders
);


module.exports = router;