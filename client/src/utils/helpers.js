// src/utils/helpers.js

// Ideally, fetch this from your .env file instead of hardcoding
export const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

/**
 * Formats image paths into valid URLs
 */
export const getImageUrl = (image) => {
    if (!image || typeof image !== "string") return null;

    const path = image.trim();
    if (!path) return null;

    // Immediately return if it's already a full URL or base64 data
    if (/^(https?:\/\/|data:)/.test(path)) return path;

    // Strip leading slashes to prevent double slashes in the URL
    const cleanPath = path.replace(/^\/+/, "");

    if (cleanPath.startsWith("uploads/")) {
        return `${API_URL}/${cleanPath}`;
    }

    // Fallback for menu items
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
    // Uses Optional Chaining and Nullish Coalescing to drill down safely
    const data = response?.data?.data ?? response?.data ?? response;
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