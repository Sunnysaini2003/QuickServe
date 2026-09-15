const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export { API_URL };

export const getImageUrl = (image) => {
    if (!image || typeof image !== "string") {
        return null;
    }

    const path = image.trim();

    if (!path) {
        return null;
    }

    // Already an absolute URL/data/blob URL
    if (/^(https?:\/\/|data:|blob:)/i.test(path)) {
        return path;
    }

    const cleanPath = path.replace(/^\/+/, "");

    // Database stores uploads/...
    if (cleanPath.startsWith("uploads/")) {
        return `${API_URL}/${cleanPath}`;
    }

    // Filename only = menu image
    return `${API_URL}/uploads/menu/${cleanPath}`;
};

export const toBoolean = (value) => {
    return [
        true,
        1,
        "1",
        "true",
        "TRUE",
        "True",
    ].includes(value);
};

export const extractArray = (response) => {
    const data =
        response?.data?.data ??
        response?.data ??
        response;

    return Array.isArray(data) ? data : [];
};

export const extractOrder = (response) => {
    return (
        response?.data?.data ||
        response?.data?.order ||
        response?.data ||
        response?.order ||
        null
    );
};