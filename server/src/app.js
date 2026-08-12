const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./modules/auth/auth.routes");
const categoriesRoutes = require("./modules/categories/category.routes");
const routes = require("./routes");

const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const helmet = require("helmet");


const app = express();
app.use(cors());


app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));


app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "QuickServe API Running"
  });
});


// Middlewares...
app.use("/api", routes);
// app.use("/api/auth", authRoutes);
// app.use("/api/categories", categoriesRoutes);


// 404 Middleware
app.use(notFound);
// Error Handler
app.use(errorHandler);


module.exports = app;