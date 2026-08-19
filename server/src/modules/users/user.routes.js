const express = require("express");

const router = express.Router();

const {
    authenticate,
    authorize
} = require("../auth/auth.middleware");

const validate = require("../../middleware/validate");
const uploadUserImage = require("../../middleware/uploadUserImage");

const userController = require("./user.controller");

const {
    createUserValidation
} = require("./user.validation");



// GET ALL USERS
// Admin only
router.get(
    "/",
    authenticate,
    authorize("Admin"),
    userController.getUsers
);


// CREATE USER
router.post(
    "/",
    authenticate,
    authorize("Admin"),
    uploadUserImage.single("profile_image"),
    createUserValidation,
    validate,
    userController.createUser
);

// UPDATE USER

router.put(
    "/:id",
    authenticate,
    authorize("Admin"),
    uploadUserImage.single("profile_image"),
    userController.updateUser
);

// UPDATE USER STATUS
// Admin only

router.put(
    "/:id/status",
    authenticate,
    authorize("Admin"),
    userController.updateUserStatus
);

module.exports = router;