import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import "./KitchenDashboard.css";

import { createSocket } from "../../api/socket";
import api from "../../api/axios";
import { FiLogOut } from "react-icons/fi";

import {
  getKitchenOrders,
  updateKitchenOrderStatus,
} from "../../api/kitchen.api";

import quickServeIcon from "../../assets/qs_icon.png";

const KitchenDashboard = () => {
  const navigate = useNavigate();

  const outletContext = useOutletContext();

  const currentRole = outletContext?.role || null;

  // STATE

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const [activeFilter, setActiveFilter] = useState("All");

  const [socket, setSocket] = useState(null);

  // New order alert
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  const [isAlertVisible, setIsAlertVisible] = useState(false);

  const alertTimeoutRef = useRef(null);

  const alertedOrdersRef = useRef(new Set());

  // FETCH ORDERS

  const fetchOrders = async () => {
    if (!currentRole) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      console.log(`🍳 Loading kitchen orders as ${currentRole}`);

      const response = await getKitchenOrders();

      if (response.success) {
        setOrders(response.data || []);
      } else {
        setOrders([]);

        setError(response.message || "Unable to fetch orders");
      }
    } catch (err) {
      console.error("Kitchen orders error:", err);

      setError(
        err?.response?.data?.message || "Unable to connect to kitchen server",
      );
    } finally {
      setLoading(false);
    }
  };

  // INITIAL LOAD

  useEffect(() => {
    if (currentRole) {
      fetchOrders();
    }
  }, [currentRole]);

  // REQUEST BROWSER NOTIFICATION

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
        .then((permission) => {
          console.log("🔔 Notification permission:", permission);
        })
        .catch(() => {});
    }
  }, []);

  // PLAY NEW ORDER SOUND

  const playNewOrderSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        return;
      }

      const audioContext = new AudioContext();

      const oscillator = audioContext.createOscillator();

      const gain = audioContext.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.15);

      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.3);

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);

      gain.gain.exponentialRampToValueAtTime(
        0.25,
        audioContext.currentTime + 0.03,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.55,
      );

      oscillator.connect(gain);

      gain.connect(audioContext.destination);

      oscillator.start();

      oscillator.stop(audioContext.currentTime + 0.6);

      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };
    } catch (error) {
      console.warn("Unable to play notification sound:", error);
    }
  };

  // SHOW NEW ORDER ALERT

  const showNewOrderAlert = (order) => {
    if (!order?.id) {
      return;
    }

    // Prevent duplicate alerts
    if (alertedOrdersRef.current.has(order.id)) {
      return;
    }

    alertedOrdersRef.current.add(order.id);

    // Keep memory under control
    if (alertedOrdersRef.current.size > 100) {
      const first = alertedOrdersRef.current.values().next().value;

      alertedOrdersRef.current.delete(first);
    }

    setNewOrderAlert(order);

    setIsAlertVisible(true);

    playNewOrderSound();

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const tableText = order.table_number
          ? `Table ${order.table_number}`
          : "New order";

        new Notification("🔔 New QuickServe Order", {
          body: `${order.order_number || "New Order"} • ${tableText}`,
          icon: quickServeIcon,
        });
      } catch (error) {
        console.warn("Browser notification failed:", error);
      }
    }

    // Clear existing timer
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }

    // Hide after 8 seconds
    alertTimeoutRef.current = setTimeout(() => {
      setIsAlertVisible(false);
    }, 8000);
  };

  // SOCKET

  useEffect(() => {
    if (!currentRole) {
      return;
    }

    console.log(`🔌 Creating kitchen socket for ${currentRole}`);

    const kitchenSocket = createSocket({
      role: currentRole === "Admin" ? "admin" : "staff",
    });

    if (!kitchenSocket) {
      console.warn("⚠️ Kitchen socket was not created");

      return;
    }

    setSocket(kitchenSocket);

    // CONNECT

    kitchenSocket.on("connect", () => {
      console.log(`🔌 Kitchen socket connected: ${kitchenSocket.id}`);

      kitchenSocket.emit("join_kitchen");

      console.log("👨‍🍳 Requested to join kitchen");
    });

    // NEW ORDER

    kitchenSocket.on("new_order", (order) => {
      console.log("🔔 NEW ORDER RECEIVED:", order);

      showNewOrderAlert(order);

      setOrders((previousOrders) => {
        const exists = previousOrders.some((item) => item.id === order.id);

        if (exists) {
          return previousOrders.map((item) =>
            item.id === order.id
              ? {
                  ...item,
                  ...order,
                }
              : item,
          );
        }

        return [order, ...previousOrders];
      });

      // Database remains source of truth
      fetchOrders();
    });

    // STATUS UPDATE

    kitchenSocket.on("order_status_updated", (order) => {
      console.log("🔄 ORDER STATUS UPDATED:", order);

      setOrders((previousOrders) =>
        previousOrders.map((item) =>
          item.id === order.id
            ? {
                ...item,
                ...order,
              }
            : item,
        ),
      );

      fetchOrders();
    });

    // SOCKET ERROR

    kitchenSocket.on("socket_error", (socketError) => {
      console.error("❌ Kitchen socket server error:", socketError);
    });

    // CONNECTION ERROR

    kitchenSocket.on("connect_error", (err) => {
      console.error("❌ Kitchen socket error:", err.message);
    });

    // DISCONNECT

    kitchenSocket.on("disconnect", (reason) => {
      console.log("🔌 Kitchen socket disconnected:", reason);
    });

    // CLEANUP

    return () => {
      console.log("🔌 Cleaning up kitchen socket");

      kitchenSocket.removeAllListeners("new_order");

      kitchenSocket.removeAllListeners("order_status_updated");

      kitchenSocket.disconnect();

      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [currentRole]);

  // ALERT CLICK

  const handleAlertClick = () => {
    setActiveFilter("New");

    setIsAlertVisible(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // EXIT KITCHEN / LOGOUT

  const handleKitchenExit = async () => {
    console.log("👤 Kitchen user leaving");

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    if (currentRole === "Admin") {
      // Admin is only leaving Kitchen. Keep the Admin session alive.
      localStorage.removeItem("kitchen_auth_role");

      navigate("/admin", {
        replace: true,
      });

      return;
    }

    if (currentRole === "Staff") {
      try {
        await api.post("/auth/logout", null, {
          _skipAuthRefresh: true,
          headers: {
            "X-QuickServe-Role": "staff",
          },
        });
      } catch (error) {
        console.warn("Staff logout request failed:", error);
      } finally {
        localStorage.removeItem("staff_token");
        localStorage.removeItem("staff_user");
        localStorage.removeItem("kitchen_auth_role");

        navigate("/staff/login", {
          replace: true,
        });
      }

      return;
    }

    navigate("/staff/login", {
      replace: true,
    });
  };

  // UPDATE ORDER STATUS

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);

      setError("");

      const response = await updateKitchenOrderStatus(orderId, newStatus);

      if (!response.success) {
        throw new Error(response.message || "Unable to update order");
      }

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                ...(response.data || {}),
                status: newStatus,
              }
            : order,
        ),
      );

      await fetchOrders();
    } catch (err) {
      console.error("Kitchen status update error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update order status",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ACTION

  const getActionForOrder = (order) => {
    if (order.status === "Pending") {
      return {
        label: "Start Preparing",

        nextStatus: "Preparing",
      };
    }

    if (order.status === "Preparing") {
      return {
        label: "Mark Ready",

        nextStatus: "Ready",
      };
    }

    if (order.status === "Ready") {
      return {
        label: "Mark Served",

        nextStatus: "Served",
      };
    }

    return null;
  };

  // FILTER

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "All") {
      return true;
    }

    if (activeFilter === "New") {
      return order.status === "Pending";
    }

    if (activeFilter === "Preparing") {
      return order.status === "Preparing";
    }

    if (activeFilter === "Ready") {
      return order.status === "Ready";
    }

    return true;
  });

  // COUNTS

  const newOrders = orders.filter((order) => order.status === "Pending");

  const preparingOrders = orders.filter(
    (order) => order.status === "Preparing",
  );

  const readyOrders = orders.filter((order) => order.status === "Ready");

  // FORMAT TIME

  const formatTime = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",

      minute: "2-digit",
    });
  };

  // FORMAT MODE

  const formatMode = (order) => {
    if (order.order_mode === "Takeaway") {
      return "TAKEAWAY";
    }

    return order.table_number ? `TABLE ${order.table_number}` : "DINE-IN";
  };

  // RENDER

  return (
    <div className="kitchen-app">
      {/* 
                          NEW ORDER ALERT
           */}

      {newOrderAlert && isAlertVisible && (
        <button
          type="button"
          className="new-order-alert"
          onClick={handleAlertClick}
        >
          <span className="new-order-alert-icon">🔔</span>

          <span className="new-order-alert-content">
            <strong>NEW ORDER</strong>

            <span>
              #{newOrderAlert.order_number || newOrderAlert.id}
              {newOrderAlert.table_number
                ? ` • Table ${newOrderAlert.table_number}`
                : ""}
            </span>
          </span>

          <span className="new-order-alert-action">View →</span>
        </button>
      )}

      {/* HEADER */}

      <header className="kitchen-header">
        <Link
          to="/kitchen"
          className="kitchen-brand"
          style={{
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div className="brand-icon">
            <img src={quickServeIcon} alt="QS" />
          </div>

          <div>
            <h1>QuickServe</h1>

            <span>Kitchen</span>
          </div>
        </Link>

        <div className="kitchen-header-right">
          <div className="kitchen-status">
            <span className="status-dot" />
            Kitchen Online
          </div>

          <div className="kitchen-time">
            {new Date().toLocaleString([], {
              weekday: "long",

              day: "numeric",

              month: "short",

              hour: "2-digit",

              minute: "2-digit",
            })}
          </div>

          {currentRole === "Admin" && (
            <button
              type="button"
              className="kitchen-logout-button"
              onClick={handleKitchenExit}
            >
              <FiLogOut aria-hidden="true" />
             <span>Exit Kitchen</span> 
            </button>
          )}

          {currentRole === "Staff" && (
            <button
              type="button"
              className="kitchen-logout-button"
              onClick={handleKitchenExit}
            >
              <FiLogOut aria-hidden="true" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* SUMMARY */}

      <section className="kitchen-summary">
        <div className="summary-card">
          <span>New</span>

          <strong>{newOrders.length}</strong>
        </div>

        <div className="summary-card">
          <span>Preparing</span>

          <strong>{preparingOrders.length}</strong>
        </div>

        <div className="summary-card">
          <span>Ready</span>

          <strong>{readyOrders.length}</strong>
        </div>
      </section>

      {/* ERROR */}

      {error && <div className="kitchen-error">{error}</div>}

      {/* FILTERS */}

      <section className="order-filters">
        {["All", "New", "Preparing", "Ready"].map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-button ${
              activeFilter === filter ? "selected" : ""
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </section>

      {/* ORDERS */}

      <section className="orders-section">
        <div className="section-heading">
          <h3>Active Orders</h3>

          <span>{filteredOrders.length} orders</span>
        </div>

        {loading && (
          <div className="kitchen-empty">Loading kitchen orders...</div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="kitchen-empty">
            <div className="empty-icon">✓</div>

            <h3>No active orders</h3>

            <p>New orders will appear here automatically.</p>
          </div>
        )}

        {!loading && filteredOrders.length > 0 && (
          <div className="orders-grid">
            {filteredOrders.map((order) => {
              const action = getActionForOrder(order);

              const updating = updatingOrderId === order.id;

              return (
                <article
                  className={`order-card status-${order.status?.toLowerCase()} ${
                    newOrderAlert?.id === order.id ? "order-card-new" : ""
                  }`}
                  key={order.id}
                >
                  <div className="order-card-header">
                    <div>
                      <strong>#{order.order_number}</strong>

                      <span>{formatMode(order)}</span>
                    </div>

                    <span
                      className={`order-status status-${order.status?.toLowerCase()}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="order-card-meta">
                    <span>Ordered {formatTime(order.created_at)}</span>
                    {order.order_type && <span>{order.order_type}</span>}
                  </div>

                  {order.notes && (
                    <div className="order-card-notes">
                      <div className="order-card-notes-header">
                        <span className="order-card-notes-icon">
                          📝
                          <strong>Customer Note</strong>
                        </span>
                      </div>

                      <p>{order.notes}</p>
                    </div>
                  )}

                  <div className="order-items">
                    {order.items?.map((item) => (
                      <div className="order-item" key={item.id}>
                        <div>
                          <strong>
                            {item.quantity}

                            {" × "}

                            {item.name}
                          </strong>

                          {item.notes && <small>{item.notes}</small>}
                        </div>

                        <span>₹{Number(item.subtotal || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-total">
                    <span>Total</span>

                    <strong>₹{Number(order.total || 0).toFixed(2)}</strong>
                  </div>

                  {action && (
                    <button
                      type="button"
                      className="order-action-button"
                      disabled={updating}
                      onClick={() =>
                        handleStatusUpdate(order.id, action.nextStatus)
                      }
                    >
                      {updating ? "Updating..." : action.label}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default KitchenDashboard;
