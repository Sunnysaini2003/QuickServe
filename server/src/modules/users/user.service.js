const bcrypt = require("bcrypt");

const db = require("../../utils/db");
const AppError = require("../../utils/AppError");

// ==========================================
// CREATE STAFF / MANAGER
// ==========================================

const createUser = async ({
    name,
    email,
    password,
    phone,
    role_id,
    profile_image
}) => {

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
        throw new AppError(
            "Email already exists",
            409
        );
    }

    // ------------------------------------------
    // Check role
    // ------------------------------------------

    const roles = await db.query(
        `SELECT id, name
         FROM roles
         WHERE id = ?
         LIMIT 1`,
        [role_id]
    );

    if (!roles.length) {
        throw new AppError(
            "Invalid role",
            400
        );
    }

    const role = roles[0];

    // ------------------------------------------
    // Prevent creating another Admin
    // ------------------------------------------

    if (role.name === "Admin") {
        throw new AppError(
            "Admin users cannot be created from this endpoint",
            403
        );
    }

    // ------------------------------------------
    // Hash password
    // ------------------------------------------

    const passwordHash = await bcrypt.hash(
        password,
        10
    );

    // ------------------------------------------
    // Create user
    // ------------------------------------------

    const result = await db.query(
        `INSERT INTO users
(
    role_id,
    name,
    email,
    password_hash,
    phone,
    profile_image,
    is_active
)
VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
            role_id,
            name,
            email,
            passwordHash,
            phone || null,
            profile_image || null
        ]
    );

    // ------------------------------------------
    // Get created user
    // ------------------------------------------

    const users = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.profile_image,
            u.is_active,
            r.id AS role_id,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE u.id = ?
         LIMIT 1`,
        [result.insertId]
    );

    return users[0];
};


//get user route
const getUsers = async () => {

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
            u.updated_at,
            r.id AS role_id,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         ORDER BY u.created_at DESC`
    );

    return users;
};

// ==========================================
// UPDATE USER
// ==========================================

const updateUser = async (
    userId,
    {
        name,
        email,
        phone,
        password,
        role_id,
        profile_image
    }
) => {

    // ------------------------------------------
    // Check user exists
    // ------------------------------------------

const users = await db.query(
    `SELECT
        u.id,
        u.role_id,
        r.name AS role
     FROM users u
     INNER JOIN roles r
        ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
);

    if (!users.length) {
        throw new AppError(
            "User not found",
            404
        );
    }

    // ------------------------------------------
    // Prevent modifying Admin account
    // ------------------------------------------

    if (users[0].role === "Admin") {
        throw new AppError(
            "Admin account cannot be modified from this endpoint",
            403
        );
    }

    // ------------------------------------------
    // Check email if email is being changed
    // ------------------------------------------

    if (email) {

        const existingEmail = await db.query(
            `SELECT id
             FROM users
             WHERE email = ?
             AND id != ?
             LIMIT 1`,
            [email, userId]
        );

        if (existingEmail.length) {
            throw new AppError(
                "Email already exists",
                409
            );
        }
    }

    // ------------------------------------------
    // Check role
    // ------------------------------------------

    if (role_id !== undefined) {

        const roles = await db.query(
            `SELECT id, name
             FROM roles
             WHERE id = ?
             LIMIT 1`,
            [role_id]
        );

        if (!roles.length) {
            throw new AppError(
                "Invalid role",
                400
            );
        }

        if (roles[0].name === "Admin") {
            throw new AppError(
                "Admin role cannot be assigned",
                403
            );
        }
    }

    // ------------------------------------------
    // Build update dynamically
    // ------------------------------------------

    const fields = [];
    const values = [];

    if (name !== undefined) {
        fields.push("name = ?");
        values.push(name);
    }

    if (email !== undefined) {
        fields.push("email = ?");
        values.push(email);
    }

    if (phone !== undefined) {
        fields.push("phone = ?");
        values.push(phone || null);
    }

    if (role_id !== undefined) {
        fields.push("role_id = ?");
        values.push(role_id);
    }

    if (profile_image !== undefined) {
        fields.push("profile_image = ?");
        values.push(profile_image || null);
    }

    if (password) {
        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        fields.push("password_hash = ?");
        values.push(passwordHash);
    }

    // ------------------------------------------
    // Nothing to update
    // ------------------------------------------

    if (!fields.length) {
        throw new AppError(
            "No fields provided for update",
            400
        );
    }

    // ------------------------------------------
    // Update user
    // ------------------------------------------

    values.push(userId);

    await db.query(
        `UPDATE users
         SET ${fields.join(", ")}
         WHERE id = ?`,
        values
    );

    // ------------------------------------------
    // Return updated user
    // ------------------------------------------

    const updatedUsers = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.profile_image,
            u.is_active,
            u.last_login_at,
            u.created_at,
            u.updated_at,
            r.id AS role_id,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE u.id = ?
         LIMIT 1`,
        [userId]
    );

    return updatedUsers[0];
};

// ==========================================
// UPDATE USER STATUS
// ==========================================
const updateUserStatus = async (
    userId,
    is_active
) => {

    // ------------------------------------------
    // Validate user ID
    // ------------------------------------------

    const id = Number(userId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(
            "Invalid user ID",
            400
        );
    }


    // ------------------------------------------
    // Validate status
    // ------------------------------------------

    if (
        is_active !== true &&
        is_active !== false &&
        is_active !== 0 &&
        is_active !== 1 &&
        is_active !== "0" &&
        is_active !== "1"
    ) {
        throw new AppError(
            "Invalid user status",
            400
        );
    }


    const active =
        is_active === true ||
        is_active === 1 ||
        is_active === "1"
            ? 1
            : 0;


    // ------------------------------------------
    // Get user
    // ------------------------------------------

    const users = await db.query(
        `SELECT
            u.id,
            u.role_id,
            u.is_active,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE u.id = ?
         LIMIT 1`,
        [id]
    );


    if (!users.length) {
        throw new AppError(
            "User not found",
            404
        );
    }


    const user = users[0];


    // ------------------------------------------
    // Never modify Admin accounts
    // ------------------------------------------

    if (
        user.role_id === 1 ||
        user.role === "Admin"
    ) {
        throw new AppError(
            "Admin account cannot be activated or deactivated from this endpoint",
            403
        );
    }


    // ------------------------------------------
    // No change required
    // ------------------------------------------

    if (user.is_active === active) {

        return await getUserById(id);

    }


    // ------------------------------------------
    // Update status
    // ------------------------------------------

    await db.query(
        `UPDATE users
         SET is_active = ?
         WHERE id = ?`,
        [
            active,
            id
        ]
    );


    // ------------------------------------------
    // Return updated user
    // ------------------------------------------

    return await getUserById(id);
};

const getUserById = async (userId) => {

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
            u.updated_at,
            r.id AS role_id,
            r.name AS role
         FROM users u
         INNER JOIN roles r
            ON r.id = u.role_id
         WHERE u.id = ?
         LIMIT 1`,
        [userId]
    );

    if (!users.length) {
        throw new AppError(
            "User not found",
            404
        );
    }

    return users[0];
};

module.exports = {
    createUser,
    getUsers,
    updateUser,
    updateUserStatus,
    getUserById
};