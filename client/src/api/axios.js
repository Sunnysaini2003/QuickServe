import axios from "axios";

/*
 * API BASE URL
 *
 * Production on Vercel:
 *   Use same-origin /api so browser requests do not directly
 *   cross from Vercel -> Render for normal API calls.
 *
 * Local development:
 *   Use VITE_API_URL, normally:
 *   http://localhost:5000
 */

const apiBaseUrl = String(
  import.meta.env.VITE_API_URL || "",
).replace(/\/+$/, "");

const runtimeHostname =
  typeof window !== "undefined"
    ? window.location.hostname
    : "";

const useSameOriginApi =
  String(import.meta.env.VITE_API_PROXY || "").toLowerCase() ===
    "true" ||
  runtimeHostname.endsWith(".vercel.app");

if (!apiBaseUrl && !useSameOriginApi) {
  console.warn(
    "VITE_API_URL is not configured and VITE_API_PROXY is not enabled. API requests may fail.",
  );
}

const apiBaseURL = useSameOriginApi
  ? "/api"
  : `${apiBaseUrl}/api`;


/*
 * AXIOS INSTANCE
 *
 * withCredentials is important because QuickServe
 * uses HttpOnly cookies for authentication.
 */

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});


/*
 * ROUTES THAT MUST NOT TRIGGER
 * THE AUTOMATIC REFRESH FLOW
 */

const LOGIN_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
];


/*
 * ROLE -> LOCAL USER INFO KEY
 *
 * JWTs are NOT stored here.
 * These keys only store safe user information.
 */

const roleUserKeys = {
  admin: "admin_user",
  staff: "staff_user",
  manager: "manager_user",
};


/*
 * DETERMINE CURRENT ROLE FROM URL
 */

const getRoleFromPath = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const pathname = window.location.pathname;

  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/staff")) {
    return "staff";
  }

  if (pathname.startsWith("/manager")) {
    return "manager";
  }

  if (pathname.startsWith("/kitchen")) {
    const kitchenRole =
      localStorage.getItem("kitchen_auth_role");

    if (kitchenRole === "Admin") {
      return "admin";
    }

    if (kitchenRole === "Staff") {
      return "staff";
    }

    /*
     * Keep existing kitchen fallback behavior.
     */

    if (localStorage.getItem("admin_user")) {
      return "admin";
    }

    if (localStorage.getItem("staff_user")) {
      return "staff";
    }

    return null;
  }

  if (pathname.startsWith("/customer")) {
    return "customer";
  }

  return null;
};


/*
 * REMOVE FRONTEND AUTH SESSION DATA
 *
 * JWTs are intentionally NOT stored in localStorage.
 */

const removeAuthSession = (role) => {
  if (role === "admin") {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    return;
  }

  if (role === "staff") {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_user");
    return;
  }

  if (role === "manager") {
    localStorage.removeItem("manager_token");
    localStorage.removeItem("manager_user");
    return;
  }

  if (role === "customer") {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");

    /*
     * Do NOT remove the cart here.
     *
     * Cart persistence is handled separately in Menu.jsx
     * and is scoped to the table token.
     */

    localStorage.removeItem("tableToken");
  }
};


/*
 * REFRESH EMPLOYEE ACCESS TOKEN
 *
 * Supported roles:
 *   admin
 *   staff
 *   manager
 *
 * Customer authentication uses its own customer-session
 * cookie flow and does not use this employee refresh flow.
 */

const refreshAccessToken = async (role) => {
  if (!["admin", "staff", "manager"].includes(role)) {
    throw new Error(
      "Refresh is not available for this role",
    );
  }

  const response = await api.post(
    "/auth/refresh",
    null,
    {
      _skipAuthRefresh: true,
      _authRole: role,

      headers: {
        "X-QuickServe-Role": role,
      },
    },
  );

  const data =
    response?.data?.data ||
    response?.data ||
    response;


  /*
   * Access token is intentionally NOT stored
   * in localStorage.
   *
   * Backend sets the HttpOnly cookie:
   *
   * qs_admin_token
   * qs_staff_token
   * qs_manager_token
   */

  const token = data?.token;

  /*
   * The server can successfully refresh the
   * HttpOnly cookie without returning the token.
   *
   * Therefore absence of data.token is not an error.
   */

  if (!token) {
    if (data?.user && roleUserKeys[role]) {
      localStorage.setItem(
        roleUserKeys[role],
        JSON.stringify(data.user),
      );
    }

    return true;
  }


  /*
   * Safe user information only.
   */

  if (data?.user && roleUserKeys[role]) {
    localStorage.setItem(
      roleUserKeys[role],
      JSON.stringify(data.user),
    );
  }

  return token;
};


/*
 * LOGOUT EMPLOYEE ROLE
 */

