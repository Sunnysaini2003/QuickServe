import { useCallback, useEffect, useRef, useState } from "react";

import { getDashboard } from "../../api/dashboard.api";

import { createSocket } from "../../api/socket";

import "./Dashboard.css";

const Dashboard = () => {
  const [period, setPeriod] = useState("Today");

  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [newOrder, setNewOrder] = useState(null);

  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);

  const socketRef = useRef(null);

  const alertTimerRef = useRef(null);

  const refreshTimerRef = useRef(null);

  const processedOrdersRef = useRef(new Set());

  
  // LOAD DASHBOARD
  

  const loadDashboard = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const response = await getDashboard(period);

        console.log("📊 Dashboard API response:", response);

        const dashboardData = response?.data || response;

        console.log("📊 Dashboard data:", dashboardData);

        /*
          |--------------------------------------------------------------------------
          | Debug the values we actually receive
          |--------------------------------------------------------------------------
          */

        console.log("📊 Dashboard stats:", {
          orders: dashboardData?.stats?.orders,

          revenue: dashboardData?.stats?.revenue,

          pending_orders: dashboardData?.stats?.pending_orders,

          active_tables: dashboardData?.stats?.active_tables,

          total_tables: dashboardData?.stats?.total_tables,

          available_tables: dashboardData?.stats?.available_tables,

          completed_orders: dashboardData?.stats?.completed_orders,
        });

        setDashboard(dashboardData || null);
      } catch (err) {
        console.error("❌ Dashboard error:", err);

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load dashboard",
        );

        if (showLoader) {
          setDashboard(null);
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [period],
  );

  
  // DEBOUNCED REAL-TIME REFRESH
  

  const refreshDashboard = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      console.log("🔄 Refreshing dashboard after socket event...");

      loadDashboard(false);
    }, 150);
  }, [loadDashboard]);

  
  // INITIAL / PERIOD LOAD
  

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  
  // NEW ORDER SOUND
  

  const playNewOrderSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        return;
      }

      const context = new AudioContext();

      const oscillator = context.createOscillator();

      const gain = context.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(880, context.currentTime);

      oscillator.frequency.setValueAtTime(660, context.currentTime + 0.15);

      oscillator.frequency.setValueAtTime(880, context.currentTime + 0.3);

      gain.gain.setValueAtTime(0.0001, context.currentTime);

      gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.03);

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.55,
      );

      oscillator.connect(gain);

      gain.connect(context.destination);

      oscillator.start();

      oscillator.stop(context.currentTime + 0.6);

      oscillator.onended = () => {
        context.close().catch(() => {});
      };
    } catch (err) {
      console.warn("Dashboard notification sound failed:", err);
    }
  };

  
  // SHOW NEW ORDER ALERT
  

  const handleNewOrder = useCallback(
    (order) => {
      if (!order?.id) {
        return;
      }

      if (processedOrdersRef.current.has(order.id)) {
        return;
      }

      processedOrdersRef.current.add(order.id);

      setNewOrder(order);

      setShowNewOrderAlert(true);

      playNewOrderSound();

      /*
        |--------------------------------------------------------------------------
        | Browser notification
        |--------------------------------------------------------------------------
        */

      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("🔔 New QuickServe Order", {
            body: `${order.order_number || "New order"}${
              order.table_number ? ` • Table ${order.table_number}` : ""
            }`,
          });
        } catch (err) {
          console.warn("Notification failed:", err);
        }
      }

      /*
        |--------------------------------------------------------------------------
        | Alert timer
        |--------------------------------------------------------------------------
        */

      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }

      alertTimerRef.current = setTimeout(() => {
        setShowNewOrderAlert(false);
      }, 8000);

      /*
        |--------------------------------------------------------------------------
        | Refresh dashboard
        |--------------------------------------------------------------------------
        */

      refreshDashboard();
    },
    [refreshDashboard],
  );

  
  // SOCKET
  

  useEffect(() => {
    console.log("🔌 Creating Admin Dashboard socket");

    const adminSocket = createSocket({
      role: "admin",
    });

    if (!adminSocket) {
      console.warn("⚠️ Admin socket was not created");

      return;
    }

    socketRef.current = adminSocket;

    
    // CONNECT
    

    adminSocket.on("connect", () => {
      console.log(`🔌 Admin Dashboard socket connected: ${adminSocket.id}`);

      adminSocket.emit("join_admin");

      console.log("👨‍💼 Admin joined admin socket room");
    });

    
    // NEW ORDER
    

    adminSocket.on("new_order", (order) => {
      console.log("🔔 ADMIN NEW ORDER:", order);

      handleNewOrder(order);
    });

    
    // ORDER STATUS UPDATED
    

    adminSocket.on("order_status_updated", (order) => {
      console.log("🔄 ADMIN ORDER STATUS UPDATED:", order);

      /*
        |--------------------------------------------------------------------------
        | Important:
        |
        | The socket event is only the trigger.
        | The dashboard API remains the source of truth.
        |--------------------------------------------------------------------------
        */

      refreshDashboard();
    });

    
    // SOCKET ERROR
    

    adminSocket.on("socket_error", (socketError) => {
      console.error("❌ Admin socket server error:", socketError);
    });

    
    // CONNECTION ERROR
    

    adminSocket.on("connect_error", (err) => {
      console.error("❌ Admin socket connection error:", err.message);
    });

    
    // DISCONNECT
    

    adminSocket.on("disconnect", (reason) => {
      console.log("🔌 Admin socket disconnected:", reason);
    });

    
    // CLEANUP
    

    return () => {
      console.log("🔌 Cleaning up Admin Dashboard socket");

      adminSocket.removeAllListeners("connect");

      adminSocket.removeAllListeners("new_order");

      adminSocket.removeAllListeners("order_status_updated");

      adminSocket.removeAllListeners("socket_error");

      adminSocket.removeAllListeners("connect_error");

      adminSocket.removeAllListeners("disconnect");

      adminSocket.disconnect();

      socketRef.current = null;

      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [handleNewOrder, refreshDashboard]);

  
  // NOTIFICATION PERMISSION
  

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  
  // LOADING
  

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="empty-state">
          <h3>Loading dashboard...</h3>

          <p>Please wait while we load your restaurant data.</p>
        </div>
      </div>
    );
  }

  
  // ERROR
  

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="empty-state">
          <h3>Unable to load dashboard</h3>

          <p>{error}</p>

          <button
            className="btn btn-primary"
            onClick={() => loadDashboard(true)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  
  // NO DATA
  

  if (!dashboard) {
    return (
      <div className="dashboard-page">
        <div className="empty-state">
          <h3>No dashboard data</h3>

          <p>Dashboard data could not be loaded.</p>
        </div>
      </div>
    );
  }

  
  // DASHBOARD DATA
  

  const stats = dashboard.stats || {};

  const recentOrders = dashboard.recent_orders || [];

  const sales = dashboard.sales || [];

  const currentPeriod = dashboard.period || period;

  const periodLabel =
    {
      Today: "Today",

      "This Week": "Last 7 Days",

      "This Month": "This Month",
    }[currentPeriod] || currentPeriod;

  const periodDescription =
    {
      Today: "today",

      "This Week": "the last 7 days",

      "This Month": "this month",
    }[currentPeriod] || currentPeriod.toLowerCase();

  
  // FORMATTERS
  

  const formatCurrency = (amount) => {
    const value = Number(amount || 0);

    return `₹${value.toLocaleString("en-IN")}`;
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
  };

  const formatOrderType = (type) => {
    if (!type) {
      return "-";
    }

    return String(type)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ");
  };

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",

      month: "short",
    });
  };

  
  // SALES
  

  const salesData = sales
    .map((item) => {
      const date = new Date(item.date);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return {
        date: item.date,

        day: date.toLocaleDateString("en-IN", {
          weekday: "short",
        }),

        value: Number(item.revenue || 0),
      };
    })
    .filter(Boolean);

  const maxSales = Math.max(...salesData.map((item) => item.value), 1);

  const revenue = Number(stats.revenue || 0);

  const activeTables = Number(stats.active_tables || 0);

  const totalTables = Number(stats.total_tables || 0);

  const availableTables = Number.isFinite(Number(stats.available_tables))
    ? Number(stats.available_tables)
    : Math.max(totalTables - activeTables, 0);

  const orders = Number(stats.orders || 0);

  const pendingOrders = Number(stats.pending_orders || 0);

  const customers = Number(stats.customers || 0);

  const completedOrders = Number(stats.completed_orders || 0);

  
  // RENDER
  

  return (
    <div className="dashboard-page">
      {/* 
                        NEW ORDER ALERT
           */}

      {newOrder && showNewOrderAlert && (
        <button
          type="button"
          className="dashboard-new-order-alert"
          onClick={() => setShowNewOrderAlert(false)}
        >
          <span className="dashboard-alert-icon">🔔</span>

          <span className="dashboard-alert-content">
            <strong>NEW ORDER</strong>

            <span>
              #{newOrder.order_number || newOrder.id}
              {newOrder.table_number ? ` • Table ${newOrder.table_number}` : ""}
            </span>
          </span>

          <span className="dashboard-alert-arrow">→</span>
        </button>
      )}

      {/* 
                          HEADER
           */}

      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>

          <p>Welcome back, QuickServe Admin</p>
        </div>

        <select
          className="dashboard-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="Today">Today</option>

          <option value="This Week">This Week</option>

          <option value="This Month">This Month</option>
        </select>
      </div>

      {/* 
                        STAT CARDS
           */}

      <div className="dashboard-stats">
        {/* ORDERS */}

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon orders-icon">🧾</div>

            <span className="stat-normal">{periodLabel}</span>
          </div>

          <div className="stat-value">{formatNumber(orders)}</div>

          <div className="stat-label">Orders</div>

          <div className="stat-footer">
            Total orders for {periodDescription}
          </div>
        </div>

        {/* REVENUE */}

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon revenue-icon">₹</div>

            <span className="stat-growth">Revenue</span>
          </div>

          <div className="stat-value">{formatCurrency(revenue)}</div>

          <div className="stat-label">Revenue</div>

          <div className="stat-footer">Excluding cancelled orders</div>
        </div>

        {/* PENDING */}

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon pending-icon">⏱</div>

            <span className="stat-warning">Attention</span>
          </div>

          <div className="stat-value">{formatNumber(pendingOrders)}</div>

          <div className="stat-label">Pending Orders</div>

          <div className="stat-footer">Orders waiting for action</div>
        </div>

        {/* TABLES */}

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon tables-icon">▦</div>

            <span className="stat-normal">Occupied</span>
          </div>

          <div className="stat-value">
            {formatNumber(activeTables)}

            <small>/{formatNumber(totalTables)}</small>
          </div>

          <div className="stat-label">Occupied Tables</div>

          <div className="stat-footer">
            {formatNumber(availableTables)} tables available
          </div>
        </div>
      </div>

      {/* 
                            MAIN GRID
           */}

      <div className="dashboard-grid">
        {/* 
                            SALES
             */}

        <div className="dashboard-card sales-card">
          <div className="card-header">
            <div>
              <h2>Sales Overview</h2>

              <p>Revenue for {periodDescription}</p>
            </div>

            <strong>{formatCurrency(revenue)}</strong>
          </div>

          {salesData.length === 0 ? (
            <div className="empty-state">
              <p>No sales data available for this period.</p>
            </div>
          ) : (
            <div className="sales-chart">
              <div className="chart-y-axis">
                <span>{formatCurrency(maxSales)}</span>

                <span>{formatCurrency(maxSales * 0.75)}</span>

                <span>{formatCurrency(maxSales * 0.5)}</span>

                <span>{formatCurrency(maxSales * 0.25)}</span>

                <span>₹0</span>
              </div>

              <div className="chart-area">
                <div className="chart-grid-lines">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="chart-bars">
                  {salesData.map((item, index) => {
                    const height = (item.value / maxSales) * 100;

                    return (
                      <div
                        className="chart-column"
                        key={`${item.date || item.day}-${index}`}
                      >
                        <div className="chart-value">
                          {formatCurrency(item.value)}
                        </div>

                        <div
                          className="chart-bar"
                          style={{
                            height: `${Math.max(height, 2)}%`,
                          }}
                        />

                        <span>{item.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 
                        QUICK OVERVIEW
             */}

        <div className="dashboard-card overview-card">
          <div className="card-header">
            <div>
              <h2>Quick Overview</h2>

              <p>Restaurant activity</p>
            </div>
          </div>

          {/* CUSTOMERS */}

          <div className="overview-item">
            <div className="overview-left">
              <span className="overview-icon">👥</span>

              <div>
                <strong>Customers</strong>

                <span>Customers for {periodDescription}</span>
              </div>
            </div>

            <strong className="overview-number">
              {formatNumber(customers)}
            </strong>
          </div>

          {/* AVAILABLE TABLES */}

          <div className="overview-item">
            <div className="overview-left">
              <span className="overview-icon">🍽</span>

              <div>
                <strong>Available Tables</strong>

                <span>Currently free</span>
              </div>
            </div>

            <strong className="overview-number">
              {formatNumber(availableTables)}
            </strong>
          </div>

          {/* KITCHEN ORDERS */}

          <div className="overview-item">
            <div className="overview-left">
              <span className="overview-icon">♨</span>

              <div>
                <strong>Kitchen Orders</strong>

                <span>Currently active</span>
              </div>
            </div>

            <strong className="overview-number">
              {formatNumber(pendingOrders)}
            </strong>
          </div>

          {/* COMPLETED */}

          <div className="overview-item">
            <div className="overview-left">
              <span className="overview-icon">✓</span>

              <div>
                <strong>Completed</strong>

                <span>Orders completed {periodDescription}</span>
              </div>
            </div>

            <strong className="overview-number">
              {formatNumber(completedOrders)}
            </strong>
          </div>
        </div>
      </div>

      {/* 
                        RECENT ORDERS
           */}

      <div className="dashboard-card recent-orders-card">
        <div className="card-header">
          <div>
            <h2>Recent Orders</h2>

            <p>Latest restaurant orders</p>
          </div>

          <button className="view-all-btn" type="button">
            View All
          </button>
        </div>

        <div className="orders-table-wrapper">
          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <p>No recent orders found.</p>
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>

                  <th>Customer</th>

                  <th>Type</th>

                  <th>Amount</th>

                  <th>Status</th>

                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.order_number}</strong>
                    </td>

                    <td>{order.customer || "Walk-in Customer"}</td>

                    <td>{formatOrderType(order.type)}</td>

                    <td>
                      <strong>{formatCurrency(order.amount)}</strong>
                    </td>

                    <td>
                      <span
                        className={`order-status status-${String(
                          order.status || "",
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        <span />

                        {order.status}
                      </span>
                    </td>

                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
