import api from "./axios";

export const createOrder = async (data) => {
    const response = await api.post("/orders", data);
    return response.data;
};

export const getCurrentOrders = async () => {
    const response = await api.get("/orders/current");
    return response.data;
};

export const getOrderById = async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
};

export const getOrderHistory = async () => {
    const response = await api.get("/orders/history");
    return response.data;
};



// ADMIN ORDERS


export const getAdminOrders = async (params = {}) => {
    const response = await api.get("/orders/admin", {
        params
    });

    return response.data;
};


export const getAdminOrderById = async (id) => {
    const response = await api.get(`/orders/admin/${id}`);

    return response.data;
};


export const updateAdminOrderStatus = async (
    id,
    status
) => {
    const response = await api.patch(
        `/orders/admin/${id}/status`,
        {
            status
        }
    );

    return response.data;
};