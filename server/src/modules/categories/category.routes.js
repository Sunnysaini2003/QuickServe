const express = require("express");
const router = express.Router();

const categoriesController = require("./category.controller");

const authenticate = require("../auth/auth.middleware");

const validate = require("../../middleware/validate");

const {
    createcategoriesValidation,
    updatecategoriesValidation,
    categoriesIdValidation
} = require("./category.validation");

router.get(
    "/",
    authenticate,
    categoriesController.getAllCategories
);

router.get(
    "/:id",
    authenticate,
    categoriesIdValidation,
    validate,
    categoriesController.getcategoriesById
);

router.post(
    "/",
    authenticate,
    createcategoriesValidation,
    validate,
    categoriesController.createcategories
);

router.put(
    "/:id",
    authenticate,
    updatecategoriesValidation,
    validate,
    categoriesController.updatecategories
);

router.delete(
    "/:id",
    authenticate,
    categoriesIdValidation,
    validate,
    categoriesController.deletecategories
);

module.exports = router;