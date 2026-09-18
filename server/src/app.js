const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const env = require("./config/env");

const routes = require("./routes");

const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

// Render/production HTTPS proxy support.
app.set("trust proxy", 1);

// SECURITY
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// CORS

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// STATIC UPLOADS

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// BODY PARSERS

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

// HEALTH CHECK

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "QuickServe API Running",
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// ALL API ROUTES

app.use("/api", routes);

// 404

app.use(notFound);

// ERROR HANDLER

app.use(errorHandler);

module.exports = app;