const logoutRole = async (role) => {
  if (
    !["admin", "staff", "manager"].includes(role)
  ) {
    return;
  }

  try {
    await api.post(
      "/auth/logout",
      null,
      {
        _skipAuthRefresh: true,
        _authRole: role,

        headers: {
          "X-QuickServe-Role": role,
        },
      },
    );
  } catch (error) {
    console.warn(
      `QuickServe ${role} logout request failed:`,
      error?.message || error,
    );
  }
};


/*
 * REQUEST INTERCEPTOR
 */

api.interceptors.request.use(
  (config) => {
    const role =
      config._authRoleOverride ||
      config._authRole ||
      getRoleFromPath();

    config._authRole = role;


    /*
     * Employee role header
     *
     * Backend uses this to identify which
     * role-specific HttpOnly cookie should be used.
     */

    if (
      ["admin", "staff", "manager"].includes(role)
    ) {
      config.headers =
        config.headers || {};

      const roleHeaderMap = {
        admin: "Admin",
        staff: "Staff",
        manager: "Manager",
      };

      config.headers[
        "X-QuickServe-Role"
      ] = roleHeaderMap[role];
    }


    /*
     * JWTs must never be read from localStorage.
     *
     * Browser automatically sends matching
     * HttpOnly cookies because withCredentials=true.
     */

    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }


    /*
     * Let Axios/browser automatically set
     * the multipart Content-Type boundary.
     */

    if (
      config.data instanceof FormData &&
      config.headers
    ) {
      delete config.headers["Content-Type"];
    }

    return config;
  },

  (error) =>
    Promise.reject(error),
);


/*
 * RESPONSE INTERCEPTOR
 *
 * If an employee protected API request gets 401:
 *
 * Request
 *   ↓
 * 401
 *   ↓
 * Refresh HttpOnly cookie
 *   ↓
 * Retry original request
 */

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;


    /*
     * Only handle HTTP 401 responses.
     */

    if (
      error.response?.status !== 401 ||
      !originalRequest
    ) {
      return Promise.reject(error);
    }


    /*
     * Prevent infinite refresh loops.
     */

    if (
      originalRequest._skipAuthRefresh ||
      originalRequest._retry ||
      LOGIN_PATHS.some((path) =>
        String(
          originalRequest.url || "",
        ).includes(path),
      )
    ) {
      return Promise.reject(error);
    }


    /*
     * Determine employee role.
     */

    const role =
      originalRequest._authRole ||
      getRoleFromPath();


    /*
     * Customer requests must NOT use
     * the employee refresh mechanism.
     *
     * This is especially important for:
     *
     * /customers/session
     * /orders
     * /customer/orders
     *
     * Customer authentication is handled
     * through its separate HttpOnly cookie.
     */

    if (
      !["admin", "staff", "manager"].includes(role)
    ) {
      return Promise.reject(error);
    }


    /*
     * Mark request so it can only be retried once.
     */

    originalRequest._retry = true;

    try {
      await refreshAccessToken(role);


      /*
       * Retry the exact original request.
       *
       * The browser automatically sends the
       * refreshed HttpOnly access cookie.
       */

      return api(originalRequest);

    } catch (refreshError) {
      console.warn(
        `⚠️ ${role} refresh failed:`,
        refreshError?.message ||
          refreshError,
      );


      /*
       * Attempt server logout.
       */

      await logoutRole(role);


      /*
       * Remove local safe-session information.
       */

      removeAuthSession(role);


      if (
        typeof window === "undefined"
      ) {
        return Promise.reject(error);
      }


      const pathname =
        window.location.pathname;


      /*
       * ADMIN
       */

      if (role === "admin") {
        if (
          pathname.startsWith(
            "/kitchen",
          )
        ) {
          localStorage.removeItem(
            "kitchen_auth_role",
          );

          window.location.replace(
            "/admin/login",
          );

        } else if (
          pathname.startsWith("/admin") &&
          pathname !== "/admin/login"
        ) {
          window.location.replace(
            "/admin/login",
          );
        }
      }


      /*
       * STAFF
       */

      if (role === "staff") {
        if (
          pathname.startsWith(
            "/kitchen",
          )
        ) {
          localStorage.removeItem(
            "kitchen_auth_role",
          );

          window.location.replace(
            "/staff/login",
          );

        } else if (
          pathname.startsWith("/staff") &&
          pathname !== "/staff/login"
        ) {
          window.location.replace(
            "/staff/login",
          );
        }
      }


      /*
       * MANAGER
       */

      if (role === "manager") {
        if (
          pathname.startsWith("/manager") &&
          pathname !== "/manager/login"
        ) {
          window.location.replace(
            "/manager/login",
          );
        }
      }

      return Promise.reject(error);
    }
  },
);


export {
  logoutRole,
  refreshAccessToken,
};


export default api;