import api from "./axios";

export const getDashboard = async (period = "Today") => {
    const response = await api.get("/dashboard", {
        params: {
            period
        }
    });

    return response.data;
};
