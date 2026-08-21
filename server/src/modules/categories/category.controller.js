const categoriesService = require("./category.service");
const { success } = require("../../utils/apiResponse");


// GET ALL CATEGORIES


const getAllCategories = async (req, res, next) => {
    try {
        const categories =
            await categoriesService.getCategories();

        return success(
            res,
            "Categories fetched successfully",
            categories
        );
    } catch (error) {
        next(error);
    }
};


// GET CATEGORY BY ID


const getCategoryById = async (req, res, next) => {
    try {
        const category =
            await categoriesService.getCategoryById(
                req.params.id
            );

        return success(
            res,
            "Category fetched successfully",
            category
        );
    } catch (error) {
        next(error);
    }
};


// CREATE CATEGORY


const createCategory = async (req, res, next) => {

    try {

        const category =
            await categoriesService.createCategory({

                ...req.body,

                image: req.file
                    ? `/uploads/categories/${req.file.filename}`
                    : null

            });

        return success(
            res,
            "Category created successfully",
            category,
            201
        );

    } catch (error) {

        next(error);

    }

};

// UPDATE CATEGORY

const updateCategory = async (req, res, next) => {
    try {
        const updateData = {
            ...req.body,
        };

        // If a new image was uploaded
        if (req.file) {
            updateData.image =
                `/uploads/categories/${req.file.filename}`;
        }

        const category =
            await categoriesService.updateCategory(
                req.params.id,
                updateData
            );

        return success(
            res,
            "Category updated successfully",
            category
        );

    } catch (error) {
        next(error);
    }
};

// DELETE CATEGORY


const deleteCategory = async (req, res, next) => {
    try {
        const result =
            await categoriesService.deleteCategory(
                req.params.id
            );

        return success(
            res,
            "Category deleted successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

const updateCategoryStatus = async (req, res, next) => {
    try {
        const category =
            await categoriesService.updateCategoryStatus(
                req.params.id,
                req.body.status
            );

        return success(
            res,
            "Category status updated successfully",
            category
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    updateCategoryStatus,
    deleteCategory
};