const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");

const routes = require("./routes");

const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();


// SECURITY


app.use(helmet());


// CORS


app.use(
    cors({
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",
        credentials: true
    })
);


// STATIC UPLOADS


app.use(
    "/uploads",
    express.static(
        path.join(
            process.cwd(),
            "uploads"
        )
    )
);


// BODY PARSERS


app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// HEALTH CHECK


app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "QuickServe API Running"
    });
});


// ALL API ROUTES


app.use("/api", routes);


// 404


app.use(notFound);


// ERROR HANDLER


app.use(errorHandler);

module.exports = app;