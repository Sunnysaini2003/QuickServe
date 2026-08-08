const categoriesService = require("./category.service");
const { success } = require("../../utils/apiResponse");

const getAllCategories = async (req, res, next) => {
    try {

        const categories =
            await categoriesService.getAllCategories();

        return success(
            res,
            "Categories fetched successfully",
            categories
        );

    } catch (error) {
        next(error);
    }
};

const getcategoriesById = async (req, res, next) => {
    try {

        const categories =
            await categoriesService.getcategoriesById(req.params.id);

        return success(
            res,
            "categories fetched successfully",
            categories
        );

    } catch (error) {
        next(error);
    }
};

const createcategories = async (req, res, next) => {
    try {

        const categories =
            await categoriesService.createcategories(req.body);

        return success(
            res,
            "categories created successfully",
            categories,
            201
        );

    } catch (error) {
        next(error);
    }
};

const updatecategories = async (req, res, next) => {
    try {

        const categories =
            await categoriesService.updatecategories(
                req.params.id,
                req.body
            );

        return success(
            res,
            "categories updated successfully",
            categories
        );

    } catch (error) {
        next(error);
    }
};

const deletecategories = async (req, res, next) => {
    try {

        await categoriesService.deletecategories(req.params.id);

        return success(
            res,
            "categories deleted successfully"
        );

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCategories,
    getcategoriesById,
    createcategories,
    updatecategories,
    deletecategories
};