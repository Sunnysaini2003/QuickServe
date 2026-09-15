import api from "./axios";



// GET ALL MENU


export const getMenuItems = () => {

    return api.get("/menu");

};



// GET MENU ITEM


export const getMenuItem = (id) => {

    return api.get(
        `/menu/${id}`
    );

};



// CREATE MENU ITEM


export const createMenuItem = (formData) => {

    return api.post(
        "/menu",
        formData
    );

};



// UPDATE MENU ITEM


export const updateMenuItem = (
    id,
    formData
) => {

    return api.put(
        `/menu/${id}`,
        formData
    );

};



// UPDATE STATUS


export const updateMenuItemStatus = (
    id,
    status
) => {

    return api.put(
        `/menu/${id}`,
        {
            is_available: status
        }
    );

};



// DELETE


export const deleteMenuItem = (id) => {

    return api.delete(
        `/menu/${id}`
    );

};