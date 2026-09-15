import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
} from "lucide-react";

import { getMenuItems } from "../../api/menu.api";
import { getCategories } from "../../api/category.api";
import { getTables } from "../../api/table.api";
import {
  createManagerAssistedOrder,
  getManagerCustomers,
} from "../../api/manager.api";
import { extractArray, getImageUrl, toBoolean } from "../../utils/helpers";
import qsIcon from "../../assets/qs_icon.png";

import "./ManagerAssistedOrder.css";

const INITIAL_CUSTOMER = {
  mode: "walkin",
  id: "",
  name: "",
  mobile: "",
};

const ManagerAssistedOrder = () => {
  const navigate = useNavigate();
  const [orderMode, setOrderMode] = useState("DineIn");
  const [tableId, setTableId] = useState("");
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER);

  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerLookupOpen, setCustomerLookupOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [menuResponse, categoryResponse, tableResponse] = await Promise.all([
          getMenuItems(),
          getCategories(),
          getTables(),
        ]);

        setMenuItems(extractArray(menuResponse));
        setCategories(extractArray(categoryResponse));
        setTables(extractArray(tableResponse).filter((table) => toBoolean(table?.status)));
      } catch (requestError) {
        console.error("Failed to load assisted order data:", requestError);
        setError(
          requestError?.response?.data?.message ||
            "Unable to load ordering data. Please refresh and try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (customer.mode !== "existing" || !customerLookupOpen) return undefined;

    const timer = setTimeout(async () => {
      try {
        setCustomersLoading(true);
        const response = await getManagerCustomers({
          search: customerSearch.trim(),
          limit: 20,
        });
        setCustomers(extractArray(response));
      } catch (requestError) {
        console.error("Customer lookup failed:", requestError);
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customer.mode, customerLookupOpen, customerSearch]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      const available = toBoolean(item?.is_available);
      const categoryMatch =
        category === "all" || String(item?.category_id) === String(category);
      const textMatch =
        !query ||
        String(item?.name || "").toLowerCase().includes(query) ||
        String(item?.description || "").toLowerCase().includes(query);

      return available && categoryMatch && textMatch;
    });
  }, [menuItems, category, search]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0),
    [cart],
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const selectedTable = tables.find((table) => String(table.id) === String(tableId));

  const addItem = (item) => {
    setError("");
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const changeQuantity = (id, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => setCart([]);

  const selectExistingCustomer = (selected) => {
    setCustomer({
      mode: "existing",
      id: selected.id,
      name: selected.name || "",
      mobile: selected.mobile || "",
    });
    setCustomerSearch(selected.name || selected.mobile || "");
    setCustomerLookupOpen(false);
  };

  const handleModeChange = (mode) => {
    setOrderMode(mode);
    if (mode === "Takeaway") setTableId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (orderMode === "DineIn" && !tableId) {
      setError("Select a table for a dine-in order.");
      return;
    }

    if (customer.mode === "existing" && !customer.id) {
      setError("Select an existing customer or switch to walk-in customer.");
      return;
    }

    if (customer.mode === "walkin" && !customer.name.trim()) {
      setError("Enter the walk-in customer's name.");
      return;
    }

    if (!cart.length) {
      setError("Add at least one menu item before placing the order.");
      return;
    }

    try {
      setPlacing(true);
      const response = await createManagerAssistedOrder({
        orderMode,
        tableId: orderMode === "DineIn" ? Number(tableId) : null,
        customerMode: customer.mode,
        customerId: customer.mode === "existing" ? Number(customer.id) : undefined,
        customerName: customer.mode === "walkin" ? customer.name.trim() : undefined,
        customerMobile: customer.mode === "walkin" ? customer.mobile.trim() : undefined,
        items: cart.map((item) => ({
          menu_id: item.id,
          quantity: item.quantity,
        })),
        notes: notes.trim() || null,
      });

      const data = response?.data || response;
      setSuccessOrder(data || null);
      setCart([]);
      setNotes("");
    } catch (requestError) {
      console.error("Failed to place assisted order:", requestError);
      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.errors?.[0]?.msg ||
          "Failed to place assisted order.",
      );
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="manager-assisted-page">
        <div className="manager-assisted-state">Loading assisted ordering...</div>
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="manager-assisted-page">
        <div className="manager-assisted-success">
          <div className="manager-assisted-success-icon"><Check size={28} /></div>
          <span className="manager-assisted-kicker">Order created</span>
          <h1>Order sent to the kitchen</h1>
          <p>
            {successOrder.order_number} · {successOrder.order_mode === "DineIn" ? `Table ${successOrder.table_number}` : "Takeaway"}
          </p>
          <strong>₹{Number(successOrder.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          <div className="manager-assisted-success-actions">
            <button type="button" onClick={() => setSuccessOrder(null)}>
              <Plus size={17} /> New Order
            </button>
            <button type="button" className="secondary" onClick={() => navigate("/manager/orders")}>
              View Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-assisted-page">
      <header className="manager-assisted-header">
        <div>
          <Link to="/manager" className="manager-assisted-eyebrow">
            <img src={qsIcon} alt="" />
            <span>Restaurant Operations</span>
          </Link>
          <h1>Assisted Order</h1>
          <p>Create a dine-in or takeaway order on behalf of a customer.</p>
        </div>
        <button type="button" className="manager-assisted-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} /> Back
        </button>
      </header>

      {error && <div className="manager-assisted-error">{error}</div>}

      <form className="manager-assisted-layout" onSubmit={handleSubmit}>
        <main className="manager-assisted-main">
          <section className="manager-assisted-section">
            <div className="manager-assisted-section-head">
              <div>
                <span className="manager-assisted-step">01</span>
                <div>
                  <h2>Order details</h2>
                  <p>Choose how this order should be served.</p>
                </div>
              </div>
            </div>

            <div className="manager-assisted-toggle">
              <button type="button" className={orderMode === "DineIn" ? "active" : ""} onClick={() => handleModeChange("DineIn")}>Dine In</button>
              <button type="button" className={orderMode === "Takeaway" ? "active" : ""} onClick={() => handleModeChange("Takeaway")}>Takeaway</button>
            </div>

            {orderMode === "DineIn" && (
              <label className="manager-assisted-field">
                <span>Table</span>
                <select value={tableId} onChange={(event) => setTableId(event.target.value)}>
                  <option value="">Select a table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table {table.table_number}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <section className="manager-assisted-section">
            <div className="manager-assisted-section-head">
              <div>
                <span className="manager-assisted-step">02</span>
                <div>
                  <h2>Customer</h2>
                  <p>Attach an existing customer or create a walk-in customer.</p>
                </div>
              </div>
            </div>

            <div className="manager-assisted-customer-tabs">
              <button
                type="button"
                className={customer.mode === "existing" ? "active" : ""}
                onClick={() => {
                  setCustomer((current) => ({ ...current, mode: "existing" }));
                  setCustomerLookupOpen(true);
                }}
              >Existing Customer</button>
              <button
                type="button"
                className={customer.mode === "walkin" ? "active" : ""}
                onClick={() => setCustomer({ ...INITIAL_CUSTOMER, mode: "walkin" })}
              >Walk-in Customer</button>
            </div>

            {customer.mode === "existing" ? (
              <div className="manager-assisted-customer-lookup">
                <div className="manager-assisted-search-input">
                  <Search size={17} />
                  <input
                    value={customerSearch}
                    onChange={(event) => {
                      setCustomerSearch(event.target.value);
                      setCustomerLookupOpen(true);
                    }}
                    onFocus={() => setCustomerLookupOpen(true)}
                    placeholder="Search by name or mobile"
                  />
                </div>
                {customerLookupOpen && (
                  <div className="manager-assisted-customer-results">
                    {customersLoading && <div className="manager-assisted-result-empty">Searching...</div>}
                    {!customersLoading && customers.length === 0 && (
                      <div className="manager-assisted-result-empty">No customers found.</div>
                    )}
                    {!customersLoading && customers.map((item) => (
                      <button type="button" key={item.id} onClick={() => selectExistingCustomer(item)}>
                        <span className="manager-assisted-avatar"><UserRound size={16} /></span>
                        <span>
                          <strong>{item.name || "Unnamed customer"}</strong>
                          <small>{item.mobile || "No mobile number"}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {customer.id && !customerLookupOpen && (
                  <div className="manager-assisted-selected-customer">
                    <UserRound size={17} />
                    <div><strong>{customer.name}</strong><span>{customer.mobile || "No mobile number"}</span></div>
                    <button type="button" onClick={() => setCustomerLookupOpen(true)}>Change</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="manager-assisted-form-grid">
                <label className="manager-assisted-field">
                  <span>Name</span>
                  <input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Customer name" maxLength={120} />
                </label>
                <label className="manager-assisted-field">
                  <span>Mobile <em>optional</em></span>
                  <input inputMode="numeric" value={customer.mobile} onChange={(event) => setCustomer((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit mobile number" />
                </label>
              </div>
            )}
          </section>

          <section className="manager-assisted-section manager-assisted-menu-section">
            <div className="manager-assisted-section-head">
              <div>
                <span className="manager-assisted-step">03</span>
                <div>
                  <h2>Menu</h2>
                  <p>Select items and build the customer's order.</p>
                </div>
              </div>
              <span className="manager-assisted-item-count">{cartCount} item{cartCount === 1 ? "" : "s"}</span>
            </div>

            <div className="manager-assisted-menu-tools">
              <div className="manager-assisted-search-input">
                <Search size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu" />
              </div>
              <div className="manager-assisted-category-row">
                <button type="button" className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>All</button>
                {categories.map((item) => (
                  <button type="button" key={item.id} className={String(category) === String(item.id) ? "active" : ""} onClick={() => setCategory(item.id)}>{item.name}</button>
                ))}
              </div>
            </div>

            <div className="manager-assisted-menu-grid">
              {filteredItems.length === 0 && <div className="manager-assisted-empty-menu">No available menu items match your search.</div>}
              {filteredItems.map((item) => (
                <article key={item.id} className="manager-assisted-menu-card">
                  <div className="manager-assisted-menu-image">
                    {getImageUrl(item.image) ? <img src={getImageUrl(item.image)} alt="" /> : <ShoppingBag size={26} />}
                  </div>
                  <div className="manager-assisted-menu-info">
                    <h3>{item.name}</h3>
                    <p>{item.description || "Freshly prepared to order."}</p>
                    <strong>₹{Number(item.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <button type="button" className="manager-assisted-add" onClick={() => addItem(item)}><Plus size={17} /> Add</button>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="manager-assisted-cart">
          <div className="manager-assisted-cart-head">
            <div><span>Order summary</span><h2>Cart</h2></div>
            <span className="manager-assisted-cart-count">{cartCount}</span>
          </div>

          <div className="manager-assisted-context">
            <div><span>Mode</span><strong>{orderMode === "DineIn" ? `Dine In${selectedTable ? ` · Table ${selectedTable.table_number}` : ""}` : "Takeaway"}</strong></div>
            <div><span>Customer</span><strong>{customer.name || "Walk-in Customer"}</strong></div>
          </div>

          <div className="manager-assisted-cart-items">
            {cart.length === 0 ? (
              <div className="manager-assisted-cart-empty"><ShoppingBag size={28} /><strong>Your cart is empty</strong><span>Add menu items to build this order.</span></div>
            ) : cart.map((item) => (
              <div className="manager-assisted-cart-item" key={item.id}>
                <div><strong>{item.name}</strong><span>₹{Number(item.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                <div className="manager-assisted-qty">
                  <button type="button" onClick={() => changeQuantity(item.id, -1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button>
                  <button type="button" className="remove" onClick={() => changeQuantity(item.id, -item.quantity)}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="manager-assisted-cart-notes">
            <label className="manager-assisted-field">
              <span>Order notes <em>{notes.length}/500</em></span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 500))} placeholder="Special requests, serving instructions..." rows={3} />
            </label>
          </div>

          <div className="manager-assisted-total">
            <span>Total</span>
            <strong>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          </div>

          <button type="submit" className="manager-assisted-submit" disabled={placing || cart.length === 0}>
            <Check size={18} />
            {placing ? "Placing Order..." : "Place Order"}
          </button>
          {cart.length > 0 && <button type="button" className="manager-assisted-clear" onClick={clearCart}>Clear cart</button>}
        </aside>
      </form>

      <ChevronDown className="manager-assisted-decoration" aria-hidden="true" />
    </div>
  );
};

export default ManagerAssistedOrder;
