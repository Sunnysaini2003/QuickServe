const express = require("express");

const router = express.Router();

const authenticate = require("../auth/auth.middleware");

const validate = require("../../middleware/validate");

const menuController = require("./menu.controller");

const {
    createMenuValidation,
    updateMenuValidation,
    menuIdValidation
} = require("./menu.validation");


// ==========================================
// PUBLIC CUSTOMER ROUTES
// ==========================================

router.get(
    "/",
    menuController.getAllMenu
);

router.get(
    "/:id",
    menuIdValidation,
    validate,
    menuController.getMenuById
);


// ==========================================
// ADMIN ROUTES
// ==========================================

router.post(
    "/",
    authenticate,
    createMenuValidation,
    validate,
    menuController.createMenu
);

router.put(
    "/:id",
    authenticate,
    updateMenuValidation,
    validate,
    menuController.updateMenu
);

router.delete(
    "/:id",
    authenticate,
    menuIdValidation,
    validate,
    menuController.deleteMenu
);


module.exports = router;