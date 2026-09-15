// src/utils/helpers.js

export const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

/**
 * Formats image paths into valid URLs
 */
export const getImageUrl = (image) => {
    if (!image || typeof image !== "string") {
        return null;
    }

    const path = image.trim();

    if (!path) {
        return null;
    }

    // Already a full URL or base64 image
    if (/^(https?:\/\/|data:|blob:)/i.test(path)) {
        return path;
    }

    // Remove all leading slashes
    const cleanPath = path.replace(/^\/+/, "");

    if (cleanPath.startsWith("uploads/")) {
        return `${API_URL}/${cleanPath}`;
    }

    return `${API_URL}/uploads/menu/${cleanPath}`;
};

/**
 * Safely converts various truthy values to a strict boolean
 */
export const toBoolean = (value) => {
    return [true, 1, "1", "true", "TRUE"].includes(value);
};

/**
 * Safely extracts an array from various API response structures
 */
export const extractArray = (response) => {
    const data =
        response?.data?.data ??
        response?.data ??
        response;

    return Array.isArray(data) ? data : [];
};

/**
 * Safely extracts order details from various API response structures
 */
export const extractOrder = (response) => {
    return (
        response?.data?.data ||
        response?.data?.order ||
        response?.data ||
        response?.order ||
        null
    );
};