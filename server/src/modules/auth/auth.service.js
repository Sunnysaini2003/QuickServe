const bcrypt = require("bcrypt");
const generateToken = require("../../utils/generateToken");

const db = require("../../utils/db");
const AppError = require("../../utils/AppError");

// ==========================================
// REGISTER INITIAL ADMIN
// ==========================================

const register = async ({ name, email, password }) => {

    // ------------------------------------------
    // Check if email already exists
    // ------------------------------------------

    const existing = await db.query(
        `SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    if (existing.length) {
        throw new AppError("Email already exists", 409);
    }

    // ------------------------------------------
    // Get Admin role
    // ------------------------------------------

    const roles = await db.query(
        `SELECT id
         FROM roles
         WHERE name = 'Admin'
         LIMIT 1`
    );

    if (!roles.length) {
        throw new AppError("Admin role not found", 500);
    }

    const roleId = roles[0].id;

    // ------------------------------------------
    // Hash password
    // ------------------------------------------

    const hashedPassword = await bcrypt.hash(
        password,
        10
    );

    // ------------------------------------------
    // Create Admin
    // ------------------------------------------

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
            hashedPassword
        ]
    );

    return {
        id: result.insertId,
        name,
        email,
        role: "Admin"
    };
};


// ==========================================
// LOGIN ADMIN / STAFF / MANAGER
// ==========================================

const login = async ({ email, password }) => {

    // ------------------------------------------
    // Find user with role
    // ------------------------------------------

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
        [email]
    );

    // ------------------------------------------
    // User not found
    // ------------------------------------------

    if (!users.length) {
        throw new AppError(
            "Invalid email or password",
            401
        );
    }

    const user = users[0];

    // ------------------------------------------
    // Check account status
    // ------------------------------------------

    if (!user.is_active) {
        throw new AppError(
            "Account is inactive",
            403
        );
    }

    // ------------------------------------------
    // Compare password
    // ------------------------------------------

    const isMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!isMatch) {
        throw new AppError(
            "Invalid email or password",
            401
        );
    }

    // ------------------------------------------
    // Update last login
    // ------------------------------------------

    await db.query(
        `UPDATE users
         SET last_login_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [user.id]
    );

    // ------------------------------------------
    // Generate JWT
    // ------------------------------------------

    const token = generateToken({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        role: user.role
    });

    // ------------------------------------------
    // Role-specific token name
    // ------------------------------------------

    let roleTokenName = "token";

    if (user.role === "Admin") {
        roleTokenName = "admin_token";
    } else if (
        user.role === "Staff" ||
        user.role === "Manager"
    ) {
        roleTokenName = "staff_token";
    }

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return {
        token,

        [roleTokenName]: token,

        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role_id: user.role_id,
            role: user.role
        }
    };
};

// ==========================================
// GET CURRENT USER
// ==========================================

const getCurrentUser = async (userId) => {

    // ------------------------------------------
    // Find user
    // ------------------------------------------

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
        [userId]
    );


    // ------------------------------------------
    // User no longer exists
    // ------------------------------------------

    if (!users.length) {

        throw new AppError(
            "User account no longer exists",
            401
        );

    }


    const user = users[0];


    // ------------------------------------------
    // Account inactive
    // ------------------------------------------

    if (!user.is_active) {

        throw new AppError(
            "Account is inactive",
            401
        );

    }


    // ------------------------------------------
    // Return safe user data
    // ------------------------------------------

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
        role: user.role
    };
};


module.exports = {
    register,
    login,
    getCurrentUser
};