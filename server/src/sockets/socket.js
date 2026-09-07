const jwt = require("jsonwebtoken");

const env = require("../config/env");

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
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // ADMIN / STAFF JWT

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);

        socket.user = decoded;

        socket.authType = "staff";

        console.log("🔐 Staff/Admin socket authenticated:", {
          socketId: socket.id,
          userId: decoded.id || decoded.userId || decoded.user_id,
          role: decoded.role || decoded.role_name,
        });

        return next();
      } catch (staffError) {
        // Try customer token below
      }

      // CUSTOMER JWT

      try {
        const decoded = jwt.verify(token, env.CUSTOMER_JWT_SECRET);

        socket.customer = decoded;

        socket.authType = "customer";

        console.log("👤 Customer socket authenticated:", {
          socketId: socket.id,
          sessionId: decoded.sessionId || decoded.session_id,
        });

        return next();
      } catch (customerError) {
        return next(new Error("Invalid or expired token"));
      }
    } catch (error) {
      console.error("❌ Socket authentication error:", error);

      return next(new Error("Socket authentication failed"));
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
