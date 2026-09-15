import { io } from "socket.io-client";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const SOCKET_URL = String(
  import.meta.env.VITE_SOCKET_URL || apiBaseUrl,
).replace(/\/$/, "");
const API_URL = `${apiBaseUrl}/api`;

const refreshSocketAuth = async (role) => {
  if (!["admin", "staff", "manager"].includes(role)) {
    throw new Error("Socket refresh is unavailable for this role");
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-QuickServe-Role": role,
      "Content-Type": "application/json",
    },
    body: "null",
  });

  const payload = await response.json().catch(() => null);
  const data = payload?.data || payload;

  if (!response.ok) {
    throw new Error(
      data?.message || "Unable to refresh socket authentication",
    );
  }

  return true;
};

export const createSocket = ({ role = null } = {}) => {
  if (role !== "customer" && !["admin", "staff", "manager"].includes(role)) {
    console.warn("⚠️ Socket: valid employee role is required");
    return null;
  }

  let refreshAttempted = false;

  const socket = io(SOCKET_URL, {
    auth: {
      role,
    },
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    refreshAttempted = false;

    console.log(`🔌 Socket connected: ${socket.id}`);

    if (role === "customer") {
      console.log("👤 Customer socket connected");
      return;
    }

    // Kitchen is available to BOTH Admin and Staff.
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
    console.error("❌ Socket connection error:", error.message);

    if (
      role === "customer" ||
      refreshAttempted ||
      !/expired|invalid.*token/i.test(error.message || "")
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
        refreshError.message,
      );
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  socket.on("socket_error", (error) => {
    console.error("❌ Socket server error:", error);
  });

  return socket;
};
