import { io } from "socket.io-client";

const apiBaseUrl = String(
  import.meta.env.VITE_API_URL || "http://localhost:5000",
).replace(/\/+$/, "");

const isVercelProduction =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith(".vercel.app");

/*
 * Production on Vercel:
 *
 * The authentication cookies are set through the Vercel /api rewrite,
 * so the browser owns those cookies for the Vercel origin.
 *
 * Connecting Socket.IO directly to Render means the browser does not
 * send those Vercel cookies to Render. That breaks both kitchen and
 * customer socket authentication.
 *
 * Therefore Vercel uses the same-origin Socket.IO URL. vercel.json
 * proxies /socket.io/* to Render.
 *
 * We intentionally use HTTP polling on Vercel. This keeps the realtime
 * connection working through the external rewrite without relying on a
 * WebSocket upgrade through the CDN proxy.
 */
const socketBaseUrl = isVercelProduction
  ? window.location.origin
  : String(
      import.meta.env.VITE_SOCKET_URL || apiBaseUrl
    ).replace(/\/+$/, "");

const socketOptions = {
  auth: {},
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  forceNew: true,
};

if (isVercelProduction) {
  socketOptions.transports = ["polling"];
  socketOptions.upgrade = false;
} else {
  socketOptions.transports = ["polling", "websocket"];
  socketOptions.upgrade = true;
}

/*
 * Refresh employee authentication for Socket.IO.
 *
 * Customer authentication intentionally does not use employee
 * refresh because customers have a separate session cookie.
 */
const refreshSocketAuth = async (role) => {
  if (!["admin", "staff", "manager"].includes(role)) {
    throw new Error(
      "Socket refresh is unavailable for this role",
    );
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-QuickServe-Role": role,
      "Content-Type": "application/json",
    },
    body: "null",
  });

  const payload =
    await response.json().catch(() => null);

  const data = payload?.data || payload;

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Unable to refresh socket authentication",
    );
  }

  return true;
};

export const createSocket = ({ role = null } = {}) => {
  const validRoles = [
    "customer",
    "admin",
    "staff",
    "manager",
  ];

  if (!validRoles.includes(role)) {
    console.warn("⚠️ Socket: invalid role", role);
    return null;
  }

  let refreshAttempted = false;

  const socket = io(socketBaseUrl, {
    ...socketOptions,
    auth: {
      role,
    },
  });

  socket.on("connect", () => {
    refreshAttempted = false;

    console.log(`🔌 Socket connected: ${socket.id}`);
    console.log(
      `🔌 Socket transport: ${socket.io.engine.transport.name}`,
    );

    if (role === "customer") {
      console.log("👤 Customer socket connected");
      return;
    }

    /*
     * Every authenticated employee connection may enter the kitchen.
     * The server validates the role before joining the room.
     */
    socket.emit("join_kitchen");
    console.log("👨‍🍳 Requested to join kitchen");

    if (role === "admin") {
      socket.emit("join_admin");
      console.log("👨‍💼 Requested to join admin");
    }

    if (role === "manager") {
      socket.emit("join_manager");
      console.log("👔 Requested to join manager");
    }
  });

  socket.on("connect_error", async (error) => {
    console.error(
      "❌ Socket connection error:",
      error?.message || error,
    );

    /*
     * Customer sockets cannot use employee refresh.
     */
    if (role === "customer") {
      return;
    }

    if (refreshAttempted) {
      return;
    }

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

      /*
       * Force a fresh Socket.IO handshake so the newly issued
       * HttpOnly cookie is used.
       */
      socket.disconnect();
      socket.connect();
    } catch (refreshError) {
      console.error(
        `❌ ${role} socket refresh failed:`,
        refreshError?.message || refreshError,
      );
    }
  });

  socket.io.engine?.on("upgrade", (transport) => {
    console.log(
      "🔄 Socket transport upgraded:",
      transport.name,
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "🔌 Socket disconnected:",
      reason,
    );
  });

  socket.on("socket_error", (error) => {
    console.error(
      "❌ Socket server error:",
      error,
    );
  });

  return socket;
};
