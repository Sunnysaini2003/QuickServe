const db = require("../../utils/db");

const AppError = require("../../utils/AppError");



// GET ALL MENU


const getAllMenu = async () => {

    const rows = await db.query(`
        SELECT
            m.*,
            c.name AS category_name
        FROM menu_items m
        INNER JOIN categories c
            ON c.id = m.category_id
        ORDER BY m.id DESC
    `);

    return rows;

};



// GET MENU BY ID


const getMenuById = async (id) => {

    const rows = await db.query(
        `
        SELECT
            m.*,
            c.name AS category_name
        FROM menu_items m
        INNER JOIN categories c
            ON c.id = m.category_id
        WHERE m.id = ?
        `,
        [id]
    );


    if (!rows.length) {

        throw new AppError(
            "Menu item not found",
            404
        );

    }


    return rows[0];

};



// CREATE MENU


const createMenu = async (data = {}) => {


    // NORMALIZE DATA


    const categoryId =
        data.category_id;

    const name =
        data.name?.trim();

    const description =
        data.description?.trim() || null;

    const price =
        data.price;

    const image =
        data.image || null;

    const isVeg =
        data.is_veg !== undefined
            ? normalizeBoolean(data.is_veg)
            : true;

    const isAvailable =
        data.is_available !== undefined
            ? normalizeBoolean(data.is_available)
            : true;



    // VALIDATION


    if (!categoryId) {

        throw new AppError(
            "Category is required",
            422
        );

    }


    if (!name) {

        throw new AppError(
            "Menu item name is required",
            422
        );

    }


    if (
        price === undefined ||
        price === null ||
        price === "" ||
        Number(price) <= 0
    ) {

        throw new AppError(
            "Price must be greater than 0",
            422
        );

    }



    // CATEGORY CHECK


    const category =
        await db.query(
            `
            SELECT id
            FROM categories
            WHERE id = ?
            `,
            [categoryId]
        );


    if (!category.length) {

        throw new AppError(
            "Category not found",
            404
        );

    }



    // INSERT


    const result =
        await db.query(
            `
            INSERT INTO menu_items
            (
                category_id,
                name,
                description,
                price,
                image,
                is_veg,
                is_available
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                categoryId,
                name,
                description,
                price,
                image,
                isVeg,
                isAvailable
            ]
        );



    // RETURN CREATED ITEM


    return await getMenuById(
        result.insertId
    );

};



// UPDATE MENU


const updateMenu = async (
    id,
    data = {}
) => {


    // EXISTING ITEM


    const menu =
        await getMenuById(id);



    // NORMALIZE


    const categoryId =
        data.category_id ??
        menu.category_id;

    const name =
        data.name !== undefined
            ? String(data.name).trim()
            : menu.name;

    const description =
        data.description !== undefined
            ? (
                String(data.description).trim() ||
                null
            )
            : menu.description;

    const price =
        data.price ??
        menu.price;

    const image =
        data.image !== undefined
            ? data.image
            : menu.image;

    const isVeg =
        data.is_veg !== undefined
            ? normalizeBoolean(data.is_veg)
            : normalizeBoolean(menu.is_veg);

    const isAvailable =
        data.is_available !== undefined
            ? normalizeBoolean(data.is_available)
            : normalizeBoolean(menu.is_available);



    // VALIDATION


    if (!categoryId) {

        throw new AppError(
            "Category is required",
            422
        );

    }


    if (!name) {

        throw new AppError(
            "Menu item name is required",
            422
        );

    }


    if (
        price === undefined ||
        price === null ||
        price === "" ||
        Number(price) <= 0
    ) {

        throw new AppError(
            "Price must be greater than 0",
            422
        );

    }



    // CATEGORY CHECK


    const category =
        await db.query(
            `
            SELECT id
            FROM categories
            WHERE id = ?
            `,
            [categoryId]
        );


    if (!category.length) {

        throw new AppError(
            "Category not found",
            404
        );

    }



    // UPDATE


    await db.query(
        `
        UPDATE menu_items
        SET
            category_id = ?,
            name = ?,
            description = ?,
            price = ?,
            image = ?,
            is_veg = ?,
            is_available = ?
        WHERE id = ?
        `,
        [
            categoryId,
            name,
            description,
            price,
            image,
            isVeg,
            isAvailable,
            id
        ]
    );



    // RETURN UPDATED ITEM


    return await getMenuById(id);

};



// DELETE MENU


const deleteMenu = async (id) => {

    // Make sure it exists.
    await getMenuById(id);


    await db.query(
        `
        DELETE FROM menu_items
        WHERE id = ?
        `,
        [id]
    );


    return true;

};



// BOOLEAN HELPER


const normalizeBoolean = (value) => {

    if (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true" ||
        value === "TRUE" ||
        value === "True" ||
        value === "active" ||
        value === "ACTIVE"
    ) {

        return 1;

    }


    return 0;

};



// EXPORT


module.exports = {

    getAllMenu,

    getMenuById,

    createMenu,

    updateMenu,

    deleteMenu

};