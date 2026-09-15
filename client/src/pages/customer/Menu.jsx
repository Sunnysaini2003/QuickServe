import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Link } from "react-router-dom";

import { getMenuItems } from "../../api/menu.api";
import { getCategories } from "../../api/category.api";
import { createOrder } from "../../api/order.api";
import api from "../../api/axios";
import { createSocket } from "../../api/socket";

import "./CustomerMenu.css";

import {
  getImageUrl,
  toBoolean,
  extractArray,
  extractOrder,
} from "../../utils/helpers";

import { FiShoppingBag, FiLogOut } from "react-icons/fi";
import { FaHistory } from "react-icons/fa";

import logoIcon from "../../assets/qs_icon.png";

// CONFIG

const LOGO_URL = logoIcon;

// CUSTOMER MENU

const Menu = () => {
  const navigate = useNavigate();
  const customerSocketRef = useRef(null);

  // =======================================================
  // MENU
  // =======================================================

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // =======================================================
  // PAGE
  // =======================================================

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =======================================================
  // CART
  // =======================================================

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // =======================================================
  // ORDER
  // =======================================================

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderNotes, setOrderNotes] = useState("");

  const customer = useMemo(() => {
    try {
      const stored = localStorage.getItem("customerUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // =======================================================
  // CUSTOMER SESSION
  // =======================================================

  useEffect(() => {
    // Authentication is now enforced by the HttpOnly customer session cookie.
  }, []);

  // CUSTOMER REAL-TIME ORDER STATUS

  useEffect(() => {
    const socket = createSocket({ role: "customer" });

    if (!socket) {
      return undefined;
    }

    customerSocketRef.current = socket;

    socket.on("order_status_updated", (updatedOrder) => {
      if (!updatedOrder?.id) {
        return;
      }

      setOrderSuccess((previousOrder) => {
        if (
          !previousOrder ||
          String(previousOrder.id) !== String(updatedOrder.id)
        ) {
          return previousOrder;
        }

        return {
          ...previousOrder,
          ...updatedOrder,
        };
      });
    });

    return () => {
      socket.removeAllListeners("order_status_updated");
      socket.disconnect();

      if (customerSocketRef.current === socket) {
        customerSocketRef.current = null;
      }
    };
  }, []);

  // LOCK BODY SCROLL WHEN CART OPEN

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  // ESCAPE CLOSE

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isCartOpen && !placingOrder) {
        setIsCartOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCartOpen, placingOrder]);

  // Seach Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // LOAD MENU

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMenuItems();
      const data = extractArray(response);

      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setMenuItems([]);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Failed to load menu",
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
    } catch {
      setCategories([]);
    }
  };

  // INITIAL LOAD

  useEffect(() => {
    loadMenu();
    loadCategories();
  }, []);

  // AVAILABLE ITEMS

  const availableItems = useMemo(() => {
    return menuItems.filter((item) => toBoolean(item?.is_available));
  }, [menuItems]);

  // FILTER ITEMS

  const filteredItems = useMemo(() => {
    //  console.log("Filtering with:", debouncedSearch);

    const searchText = debouncedSearch.toLowerCase().trim();

    return availableItems.filter((item) => {
      const categoryId = String(item?.category_id ?? "");

      const categoryMatch =
        selectedCategory === "all" || categoryId === String(selectedCategory);

      const name = String(item?.name || "").toLowerCase();
      const description = String(item?.description || "").toLowerCase();

      const searchMatch =
        !searchText ||
        name.includes(searchText) ||
        description.includes(searchText);

      return categoryMatch && searchMatch;
    });
  }, [availableItems, selectedCategory, debouncedSearch]);

  // ADD TO CART

  const addToCart = (item) => {
    setError("");

    setCart((previous) => {
      const existing = previous.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        return previous.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem,
        );
      }

      return [
        ...previous,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  };

  // INCREASE

  const increaseQuantity = (id) => {
    setCart((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item,
      ),
    );
  };

  // DECREASE

  const decreaseQuantity = (id) => {
    setCart((previous) =>
      previous
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  // CART COUNT

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // CART TOTAL

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.price || 0) * item.quantity,
    0,
  );

  // OPEN CART

  const openCart = () => {
    if (!cart.length) {
      return;
    }

    setError("");
    setIsCartOpen(true);
  };

  // CLOSE CART

  const closeCart = () => {
    if (placingOrder) {
      return;
    }

    setIsCartOpen(false);
  };

  // PLACE ORDER

  const handlePlaceOrder = async () => {
    if (placingOrder) {
      return;
    }

    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    try {
      setPlacingOrder(true);
      setError("");
      setOrderSuccess(null);

      const items = cart.map((item) => ({
        menu_id: item.id,
        quantity: item.quantity,
      }));

      const response = await createOrder({
        items,
        notes: orderNotes.trim() || null,
      });

      const order = extractOrder(response);

      setOrderSuccess(
        order || {
          status: "Pending",
        },
      );

      setCart([]);
      setOrderNotes("");
      setIsCartOpen(false);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/", {
          replace: true,
        });

        return;
      }

      if (err?.response?.status === 404) {
        setError(
          err?.response?.data?.message ||
            "Your ordering session has expired. Please scan the table QR code again.",
        );

        setIsCartOpen(false);
        return;
      }

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Unable to place order. Please try again.",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // CUSTOMER LOGOUT

  const handleLogout = async () => {
    customerSocketRef.current?.disconnect();
    customerSocketRef.current = null;

    try {
      await api.post("/customers/logout");
    } catch (error) {
      console.warn("Customer cookie logout failed:", error);
    }

    localStorage.removeItem("customerAuthToken");
    localStorage.removeItem("customerUser");
    localStorage.removeItem("customerToken");
    localStorage.removeItem("tableToken");
    localStorage.removeItem("customerTableId");

    setCart([]);
    setOrderSuccess(null);

    navigate("/", {
      replace: true,
    });
  };

  // IMAGE ERROR

  const handleImageError = (event) => {
    event.currentTarget.style.display = "none";

    const fallback = event.currentTarget.nextElementSibling;

    if (fallback) {
      fallback.style.display = "flex";
    }
  };

  // LOGO ERROR

  const handleLogoError = (event) => {
    event.currentTarget.style.display = "none";

    const fallback = event.currentTarget.nextElementSibling;

    if (fallback) {
      fallback.style.display = "flex";
    }
  };

  // ORDER SUCCESS

  if (orderSuccess) {
    const orderNumber = orderSuccess?.order_number || orderSuccess?.orderNumber;

    const status = orderSuccess?.status || "Pending";

    return (
      <div className="customer-menu-page">
        <header className="customer-menu-header">
          <Link to="/customer/menu" className="customer-menu-brand">
            <div className="customer-logo">
              <img src={LOGO_URL} alt="QuickServe" onError={handleLogoError} />
              {/* <span>QS</span> */}
            </div>

            <div>
              <h1>QuickServe</h1>
              <p>Order fresh. Enjoy more.</p>
            </div>
          </Link>

          <div className="customer-header-actions">
            <button
              type="button"
              className="customer-nav-button"
              onClick={() => navigate("/customer/orders")}
            >
              <FiShoppingBag aria-hidden="true" />
              <span>My Orders</span>
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

        <main className="customer-success-page">
          <div className="customer-success-card">
            <div className="success-icon">✓</div>

            <span className="success-eyebrow">ORDER CONFIRMED</span>

            <h2>Thank you!</h2>

            <p>Your order has been sent to the kitchen.</p>

            {orderNumber && (
              <div className="success-order-box">
                <span>Order Number</span>
                <strong>#{orderNumber}</strong>
              </div>
            )}

            <div className="success-status-box">
              <span>Status</span>
              <strong>{status}</strong>
            </div>

            <div className="customer-success-actions">
              <button
                type="button"
                className="success-order-more"
                onClick={() => setOrderSuccess(null)}
              >
                Order More
              </button>

              <button
                type="button"
                className="success-order-history"
                onClick={() => navigate("/customer/orders")}
              >
                <span className="success-history-icon">
                  <FaHistory aria-hidden="true" />
                </span>

                <span>View My Orders</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // RENDER

  return (
    <div className="customer-menu-page">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="customer-menu-header">
        <Link to="/customer/menu" className="customer-menu-brand">
          <div className="customer-logo">
            <img src={LOGO_URL} alt="QuickServe" onError={handleLogoError} />
            {/* <span>QS</span> */}
          </div>

          <div>
            <h1>QuickServe</h1>
            <p>Order fresh. Enjoy more.</p>
          </div>
        </Link>

        <div className="customer-header-actions">
          <button
            type="button"
            className="customer-nav-button"
            onClick={() => navigate("/customer/orders")}
            aria-label="View my orders"
          >
            <FiShoppingBag aria-hidden="true" />
            <span>My Orders</span>
          </button>

          <button
            type="button"
            className={
              cart.length
                ? "customer-cart-button has-items"
                : "customer-cart-button"
            }
            onClick={openCart}
            disabled={!cart.length}
            aria-label="Open your order"
          >
            <span className="customer-cart-icon">🛒</span>

            <span className="customer-cart-button-label">Cart</span>

            {cartCount > 0 && <strong>{cartCount}</strong>}
          </button>

          <button
            type="button"
            className="customer-nav-button logout-button"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <FiLogOut aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="customer-menu-hero">
        <div className="customer-menu-hero-content">
          {/* <span>FRESH FROM OUR KITCHEN</span> */}
          <span style={{ fontSize: "12px" }}>
            {customer?.name ? `Hi, ${customer.name}` : ""}
          </span>

          <h2>What are you craving?</h2>

          <p>Pick your favourites and we'll prepare them fresh.</p>
        </div>
      </section>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <section className="customer-menu-search-section">
        <div className="customer-menu-search">
          <span className="customer-search-icon">⌕</span>

          <input
            type="search"
            placeholder="Search dishes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="customer-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* ===================================================
          CATEGORIES
      =================================================== */}

      <section
        className="customer-categories-wrapper"
        aria-label="Food categories"
      >
        <div className="customer-categories">
          <button
            type="button"
            className={selectedCategory === "all" ? "active" : ""}
            onClick={() => setSelectedCategory("all")}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={
                String(selectedCategory) === String(category.id) ? "active" : ""
              }
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="customer-menu-error" role="alert">
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

      {/* ===================================================
          LOADING
      =================================================== */}

      {loading && (
        <div className="customer-menu-loading">
          <div className="customer-loading-spinner" />
          <p>Preparing menu...</p>
        </div>
      )}

      {/* ===================================================
          MENU
      =================================================== */}

      {!loading && (
        <main className="customer-menu-content">
          <div className="customer-menu-title">
            <div>
              <span className="customer-section-label">OUR SELECTION</span>

              <h2>Our Menu</h2>

              <p>
                {filteredItems.length}{" "}
                {filteredItems.length === 1 ? "dish" : "dishes"} available
              </p>
            </div>
          </div>

          {/* =================================================
              EMPTY
          ================================================= */}

          {filteredItems.length === 0 ? (
            <div className="customer-menu-empty">
              <div className="customer-empty-icon">🍽️</div>

              <h3>{search ? "Nothing found" : "No dishes available"}</h3>

              <p>
                {search
                  ? "Try another dish or category."
                  : "Please check another category."}
              </p>

              {search && (
                <button type="button" onClick={() => setSearch("")}>
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="customer-menu-grid">
              {filteredItems.map((item) => {
                const imageUrl = getImageUrl(item?.image);

                const cartItem = cart.find(
                  (cartItem) => cartItem.id === item.id,
                );

                return (
                  <article
                    key={item.id}
                    className={
                      cartItem
                        ? "customer-menu-item selected"
                        : "customer-menu-item"
                    }
                  >
                    {/* IMAGE */}
                    <div className="customer-menu-item-image">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          loading="lazy"
                          onError={handleImageError}
                        />
                      ) : null}

                      <span
                        className="customer-food-fallback"
                        style={{
                          display: imageUrl ? "none" : "flex",
                        }}
                      >
                        🍽️
                      </span>

                      {/* VEG */}
                      <div
                        className={
                          toBoolean(item.is_veg)
                            ? "food-type veg"
                            : "food-type non-veg"
                        }
                      >
                        <span />
                      </div>

                      {/* SELECTED BADGE */}
                      {cartItem && (
                        <div className="customer-item-added">✓ Added</div>
                      )}
                    </div>

                    {/* DETAILS */}
                    <div className="customer-menu-item-details">
                      <div className="customer-menu-item-heading">
                        <h3>{item.name}</h3>
                      </div>

                      {item.description && <p>{item.description}</p>}

                      <div className="customer-menu-item-bottom">
                        <div className="customer-item-price">
                          <span>₹</span>

                          <strong>{Number(item.price || 0).toFixed(2)}</strong>
                        </div>

                        {cartItem ? (
                          <div className="customer-cart-quantity">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(item.id)}
                              aria-label={`Decrease ${item.name}`}
                            >
                              −
                            </button>

                            <strong>{cartItem.quantity}</strong>

                            <button
                              type="button"
                              onClick={() => increaseQuantity(item.id)}
                              aria-label={`Increase ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="customer-add-button"
                            onClick={() => addToCart(item)}
                          >
                            <span>+</span>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ===================================================
          MOBILE CART BAR
      =================================================== */}

      {cart.length > 0 && (
        <div className="customer-mobile-cart-bar">
          <button type="button" onClick={openCart}>
            <div className="mobile-cart-left">
              <span className="mobile-cart-count">{cartCount}</span>

              <div>
                <strong>Your Order</strong>
                <span>View selected items</span>
              </div>
            </div>

            <div className="mobile-cart-total">
              <strong>₹{cartTotal.toFixed(2)}</strong>

              <span>View →</span>
            </div>
          </button>
        </div>
      )}

      {/* ===================================================
          RIGHT CART DRAWER
      =================================================== */}

      {isCartOpen && cart.length > 0 && (
        <div
          className="customer-cart-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCart();
            }
          }}
        >
          <aside
            className="customer-cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* =================================================
                  DRAWER HEADER
              ================================================= */}

            <header className="customer-cart-drawer-header">
              <div>
                <span className="customer-cart-eyebrow">YOUR SELECTION</span>

                <h2>Your Order</h2>

                <p>
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </p>
              </div>

              <button
                type="button"
                className="customer-cart-close"
                onClick={closeCart}
                disabled={placingOrder}
                aria-label="Close cart"
              >
                ×
              </button>
            </header>

            {/* =================================================
                  CART ITEMS
              ================================================= */}

            <div className="customer-cart-drawer-items">
              {cart.map((item) => {
                const imageUrl = getImageUrl(item?.image);

                return (
                  <div key={item.id} className="customer-cart-drawer-item">
                    {/* IMAGE */}
                    <div className="customer-cart-item-image">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          onError={handleImageError}
                        />
                      ) : (
                        <span>🍽️</span>
                      )}
                    </div>

                    {/* INFO */}
                    <div className="customer-cart-item-info">
                      <strong>{item.name}</strong>

                      <span>₹{Number(item.price || 0).toFixed(2)} each</span>

                      <div className="customer-cart-quantity">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          aria-label={`Decrease ${item.name}`}
                        >
                          −
                        </button>

                        <strong>{item.quantity}</strong>

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          aria-label={`Increase ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* PRICE */}
                    <strong className="customer-cart-item-price">
                      ₹{(Number(item.price || 0) * item.quantity).toFixed(2)}
                    </strong>
                  </div>
                );
              })}
            </div>

            {/* =================================================
                  FOOTER
              ================================================= */}

            <footer className="customer-cart-drawer-footer">
              <div className="customer-cart-summary">
                <div>
                  <span>Subtotal</span>

                  <strong>₹{cartTotal.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Taxes / charges</span>

                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="customer-cart-notes">
                <div className="customer-cart-notes-label-row">
                  <label htmlFor="customer-order-notes">Order notes</label>
                  <span>Optional</span>
                </div>

                <textarea
                  id="customer-order-notes"
                  className="customer-cart-notes-input"
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Any special request? e.g. Less spicy, no onion..."
                  maxLength={300}
                  rows={3}
                  disabled={placingOrder}
                />

                <div className="customer-cart-notes-footer">
                  <span>Tell us how you'd like your order.</span>
                  <span>{orderNotes.length}/300</span>
                </div>
              </div>

              <div className="customer-cart-total">
                <span>Total</span>

                <strong>₹{cartTotal.toFixed(2)}</strong>
              </div>

              <button
                type="button"
                className="customer-place-order"
                onClick={handlePlaceOrder}
                disabled={placingOrder}
              >
                <span>{placingOrder ? "Placing Order..." : "Place Order"}</span>

                <strong>₹{cartTotal.toFixed(2)}</strong>
              </button>

              <p className="customer-cart-secure-note">
                🔒 Your order is sent securely to the kitchen.
              </p>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Menu;
