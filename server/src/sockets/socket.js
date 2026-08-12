const jwt = require("jsonwebtoken");

const env = require("../config/env");

const initializeSocket = (io) => {

    io.use((socket, next) => {

        try {

            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(
                    new Error("Customer token required")
                );
            }

            const decoded = jwt.verify(
                token,
                env.CUSTOMER_JWT_SECRET
            );

            socket.customer = decoded;

            next();

        } catch (error) {

            next(
                new Error("Invalid or expired customer token")
            );

        }

    });


    io.on("connection", (socket) => {

        console.log(
            `🔌 Socket connected: ${socket.id}`
        );


        // ----------------------------------------
        // Customer automatically joins own session
        // ----------------------------------------

        if (socket.customer?.sessionId) {

            const room =
                `session_${socket.customer.sessionId}`;

            socket.join(room);

            console.log(
                `👤 Customer joined ${room}`
            );

        }


        // ----------------------------------------
        // Kitchen
        // ----------------------------------------

        socket.on("join_kitchen", () => {

            socket.join("kitchen");

            console.log(
                `👨‍🍳 ${socket.id} joined kitchen`
            );

        });


        // ----------------------------------------
        // Disconnect
        // ----------------------------------------

        socket.on("disconnect", () => {

            console.log(
                `🔌 Socket disconnected: ${socket.id}`
            );

        });

    });

};

module.exports = initializeSocket;