import { useEffect, useState } from "react";

import { getAdminOrders, updateAdminOrderStatus } from "../../api/order.api";

import OrderDetails from "../../components/admin/orders/OrderDetails";

import "./Orders.css";

function Orders() {
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  const [orderMode, setOrderMode] = useState("");

  const [orderType, setOrderType] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [selectedOrderId, setSelectedOrderId] = useState(null);

  
  // LOAD ORDERS
  

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminOrders({
        search,
        status,
        orderMode,
        orderType,
        page,
        limit: 10,
      });

      const data = response?.data || response;

      setOrders(data?.orders || []);

      setPagination(
        data?.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (error) {
      console.error("Failed to load admin orders:", error);

      setError(error?.response?.data?.message || "Failed to load orders.");

      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  
  // INITIAL / FILTER LOAD
  

  useEffect(() => {
    loadOrders();
  }, [page, status, orderMode, orderType]);

  
  // SEARCH
  

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      setPage(1);

      loadOrders();
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setOrderMode("");
    setOrderType("");
    setPage(1);
  };

  
  // STATUS UPDATE
  

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateAdminOrderStatus(orderId, newStatus);

      await loadOrders();
    } catch (error) {
      console.error("Failed to update order status:", error);

      alert(error?.response?.data?.message || "Failed to update order status.");
    }
  };

  
  // HELPERS
  

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatOrderMode = (mode) => {
    if (mode === "DineIn") {
      return "Dine In";
    }

    if (mode === "Takeaway") {
      return "Takeaway";
    }

    return mode || "-";
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const getStatusClass = (orderStatus) => {
    return (orderStatus || "Pending").toLowerCase().replace(/\s+/g, "-");
  };

  
  // RENDER
  

  return (
    <div className="admin-orders-page">
      {/* 
                HEADER
             */}

      <div className="orders-page-header">
        <div>
          <h1>Orders</h1>

          <p>Manage and track restaurant orders</p>
        </div>

        <div className="orders-total">
          <span>Total Orders</span>

          <strong>{pagination.total}</strong>
        </div>
      </div>

      {/* 
                FILTERS
             */}

      <div className="orders-filters">
        <div className="orders-search">
          <input
            type="text"
            value={search}
            placeholder="Search order, customer or table..."
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);

            setPage(1);
          }}
        >
          <option value="">All Status</option>

          <option value="Pending">Pending</option>

          <option value="Preparing">Preparing</option>

          <option value="Ready">Ready</option>

          <option value="Served">Served</option>

          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={orderMode}
          onChange={(event) => {
            setOrderMode(event.target.value);

            setPage(1);
          }}
        >
          <option value="">All Modes</option>

          <option value="DineIn">Dine In</option>

          <option value="Takeaway">Takeaway</option>
        </select>

        <select
          value={orderType}
          onChange={(event) => {
            setOrderType(event.target.value);

            setPage(1);
          }}
        >
          <option value="">All Types</option>

          <option value="New">New</option>

          <option value="Additional">Additional</option>
        </select>

        {(search || status || orderMode || orderType) && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      {/* 
                ERROR
             */}

      {error && (
        <div className="orders-error">
          <strong>Unable to load orders</strong>

          <span>{error}</span>

          <button type="button" onClick={loadOrders}>
            Try Again
          </button>
        </div>
      )}

      {/* 
                TABLE
             */}

      <div className="orders-table-card">
        {loading ? (
          <div className="orders-state">
            <div className="orders-spinner" />

            <span>Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-state">
            <div className="orders-empty-icon">📋</div>

            <h3>No orders found</h3>

            <p>There are no orders matching your filters.</p>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>

                  <th>Customer</th>

                  <th>Type</th>

                  <th>Table</th>

                  <th>Items</th>

                  <th>Total</th>

                  <th>Status</th>

                  <th>Date</th>

                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    {/* ORDER */}

                    <td>
                      <button
                        type="button"
                        className="order-number-btn"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        #{order.order_number}
                      </button>
                    </td>

                    {/* CUSTOMER */}

                    <td>
                      <div className="customer-cell">
                        <strong>
                          {order.customer_name || "Walk-in Customer"}
                        </strong>

                        <span>{order.customer_mobile || "-"}</span>
                      </div>
                    </td>

                    {/* TYPE */}

                    <td>
                      <div className="order-type-cell">
                        <strong>{formatOrderMode(order.order_mode)}</strong>

                        <span>{order.order_type || "-"}</span>
                      </div>
                    </td>

                    {/* TABLE */}

                    <td>
                      <span className="table-value">
                        {order.table_number
                          ? `Table ${order.table_number}`
                          : "Takeaway"}
                      </span>
                    </td>

                    {/* ITEMS */}

                    <td>
                      <span className="items-count">
                        {order.items?.length || 0}
                      </span>
                    </td>

                    {/* TOTAL */}

                    <td>
                      <strong>{formatCurrency(order.total)}</strong>
                    </td>

                    {/* STATUS */}

                    <td>
                      <select
                        className={`order-status-select ${getStatusClass(
                          order.status,
                        )}`}
                        value={order.status}
                        onChange={(event) =>
                          handleStatusChange(order.id, event.target.value)
                        }
                      >
                        <option value="Pending">Pending</option>

                        <option value="Preparing">Preparing</option>

                        <option value="Ready">Ready</option>

                        <option value="Served">Served</option>

                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* DATE */}

                    <td>
                      <span className="order-date">
                        {formatDate(order.created_at)}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <button
                        type="button"
                        className="view-order-btn"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 
                PAGINATION
             */}

      {!loading && pagination.totalPages > 0 && (
        <div className="orders-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((previous) => previous - 1)}
          >
            ← Previous
          </button>

          <div>
            <span>Page</span>

            <strong>{page}</strong>

            <span>of</span>

            <strong>{pagination.totalPages}</strong>
          </div>

          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((previous) => previous + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* 
                ORDER DETAILS
             */}

      {selectedOrderId && (
        <OrderDetails
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onUpdated={() => loadOrders()}
        />
      )}
    </div>
  );
}

export default Orders;
