const express = require("express");

const router = express.Router();

const authController = require("./auth.controller");

const {
    registerValidation,
    loginValidation
} = require("./auth.validation");

const validate = require("../../middleware/validate");

const {
    authenticate
} = require("./auth.middleware");


// ==========================================
// REGISTER
// ==========================================

router.post(
    "/register",
    registerValidation,
    validate,
    authController.register
);


// ==========================================
// LOGIN
// ==========================================

router.post(
    "/login",
    loginValidation,
    validate,
    authController.login
);


// ==========================================
// CURRENT USER
// ==========================================

router.get(
    "/me",
    authenticate,
    authController.me
);


module.exports = router;