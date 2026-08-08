const db = require("../../utils/db");
const AppError = require("../../utils/AppError");

const getAllCategories = async () => {

    const categories = await db.query(
        `SELECT id, name, image, status, created_at, updated_at
         FROM categories
         ORDER BY id DESC`
    );

    return categories;
};

const getcategoriesById = async (id) => {

    const categories = await db.query(
        `SELECT id, name, image, status, created_at, updated_at
         FROM categories
         WHERE id = ?`,
        [id]
    );

    if (!categories.length) {
        throw new AppError("categories not found", 404);
    }

    return categories[0];
};

const createcategories = async ({ name, image = null, status = true }) => {

    const existing = await db.query(
        "SELECT id FROM categories WHERE name = ?",
        [name]
    );

    if (existing.length) {
        throw new AppError("categories already exists", 409);
    }

    const result = await db.query(
        `INSERT INTO categories (name, image, status)
         VALUES (?, ?, ?)`,
        [name, image, status]
    );

    return getcategoriesById(result.insertId);
};

const updatecategories = async (id, data) => {

    const categories = await getcategoriesById(id);

    const name =
        data.name !== undefined
            ? data.name
            : categories.name;

    const status =
        data.status !== undefined
            ? data.status
            : categories.status;

    const image =
        data.image !== undefined
            ? data.image
            : categories.image;

    if (name !== categories.name) {

        const existing = await db.query(
            "SELECT id FROM categories WHERE name = ? AND id != ?",
            [name, id]
        );

        if (existing.length) {
            throw new AppError("categories already exists", 409);
        }
    }

    await db.query(
        `UPDATE categories
         SET name = ?, image = ?, status = ?
         WHERE id = ?`,
        [name, image, status, id]
    );

    return getcategoriesById(id);
};

const deletecategories = async (id) => {

    await getcategoriesById(id);

    await db.query(
        "DELETE FROM categories WHERE id = ?",
        [id]
    );

    return true;
};

module.exports = {
    getAllCategories,
    getcategoriesById,
    createcategories,
    updatecategories,
    deletecategories
};