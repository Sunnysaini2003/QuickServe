const express = require("express");

const router = express.Router();

const kitchenController =
    require("./kitchen.controller");

const authenticateAdmin =
    require("../auth/auth.middleware");


router.get(
    "/orders",
    authenticateAdmin,
    kitchenController.getKitchenOrders
);


router.patch(
    "/orders/:id/status",
    authenticateAdmin,
    kitchenController.updateOrderStatus
);


module.exports = router;