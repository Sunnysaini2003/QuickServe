import api from "./axios";



// GET KITCHEN ORDERS


export const getKitchenOrders = async (role) => {

    const response = await api.get(
        "/kitchen/orders",
        {
            authRole: role,
        }
    );

    return response.data;
};



// UPDATE KITCHEN ORDER STATUS


export const updateKitchenOrderStatus = async (
    orderId,
    status,
    role
) => {

    const response = await api.patch(
        `/orders/admin/${orderId}/status`,
        {
            status,
        },
        {
            authRole: role,
        }
    );

    return response.data;
};