const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");
const categoryRoutes = require("../modules/categories/category.routes");
const menuRoutes = require("../modules/menu/menu.routes");
const tableRoutes = require("../modules/tables/table.routes");
const customerRoutes = require("../modules/customers/customer.routes");
const orderRoutes = require("../modules/orders/order.routes");
const kitchenRoutes = require("../modules/kitchen/kitchen.routes");
const userRoutes = require("../modules/users/user.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/tables", tableRoutes);
router.use("/customers", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/kitchen", kitchenRoutes);
router.use("/users", userRoutes);
router.use("/dashboard", dashboardRoutes);



module.exports = router;