require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");

const {
    initializeSocket
} = require("./src/sockets/socket");



// HTTP SERVER


const server =
    http.createServer(app);



// SOCKET.IO


const io =
    new Server(server, {

        cors: {

            origin:
                process.env.CLIENT_URL ||
                "http://localhost:5173",

            methods: [
                "GET",
                "POST",
                "PATCH",
                "PUT",
                "DELETE"
            ],

            credentials: true
        }

    });



// MAKE SOCKET.IO AVAILABLE TO EXPRESS


app.set(
    "io",
    io
);



// INITIALIZE SOCKET EVENTS


initializeSocket(
    io
);



// START SERVER


const PORT =
    process.env.PORT ||
    5000;


server.listen(
    PORT,
    () => {

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🔌 Socket.IO running on http://localhost:${PORT}`
        );

    }
);