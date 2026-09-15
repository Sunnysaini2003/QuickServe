import { useEffect, useState } from "react";

import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  updateMenuItemStatus,
  deleteMenuItem,
} from "../../api/menu.api";

import { getCategories } from "../../api/category.api";

// HELPER IMPORT 
import { API_URL, getImageUrl, toBoolean, extractArray } from "../../utils/helpers";


import "./Menu.css";

// ADMIN MENU

const AdminMenu = () => {
  // STATE

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    status: true,
    image: null,
  });

  // LOAD MENU

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMenuItems();
      const data = extractArray(response);

      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Menu loading error:", err);

      setMenuItems([]);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to load menu items",
      );
    } finally {
      setLoading(false);
    }
  };

  // LOAD CATEGORIES

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      const data = extractArray(response);

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Categories loading error:", err);

      setCategories([]);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to load categories",
      );
    }
  };

  // INITIAL LOAD

  useEffect(() => {
    loadMenu();
    loadCategories();
  }, []);

  // RESET FORM

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      category_id: "",
      status: true,
      image: null,
    });
  };

  // CREATE MODAL

  const openCreateModal = () => {
    setEditingItem(null);
    resetForm();
    setError("");
    setShowModal(true);
  };

  // EDIT MODAL

  const openEditModal = (item) => {
    setEditingItem(item);

    setForm({
      name: item?.name || "",
      description: item?.description || "",
      price: item?.price ?? "",
      category_id: item?.category_id ?? "",
      status: toBoolean(item?.is_available),
      image: null,
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
    setEditingItem(null);
    resetForm();
    setError("");
  };

  // INPUT CHANGE

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    // CHECKBOX
    if (type === "checkbox") {
      setForm((previous) => ({
        ...previous,
        [name]: checked,
      }));

      return;
    }

    // FILE
    if (type === "file") {
      const file = files?.[0];

      if (!file) {
        return;
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        setError("Only JPG, PNG and WebP images are allowed.");
        e.target.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setError("Image size must be less than 2MB.");
        e.target.value = "";
        return;
      }

      setError("");

      setForm((previous) => ({
        ...previous,
        image: file,
      }));

      return;
    }

    // NORMAL INPUT
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // SAVE MENU

  const handleSubmit = async (e) => {
    e.preventDefault();

    // NAME
    if (!form.name.trim()) {
      setError("Menu item name is required.");
      return;
    }

    // CATEGORY
    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }

    // PRICE
    if (form.price === "" || form.price === null || form.price === undefined) {
      setError("Price is required.");
      return;
    }

    if (Number(form.price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("price", String(form.price));
      formData.append("category_id", String(form.category_id));
      formData.append("is_available", form.status ? "1" : "0");

      // IMAGE
      if (form.image) {
        formData.append("image", form.image);
      }

      // CREATE
      if (!editingItem) {
        await createMenuItem(formData);
      }

      // UPDATE
      else {
        await updateMenuItem(editingItem.id, formData);
      }

      // SUCCESS
      setShowModal(false);
      setEditingItem(null);
      resetForm();

      await loadMenu();
    } catch (err) {
      console.error("Save menu item error:", err);

      const errors = err?.response?.data?.errors;

      if (Array.isArray(errors) && errors.length > 0) {
        setError(
          errors
            .map((item) => item?.msg || item?.message || "Validation error")
            .join(", "),
        );
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to save menu item",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // DELETE

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteMenuItem(item.id);

      await loadMenu();
    } catch (err) {
      console.error("Delete menu item error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to delete menu item",
      );
    }
  };

  // STATUS TOGGLE

  const handleToggleStatus = async (item) => {
    try {
      setError("");

      const currentStatus = toBoolean(item.is_available);
      const newStatus = !currentStatus;

      await updateMenuItemStatus(item.id, newStatus);

      await loadMenu();
    } catch (err) {
      console.error("Status update error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to update menu item status",
      );
    }
  };

  // SAFE ARRAY

  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];

  // FILTER

  const filteredItems = safeMenuItems.filter((item) => {
    const searchText = search.toLowerCase().trim();

    return (
      String(item?.name || "")
        .toLowerCase()
        .includes(searchText) ||
      String(item?.category_name || item?.category?.name || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  // RENDER

  return (
    <div className="menu-page">
      {/* HEADER */}

      <div className="menu-header">
        <div>
          <h1>Menu</h1>
          <p>Manage your restaurant menu items.</p>
        </div>

        <button
          type="button"
          className="menu-add-button"
          onClick={openCreateModal}
        >
          + Add Menu Item
        </button>
      </div>

      {/* ERROR */}

      {error && !showModal && <div className="menu-error">{error}</div>}

      {/* TOOLBAR */}

      <div className="menu-toolbar">
        <div className="menu-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="menu-count">{filteredItems.length} items</div>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="menu-empty">
          <h3>Loading menu...</h3>
          <p>Please wait while menu items are loaded.</p>
        </div>
      )}

      {/* EMPTY */}

      {!loading && filteredItems.length === 0 && (
        <div className="menu-empty">
          <div className="menu-empty-icon">🍽</div>

          <h3>{search ? "No menu items found" : "No menu items yet"}</h3>

          <p>
            {search
              ? "Try a different search."
              : "Create your first menu item."}
          </p>

          {!search && (
            <button
              type="button"
              className="menu-add-button"
              onClick={openCreateModal}
            >
              + Add Menu Item
            </button>
          )}
        </div>
      )}

      {/* TABLE */}

      {!loading && filteredItems.length > 0 && (
        <div className="menu-card">
          <div className="menu-table-wrapper">
            <table className="menu-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const available = toBoolean(item?.is_available);

                  const imageUrl = getImageUrl(item?.image);

                  return (
                    <tr key={item.id}>
                      {/* ITEM */}

                      <td>
                        <div className="menu-item-cell">
                          <div className="menu-item-image">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";

                                  const fallback =
                                    e.currentTarget.nextElementSibling;

                                  if (fallback) {
                                    fallback.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}

                            <span
                              style={{
                                display: imageUrl ? "none" : "flex",
                                width: "100%",
                                height: "100%",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              🍽
                            </span>
                          </div>

                          <div>
                            <strong>{item.name}</strong>

                            <small>ID #{item.id}</small>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}

                      <td>
                        {item.category_name || item.category?.name || "-"}
                      </td>

                      {/* PRICE */}

                      <td>₹{Number(item.price || 0).toFixed(2)}</td>

                      {/* STATUS */}

                      <td>
                        <button
                          type="button"
                          className={`menu-status-toggle ${
                            available ? "active" : "inactive"
                          }`}
                          onClick={() => handleToggleStatus(item)}
                        >
                          <span />
                          {available ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div className="menu-actions">
                          <button
                            type="button"
                            className="menu-action-edit"
                            onClick={() => openEditModal(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="menu-action-delete"
                            onClick={() => handleDelete(item)}
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

      {/* MODAL */}

      {showModal && (
        <div
          className="menu-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="menu-modal">
            {/* HEADER */}

            <div className="menu-modal-header">
              <div>
                <h2>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h2>

                <p>
                  {editingItem
                    ? "Update menu item information."
                    : "Create a new menu item."}
                </p>
              </div>

              <button
                type="button"
                className="menu-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <form className="menu-form" onSubmit={handleSubmit}>
              {/* ERROR */}

              {error && <div className="menu-error">{error}</div>}

              {/* NAME */}

              <div className="menu-form-group">
                <label htmlFor="menu-name">Menu Item Name</label>

                <input
                  id="menu-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Classic Burger"
                  maxLength={120}
                  disabled={saving}
                  autoFocus
                />
              </div>

              {/* DESCRIPTION */}

              <div className="menu-form-group">
                <label htmlFor="menu-description">Description</label>

                <textarea
                  id="menu-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the menu item..."
                  rows={3}
                  disabled={saving}
                />
              </div>

              {/* CATEGORY */}

              <div className="menu-form-group">
                <label htmlFor="menu-category">Category</label>

                <select
                  id="menu-category"
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="">Select category</option>

                  {Array.isArray(categories) &&
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* PRICE */}

              <div className="menu-form-group">
                <label htmlFor="menu-price">Price</label>

                <input
                  id="menu-price"
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={saving}
                />
              </div>

              {/* IMAGE */}

              <div className="menu-form-group">
                <label htmlFor="menu-image">Menu Item Image</label>

                <input
                  id="menu-image"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleChange}
                  disabled={saving}
                />

                <small>JPG, PNG or WebP. Maximum 2MB.</small>

                {form.image && <small>Selected: {form.image.name}</small>}
              </div>

              {/* EXISTING IMAGE */}

              {editingItem?.image && !form.image && (
                <div className="menu-form-group">
                  <small>Current image</small>

                  <div
                    className="menu-item-image"
                    style={{
                      marginTop: "8px",
                    }}
                  >
                    <img
                      src={getImageUrl(editingItem.image)}
                      alt={editingItem.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* STATUS */}

              <label className="menu-checkbox">
                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  onChange={handleChange}
                  disabled={saving}
                />

                <span>Menu item is active</span>
              </label>

              {/* BUTTONS */}

              <div className="menu-form-actions">
                <button
                  type="button"
                  className="menu-modal-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="menu-modal-save"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                      ? "Update Menu Item"
                      : "Create Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
