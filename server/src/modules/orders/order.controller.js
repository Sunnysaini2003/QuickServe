const orderService = require("./order.service");
const { success } = require("../../utils/apiResponse");
const { buildXlsx, makePdf } = require("./order.export");
const AppError = require("../../utils/AppError");
const db = require("../../utils/db");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const { setCustomerSessionCookie } = require("../../utils/authCookies");

const ensureActiveCustomerSession = async (customer) => {
  const sessionId = Number(customer?.sessionId || 0);
  const customerId = Number(customer?.customerId || 0);
  const tableId = Number(customer?.tableId || 0);

  if (!customerId || !tableId) {
    throw new AppError(
      "Customer table session is invalid. Please scan the table QR code again.",
      409,
    );
  }

  // Keep the existing session when possible. This preserves order history
  // and the customer's existing Socket.IO room.
  if (sessionId) {
    const sessionRows = await db.query(
      `SELECT id, customer_id, table_id, is_active
       FROM table_sessions
       WHERE id = ?
       AND customer_id = ?
       AND table_id = ?
       LIMIT 1`,
      [sessionId, customerId, tableId],
    );

    if (sessionRows.length) {
      if (!sessionRows[0].is_active) {
        await db.query(
          `UPDATE table_sessions
           SET is_active = 1, ended_at = NULL
           WHERE id = ?
           AND customer_id = ?
           AND table_id = ?`,
          [sessionId, customerId, tableId],
        );
      }

      return { sessionId, token: null };
    }
  }

  // The JWT session no longer exists. Reuse another active session for the
  // same customer/table before creating a completely new session.
  const activeRows = await db.query(
    `SELECT id
     FROM table_sessions
     WHERE customer_id = ?
     AND table_id = ?
     AND is_active = 1
     LIMIT 1`,
    [customerId, tableId],
  );

  let activeSessionId;

  if (activeRows.length) {
    activeSessionId = activeRows[0].id;
  } else {
    const sessionToken = require("crypto").randomUUID();

    const result = await db.query(
      `INSERT INTO table_sessions
       (session_token, customer_id, table_id, session_type, is_active)
       VALUES (?, ?, ?, 'DineIn', 1)`,
      [sessionToken, customerId, tableId],
    );

    activeSessionId = result.insertId;
  }

  const token = jwt.sign(
    {
      customerId,
      sessionId: activeSessionId,
      tableId,
    },
    env.CUSTOMER_JWT_SECRET,
    { expiresIn: "12h" },
  );

  return {
    sessionId: activeSessionId,
    token,
  };
};

const createOrder = async (req, res, next) => {
  try {
    const session = await ensureActiveCustomerSession(req.customer);

    if (session.token) {
      setCustomerSessionCookie(res, session.token);
    }

    const order = await orderService.createOrder({
      sessionId: session.sessionId,
      items: req.body.items,
      notes: req.body.notes,
    });

    return success(res, "Order placed successfully", order, 201);
  } catch (error) {
    next(error);
  }
};

const getCurrentOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getCurrentOrders(req.customer.sessionId);

    return success(res, "Current orders fetched successfully", orders);
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(
      req.params.id,
      req.customer.sessionId,
    );

    return success(res, "Order fetched successfully", order);
  } catch (error) {
    next(error);
  }
};

const getOrderHistory = async (req, res, next) => {
  try {
    const orders = await orderService.getOrderHistory(req.customer.sessionId);

    return success(res, "Order history fetched successfully", orders);
  } catch (error) {
    next(error);
  }
};

// ADMIN Routes

const getAdminOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAdminOrders({
      search: req.query.search || "",

      status: req.query.status || "",

      orderMode: req.query.orderMode || "",

      orderType: req.query.orderType || "",

      page: req.query.page || 1,

      limit: req.query.limit || 10,
    });

    return success(res, "Admin orders fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

const getAdminOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getAdminOrderById(req.params.id);

    return success(res, "Admin order fetched successfully", order);
  } catch (error) {
    next(error);
  }
};

const getManagerOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAdminOrders({
      search: req.query.search || "",

      status: req.query.status || "",

      orderMode: req.query.orderMode || "",

      orderType: req.query.orderType || "",

      page: req.query.page || 1,

      limit: req.query.limit || 10,
    });

    return success(res, "Manager orders fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

const getManagerOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getAdminOrderById(req.params.id);

    return success(res, "Manager order fetched successfully", order);
  } catch (error) {
    next(error);
  }
};


const exportManagerOrders = async (req, res, next) => {
  try {
    const format = String(req.query.format || "xlsx").toLowerCase();
    if (!["xlsx", "pdf"].includes(format)) {
      return next(new AppError("Unsupported export format", 400));
    }

    const { orders, items } = await orderService.getOrdersForExport({
      search: req.query.search || "",
      status: req.query.status || "",
      orderMode: req.query.orderMode || "",
      orderType: req.query.orderType || "",
    });

    const datePart = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
      const buffer = await makePdf({ orders });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="quickserve-orders-${datePart}.pdf"`,
      );
      return res.send(buffer);
    }

    const buffer = buildXlsx({ orders, items });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quickserve-orders-${datePart}.xlsx"`,
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const updateManagerOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
    );

    const io = req.app.get("io");

    if (io) {
      if (order.session_id) {
        io.to(`session_${order.session_id}`).emit(
          "order_status_updated",
          order,
        );
      }

      io.to("kitchen").emit("order_status_updated", order);
    }

    return success(res, "Manager order status updated successfully", order);
  } catch (error) {
    next(error);
  }
};

const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
    );

    const io = req.app.get("io");

    if (io) {
      if (order.session_id) {
        io.to(`session_${order.session_id}`).emit(
          "order_status_updated",
          order,
        );
      }

      io.to("kitchen").emit("order_status_updated", order);
    }

    return success(res, "Order status updated successfully", order);
  } catch (error) {
    next(error);
  }
};

const createManagerAssistedOrder = async (req, res, next) => {
    try {
        const order = await orderService.createManagerAssistedOrder({
            managerUserId:
                req.user.id ||
                req.user.userId ||
                req.user.user_id,

            ...req.body,
        });

        return success(
            res,
            "Assisted order placed successfully",
            order,
            201
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
  createOrder,
  getCurrentOrders,
  getOrderById,
  getOrderHistory,
  // ADMIN ROUTES
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  // MANAGER ROUTES
  createManagerAssistedOrder,
  getManagerOrders,
  getManagerOrderById,
  exportManagerOrders,
  updateManagerOrderStatus,
};
