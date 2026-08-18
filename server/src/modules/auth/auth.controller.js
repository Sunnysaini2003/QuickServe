const authService = require("./auth.service");
const { success } = require("../../utils/apiResponse");

const register = async (req, res, next) => {
    try {
        const admin = await authService.register(req.body);

        return success(
            res,
            "Admin registered successfully",
            admin,
            201
        );

    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);

        return success(
            res,
            "Login successful",
            result
        );

    } catch (error) {
        next(error);
    }
};

const me = async (req, res, next) => {

    try {

        const user =
            await authService.getCurrentUser(
                req.user.id
            );

        return success(
            res,
            "User retrieved successfully",
            user
        );

    } catch (error) {

        next(error);

    }
};

module.exports = {
    register,
    login,
    me
};