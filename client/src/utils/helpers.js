// src/utils/helpers.js

const configuredApiUrl = String(
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

/*
 * In production on Vercel, use same-origin paths.
 *
 * This allows:
 *
 * /uploads/menu/file.jpg
 * /uploads/categories/file.jpg
 *
 * to be served through the Vercel rewrite instead of
 * directly loading resources from the Render origin.
 */
const isVercelProduction =
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".vercel.app");

export const API_URL = isVercelProduction
    ? ""
    : configuredApiUrl;


/**
 * Formats image paths into valid URLs.
 *
 * Supported database values:
 *
 * uploads/menu/file.jpg
 * uploads/categories/file.jpg
 * /uploads/menu/file.jpg
 * /uploads/categories/file.jpg
 * file.jpg
 * https://...
 */
export const getImageUrl = (image) => {
    if (!image || typeof image !== "string") {
        return null;
    }

    const path = image.trim();

    if (!path) {
        return null;
    }

    /*
     * Already a complete URL or data URI.
     */
    if (/^(https?:\/\/|data:|blob:)/i.test(path)) {
        return path;
    }

    /*
     * Remove leading slashes.
     */
    const cleanPath = path.replace(/^\/+/, "");

    /*
     * Existing uploads path.
     *
     * Example:
     * uploads/menu/menu-123.jpg
     */
    if (cleanPath.startsWith("uploads/")) {
        return `${API_URL}/${cleanPath}`;
    }

    /*
     * If backend/database stores only the filename,
     * treat it as a menu image.
     */
    return `${API_URL}/uploads/menu/${cleanPath}`;
};


/**
 * Safely converts values into boolean.
 */
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


/**
 * Safely extracts an array from API responses.
 */
export const extractArray = (response) => {
    const data =
        response?.data?.data ??
        response?.data ??
        response;

    return Array.isArray(data)
        ? data
        : [];
};


/**
 * Safely extracts an order object.
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