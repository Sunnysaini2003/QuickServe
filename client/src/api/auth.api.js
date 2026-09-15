import api from "./axios";

// CUSTOMER SESSION

export const createCustomerSession = async (data) => {
  const response = await api.post("/customers/session", data);

  return response.data;
};

// TAKEAWAY SESSION

export const createTakeawaySession = async (data) => {
  const response = await api.post("/customers/takeaway", data);

  return response.data;
};

// ADMIN LOGIN

export const adminLogin = async (data) => {
  const response = await api.post("/auth/login", data);

  return response.data;
};

// STAFF LOGIN

export const staffLogin = async (data) => {
  const response = await api.post("/auth/login", data);

  return response.data;
};

// MANAGER LOGIN

export const managerLogin = async (data) => {
  const response = await api.post("/auth/login", data);

  return response.data;
};

export const registerCustomer = async (data) => {
  const response = await api.post("/customers/register", data);

  return response.data;
};

export const loginCustomer = async (data) => {
  const response = await api.post("/customers/login", data);

  return response.data;
};
