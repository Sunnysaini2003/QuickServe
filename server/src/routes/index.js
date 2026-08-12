const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");
const categoryRoutes = require("../modules/categories/category.routes");
const menuRoutes = require("../modules/menu/menu.routes");
const tableRoutes = require("../modules/tables/table.routes");
const customerRoutes = require("../modules/customers/customer.routes");
const orderRoutes = require("../modules/orders/order.routes");
const kitchenRoutes = require("../modules/kitchen/kitchen.routes");


router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/tables", tableRoutes);
router.use("/customers", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/kitchen", kitchenRoutes);

module.exports = router;