import { useEffect, useState } from "react";

import {
  getTables,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
} from "../../api/table.api";

import "./Tables.css";

import { getImageUrl } from "../../utils/helpers";

// BOOLEAN

const toBoolean = (value) => {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE" ||
    value === "True"
  );
};

// EXTRACT ARRAY

const extractArray = (response) => {
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

// ADMIN TABLES

const AdminTables = () => {
  // STATE

  const [tables, setTables] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [showQrModal, setShowQrModal] = useState(false);

  const [selectedQr, setSelectedQr] = useState(null);

  const [editingTable, setEditingTable] = useState(null);

  const [form, setForm] = useState({
    table_number: "",
    status: true,
  });

  // LOAD TABLES

  const loadTables = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTables();

      const data = extractArray(response);

      setTables(Array.isArray(data) ? data : []);
    } catch (err) {
      setTables([]);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to load tables",
      );
    } finally {
      setLoading(false);
    }
  };

  // INITIAL LOAD

  useEffect(() => {
    loadTables();
  }, []);

  // RESET FORM

  const resetForm = () => {
    setForm({
      table_number: "",
      status: true,
    });
  };

  // OPEN CREATE

  const openCreateModal = () => {
    setEditingTable(null);

    resetForm();

    setError("");

    setShowModal(true);
  };

  // OPEN EDIT

  const openEditModal = (table) => {
    setEditingTable(table);

    setForm({
      table_number: table?.table_number || "",

      status: toBoolean(table?.status),
    });

    setError("");

    setShowModal(true);
  };

  // CLOSE MODAL

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingTable(null);

    resetForm();

    setError("");
  };

  // CHANGE

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,

      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // SAVE

  const handleSubmit = async (e) => {
    e.preventDefault();

    const tableNumber = form.table_number.trim();

    if (!tableNumber) {
      setError("Table number is required.");

      return;
    }

    if (tableNumber.length > 20) {
      setError("Table number cannot exceed 20 characters.");

      return;
    }

    try {
      setSaving(true);

      setError("");

      const payload = {
        table_number: tableNumber,

        status: form.status,
      };

      if (editingTable) {
        await updateTable(editingTable.id, payload);
      } else {
        await createTable(payload);
      }

      closeModal();

      await loadTables();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to save table",
      );
    } finally {
      setSaving(false);
    }
  };

  // DELETE

  const handleDelete = async (table) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete table "${table.table_number}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteTable(table.id);

      await loadTables();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to delete table",
      );
    }
  };

  // STATUS

  const handleToggleStatus = async (table) => {
    try {
      setError("");

      const currentStatus = toBoolean(table.status);

      await updateTableStatus(table.id, !currentStatus);

      await loadTables();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to update table status",
      );
    }
  };

  // QR

  const openQrModal = (table) => {
    const imageUrl = getImageUrl(table.qr_image);

    if (!imageUrl) {
      setError("QR image is not available for this table.");

      return;
    }

    setSelectedQr({
      tableNumber: table.table_number,

      imageUrl,
    });

    setShowQrModal(true);
  };

  // CLOSE QR

  const closeQrModal = () => {
    setShowQrModal(false);

    setSelectedQr(null);
  };

  // SEARCH

  const safeTables = Array.isArray(tables) ? tables : [];

  const filteredTables = safeTables.filter((table) => {
    const searchText = search.toLowerCase().trim();

    return String(table?.table_number || "")
      .toLowerCase()
      .includes(searchText);
  });

  // RENDER

  return (
    <div className="tables-page">
      {/* HEADER */}

      <div className="tables-header">
        <div>
          <h1>Restaurant Tables</h1>

          <p>Manage restaurant tables and their QR codes.</p>
        </div>

        <button
          type="button"
          className="table-add-button"
          onClick={openCreateModal}
        >
          + Add Table
        </button>
      </div>

      {/* ERROR */}

      {error && !showModal && !showQrModal && (
        <div className="tables-error">{error}</div>
      )}

      {/* TOOLBAR */}

      <div className="tables-toolbar">
        <div className="table-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-count">
          {filteredTables.length}{" "}
          {filteredTables.length === 1 ? "table" : "tables"}
        </div>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="tables-empty">
          <h3>Loading tables...</h3>

          <p>Please wait while tables are loaded.</p>
        </div>
      )}

      {/* EMPTY */}

      {!loading && filteredTables.length === 0 && (
        <div className="tables-empty">
          <div className="tables-empty-icon">▦</div>

          <h3>{search ? "No tables found" : "No tables yet"}</h3>

          <p>
            {search
              ? "Try a different search."
              : "Create your first restaurant table."}
          </p>

          {!search && (
            <button
              type="button"
              className="table-add-button"
              onClick={openCreateModal}
            >
              + Add Table
            </button>
          )}
        </div>
      )}

      {/* TABLE */}

      {!loading && filteredTables.length > 0 && (
        <div className="tables-card">
          <div className="tables-table-wrapper">
            <table className="tables-table">
              <thead>
                <tr>
                  <th>TABLE</th>

                  <th>QR CODE</th>

                  <th>STATUS</th>

                  <th>CREATED</th>

                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredTables.map((table) => {
                  const active = toBoolean(table.status);

                  const qrImage = getImageUrl(table.qr_image);

                  return (
                    <tr key={table.id}>
                      {/* TABLE */}

                      <td>
                        <div className="table-name-cell">
                          <div className="table-icon">▦</div>

                          <div>
                            <strong>Table {table.table_number}</strong>

                            <small>ID #{table.id}</small>
                          </div>
                        </div>
                      </td>

                      {/* QR */}

                      <td>
                        <div className="table-qr-cell">
                          {qrImage ? (
                            <button
                              type="button"
                              className="table-qr-button"
                              onClick={() => openQrModal(table)}
                            >
                              <img
                                src={qrImage}
                                alt={`QR for table ${table.table_number}`}
                              />

                              <span>View QR</span>
                            </button>
                          ) : (
                            <span className="qr-missing">QR unavailable</span>
                          )}
                        </div>
                      </td>

                      {/* STATUS */}

                      <td>
                        <button
                          type="button"
                          className={`table-status-toggle ${
                            active ? "active" : "inactive"
                          }`}
                          onClick={() => handleToggleStatus(table)}
                        >
                          <span />

                          {active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* CREATED */}

                      <td>
                        {table.created_at
                          ? new Date(table.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "-"}
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-qr"
                            onClick={() => openQrModal(table)}
                            disabled={!qrImage}
                          >
                            QR
                          </button>

                          <button
                            type="button"
                            className="table-action-edit"
                            onClick={() => openEditModal(table)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="table-action-delete"
                            onClick={() => handleDelete(table)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==
                CREATE / EDIT MODAL
            == */}

      {showModal && (
        <div
          className="table-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="table-modal">
            <div className="table-modal-header">
              <div>
                <h2>{editingTable ? "Edit Table" : "Add Table"}</h2>

                <p>
                  {editingTable
                    ? "Update table information."
                    : "Create a new restaurant table."}
                </p>
              </div>

              <button
                type="button"
                className="table-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form className="table-form" onSubmit={handleSubmit}>
              {error && <div className="tables-error">{error}</div>}

              <div className="table-form-group">
                <label htmlFor="table-number">Table Number</label>

                <input
                  id="table-number"
                  name="table_number"
                  type="text"
                  value={form.table_number}
                  onChange={handleChange}
                  placeholder="e.g. A1"
                  maxLength={20}
                  disabled={saving}
                  autoFocus
                />

                <small>Maximum 20 characters.</small>
              </div>

              <label className="table-checkbox">
                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  onChange={handleChange}
                  disabled={saving}
                />

                <span>Table is active</span>
              </label>

              {editingTable?.qr_image && (
                <div className="table-current-qr">
                  <small>Current QR code</small>

                  <img
                    src={getImageUrl(editingTable.qr_image)}
                    alt={`QR for table ${editingTable.table_number}`}
                  />

                  <p>Saving the table number regenerates its QR image.</p>
                </div>
              )}

              <div className="table-form-actions">
                <button
                  type="button"
                  className="table-modal-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="table-modal-save"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingTable
                      ? "Update Table"
                      : "Create Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==
                QR MODAL
            == */}

      {showQrModal && selectedQr && (
        <div
          className="table-qr-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeQrModal();
            }
          }}
        >
          <div className="table-qr-modal">
            <div className="table-qr-modal-header">
              <div>
                <h2>Table {selectedQr.tableNumber}</h2>

                <p>Scan this QR code to open the table.</p>
              </div>

              <button
                type="button"
                className="table-modal-close"
                onClick={closeQrModal}
              >
                ×
              </button>
            </div>

            <div className="table-qr-large">
              <img
                src={selectedQr.imageUrl}
                alt={`QR code for table ${selectedQr.tableNumber}`}
              />
            </div>

            <div className="table-qr-actions">
              <a
                href={selectedQr.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="table-qr-open"
              >
                Open QR
              </a>

              <a
                href={selectedQr.imageUrl}
                download={`table-${selectedQr.tableNumber}.png`}
                className="table-qr-download"
              >
                Download QR
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTables;
