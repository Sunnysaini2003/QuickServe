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

// ============================================================
// GET ALL
// ============================================================

router.get(
    "/",
    authenticate,
    categoriesController.getAllCategories
);

// ============================================================
// GET BY ID
// ============================================================

router.get(
    "/:id",
    authenticate,
    categoryIdValidation,
    validate,
    categoriesController.getCategoryById
);

// ============================================================
// CREATE
// ============================================================

router.post(
    "/",
    authenticate,
    uploadCategoryImage.single("image"),
    createCategoryValidation,
    validate,
    categoriesController.createCategory
);

// ============================================================
// UPDATE
// ============================================================

router.put(
    "/:id",
    authenticate,
    uploadCategoryImage.single("image"),
    updateCategoryValidation,
    validate,
    categoriesController.updateCategory
);

// ============================================================
// STATUS
// ============================================================

router.patch(
    "/:id/status",
    authenticate,
    categoryStatusValidation,
    validate,
    categoriesController.updateCategoryStatus
);

// ============================================================
// DELETE
// ============================================================

router.delete(
    "/:id",
    authenticate,
    categoryIdValidation,
    validate,
    categoriesController.deleteCategory
);

module.exports = router;