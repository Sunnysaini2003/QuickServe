const env = require("../config/env");



// | ACCESS COOKIE NAMES


const EMPLOYEE_COOKIE_NAMES = Object.freeze({
    Admin: "qs_admin_token",
    Staff: "qs_staff_token",
    Manager: "qs_manager_token",
});

const CUSTOMER_SESSION_COOKIE =
    "qs_customer_session_token";

const CUSTOMER_AUTH_COOKIE =
    "qs_customer_auth_token";



// | REFRESH COOKIE NAMES


const REFRESH_COOKIE_NAMES = Object.freeze({
    Admin: "qs_admin_refresh",
    Staff: "qs_staff_refresh",
    Manager: "qs_manager_refresh",
});



// | ROLE NORMALIZATION


const normalizeRole = (role) => {
    const value = String(role || "")
        .trim()
        .toLowerCase();

    if (
        value === "admin" ||
        value === "administrator"
    ) {
        return "Admin";
    }

    if (value === "staff") {
        return "Staff";
    }

    if (value === "manager") {
        return "Manager";
    }

    return null;
};



// | COOKIE OPTIONS


const getCookieOptions = (maxAge) => {
    const sameSite = String(
        env.COOKIE_SAME_SITE || "lax"
    ).toLowerCase();

    const secure =
        String(env.COOKIE_SECURE).toLowerCase() ===
        "true";

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: "/",
        ...(Number.isFinite(maxAge)
            ? { maxAge }
            : {}),
    };
};



// | PARSE COOKIE HEADER


const parseCookies = (cookieHeader) => {
    if (!cookieHeader) {
        return {};
    }

    return String(cookieHeader)
        .split(";")
        .reduce((cookies, part) => {
            const index =
                part.indexOf("=");

            if (index === -1) {
                return cookies;
            }

            const key =
                part.slice(0, index).trim();

            const value =
                part
                    .slice(index + 1)
                    .trim();

            if (!key) {
                return cookies;
            }

            try {
                cookies[key] =
                    decodeURIComponent(value);
            } catch {
                cookies[key] = value;
            }

            return cookies;
        }, {});
};



// | GENERIC COOKIE READER

// |
// | IMPORTANT:
// | Socket authentication uses this.


const getCookieFromHeader = (
    cookieHeader,
    name
) => {
    if (!name) {
        return null;
    }

    const cookies =
        parseCookies(cookieHeader || "");

    return cookies[name] || null;
};



// | EMPLOYEE ACCESS COOKIES


const setEmployeeAuthCookie = (
    res,
    role,
    token
) => {
    const normalizedRole =
        normalizeRole(role);

    const cookieName =
        normalizedRole
            ? EMPLOYEE_COOKIE_NAMES[
                  normalizedRole
              ]
            : null;

    if (!cookieName || !token) {
        throw new Error(
            `Unsupported employee cookie role: ${role}`
        );
    }

    // Access token = 30 minutes
    res.cookie(
        cookieName,
        token,
        getCookieOptions(
            30 * 60 * 1000
        )
    );
};

const clearEmployeeAuthCookie = (
    res,
    role
) => {
    const normalizedRole =
        normalizeRole(role);

    const cookieName =
        normalizedRole
            ? EMPLOYEE_COOKIE_NAMES[
                  normalizedRole
              ]
            : null;

    if (!cookieName) {
        throw new Error(
            `Unsupported employee cookie role: ${role}`
        );
    }

    res.clearCookie(
        cookieName,
        getCookieOptions()
    );
};

const getEmployeeTokenFromRequest = (
    req,
    role
) => {
    const normalizedRole =
        normalizeRole(role);

    const cookieName =
        normalizedRole
            ? EMPLOYEE_COOKIE_NAMES[
                  normalizedRole
              ]
            : null;

    if (!cookieName) {
        return null;
    }

    return getCookieFromHeader(
        req?.headers?.cookie || "",
        cookieName
    );
};



// | CUSTOMER SESSION COOKIE


const setCustomerSessionCookie = (
    res,
    token,
    maxAge =
        12 * 60 * 60 * 1000
) => {
    res.cookie(
        CUSTOMER_SESSION_COOKIE,
        token,
        getCookieOptions(maxAge)
    );
};

const clearCustomerSessionCookie = (
    res
) => {
    res.clearCookie(
        CUSTOMER_SESSION_COOKIE,
        getCookieOptions()
    );
};

const getCustomerSessionTokenFromRequest = (
    req
) => {
    return getCookieFromHeader(
        req?.headers?.cookie || "",
        CUSTOMER_SESSION_COOKIE
    );
};



// | CUSTOMER ACCOUNT COOKIE


const setCustomerAuthCookie = (
    res,
    token,
    maxAge =
        30 * 24 * 60 * 60 * 1000
) => {
    res.cookie(
        CUSTOMER_AUTH_COOKIE,
        token,
        getCookieOptions(maxAge)
    );
};

const clearCustomerAuthCookie = (
    res
) => {
    res.clearCookie(
        CUSTOMER_AUTH_COOKIE,
        getCookieOptions()
    );
};

const getCustomerAuthTokenFromRequest = (
    req
) => {
    return getCookieFromHeader(
        req?.headers?.cookie || "",
        CUSTOMER_AUTH_COOKIE
    );
};

const clearAllCustomerCookies = (
    res
) => {
    clearCustomerSessionCookie(res);
    clearCustomerAuthCookie(res);
};



// | REFRESH COOKIE HELPERS


const getRefreshCookieName = (
    role
) => {
    const normalizedRole =
        normalizeRole(role);

    return normalizedRole
        ? REFRESH_COOKIE_NAMES[
              normalizedRole
          ]
        : null;
};

const setRefreshCookie = (
    res,
    role,
    token,
    maxAge
) => {
    const cookieName =
        getRefreshCookieName(role);

    if (!cookieName) {
        throw new Error(
            `Unsupported authentication role: ${role}`
        );
    }

    res.cookie(
        cookieName,
        token,
        getCookieOptions(maxAge)
    );
};

const clearRefreshCookie = (
    res,
    role
) => {
    const cookieName =
        getRefreshCookieName(role);

    if (!cookieName) {
        return;
    }

    res.clearCookie(
        cookieName,
        getCookieOptions()
    );
};

const getRefreshTokenFromRequest = (
    req,
    role
) => {
    const cookieName =
        getRefreshCookieName(role);

    if (!cookieName) {
        return null;
    }

    return getCookieFromHeader(
        req?.headers?.cookie || "",
        cookieName
    );
};



// | EXPORTS


module.exports = {
    // Access cookies
    EMPLOYEE_COOKIE_NAMES,
    CUSTOMER_SESSION_COOKIE,
    CUSTOMER_AUTH_COOKIE,

    setEmployeeAuthCookie,
    clearEmployeeAuthCookie,
    getEmployeeTokenFromRequest,

    setCustomerSessionCookie,
    clearCustomerSessionCookie,
    getCustomerSessionTokenFromRequest,

    setCustomerAuthCookie,
    clearCustomerAuthCookie,
    getCustomerAuthTokenFromRequest,

    clearAllCustomerCookies,

    // Refresh cookies
    REFRESH_COOKIE_NAMES,
    normalizeRole,
    getRefreshCookieName,
    setRefreshCookie,
    clearRefreshCookie,
    getRefreshTokenFromRequest,

    // Shared helpers
    getCookieOptions,
    parseCookies,
    getCookieFromHeader,
};