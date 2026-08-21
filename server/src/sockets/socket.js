const jwt = require("jsonwebtoken");

const env = require("../config/env");

const initializeSocket = (io) => {

    // ========================================================
    // SOCKET AUTHENTICATION
    // ========================================================

    io.use((socket, next) => {

        try {

            const token =
                socket.handshake.auth?.token;

            if (!token) {

                return next(
                    new Error(
                        "Authentication token required"
                    )
                );

            }


            // ------------------------------------------------
            // Try staff/admin JWT first
            // ------------------------------------------------

            try {

                const decoded =
                    jwt.verify(
                        token,
                        env.JWT_SECRET
                    );

                socket.user = decoded;
                socket.authType = "staff";

                return next();

            } catch (staffError) {

                // Not a staff token.
                // Try customer token below.

            }


            // ------------------------------------------------
            // Try customer JWT
            // ------------------------------------------------

            try {

                const decoded =
                    jwt.verify(
                        token,
                        env.CUSTOMER_JWT_SECRET
                    );

                socket.customer = decoded;
                socket.authType = "customer";

                return next();

            } catch (customerError) {

                return next(
                    new Error(
                        "Invalid or expired token"
                    )
                );

            }

        } catch (error) {

            console.error(
                "Socket authentication error:",
                error
            );

            return next(
                new Error(
                    "Socket authentication failed"
                )
            );

        }

    });


    // ========================================================
    // CONNECTION
    // ========================================================

    io.on("connection", (socket) => {

        console.log(
            `🔌 Socket connected: ${socket.id}`
        );


        // ====================================================
        // CUSTOMER
        // ====================================================

        if (
            socket.authType === "customer" &&
            socket.customer?.sessionId
        ) {

            const room =
                `session_${socket.customer.sessionId}`;

            socket.join(room);

            console.log(
                `👤 Customer joined ${room}`
            );

        }


        // ====================================================
        // KITCHEN
        // ====================================================

        socket.on(
            "join_kitchen",
            () => {

                // Only staff/admin sockets can join
                // the Kitchen room.

                if (
                    socket.authType !== "staff"
                ) {

                    console.warn(
                        `🚫 Kitchen access denied: ${socket.id}`
                    );

                    socket.emit(
                        "socket_error",
                        {
                            message:
                                "Staff authentication required"
                        }
                    );

                    return;

                }


                socket.join("kitchen");

                console.log(
                    `👨‍🍳 ${socket.id} joined kitchen`
                );

            }
        );


        // ====================================================
        // DISCONNECT
        // ====================================================

        socket.on(
            "disconnect",
            (reason) => {

                console.log(
                    `🔌 Socket disconnected: ${socket.id}`,
                    reason
                );

            }
        );

    });

};

module.exports = initializeSocket;