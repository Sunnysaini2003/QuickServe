const express = require("express");

const router = express.Router();

const orderController = require("./order.controller");

const authenticateCustomer =
  require("../../middleware/customer.middleware");

const validate =
  require("../../middleware/validate");

const {
  createOrderValidation,
  managerAssistedOrderValidation,
} = require("./order.validation");

const {
  authenticate,
  authorize,
} = require("../auth/auth.middleware");


// CUSTOMER ORDERS

router.post(
  "/",
  authenticateCustomer,
  createOrderValidation,
  validate,
  orderController.createOrder,
);

router.get("/current", authenticateCustomer, orderController.getCurrentOrders);

router.get("/history", authenticateCustomer, orderController.getOrderHistory);

// ADMIN ORDERS
// IMPORTANT: These must be BEFORE /:id

router.get(
  "/admin",
  authenticate,
  authorize("Admin"),
  orderController.getAdminOrders,
);

router.get(
  "/admin/:id",
  authenticate,
  authorize("Admin"),
  orderController.getAdminOrderById,
);

router.patch(
  "/admin/:id/status",
  authenticate,
  authorize("Admin", "Staff"),
  orderController.updateAdminOrderStatus,
);

// MANAGER ORDERS
// Keep Manager endpoints separate while reusing the existing order service.

router.post(
  "/manager/assisted",
  authenticate,
  authorize("Manager"),
  managerAssistedOrderValidation,
  validate,
  orderController.createManagerAssistedOrder,
);

router.get(
  "/manager",
  authenticate,
  authorize("Manager"),
  orderController.getManagerOrders,
);

router.get(
  "/manager/export",
  authenticate,
  authorize("Manager"),
  orderController.exportManagerOrders,
);

router.get(
  "/manager/:id",
  authenticate,
  authorize("Manager"),
  orderController.getManagerOrderById,
);



router.patch(
  "/manager/:id/status",
  authenticate,
  authorize("Manager"),
  orderController.updateManagerOrderStatus,
);


// CUSTOMER ORDER DETAILS

router.get("/:id", authenticateCustomer, orderController.getOrderById);

module.exports = router;
