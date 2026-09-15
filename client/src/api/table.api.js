import api from "./axios";


// GET ALL TABLES


export const getTables = () => {
    return api.get("/tables");
};


// GET TABLE BY ID


export const getTableById = (id) => {
    return api.get(
        `/tables/${id}`
    );
};


// GET TABLE BY QR TOKEN
// PUBLIC


export const getTableByToken = (token) => {
    return api.get(
        `/tables/token/${encodeURIComponent(token)}`
    );
};


// CREATE TABLE


export const createTable = (data) => {
    return api.post(
        "/tables",
        data
    );
};


// UPDATE TABLE


export const updateTable = (
    id,
    data
) => {
    return api.put(
        `/tables/${id}`,
        data
    );
};


// UPDATE STATUS


export const updateTableStatus = (
    id,
    status
) => {
    return api.patch(
        `/tables/${id}/status`,
        {
            status
        }
    );
};


// DELETE TABLE


export const deleteTable = (id) => {
    return api.delete(
        `/tables/${id}`
    );
};