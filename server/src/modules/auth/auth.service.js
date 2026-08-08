const bcrypt = require("bcrypt");
const generateToken = require("../../utils/generateToken");

const db = require("../../utils/db");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");

// Register Admin
const register = async ({ name, email, password }) => {

    // Check if email already exists
    const existing = await db.query(
        "SELECT id FROM admins WHERE email = ?",
        [email]
    );

    if (existing.length) {
        throw new AppError("Email already exists", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save admin
    const result = await db.query(
        `INSERT INTO admins (name, email, password)
         VALUES (?, ?, ?)`,
        [name, email, hashedPassword]
    );

    return {
        id: result.insertId,
        name,
        email
    };
};

// Login Admin
const login = async ({ email, password }) => {

    // Find admin by email
    const admins = await db.query(
        "SELECT * FROM admins WHERE email = ?",
        [email]
    );

    if (!admins.length) {
        throw new AppError("Invalid email or password", 401);
    }

    const admin = admins[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        throw new AppError("Invalid email or password", 401);
    }

    // Generate JWT
    const token = generateToken({
    id: admin.id,
    email: admin.email,
});

    return {
        token,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email
        }
    };
};

module.exports = {
    register,
    login
};