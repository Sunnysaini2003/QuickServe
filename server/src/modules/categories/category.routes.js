const express = require("express");
const router = express.Router();

const categoriesController = require("./category.controller");
const authenticate = require("../auth/auth.middleware");
const validate = require("../../middleware/validate");

const {
    createCategoryValidation,
    updateCategoryValidation,
    categoryIdValidation,
    categoryStatusValidation
} = require("./category.validation");

router.get(
    "/",
    authenticate,
    categoriesController.getAllCategories
);

router.get(
    "/:id",
    authenticate,
    categoryIdValidation,
    validate,
    categoriesController.getCategoryById
);

router.post(
    "/",
    authenticate,
    createCategoryValidation,
    validate,
    categoriesController.createCategory
);

router.put(
    "/:id",
    authenticate,
    updateCategoryValidation,
    validate,
    categoriesController.updateCategory
);

router.patch(
    "/:id/status",
    authenticate,
    categoryStatusValidation,
    validate,
    categoriesController.updateCategoryStatus
);

router.delete(
    "/:id",
    authenticate,
    categoryIdValidation,
    validate,
    categoriesController.deleteCategory
);

module.exports = router;