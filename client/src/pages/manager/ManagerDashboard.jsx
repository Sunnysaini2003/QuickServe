import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ClipboardList,
  Clock3,
  IndianRupee,
  LogOut,
  RefreshCw,
  Table2,
  Users,
  CheckCircle2,
} from "lucide-react";

import qslogo from "../../assets/qs_icon.png";

import { createSocket } from "../../api/socket";

import { getDashboard } from "../../api/dashboard.api";
import api from "../../api/axios";

import "./ManagerDashboard.css";

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const [period, setPeriod] = useState("Today");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("manager_user") || "null");

  const loadDashboard = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const response = await getDashboard(period);
        const data = response?.data || response;

        setDashboard(data || null);
      } catch (err) {
        console.error("Manager dashboard error:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load manager dashboard.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period],
  );


  useEffect(() => {
  const socket = createSocket({
    role: "manager",
  });

  if (!socket) {
    return;
  }

  const refreshDashboard = () => {
    loadDashboard(false);
  };

  socket.on("new_order", refreshDashboard);
  socket.on("order_created", refreshDashboard);
  socket.on("order_status_updated", refreshDashboard);

  return () => {
    socket.removeListener("new_order", refreshDashboard);
    socket.removeListener("order_created", refreshDashboard);
    socket.removeListener("order_status_updated", refreshDashboard);
    socket.disconnect();
  };
}, [loadDashboard]);

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", null, {
        _skipAuthRefresh: true,
        headers: {
          "X-QuickServe-Role": "manager",
        },
      });
    } catch (error) {
      console.warn("Manager logout request failed:", error);
    } finally {
      localStorage.removeItem("manager_token");
      localStorage.removeItem("manager_user");
      navigate("/manager/login", { replace: true });
    }
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const formatOrderType = (type) => {
    if (!type) return "-";

    return String(type)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ");
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    return `manager-status manager-status-${String(status || "")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  };

  if (loading) {
    return (
      <div className="manager-dashboard-page">
        <div className="manager-dashboard-state">
          <div className="manager-dashboard-spinner" />
          <h3>Loading manager dashboard...</h3>
          <p>Please wait while we load restaurant data.</p>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="manager-dashboard-page">
        <div className="manager-dashboard-state manager-dashboard-error">
          <Activity size={34} />
          <h3>Unable to load dashboard</h3>
          <p>{error}</p>
          <button type="button" onClick={() => loadDashboard(true)}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const recentOrders = Array.isArray(dashboard?.recent_orders)
    ? dashboard.recent_orders
    : [];

  const periodLabel =
    {
      Today: "Today",
      "This Week": "Last 7 Days",
      "This Month": "This Month",
    }[dashboard?.period || period] || period;

  const statCards = [
    {
      label: "Orders",
      value: formatNumber(stats.orders),
      helper: `${periodLabel} orders`,
      icon: ClipboardList,
    },
    {
      label: "Revenue",
      value: formatCurrency(stats.revenue),
      helper: `${periodLabel} revenue`,
      icon: IndianRupee,
    },
    {
      label: "Active Orders",
      value: formatNumber(stats.pending_orders),
      helper: "Pending kitchen orders",
      icon: Clock3,
    },
    {
      label: "Occupied Tables",
      value: `${formatNumber(stats.active_tables)} / ${formatNumber(
        stats.total_tables,
      )}`,
      helper: `${formatNumber(stats.available_tables)} available`,
      icon: Table2,
    },
    {
      label: "Customers",
      value: formatNumber(stats.customers),
      helper: "Customers in selected period",
      icon: Users,
    },
    {
      label: "Completed Orders",
      value: formatNumber(stats.completed_orders),
      helper: "Served orders",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="manager-dashboard-page">
      <div className="manager-dashboard-shell">
        <header className="manager-dashboard-header">
          <div>
            <span className="manager-dashboard-eyebrow">
              <img src={qslogo} alt="QS" />
              Manager Portal
              </span>
            <h1>Restaurant Dashboard</h1>
            <p>
              Welcome back{user?.name ? `, ${user.name}` : ""}. Monitor your
              restaurant operations from one place.
            </p>
          </div>

          <div className="manager-dashboard-header-actions">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="manager-dashboard-period"
              aria-label="Dashboard period"
            >
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>

            <button
              type="button"
              className="manager-dashboard-refresh"
              onClick={() => loadDashboard(false)}
              disabled={refreshing}
              title="Refresh dashboard"
            >
              <RefreshCw
                className={refreshing ? "manager-spin" : ""}
                size={17}
              />
              <span>{refreshing ? "Refreshing" : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="manager-dashboard-logout"
              onClick={handleLogout}
            >
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {error && <div className="manager-dashboard-inline-error">{error}</div>}

        <section
          className="manager-dashboard-stats"
          aria-label="Dashboard statistics"
        >
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <article className="manager-stat-card" key={card.label}>
                <div className="manager-stat-icon">
                  <Icon size={20} />
                </div>
                <div className="manager-stat-content">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.helper}</small>
                </div>
              </article>
            );
          })}
        </section>

        <section className="manager-dashboard-main-grid">
          <div className="manager-panel manager-recent-orders">
            <div className="manager-panel-header">
              <div>
                <span className="manager-panel-eyebrow">Operations</span>
                <h2>Recent Orders</h2>
              </div>
              <span className="manager-panel-count">{recentOrders.length}</span>
            </div>

            {recentOrders.length === 0 ? (
              <div className="manager-empty-state">
                <ClipboardList size={28} />
                <h3>No recent orders</h3>
                <p>Orders will appear here as customers place them.</p>
              </div>
            ) : (
              <div className="manager-orders-table-wrap">
                <table className="manager-orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Table</th>
                      <th>Mode</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.order_number || order.id}</strong>
                        </td>
                        <td>{order.table_number || "Takeaway"}</td>
                        <td>{formatOrderType(order.type)}</td>
                        <td>
                          <span className={getStatusClass(order.status)}>
                            {order.status || "-"}
                          </span>
                        </td>
                        <td>{formatCurrency(order.amount)}</td>
                        <td>{formatDateTime(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="manager-panel manager-quick-actions">
            <div className="manager-panel-header">
              <div>
                <span className="manager-panel-eyebrow">Quick Actions</span>
                <h2>Manage Operations</h2>
              </div>
            </div>

            <button
              type="button"
              className="manager-action-card"
              onClick={() => navigate("/manager/orders")}
            >
              <div className="manager-action-icon">
                <ClipboardList size={19} />
              </div>
              <div>
                <strong>View Orders</strong>
                <span>Review and manage restaurant orders</span>
              </div>
              <span className="manager-action-arrow">→</span>
            </button>

            <button
              type="button"
              className="manager-action-card"
              onClick={() => navigate("/manager/orders/new")}
            >
              <div className="manager-action-icon">
                <Users size={19} />
              </div>
              <div>
                <strong>Place Assisted Order</strong>
                <span>Create an order for a walk-in customer</span>
              </div>
              <span className="manager-action-arrow">→</span>
            </button>

            <button
              type="button"
              className="manager-action-card"
              onClick={() => navigate("/manager/reports")}
              title="Open reports and export tools"
            >
              <div className="manager-action-icon">
                <Activity size={19} />
              </div>
              <div>
                <strong>Reports & Export</strong>
                <span>View reports and export orders to Excel or PDF</span>
              </div>
              <span className="manager-action-arrow">→</span>
            </button>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default ManagerDashboard;
