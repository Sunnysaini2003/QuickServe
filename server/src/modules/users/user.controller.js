const userService = require("./user.service");



// CREATE USER


const createUser = async (req, res, next) => {

    try {

        const userData = {
            ...req.body
        };

        // Add uploaded profile image
        if (req.file) {
            userData.profile_image =
                `/uploads/users/${req.file.filename}`;
        }

        const user =
            await userService.createUser(
                userData
            );

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user
        });

    } catch (error) {

        next(error);

    }
};



// GET ALL USERS


const getUsers = async (req, res, next) => {

    try {

        const users =
            await userService.getUsers();

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: users
        });

    } catch (error) {

        next(error);

    }
};



// UPDATE USER


const updateUser = async (req, res, next) => {

    try {

        const userId =
            Number(req.params.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const updateData = {
            ...req.body
        };

        // Add uploaded profile image
        if (req.file) {
            updateData.profile_image =
                `/uploads/users/${req.file.filename}`;
        }

        const user =
            await userService.updateUser(
                userId,
                updateData
            );

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: user
        });

    } catch (error) {

        next(error);

    }
};

// UPDATE USER STATUS

const updateUserStatus = async (req, res, next) => {

    try {

        const userId =
            Number(req.params.id);

        // ------------------------------------------
        // Validate user ID
        // ------------------------------------------

        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }


        // ------------------------------------------
        // Validate request body
        // ------------------------------------------

        if (
            req.body.is_active === undefined ||
            req.body.is_active === null
        ) {
            return res.status(400).json({
                success: false,
                message: "is_active is required"
            });
        }


        // ------------------------------------------
        // Update status
        // ------------------------------------------

        const user =
            await userService.updateUserStatus(
                userId,
                req.body.is_active
            );


        // ------------------------------------------
        // Response
        // ------------------------------------------

        res.status(200).json({
            success: true,
            message: user.is_active
                ? "User activated successfully"
                : "User deactivated successfully",
            data: user
        });

    } catch (error) {

        next(error);

    }
};

module.exports = {
    createUser,
    getUsers,
    updateUser,
    updateUserStatus
};