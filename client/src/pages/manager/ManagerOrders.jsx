import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import { LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Link } from "react-router-dom";

import {
  exportManagerOrders,
  getManagerOrderById,
  getManagerOrders,
  updateManagerOrderStatus,
} from "../../api/manager.api";
import { createSocket } from "../../api/socket";

import "./ManagerOrders.css";

import qsIcon from "../../assets/qs_icon.png";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["Pending", "Preparing", "Ready", "Served", "Cancelled"];

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatMode = (mode) => {
  if (mode === "DineIn") return "Dine In";
  if (mode === "Takeaway") return "Takeaway";
  return mode || "-";
};

const getStatusClass = (status) =>
  String(status || "Pending")
    .toLowerCase()
    .replace(/\s+/g, "-");

function ManagerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [orderMode, setOrderMode] = useState("");
  const [orderType, setOrderType] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const loadOrders = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await getManagerOrders({
        search: debouncedSearch,
        status,
        orderMode,
        orderType,
        page,
        limit: PAGE_SIZE,
      });

      const data = response?.data || response;

      setOrders(data?.orders || []);
      setPagination(
        data?.pagination || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (requestError) {
      console.error("Failed to load manager orders:", requestError);
      setError(
        requestError?.response?.data?.message ||
          "Failed to load manager orders.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [debouncedSearch, status, orderMode, orderType, page]);

  useEffect(() => {
    const socket = createSocket({ role: "manager" });

    if (!socket) return undefined;

    const refreshFromSocket = () => {
      loadOrders({ silent: true });
    };

    socket.on("new_order", refreshFromSocket);
    socket.on("order_created", refreshFromSocket);
    socket.on("order_status_updated", refreshFromSocket);

    return () => {
      socket.removeListener("new_order", refreshFromSocket);
      socket.removeListener("order_created", refreshFromSocket);
      socket.removeListener("order_status_updated", refreshFromSocket);
      socket.disconnect();
    };
  }, [debouncedSearch, status, orderMode, orderType, page]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setOrderMode("");
    setOrderType("");
    setPage(1);
  };

  const filtersActive = useMemo(
    () => Boolean(search || status || orderMode || orderType),
    [search, status, orderMode, orderType],
  );

  const openDetails = async (orderId) => {
    setSelectedOrderId(orderId);
    setSelectedOrder(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const response = await getManagerOrderById(orderId);
      setSelectedOrder(response?.data || response);
    } catch (requestError) {
      console.error("Failed to load manager order:", requestError);
      setDetailsError(
        requestError?.response?.data?.message ||
          "Failed to load order details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setDetailsError("");
  };

  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      setUpdatingStatus(orderId);

      await updateManagerOrderStatus(orderId, nextStatus);
      await loadOrders({ silent: true });

      if (selectedOrderId === orderId) {
        const response = await getManagerOrderById(orderId);
        setSelectedOrder(response?.data || response);
      }
    } catch (requestError) {
      console.error("Failed to update manager order status:", requestError);
      window.alert(
        requestError?.response?.data?.message ||
          "Failed to update order status.",
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const buildFilterParams = () => ({
    search: search.trim(),
    status,
    orderMode,
    orderType,
  });

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    try {
      setExporting(format);
      const blob = await exportManagerOrders(buildFilterParams(), format);
      const today = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `quickserve-orders-${today}.${format}`);
    } catch (requestError) {
      console.error(`Failed to export orders as ${format}:`, requestError);
      window.alert(
        requestError?.response?.data?.message ||
          `Failed to export orders as ${format.toUpperCase()}.`,
      );
    } finally {
      setExporting("");
    }
  };

  const printReceipt = (order) => {
    if (!order) return;

    const logoUrl = new URL(qsIcon, window.location.href).href;
    const customerName = order.customer_name || "Walk-in Customer";
    const tableLabel = order.table_number
      ? `Table ${order.table_number}`
      : "Takeaway";
    const itemRows = (order.items || [])
      .map(
        (item) => `
          <div class="item-row">
            <div class="item-main">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${Number(item.quantity || 0)} × ${formatCurrency(item.price)}</span>
            </div>
            <strong>${formatCurrency(item.subtotal)}</strong>
          </div>`,
      )
      .join("");

    const printWindow = window.open("", "quickserve-receipt", "width=420,height=720");
    if (!printWindow) {
      window.alert("Please allow pop-ups to print the receipt.");
      return;
    }

    printWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(order.order_number)}</title>
<style>
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
body { width: 80mm; }
.receipt { width: 72mm; margin: 0 auto; padding: 4mm 0 6mm; }
.brand { text-align: center; }
.brand img { width: 24mm; max-height: 14mm; object-fit: contain; }
.brand h1 { margin: 1.5mm 0 0; font-size: 17px; letter-spacing: .02em; }
.brand p { margin: 1mm 0 0; font-size: 9px; color: #6b7280; }
.rule { border-top: 1px dashed #9ca3af; margin: 3mm 0; }
.meta { display: grid; gap: 1.2mm; font-size: 9px; }
.meta-row { display: flex; justify-content: space-between; gap: 3mm; }
.meta-row span:first-child { color: #6b7280; }
.meta-row span:last-child { text-align: right; font-weight: 700; }
.items { display: grid; gap: 2.2mm; }
.item-row { display: flex; justify-content: space-between; gap: 4mm; font-size: 9px; }
.item-main { min-width: 0; flex: 1; }
.item-main strong, .item-main span { display: block; }
.item-main strong { font-size: 10px; overflow-wrap: anywhere; }
.item-main span { margin-top: .7mm; color: #6b7280; }
.total { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 800; }
.total strong { font-size: 15px; }
.note { padding: 2mm; background: #f8fafc; border-radius: 2mm; font-size: 9px; line-height: 1.4; }
.footer { margin-top: 4mm; text-align: center; color: #6b7280; font-size: 8px; line-height: 1.5; }
</style>
</head>
<body>
<div class="receipt">
  <div class="brand">
    <img src="${logoUrl}" alt="QuickServe" />
    <h1>QuickServe</h1>
    <p>Restaurant Order Receipt</p>
  </div>
  <div class="rule"></div>
  <div class="meta">
    <div class="meta-row"><span>Order</span><span>#${escapeHtml(order.order_number || order.id)}</span></div>
    <div class="meta-row"><span>Date</span><span>${escapeHtml(formatDate(order.created_at))}</span></div>
    <div class="meta-row"><span>Customer</span><span>${escapeHtml(customerName)}</span></div>
    <div class="meta-row"><span>Phone</span><span>${escapeHtml(order.customer_phone || order.customer_mobile || "-")}</span></div>
    <div class="meta-row"><span>Mode</span><span>${escapeHtml(formatMode(order.order_mode))}</span></div>
    <div class="meta-row"><span>Table</span><span>${escapeHtml(tableLabel)}</span></div>
    <div class="meta-row"><span>Status</span><span>${escapeHtml(order.status || "Pending")}</span></div>
  </div>
  <div class="rule"></div>
  <div class="items">${itemRows}</div>
  ${order.notes ? `<div class="rule"></div><div class="note"><strong>Note:</strong> ${escapeHtml(order.notes)}</div>` : ""}
  <div class="rule"></div>
  <div class="total"><span>Total</span><strong>${formatCurrency(order.total)}</strong></div>
  <div class="footer">Thank you for choosing QuickServe.</div>
</div>
</body>
</html>`);
    printWindow.document.close();

    const image = printWindow.document.querySelector(".brand img");
    const doPrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };

    if (image) {
      if (image.complete) {
        setTimeout(doPrint, 120);
      } else {
        image.onload = () => doPrint();
        image.onerror = () => doPrint();
      }
    } else {
      setTimeout(doPrint, 120);
    }
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const terminalOrder = (order) =>
    order?.status === "Served" || order?.status === "Cancelled";

  return (
    <div className="manager-orders-page">
      <header className="manager-orders-header">
        <div>
          <Link to={"/manager"} className="manager-orders-eyebrow">
            <img src={qsIcon} alt="" className="manager-orders-brand-icon" />
            <span>Restaurant Operations</span>
          </Link>

          <h1>Orders</h1>

          <p>View, manage and track every restaurant order.</p>
        </div>

        <div className="manager-orders-header-actions">
          <button
            type="button"
            className="manager-orders-dashboard"
            onClick={() => navigate("/manager")}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            Dashboard
          </button>

          <button
            type="button"
            className="manager-orders-export manager-orders-export-excel"
            onClick={() => handleExport("xlsx")}
            disabled={Boolean(exporting) || loading}
          >
            <FileSpreadsheet size={16} aria-hidden="true" />
            {exporting === "xlsx" ? "Exporting..." : "Excel"}
          </button>

          <button
            type="button"
            className="manager-orders-export manager-orders-export-pdf"
            onClick={() => handleExport("pdf")}
            disabled={Boolean(exporting) || loading}
          >
            <FileText size={16} aria-hidden="true" />
            {exporting === "pdf" ? "Exporting..." : "PDF"}
          </button>

          <button
            type="button"
            className="manager-orders-refresh"
            onClick={() => loadOrders({ silent: true })}
            disabled={loading || refreshing || Boolean(exporting)}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "is-spinning" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </header>

      <section className="manager-orders-toolbar">
        <div className="manager-orders-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            placeholder="Search order, customer, phone or table..."
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={orderMode}
          onChange={(event) => {
            setOrderMode(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by order mode"
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
          aria-label="Filter by order type"
        >
          <option value="">All Types</option>
          <option value="New">New</option>
          <option value="Additional">Additional</option>
        </select>

        {filtersActive && (
          <button
            type="button"
            className="manager-orders-clear"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </section>

      <section className="manager-orders-summary">
        <div>
          <span>Matching orders</span>
          <strong>{pagination.total}</strong>
        </div>

        <div className="manager-orders-live">
          <span className="manager-live-dot" />
          Live updates enabled
        </div>
      </section>

      {error && (
        <div className="manager-orders-error">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>Unable to load orders</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => loadOrders()}>
            Try again
          </button>
        </div>
      )}

      <section className="manager-orders-card">
        {loading ? (
          <div className="manager-orders-state">
            <div className="manager-orders-spinner" />
            <strong>Loading orders...</strong>
            <span>Please wait while we fetch the latest orders.</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="manager-orders-state">
            <div className="manager-empty-icon">
              <ShoppingBag size={24} aria-hidden="true" />
            </div>
            <strong>No orders found</strong>
            <span>
              {filtersActive
                ? "Try adjusting your search or filters."
                : "New orders will appear here automatically."}
            </span>
          </div>
        ) : (
          <div className="manager-orders-table-wrap">
            <table className="manager-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Mode</th>
                  <th>Table</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Placed</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        type="button"
                        className="manager-order-number"
                        onClick={() => openDetails(order.id)}
                      >
                        #{order.order_number}
                      </button>
                      <span className="manager-order-type">
                        {order.order_type || "New"}
                      </span>
                    </td>

                    <td>
                      <div className="manager-customer-cell">
                        <div className="manager-cell-icon">
                          <UserRound size={15} aria-hidden="true" />
                        </div>
                        <div>
                          <strong>
                            {order.customer_name || "Walk-in Customer"}
                          </strong>
                          <span>{order.customer_mobile || "-"}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="manager-mode-pill">
                        {formatMode(order.order_mode)}
                      </span>
                    </td>

                    <td>
                      <span className="manager-table-value">
                        {order.table_number
                          ? `Table ${order.table_number}`
                          : "Takeaway"}
                      </span>
                    </td>

                    <td>
                      <span className="manager-items-count">
                        {order.items?.length || 0}
                      </span>
                    </td>

                    <td>
                      <strong>{formatCurrency(order.total)}</strong>
                    </td>

                    <td>
                      <select
                        className={`manager-status-select ${getStatusClass(
                          order.status,
                        )}`}
                        value={order.status}
                        disabled={
                          terminalOrder(order) || updatingStatus === order.id
                        }
                        onChange={(event) =>
                          handleStatusChange(order.id, event.target.value)
                        }
                        aria-label={`Update status for order ${order.order_number}`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <span className="manager-order-date">
                        <Clock3 size={13} aria-hidden="true" />
                        {formatDate(order.created_at)}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="manager-view-button"
                        onClick={() => openDetails(order.id)}
                      >
                        <Eye size={15} aria-hidden="true" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!loading && pagination.totalPages > 0 && (
        <div className="manager-orders-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeft size={17} aria-hidden="true" />
            Previous
          </button>

          <div>
            <span>Page</span>
            <strong>{pagination.page || page}</strong>
            <span>of</span>
            <strong>{pagination.totalPages}</strong>
          </div>

          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}

      {selectedOrderId && (
        <div
          className="manager-order-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetails();
            }
          }}
        >
          <aside
            className="manager-order-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-order-details-title"
          >
            <div className="manager-order-drawer-header">
              <div>
                <span>Order Details</span>
                <h2 id="manager-order-details-title">
                  #{selectedOrder?.order_number || "..."}
                </h2>
              </div>
              <button
                type="button"
                className="manager-order-close"
                onClick={closeDetails}
                aria-label="Close order details"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="manager-order-drawer-state">
                <div className="manager-orders-spinner" />
                <strong>Loading order...</strong>
              </div>
            ) : detailsError ? (
              <div className="manager-order-drawer-state manager-drawer-error">
                <AlertCircle size={22} aria-hidden="true" />
                <strong>Unable to load order</strong>
                <span>{detailsError}</span>
                <button
                  type="button"
                  onClick={() => openDetails(selectedOrderId)}
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="manager-order-drawer-body">
                <div className="manager-detail-status-row">
                  <span
                    className={`manager-detail-status ${getStatusClass(
                      selectedOrder?.status,
                    )}`}
                  >
                    {selectedOrder?.status || "Pending"}
                  </span>
                  <span>{formatDate(selectedOrder?.created_at)}</span>
                </div>

                <div className="manager-detail-grid">
                  <div>
                    <span>Customer</span>
                    <strong>
                      {selectedOrder?.customer_name || "Walk-in Customer"}
                    </strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{selectedOrder?.customer_phone || "-"}</strong>
                  </div>
                  <div>
                    <span>Order Mode</span>
                    <strong>{formatMode(selectedOrder?.order_mode)}</strong>
                  </div>
                  <div>
                    <span>Table</span>
                    <strong>
                      {selectedOrder?.table_number
                        ? `Table ${selectedOrder.table_number}`
                        : "Takeaway"}
                    </strong>
                  </div>
                </div>

                <div className="manager-detail-section">
                  <div className="manager-detail-section-title">
                    <span>Items</span>
                    <strong>
                      {selectedOrder?.items?.length || 0} line items
                    </strong>
                  </div>

                  <div className="manager-detail-items">
                    {selectedOrder?.items?.map((item) => (
                      <div key={item.id} className="manager-detail-item">
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.quantity} × {formatCurrency(item.price)}
                          </span>
                        </div>
                        <strong>{formatCurrency(item.subtotal)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="manager-detail-total">
                  <span>Total</span>
                  <strong>{formatCurrency(selectedOrder?.total)}</strong>
                </div>

                {selectedOrder?.notes && (
                  <div className="manager-detail-notes">
                    <span>Notes</span>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}

                <div className="manager-detail-actions">
                  <div className="manager-detail-action-row">
                    <label htmlFor="manager-detail-status">Update status</label>
                    <button
                      type="button"
                      className="manager-detail-print"
                      onClick={() => printReceipt(selectedOrder)}
                      disabled={!selectedOrder || detailsLoading}
                    >
                      <Printer size={15} aria-hidden="true" />
                      Print Bill
                    </button>
                  </div>
                  <select
                    id="manager-detail-status"
                    value={selectedOrder?.status || "Pending"}
                    disabled={
                      terminalOrder(selectedOrder) ||
                      updatingStatus === selectedOrder?.id
                    }
                    onChange={(event) =>
                      handleStatusChange(selectedOrder.id, event.target.value)
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default ManagerOrders;
