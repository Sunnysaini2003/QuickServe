const env = require("../../config/env");
const bcrypt = require("bcrypt");
const generateToken = require("../../utils/generateToken");
const {
    generateRefreshToken,
    verifyRefreshToken,
} = require("../../utils/generateRefreshToken");

const db = require("../../utils/db");
const AppError = require("../../utils/AppError");

const roleTokenName = (role) => {
    if (role === "Admin") return "admin_token";
    if (role === "Staff") return "staff_token";
    if (role === "Manager") return "manager_token";
    return "token";
};

const createEmployeeTokens = (user) => {
    const token = generateToken({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        role: user.role,
    });

    const refreshToken = generateRefreshToken({
        id: user.id,
        role_id: user.role_id,
        role: user.role,
        type: "refresh",
    });

    return {
        token,
        refreshToken,
        role: user.role,
    };
};

// REGISTER INITIAL ADMIN
const register = async ({ name, email, password, setupKey }) => {
    const adminRows = await db.query(
        `SELECT u.id
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE r.name = 'Admin'
         LIMIT 1`,
    );

    if (adminRows.length) {
        throw new AppError(
            "Initial admin setup is already completed",
            403,
        );
    }

    if (
        env.NODE_ENV === "production" &&
        (!env.INITIAL_ADMIN_SETUP_KEY ||
            setupKey !== env.INITIAL_ADMIN_SETUP_KEY)
    ) {
        throw new AppError(
            "Initial admin setup is not authorized",
            403,
        );
    }

    const existing = await db.query(
        `SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email],
    );

    if (existing.length) {
        throw new AppError("Email already exists", 409);
    }

    const roles = await db.query(
        `SELECT id
         FROM roles
         WHERE name = 'Admin'
         LIMIT 1`,
    );

    if (!roles.length) {
        throw new AppError("Admin role not found", 500);
    }

    const roleId = roles[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
        `INSERT INTO users
        (
            role_id,
            name,
            email,
            password_hash,
            is_active
        )
        VALUES (?, ?, ?, ?, 1)`,
        [
            roleId,
            name,
            email,
            hashedPassword,
        ],
    );

    return {
        id: result.insertId,
        name,
        email,
        role: "Admin",
    };
};

// LOGIN ADMIN / STAFF / MANAGER
const login = async ({ email, password }) => {
    const users = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.password_hash,
            u.phone,
            u.is_active,
            r.id AS role_id,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE u.email = ?
         LIMIT 1`,
        [email],
    );

    if (!users.length) {
        throw new AppError("Invalid email or password", 401);
    }

    const user = users[0];

    if (!user.is_active) {
        throw new AppError("Account is inactive", 403);
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password_hash,
    );

    if (!isMatch) {
        throw new AppError("Invalid email or password", 401);
    }

    if (!["Admin", "Staff", "Manager"].includes(user.role)) {
        throw new AppError("Unsupported employee role", 403);
    }

    await db.query(
        `UPDATE users
         SET last_login_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [user.id],
    );

    const tokens = createEmployeeTokens(user);
    const tokenName = roleTokenName(user.role);

    return {
        token: tokens.token,
        [tokenName]: tokens.token,
        refreshToken: tokens.refreshToken,
        refreshRole: tokens.role,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role_id: user.role_id,
            role: user.role,
        },
    };
};

const refreshEmployeeToken = async ({
    refreshToken,
    expectedRole,
}) => {
    if (!refreshToken) {
        throw new AppError(
            "Refresh token required",
            401,
        );
    }

    let decoded;

    try {
        decoded = verifyRefreshToken(
            refreshToken,
        );
    } catch (error) {
        throw new AppError(
            "Invalid or expired refresh token",
            401,
        );
    }

    if (
        decoded.type !== "refresh"
    ) {
        throw new AppError(
            "Invalid refresh token",
            401,
        );
    }

    if (
        decoded.role !== expectedRole
    ) {
        throw new AppError(
            "Refresh token role mismatch",
            401,
        );
    }

    if (!decoded.id) {
        throw new AppError(
            "Invalid refresh token payload",
            401,
        );
    }

    const users = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.is_active,
            r.id AS role_id,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE u.id = ?
         LIMIT 1`,
        [decoded.id],
    );

    if (!users.length) {
        throw new AppError(
            "User account no longer exists",
            401,
        );
    }

    const user = users[0];

    if (!user.is_active) {
        throw new AppError(
            "Account is inactive",
            401,
        );
    }

    /*
     * Verify the database role, not only the
     * role contained inside the refresh token.
     */
    if (
        user.role !== expectedRole
    ) {
        throw new AppError(
            "User role no longer matches token",
            401,
        );
    }

    const token = generateToken({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        role: user.role,
    });

    return {
        token,

        role: user.role,

        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role_id: user.role_id,
            role: user.role,
        },
    };
};

// GET CURRENT USER
const getCurrentUser = async (userId) => {
    const users = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.profile_image,
            u.is_active,
            u.last_login_at,
            u.created_at,
            r.id AS role_id,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE u.id = ?
         LIMIT 1`,
        [userId],
    );

    if (!users.length) {
        throw new AppError("User account no longer exists", 401);
    }

    const user = users[0];

    if (!user.is_active) {
        throw new AppError("Account is inactive", 401);
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profile_image: user.profile_image,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        role_id: user.role_id,
        role: user.role,
    };
};

module.exports = {
    register,
    login,
    refreshEmployeeToken,
    getCurrentUser,
};
