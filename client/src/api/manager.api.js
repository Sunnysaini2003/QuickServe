import api from "./axios";

export const getManagerOrders = async (params = {}) => {
  const response = await api.get("/orders/manager", { params });
  return response.data;
};

export const getManagerOrderById = async (id) => {
  const response = await api.get(`/orders/manager/${id}`);
  return response.data;
};

export const updateManagerOrderStatus = async (id, status) => {
  const response = await api.patch(`/orders/manager/${id}/status`, {
    status,
  });

  return response.data;
};

export const getManagerCustomers = async (params = {}) => {
  const response = await api.get("/customers/manager", { params });

  return response.data;
};

export const createManagerAssistedOrder = async (data) => {
  const response = await api.post("/orders/manager/assisted", data);

  return response.data;
};

export const exportManagerOrders = async (params = {}, format = "xlsx") => {
  const response = await api.get("/orders/manager/export", {
    params: { ...params, format },
    responseType: "blob",
  });

  return response.data;
};

