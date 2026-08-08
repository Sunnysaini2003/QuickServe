const tableService = require("./table.service");
const { success } = require("../../utils/apiResponse");

const getAllTables = async (req, res, next) => {
    try {

        const tables = await tableService.getAllTables();

        return success(
            res,
            "Tables fetched successfully",
            tables
        );

    } catch (error) {
        next(error);
    }
};


const getTableByToken = async (req, res, next) => {

    try {

        const table = await tableService.getTableByToken(
            req.params.token
        );

        return success(
            res,
            "Table verified successfully",
            table
        );

    } catch (error) {
        next(error);
    }
};

const createTable = async (req, res, next) => {
    try {

        const table = await tableService.createTable(req.body);

        return success(
            res,
            "Table created successfully",
            table,
            201
        );

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllTables,
    getTableByToken,
    createTable
};