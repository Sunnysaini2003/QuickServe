import { useEffect, useRef, useState } from "react";

import {
  getUsers,
  createUser,
  updateUser,
  updateUserStatus,
} from "../../api/user.api";

import "./Users.css";

const API_URL = import.meta.env.VITE_API_URL;

const initialForm = {
  name: "",
  email: "",
  phone: "",
  role_id: "2",
  password: "",
  profile_image: null,
};

const Users = () => {
  // USERS

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // MODAL

  const [modalOpen, setModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  // FORM

  const [formData, setFormData] = useState(initialForm);

  const [imagePreview, setImagePreview] = useState("");

  const [formError, setFormError] = useState("");

  const [saving, setSaving] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // STATUS

  const [statusUpdating, setStatusUpdating] = useState(null);

  // FILE INPUT

  const fileInputRef = useRef(null);

  // LOAD USERS

  const loadUsers = async () => {
    try {
      setLoading(true);

      setError("");

      const response = await getUsers();

      setUsers(response.data || []);
    } catch (err) {
      console.error("Users error:", err);

      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // OPEN ADD MODAL

  const openAddModal = () => {
    setEditingUser(null);

    setFormData({
      ...initialForm,
    });

    setImagePreview("");

    setFormError("");

    setShowPassword(false);

    setModalOpen(true);
  };

  // OPEN EDIT MODAL

  const openEditModal = (user) => {
    setEditingUser(user);

    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role_id: String(user.role_id || 2),
      password: "",
      profile_image: null,
    });

    setImagePreview(
      user.profile_image ? `${API_URL}${user.profile_image}` : "",
    );

    setFormError("");

    setShowPassword(false);

    setModalOpen(true);
  };

  // CLOSE MODAL

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);

    setEditingUser(null);

    setFormData({
      ...initialForm,
    });

    setImagePreview("");

    setFormError("");

    setShowPassword(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // FORM CHANGE

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormError("");
  };

  // IMAGE CHANGE

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate image type

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file.");

      e.target.value = "";

      return;
    }

    // 2MB frontend limit

    if (file.size > 2 * 1024 * 1024) {
      setFormError("Profile image must be smaller than 2MB.");

      e.target.value = "";

      return;
    }

    setFormData((prev) => ({
      ...prev,
      profile_image: file,
    }));

    setImagePreview(URL.createObjectURL(file));

    setFormError("");
  };

  // VALIDATE FORM

  const validateForm = () => {
    if (!formData.name.trim()) {
      return "Name is required.";
    }

    if (!formData.email.trim()) {
      return "Email is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address.";
    }

    if (formData.phone && !/^[0-9+\-\s()]{7,20}$/.test(formData.phone)) {
      return "Please enter a valid phone number.";
    }

    if (!formData.role_id) {
      return "Please select a role.";
    }

    // Password required when creating

    if (!editingUser && !formData.password) {
      return "Password is required.";
    }

    if (formData.password && formData.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    return "";
  };

  // SUBMIT USER

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);

      return;
    }

    try {
      setSaving(true);

      if (editingUser) {
        await updateUser(editingUser.id, formData);
      } else {
        await createUser(formData);
      }

      await loadUsers();

      closeModal();
    } catch (err) {
      console.error("Save user error:", err);

      setFormError(err.response?.data?.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  // ACTIVATE / DEACTIVATE USER

  const handleStatusChange = async (user) => {
    const newStatus = !Boolean(user.is_active);

    const action = newStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${user.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setStatusUpdating(user.id);

      setError("");

      const response = await updateUserStatus(user.id, newStatus);

      const updatedUser = response.data;

      // Update only affected user

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                ...updatedUser,
              }
            : currentUser,
        ),
      );
    } catch (err) {
      console.error("User status update error:", err);

      setError(err.response?.data?.message || "Failed to update user status.");
    } finally {
      setStatusUpdating(null);
    }
  };

  // LOADING

  if (loading) {
    return (
      <div className="users-page">
        <div className="users-loading">
          <div className="users-spinner"></div>

          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      {/* ========
                HEADER
            ========= */}

      <div className="users-header">
        <div>
          <h1>Users</h1>

          <p>Manage QuickServe staff and managers</p>
        </div>

        <button className="users-add-btn" onClick={openAddModal} type="button">
          <span>+</span>
          Add User
        </button>
      </div>

      {/* ========
                ERROR
            ========= */}

      {error && <div className="users-error">{error}</div>}

      {/* ========
                EMPTY STATE
            ========= */}

      {!error && users.length === 0 && (
        <div className="users-empty">
          <div className="users-empty-icon">👥</div>

          <h3>No users found</h3>

          <p>Add your first staff member to get started.</p>
        </div>
      )}

      {/* ========
                USERS TABLE
            ========= */}

      {users.length > 0 && (
        <div className="users-card">
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>

                  <th>Email</th>

                  <th>Phone</th>

                  <th>Role</th>

                  <th>Status</th>

                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    {/* USER */}

                    <td>
                      <div className="user-info">
                        {user.profile_image ? (
                          <img
                            className="user-avatar"
                            src={`${API_URL}${user.profile_image}`}
                            alt={user.name}
                          />
                        ) : (
                          <div className="user-avatar user-avatar-placeholder">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}

                        <div className="user-details">
                          <strong>{user.name}</strong>

                          <span>ID #{user.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* EMAIL */}

                    <td>
                      <span className="user-email">{user.email}</span>
                    </td>

                    {/* PHONE */}

                    <td>
                      {user.phone || (
                        <span className="user-muted">Not provided</span>
                      )}
                    </td>

                    {/* ROLE */}

                    <td>
                      <span
                        className={`role-badge ${
                          user.role?.toLowerCase() === "admin"
                            ? "role-admin"
                            : user.role?.toLowerCase() === "manager"
                              ? "role-manager"
                              : "role-staff"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={
                          user.is_active
                            ? "status-badge status-active"
                            : "status-badge status-inactive"
                        }
                      >
                        <span className="status-dot"></span>

                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <div className="user-actions">
                        {/* EDIT */}

                        <button
                          className="edit-user-btn"
                          type="button"
                          onClick={() => openEditModal(user)}
                          disabled={statusUpdating === user.id}
                        >
                          Edit
                        </button>

                        {/* STATUS */}

                        {user.is_active ? (
                          <button
                            className="user-status-btn user-deactivate-btn"
                            type="button"
                            onClick={() => handleStatusChange(user)}
                            disabled={statusUpdating === user.id}
                          >
                            {statusUpdating === user.id ? "..." : "Deactivate"}
                          </button>
                        ) : (
                          <button
                            className="user-status-btn user-activate-btn"
                            type="button"
                            onClick={() => handleStatusChange(user)}
                            disabled={statusUpdating === user.id}
                          >
                            {statusUpdating === user.id ? "..." : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========
                ADD / EDIT USER MODAL
            ========= */}

      {modalOpen && (
        <div
          className="user-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
          >
            {/* MODAL HEADER */}

            <div className="user-modal-header">
              <div>
                <h2 id="user-modal-title">
                  {editingUser ? "Edit User" : "Add User"}
                </h2>

                <p>
                  {editingUser
                    ? "Update team account details"
                    : "Create a new QuickServe team account"}
                </p>
              </div>

              <button
                type="button"
                className="user-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {/* FORM ERROR */}

            {formError && <div className="user-form-error">{formError}</div>}

            {/* FORM */}

            <form className="user-form" onSubmit={handleSubmit}>
              {/* PROFILE IMAGE */}

              <div className="user-image-section">
                <div className="user-image-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile preview" />
                  ) : (
                    <span>
                      {formData.name?.charAt(0)?.toUpperCase() || "👤"}
                    </span>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    className="user-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Photo
                  </button>

                  <p className="user-image-help">JPG, PNG or WebP · Max 2MB</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    hidden
                  />
                </div>
              </div>

              {/* NAME */}

              <div className="user-form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  maxLength={100}
                  autoComplete="name"
                />
              </div>

              {/* EMAIL */}

              <div className="user-form-group">
                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="staff@example.com"
                  maxLength={150}
                  autoComplete="email"
                />
              </div>

              {/* PHONE */}

              <div className="user-form-group">
                <label>Phone</label>

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  maxLength={20}
                  autoComplete="tel"
                />
              </div>

              {/* ROLE */}

              <div className="user-form-group">
                <label>Role</label>

                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleChange}
                >
                  <option value="2">Staff</option>

                  <option value="3">Manager</option>
                </select>

                <small className="user-field-help">
                  Admin accounts cannot be created or modified here.
                </small>
              </div>

              {/* PASSWORD */}

              <div className="user-form-group">
                <label>
                  Password
                  {editingUser && (
                    <span className="optional-label">Optional</span>
                  )}
                </label>

                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current password"
                        : "Minimum 8 characters"
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* MODAL ACTIONS */}

              <div className="user-modal-actions">
                <button
                  type="button"
                  className="user-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="user-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingUser
                      ? "Save Changes"
                      : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
