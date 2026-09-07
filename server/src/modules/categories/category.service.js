const db = require("../../utils/db");
const AppError = require("../../utils/AppError");


// GET ALL CATEGORIES


const getCategories = async ({
    search = "",
    status = ""
} = {}) => {

    const conditions = [];
    const params = [];

    --------------
    // SEARCH
    --------------

    if (search.trim()) {
        conditions.push(`
            c.name LIKE ?
        `);

        params.push(
            `%${search.trim()}%`
        );
    }

    --------------
    // STATUS
    --------------

    if (status !== "") {

        const normalizedStatus = Number(status);

        if (![0, 1].includes(normalizedStatus)) {
            throw new AppError(
                "Invalid category status",
                400
            );
        }

        conditions.push(
            "c.status = ?"
        );

        params.push(normalizedStatus);
    }

    --------------
    // WHERE CLAUSE
    --------------

    const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    --------------
    // GET CATEGORIES
    --------------

    const categories = await db.query(
        `
            SELECT
                c.id,
                c.name,
                c.image,
                c.status,
                c.created_at,
                c.updated_at,

                COUNT(mi.id) AS item_count

            FROM categories c

            LEFT JOIN menu_items mi
                ON mi.category_id = c.id

            ${whereClause}

            GROUP BY
                c.id,
                c.name,
                c.image,
                c.status,
                c.created_at,
                c.updated_at

            ORDER BY
                c.id ASC
        `,
        params
    );

    --------------
    // FORMAT RESULT
    --------------

    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        image: category.image || null,
        status: Number(category.status),
        item_count: Number(category.item_count || 0),
        created_at: category.created_at,
        updated_at: category.updated_at
    }));
};


// GET CATEGORY BY ID


const getCategoryById = async (categoryId) => {

    const categories = await db.query(
        `
            SELECT
                c.id,
                c.name,
                c.image,
                c.status,
                c.created_at,
                c.updated_at,

                COUNT(mi.id) AS item_count

            FROM categories c

            LEFT JOIN menu_items mi
                ON mi.category_id = c.id

            WHERE c.id = ?

            GROUP BY
                c.id,
                c.name,
                c.image,
                c.status,
                c.created_at,
                c.updated_at

            LIMIT 1
        `,
        [categoryId]
    );

    if (!categories.length) {
        throw new AppError(
            "Category not found",
            404
        );
    }

    const category = categories[0];

    return {
        id: category.id,
        name: category.name,
        image: category.image || null,
        status: Number(category.status),
        item_count: Number(category.item_count || 0),
        created_at: category.created_at,
        updated_at: category.updated_at
    };
};


// CREATE CATEGORY


const createCategory = async ({
    name,
    image = null,
    status = 1
}) => {

    --------------
    // VALIDATE NAME
    --------------

    if (
        !name ||
        typeof name !== "string" ||
        !name.trim()
    ) {
        throw new AppError(
            "Category name is required",
            400
        );
    }

    const categoryName = name.trim();

    --------------
    // VALIDATE STATUS
    --------------

    const normalizedStatus = Number(status);

    if (![0, 1].includes(normalizedStatus)) {
        throw new AppError(
            "Invalid category status",
            400
        );
    }

    --------------
    // CHECK DUPLICATE
    --------------

    const existing = await db.query(
        `
            SELECT id
            FROM categories
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
        `,
        [categoryName]
    );

    if (existing.length) {
        throw new AppError(
            "Category already exists",
            409
        );
    }

    --------------
    // CREATE CATEGORY
    --------------

    const result = await db.query(
        `
            INSERT INTO categories
            (
                name,
                image,
                status
            )
            VALUES (?, ?, ?)
        `,
        [
            categoryName,
            image || null,
            normalizedStatus
        ]
    );

    --------------
    // RETURN CREATED CATEGORY
    --------------

    return getCategoryById(
        result.insertId
    );
};


// UPDATE CATEGORY


const updateCategory = async (
    categoryId,
    {
        name,
        image,
        status
    }
) => {
    --------------
    // CHECK CATEGORY
    --------------

    await getCategoryById(categoryId);

    --------------
    // VALIDATE NAME
    --------------

    if (
        name !== undefined &&
        (
            typeof name !== "string" ||
            !name.trim()
        )
    ) {
        throw new AppError(
            "Category name cannot be empty",
            400
        );
    }

    --------------
    // VALIDATE STATUS
    --------------

    let normalizedStatus;

    if (status !== undefined) {
        normalizedStatus = Number(status);

        if (![0, 1].includes(normalizedStatus)) {
            throw new AppError(
                "Invalid category status",
                400
            );
        }
    }

    --------------
    // CHECK DUPLICATE NAME
    --------------

    if (name !== undefined) {
        const categoryName = name.trim();

        const existing = await db.query(
            `
                SELECT id
                FROM categories
                WHERE LOWER(name) = LOWER(?)
                AND id <> ?
                LIMIT 1
            `,
            [
                categoryName,
                categoryId
            ]
        );

        if (existing.length) {
            throw new AppError(
                "Category already exists",
                409
            );
        }
    }

    --------------
    // BUILD UPDATE
    --------------

    const updates = [];
    const params = [];

    if (name !== undefined) {
        updates.push("name = ?");
        params.push(name.trim());
    }

    if (image !== undefined) {
        updates.push("image = ?");
        params.push(image || null);
    }

    if (status !== undefined) {
        updates.push("status = ?");
        params.push(normalizedStatus);
    }

    --------------
    // NOTHING TO UPDATE
    --------------

    if (!updates.length) {
        throw new AppError(
            "No category data provided for update",
            400
        );
    }

    --------------
    // UPDATE
    --------------

    params.push(categoryId);

    await db.query(
        `
            UPDATE categories
            SET
                ${updates.join(", ")},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
        params
    );

    --------------
    // RETURN UPDATED CATEGORY
    --------------

    return getCategoryById(categoryId);
};


// UPDATE CATEGORY STATUS


const updateCategoryStatus = async (
    categoryId,
    status
) => {

    --------------
    // VALIDATE STATUS
    --------------

    const normalizedStatus =
        Number(status);

    if (![0, 1].includes(normalizedStatus)) {
        throw new AppError(
            "Invalid category status",
            400
        );
    }

    --------------
    // CHECK CATEGORY
    --------------

    await getCategoryById(
        categoryId
    );

    --------------
    // UPDATE STATUS
    --------------

    await db.query(
        `
            UPDATE categories
            SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
        [
            normalizedStatus,
            categoryId
        ]
    );

    --------------
    // RETURN UPDATED CATEGORY
    --------------

    return getCategoryById(
        categoryId
    );
};


// DELETE CATEGORY


const deleteCategory = async (
    categoryId
) => {

    --------------
    // CHECK CATEGORY
    --------------

    const category =
        await getCategoryById(
            categoryId
        );

    --------------
    // PREVENT DELETE IF ITEMS EXIST
    --------------

    if (category.item_count > 0) {

        throw new AppError(
            "Cannot delete category because menu items are assigned to it",
            409
        );
    }

    --------------
    // DELETE CATEGORY
    --------------

    await db.query(
        `
            DELETE FROM categories
            WHERE id = ?
        `,
        [categoryId]
    );

    --------------
    // RESPONSE
    --------------

    return {
        id: Number(categoryId),
        deleted: true
    };
};


// EXPORTS


module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    updateCategoryStatus,
    deleteCategory
};