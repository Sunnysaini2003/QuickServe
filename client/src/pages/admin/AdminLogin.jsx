import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../api/auth.api";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ChefHat,
  Loader2,
} from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await adminLogin(formData);
      const data = response.data;

      
      // Check Admin role
      
      if (!data?.user || data.user.role !== "Admin") {
        throw new Error("You are not authorized as an Admin");
      }

      
      // Store only non-secret user context.
      // The JWT is now kept in an HttpOnly cookie by the server.
      localStorage.removeItem("admin_token");
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      
      // Go to Admin Users
      
      navigate("/admin/users");
    } catch (err) {
      console.error("Admin login error:", err);
      setError(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Panel: Branding (Hidden on mobile, shows on md and up) */}
        <div className="hidden md:flex md:w-5/12 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
          {/* Decorative Background Blob */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#e85d04] rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#e85d04] rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#e85d04] rounded-xl flex items-center justify-center shadow-lg shadow-[#e85d04]/30">
                <ChefHat className="text-white w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                QuickServe
              </h2>
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Manage Your <br />
              <span className="text-[#e85d04]">Restaurant</span> <br />
              Seamlessly.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Access your admin dashboard to monitor live orders, manage staff,
              and analyze revenue performance.
            </p>
          </div>

          <div className="relative z-10 text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} QuickServe Systems
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-8">
              {/* Mobile Logo Fallback */}
              <div className="flex md:hidden items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#e85d04] rounded-lg flex items-center justify-center">
                  <ChefHat className="text-white w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  QuickServe
                </h2>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-slate-500">
                Please sign in to your admin account.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  className="text-sm font-semibold text-slate-700 ml-1"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] transition-all"
                    placeholder="admin@quickserve.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  className="text-sm font-semibold text-slate-700 ml-1"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] transition-all"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-[#e85d04] hover:bg-[#c94f03] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-[#e85d04]/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In to Dashboard"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
