const db = require("../../utils/db");
const AppError = require("../../utils/AppError");

const getAllMenu = async () => {

    return await db.query(`
        SELECT
            m.*,
            c.name AS category_name
        FROM menu_items m
        INNER JOIN categories c
            ON c.id = m.category_id
        ORDER BY m.id DESC
    `);

};

const getMenuById = async (id) => {

    const rows = await db.query(`
        SELECT
            m.*,
            c.name AS category_name
        FROM menu_items m
        INNER JOIN categories c
            ON c.id = m.category_id
        WHERE m.id = ?
    `,[id]);

    if(!rows.length){
        throw new AppError("Menu item not found",404);
    }

    return rows[0];

};

const createMenu = async(data)=>{

    const category = await db.query(
        "SELECT id FROM categories WHERE id=?",
        [data.category_id]
    );

    if(!category.length){
        throw new AppError("Category not found",404);
    }

    const result = await db.query(`
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
        VALUES(?,?,?,?,?,?,?)
    `,[
        data.category_id,
        data.name,
        data.description || null,
        data.price,
        data.image || null,
        data.is_veg ?? true,
        data.is_available ?? true
    ]);

    return await getMenuById(result.insertId);

};


const updateMenu = async (id, data) => {

    const menu = await getMenuById(id);

    const updatedData = {

        category_id:
            data.category_id ?? menu.category_id,

        name:
            data.name ?? menu.name,

        description:
            data.description ?? menu.description,

        price:
            data.price ?? menu.price,

        image:
            data.image ?? menu.image,

        is_veg:
            data.is_veg ?? menu.is_veg,

        is_available:
            data.is_available ?? menu.is_available

    };

    await db.query(`
        UPDATE menu_items
        SET
            category_id=?,
            name=?,
            description=?,
            price=?,
            image=?,
            is_veg=?,
            is_available=?
        WHERE id=?
    `,[
        updatedData.category_id,
        updatedData.name,
        updatedData.description,
        updatedData.price,
        updatedData.image,
        updatedData.is_veg,
        updatedData.is_available,
        id
    ]);

    return await getMenuById(id);

};
const deleteMenu = async(id)=>{

    await getMenuById(id);

    await db.query(
        "DELETE FROM menu_items WHERE id=?",
        [id]
    );

    return true;

};

module.exports={
    getAllMenu,
    getMenuById,
    createMenu,
    updateMenu,
    deleteMenu
};