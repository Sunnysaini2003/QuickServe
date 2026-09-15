const express = require("express");

const router = express.Router();

const authController = require("./auth.controller");

const {
    registerValidation,
    loginValidation,
} = require("./auth.validation");

const validate = require("../../middleware/validate");

const { authenticate } = require("./auth.middleware");

router.post(
    "/register",
    registerValidation,
    validate,
    authController.register,
);

router.post(
    "/login",
    loginValidation,
    validate,
    authController.login,
);

router.post(
    "/refresh",
    authController.refresh,
);

router.post(
    "/logout",
    authController.logout,
);

router.get(
    "/me",
    authenticate,
    authController.me,
);

module.exports = router;
