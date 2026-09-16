import { io } from "socket.io-client";

const apiBaseUrl = String(
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const runtimeHostname =
  typeof window !== "undefined"
    ? window.location.hostname
    : "";

const isVercelProduction = runtimeHostname.endsWith(".vercel.app");

// On Vercel, keep Socket.IO same-origin so the HttpOnly auth cookie
// created through the /api rewrite is sent with the polling request.
// The Vercel rewrite forwards /socket.io/* to the Render Socket.IO server.
const SOCKET_URL = isVercelProduction
  ? window.location.origin
  : String(
      import.meta.env.VITE_SOCKET_URL || apiBaseUrl
    ).replace(/\/+$/, "");


/*
 * Refresh employee authentication for Socket.IO.
 *
 * Customer authentication is intentionally NOT refreshed
 * through this function because customers use their own
 * session authentication.
 */
const refreshSocketAuth = async (role) => {
  if (
    !["admin", "staff", "manager"].includes(role)
  ) {
    throw new Error(
      "Socket refresh is unavailable for this role",
    );
  }

  const refreshBaseUrl = isVercelProduction ? "" : apiBaseUrl;

  const response = await fetch(
    `${refreshBaseUrl}/api/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-QuickServe-Role": role,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  const payload =
    await response.json().catch(() => null);

  const data =
    payload?.data || payload;

  if (!response.ok) {
    throw new Error(
      data?.message ||
      "Unable to refresh socket authentication",
    );
  }

  return true;
};


export const createSocket = ({
  role = null,
} = {}) => {
  const validRoles = [
    "customer",
    "admin",
    "staff",
    "manager",
  ];

  if (!validRoles.includes(role)) {
    console.warn(
      "⚠️ Socket: invalid role",
      role,
    );

    return null;
  }

  let refreshAttempted = false;

  /*
   * IMPORTANT:
   *
   * Customer socket continues to connect directly
   * to Render because the backend authenticates it
   * using the HttpOnly customer session cookie.
   *
   * Do not route Socket.IO through the Vercel SPA
   * rewrite.
   */
  const socket = io(SOCKET_URL, {
    path: "/socket.io",

    auth: {
      role,
    },

    /*
     * Required for HttpOnly cookies.
     */
    withCredentials: true,

    /*
     * Start with polling.
     *
     * This is more reliable on mobile networks and
     * allows Socket.IO to upgrade to WebSocket later
     * when possible.
     */
    transports: ["polling"],

    // Vercel's external rewrite is used for Socket.IO polling.
    // Do not attempt a browser WebSocket upgrade through the rewrite.
    upgrade: false,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    timeout: 20000,

    forceNew: false,
  });


  /*
   * CONNECT
   */

  socket.on("connect", () => {
    refreshAttempted = false;

    console.log(
      `🔌 Socket connected: ${socket.id}`,
    );

    console.log(
      `🔌 Socket transport: ${socket.io.engine.transport.name}`,
    );


    /*
     * CUSTOMER
     */

    if (role === "customer") {
      console.log(
        "👤 Customer socket connected",
      );

      return;
    }


    /*
     * KITCHEN
     */

    socket.emit("join_kitchen");

    console.log(
      "👨‍🍳 Requested to join kitchen",
    );


    /*
     * ADMIN
     */

    if (role === "admin") {
      socket.emit("join_admin");

      console.log(
        "👨‍💼 Requested to join admin",
      );
    }


    /*
     * MANAGER
     */

    if (role === "manager") {
      socket.emit("join_manager");

      console.log(
        "👔 Requested to join manager",
      );
    }
  });


  /*
   * TRANSPORT UPGRADE
   */

  // No transport upgrade in production; polling is intentional.


  /*
   * CONNECTION ERROR
   */

  socket.on(
    "connect_error",
    async (error) => {
      console.error(
        "❌ Socket connection error:",
        error?.message || error,
      );


      /*
       * Customer sockets do NOT use employee token
       * refresh.
       *
       * If customer authentication fails, reconnecting
       * repeatedly will not solve an expired/missing
       * customer session.
       */
      if (role === "customer") {
        return;
      }


      /*
       * Avoid multiple refresh attempts.
       */

      if (refreshAttempted) {
        return;
      }


      /*
       * Only refresh if backend reports an
       * authentication-related failure.
       */

      if (
        !/expired|invalid|authentication|cookie|token/i.test(
          error?.message || "",
        )
      ) {
        return;
      }

      refreshAttempted = true;

      try {
        await refreshSocketAuth(role);

        socket.auth = {
          ...(socket.auth || {}),
          role,
        };

        socket.connect();

      } catch (refreshError) {
        console.error(
          `❌ ${role} socket refresh failed:`,
          refreshError?.message ||
          refreshError,
        );
      }
    },
  );


  /*
   * DISCONNECT
   */

  socket.on(
    "disconnect",
    (reason) => {
      console.log(
        "🔌 Socket disconnected:",
        reason,
      );
    },
  );


  /*
   * SERVER SOCKET ERROR
   */

  socket.on(
    "socket_error",
    (error) => {
      console.error(
        "❌ Socket server error:",
        error,
      );
    },
  );


  return socket;
};