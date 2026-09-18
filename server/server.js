const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const env = require("./src/config/env");
const { initializeSocket } = require("./src/sockets/socket");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  },
});
io.engine.on("connection_error", (error) => {
  console.error("❌ Socket.IO Engine connection error:", {
    code: error.code,
    message: error.message,
    context: error.context,
    origin: error.req?.headers?.origin,
    url: error.req?.url,
    userAgent: error.req?.headers?.["user-agent"],
  });
});


app.set("io", io);
initializeSocket(io);

const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`🚀 QuickServe server listening on port ${PORT}`);
  console.log("🔌 Socket.IO is enabled");
});

const shutdown = (signal) => {
  console.log(`🛑 ${signal} received. Shutting down gracefully...`);

  server.close((error) => {
    if (error) {
      console.error("❌ HTTP server shutdown failed:", error);
      process.exit(1);
      return;
    }

    console.log("✅ HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
