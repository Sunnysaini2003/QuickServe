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

// IMPORTANT:
// Change this import path if your multer middleware
// is located somewhere else.
//
// This should be the SAME upload middleware you already
// use successfully for Categories.
// const upload = require("../../middleware/upload");
const upload = require("./menu.upload");



// PUBLIC CUSTOMER ROUTES

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


// ADMIN CREATE

router.post(
    "/",
    authenticate,

    // IMPORTANT:
    // Parse multipart/form-data before validation/controller
    upload.single("image"),

    createMenuValidation,
    validate,

    menuController.createMenu
);


// ADMIN UPDATE

router.put(
    "/:id",
    authenticate,

    // IMPORTANT:
    // Parse multipart/form-data
    upload.single("image"),

    updateMenuValidation,
    validate,

    menuController.updateMenu
);


// ADMIN DELETE

router.delete(
    "/:id",
    authenticate,

    menuIdValidation,
    validate,

    menuController.deleteMenu
);


module.exports = router;