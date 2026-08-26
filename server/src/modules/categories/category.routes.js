const express = require("express");

const router = express.Router();

const categoriesController =
    require("./category.controller");

const authenticate =
    require("../auth/auth.middleware");

const validate =
    require("../../middleware/validate");

const uploadCategoryImage =
    require("./category.upload");

const {
    createCategoryValidation,
    updateCategoryValidation,
    categoryIdValidation,
    categoryStatusValidation
} = require("./category.validation");


// PUBLIC CUSTOMER ROUTES

// GET ALL CATEGORIES
// Customers need this to display the menu.

router.get(
    "/",
    categoriesController.getAllCategories
);


// GET CATEGORY BY ID
// Public because customers may need category information.

router.get(
    "/:id",
    categoryIdValidation,
    validate,
    categoriesController.getCategoryById
);


// ADMIN ROUTES


// CREATE CATEGORY

router.post(
    "/",
    authenticate,
    uploadCategoryImage.single("image"),
    createCategoryValidation,
    validate,
    categoriesController.createCategory
);


// UPDATE CATEGORY

router.put(
    "/:id",
    authenticate,
    uploadCategoryImage.single("image"),
    updateCategoryValidation,
    validate,
    categoriesController.updateCategory
);


// UPDATE CATEGORY STATUS

router.patch(
    "/:id/status",
    authenticate,
    categoryStatusValidation,
    validate,
    categoriesController.updateCategoryStatus
);


// DELETE CATEGORY

router.delete(
    "/:id",
    authenticate,
    categoryIdValidation,
    validate,
    categoriesController.deleteCategory
);


module.exports = router;