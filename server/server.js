require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST", "PATCH"]
    }
});

app.set("io", io);

const initializeSocket =
    require("./src/sockets/socket");

initializeSocket(io);


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

    console.log(
        `🚀 Server running on port ${PORT}`
    );

});