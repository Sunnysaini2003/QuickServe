const authService = require("./auth.service");
const { success } = require("../../utils/apiResponse");
const env = require("../../config/env");

const {
    normalizeRole,
    setEmployeeAuthCookie,
    setRefreshCookie,
    clearEmployeeAuthCookie,
    clearRefreshCookie,
    getRefreshTokenFromRequest,
} = require("../../utils/authCookies");

const AppError = require("../../utils/AppError");

const parseMaxAge = (value) => {
    const match = String(value || "7d")
        .trim()
        .match(/^(\d+)\s*(s|m|h|d)$/i);

    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
};

const register = async (req, res, next) => {
    try {
        const admin = await authService.register({
            ...req.body,
            setupKey: req.headers["x-initial-admin-key"] || "",
        });

        return success(
            res,
            "Admin registered successfully",
            admin,
            201,
        );
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);

        const role = normalizeRole(
            result?.user?.role,
        );

        if (!role) {
            throw new AppError(
                "Invalid employee role",
                403,
            );
        }

        /*
         * Set the short-lived access token as
         * an HttpOnly cookie.
         */
        setEmployeeAuthCookie(
            res,
            role,
            result.token,
        );

        /*
         * Set the role-specific refresh token.
         */
        setRefreshCookie(
            res,
            role,
            result.refreshToken,
            parseMaxAge(
                env.REFRESH_TOKEN_EXPIRES_IN,
            ),
        );

        /*
         * Do NOT send the JWT to frontend JS.
         *
         * The browser now stores the access and
         * refresh tokens as HttpOnly cookies.
         */
        const responseData = {
            user: result.user,
        };

        return success(
            res,
            "Login successful",
            responseData,
        );
    } catch (error) {
        next(error);
    }
};

const refresh = async (req, res, next) => {
    let requestedRole = null;

    try {
        requestedRole = normalizeRole(
            req.headers["x-quickserve-role"],
        );

        if (!requestedRole) {
            return next(
                new AppError(
                    "Authentication role is required",
                    400,
                ),
            );
        }

        const refreshToken =
            getRefreshTokenFromRequest(
                req,
                requestedRole,
            );

        if (!refreshToken) {
            return next(
                new AppError(
                    "Refresh token not found",
                    401,
                ),
            );
        }

        const result =
            await authService.refreshEmployeeToken({
                refreshToken,
                expectedRole: requestedRole,
            });

        /*
         * IMPORTANT:
         *
         * A successful refresh must issue a
         * NEW access-token cookie.
         */
        setEmployeeAuthCookie(
            res,
            requestedRole,
            result.token,
        );

        /*
         * If your refresh service rotates the
         * refresh token, result.refreshToken
         * will contain the new token.
         *
         * If it does not, keep the existing
         * refresh cookie untouched.
         */
        if (result.refreshToken) {
            setRefreshCookie(
                res,
                requestedRole,
                result.refreshToken,
                parseMaxAge(
                    env.REFRESH_TOKEN_EXPIRES_IN,
                ),
            );
        }

        return success(
            res,
            "Token refreshed",
            {
                user: result.user,
            },
        );
    } catch (error) {
        if (requestedRole) {
            clearEmployeeAuthCookie(
                res,
                requestedRole,
            );

            clearRefreshCookie(
                res,
                requestedRole,
            );
        }

        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const requestedRole = normalizeRole(
            req.headers["x-quickserve-role"],
        );

        if (!requestedRole) {
            return next(
                new AppError(
                    "Authentication role is required",
                    400,
                ),
            );
        }

        /*
         * Clear ONLY the selected role's
         * access + refresh cookies.
         */
        clearEmployeeAuthCookie(
            res,
            requestedRole,
        );

        clearRefreshCookie(
            res,
            requestedRole,
        );

        return success(
            res,
            "Logout successful",
            null,
        );
    } catch (error) {
        next(error);
    }
};

const me = async (req, res, next) => {
    try {
        const user =
            await authService.getCurrentUser(
                req.user.id,
            );

        return success(
            res,
            "User retrieved successfully",
            user,
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    refresh,
    logout,
    me,
};