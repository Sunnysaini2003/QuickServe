const menuService = require("./menu.service");

const { success } = require("../../utils/apiResponse");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

// GET ALL MENU

const getAllMenu = async (req, res, next) => {
  try {
    const menu = await menuService.getAllMenu();

    return success(res, "Menu fetched successfully", menu);
  } catch (err) {
    next(err);
  }
};

// GET MENU BY ID

const getMenuById = async (req, res, next) => {
  try {
    const menu = await menuService.getMenuById(req.params.id);

    return success(res, "Menu fetched successfully", menu);
  } catch (err) {
    next(err);
  }
};

// CREATE MENU

const createMenu = async (req, res, next) => {
  try {
    // req.body can technically be undefined,
    // so always provide an object.
    const data = {
      ...(req.body || {}),
    };

    
    // IMAGE
    

    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder: "quickserve/menu",
          resource_type: "image"
        }
      );

      data.image = uploadResult.secure_url;
    }

    console.log("CREATE MENU BODY:", data);

    console.log("CREATE MENU FILE:", req.file);

    const menu = await menuService.createMenu(data);

    return success(res, "Menu item created successfully", menu, 201);
  } catch (err) {
    next(err);
  }
};

// UPDATE MENU

const updateMenu = async (req, res, next) => {
  try {
    const data = {
      ...(req.body || {}),
    };

    
    // IMAGE
    

    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder: "quickserve/menu",
          resource_type: "image"
        }
      );

      data.image = uploadResult.secure_url;
    }

    console.log("UPDATE MENU BODY:", data);

    console.log("UPDATE MENU FILE:", req.file);

    const menu = await menuService.updateMenu(req.params.id, data);

    return success(res, "Menu updated successfully", menu);
  } catch (err) {
    next(err);
  }
};

// DELETE MENU

const deleteMenu = async (req, res, next) => {
  try {
    await menuService.deleteMenu(req.params.id);

    return success(res, "Menu deleted successfully");
  } catch (err) {
    next(err);
  }
};

// EXPORT

module.exports = {
  getAllMenu,

  getMenuById,

  createMenu,

  updateMenu,

  deleteMenu,
};
