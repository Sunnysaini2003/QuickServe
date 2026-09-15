import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  RotateCcw,
} from "lucide-react";

import qslogo from "../../assets/qs_icon.png";
import { exportManagerOrders } from "../../api/manager.api";

import "./ManagerReports.css";

const ManagerReports = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [orderMode, setOrderMode] = useState("");
  const [orderType, setOrderType] = useState("");
  const [exporting, setExporting] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      ...(orderMode ? { orderMode } : {}),
      ...(orderType ? { orderType } : {}),
    }),
    [search, status, orderMode, orderType],
  );

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setOrderMode("");
    setOrderType("");
    setMessage("");
    setError("");
  };

  const downloadReport = async (format) => {
    try {
      setExporting(format);
      setMessage("");
      setError("");

      const blob = await exportManagerOrders(filters, format);
      const extension = format === "pdf" ? "pdf" : "xlsx";
      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const fileBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(fileBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `quickserve-orders-report-${new Date()
        .toISOString()
        .slice(0, 10)}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setMessage(
        `${format === "pdf" ? "PDF" : "Excel"} report downloaded successfully.`,
      );
    } catch (err) {
      console.error(`Manager ${format} export failed:`, err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to export ${format.toUpperCase()} report.`,
      );
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="manager-reports-page">
      <div className="manager-reports-shell">
        <header className="manager-reports-header">
          <div className="manager-reports-title-wrap">
            <button
              type="button"
              className="manager-reports-back"
              onClick={() => navigate("/manager")}
              title="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="manager-reports-eyebrow">
                <img src={qslogo} alt="QuickServe" />
                Manager Reports
              </span>
              <h1>Reports & Export</h1>
              <p>
                Generate restaurant order reports and download them as Excel or
                branded PDF files.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="manager-reports-orders-btn"
            onClick={() => navigate("/manager/orders")}
          >
            <ClipboardList size={17} />
            View Orders
          </button>
        </header>

        <section className="manager-reports-hero">
          <div className="manager-reports-hero-icon">
            <BarChart3 size={24} />
          </div>
          <div>
            <span>Order reporting</span>
            <h2>Build a report from your order data</h2>
            <p>
              Use the filters below to narrow the export. The same filters are
              applied to both Excel and PDF downloads.
            </p>
          </div>
        </section>

        <section className="manager-reports-panel">
          <div className="manager-reports-panel-head">
            <div>
              <span className="manager-reports-panel-eyebrow">Filters</span>
              <h2>Choose report scope</h2>
            </div>
            <button
              type="button"
              className="manager-reports-reset"
              onClick={resetFilters}
              disabled={Boolean(exporting)}
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </div>

          <div className="manager-reports-filters">
            <label className="manager-report-field manager-report-search">
              <span>Search</span>
              <div className="manager-report-input-wrap">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Order number or customer"
                />
              </div>
            </label>

            <label className="manager-report-field">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready</option>
                <option value="Served">Served</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>

            <label className="manager-report-field">
              <span>Order Mode</span>
              <select
                value={orderMode}
                onChange={(event) => setOrderMode(event.target.value)}
              >
                <option value="">All modes</option>
                <option value="DineIn">Dine In</option>
                <option value="Takeaway">Takeaway</option>
              </select>
            </label>

            <label className="manager-report-field">
              <span>Order Type</span>
              <select
                value={orderType}
                onChange={(event) => setOrderType(event.target.value)}
              >
                <option value="">All types</option>
                <option value="New">New</option>
                <option value="Additional">Additional</option>
              </select>
            </label>
          </div>
        </section>

        <section className="manager-report-download-grid" aria-label="Report formats">
          <article className="manager-report-download-card">
            <div className="manager-report-download-icon">
              <FileSpreadsheet size={25} />
            </div>
            <div className="manager-report-download-content">
              <span>Spreadsheet</span>
              <h2>Excel Report</h2>
              <p>
                Download order and order-item data in an Excel workbook for
                further analysis.
              </p>
              <button
                type="button"
                className="manager-report-download-btn"
                onClick={() => downloadReport("xlsx")}
                disabled={Boolean(exporting)}
              >
                <Download size={16} />
                {exporting === "xlsx" ? "Preparing..." : "Download Excel"}
              </button>
            </div>
          </article>

          <article className="manager-report-download-card">
            <div className="manager-report-download-icon manager-report-pdf-icon">
              <FileText size={25} />
            </div>
            <div className="manager-report-download-content">
              <span>Branded document</span>
              <h2>PDF Report</h2>
              <p>
                Download a client-ready QuickServe PDF with the restaurant
                branding and order summary.
              </p>
              <button
                type="button"
                className="manager-report-download-btn"
                onClick={() => downloadReport("pdf")}
                disabled={Boolean(exporting)}
              >
                <Download size={16} />
                {exporting === "pdf" ? "Preparing..." : "Download PDF"}
              </button>
            </div>
          </article>
        </section>

        {message && <div className="manager-reports-message">{message}</div>}
        {error && <div className="manager-reports-error">{error}</div>}

        <p className="manager-reports-note">
          Reports use the same Manager-only export endpoint and current order
          filters. No order data is exposed directly to the browser until the
          export is requested.
        </p>
      </div>
    </div>
  );
};

export default ManagerReports;
