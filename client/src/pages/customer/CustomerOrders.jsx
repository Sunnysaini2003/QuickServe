import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

import { RotateCcwClock, Zap } from "lucide-react";

import { getCurrentOrders, getOrderHistory } from "../../api/order.api";
import api from "../../api/axios";
import { createSocket } from "../../api/socket";

import "./CustomerOrders.css";
import logoIcon from "../../assets/qs_icon.png";

import { FiMenu, FiLogOut, FiShoppingBag, FiFileText } from "react-icons/fi";

const extractOrders = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : [];
};

const statusClass = (status) => String(status || "").toLowerCase();

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CustomerOrders = () => {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const customer = useMemo(() => {
    try {
      const stored = localStorage.getItem("customerUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const tableToken =
    typeof window !== "undefined"
      ? localStorage.getItem("tableToken") || ""
      : "";

  // Customer authentication is enforced by the HttpOnly session cookie.

  const handleAuthError = (err) => {
    if (err?.response?.status === 401) {
      api.post("/customers/logout").catch((error) => {
        console.warn("Customer cookie logout failed:", error);
      });

      localStorage.removeItem("customerAuthToken");
      localStorage.removeItem("customerUser");
      localStorage.removeItem("customerToken");
      localStorage.removeItem("tableToken");
      localStorage.removeItem("customerTableId");

      if (tableToken) {
        navigate(
          `/?table=${encodeURIComponent(tableToken)}`,
          { replace: true },
        );
      } else {
        navigate("/", { replace: true });
      }

      return true;
    }

    return false;
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const [currentResponse, historyResponse] = await Promise.all([
        getCurrentOrders(),
        getOrderHistory(),
      ]);

      setActiveOrders(extractOrders(currentResponse));
      setHistoryOrders(extractOrders(historyResponse));
    } catch (err) {
      if (handleAuthError(err)) {
        return;
      }

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Unable to load your orders.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const socket = createSocket({ role: "customer" });

    if (!socket) {
      return undefined;
    }

    socketRef.current = socket;

    socket.on("order_created", (order) => {
      if (!order?.id) {
        return;
      }

      setActiveOrders((previous) => {
        const exists = previous.some(
          (item) => String(item.id) === String(order.id),
        );

        if (exists) {
          return previous.map((item) =>
            String(item.id) === String(order.id) ? { ...item, ...order } : item,
          );
        }

        return [order, ...previous];
      });
    });

    socket.on("order_status_updated", (order) => {
      if (!order?.id) {
        return;
      }

      const finished = ["Served", "Cancelled"].includes(order.status);

      if (finished) {
        setActiveOrders((previous) =>
          previous.filter((item) => String(item.id) !== String(order.id)),
        );

        setHistoryOrders((previous) => {
          const exists = previous.some(
            (item) => String(item.id) === String(order.id),
          );

          if (exists) {
            return previous.map((item) =>
              String(item.id) === String(order.id)
                ? { ...item, ...order }
                : item,
            );
          }

          return [order, ...previous];
        });

        return;
      }

      setActiveOrders((previous) => {
        const exists = previous.some(
          (item) => String(item.id) === String(order.id),
        );

        if (exists) {
          return previous.map((item) =>
            String(item.id) === String(order.id) ? { ...item, ...order } : item,
          );
        }

        return [order, ...previous];
      });

      setHistoryOrders((previous) =>
        previous.filter((item) => String(item.id) !== String(order.id)),
      );
    });

    return () => {
      socket.removeAllListeners("order_created");
      socket.removeAllListeners("order_status_updated");
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/customers/logout");
    } catch (error) {
      console.warn("Customer cookie logout failed:", error);
    } finally {
      socketRef.current?.disconnect();
      socketRef.current = null;
      localStorage.removeItem("customerAuthToken");
      localStorage.removeItem("customerUser");
      localStorage.removeItem("customerToken");
      localStorage.removeItem("tableToken");
      localStorage.removeItem("customerTableId");

      if (tableToken) {
        localStorage.removeItem(`quickserve_cart_${tableToken}`);
      }

      navigate("/", { replace: true });
    }
  };

  const orders = activeTab === "active" ? activeOrders : historyOrders;

  return (
    <div className="customer-orders-page">
      <header className="customer-orders-header">
        <Link to="/customer/menu" className="customer-orders-brand">
          <img src={logoIcon} alt="QuickServe" />

          <div>
            <strong>QuickServe</strong>

            <span>{customer?.name ? `Hi, ${customer.name}` : "My orders"}</span>
          </div>
        </Link>

        <div className="customer-orders-header-actions">
          <button
            type="button"
            className="customer-nav-button"
            onClick={() => navigate("/customer/menu")}
          >
            <FiMenu aria-hidden="true" />
            <span>Menu</span>
          </button>

          <button
            type="button"
            className="customer-nav-button logout-button"
            onClick={handleLogout}
          >
            <FiLogOut aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="customer-orders-content">
        <div className="customer-orders-heading">
          <div>
            <span className="customer-orders-heading-label">YOUR ORDERS</span>

            <h1>
              <FiShoppingBag aria-hidden="true" />
              My Orders
            </h1>

            <p>Track your current orders and view previous orders.</p>
          </div>
        </div>

        <div className="customer-orders-tabs" role="tablist">
          <button
            type="button"
            className={activeTab === "active" ? "active" : ""}
            onClick={() => setActiveTab("active")}
            role="tab"
            aria-selected={activeTab === "active"}
          >
            <span className="tab-label-wrapper">
              <Zap className="tab-icon active-icon" size={16} />

              <span>Active</span>
            </span>
            <strong>{activeOrders.length}</strong>
          </button>

          <button
            type="button"
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
            role="tab"
            aria-selected={activeTab === "history"}
          >
            <span className="tab-label-wrapper">
              <RotateCcwClock className="tab-icon" size={16} />
              <span>History</span>
            </span>
            <strong>{historyOrders.length}</strong>
          </button>
        </div>

        {error && (
          <div className="customer-orders-error" role="alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="customer-orders-state">
            <div className="customer-orders-spinner" />
            <p>Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="customer-orders-empty">
            <div className="customer-orders-empty-icon">
              <FiFileText aria-hidden="true" />
            </div>

            <h2>
              {activeTab === "active" ? "No active orders" : "No order history"}
            </h2>

            <p>
              {activeTab === "active"
                ? "Your new orders will appear here and update automatically."
                : "Served and cancelled orders from this session will appear here."}
            </p>

            {activeTab === "active" && (
              <button
                type="button"
                className="browse_menu_btn"
                onClick={() => navigate("/customer/menu")}
              >
                Browse Menu
              </button>
            )}
          </div>
        ) : (
          <div className="customer-orders-list">
            {orders.map((order) => (
              <article className="customer-order-card" key={order.id}>
                <div className="customer-order-card-top">
                  <div>
                    <span>ORDER</span>
                    <h2>#{order.order_number}</h2>
                  </div>

                  <span
                    className={`customer-order-status ${statusClass(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="customer-order-meta">
                  <span>
                    {order.table_number
                      ? `Table ${order.table_number}`
                      : "Takeaway"}
                  </span>

                  <span>{formatDate(order.created_at)}</span>
                </div>

                <div className="customer-order-items">
                  {(order.items || []).map((item) => (
                    <div key={item.id}>
                      <span>{item.name}</span>

                      <span>x{item.quantity}</span>

                      <strong>₹{Number(item.subtotal || 0).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>

                <div className="customer-order-total">
                  <span>Total</span>

                  <strong>₹{Number(order.total || 0).toFixed(2)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerOrders;
