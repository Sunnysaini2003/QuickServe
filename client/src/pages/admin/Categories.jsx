import { useEffect, useState } from "react";

import {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from "../../api/category.api";

import "./Categories.css";

// HELPER IMPORT 
import { API_URL, getImageUrl } from "../../utils/helpers";


const Categories = () => {
  
  // STATE
  

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [form, setForm] = useState({
    name: "",
    status: true,
    image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);

  
  // LOAD CATEGORIES
  

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCategories();
      const data = response?.data || [];

      setCategories(data);
    } catch (err) {
      console.error("Categories error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load categories",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  
  // OPEN CREATE MODAL
  

  const openCreateModal = () => {
    setEditingCategory(null);

    setForm({
      name: "",
      status: true,
      image: null,
    });

    setImagePreview(null);
    setError("");
    setShowModal(true);
  };

  
  // OPEN EDIT MODAL
  

  const openEditModal = (category) => {
    setEditingCategory(category);

    setForm({
      name: category.name || "",
      status: Boolean(category.status),
      image: null,
    });

    setImagePreview(category.image ? getImageUrl(category.image) : null);

    setError("");
    setShowModal(true);
  };

  
  // CLOSE MODAL
  

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingCategory(null);

    setForm({
      name: "",
      status: true,
      image: null,
    });

    setImagePreview(null);
    setError("");
  };

  
  // FORM CHANGE
  

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  
  // IMAGE CHANGE
  

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    
    // VALIDATE FILE TYPE
    

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WebP images are allowed.");

      e.target.value = "";
      return;
    }

    
    // VALIDATE FILE SIZE
    

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB.");

      e.target.value = "";
      return;
    }

    
    // SET IMAGE
    

    setError("");

    setForm((previous) => ({
      ...previous,
      image: file,
    }));

    
    // CREATE PREVIEW
    

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  
  // REMOVE SELECTED IMAGE
  

  const handleRemoveImage = () => {
    setForm((previous) => ({
      ...previous,
      image: null,
    }));

    if (editingCategory?.image) {
      setImagePreview(getImageUrl(editingCategory.image));
    } else {
      setImagePreview(null);
    }

    const fileInput = document.getElementById("category-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  
  // SAVE CATEGORY
  
const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
        setError("Category name is required.");
        return;
    }

    try {
        setSaving(true);
        setError("");

        const formData = new FormData();

        formData.append("name", form.name.trim());
        formData.append("status", form.status ? "1" : "0");

        if (form.image) {
            formData.append("image", form.image);
        }

        console.log("Sending category:");
        console.log("Name:", form.name);
        console.log("Status:", form.status);
        console.log("Image:", form.image);

        if (editingCategory) {
            await updateCategory(
                editingCategory.id,
                formData
            );
        } else {
            await createCategory(formData);
        }

        closeModal();
        await loadCategories();

    } catch (err) {
        console.error("Save category error:", err);

        setError(
            err?.response?.data?.message ||
            err?.response?.data?.errors?.[0]?.msg ||
            err?.message ||
            "Failed to save category"
        );
    } finally {
        setSaving(false);
    }
};

  
  // DELETE CATEGORY
  

  const handleDelete = async (category) => {
    if (Number(category.item_count) > 0) {
      alert(
        `Cannot delete "${category.name}" because it contains ${category.item_count} menu item(s).`,
      );

      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteCategory(category.id);

      await loadCategories();
    } catch (err) {
      console.error("Delete category error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete category",
      );
    }
  };

  
  // TOGGLE STATUS
  

  const handleToggleStatus = async (category) => {
    try {
      setError("");

      await updateCategoryStatus(category.id, !Boolean(category.status));

      await loadCategories();
    } catch (err) {
      console.error("Status update error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update category status",
      );
    }
  };

  
  // FILTER
  

  const filteredCategories = categories.filter((category) =>
    String(category.name || "")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  
  // RENDER
  

  return (
    <div className="categories-page">
      {/* 
          HEADER
       */}

      <div className="categories-header">
        <div>
          <h1>Categories</h1>

          <p>Manage menu categories for your restaurant.</p>
        </div>

        <button
          type="button"
          className="category-add-button"
          onClick={openCreateModal}
        >
          + Add Category
        </button>
      </div>

      {/* 
          ERROR
       */}

      {error && !showModal && <div className="categories-error">{error}</div>}

      {/* 
          TOOLBAR
       */}

      <div className="categories-toolbar">
        <div className="category-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-count">
          {filteredCategories.length} categories
        </div>
      </div>

      {/* 
          LOADING
       */}

      {loading && (
        <div className="categories-empty">
          <h3>Loading categories...</h3>

          <p>Please wait while categories are loaded.</p>
        </div>
      )}

      {/* 
          EMPTY
       */}

      {!loading && filteredCategories.length === 0 && (
        <div className="categories-empty">
          <div className="categories-empty-icon">▦</div>

          <h3>{search ? "No categories found" : "No categories yet"}</h3>

          <p>
            {search
              ? "Try a different search."
              : "Create your first menu category."}
          </p>

          {!search && (
            <button
              type="button"
              className="category-add-button"
              onClick={openCreateModal}
            >
              + Add Category
            </button>
          )}
        </div>
      )}

      {/* 
          TABLE
       */}

      {!loading && filteredCategories.length > 0 && (
        <div className="categories-card">
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Menu Items</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    {/* CATEGORY */}

                    <td>
                      <div className="category-name-cell">
                        <div className="category-image">
                          {category.image ? (
                            <img
                              src={getImageUrl(category.image)}
                              alt={category.name}
                            />
                          ) : (
                            <span>▦</span>
                          )}
                        </div>

                        <div>
                          <strong>{category.name}</strong>

                          {/* <small>ID #{category.id}</small> */}
                        </div>
                      </div>
                    </td>

                    {/* ITEMS */}

                    <td>
                      <span className="item-count">
                        {category.item_count ?? 0}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td>
                      <button
                        type="button"
                        className={`status-toggle ${
                          Boolean(category.status) ? "active" : "inactive"
                        }`}
                        onClick={() => handleToggleStatus(category)}
                      >
                        <span />

                        {Boolean(category.status) ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* CREATED */}

                    <td>
                      {category.created_at
                        ? new Date(category.created_at).toLocaleDateString(
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
                      <div className="category-actions">
                        <button
                          type="button"
                          className="action-edit"
                          onClick={() => openEditModal(category)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="action-delete"
                          onClick={() => handleDelete(category)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 
          MODAL
       */}

      {showModal && (
        <div
          className="category-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="category-modal">
            {/* MODAL HEADER */}

            <div className="category-modal-header">
              <div>
                <h2>{editingCategory ? "Edit Category" : "Add Category"}</h2>

                <p>
                  {editingCategory
                    ? "Update category information."
                    : "Create a new menu category."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="modal-close"
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit} className="category-form">
              {/* ERROR */}

              {error && <div className="categories-error">{error}</div>}

              {/* CATEGORY NAME */}

              <div className="form-group">
                <label htmlFor="category-name">Category Name</label>

                <input
                  id="category-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Burgers"
                  maxLength={100}
                  disabled={saving}
                  autoFocus
                />
              </div>

              {/* CATEGORY IMAGE */}

              <div className="form-group">
                <label htmlFor="category-image">Category Image</label>

                <input
                  id="category-image"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={saving}
                />

                <small>JPG, PNG or WebP. Maximum 2MB.</small>
              </div>

              {/* IMAGE PREVIEW */}

              {imagePreview && (
                <div className="category-image-preview">
                  <img src={imagePreview} alt="Category preview" />

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={saving}
                  >
                    Remove Image
                  </button>
                </div>
              )}

              {/* STATUS */}

              <label className="category-checkbox">
                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  onChange={handleChange}
                  disabled={saving}
                />

                <span>Category is active</span>
              </label>

              {/* FORM ACTIONS */}

              <div className="category-form-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button type="submit" className="modal-save" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingCategory
                      ? "Update Category"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
