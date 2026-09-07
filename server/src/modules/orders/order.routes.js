const express = require("express");

const router = express.Router();

const orderController =
    require("./order.controller");

const authenticateCustomer =
    require("../../middleware/customer.middleware");

const validate =
    require("../../middleware/validate");

const {
    createOrderValidation
} = require("./order.validation");

const {
    authenticate,
    authorize
} = require("../auth/auth.middleware");



// CUSTOMER ORDERS


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


router.get(
    "/history",
    authenticateCustomer,
    orderController.getOrderHistory
);



// ADMIN ORDERS
// IMPORTANT: These must be BEFORE /:id


router.get(
    "/admin",
    authenticate,
    authorize("Admin"),
    orderController.getAdminOrders
);


router.get(
    "/admin/:id",
    authenticate,
    authorize("Admin"),
    orderController.getAdminOrderById
);


router.patch(
    "/admin/:id/status",
    authenticate,
    authorize("Admin","Staff"),
    orderController.updateAdminOrderStatus
);



// CUSTOMER ORDER DETAILS


router.get(
    "/:id",
    authenticateCustomer,
    orderController.getOrderById
);


module.exports = router;