import { useEffect, useState } from "react";

import { useSearchParams, useNavigate } from "react-router-dom";

import { getTableByToken } from "../../api/table.api";

import {
  createCustomerSession,
  registerCustomer,
  loginCustomer,
} from "../../api/auth.api";
import api from "../../api/axios";

import CustomerLoader from "../../components/customer/CustomerLoader";

import myLogo from "../../assets/qs_logo_1.png";

import "./TableLanding.css";

import "../../components/customer/CustomerLoader.css";

const TableLanding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // TABLE

  const [table, setTable] = useState(null);

  // CUSTOMER

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI MODE

  const [mode, setMode] = useState("choice");

  // PASSWORD VISIBILITY

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // CUSTOMER

  const [customer, setCustomer] = useState(null);

  // PAGE STATE

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  // GET TABLE TOKEN

  const getTableToken = () => {
    const tableToken = searchParams.get("table");

    const queryToken = searchParams.get("token");

    return (tableToken || queryToken || "").trim();
  };

  // LOAD TABLE

  useEffect(() => {
    let mounted = true;

    const loadTable = async () => {
      const tableToken = getTableToken();

      console.log("🔎 Customer table token:", tableToken);

      if (!tableToken) {
        if (mounted) {
          setTable(null);
          setError("Invalid QR code. Table token is missing.");
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getTableByToken(tableToken);

        const tableData = response?.data?.data || response?.data;

        if (!tableData) {
          throw new Error("Unable to find table.");
        }

        if (!mounted) {
          return;
        }

        setTable(tableData);

        // Store only the validated public table context.
        // Customer authentication remains in an HttpOnly cookie.
        localStorage.setItem("tableToken", tableToken);

        if (tableData?.id) {
          localStorage.setItem("customerTableId", String(tableData.id));
        }
      } catch (err) {
        console.error("❌ Table loading error:", err);

        if (mounted) {
          setTable(null);

          setError(
            err?.response?.data?.message ||
              err?.response?.data?.errors?.[0]?.msg ||
              err?.message ||
              "Unable to find table.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTable();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  // CHECK EXISTING CUSTOMER

  useEffect(() => {
    const storedCustomer = localStorage.getItem("customerUser");

    if (!storedCustomer) {
      setCustomer(null);
      setMode("choice");
      return;
    }

    try {
      const parsedCustomer = JSON.parse(storedCustomer);

      if (!parsedCustomer || typeof parsedCustomer !== "object") {
        throw new Error("Invalid stored customer data.");
      }

      setCustomer(parsedCustomer);
      setName(parsedCustomer?.name || "");
      setMobile(parsedCustomer?.mobile || "");
      setEmail(parsedCustomer?.email || "");
      setMode("returning");
    } catch (err) {
      console.error("Customer storage error:", err);

      localStorage.removeItem("customerUser");
      setCustomer(null);
      setMode("choice");
    }
  }, []);

  // CLEAR ERROR

  const clearError = () => {
    setError("");
  };

  // PASSWORD STRENGTH

  const getPasswordStrength = () => {
    if (!password) {
      return {
        score: 0,
        label: "",
      };
    }

    let score = 0;

    if (password.length >= 6) {
      score++;
    }

    if (password.length >= 10) {
      score++;
    }

    if (/[A-Z]/.test(password)) {
      score++;
    }

    if (/[0-9]/.test(password)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }

    if (score <= 2) {
      return {
        score,
        label: "Weak",
      };
    }

    if (score <= 4) {
      return {
        score,
        label: "Good",
      };
    }

    return {
      score,
      label: "Strong",
    };
  };

  const passwordStrength = getPasswordStrength();

  // START TABLE SESSION

  const startTableSession = async ({ customerName, customerMobile }) => {
    const tableToken = getTableToken() || localStorage.getItem("tableToken");

    if (!tableToken) {
      throw new Error("Invalid QR code. Table token is missing.");
    }

    if (!customerName?.trim()) {
      throw new Error("Customer name is required.");
    }

    if (!customerMobile) {
      throw new Error("Customer mobile number is required.");
    }

    // The backend creates the customer/table session and sets the
    // HttpOnly customer authentication cookie.
    await createCustomerSession({
      table_token: tableToken,
      name: customerName.trim(),
      mobile: customerMobile,
    });

    // Store only public table context. Never store the JWT here.
    localStorage.setItem("tableToken", tableToken);

    if (table?.id) {
      localStorage.setItem("customerTableId", String(table.id));
    }

    // Verify that the newly-created customer session can actually be
    // read back through the same credentialed API path used for orders.
    try {
      await api.get("/customers/session");
    } catch (sessionError) {
      console.error("❌ Customer session verification failed:", sessionError);

      throw new Error(
        sessionError?.response?.data?.message ||
          "Your customer session could not be verified. Please scan the table QR again.",
      );
    }

    navigate("/customer/menu", {
      replace: true,
    });
  };

  // RETURNING CUSTOMER

  const handleReturningCustomer = async () => {
    clearError();

    if (!customer?.name || !customer?.mobile) {
      setMode("login");

      return;
    }

    try {
      setSubmitting(true);

      await startTableSession({
        customerName: customer.name,

        customerMobile: customer.mobile,
      });
    } catch (err) {
      console.error("Returning customer error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start your table session.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // LOGIN

  const handleCustomerLogin = async (event) => {
    event.preventDefault();

    clearError();

    const customerMobile = mobile.replace(/\D/g, "").slice(0, 10);

    if (!/^[6-9]\d{9}$/.test(customerMobile)) {
      setError("Please enter a valid 10-digit mobile number.");

      return;
    }

    if (!password) {
      setError("Please enter your password.");

      return;
    }

    try {
      setSubmitting(true);

      const response = await loginCustomer({
        mobile: customerMobile,

        password,
      });

      const data = response?.data || response;

      const loggedInCustomer = data?.customer || data?.data?.customer;

      if (!loggedInCustomer) {
        throw new Error("Customer account information was not returned.");
      }

      const customerData = loggedInCustomer || {
        name: name.trim(),

        mobile: customerMobile,

        email: email.trim(),
      };

      localStorage.setItem("customerUser", JSON.stringify(customerData));

      setCustomer(customerData);

      await startTableSession({
        customerName: customerData.name,

        customerMobile: customerData.mobile,
      });
    } catch (err) {
      console.error("Customer login error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Unable to login.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // REGISTER

  const handleCustomerRegister = async (event) => {
    event.preventDefault();

    clearError();

    const customerName = name.trim();

    const customerMobile = mobile.replace(/\D/g, "").slice(0, 10);

    const customerEmail = email.trim();

    if (customerName.length < 2) {
      setError("Please enter your name.");

      return;
    }

    if (!/^[6-9]\d{9}$/.test(customerMobile)) {
      setError("Please enter a valid 10-digit mobile number.");

      return;
    }

    if (!customerEmail) {
      setError("Please enter your email address.");

      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");

      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    try {
      setSubmitting(true);

      const response = await registerCustomer({
        name: customerName,

        mobile: customerMobile,

        email: customerEmail,

        password,
      });

      const data = response?.data || response;

      const registeredCustomer = data?.customer || data?.data?.customer;

      if (!registeredCustomer) {
        throw new Error("Customer account information was not returned.");
      }

      const customerData = registeredCustomer || {
        name: customerName,

        mobile: customerMobile,

        email: customerEmail,
      };

      localStorage.setItem("customerUser", JSON.stringify(customerData));

      setCustomer(customerData);

      await startTableSession({
        customerName: customerData.name,

        customerMobile: customerData.mobile,
      });
    } catch (err) {
      console.error("Customer registration error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Unable to create your account.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // GUEST

  const handleGuestOrdering = async (event) => {
    event.preventDefault();

    clearError();

    const customerName = name.trim();

    const customerMobile = mobile.replace(/\D/g, "").slice(0, 10);

    if (!customerName) {
      setError("Please enter your name.");

      return;
    }

    if (!/^[0-9]{10}$/.test(customerMobile)) {
      setError("Please enter a valid 10-digit mobile number.");

      return;
    }

    try {
      setSubmitting(true);

      await startTableSession({
        customerName,

        customerMobile,
      });
    } catch (err) {
      console.error("Guest session error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.msg ||
          err?.message ||
          "Unable to start ordering.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // LOGOUT

  const handleAccountLogout = async () => {
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

    setCustomer(null);

    setName("");

    setMobile("");

    setEmail("");

    setPassword("");

    setConfirmPassword("");

    setShowPassword(false);

    setShowConfirmPassword(false);

    setMode("choice");

    clearError();
  };

  // CHOICE

  const goToChoice = () => {
    clearError();

    setPassword("");

    setConfirmPassword("");

    setShowPassword(false);

    setShowConfirmPassword(false);

    setMode("choice");
  };

  // LOADING

  if (loading) {
    return <CustomerLoader message="Finding your table..." />;
  }

  // TABLE ERROR

  if (error && !table) {
    return (
      <main className="table-landing-page">
        <section className="table-landing-card table-error-card">
          <div className="table-error-icon">!</div>

          <h1>Something went wrong</h1>

          <p>{error}</p>

          <button
            type="button"
            className="table-secondary-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  // SUBMITTING

  if (submitting) {
    return <CustomerLoader message="Preparing your table..." />;
  }

  // MAIN

  return (
    <main className="table-landing-page">
      <section className="table-landing-card">
        {/* 
                    BRAND
                 */}

        <div className="table-brand">
          <img src={myLogo} alt="QuickServe" className="table-brand-logo" />

          <span className="table-brand-caption">TABLE ORDERING</span>
        </div>

        {/* 
                    TABLE INFO
                 */}

        <div className="table-number-card">
          <div className="table-number-content">
            <span className="table-number-label">YOU'RE ORDERING AT</span>

            <strong>Table {table?.table_number}</strong>
          </div>

          <div className="table-status-dot">
            <span />
            Ready to order
          </div>
        </div>

        {/* 
                    RETURNING CUSTOMER
                 */}

        {mode === "returning" && (
          <div className="table-auth-section">
            <div className="table-welcome">
              <span className="table-welcome-eyebrow">WELCOME BACK</span>

              <h2>Hi {customer?.name?.split(" ")[0] || "there"} 👋</h2>

              <p>Your account is ready. Continue ordering from this table.</p>
            </div>

            {error && (
              <div className="table-form-error" role="alert">
                <span>!</span>

                <p>{error}</p>
              </div>
            )}

            <button
              type="button"
              className="table-start-button"
              onClick={handleReturningCustomer}
            >
              <span>Continue Ordering</span>

              <span className="table-start-arrow">→</span>
            </button>

            <button
              type="button"
              className="table-secondary-button"
              onClick={() => setMode("choice")}
            >
              Use another account
            </button>

            <button
              type="button"
              className="table-text-button"
              onClick={handleAccountLogout}
            >
              Sign out
            </button>
          </div>
        )}

        {/* 
                    CHOICE
                 */}

        {mode === "choice" && (
          <div className="table-auth-section">
            <div className="table-welcome">
              <span className="table-welcome-eyebrow">WELCOME</span>

              <h2>How would you like to order?</h2>

              <p>
                Sign in to access your previous orders, or continue without an
                account.
              </p>
            </div>

            {error && (
              <div className="table-form-error" role="alert">
                <span>!</span>

                <p>{error}</p>
              </div>
            )}

            <div className="table-action-list">
              <button
                type="button"
                className="table-start-button"
                onClick={() => {
                  clearError();
                  setMode("login");
                }}
              >
                <span className="table-action-icon">👤</span>

                <span className="table-action-content">
                  <strong>Login to your account</strong>

                  <small>Access your previous orders</small>
                </span>

                <span className="table-start-arrow">→</span>
              </button>

              <button
                type="button"
                className="table-secondary-button table-account-button"
                onClick={() => {
                  clearError();
                  setMode("register");
                }}
              >
                <span className="table-action-icon">✨</span>

                <span className="table-action-content">
                  <strong>Create a new account</strong>

                  <small>Save your details for next time</small>
                </span>

                <span>→</span>
              </button>
            </div>

            <div className="table-auth-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="table-guest-button"
              onClick={() => {
                clearError();
                setMode("guest");
              }}
            >
              Continue as Guest
            </button>

            <div className="table-benefits">
              <div>
                <span>✓</span>
                No app required
              </div>

              <div>
                <span>✓</span>
                Order directly from your table
              </div>
            </div>
          </div>
        )}

        {/* 
                    LOGIN
                 */}

        {mode === "login" && (
          <form className="table-landing-form" onSubmit={handleCustomerLogin}>
            <div className="table-form-header">
              <button
                type="button"
                className="table-back-button"
                onClick={goToChoice}
                aria-label="Go back"
              >
                ←
              </button>

              <div>
                <span className="table-welcome-eyebrow">CUSTOMER LOGIN</span>

                <h2>Welcome back</h2>

                <p>Login to continue your order.</p>
              </div>
            </div>

            <div className="table-form-group">
              <label htmlFor="customer-login-mobile">Mobile Number</label>

              <div className="table-mobile-input">
                <span>+91</span>

                <input
                  id="customer-login-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(event) =>
                    setMobile(
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  maxLength={10}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="table-form-group">
              <label htmlFor="customer-login-password">Password</label>

              <div className="table-password-input">
                <input
                  id="customer-login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="table-form-error" role="alert">
                <span>!</span>

                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="table-start-button"
              disabled={submitting}
            >
              <span>Login & Continue</span>

              <span className="table-start-arrow">→</span>
            </button>

            <div className="table-form-footer">
              <span>New to QuickServe?</span>

              <button
                type="button"
                className="table-link-button"
                onClick={() => {
                  clearError();
                  setPassword("");
                  setMode("register");
                }}
              >
                Create an account
              </button>
            </div>
          </form>
        )}

        {/* 
                    REGISTER
                 */}

        {mode === "register" && (
          <form
            className="table-landing-form"
            onSubmit={handleCustomerRegister}
          >
            <div className="table-form-header">
              <button
                type="button"
                className="table-back-button"
                onClick={goToChoice}
                aria-label="Go back"
              >
                ←
              </button>

              <div>
                <span className="table-welcome-eyebrow">CREATE ACCOUNT</span>

                <h2>Join QuickServe</h2>

                <p>Save your details and access your orders anytime.</p>
              </div>
            </div>

            {/* NAME */}

            <div className="table-form-group">
              <label htmlFor="customer-register-name">Your Name</label>

              <input
                id="customer-register-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                autoCapitalize="words"
                maxLength={120}
                disabled={submitting}
              />
            </div>

            {/* MOBILE */}

            <div className="table-form-group">
              <label htmlFor="customer-register-mobile">Mobile Number</label>

              <div className="table-mobile-input">
                <span>+91</span>

                <input
                  id="customer-register-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(event) =>
                    setMobile(
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  maxLength={10}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* EMAIL */}

            <div className="table-form-group">
              <label htmlFor="customer-register-email">Email Address</label>

              <input
                id="customer-register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={150}
                disabled={submitting}
              />
            </div>

            {/* PASSWORD */}

            <div className="table-form-group">
              <label htmlFor="customer-register-password">Password</label>

              <div className="table-password-input">
                <input
                  id="customer-register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {password && (
                <div className="password-strength">
                  <div className="password-strength-bars">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <span
                        key={item}
                        className={
                          item <= passwordStrength.score ? "active" : ""
                        }
                      />
                    ))}
                  </div>

                  <small>{passwordStrength.label}</small>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD */}

            <div className="table-form-group">
              <label htmlFor="customer-register-confirm-password">
                Confirm Password
              </label>

              <div className="table-password-input">
                <input
                  id="customer-register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

              {confirmPassword && (
                <small
                  className={
                    password === confirmPassword
                      ? "password-match"
                      : "password-no-match"
                  }
                >
                  {password === confirmPassword
                    ? "✓ Passwords match"
                    : "Passwords do not match"}
                </small>
              )}
            </div>

            {error && (
              <div className="table-form-error" role="alert">
                <span>!</span>

                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="table-start-button"
              disabled={submitting}
            >
              <span>Create Account & Continue</span>

              <span className="table-start-arrow">→</span>
            </button>

            <div className="table-form-footer">
              <span>Already have an account?</span>

              <button
                type="button"
                className="table-link-button"
                onClick={() => {
                  clearError();
                  setPassword("");
                  setConfirmPassword("");
                  setMode("login");
                }}
              >
                Login
              </button>
            </div>
          </form>
        )}

        {/* 
                    GUEST
                 */}

        {mode === "guest" && (
          <form className="table-landing-form" onSubmit={handleGuestOrdering}>
            <div className="table-form-header">
              <button
                type="button"
                className="table-back-button"
                onClick={goToChoice}
                aria-label="Go back"
              >
                ←
              </button>

              <div>
                <span className="table-welcome-eyebrow">GUEST ORDER</span>

                <h2>Start ordering</h2>

                <p>No account needed. Just enter your details and continue.</p>
              </div>
            </div>

            <div className="table-form-group">
              <label htmlFor="guest-name">Your Name</label>

              <input
                id="guest-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
                autoCapitalize="words"
                maxLength={120}
                disabled={submitting}
              />
            </div>

            <div className="table-form-group">
              <label htmlFor="guest-mobile">Mobile Number</label>

              <div className="table-mobile-input">
                <span>+91</span>

                <input
                  id="guest-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(event) =>
                    setMobile(
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  maxLength={10}
                  disabled={submitting}
                />
              </div>
            </div>

            {error && (
              <div className="table-form-error" role="alert">
                <span>!</span>

                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="table-start-button"
              disabled={submitting}
            >
              <span>Start Ordering</span>

              <span className="table-start-arrow">→</span>
            </button>

            <div className="table-form-footer">
              <span>Want your orders saved?</span>

              <button
                type="button"
                className="table-link-button"
                onClick={() => {
                  clearError();
                  setMode("register");
                }}
              >
                Create an account
              </button>
            </div>
          </form>
        )}

        {/* 
                    FOOTER
                 */}

        <div className="table-footer">
          <span>Secure table ordering</span>

          <span>•</span>

          <span>No app required</span>
        </div>

        <p className="table-copyright">
          © {new Date().getFullYear()} QuickServe All Rights Reserved.
        </p>
      </section>
    </main>
  );
};

export default TableLanding;