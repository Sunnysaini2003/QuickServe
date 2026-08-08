const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const {
    registerValidation,
    loginValidation
} = require("./auth.validation");

const validate = require("../../middleware/validate");

router.post(
    "/register",
    registerValidation,
    validate,
    authController.register
);

router.post(
    "/login",
    loginValidation,
    validate,
    authController.login
);

module.exports = router;