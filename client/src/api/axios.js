import axios from "axios";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

if (!apiBaseUrl) {
  console.warn("VITE_API_URL is not configured. API requests will fail until it is set.");
}

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
});

const LOGIN_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
];

const roleUserKeys = {
  admin: "admin_user",
  staff: "staff_user",
  manager: "manager_user",
};

const getRoleFromPath = () => {
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
      localStorage.getItem(
        "kitchen_auth_role",
      );

    if (kitchenRole === "Admin") {
      return "admin";
    }

    if (kitchenRole === "Staff") {
      return "staff";
    }

    // Keep existing kitchen fallback behavior.
    if (
      localStorage.getItem("admin_user")
    ) {
      return "admin";
    }

    if (
      localStorage.getItem("staff_user")
    ) {
      return "staff";
    }

    return null;
  }

  if (pathname.startsWith("/customer")) {
    return "customer";
  }

  return null;
};

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
    localStorage.removeItem("tableToken");
  }
};

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
   * in localStorage when HttpOnly cookies are
   * enabled.
   *
   * The backend sets qs_<role>_token.
   */
  const token = data?.token;

  if (!token) {
    /*
     * The server should still refresh the
     * HttpOnly cookie. We do not require the
     * raw token on the frontend.
     */
    return true;
  }

  if (data?.user && roleUserKeys[role]) {
    localStorage.setItem(
      roleUserKeys[role],
      JSON.stringify(data.user),
    );
  }

  return token;
};

const logoutRole = async (role) => {
  if (
    !["admin", "staff", "manager"].includes(
      role,
    )
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


// REQUEST INTERCEPTOR


api.interceptors.request.use(
  (config) => {
    const role =
      config._authRoleOverride ||
      config._authRole ||
      getRoleFromPath();

    config._authRole = role;

    if (
      ["admin", "staff", "manager"].includes(
        role,
      )
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
     * JWT is stored in HttpOnly cookies.
     * Do not read localStorage token values.
     */
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// RESPONSE INTERCEPTOR


api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest
    ) {
      return Promise.reject(error);
    }

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

    const role =
      originalRequest._authRole ||
      getRoleFromPath();

    if (
      !["admin", "staff", "manager"].includes(
        role,
      )
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshAccessToken(role);

      /*
       * Retry the exact original request.
       *
       * The browser will automatically attach
       * the newly refreshed HttpOnly access cookie.
       */
      return api(originalRequest);
    } catch (refreshError) {
      console.warn(
        `⚠️ ${role} refresh failed:`,
        refreshError?.message ||
        refreshError,
      );

      await logoutRole(role);
      removeAuthSession(role);

      const pathname =
        window.location.pathname;

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

      if (role === "manager") {
        if (
          pathname.startsWith("/manager") &&
          pathname !==
          "/manager/login"
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