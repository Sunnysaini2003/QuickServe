import api from "./axios";


// GET ALL CATEGORIES


export const getCategories = async () => {
    const response = await api.get("/categories");

    return response.data;
};


// GET CATEGORY BY ID


export const getCategoryById = async (id) => {
    const response = await api.get(`/categories/${id}`);

    return response.data;
};


// CREATE CATEGORY


export const createCategory = async (formData) => {
    const response = await api.post(
        "/categories",
        formData
    );

    return response.data;
};


// UPDATE CATEGORY


export const updateCategory = async (id, formData) => {
    const response = await api.put(
        `/categories/${id}`,
        formData
    );

    return response.data;
};


// UPDATE STATUS


export const updateCategoryStatus = async (id, status) => {
    const response = await api.patch(
        `/categories/${id}/status`,
        {
            status
        }
    );

    return response.data;
};


// DELETE CATEGORY


export const deleteCategory = async (id) => {
    const response = await api.delete(
        `/categories/${id}`
    );

    return response.data;
};