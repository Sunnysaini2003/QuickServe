const jwt = require("jsonwebtoken");

const env = require("../config/env");
const {
  EMPLOYEE_COOKIE_NAMES,
  CUSTOMER_SESSION_COOKIE,
  getCookieFromHeader,
} = require("../utils/authCookies");

let ioInstance = null;

// GET SOCKET INSTANCE

const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO has not been initialized");
  }

  return ioInstance;
};

// INITIALIZE SOCKET

const initializeSocket = (io) => {
  ioInstance = io;

  // SOCKET AUTHENTICATION

  io.use((socket, next) => {
    try {
      const requestedRole = String(
        socket.handshake.auth?.role || ""
      ).toLowerCase();

      const cookieHeader =
        socket.handshake.headers?.cookie || "";

      if (["admin", "staff", "manager"].includes(requestedRole)) {
        const role =
          requestedRole.charAt(0).toUpperCase() +
          requestedRole.slice(1);

        const token = getCookieFromHeader(
          cookieHeader,
          EMPLOYEE_COOKIE_NAMES[role]
        );

        if (!token) {
          return next(
            new Error("Authentication cookie required")
          );
        }

        const decoded = jwt.verify(
          token,
          env.JWT_SECRET
        );

        if (decoded.role !== role) {
          return next(
            new Error("Socket role mismatch")
          );
        }

        socket.user = decoded;
        socket.authType = "staff";

        console.log(
          `🔐 ${role} socket authenticated:`,
          {
            socketId: socket.id,
            userId: decoded.id || decoded.userId || decoded.user_id,
            role: decoded.role,
          }
        );

        return next();
      }

      if (requestedRole === "customer") {
        const token = getCookieFromHeader(
          cookieHeader,
          CUSTOMER_SESSION_COOKIE
        );

        if (!token) {
          return next(
            new Error("Customer authentication cookie required")
          );
        }

        const decoded = jwt.verify(
          token,
          env.CUSTOMER_JWT_SECRET
        );

        socket.customer = decoded;
        socket.authType = "customer";

        console.log(
          "🔐 Customer socket authenticated:",
          {
            socketId: socket.id,
            customerId: decoded.customerId,
            sessionId: decoded.sessionId,
          }
        );

        return next();
      }

      return next(
        new Error("Socket authentication role required")
      );
    } catch (error) {
      console.error(
        "❌ Socket authentication failed:",
        error.message
      );

      return next(
        new Error("Socket authentication failed")
      );
    }
  });

  // CONNECTION

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // CUSTOMER ROOM

    if (socket.authType === "customer") {
      const sessionId =
        socket.customer?.sessionId || socket.customer?.session_id;

      if (sessionId) {
        const room = `session_${sessionId}`;

        socket.join(room);

        console.log(`👤 Customer joined ${room}`);
      }
    }

    // KITCHEN ROOM

    socket.on("join_kitchen", () => {
      if (socket.authType !== "staff") {
        console.warn(`🚫 Kitchen access denied: ${socket.id}`);

        socket.emit("socket_error", {
          message: "Staff authentication required",
        });

        return;
      }

      socket.join("kitchen");

      console.log(`👨‍🍳 ${socket.id} joined kitchen`);
    });

    // MANAGER ROOM

    socket.on("join_manager", () => {
      if (socket.authType !== "staff") {
        console.warn(`🚫 Manager access denied: ${socket.id}`);

        socket.emit("socket_error", {
          message: "Manager authentication required",
        });

        return;
      }

      const role = socket.user?.role || socket.user?.role_name;
      const normalizedRole = String(role || "").toLowerCase();

      if (normalizedRole !== "manager") {
        console.warn(
          `🚫 Non-manager attempted to join manager room: ${socket.id}`,
          role,
        );

        socket.emit("socket_error", {
          message: "Manager access required",
        });

        return;
      }

      socket.join("manager");

      console.log(`👔 ${socket.id} joined manager`);
    });

    // ADMIN ROOM

    socket.on("join_admin", () => {
      if (socket.authType !== "staff") {
        console.warn(`🚫 Admin access denied: ${socket.id}`);

        socket.emit("socket_error", {
          message: "Admin authentication required",
        });

        return;
      }

      const role = socket.user?.role || socket.user?.role_name;

      const normalizedRole = String(role || "").toLowerCase();

      if (normalizedRole !== "admin" && normalizedRole !== "administrator") {
        console.warn(
          `🚫 Non-admin attempted to join admin room: ${socket.id}`,
          role,
        );

        socket.emit("socket_error", {
          message: "Admin access required",
        });

        return;
      }

      socket.join("admin");

      console.log(`👨‍💼 ${socket.id} joined admin`);
    });

    // DISCONNECT

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id}`, reason);
    });
  });
};

// EMIT NEW ORDER

const emitNewOrder = (order) => {
  const io = getIO();

  console.log("📢 Emitting new_order:", order?.order_number);

  // Kitchen
  io.to("kitchen").emit("new_order", order);

  // Admin
  io.to("admin").emit("new_order", order);
  // Manager
  io.to("manager").emit("new_order", order);

  // Customer
  const sessionId = order?.session_id;

  if (sessionId) {
    io.to(`session_${sessionId}`).emit("order_created", order);
  }
};

// EMIT ORDER STATUS UPDATE

const emitOrderStatusUpdated = (order) => {
  const io = getIO();

  console.log(
    "📢 Emitting order_status_updated:",
    order?.order_number,
    order?.status,
  );

  // Kitchen
  io.to("kitchen").emit("order_status_updated", order);

  // Admin
  io.to("admin").emit("order_status_updated", order);

  // Manager
  io.to("manager").emit("order_status_updated", order);

  // Customer
  const sessionId = order?.session_id;

  if (sessionId) {
    io.to(`session_${sessionId}`).emit("order_status_updated", order);
  }
};

// EXPORT

module.exports = {
  initializeSocket,
  getIO,
  emitNewOrder,
  emitOrderStatusUpdated,
};
