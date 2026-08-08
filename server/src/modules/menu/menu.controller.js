const menuService = require("./menu.service");
const { success } = require("../../utils/apiResponse");

const getAllMenu = async(req,res,next)=>{

    try{

        const menu = await menuService.getAllMenu();

        return success(
            res,
            "Menu fetched successfully",
            menu
        );

    }catch(err){
        next(err);
    }

};

const getMenuById = async(req,res,next)=>{

    try{

        const menu = await menuService.getMenuById(
            req.params.id
        );

        return success(
            res,
            "Menu fetched successfully",
            menu
        );

    }catch(err){
        next(err);
    }

};

const createMenu = async(req,res,next)=>{

    try{

        const menu = await menuService.createMenu(req.body);

        return success(
            res,
            "Menu item created successfully",
            menu,
            201
        );

    }catch(err){
        next(err);
    }

};

const updateMenu = async (req, res, next) => {
    try {

        const menu = await menuService.updateMenu(
            req.params.id,
            req.body
        );

        return success(
            res,
            "Menu updated successfully",
            menu
        );

    } catch (err) {
        next(err);
    }
};

const deleteMenu = async(req,res,next)=>{

    try{

        await menuService.deleteMenu(req.params.id);

        return success(
            res,
            "Menu deleted successfully"
        );

    }catch(err){
        next(err);
    }

};

module.exports={
    getAllMenu,
    getMenuById,
    createMenu,
    updateMenu,
    deleteMenu
};