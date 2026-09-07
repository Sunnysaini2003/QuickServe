const tableService = require("./table.service");
const { success } = require("../../utils/apiResponse");

// GET ALL TABLES

const getAllTables = async (req, res, next) => {
    try {
        const tables =
            await tableService.getAllTables();

        return success(
            res,
            "Tables fetched successfully",
            tables
        );
    } catch (error) {
        next(error);
    }
};

// GET TABLE BY ID
// ADMIN

const getTableById = async (req, res, next) => {
    try {
        const table =
            await tableService.getTableByIdService(
                req.params.id
            );

        return success(
            res,
            "Table fetched successfully",
            table
        );
    } catch (error) {
        next(error);
    }
};

// GET TABLE BY QR TOKEN
// PUBLIC CUSTOMER

const getTableByToken = async (req, res, next) => {
    try {
        const table =
            await tableService.getTableByToken(
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

// CREATE TABLE

const createTable = async (req, res, next) => {
    try {
        const table =
            await tableService.createTable(
                req.body
            );

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

// UPDATE TABLE

const updateTable = async (req, res, next) => {
    try {
        const table =
            await tableService.updateTable(
                req.params.id,
                req.body
            );

        return success(
            res,
            "Table updated successfully",
            table
        );
    } catch (error) {
        next(error);
    }
};

// UPDATE STATUS

const updateTableStatus = async (
    req,
    res,
    next
) => {
    try {
        const table =
            await tableService.updateTableStatus(
                req.params.id,
                req.body.status
            );

        return success(
            res,
            "Table status updated successfully",
            table
        );
    } catch (error) {
        next(error);
    }
};

// DELETE TABLE

const deleteTable = async (req, res, next) => {
    try {
        await tableService.deleteTable(
            req.params.id
        );

        return success(
            res,
            "Table deleted successfully"
        );
    } catch (error) {
        next(error);
    }
};

// EXPORTS

module.exports = {
    getAllTables,
    getTableById,
    getTableByToken,
    createTable,
    updateTable,
    updateTableStatus,
    deleteTable
};